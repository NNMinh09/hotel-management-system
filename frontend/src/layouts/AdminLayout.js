import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

const navItems = [
  { to: "/admin", label: "📊 Dashboard", end: true },
  { to: "/admin/requests", label: "🔧 Yêu cầu bảo trì" },
  { to: "/admin/locations", label: "📍 Vị trí" },
  { to: "/admin/assets", label: "📦 Thiết bị" },
  { to: "/admin/users", label: "👥 Nhân viên" },
  { to: "/admin/preventive", label: "🗓️ Bảo trì định kỳ" },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-white">
      <aside className="flex w-64 flex-col border-r border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 p-6">
          <h1 className="text-xl font-black tracking-tighter text-amber-500">MAINTAIN PRO</h1>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          {navItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `block rounded-lg border px-4 py-3 text-sm transition-all ${
                  isActive
                    ? "border-amber-500/40 bg-amber-500/15 font-semibold text-amber-400"
                    : "border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-800 hover:text-white"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-zinc-800 p-4">
          <div className="mb-4 px-2">
            <p className="truncate text-sm font-bold text-white">{user?.name || "Admin"}</p>
            <p className="text-xs uppercase text-zinc-500">{user?.role || "admin"}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full rounded-lg bg-red-500/10 py-2 text-xs text-red-400 transition-all hover:bg-red-500 hover:text-white"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
