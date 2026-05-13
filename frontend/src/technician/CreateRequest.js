import React, { useEffect, useRef, useState } from "react";
import { maintenanceService, locationService, assetService } from "../services";

export default function TechCreateRequest() {
  const [locations, setLocations] = useState([]);
  const [assets, setAssets] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    locationId: "",
    assetId: "",
    priority: "medium",
    type: "repair",
  });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    Promise.all([locationService.getAll(), assetService.getAll()])
      .then(([locationRes, assetRes]) => {
        setLocations(locationRes.data || []);
        setAssets(assetRes.data || []);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Không thể tải dữ liệu ban đầu");
      });
  }, []);

  const handleFiles = (files) => {
    const nextFiles = Array.from(files || []);
    setImages((prev) => [...prev, ...nextFiles].slice(0, 5));
    setPreviews((prev) => [...prev, ...nextFiles.map((file) => URL.createObjectURL(file))].slice(0, 5));
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setPreviews((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.locationId) {
      setError("Vui lòng nhập tiêu đề và chọn vị trí");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });
      images.forEach((image) => formData.append("images", image));

      await maintenanceService.create(formData);
      setSuccess(true);
      setForm({
        title: "",
        description: "",
        locationId: "",
        assetId: "",
        priority: "medium",
        type: "repair",
      });
      setImages([]);
      setPreviews([]);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Tạo phiếu thất bại");
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = form.locationId
    ? assets.filter((asset) => (asset.locationId?._id || asset.locationId) === form.locationId)
    : assets;

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Tạo phiếu bảo trì</h1>
        <p className="text-sm text-zinc-500">Tự tạo phiếu khi phát hiện thiết bị có vấn đề</p>
      </div>

      {success && (
        <div className="mb-5 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          Đã tạo phiếu! Phiếu được giao cho bạn xử lý luôn.
        </div>
      )}
      {error && (
        <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-widest text-zinc-400">Loại phiếu</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "repair", label: "Sửa chữa" },
              { value: "scheduled", label: "Bảo trì định kỳ" },
              { value: "inspection", label: "Kiểm tra" },
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
          <label className="mb-2 block text-xs uppercase tracking-widest text-zinc-400">Tiêu đề *</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none"
            placeholder="Máy bơm có tiếng kêu lạ, điều hòa rò gas..."
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-widest text-zinc-400">Mô tả chi tiết</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none"
            rows={3}
            placeholder="Mô tả triệu chứng, mức độ nghiêm trọng..."
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-widest text-zinc-400">Vị trí *</label>
          <select
            value={form.locationId}
            onChange={(e) => setForm({ ...form, locationId: e.target.value, assetId: "" })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none"
            required
          >
            <option value="">-- Chọn vị trí --</option>
            {locations.map((location) => (
              <option key={location._id} value={location._id}>{location.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-widest text-zinc-400">Thiết bị</label>
          <select
            value={form.assetId}
            onChange={(e) => setForm({ ...form, assetId: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none"
          >
            <option value="">-- Chọn thiết bị --</option>
            {filteredAssets.map((asset) => (
              <option key={asset._id} value={asset._id}>{asset.name} ({asset.code})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-widest text-zinc-400">Mức độ ưu tiên</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: "low", label: "Thấp", color: "border-zinc-600 text-zinc-400" },
              { value: "medium", label: "Trung bình", color: "border-blue-500 text-blue-400" },
              { value: "high", label: "Cao", color: "border-orange-500 text-orange-400" },
              { value: "urgent", label: "Khẩn", color: "border-red-500 text-red-400" },
            ].map(({ value, label, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm({ ...form, priority: value })}
                className={`rounded-lg border py-2 text-xs transition-all ${form.priority === value ? `${color} bg-zinc-800` : "border-zinc-700 text-zinc-600"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-widest text-zinc-400">Ảnh chụp thực tế ({images.length}/5)</label>

          {previews.length > 0 && (
            <div className="mb-3 grid grid-cols-3 gap-2">
              {previews.map((src, index) => (
                <div key={index} className="group relative">
                  <img src={src} alt={`preview-${index}`} className="h-24 w-full rounded-lg border border-zinc-700 object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {images.length < 5 && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 py-3 text-sm text-zinc-300 transition-all hover:bg-zinc-700"
              >
                Chụp ảnh
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 py-3 text-sm text-zinc-300 transition-all hover:bg-zinc-700"
              >
                Chọn ảnh
              </button>
            </div>
          )}

          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-amber-500 py-3 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-50"
        >
          {loading ? "Đang tạo..." : "Tạo phiếu bảo trì"}
        </button>
      </form>
    </div>
  );
}