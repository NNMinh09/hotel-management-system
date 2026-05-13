import React, { useEffect, useState } from "react";
import { locationService } from "../services";

const LOCATION_TYPES = ["room", "lobby", "restaurant", "pool", "gym", "elevator", "other"];
const LOCATION_TYPE_LABEL = {
  room: "Phòng",
  lobby: "Sảnh",
  restaurant: "Nhà hàng",
  pool: "Hồ bơi",
  gym: "Phòng gym",
  elevator: "Thang máy",
  other: "Khác",
};
const STATUS_LABEL = {
  active: "Hoạt động",
  maintenance: "Đang bảo trì",
};
const STATUS_CLASS = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  maintenance: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};
const emptyForm = { name: "", type: "room", floor: "", notes: "" };

export default function AdminLocations() {
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadLocations = async () => {
    setLoading(true);
    try {
      const res = await locationService.getAll();
      setLocations(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách vị trí");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const resetFlash = () => {
    setError("");
    setMessage("");
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetFlash();

    if (!form.name.trim()) {
      setError("Bạn cần nhập tên vị trí");
      return;
    }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      floor: form.floor === "" ? null : Number(form.floor),
      notes: form.notes.trim(),
    };

    setSaving(true);
    try {
      if (editingId) {
        await locationService.update(editingId, payload);
        setMessage("Đã cập nhật vị trí");
      } else {
        await locationService.create(payload);
        setMessage("Đã thêm vị trí mới");
      }
      resetForm();
      await loadLocations();
    } catch (err) {
      setError(err.response?.data?.message || "Không lưu được vị trí");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (location) => {
    resetFlash();
    setEditingId(location._id);
    setForm({
      name: location.name || "",
      type: location.type || "room",
      floor: location.floor ?? "",
      notes: location.notes || "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa vị trí này?")) return;
    resetFlash();
    try {
      await locationService.delete(id);
      setLocations((current) => current.filter((item) => item._id !== id));
      if (editingId === id) resetForm();
      setMessage("Đã xóa vị trí");
    } catch (err) {
      setError(err.response?.data?.message || "Không xóa được vị trí");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Vị trí</h1>
        <p className="text-sm text-zinc-500">Quản lý tòa nhà, tầng, phòng và khu vực sử dụng</p>
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div>
            <h2 className="font-semibold text-white">{editingId ? "Chỉnh sửa vị trí" : "Thêm vị trí"}</h2>
            <p className="mt-1 text-sm text-zinc-500">Tạo vị trí để gắn cho yêu cầu và thiết bị</p>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-widest text-zinc-400">Tên vị trí</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none"
              placeholder="Phòng 101"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-widest text-zinc-400">Loại</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none"
            >
              {LOCATION_TYPES.map((type) => (
                <option key={type} value={type}>{LOCATION_TYPE_LABEL[type] || type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-widest text-zinc-400">Tầng</label>
            <input
              type="number"
              value={form.floor}
              onChange={(e) => setForm({ ...form, floor: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none"
              placeholder="1"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-widest text-zinc-400">Ghi chú</label>
            <textarea
              rows="4"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none"
              placeholder="Khu vực ưu tiên, thông tin bổ sung..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-amber-500 py-3 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Thêm vị trí"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg bg-zinc-800 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-700"
            >
              Xóa form
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">Danh sách vị trí</h2>
              <p className="text-sm text-zinc-500">{locations.length} vị trí</p>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-500">Đang tải...</p>
          ) : locations.length === 0 ? (
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-8 text-center text-sm text-zinc-500">
              Chưa có vị trí nào. Bạn thêm vị trí đầu tiên ở form bên trái.
            </div>
          ) : (
            <div className="space-y-3">
              {locations.map((location) => {
                const status = location.status || "active";
                return (
                  <div key={location._id} className="flex items-start justify-between gap-4 rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-white">{location.name}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_CLASS[status] || STATUS_CLASS.active}`}>
                          {STATUS_LABEL[status] || status}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-sm text-zinc-500">
                        <span>Loại: {LOCATION_TYPE_LABEL[location.type] || location.type}</span>
                        <span>Tầng: {location.floor ?? "-"}</span>
                      </div>
                      {location.notes && <p className="mt-2 text-sm text-zinc-400">{location.notes}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        onClick={() => handleEdit(location)}
                        className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400 hover:bg-amber-500/20"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(location._id)}
                        className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20"
                      >
                        Xóa
                      </button>
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
