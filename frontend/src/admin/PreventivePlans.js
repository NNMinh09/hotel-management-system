import React, { useEffect, useMemo, useState } from "react";
import { preventivePlanService, locationService, assetService, authService } from "../services";

const PRIORITY_LABEL = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  urgent: "Khẩn cấp",
};

const PRIORITY_COLOR = {
  low: "bg-zinc-500/20 text-zinc-400",
  medium: "bg-blue-500/20 text-blue-400",
  high: "bg-orange-500/20 text-orange-400",
  urgent: "bg-red-500/20 text-red-400",
};

const emptyForm = {
  name: "",
  description: "",
  locationId: "",
  assetId: "",
  intervalDays: 30,
  nextDueDate: "",
  priority: "medium",
  assignedTo: "",
  checklist: [],
};

export default function AdminPreventivePlans() {
  const [plans, setPlans] = useState([]);
  const [locations, setLocations] = useState([]);
  const [assets, setAssets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [checklistInput, setChecklistInput] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState("");
  const [bulkGenerating, setBulkGenerating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [planRes, locationRes, assetRes, techRes] = await Promise.all([
        preventivePlanService.getAll(),
        locationService.getAll(),
        assetService.getAll(),
        authService.getUsers("technician"),
      ]);
      setPlans(planRes.data || []);
      setLocations(locationRes.data || []);
      setAssets(assetRes.data || []);
      setTechnicians((techRes.data || []).filter((tech) => tech.isActive !== false));
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAdd = () => {
    setEditingId("");
    setForm(emptyForm);
    setChecklistInput("");
    setError("");
    setShowModal(true);
  };

  const openEdit = (plan) => {
    setEditingId(plan._id);
    setForm({
      name: plan.name || "",
      description: plan.description || "",
      locationId: plan.locationId?._id || plan.locationId || "",
      assetId: plan.assetId?._id || plan.assetId || "",
      intervalDays: plan.intervalDays || 30,
      nextDueDate: plan.nextDueDate ? new Date(plan.nextDueDate).toISOString().split("T")[0] : "",
      priority: plan.priority || "medium",
      assignedTo: plan.assignedTo?._id || plan.assignedTo || "",
      checklist: plan.checklist || [],
    });
    setChecklistInput("");
    setError("");
    setShowModal(true);
  };

  const addChecklistItem = () => {
    const value = checklistInput.trim();
    if (!value) return;
    setForm((prev) => ({ ...prev, checklist: [...prev.checklist, { item: value, done: false }] }));
    setChecklistInput("");
  };

  const removeChecklistItem = (index) => {
    setForm((prev) => ({ ...prev, checklist: prev.checklist.filter((_, itemIndex) => itemIndex !== index) }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.locationId || !form.nextDueDate) {
      setError("Vui lòng nhập tên kế hoạch, vị trí và ngày thực hiện");
      return;
    }

    try {
      const payload = {
        ...form,
        intervalDays: Number(form.intervalDays) || 30,
        assetId: form.assetId || null,
        assignedTo: form.assignedTo || null,
      };

      if (editingId) {
        await preventivePlanService.update(editingId, payload);
        setMessage("Đã cập nhật kế hoạch");
      } else {
        await preventivePlanService.create(payload);
        setMessage("Đã tạo kế hoạch mới");
      }

      setShowModal(false);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Lưu thất bại");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Xóa kế hoạch "${name}"?`)) return;
    try {
      await preventivePlanService.delete(id);
      setPlans((prev) => prev.filter((plan) => plan._id !== id));
      setMessage("Đã xóa kế hoạch");
    } catch (err) {
      setError(err.response?.data?.message || "Xóa thất bại");
    }
  };

  const handleGenerate = async (plan) => {
    if (!window.confirm(`Tạo phiếu bảo trì từ kế hoạch "${plan.name}"?`)) return;
    setGenerating(plan._id);
    try {
      await preventivePlanService.generate(plan._id);
      setMessage(`Đã tạo phiếu bảo trì cho "${plan.name}"`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Tạo phiếu thất bại");
    } finally {
      setGenerating("");
    }
  };

  const handleGenerateDue = async () => {
    setBulkGenerating(true);
    try {
      const res = await preventivePlanService.generateDue();
      setMessage(res.data?.message || "Đã tạo các phiếu đến hạn");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Tạo phiếu đến hạn thất bại");
    } finally {
      setBulkGenerating(false);
    }
  };

  const filteredAssets = useMemo(() => {
    if (!form.locationId) return assets;
    return assets.filter((asset) => (asset.locationId?._id || asset.locationId) === form.locationId);
  }, [assets, form.locationId]);

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const next7Days = new Date(todayStart);
  next7Days.setDate(next7Days.getDate() + 7);

  const overdue = plans.filter((plan) => new Date(plan.nextDueDate) < todayStart);
  const dueSoon = plans.filter((plan) => {
    const dueDate = new Date(plan.nextDueDate);
    return dueDate >= todayStart && dueDate <= next7Days;
  });
  const normal = plans.filter((plan) => new Date(plan.nextDueDate) > next7Days);
  const dueCount = plans.filter((plan) => new Date(plan.nextDueDate) <= todayStart).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Bảo trì định kỳ</h1>
          <p className="text-sm text-zinc-500">
            {plans.length} kế hoạch
            {overdue.length > 0 && <span className="ml-2 text-red-400">• {overdue.length} quá hạn</span>}
            {dueSoon.length > 0 && <span className="ml-2 text-amber-400">• {dueSoon.length} sắp đến</span>}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleGenerateDue} disabled={bulkGenerating || dueCount === 0} className="rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-400 transition-colors hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50">
            {bulkGenerating ? "Đang tạo..." : `Tạo phiếu đến hạn${dueCount ? ` (${dueCount})` : ""}`}
          </button>
          <button onClick={openAdd} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400">+ Tạo kế hoạch</button>
        </div>
      </div>

      {message && <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">{message}</div>}
      {error && !showModal && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

      {loading ? (
        <p className="py-12 text-center text-sm text-zinc-500">Đang tải...</p>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center">
          <p className="mb-3 text-4xl">🗓️</p>
          <p className="text-sm text-zinc-400">Chưa có kế hoạch bảo trì nào</p>
          <button onClick={openAdd} className="mt-3 text-sm text-amber-400 hover:text-amber-300">+ Tạo kế hoạch đầu tiên</button>
        </div>
      ) : (
        <div className="space-y-4">
          {overdue.length > 0 && (
            <PlanGroup title={`🚨 Quá hạn (${overdue.length})`} titleClass="text-red-400">
              {overdue.map((plan) => <PlanCard key={plan._id} plan={plan} onEdit={openEdit} onDelete={handleDelete} onGenerate={handleGenerate} generating={generating} status="overdue" />)}
            </PlanGroup>
          )}

          {dueSoon.length > 0 && (
            <PlanGroup title={`⏳ Sắp đến trong 7 ngày (${dueSoon.length})`} titleClass="text-amber-400">
              {dueSoon.map((plan) => <PlanCard key={plan._id} plan={plan} onEdit={openEdit} onDelete={handleDelete} onGenerate={handleGenerate} generating={generating} status="upcoming" />)}
            </PlanGroup>
          )}

          {normal.length > 0 && (
            <PlanGroup title={`📋 Kế hoạch (${normal.length})`} titleClass="text-zinc-300">
              {normal.map((plan) => <PlanCard key={plan._id} plan={plan} onEdit={openEdit} onDelete={handleDelete} onGenerate={handleGenerate} generating={generating} status="normal" />)}
            </PlanGroup>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
            <h3 className="mb-5 font-bold text-white">{editingId ? "Sửa kế hoạch" : "Tạo kế hoạch bảo trì"}</h3>

            {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Tên kế hoạch *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none" placeholder="Bảo trì điều hòa định kỳ, kiểm tra PCCC..." />
              </div>

              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Mô tả</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none" rows={2} placeholder="Mô tả công việc cần thực hiện..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Vị trí *</label>
                  <select value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value, assetId: "" })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none">
                    <option value="">-- Chọn vị trí --</option>
                    {locations.map((location) => <option key={location._id} value={location._id}>{location.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Thiết bị</label>
                  <select value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none">
                    <option value="">-- Chọn thiết bị --</option>
                    {filteredAssets.map((asset) => <option key={asset._id} value={asset._id}>{asset.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Ngày thực hiện *</label>
                  <input type="date" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Lặp lại (ngày)</label>
                  <input type="number" min="1" value={form.intervalDays} onChange={(e) => setForm({ ...form, intervalDays: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Ưu tiên</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none">
                    {Object.entries(PRIORITY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Giao cho KTV</label>
                  <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none">
                    <option value="">-- Chưa chọn --</option>
                    {technicians.map((tech) => <option key={tech._id} value={tech._id}>{tech.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Checklist công việc</label>
                <div className="mb-2 flex gap-2">
                  <input value={checklistInput} onChange={(e) => setChecklistInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChecklistItem(); } }} className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none" placeholder="Kiểm tra bộ lọc, vệ sinh dàn lạnh..." />
                  <button type="button" onClick={addChecklistItem} className="rounded-lg bg-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-600">+ Thêm</button>
                </div>
                {form.checklist.length > 0 && (
                  <div className="space-y-1">
                    {form.checklist.map((item, index) => (
                      <div key={`${item.item}-${index}`} className="flex items-center justify-between rounded-lg bg-zinc-800 px-3 py-2">
                        <span className="text-sm text-zinc-300">• {item.item}</span>
                        <button type="button" onClick={() => removeChecklistItem(index)} className="text-xs text-red-400 hover:text-red-300">Xóa</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 rounded-lg bg-zinc-800 py-2.5 text-sm text-zinc-400 hover:bg-zinc-700">Hủy</button>
              <button onClick={handleSave} className="flex-1 rounded-lg bg-amber-500 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-400">{editingId ? "Lưu thay đổi" : "Tạo kế hoạch"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanGroup({ title, titleClass, children }) {
  return (
    <div>
      <h2 className={`mb-2 text-sm font-semibold ${titleClass}`}>{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function PlanCard({ plan, onEdit, onDelete, onGenerate, generating, status }) {
  const borderColor = status === "overdue" ? "border-red-500/30" : status === "upcoming" ? "border-amber-500/30" : "border-zinc-800";
  const dueDiff = Math.ceil((new Date(plan.nextDueDate) - new Date()) / (24 * 60 * 60 * 1000));

  return (
    <div className={`rounded-xl border bg-zinc-900 p-4 ${borderColor}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="font-medium text-white">{plan.name}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs ${PRIORITY_COLOR[plan.priority] || PRIORITY_COLOR.medium}`}>{PRIORITY_LABEL[plan.priority] || plan.priority}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${status === "overdue" ? "bg-red-500/20 text-red-400" : status === "upcoming" ? "bg-amber-500/20 text-amber-400" : "bg-zinc-700 text-zinc-400"}`}>
              {status === "overdue" ? `Quá hạn ${Math.abs(dueDiff)} ngày` : `Còn ${Math.max(dueDiff, 0)} ngày`}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500">
            <span>📍 {plan.locationId?.name || "-"}</span>
            {plan.assetId && <span>📦 {plan.assetId?.name}</span>}
            <span>🔁 {plan.intervalDays} ngày/lần</span>
            {plan.assignedTo && <span>👨‍🔧 {plan.assignedTo?.name}</span>}
          </div>
          {plan.description && <p className="mt-2 text-sm text-zinc-400">{plan.description}</p>}
          {plan.checklist?.length > 0 && <p className="mt-1 text-xs text-zinc-600">• {plan.checklist.length} đầu việc trong checklist</p>}
          <p className="mt-1 text-xs text-zinc-500">Ngày thực hiện: {new Date(plan.nextDueDate).toLocaleDateString("vi-VN")}</p>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <button onClick={() => onGenerate(plan)} disabled={generating === plan._id} className="rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-xs text-green-400 transition-colors hover:bg-green-500/20 disabled:opacity-50">
            {generating === plan._id ? "..." : "Tạo phiếu"}
          </button>
          <button onClick={() => onEdit(plan)} className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400 transition-colors hover:bg-amber-500/20">Sửa</button>
          <button onClick={() => onDelete(plan._id, plan.name)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/20">Xóa</button>
        </div>
      </div>
    </div>
  );
}