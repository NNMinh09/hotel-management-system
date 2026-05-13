import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

const navItems = [
  { to: "/staff", label: "📣 Báo hỏng", end: true },
  { to: "/staff/my-requests", label: "🧾 Yêu cầu của tôi" },
];

export default function StaffLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-white">
      <aside className="flex w-56 flex-col border-r border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-4 py-5">
          <h1 className="text-sm font-black">
            MAINTAIN<span className="text-amber-500">PRO</span>
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500">Nhân viên</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `block rounded-lg border px-3 py-2.5 text-sm transition-all ${
                  isActive
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                    : "border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-zinc-800 p-4">
          <p className="text-sm font-medium text-white">{user?.name || "Nhân viên"}</p>
          <p className="mb-3 text-xs text-zinc-500">Nhân viên</p>
          <button
            onClick={handleLogout}
            className="w-full text-xs text-zinc-500 transition-colors hover:text-red-400"
          >
            ← Đăng xuất
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-zinc-950 p-6">
        <Outlet />
      </main>
    </div>
  );
}
