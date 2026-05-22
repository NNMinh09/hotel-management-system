import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import useThemeStore from "../store/themeStore";

function Avatar({ name }) {
  const initials = (name || "KT").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-green-400 to-green-600 text-xs font-black text-white shadow-lg shadow-green-500/20">
      {initials}
    </div>
  );
}

export default function TechLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">

      {/* ── SIDEBAR desktop ── */}
      <aside className="hidden md:flex w-56 bg-zinc-900 border-r border-zinc-800/80 flex-col">

        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-zinc-800/80 px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30">
            <span className="text-sm font-black text-zinc-950">M</span>
          </div>
          <div>
            <h1 className="text-xs font-black tracking-tight text-white">
              MAINTAIN<span className="text-amber-400">PRO</span>
            </h1>
            <p className="text-[10px] text-zinc-500 tracking-widest uppercase">Kỹ thuật viên</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Menu</p>
          <NavLink to="/technician" end
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-amber-500/10 text-amber-400"
                  : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
              }`
            }>
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-amber-400" />}
                <span className={`text-base ${isActive ? "text-amber-400" : "text-zinc-500"}`}>◈</span>
                <span>Việc của tôi</span>
                {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />}
              </>
            )}
          </NavLink>
        </nav>

        {/* User section */}
        <div className="border-t border-zinc-800/80 p-3">
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-zinc-800/50 px-3 py-2.5">
            <Avatar name={user?.name} />
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-xs font-semibold text-white">{user?.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Kỹ thuật viên</p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700 text-sm transition-all hover:border-amber-500/50 hover:bg-zinc-700"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
          <button onClick={async () => { await logout(); navigate("/login"); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 py-2 text-xs font-medium text-red-400 transition-all hover:border-red-500/40 hover:bg-red-500/10">
            <span>←</span> Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar mobile */}
        <header className="md:hidden bg-zinc-900/80 border-b border-zinc-800/80 px-4 py-3 flex items-center justify-between backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600">
              <span className="text-xs font-black text-zinc-950">M</span>
            </div>
            <h1 className="font-black text-sm text-white">
              MAINTAIN<span className="text-amber-400">PRO</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 text-sm">
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <Avatar name={user?.name} />
            <button onClick={async () => { await logout(); navigate("/login"); }}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-400">
              ←
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-zinc-950 p-4 md:p-6 pb-24 md:pb-6">
          <Outlet />
        </main>

        {/* Bottom Navigation mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900/90 border-t border-zinc-800/80 px-4 py-2 z-50 backdrop-blur-sm">
          <div className="flex justify-around">
            <NavLink to="/technician" end
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                  isActive ? "text-amber-400" : "text-zinc-500"
                }`
              }>
              <span className="text-xl">◈</span>
              <span className="text-xs font-medium">Việc của tôi</span>
            </NavLink>
          </div>
        </nav>
      </div>
    </div>
  );
}