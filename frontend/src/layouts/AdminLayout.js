import React, { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../store/authStore";
import useThemeStore from "../store/themeStore";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: "⬡", end: true },
  { to: "/admin/requests", label: "Yêu cầu bảo trì", icon: "◈" },
  { to: "/admin/locations", label: "Vị trí", icon: "◎" },
  { to: "/admin/assets", label: "Thiết bị", icon: "◻" },
  { to: "/admin/users", label: "Nhân viên", icon: "◑" },
  { to: "/admin/preventive", label: "Bảo trì định kỳ", icon: "◷" },
];

const PAGE_TITLES = {
  "/admin": "Dashboard",
  "/admin/requests": "Yêu cầu bảo trì",
  "/admin/locations": "Vị trí",
  "/admin/assets": "Thiết bị",
  "/admin/users": "Nhân viên",
  "/admin/preventive": "Bảo trì định kỳ",
};

function Avatar({ name }) {
  const initials = (name || "A").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-xs font-black text-zinc-950 shadow-lg shadow-amber-500/20">
      {initials}
    </div>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useThemeStore();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const closeSidebar = () => setSidebarOpen(false);

  const pageTitle = PAGE_TITLES[location.pathname] || "MaintainPro";

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-white">

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm md:hidden" onClick={closeSidebar} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 flex w-64 flex-col
        bg-zinc-900 border-r border-zinc-800/80
        transform transition-all duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0 shadow-2xl shadow-black/50" : "-translate-x-full"}
        md:relative md:translate-x-0 md:shadow-none
      `}>

        {/* Logo */}
        <div className="relative flex items-center gap-3 border-b border-zinc-800/80 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30">
            <span className="text-lg font-black text-zinc-950">M</span>
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white">
              MAINTAIN<span className="text-amber-400">PRO</span>
            </h1>
            <p className="text-[10px] text-zinc-500 tracking-widest uppercase">Hotel System</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Menu</p>
          {navItems.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-amber-500/10 text-amber-400 shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-amber-400" />
                  )}
                  <span className={`text-base transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-amber-400" : "text-zinc-500"}`}>
                    {icon}
                  </span>
                  <span>{label}</span>
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-zinc-800/80 p-3">
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-zinc-800/50 px-3 py-2.5">
            <Avatar name={user?.name} />
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-xs font-semibold text-white">{user?.name || "Admin"}</p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">{user?.role || "admin"}</p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700 text-sm transition-all hover:border-amber-500/50 hover:bg-zinc-700"
              title={theme === "dark" ? "Chuyển sang sáng" : "Chuyển sang tối"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 py-2 text-xs font-medium text-red-400 transition-all hover:border-red-500/40 hover:bg-red-500/10"
          >
            <span>←</span> Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Topbar */}
        <header className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/80 px-4 py-3 backdrop-blur-sm">
          {/* Mobile: hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition-all hover:border-zinc-700 hover:bg-zinc-800 hover:text-white md:hidden"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 4h12M2 8h12M2 12h12"/>
            </svg>
          </button>

          {/* Desktop: page title */}
          <div className="hidden md:block">
            <h2 className="text-sm font-semibold text-white">{pageTitle}</h2>
            <p className="text-xs text-zinc-500">Hotel Maintenance System</p>
          </div>

          {/* Mobile: logo */}
          <h1 className="text-sm font-black text-white md:hidden">
            MAINTAIN<span className="text-amber-400">PRO</span>
          </h1>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-sm transition-all hover:border-zinc-700 hover:bg-zinc-800"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <div className="hidden items-center gap-2 md:flex">
              <Avatar name={user?.name} />
              <span className="text-xs text-zinc-400">{user?.name}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-zinc-950 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}