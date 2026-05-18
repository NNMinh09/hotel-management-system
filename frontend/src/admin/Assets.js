import React, { useEffect, useMemo, useRef, useState } from "react";
import { assetService, importService, locationService } from "../services";
import Pagination from "../components/Pagination";

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

const ASSETS_PER_PAGE = 5;

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

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function getLocationIcon(type) {
  switch (type) {
    case "room":
      return "📍";
    case "lobby":
      return "🏨";
    case "restaurant":
      return "🍽️";
    case "pool":
      return "🏊";
    case "gym":
      return "🏋️";
    case "elevator":
      return "🛗";
    default:
      return "📌";
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
  const [assetPages, setAssetPages] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const importFileRef = useRef(null);
  const [historyModal, setHistoryModal] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assetRes, locationRes] = await Promise.all([
        assetService.getAll(),
        locationService.getAll(),
      ]);
      setAssets(assetRes.data || []);
      setLocations(locationRes.data || []);
      setError("");
    } catch {
      setError("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const grouped = useMemo(
    () =>
      locations.map((location) => ({
        location,
        assets: assets.filter((asset) => (asset.locationId?._id || asset.locationId) === location._id),
      })),
    [assets, locations]
  );

  const unassigned = useMemo(() => assets.filter((asset) => !asset.locationId), [assets]);
  const totalAssets = assets.length;
  const brokenCount = assets.filter((asset) => asset.status === "broken").length;

  const toggleLocation = (locationId) => {
    setOpenLocations((prev) => ({ ...prev, [locationId]: !prev[locationId] }));
  };

  const changeAssetPage = (locationKey, nextPage) => {
    setAssetPages((prev) => ({ ...prev, [locationKey]: nextPage }));
  };

  const getAssetPageData = (items, locationKey) => {
    const totalPages = Math.max(1, Math.ceil(items.length / ASSETS_PER_PAGE));
    const currentPage = Math.min(assetPages[locationKey] || 1, totalPages);
    const startIndex = (currentPage - 1) * ASSETS_PER_PAGE;

    return {
      totalPages,
      currentPage,
      items: items.slice(startIndex, startIndex + ASSETS_PER_PAGE),
      visibleFrom: items.length === 0 ? 0 : startIndex + 1,
      visibleTo: items.length === 0 ? 0 : Math.min(startIndex + ASSETS_PER_PAGE, items.length),
    };
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
      purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split("T")[0] : "",
      warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toISOString().split("T")[0] : "",
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
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    try {
      const res = await importService.importExcel(file);
      setImportResult(res.data);
      await loadData();
    } catch (err) {
      setImportResult({
        result: null,
        message: err.response?.data?.message || "Import thất bại",
      });
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

  const renderSection = (title, locationKey, items, icon, description, addLocationId = "") => {
    const pageData = getAssetPageData(items, locationKey);

    return (
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="text-lg">{icon}</span>
            <div className="min-w-0">
              <p className="font-semibold text-white">{title}</p>
              <p className="text-xs text-zinc-500">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openAdd(addLocationId)}
            className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400 transition-colors hover:bg-amber-500/20"
          >
            + Thêm
          </button>
        </div>

        <div className="border-t border-zinc-800 px-5 py-4">
          {items.length === 0 ? (
            <p className="text-sm text-zinc-500">Chưa có thiết bị nào.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-zinc-400">
                  Hiển thị <span className="font-semibold text-white">{pageData.visibleFrom}-{pageData.visibleTo}</span> / {items.length} thiết bị
                </p>
                <div className="w-full md:w-auto">
                  <Pagination
                    currentPage={pageData.currentPage}
                    totalPages={pageData.totalPages}
                    onPageChange={(page) => changeAssetPage(locationKey, page)}
                    itemLabel={`${pageData.visibleTo - pageData.visibleFrom + 1} thiết bị trên trang này`}
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-950/60 text-left text-xs uppercase tracking-widest text-zinc-500">
                    <tr>
                      <th className="px-4 py-3">Thiết bị</th>
                      <th className="px-4 py-3">Mã</th>
                      <th className="px-4 py-3">Loại</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">Bảo trì tiếp</th>
                      <th className="px-4 py-3 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.items.map((asset) => (
                      <tr key={asset._id} className="border-t border-zinc-800 text-zinc-300">
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{asset.name}</p>
                          <p className="text-xs text-zinc-500">{asset.brand || "-"} {asset.model || ""}</p>
                        </td>
                        <td className="px-4 py-3">{asset.code}</td>
                        <td className="px-4 py-3">{CATEGORY_LABEL[asset.category] || asset.category}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-1 text-xs ${STATUS_COLOR[asset.status] || STATUS_COLOR.active}`}>
                            {STATUS_LABEL[asset.status] || asset.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-amber-400">
                          {asset.nextMaintenanceDate
                            ? new Date(asset.nextMaintenanceDate).toLocaleDateString("vi-VN")
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-3 text-xs">
                            <button
                              type="button"
                              onClick={() => handleViewHistory(asset)}
                              className="text-zinc-400 hover:text-white"
                            >
                              Lịch sử
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(asset)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(asset._id, asset.name)}
                              className="text-red-400 hover:text-red-300"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            {importing ? "Đang import..." : "Import Excel"}
          </button>
          <input ref={importFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <button
            onClick={() => openAdd()}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400"
          >
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

      {importResult && (
        <div className={`rounded-lg border px-4 py-4 text-sm ${importResult.result ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-red-500/30 bg-red-500/10 text-red-400"}`}>
          <p className="font-bold">{importResult.message}</p>
          {importResult.result && (
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <ImportStat label="Vị trí mới" value={importResult.result.totalLocations} />
              <ImportStat label="Thiết bị mới" value={importResult.result.totalAssets} />
              <ImportStat label="Kế hoạch BT" value={importResult.result.totalPlans} />
              <ImportStat label="Bỏ qua" value={importResult.result.skipped} />
            </div>
          )}
          {importResult.result?.errors?.length > 0 && (
            <div className="mt-3 space-y-1">
              {importResult.result.errors.map((item, index) => (
                <p key={index} className="text-xs text-red-300">{item}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="py-12 text-center text-sm text-zinc-500">Đang tải...</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ location, assets: locationAssets }) => {
            const isOpen = !!openLocations[location._id];
            const brokenInLocation = locationAssets.filter((asset) => asset.status === "broken").length;

            return (
              <div key={location._id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                <div className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-zinc-800/50">
                  <button
                    type="button"
                    onClick={() => toggleLocation(location._id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
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
                    <button
                      type="button"
                      onClick={() => openAdd(location._id)}
                      className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400 transition-colors hover:bg-amber-500/20"
                    >
                      + Thêm
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleLocation(location._id)}
                      className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
                    >
                      {isOpen ? "Ẩn" : "Mở"}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-zinc-800 px-5 py-4">
                    {renderSection(
                      location.name,
                      location._id,
                      locationAssets,
                      getLocationIcon(location.type),
                      `${locationAssets.length} thiết bị tại khu vực này`,
                      location._id
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {unassigned.length > 0 && (
            renderSection(
              "Chưa gắn vị trí",
              "unassigned",
              unassigned,
              "📦",
              `${unassigned.length} thiết bị chưa có vị trí`,
              ""
            )
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
            <h3 className="mb-5 font-bold text-white">
              {editingId ? "Sửa thiết bị" : "Thêm thiết bị"}
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
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                    placeholder="Máy lạnh phòng 101"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Mã thiết bị *</label>
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                    placeholder="AC-101"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Danh mục</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                  >
                    {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Vị trí</label>
                  <select
                    value={form.locationId}
                    onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                  >
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
                  <input
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                    placeholder="Daikin, Samsung..."
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Model</label>
                  <input
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                    placeholder="FTKA25UAVMV"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Số serial</label>
                  <input
                    value={form.serialNumber}
                    onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                    placeholder="SN123456"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Chu kỳ BT (ngày)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.maintenanceIntervalDays}
                    onChange={(e) => setForm({ ...form, maintenanceIntervalDays: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Ngày mua</label>
                  <input
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Hết bảo hành</label>
                  <input
                    type="date"
                    value={form.warrantyExpiry}
                    onChange={(e) => setForm({ ...form, warrantyExpiry: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {editingId && (
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Trạng thái</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                  >
                    {Object.entries(STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Ghi chú</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                  rows={3}
                  placeholder="Thông tin thêm..."
                />
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg bg-zinc-800 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-700"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-lg bg-amber-500 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-60"
              >
                {saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Thêm thiết bị"}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">{historyModal.name}</h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {historyModal.code} • {historyModal.locationId?.name || "Chưa gắn vị trí"}
                </p>
              </div>
              <button
                onClick={() => {
                  setHistoryModal(null);
                  setHistoryData(null);
                }}
                className="text-zinc-500 hover:text-white"
              >
                Đóng
              </button>
            </div>

            {loadingHistory ? (
              <p className="py-12 text-center text-sm text-zinc-500">Đang tải...</p>
            ) : !historyData ? (
              <p className="py-12 text-center text-sm text-red-400">Không thể tải dữ liệu</p>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <HistoryStat label="Tổng lần sửa" value={historyData.stats?.totalRepairs || 0} valueClass="text-white" />
                  <HistoryStat label="Hoàn thành" value={historyData.stats?.completedCount || 0} valueClass="text-green-400" />
                  <HistoryStat label="Tổng chi phí" value={formatCurrency(historyData.stats?.totalCost || 0)} valueClass="text-amber-400" />
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-semibold text-white">Lịch sử sửa chữa</h4>
                  {historyData.history?.length ? (
                    <div className="space-y-3">
                      {historyData.history.map((req) => (
                        <div key={req._id} className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <p className="text-sm font-medium text-white">{req.title}</p>
                            <span className={`rounded-full px-2 py-0.5 text-xs ${req.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-orange-500/20 text-orange-400"}`}>
                              {req.status === "completed" ? "Hoàn thành" : "Đang xử lý"}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-2 text-xs text-zinc-500 md:grid-cols-2">
                            <span>Ngày tạo: {new Date(req.createdAt).toLocaleDateString("vi-VN")}</span>
                            <span>Kỹ thuật viên: {req.assignedTo?.name || "Chưa giao"}</span>
                            <span>Người báo: {req.reportedBy?.name || "-"}</span>
                            {req.completedAt && <span>Hoàn thành: {new Date(req.completedAt).toLocaleDateString("vi-VN")}</span>}
                          </div>
                          {req.resolution && (
                            <div className="mt-2 rounded-lg bg-zinc-700/50 px-3 py-2">
                              <p className="mb-0.5 text-xs text-zinc-400">Cách xử lý:</p>
                              <p className="text-xs text-zinc-300">{req.resolution}</p>
                            </div>
                          )}
                          {req.cost?.total > 0 && (
                            <div className="mt-2 flex flex-wrap gap-3 text-xs">
                              <span className="text-zinc-500">Nhân công: {formatCurrency(req.cost.labor || 0)}</span>
                              <span className="text-zinc-500">Linh kiện: {formatCurrency(req.cost.parts || 0)}</span>
                              <span className="font-bold text-white">Tổng: {formatCurrency(req.cost.total)}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-zinc-800 p-8 text-center text-sm text-zinc-400">
                      Chưa có lịch sử sửa chữa
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ImportStat({ label, value }) {
  return (
    <div className="rounded-xl bg-zinc-800 p-3 text-center">
      <p className="text-lg font-bold text-white">{value || 0}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function HistoryStat({ label, value, valueClass }) {
  return (
    <div className="rounded-xl bg-zinc-800 p-4 text-center">
      <p className={`text-2xl font-black ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  );
}