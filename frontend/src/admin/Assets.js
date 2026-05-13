import React, { useEffect, useState, useRef } from "react";
import { assetService, locationService, importService } from "../services";

const STATUS_COLOR = {
  active: "bg-green-500/20 text-green-400",
  broken: "bg-red-500/20 text-red-400",
  under_maintenance: "bg-orange-500/20 text-orange-400",
  retired: "bg-zinc-500/20 text-zinc-400",
};

const STATUS_LABEL = {
  active: "Hoạt động",
  broken: "Hỏng",
  under_maintenance: "Đang sửa",
  retired: "Ngừng dùng",
};

const CATEGORY_LABEL = {
  hvac: "Điều hòa",
  electrical: "Điện",
  plumbing: "Nước",
  elevator: "Thang máy",
  furniture: "Nội thất",
  appliance: "Thiết bị",
  other: "Khác",
};

const emptyForm = {
  name: "",
  code: "",
  category: "hvac",
  locationId: "",
  brand: "",
  model: "",
  serialNumber: "",
  maintenanceIntervalDays: 90,
  status: "active",
  notes: "",
  purchaseDate: "",
  warrantyExpiry: "",
};

function getLocationIcon(type) {
  switch (type) {
    case "room": return "🚪";
    case "lobby": return "🏨";
    case "restaurant": return "🍽️";
    case "pool": return "🏊";
    case "gym": return "💪";
    case "elevator": return "🛗";
    default: return "📍";
  }
}

export default function AdminAssets() {
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [openLocations, setOpenLocations] = useState({});

  // Import Excel
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const importFileRef = useRef(null);

  // Lịch sử thiết bị
  const [historyModal, setHistoryModal] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assetRes, locationRes] = await Promise.all([
        assetService.getAll(),
        locationService.getAll()
      ]);
      setAssets(assetRes.data || []);
      setLocations(locationRes.data || []);
    } catch {
      setError("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const toggleLocation = (locationId) => {
    setOpenLocations((prev) => ({ ...prev, [locationId]: !prev[locationId] }));
  };

  const openAdd = (locationId = "") => {
    setEditingId("");
    setForm({ ...emptyForm, locationId });
    setError("");
    setShowModal(true);
  };

  const openEdit = (asset) => {
    setEditingId(asset._id);
    setForm({
      name: asset.name || "",
      code: asset.code || "",
      category: asset.category || "hvac",
      locationId: asset.locationId?._id || asset.locationId || "",
      brand: asset.brand || "",
      model: asset.model || "",
      serialNumber: asset.serialNumber || "",
      maintenanceIntervalDays: asset.maintenanceIntervalDays || 90,
      status: asset.status || "active",
      notes: asset.notes || "",
      purchaseDate: asset.purchaseDate
        ? new Date(asset.purchaseDate).toISOString().split("T")[0] : "",
      warrantyExpiry: asset.warrantyExpiry
        ? new Date(asset.warrantyExpiry).toISOString().split("T")[0] : "",
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setError("Vui lòng nhập tên và mã thiết bị");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        maintenanceIntervalDays: Number(form.maintenanceIntervalDays) || 0,
        purchaseDate: form.purchaseDate || null,
        warrantyExpiry: form.warrantyExpiry || null,
      };
      if (editingId) {
        await assetService.update(editingId, payload);
        setMessage("Đã cập nhật thiết bị");
      } else {
        await assetService.create(payload);
        setMessage("Đã thêm thiết bị mới");
      }
      setShowModal(false);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Xóa thiết bị "${name}"?`)) return;
    try {
      await assetService.delete(id);
      setAssets((prev) => prev.filter((item) => item._id !== id));
      setMessage("Đã xóa thiết bị");
    } catch {
      setError("Xóa thất bại");
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await importService.importExcel(file);
      setImportResult(res.data);
      await loadData();
    } catch (err) {
      setImportResult({ message: err.response?.data?.message || "Import thất bại" });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleViewHistory = async (asset) => {
    setHistoryModal(asset);
    setLoadingHistory(true);
    setHistoryData(null);
    try {
      const res = await assetService.getHistory(asset._id);
      setHistoryData(res.data);
    } catch {
      setHistoryData(null);
    } finally {
      setLoadingHistory(false);
    }
  };

  const grouped = locations.map((location) => ({
    location,
    assets: assets.filter((asset) => (asset.locationId?._id || asset.locationId) === location._id),
  }));

  const unassigned = assets.filter((asset) => !asset.locationId);
  const totalAssets = assets.length;
  const brokenCount = assets.filter((asset) => asset.status === "broken").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Thiết bị</h1>
          <p className="text-sm text-zinc-500">
            {totalAssets} thiết bị
            {brokenCount > 0 && <span className="ml-2 text-red-400">• {brokenCount} đang hỏng</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => importFileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50">
            {importing ? "⏳ Đang import..." : "📥 Import Excel"}
          </button>
          <input ref={importFileRef} type="file" accept=".xlsx,.xls"
            className="hidden" onChange={handleImport} />
          <button onClick={() => openAdd()}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400">
            + Thêm thiết bị
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          {message}
        </div>
      )}
      {error && !showModal && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Kết quả import */}
      {importResult && (
        <div className={`rounded-lg border px-4 py-4 text-sm ${
          importResult.result
            ? "border-green-500/30 bg-green-500/10 text-green-400"
            : "border-red-500/30 bg-red-500/10 text-red-400"
        }`}>
          <p className="font-bold mb-2">{importResult.message}</p>
          {importResult.result && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              {[
                { label: "📍 Vị trí mới", value: importResult.result.totalLocations },
                { label: "📦 Thiết bị mới", value: importResult.result.totalAssets },
                { label: "📅 Kế hoạch BT", value: importResult.result.totalPlans },
                { label: "⏭️ Bỏ qua", value: importResult.result.skipped },
              ].map(({ label, value }) => (
                <div key={label} className="bg-zinc-800 rounded-xl p-3 text-center">
                  <p className="text-white font-bold text-lg">{value}</p>
                  <p className="text-zinc-500 text-xs">{label}</p>
                </div>
              ))}
            </div>
          )}
          {importResult.result?.errors?.length > 0 && (
            <div className="mt-3">
              <p className="text-zinc-400 text-xs mb-1">Lỗi chi tiết:</p>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {importResult.result.errors.map((e, i) => (
                  <p key={i} className="text-red-400 text-xs">{e}</p>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => setImportResult(null)}
            className="mt-3 text-xs text-zinc-500 hover:text-white transition-colors">
            ✕ Đóng
          </button>
        </div>
      )}

      {/* Danh sách thiết bị */}
      {loading ? (
        <p className="py-12 text-center text-sm text-zinc-500">Đang tải...</p>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ location, assets: locationAssets }) => {
            const isOpen = !!openLocations[location._id];
            const brokenInLocation = locationAssets.filter((asset) => asset.status === "broken").length;

            return (
              <div key={location._id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                <div className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-zinc-800/50">
                  <button type="button" onClick={() => toggleLocation(location._id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="text-lg">{getLocationIcon(location.type)}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{location.name}</p>
                      <p className="text-xs text-zinc-500">
                        {locationAssets.length} thiết bị
                        {location.floor != null && ` • Tầng ${location.floor}`}
                        {brokenInLocation > 0 && <span className="ml-1 text-red-400">• {brokenInLocation} hỏng</span>}
                      </p>
                    </div>
                  </button>
                  <div className="ml-4 flex items-center gap-3">
                    <button type="button" onClick={() => openAdd(location._id)}
                      className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400 transition-colors hover:bg-amber-500/20">
                      + Thêm
                    </button>
                    <button type="button" onClick={() => toggleLocation(location._id)}
                      className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">
                      {isOpen ? "▲" : "▼"}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-zinc-800">
                    {locationAssets.length === 0 ? (
                      <div className="px-5 py-6 text-center">
                        <p className="text-sm text-zinc-600">Chưa có thiết bị nào</p>
                        <button onClick={() => openAdd(location._id)}
                          className="mt-2 text-xs text-amber-400 hover:text-amber-300">
                          + Thêm thiết bị đầu tiên
                        </button>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-800/50 text-xs uppercase text-zinc-600">
                            <th className="px-5 py-2 text-left">Tên thiết bị</th>
                            <th className="px-5 py-2 text-left">Mã</th>
                            <th className="px-5 py-2 text-left">Loại</th>
                            <th className="px-5 py-2 text-left">Trạng thái</th>
                            <th className="px-5 py-2 text-left">Bảo trì tiếp</th>
                            <th className="px-5 py-2 text-left">Ngày mua</th>
                            <th className="px-5 py-2 text-left">Còn BH đến</th>
                            <th className="px-5 py-2 text-left">Hành động</th>
                          </tr>
                        </thead>
                        <tbody>
                          {locationAssets.map((asset) => {
                            const isWarrantyExpired = asset.warrantyExpiry && new Date(asset.warrantyExpiry) < new Date();
                            return (
                              <tr key={asset._id}
                                className="border-b border-zinc-800/30 transition-colors hover:bg-zinc-800/20">
                                <td className="px-5 py-3">
                                  <p className="font-medium text-white">{asset.name}</p>
                                  {asset.brand && (
                                    <p className="text-xs text-zinc-600">{asset.brand} {asset.model}</p>
                                  )}
                                </td>
                                <td className="px-5 py-3 font-mono text-xs text-zinc-400">{asset.code}</td>
                                <td className="px-5 py-3 text-xs text-zinc-400">
                                  {CATEGORY_LABEL[asset.category] || asset.category}
                                </td>
                                <td className="px-5 py-3">
                                  <span className={`rounded-full px-2 py-1 text-xs ${STATUS_COLOR[asset.status] || STATUS_COLOR.active}`}>
                                    {STATUS_LABEL[asset.status] || asset.status}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-xs">
                                  {asset.nextMaintenanceDate ? (
                                    <span className="text-amber-400">
                                      {new Date(asset.nextMaintenanceDate).toLocaleDateString("vi-VN")}
                                    </span>
                                  ) : (
                                    <span className="text-zinc-600">—</span>
                                  )}
                                </td>
                                <td className="px-5 py-3 text-xs text-zinc-400">
                                  {asset.purchaseDate
                                    ? new Date(asset.purchaseDate).toLocaleDateString("vi-VN")
                                    : <span className="text-zinc-600">—</span>}
                                </td>
                                <td className="px-5 py-3 text-xs">
                                  {asset.warrantyExpiry ? (
                                    <span className={isWarrantyExpired ? "text-red-400" : "text-green-400"}>
                                      {new Date(asset.warrantyExpiry).toLocaleDateString("vi-VN")}
                                      {isWarrantyExpired ? " ⚠️" : ""}
                                    </span>
                                  ) : (
                                    <span className="text-zinc-600">—</span>
                                  )}
                                </td>
                                <td className="px-5 py-3">
                                  <div className="flex gap-3">
                                    <button onClick={() => openEdit(asset)}
                                      className="text-xs text-blue-400 transition-colors hover:text-blue-300">
                                      Sửa
                                    </button>
                                    <button onClick={() => handleViewHistory(asset)}
                                      className="text-xs text-amber-400 transition-colors hover:text-amber-300">
                                      Lịch sử
                                    </button>
                                    <button onClick={() => handleDelete(asset._id, asset.name)}
                                      className="text-xs text-red-400 transition-colors hover:text-red-300">
                                      Xóa
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Thiết bị chưa gắn vị trí */}
          {unassigned.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-orange-500/20 bg-zinc-900">
              <button onClick={() => toggleLocation("unassigned")}
                className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-zinc-800/50">
                <div className="flex items-center gap-3">
                  <span className="text-lg">⚠️</span>
                  <div className="text-left">
                    <p className="font-semibold text-orange-400">Chưa gắn vị trí</p>
                    <p className="text-xs text-zinc-500">{unassigned.length} thiết bị</p>
                  </div>
                </div>
                <span className="text-sm text-zinc-500">{openLocations.unassigned ? "▲" : "▼"}</span>
              </button>
              {openLocations.unassigned && (
                <div className="border-t border-orange-500/20">
                  <table className="w-full text-sm">
                    <tbody>
                      {unassigned.map((asset) => (
                        <tr key={asset._id}
                          className="border-b border-zinc-800/30 transition-colors hover:bg-zinc-800/20">
                          <td className="px-5 py-3">
                            <p className="font-medium text-white">{asset.name}</p>
                            <p className="text-xs text-zinc-600">{asset.code}</p>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs ${STATUS_COLOR[asset.status] || STATUS_COLOR.active}`}>
                              {STATUS_LABEL[asset.status] || asset.status}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex gap-3">
                              <button onClick={() => openEdit(asset)}
                                className="text-xs text-blue-400 transition-colors hover:text-blue-300">Sửa</button>
                              <button onClick={() => handleViewHistory(asset)}
                                className="text-xs text-amber-400 transition-colors hover:text-amber-300">Lịch sử</button>
                              <button onClick={() => handleDelete(asset._id, asset.name)}
                                className="text-xs text-red-400 transition-colors hover:text-red-300">Xóa</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {assets.length === 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center">
              <p className="mb-3 text-4xl">📦</p>
              <p className="text-sm text-zinc-400">Chưa có thiết bị nào</p>
              <button onClick={() => openAdd()}
                className="mt-3 text-sm text-amber-400 hover:text-amber-300">
                + Thêm thiết bị đầu tiên
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== MODAL THÊM/SỬA ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
            <h3 className="mb-5 font-bold text-white">
              {editingId ? "Chỉnh sửa thiết bị" : "Thêm thiết bị"}
            </h3>
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Tên thiết bị *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                    placeholder="Máy lạnh phòng 101" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Mã thiết bị *</label>
                  <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                    placeholder="AC-101" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Danh mục</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none">
                    {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Vị trí</label>
                  <select value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none">
                    <option value="">-- Chọn vị trí --</option>
                    {locations.map((location) => (
                      <option key={location._id} value={location._id}>{location.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Thương hiệu</label>
                  <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                    placeholder="Daikin, Samsung..." />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Model</label>
                  <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                    placeholder="FTKA25UAVMV" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Số serial</label>
                  <input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                    placeholder="SN123456" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Chu kỳ BT (ngày)</label>
                  <input type="number" min="1" value={form.maintenanceIntervalDays}
                    onChange={(e) => setForm({ ...form, maintenanceIntervalDays: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none" />
                </div>
              </div>

              {/* Ngày mua + Hết bảo hành */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Ngày mua</label>
                  <input type="date" value={form.purchaseDate}
                    onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Hết bảo hành</label>
                  <input type="date" value={form.warrantyExpiry}
                    onChange={(e) => setForm({ ...form, warrantyExpiry: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none" />
                </div>
              </div>

              {editingId && (
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Trạng thái</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none">
                    {Object.entries(STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Ghi chú</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                  rows={2} placeholder="Thông tin thêm..." />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg bg-zinc-800 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-700">
                Hủy
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 rounded-lg bg-amber-500 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-60">
                {saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Thêm thiết bị"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL LỊCH SỬ THIẾT BỊ ===== */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-white font-bold text-lg">{historyModal.name}</h3>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {historyModal.code} · {historyModal.locationId?.name}
                </p>
              </div>
              <button onClick={() => { setHistoryModal(null); setHistoryData(null); }}
                className="text-zinc-500 hover:text-white transition-colors">✕</button>
            </div>

            {loadingHistory ? (
              <p className="text-zinc-500 text-sm text-center py-12">Đang tải...</p>
            ) : !historyData ? (
              <p className="text-red-400 text-sm text-center py-12">Không thể tải dữ liệu</p>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-zinc-800 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-white">{historyData.stats.totalRepairs}</p>
                    <p className="text-zinc-500 text-xs mt-1">Tổng lần sửa</p>
                  </div>
                  <div className="bg-zinc-800 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-green-400">{historyData.stats.completedCount}</p>
                    <p className="text-zinc-500 text-xs mt-1">Hoàn thành</p>
                  </div>
                  <div className={`rounded-xl p-4 text-center ${
                    historyData.stats.totalCost > 5000000
                      ? "bg-red-500/10 border border-red-500/30"
                      : "bg-zinc-800"
                  }`}>
                    <p className={`text-2xl font-black ${
                      historyData.stats.totalCost > 5000000 ? "text-red-400" : "text-amber-400"
                    }`}>
                      {(historyData.stats.totalCost || 0).toLocaleString("vi-VN")}₫
                    </p>
                    <p className="text-zinc-500 text-xs mt-1">Tổng chi phí</p>
                    {historyData.stats.totalCost > 5000000 && (
                      <p className="text-red-400 text-xs mt-1 font-bold">⚠️ Chi phí cao!</p>
                    )}
                  </div>
                </div>

                {historyData.stats.totalRepairs >= 3 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                    <p className="text-red-400 text-sm font-medium">
                      🚨 Thiết bị này đã hỏng {historyData.stats.totalRepairs} lần —
                      cân nhắc thay mới để tiết kiệm chi phí bảo trì.
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="text-white font-semibold text-sm mb-3">Chi tiết lịch sử sửa chữa</h4>
                  {historyData.history.length === 0 ? (
                    <div className="bg-zinc-800 rounded-xl p-8 text-center">
                      <p className="text-4xl mb-2">✅</p>
                      <p className="text-zinc-400 text-sm">Chưa có lịch sử sửa chữa</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {historyData.history.map((req) => (
                        <div key={req._id} className={`border rounded-xl p-4 ${
                          req.status === "completed"
                            ? "bg-zinc-800/60 border-zinc-700"
                            : "bg-orange-500/5 border-orange-500/20"
                        }`}>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <p className="text-white font-medium text-sm">{req.title}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                              req.status === "completed"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-orange-500/20 text-orange-400"
                            }`}>
                              {req.status === "completed" ? "Hoàn thành" : "Đang xử lý"}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500 mb-2">
                            <span>📅 {new Date(req.createdAt).toLocaleDateString("vi-VN")}</span>
                            <span>👷 {req.assignedTo?.name || "Chưa giao"}</span>
                            <span>👤 Báo bởi: {req.reportedBy?.name}</span>
                            {req.completedAt && (
                              <span>✅ Xonssg: {new Date(req.completedAt).toLocaleDateString("vi-VN")}</span>
                            ) }
                          </div>
                          {req.resolution && (
                            <div className="bg-zinc-700/50 rounded-lg px-3 py-2 mt-2">
                              <p className="text-zinc-400 text-xs mb-0.5">Cách xử lý:</p>
                              <p className="text-zinc-300 text-xs">{req.resolution}</p>
                            </div>
                          )}
                          {req.cost?.total > 0 && (
                            <div className="flex gap-3 mt-2 text-xs">
                              <span className="text-zinc-500">Nhân công: {(req.cost.labor || 0).toLocaleString("vi-VN")}₫</span>
                              <span className="text-zinc-500">Linh kiện: {(req.cost.parts || 0).toLocaleString("vi-VN")}₫</span>
                              <span className="text-white font-bold">Tổng: {req.cost.total.toLocaleString("vi-VN")}₫</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <button onClick={() => { setHistoryModal(null); setHistoryData(null); }}
              className="w-full mt-5 bg-zinc-800 text-zinc-400 py-2.5 rounded-lg text-sm hover:bg-zinc-700 transition-colors">
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}