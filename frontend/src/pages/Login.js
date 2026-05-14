import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

const MAX_ATTEMPTS = 5;       // Số lần sai tối đa
const LOCKOUT_TIME = 30;      // Khóa bao nhiêu giây

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockout, setLockout] = useState(0); // số giây còn lại
  const { login } = useAuthStore();
  const navigate = useNavigate();

  // ✅ Đếm ngược khi bị khóa
  const startLockout = () => {
    let seconds = LOCKOUT_TIME;
    setLockout(seconds);
    const timer = setInterval(() => {
      seconds -= 1;
      setLockout(seconds);
      if (seconds <= 0) {
        clearInterval(timer);
        setAttempts(0);
        setError("");
      }
    }, 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Chặn nếu đang bị khóa
    if (lockout > 0) return;

    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      setAttempts(0);
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "staff") navigate("/staff");
      else navigate("/technician");
    } catch (err) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        // ✅ Ẩn thông báo lỗi chi tiết khi bị khóa
        setError(`Đăng nhập sai quá ${MAX_ATTEMPTS} lần. Vui lòng thử lại sau ${LOCKOUT_TIME} giây.`);
        startLockout();
      } else {
        // ✅ Thông báo chung, không tiết lộ email/password có tồn tại không
        setError(`Thông tin đăng nhập không chính xác. Còn ${MAX_ATTEMPTS - newAttempts} lần thử.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const isLocked = lockout > 0;

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-500 rounded-xl mb-4">
            <span className="text-2xl">🔧</span>
          </div>
          <h1 className="text-2xl font-black text-white">
            MAINTAIN<span className="text-amber-500">PRO</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Hệ thống quản lý bảo trì khách sạn</p>
        </div>

        {/* Form */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <h2 className="text-white font-bold text-lg mb-6">Đăng nhập</h2>

          {error && (
            <div className={`border rounded-lg px-4 py-3 mb-4 text-sm ${
              isLocked
                ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}>
              {/* ✅ Hiện đếm ngược khi bị khóa */}
              {isLocked ? `🔒 ${error.split(".")[0]}. Thử lại sau ${lockout}s` : error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            <div>
              <label className="text-zinc-400 text-xs uppercase tracking-widest block mb-2">Email</label>
              <input
                type="email"
                name="email"
                autoComplete="email"  // ✅ Bật gợi ý Gmail/trình duyệt
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50"
                placeholder="admin@hotel.com"
                required
                disabled={isLocked}
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs uppercase tracking-widest block mb-2">Mật khẩu</label>
              <input
                type="password"
                name="password"
                autoComplete="current-password"  // ✅ Bật gợi ý mật khẩu đã lưu
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50"
                placeholder="••••••••"
                required
                disabled={isLocked}
              />
            </div>
            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold py-3 rounded-lg transition-all text-sm"
            >
              {isLocked
                ? `🔒 Thử lại sau ${lockout}s`
                : loading
                ? "Đang đăng nhập..."
                : "ĐĂNG NHẬP"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}