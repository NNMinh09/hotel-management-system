import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import useThemeStore from "../store/themeStore";

export default function TechLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">

      {/* Sidebar — chỉ hiện trên desktop */}
      <aside className="hidden md:flex w-56 bg-zinc-900 border-r border-zinc-800 flex-col">
        <div className="px-4 py-5 border-b border-zinc-800">
          <h1 className="font-black text-sm">
            MAINTAIN<span className="text-amber-500">PRO</span>
          </h1>
          <p className="text-zinc-500 text-xs mt-0.5">Kỹ thuật viên</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <NavLink to="/technician" end
            className={({ isActive }) =>
              `block px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "text-zinc-500 hover:text-white hover:bg-zinc-800"
              }`
            }>
            🔧 Việc của tôi
          </NavLink>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center justify-between mb-1">
            <p className="text-white text-sm font-medium">{user?.name}</p>
            {/* ✅ Nút chuyển Dark/Light mode */}
            <button
              onClick={toggleTheme}
              className="rounded-lg border border-zinc-700 px-2 py-1 text-sm hover:bg-zinc-800 transition-all"
              title={theme === "dark" ? "Chuyển sang sáng" : "Chuyển sang tối"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
          <p className="text-zinc-500 text-xs mb-3">Kỹ thuật viên</p>
          <button onClick={async () => { await logout(); navigate("/login"); }}
            className="w-full text-xs text-zinc-500 hover:text-red-400 transition-colors">
            ⬅ Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar mobile */}
        <header className="md:hidden bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
          <h1 className="font-black text-sm">
            MAINTAIN<span className="text-amber-500">PRO</span>
          </h1>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="text-sm">{theme === "dark" ? "☀️" : "🌙"}</button>
            <span className="text-zinc-400 text-xs">{user?.name}</span>
            <button onClick={async () => { await logout(); navigate("/login"); }}
              className="text-xs text-zinc-500 hover:text-red-400 transition-colors">
              ⬅
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-zinc-950 p-4 md:p-6 pb-24 md:pb-6">
          <Outlet />
        </main>

        {/* Bottom Navigation mobile — chỉ 1 tab */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 px-4 py-2 z-50">
          <div className="flex justify-around">
            <NavLink to="/technician" end
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                  isActive ? "text-amber-400" : "text-zinc-500"
                }`
              }>
              <span className="text-xl">🔧</span>
              <span className="text-xs">Việc của tôi</span>
            </NavLink>
          </div>
        </nav>

      </div>
    </div>
  );
}