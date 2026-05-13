import React, { useEffect, useState } from "react";
import { sparePartService } from "../services";

const emptyForm = {
  name: "",
  code: "",
  category: "",
  quantity: 0,
  minQuantity: 5,
  unit: "cái",
  unitPrice: 0,
  supplier: "",
  notes: "",
};

export default function AdminSpareParts() {
  const [parts, setParts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadParts = async () => {
    setLoading(true);
    try {
      const res = await sparePartService.getAll();
      setParts(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách linh kiện");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParts();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId("");
  };

  const resetFlash = () => {
    setError("");
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    resetFlash();

    if (!form.name.trim() || !form.code.trim()) {
      setError("Vui lòng nhập tên và mã linh kiện");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity),
        minQuantity: Number(form.minQuantity),
        unitPrice: Number(form.unitPrice),
      };

      if (editingId) {
        await sparePartService.update(editingId, payload);
        setMessage("Đã cập nhật linh kiện");
      } else {
        await sparePartService.create(payload);
        setMessage("Đã thêm linh kiện mới");
      }

      resetForm();
      await loadParts();
    } catch (err) {
      setError(err.response?.data?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (part) => {
    resetFlash();
    setEditingId(part._id);
    setForm({
      name: part.name || "",
      code: part.code || "",
      category: part.category || "",
      quantity: part.quantity ?? 0,
      minQuantity: part.minQuantity ?? 5,
      unit: part.unit || "cái",
      unitPrice: part.unitPrice ?? 0,
      supplier: part.supplier || "",
      notes: part.notes || "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa linh kiện này?")) return;
    resetFlash();
    try {
      await sparePartService.delete(id);
      setParts((prev) => prev.filter((part) => part._id !== id));
      if (editingId === id) resetForm();
      setMessage("Đã xóa linh kiện");
    } catch (err) {
      setError(err.response?.data?.message || "Xóa thất bại");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Linh kiện / Vật tư</h1>
        <p className="text-sm text-zinc-500">Quản lý kho phụ tùng và vật tư bảo trì</p>
      </div>

      {message && <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">{message}</div>}
      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[400px_1fr]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div>
            <h2 className="font-semibold text-white">{editingId ? "Chỉnh sửa linh kiện" : "Thêm linh kiện"}</h2>
            <p className="mt-1 text-sm text-zinc-500">Điền thông tin vật tư hoặc phụ tùng</p>
          </div>

          <Field label="Tên linh kiện *">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none" placeholder="Bộ lọc điều hòa" />
          </Field>

          <Field label="Mã linh kiện *">
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none" placeholder="FILTER-AC-01" />
          </Field>

          <Field label="Danh mục">
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none" placeholder="Điện, Nước, Cơ khí..." />
          </Field>

          <Field label="Nhà cung cấp">
            <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none" placeholder="Công ty ABC" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Số lượng">
              <input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none" />
            </Field>
            <Field label="Tồn kho tối thiểu">
              <input type="number" min="0" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none" />
            </Field>
            <Field label="Đơn vị">
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none" placeholder="cái, mét, lít..." />
            </Field>
            <Field label="Đơn giá (đ)">
              <input type="number" min="0" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none" />
            </Field>
          </div>

          <Field label="Ghi chú">
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none" placeholder="Thông tin thêm..." />
          </Field>

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-amber-500 py-3 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-60">
              {saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Thêm linh kiện"}
            </button>
            <button type="button" onClick={resetForm} className="rounded-lg bg-zinc-800 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-700">
              Xóa form
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-white">Danh sách linh kiện</h2>
            <p className="text-sm text-zinc-500">{parts.length} loại vật tư</p>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-500">Đang tải...</p>
          ) : parts.length === 0 ? (
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-8 text-center text-sm text-zinc-500">
              Chưa có linh kiện nào. Thêm ở form bên trái.
            </div>
          ) : (
            <div className="space-y-3">
              {parts.map((part) => {
                const isLow = part.quantity <= part.minQuantity;
                return (
                  <div key={part._id} className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${isLow ? "border-red-500/20 bg-red-500/5" : "border-zinc-700 bg-zinc-800/60"}`}>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-white">{part.name}</p>
                        {isLow && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">⚠️ Sắp hết</span>}
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">{part.code} • {part.category}</p>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm">
                        <span className={isLow ? "font-bold text-red-400" : "font-bold text-white"}>{part.quantity} {part.unit}</span>
                        <span className="text-zinc-500">Tối thiểu: {part.minQuantity}</span>
                        <span className="text-zinc-500">{(part.unitPrice || 0).toLocaleString("vi-VN")}đ/{part.unit}</span>
                      </div>
                      {part.supplier && <p className="mt-1 text-xs text-zinc-500">NCC: {part.supplier}</p>}
                      {part.notes && <p className="mt-1 text-xs text-zinc-600">{part.notes}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <button onClick={() => handleEdit(part)} className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400 hover:bg-amber-500/20">Sửa</button>
                      <button onClick={() => handleDelete(part._id)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20">Xóa</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-widest text-zinc-400">{label}</label>
      {children}
    </div>
  );
}
