import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: "📊", end: true },
  { to: "/admin/requests", label: "Yêu cầu bảo trì", icon: "🔧" },
  { to: "/admin/locations", label: "Vị trí", icon: "📍" },
  { to: "/admin/assets", label: "Thiết bị", icon: "📦" },
  { to: "/admin/users", label: "Nhân viên", icon: "👥" },
  { to: "/admin/preventive", label: "Bảo trì định kỳ", icon: "🗓️" },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-white">

      {/* ✅ Overlay mobile — bấm ra ngoài để đóng sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-zinc-800 bg-zinc-900
        transform transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:relative md:translate-x-0
      `}>
        <div className="border-b border-zinc-800 p-6">
          <h1 className="text-xl font-black tracking-tighter text-amber-500">MAINTAIN PRO</h1>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          {navItems.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={closeSidebar} // ✅ Đóng sidebar khi bấm menu trên mobile
              className={({ isActive }) =>
                `block rounded-lg border px-4 py-3 text-sm transition-all ${
                  isActive
                    ? "border-amber-500/40 bg-amber-500/15 font-semibold text-amber-400"
                    : "border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-800 hover:text-white"
                }`
              }
            >
              {icon} {label}
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

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* ✅ Topbar mobile */}
        <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-zinc-400 hover:text-white text-2xl"
          >
            ☰
          </button>
          <h1 className="text-sm font-black text-amber-500">MAINTAIN PRO</h1>
          <span className="text-xs text-zinc-500">{user?.name}</span>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}