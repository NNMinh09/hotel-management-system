import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import useAuthStore from "../store/authStore";

export default function NotificationToast() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) return;

    const socket = io(
      process.env.REACT_APP_SOCKET_URL || "http://localhost:5000",
      { withCredentials: true }
    );

    // Join theo role
    socket.emit("join_role", user.role);
    // Join theo userId để nhận thông báo cá nhân
    socket.emit("join_user", user.id);

    // Nhận thông báo yêu cầu mới (admin)
    socket.on("new_request", (data) => {
      addNotification({
        id: Date.now(),
        type: "new",
        message: data.message,
        priority: data.priority,
        icon: data.priority === "urgent" ? "🔴" : "🔧"
      });
    });

    // Nhận thông báo được giao việc (technician)
    socket.on("assigned_task", (data) => {
      addNotification({
        id: Date.now(),
        type: "assigned",
        message: data.message,
        icon: "📋"
      });
    });

    // Nhận thông báo cập nhật (admin)
    socket.on("request_updated", (data) => {
      addNotification({
        id: Date.now(),
        type: "updated",
        message: data.message,
        icon: "✅"
      });
    });

    return () => socket.disconnect();
  }, [user]);

  const addNotification = (notif) => {
    setNotifications(prev => [notif, ...prev].slice(0, 5));
    // Tự xóa sau 5 giây
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
    }, 5000);
  };

  const remove = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
      {notifications.map(notif => (
        <div key={notif.id}
          className={`flex items-start gap-3 bg-zinc-900 border rounded-xl px-4 py-3 shadow-2xl animate-in slide-in-from-right ${
            notif.priority === "urgent"
              ? "border-red-500/50"
              : notif.type === "assigned"
              ? "border-blue-500/50"
              : "border-amber-500/30"
          }`}>
          <span className="text-xl shrink-0 mt-0.5">{notif.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium leading-snug">{notif.message}</p>
            {notif.priority === "urgent" && (
              <p className="text-red-400 text-xs mt-0.5">⚠️ Ưu tiên khẩn cấp!</p>
            )}
          </div>
          <button onClick={() => remove(notif.id)}
            className="text-zinc-600 hover:text-white transition-colors text-xs shrink-0">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}