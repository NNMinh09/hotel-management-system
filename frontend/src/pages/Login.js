import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 30;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockout, setLockout] = useState(0);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const startLockout = () => {
    let seconds = LOCKOUT_TIME;
    setLockout(seconds);
    const timer = setInterval(() => {
      seconds -= 1;
      setLockout(seconds);
      if (seconds <= 0) { clearInterval(timer); setAttempts(0); setError(""); }
    }, 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        setError(`Đăng nhập sai quá ${MAX_ATTEMPTS} lần. Thử lại sau ${LOCKOUT_TIME} giây.`);
        startLockout();
      } else {
        setError(`Thông tin không chính xác. Còn ${MAX_ATTEMPTS - newAttempts} lần thử.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const isLocked = lockout > 0;

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-zinc-950">

      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)",
          backgroundSize: "40px 40px"
        }} />
      </div>

      {/* Left panel — desktop only */}
      <div className="relative hidden w-1/2 flex-col items-start justify-between bg-zinc-900 p-12 lg:flex border-r border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30">
            <span className="text-xl font-black text-zinc-950">M</span>
          </div>
          <div>
            <h1 className="text-base font-black text-white">MAINTAIN<span className="text-amber-400">PRO</span></h1>
            <p className="text-xs text-zinc-500">Hotel Maintenance System</p>
          </div>
        </div>

        <div>
          <div className="mb-8 space-y-4">
            {[
              { icon: "◈", title: "Quản lý yêu cầu", desc: "Tạo và theo dõi phiếu bảo trì theo thời gian thực" },
              { icon: "◎", title: "Phân công thông minh", desc: "Giao việc tự động cho kỹ thuật viên phù hợp" },
              { icon: "◷", title: "Bảo trì định kỳ", desc: "Lên lịch tự động và nhắc nhở trước hạn" },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-800/30 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-lg text-amber-400">{icon}</div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600">© 2026 MaintainPro. Hệ thống quản lý bảo trì khách sạn.</p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="relative flex flex-1 flex-col items-center justify-center p-6">

        {/* Mobile logo */}
        <div className="mb-8 flex flex-col items-center lg:hidden">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-xl shadow-amber-500/30">
            <span className="text-2xl font-black text-zinc-950">M</span>
          </div>
          <h1 className="text-xl font-black text-white">MAINTAIN<span className="text-amber-400">PRO</span></h1>
          <p className="text-xs text-zinc-500">Hotel Maintenance System</p>
        </div>

        {/* Form card */}
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-white">Đăng nhập</h2>
            <p className="mt-1 text-sm text-zinc-500">Chào mừng trở lại, nhập thông tin để tiếp tục</p>
          </div>

          {error && (
            <div className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
              isLocked
                ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}>
              <span className="mt-0.5 text-base">{isLocked ? "🔒" : "⚠"}</span>
              <span>{isLocked ? `${error.split(".")[0]}. Thử lại sau ${lockout}s` : error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-500">Tên đăng nhập</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">◉</span>
                <input
                  type="text"
                  name="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLocked}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-9 pr-4 text-sm text-white placeholder-zinc-700 transition-all focus:border-amber-500/50 focus:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500/10 disabled:opacity-50"
                  placeholder="admin hoặc admin@hotel.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-500">Mật khẩu</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">◈</span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLocked}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-9 pr-10 text-sm text-white placeholder-zinc-700 transition-all focus:border-amber-500/50 focus:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500/10 disabled:opacity-50"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-600 hover:text-zinc-400"
                >
                  {showPassword ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || isLocked}
              className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 py-3 text-sm font-bold text-zinc-950 shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLocked ? `🔒 Thử lại sau ${lockout}s` : loading ? "Đang đăng nhập..." : "ĐĂNG NHẬP →"}
            </button>
          </form>

          {/* Attempts indicator */}
          {attempts > 0 && !isLocked && (
            <div className="mt-4 flex justify-center gap-1">
              {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 w-6 rounded-full transition-all ${i < attempts ? "bg-red-500" : "bg-zinc-800"}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}