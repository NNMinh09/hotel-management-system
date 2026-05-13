import React, { useEffect, useMemo, useRef, useState } from "react";
import { maintenanceService } from "../services";

const STATUS_LABEL = {
  pending: "Bảng chờ",
  assigned: "Đã phân công",
  in_progress: "Đang xử lý",
  waiting_parts: "Chờ linh kiện",
  completed: "Hoàn thành",
};

const STATUS_COLOR = {
  pending: "bg-yellow-500/20 text-yellow-400",
  assigned: "bg-blue-500/20 text-blue-400",
  in_progress: "bg-purple-500/20 text-purple-400",
  waiting_parts: "bg-orange-500/20 text-orange-400",
  completed: "bg-green-500/20 text-green-400",
};

const PRIORITY_BORDER = {
  low: "border-zinc-700",
  medium: "border-zinc-700",
  high: "border-orange-500/40",
  urgent: "border-red-500/60",
};

const NEXT_STATUS = {
  assigned: { value: "in_progress", label: "▶ Bắt đầu xử lý" },
  in_progress: { value: "completed", label: "✅ Hoàn thành" },
  waiting_parts: { value: "in_progress", label: "▶ Tiếp tục xử lý" },
};

function buildImageUrl(imagePath) {
  if (!imagePath) return "";
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  const backendUrl = (process.env.REACT_APP_SOCKET_URL || "http://localhost:5000")
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");
  const normalized = imagePath.replace(/\\/g, "/");
  const withSlash = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return `${backendUrl}${withSlash}`;
}

export default function TechTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [updateModal, setUpdateModal] = useState(null);
  const [note, setNote] = useState("");
  const [laborCost, setLaborCost] = useState(0);
  const [partsCost, setPartsCost] = useState(0);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("active");
  const [expandedTask, setExpandedTask] = useState(null);
  const [claimingId, setClaimingId] = useState("");
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const fetchTasks = () => {
    setLoading(true);
    maintenanceService
      .getAll()
      .then((res) => {
        setTasks(res.data.requests || []);
        setError("");
      })
      .catch((err) => setError(err.response?.data?.message || "Không thể tải danh sách công việc"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleFiles = (files) => {
    const arr = Array.from(files || []).slice(0, Math.max(0, 5 - images.length));
    if (!arr.length) return;
    setImages((prev) => [...prev, ...arr].slice(0, 5));
    setPreviews((prev) => [...prev, ...arr.map((file) => URL.createObjectURL(file))].slice(0, 5));
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setPreviews((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const openModal = (task, next) => {
    setUpdateModal({ task, next });
    setNote("");
    setLaborCost(0);
    setPartsCost(0);
    setImages([]);
    setPreviews([]);
  };

  const handleClaim = async (task) => {
    setClaimingId(task._id);
    try {
      await maintenanceService.claim(task._id);
      setMessage(`Đã nhận việc: ${task.title}`);
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.message || "Nhận việc thất bại");
    } finally {
      setClaimingId("");
    }
  };

  const handleUpdate = async () => {
    if (!updateModal) return;
    setSaving(true);
    try {
      const { task, next } = updateModal;
      if (images.length > 0) {
        const formData = new FormData();
        formData.append("status", next.value);
        formData.append("note", note);
        if (next.value === "completed") {
          formData.append("cost[labor]", laborCost);
          formData.append("cost[parts]", partsCost);
        }
        images.forEach((image) => formData.append("images", image));
        await maintenanceService.updateStatus(task._id, formData);
      } else {
        await maintenanceService.updateStatus(task._id, {
          status: next.value,
          note,
          cost: next.value === "completed"
            ? { labor: Number(laborCost), parts: Number(partsCost) }
            : undefined,
        });
      }

      setMessage("Đã cập nhật trạng thái phiếu");
      setUpdateModal(null);
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  const poolTasks = useMemo(
    () => tasks.filter((task) => task.status === "pending" && !task.assignedTo),
    [tasks]
  );

  const myTasks = useMemo(
    () => tasks.filter((task) => !(task.status === "pending" && !task.assignedTo)),
    [tasks]
  );

  const filteredTasks = myTasks.filter((task) => {
    if (filter === "active") return task.status !== "completed" && task.status !== "cancelled";
    if (filter === "completed") return task.status === "completed";
    return true;
  });

  const urgentCount = myTasks.filter((task) => task.priority === "urgent" && task.status !== "completed").length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-white">Việc của tôi</h1>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <p className="text-sm text-zinc-500">
            {myTasks.filter((task) => task.status !== "completed").length} việc đang xử lý
          </p>
          {urgentCount > 0 && (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
              🔴 {urgentCount} khẩn cấp
            </span>
          )}
          {poolTasks.length > 0 && (
            <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">
              📥 {poolTasks.length} phiếu chờ nhận
            </span>
          )}
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {poolTasks.length > 0 && (
        <div className="rounded-2xl border border-yellow-500/20 bg-zinc-900 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Bảng chờ kỹ thuật</h2>
              <p className="text-xs text-zinc-500">Phiếu chưa giao, kỹ thuật viên có thể tự nhận việc</p>
            </div>
            <span className="rounded-full bg-yellow-500/20 px-2 py-1 text-xs text-yellow-400">{poolTasks.length} phiếu</span>
          </div>

          <div className="space-y-3">
            {poolTasks.map((task) => (
              <div key={task._id} className={`rounded-2xl border bg-zinc-950 p-4 ${PRIORITY_BORDER[task.priority] || PRIORITY_BORDER.medium}`}>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR.pending}`}>{STATUS_LABEL.pending}</span>
                      {task.priority === "urgent" && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">Khẩn cấp</span>}
                    </div>
                    <h3 className="font-semibold text-white">{task.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{task.description}</p>
                  </div>
                  <button
                    onClick={() => handleClaim(task)}
                    disabled={claimingId === task._id}
                    className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-60"
                  >
                    {claimingId === task._id ? "Đang nhận..." : "Nhận việc"}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600">
                  <span>📍 {task.locationId?.name || "-"}</span>
                  {task.assetId && <span>📦 {task.assetId.name}</span>}
                  <span>🕒 {new Date(task.createdAt).toLocaleDateString("vi-VN")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {[
          { value: "active", label: "Đang xử lý" },
          { value: "completed", label: "Hoàn thành" },
          { value: "all", label: "Tất cả" },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${filter === value ? "bg-amber-500 font-bold text-zinc-950" : "border border-zinc-800 bg-zinc-900 text-zinc-400"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <p className="text-sm text-zinc-500">Đang tải...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center">
          <p className="mb-3 text-4xl">✅</p>
          <p className="text-sm text-zinc-400">Không có việc nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div key={task._id} className={`overflow-hidden rounded-2xl border bg-zinc-900 ${PRIORITY_BORDER[task.priority] || PRIORITY_BORDER.medium}`}>
              <div className="p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {task.priority === "urgent" && <span className="mb-1 inline-block rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">🔴 Khẩn cấp</span>}
                    <h3 className="font-semibold leading-snug text-white">{task.title}</h3>
                    <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                      <span>📍 {task.locationId?.name || "—"}</span>
                      {task.assetId && <span>· 🔧 {task.assetId.name}</span>}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[task.status] || STATUS_COLOR.assigned}`}>
                    {STATUS_LABEL[task.status] || task.status}
                  </span>
                </div>

                {task.status !== "completed" && task.status !== "cancelled" && (
                  <div className="mt-3 flex gap-2">
                    {NEXT_STATUS[task.status] && (
                      <button onClick={() => openModal(task, NEXT_STATUS[task.status])} className="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400">
                        {NEXT_STATUS[task.status].label}
                      </button>
                    )}
                    {task.status === "in_progress" && (
                      <button onClick={() => openModal(task, { value: "waiting_parts", label: "⏳ Chờ linh kiện" })} className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-400 transition-colors hover:bg-orange-500/20">
                        ⏳
                      </button>
                    )}
                  </div>
                )}

                <button onClick={() => setExpandedTask(expandedTask === task._id ? null : task._id)} className="mt-2 w-full py-1 text-xs text-zinc-600 transition-colors hover:text-zinc-400">
                  {expandedTask === task._id ? "▲ Thu gọn" : "▼ Xem chi tiết"}
                </button>
              </div>

              {expandedTask === task._id && (
                <div className="space-y-3 border-t border-zinc-800 p-4">
                  {task.description && (
                    <div className="rounded-xl bg-zinc-800/50 p-3">
                      <p className="mb-1 text-xs text-zinc-500">Mô tả</p>
                      <p className="text-sm text-zinc-300">{task.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-zinc-800/50 p-3">
                      <p className="mb-0.5 text-zinc-500">Ngày tạo</p>
                      <p className="text-white">{new Date(task.createdAt).toLocaleDateString("vi-VN")}</p>
                    </div>
                    <div className="rounded-xl bg-zinc-800/50 p-3">
                      <p className="mb-0.5 text-zinc-500">Báo bởi</p>
                      <p className="text-white">{task.reportedBy?.name || "—"}</p>
                    </div>
                  </div>

                  {task.images?.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs text-zinc-500">Ảnh báo hỏng</p>
                      <div className="grid grid-cols-3 gap-2">
                        {task.images.map((image, index) => (
                          <img key={index} src={buildImageUrl(image)} alt={`evidence-${index}`} className="h-24 w-full cursor-pointer rounded-xl border border-zinc-700 object-cover" onClick={() => window.open(buildImageUrl(image), "_blank")} />
                        ))}
                      </div>
                    </div>
                  )}

                  {task.status === "completed" && task.resolution && (
                    <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
                      <p className="mb-1 text-xs font-medium text-green-400">Kết quả xử lý</p>
                      <p className="text-sm text-zinc-300">{task.resolution}</p>
                      {task.cost?.total > 0 && (
                        <div className="mt-2 flex gap-3 text-xs text-zinc-500">
                          <span>NC: {(task.cost.labor || 0).toLocaleString("vi-VN")}₫</span>
                          <span>Khác: {(task.cost.parts || 0).toLocaleString("vi-VN")}₫</span>
                          <span className="font-bold text-white">Tổng: {task.cost.total.toLocaleString("vi-VN")}₫</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {updateModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-zinc-700 bg-zinc-900 p-6 sm:max-w-md sm:rounded-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700 sm:hidden" />
            <h3 className="mb-1 text-lg font-bold text-white">{updateModal.next.label}</h3>
            <p className="mb-5 line-clamp-2 text-sm text-zinc-500">{updateModal.task.title}</p>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-widest text-zinc-400">{updateModal.next.value === "completed" ? "Mô tả cách xử lý *" : "Ghi chú"}</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none" rows={4} placeholder="Mô tả cách xử lý, tình trạng thực tế..." />
              </div>

              {updateModal.next.value === "completed" && (
                <div className="space-y-3">
                  <label className="block text-xs uppercase tracking-widest text-zinc-400">Chi phí</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs text-zinc-500">Nhân công (₫)</label>
                      <input type="number" min="0" value={laborCost} onChange={(e) => setLaborCost(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs text-zinc-500">Chi phí khác (₫)</label>
                      <input type="number" min="0" value={partsCost} onChange={(e) => setPartsCost(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none" />
                    </div>
                  </div>
                  {(Number(laborCost) + Number(partsCost)) > 0 && (
                    <div className="flex items-center justify-between rounded-xl bg-zinc-800 px-4 py-3">
                      <span className="text-sm text-zinc-400">Tổng chi phí</span>
                      <span className="font-bold text-white">{(Number(laborCost) + Number(partsCost)).toLocaleString("vi-VN")}₫</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs uppercase tracking-widest text-zinc-400">Ảnh kết quả ({images.length}/5)</label>
                {previews.length > 0 && (
                  <div className="mb-3 grid grid-cols-3 gap-2">
                    {previews.map((src, index) => (
                      <div key={src} className="relative">
                        <img src={src} alt={`result-${index}`} className="h-24 w-full rounded-xl border border-zinc-700 object-cover" />
                        <button type="button" onClick={() => removeImage(index)} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white">✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {images.length < 5 && (
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 py-4 text-sm text-zinc-300 transition-colors hover:bg-zinc-700">📷 Chụp ảnh</button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 py-4 text-sm text-zinc-300 transition-colors hover:bg-zinc-700">🖼️ Chọn ảnh</button>
                  </div>
                )}

                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setUpdateModal(null)} className="flex-1 rounded-xl bg-zinc-800 py-4 text-sm text-zinc-400 transition-colors hover:bg-zinc-700">Hủy</button>
              <button onClick={handleUpdate} disabled={saving} className="flex-1 rounded-xl bg-amber-500 py-4 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-60">{saving ? "Đang lưu..." : "Xác nhận"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}