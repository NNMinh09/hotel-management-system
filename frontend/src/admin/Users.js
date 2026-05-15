import React, { useEffect, useState } from "react";
import { authService, userService } from "../services";
import api from "../services/api";

const ROLE_COLOR = {
  admin: "bg-amber-500/20 text-amber-400",
  staff: "bg-blue-500/20 text-blue-400",
  technician: "bg-green-500/20 text-green-400",
};

const ROLE_LABEL = {
  admin: "Admin",
  staff: "Nhân viên",
  technician: "Kỹ thuật viên",
};

const PAGE_SIZE = 10;

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", role: "staff", specialization: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // ✅ Phân trang
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(users.length / PAGE_SIZE);
  const pagedUsers = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const fetchUsers = () => {
    authService.getUsers()
      .then((res) => { setUsers(res.data || []); setError(""); })
      .catch((err) => { setError(err.response?.data?.message || "Không thể tải danh sách nhân viên"); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.phone || !form.password) {
      setError("Vui lòng điền đầy đủ thông tin"); return;
    }
    setSaving(true);
    try {
      await api.post("/auth/register", form);
      setMessage("Đã tạo tài khoản thành công");
      setShowCreateModal(false);
      setForm({ name: "", email: "", phone: "", password: "", role: "staff", specialization: "" });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Tạo thất bại");
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (user) => {
    const action = user.isActive ? "khóa" : "mở khóa";
    if (!window.confirm(`${action} tài khoản "${user.name}"?`)) return;
    try {
      const res = await userService.toggleActive(user._id);
      setMessage(res.data.message);
      fetchUsers();
    } catch (err) { setError(err.response?.data?.message || "Thao tác thất bại"); }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) { setError("Mật khẩu phải có ít nhất 6 ký tự"); return; }
    if (newPassword !== confirmPassword) { setError("Mật khẩu xác nhận không khớp"); return; }
    setSaving(true);
    try {
      await userService.resetPassword(showResetModal._id, newPassword);
      setMessage(`Đã đổi mật khẩu cho "${showResetModal.name}"`);
      setShowResetModal(null); setNewPassword(""); setConfirmPassword("");
    } catch (err) { setError(err.response?.data?.message || "Đổi mật khẩu thất bại"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Nhân viên</h1>
          <p className="text-sm text-zinc-500">{users.length} tài khoản</p>
        </div>
        <button
          onClick={() => { setShowCreateModal(true); setError(""); }}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400"
        >
          + Thêm nhân viên
        </button>
      </div>

      {message && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">{message}</div>
      )}
      {error && !showCreateModal && !showResetModal && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {loading ? (
        <p className="py-12 text-center text-sm text-zinc-500">Đang tải...</p>
      ) : (
        <>
          {/* ✅ Desktop: Table */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs uppercase text-zinc-500">
                  <th className="px-5 py-3">Họ tên</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Số điện thoại</th>
                  <th className="px-5 py-3">Vai trò</th>
                  <th className="px-5 py-3">Chuyên môn</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.map((user) => (
                  <tr key={user._id} className="border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30">
                    <td className="px-5 py-4 font-medium text-white">{user.name}</td>
                    <td className="px-5 py-4 text-zinc-400">{user.email}</td>
                    <td className="px-5 py-4 text-zinc-400">{user.phone}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs ${ROLE_COLOR[user.role]}`}>{ROLE_LABEL[user.role]}</span>
                    </td>
                    <td className="px-5 py-4 text-zinc-400">{user.specialization || "—"}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs ${user.isActive !== false ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                        {user.isActive !== false ? "Hoạt động" : "Đã khóa"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {user.role !== "admin" && (
                        <div className="flex gap-3">
                          <button onClick={() => { setShowResetModal(user); setNewPassword(""); setConfirmPassword(""); setError(""); }} className="text-xs text-blue-400 hover:text-blue-300">Đổi MK</button>
                          <button onClick={() => handleToggleActive(user)} className={`text-xs ${user.isActive !== false ? "text-red-400 hover:text-red-300" : "text-green-400 hover:text-green-300"}`}>
                            {user.isActive !== false ? "Khóa" : "Mở khóa"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ✅ Mobile: Card layout */}
          <div className="md:hidden space-y-3">
            {pagedUsers.map((user) => (
              <div key={user._id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-white">{user.name}</p>
                    <p className="text-xs text-zinc-400">{user.email}</p>
                    <p className="text-xs text-zinc-400">{user.phone}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs ${ROLE_COLOR[user.role]}`}>
                    {ROLE_LABEL[user.role]}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                  <span className={`rounded-full px-2 py-1 text-xs ${user.isActive !== false ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {user.isActive !== false ? "Hoạt động" : "Đã khóa"}
                  </span>
                  {user.role !== "admin" && (
                    <div className="flex gap-3">
                      <button onClick={() => { setShowResetModal(user); setNewPassword(""); setConfirmPassword(""); setError(""); }} className="text-xs text-blue-400">Đổi MK</button>
                      <button onClick={() => handleToggleActive(user)} className={`text-xs ${user.isActive !== false ? "text-red-400" : "text-green-400"}`}>
                        {user.isActive !== false ? "Khóa" : "Mở khóa"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ✅ Phân trang */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-zinc-500">
                Trang {page} / {totalPages} ({users.length} tài khoản)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 disabled:opacity-40 hover:bg-zinc-800"
                >
                  ← Trước
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 disabled:opacity-40 hover:bg-zinc-800"
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Thêm nhân viên */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="mb-5 font-bold text-white">Thêm nhân viên</h3>
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>
            )}
            <div className="space-y-3">
              {[
                { label: "Họ tên", key: "name", placeholder: "Nguyễn Văn A" },
                { label: "Email", key: "email", placeholder: "nva@hotel.com" },
                { label: "Số điện thoại", key: "phone", placeholder: "0123456789" },
                { label: "Mật khẩu", key: "password", placeholder: "••••••••", type: "password" },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">{label}</label>
                  <input
                    type={type || "text"}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                    placeholder={placeholder}
                  />
                </div>
              ))}
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Vai trò</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none">
                  <option value="staff">Nhân viên</option>
                  <option value="technician">Kỹ thuật viên</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {form.role === "technician" && (
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Chuyên môn</label>
                  <select value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none">
                    <option value="general">Đa năng</option>
                    <option value="electrical">Điện</option>
                    <option value="plumbing">Nước</option>
                    <option value="hvac">Điều hòa</option>
                    <option value="elevator">Thang máy</option>
                  </select>
                </div>
              )}
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 rounded-lg bg-zinc-800 py-2.5 text-sm text-zinc-400 hover:bg-zinc-700">Hủy</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 rounded-lg bg-amber-500 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-60">
                {saving ? "Đang tạo..." : "Tạo tài khoản"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Đổi mật khẩu */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
            <h3 className="mb-1 font-bold text-white">Đổi mật khẩu</h3>
            <p className="mb-5 text-sm text-zinc-500">Tài khoản: <span className="text-white">{showResetModal.name}</span></p>
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>
            )}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Mật khẩu mới</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none" placeholder="Tối thiểu 6 ký tự" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-zinc-400">Xác nhận mật khẩu mới</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none" placeholder="Nhập lại mật khẩu" />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => { setShowResetModal(null); setError(""); }} className="flex-1 rounded-lg bg-zinc-800 py-2.5 text-sm text-zinc-400 hover:bg-zinc-700">Hủy</button>
              <button onClick={handleResetPassword} disabled={saving} className="flex-1 rounded-lg bg-amber-500 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-60">
                {saving ? "Đang lưu..." : "Đổi mật khẩu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}