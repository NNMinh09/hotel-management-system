import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import useThemeStore from "../store/themeStore";

const navItems = [
  { to: "/staff", label: "Báo hỏng", icon: "📣", end: true },
  { to: "/staff/my-requests", label: "Yêu cầu của tôi", icon: "🧾" },
];

export default function StaffLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useThemeStore();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-white">

      {/* ✅ Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 flex w-56 flex-col border-r border-zinc-800 bg-zinc-900
        transform transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:relative md:translate-x-0
      `}>
        <div className="border-b border-zinc-800 px-4 py-5">
          <h1 className="text-sm font-black">
            MAINTAIN<span className="text-amber-500">PRO</span>
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500">Nhân viên</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={closeSidebar} // ✅ Đóng sidebar khi bấm menu
              className={({ isActive }) =>
                `block rounded-lg border px-3 py-2.5 text-sm transition-all ${
                  isActive
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                    : "border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`
              }
            >
              {icon} {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-white">{user?.name || "Nhân viên"}</p>
            {/* ✅ Nút chuyển Dark/Light mode */}
            <button
              onClick={toggleTheme}
              className="rounded-lg border border-zinc-700 px-2 py-1 text-sm hover:bg-zinc-800 transition-all"
              title={theme === "dark" ? "Chuyển sang sáng" : "Chuyển sang tối"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
          <p className="mb-3 text-xs text-zinc-500">Nhân viên</p>
          <button
            onClick={handleLogout}
            className="w-full text-xs text-zinc-500 transition-colors hover:text-red-400"
          >
            ← Đăng xuất
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
          <h1 className="text-sm font-black">
            MAINTAIN<span className="text-amber-500">PRO</span>
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="text-sm">{theme === "dark" ? "☀️" : "🌙"}</button>
            <span className="text-xs text-zinc-500">{user?.name}</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-zinc-950 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}