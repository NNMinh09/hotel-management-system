import React, { useEffect, useState } from "react";
import { maintenanceService, authService, locationService, assetService } from "../services";

const STATUS_LABEL = {
  pending: "Chờ xử lý",
  assigned: "Đã phân công",
  in_progress: "Đang xử lý",
  waiting_parts: "Chờ linh kiện",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

const STATUS_COLOR = {
  pending: "bg-yellow-500/20 text-yellow-400",
  assigned: "bg-blue-500/20 text-blue-400",
  in_progress: "bg-purple-500/20 text-purple-400",
  waiting_parts: "bg-orange-500/20 text-orange-400",
  completed: "bg-green-500/20 text-green-400",
  cancelled: "bg-zinc-500/20 text-zinc-400",
};

const PRIORITY_COLOR = {
  low: "bg-zinc-500/20 text-zinc-400",
  medium: "bg-blue-500/20 text-blue-400",
  high: "bg-orange-500/20 text-orange-400",
  urgent: "bg-red-500/20 text-red-400",
};

const PRIORITY_LABEL = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  urgent: "Khẩn",
};

const emptyForm = {
  title: "",
  description: "",
  locationId: "",
  assetId: "",
  priority: "medium",
  type: "repair",
  assignedTo: "",
};

function buildImageUrl(imagePath) {
  if (!imagePath) return "";
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  const backendUrl = (process.env.REACT_APP_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
  const normalized = imagePath.replace(/\\/g, "/");
  const withSlash = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return `${backendUrl}${withSlash}`;
}

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [locations, setLocations] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [assignTech, setAssignTech] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ✅ Phân trang
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(requests.length / PAGE_SIZE);
  const pagedRequests = requests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const fetchRequests = () => {
    setLoading(true);
    maintenanceService
      .getAll({ status: statusFilter, priority: priorityFilter })
      .then((res) => {
        setRequests(res.data.requests || []);
        setError("");
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Không thể tải danh sách phiếu");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    Promise.all([
      authService.getUsers("technician"),
      locationService.getAll(),
      assetService.getAll(),
    ])
      .then(([technicianRes, locationRes, assetRes]) => {
        setTechnicians((technicianRes.data || []).filter((user) => user.isActive !== false));
        setLocations(locationRes.data || []);
        setAssets(assetRes.data || []);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Không thể tải dữ liệu ban đầu");
      });
  }, []);

  const filteredAssets = form.locationId
    ? assets.filter((asset) => (asset.locationId?._id || asset.locationId) === form.locationId)
    : assets;

  const handleCreate = async () => {
    if (!form.title.trim() || !form.locationId) {
      setError("Vui lòng nhập tiêu đề và chọn vị trí");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });

      await maintenanceService.create(formData);
      setMessage("Đã tạo phiếu bảo trì thành công");
      setShowCreateModal(false);
      setForm(emptyForm);
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Tạo phiếu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!assignTech) return;
    try {
      await maintenanceService.assign(showAssignModal._id, {
        technicianId: assignTech,
        note: assignNote,
      });
      setMessage("Đã phân công kỹ thuật viên");
      setShowAssignModal(null);
      setAssignTech("");
      setAssignNote("");
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Phân công thất bại");
    }
  };

  const handleClose = async (request) => {
    if (!window.confirm(`Đóng phiếu "${request.title}"? Admin xác nhận đã kiểm tra.`)) return;
    try {
      await maintenanceService.updateStatus(request._id, {
        status: "cancelled",
        note: "Admin đã kiểm tra và đóng phiếu",
      });
      setMessage("Đã đóng phiếu");
      fetchRequests();
    } catch {
      setError("Đóng phiếu thất bại");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Quản lý phiếu bảo trì</h1>
          <p className="text-sm text-zinc-500">{requests.length} phiếu</p>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true);
            setError("");
            setForm(emptyForm);
          }}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400"
        >
          + Tạo phiếu mới
        </button>
      </div>

      {message && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          {message}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABEL).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
        >
          <option value="">Tất cả mức độ</option>
          {Object.entries(PRIORITY_LABEL).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {(statusFilter || priorityFilter) && (
          <button
            onClick={() => {
              setStatusFilter("");
              setPriorityFilter("");
            }}
            className="rounded-lg bg-zinc-800 px-3 py-2 text-xs text-zinc-500 transition-colors hover:text-white"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* ✅ Desktop: Table */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        {loading ? (
          <p className="py-12 text-center text-sm text-zinc-500">Đang tải...</p>
        ) : requests.length === 0 ? (
          <div className="py-12 text-center">
            <p className="mb-3 text-4xl">📋</p>
            <p className="text-sm text-zinc-400">Không có phiếu nào</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs uppercase text-zinc-500">
                <th className="px-5 py-3">Tiêu đề</th>
                <th className="px-5 py-3">Vị trí</th>
                <th className="px-5 py-3">Ưu tiên</th>
                <th className="px-5 py-3">Trạng thái</th>
                <th className="px-5 py-3">Kỹ thuật viên</th>
                <th className="px-5 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {pagedRequests.map((request) => (
                <tr key={request._id} className="border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30">
                  <td className="px-5 py-4">
                    <p className="font-medium text-white">{request.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-600">
                      {request.type === "scheduled"
                        ? "📅 Định kỳ"
                        : request.type === "inspection"
                          ? "🔍 Kiểm tra"
                          : "🔧 Sửa chữa"}
                      {" · "}Bởi: {request.reportedBy?.name}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-sm text-zinc-400">{request.locationId?.name}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2 py-1 text-xs ${PRIORITY_COLOR[request.priority]}`}>
                      {PRIORITY_LABEL[request.priority]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2 py-1 text-xs ${STATUS_COLOR[request.status]}`}>
                      {STATUS_LABEL[request.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-zinc-400">
                    {request.assignedTo?.name || <span className="text-zinc-600">Chưa giao</span>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setShowDetailModal(request)}
                        className="text-xs text-zinc-400 underline transition-colors hover:text-white"
                      >
                        Chi tiết
                      </button>
                      {request.status === "pending" && (
                        <button
                          onClick={() => {
                            setShowAssignModal(request);
                            setAssignTech("");
                            setAssignNote("");
                          }}
                          className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-xs text-blue-400 transition-colors hover:bg-blue-500/20"
                        >
                          Phân công
                        </button>
                      )}
                      {request.status === "completed" && (
                        <button
                          onClick={() => handleClose(request)}
                          className="rounded-lg border border-green-500/20 bg-green-500/10 px-2 py-1 text-xs text-green-400 transition-colors hover:bg-green-500/20"
                        >
                          Đóng phiếu
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ✅ Mobile: Card layout */}
      {!loading && requests.length > 0 && (
        <div className="md:hidden space-y-3">
          {pagedRequests.map((request) => (
            <div key={request._id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">{request.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {request.type === "scheduled" ? "📅 Định kỳ" : request.type === "inspection" ? "🔍 Kiểm tra" : "🔧 Sửa chữa"}
                    {" · "}{request.locationId?.name}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs shrink-0 ${PRIORITY_COLOR[request.priority]}`}>
                  {PRIORITY_LABEL[request.priority]}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                <span className={`rounded-full px-2 py-1 text-xs ${STATUS_COLOR[request.status]}`}>
                  {STATUS_LABEL[request.status]}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setShowDetailModal(request)} className="text-xs text-zinc-400 underline transition-colors hover:text-white">Chi tiết</button>
                  {request.status === "pending" && (
                    <button onClick={() => { setShowAssignModal(request); setAssignTech(""); setAssignNote(""); }}
                      className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-xs text-blue-400 transition-colors hover:bg-blue-500/20">
                      Phân công
                    </button>
                  )}
                  {request.status === "completed" && (
                    <button onClick={() => handleClose(request)}
                      className="rounded-lg border border-green-500/20 bg-green-500/10 px-2 py-1 text-xs text-green-400 transition-colors hover:bg-green-500/20">
                      Đóng phiếu
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-zinc-500">KTV: {request.assignedTo?.name || "Chưa giao"} · Báo bởi: {request.reportedBy?.name}</p>
            </div>
          ))}
        </div>
      )}
      {!loading && requests.length === 0 && (
        <div className="md:hidden py-12 text-center rounded-2xl border border-zinc-800 bg-zinc-900">
          <p className="mb-3 text-4xl">📋</p>
          <p className="text-sm text-zinc-400">Không có phiếu nào</p>
        </div>
      )}

      {/* ✅ Phân trang */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-zinc-500">Trang {page} / {totalPages} ({requests.length} phiếu)</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 disabled:opacity-40 hover:bg-zinc-800">
              ← Trước
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 disabled:opacity-40 hover:bg-zinc-800">
              Sau →
            </button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
            <h3 className="mb-5 font-bold text-white">Tạo phiếu bảo trì</h3>
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-widest text-zinc-400">Loại phiếu</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "repair", label: "🔧 Sửa chữa" },
                    { value: "scheduled", label: "📅 Định kỳ" },
                    { value: "inspection", label: "🔍 Kiểm tra" },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm({ ...form, type: value })}
                      className={`rounded-lg border px-3 py-2 text-xs transition-all ${form.type === value ? "border-amber-500 bg-zinc-800 text-amber-400" : "border-zinc-700 text-zinc-600"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Tiêu đề *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none" placeholder="Mô tả ngắn công việc cần làm..." />
              </div>

              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Mô tả chi tiết</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none" rows={3} placeholder="Chi tiết công việc, yêu cầu kỹ thuật..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Vị trí *</label>
                  <select value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value, assetId: "" })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none">
                    <option value="">-- Chọn --</option>
                    {locations.map((location) => <option key={location._id} value={location._id}>{location.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Thiết bị</label>
                  <select value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none">
                    <option value="">-- Chọn --</option>
                    {filteredAssets.map((asset) => <option key={asset._id} value={asset._id}>{asset.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Ưu tiên</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none">
                    {Object.entries(PRIORITY_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">
                    Giao cho KTV
                    <span className="ml-1 text-amber-400">(giao ngay)</span>
                  </label>
                  <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none">
                    <option value="">-- Chưa giao --</option>
                    {technicians.map((tech) => <option key={tech._id} value={tech._id}>{tech.name}</option>)}
                  </select>
                </div>
              </div>

              {form.assignedTo && (
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs text-blue-400">
                  Phiếu sẽ được giao ngay cho kỹ thuật viên với trạng thái <strong>Đã phân công</strong>
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 rounded-lg bg-zinc-800 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-700">Hủy</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 rounded-lg bg-amber-500 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-60">
                {saving ? "Đang tạo..." : "Tạo phiếu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
            <h3 className="mb-2 font-bold text-white">Phân công kỹ thuật viên</h3>
            <p className="mb-5 text-sm text-zinc-500">{showAssignModal.title}</p>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Chọn kỹ thuật viên *</label>
                <select value={assignTech} onChange={(e) => setAssignTech(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none">
                  <option value="">-- Chọn --</option>
                  {technicians.map((tech) => <option key={tech._id} value={tech._id}>{tech.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Ghi chú</label>
                <textarea value={assignNote} onChange={(e) => setAssignNote(e.target.value)} className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none" rows={3} placeholder="Lưu ý cho kỹ thuật viên..." />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowAssignModal(null)} className="flex-1 rounded-lg bg-zinc-800 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-700">Hủy</button>
              <button onClick={handleAssign} disabled={!assignTech} className="flex-1 rounded-lg bg-amber-500 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-50">Phân công</button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
            <div className="mb-5 flex items-start justify-between">
              <h3 className="mr-3 flex-1 font-bold text-white">{showDetailModal.title}</h3>
              <button onClick={() => setShowDetailModal(null)} className="text-zinc-500 transition-colors hover:text-white">✕</button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-2 py-1 text-xs ${STATUS_COLOR[showDetailModal.status]}`}>{STATUS_LABEL[showDetailModal.status]}</span>
                <span className={`rounded-full px-2 py-1 text-xs ${PRIORITY_COLOR[showDetailModal.priority]}`}>{PRIORITY_LABEL[showDetailModal.priority]}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-zinc-800 p-3">
                  <p className="mb-1 text-xs text-zinc-500">Vị trí</p>
                  <p className="text-white">{showDetailModal.locationId?.name || "—"}</p>
                </div>
                <div className="rounded-xl bg-zinc-800 p-3">
                  <p className="mb-1 text-xs text-zinc-500">Thiết bị</p>
                  <p className="text-white">{showDetailModal.assetId?.name || "—"}</p>
                </div>
                <div className="rounded-xl bg-zinc-800 p-3">
                  <p className="mb-1 text-xs text-zinc-500">Báo bởi</p>
                  <p className="text-white">{showDetailModal.reportedBy?.name || "—"}</p>
                </div>
                <div className="rounded-xl bg-zinc-800 p-3">
                  <p className="mb-1 text-xs text-zinc-500">Kỹ thuật viên</p>
                  <p className="text-white">{showDetailModal.assignedTo?.name || "Chưa giao"}</p>
                </div>
              </div>

              {showDetailModal.description && (
                <div className="rounded-xl bg-zinc-800 p-3">
                  <p className="mb-1 text-xs text-zinc-500">Mô tả</p>
                  <p className="text-sm text-white">{showDetailModal.description}</p>
                </div>
              )}

              {showDetailModal.images?.length > 0 && (
                <div>
                  <p className="mb-2 text-xs text-zinc-500">Ảnh đính kèm</p>
                  <div className="grid grid-cols-3 gap-2">
                    {showDetailModal.images.map((img, index) => (
                      <img
                        key={index}
                        src={buildImageUrl(img)}
                        alt={`img-${index}`}
                        className="h-24 w-full cursor-pointer rounded-lg border border-zinc-700 object-cover transition-opacity hover:opacity-80"
                        onClick={() => window.open(buildImageUrl(img), "_blank")}
                        onError={(event) => { event.target.style.display = "none"; }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {showDetailModal.resolution && (
                <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
                  <p className="mb-1 text-xs font-medium text-green-400">Kết quả xử lý</p>
                  <p className="text-sm text-zinc-300">{showDetailModal.resolution}</p>
                  {showDetailModal.cost?.total > 0 && (
                    <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                      <span>Nhân công: {(showDetailModal.cost.labor || 0).toLocaleString("vi-VN")}₫</span>
                      <span>Chi phí khác: {(showDetailModal.cost.parts || 0).toLocaleString("vi-VN")}₫</span>
                      <span className="font-bold text-white">Tổng: {showDetailModal.cost.total.toLocaleString("vi-VN")}₫</span>
                    </div>
                  )}
                </div>
              )}

              {showDetailModal.statusHistory?.length > 0 && (
                <div>
                  <p className="mb-2 text-xs text-zinc-500">Lịch sử xử lý</p>
                  <div className="space-y-2">
                    {showDetailModal.statusHistory.map((history, index) => (
                      <div key={index} className="flex gap-3 text-xs">
                        <span className={`shrink-0 rounded-full px-2 py-0.5 ${STATUS_COLOR[history.status] || "bg-zinc-700 text-zinc-400"}`}>
                          {STATUS_LABEL[history.status] || history.status}
                        </span>
                        <span className="text-zinc-500">{history.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => setShowDetailModal(null)} className="mt-5 w-full rounded-lg bg-zinc-800 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-700">Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}