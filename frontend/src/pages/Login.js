import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "staff") navigate("/staff");
      else navigate("/technician");
    } catch (err) {
      setError(err.response?.data?.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

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
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-zinc-400 text-xs uppercase tracking-widest block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
                placeholder="admin@hotel.com"
                required
              />
            </div>
            <div>
              <label className="text-zinc-400 text-xs uppercase tracking-widest block mb-2">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold py-3 rounded-lg transition-all text-sm"
            >
              {loading ? "Đang đăng nhập..." : "ĐĂNG NHẬP"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}