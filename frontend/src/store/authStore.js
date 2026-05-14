import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../services/api";

const normalizeUser = (user) => {
  if (!user) return null;
  return {
    id: user.id || user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      authReady: false,

      initialize: async () => {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          set({ user: null, isAuthenticated: false, authReady: true });
          return;
        }
        try {
          const res = await api.get("/auth/me", { skipAuthRedirect: true });
          set({
            user: normalizeUser(res.data),
            isAuthenticated: true,
            authReady: true,
          });
        } catch {
          // ✅ Token hết hạn hoặc không hợp lệ → xóa sạch
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          set({ user: null, isAuthenticated: false, authReady: true });
        }
      },

      login: async (email, password) => {
        const res = await api.post("/auth/login", { email, password });

        // ✅ Lưu token vào localStorage thay vì dùng cookie
        // → Hoạt động trên iOS Safari và mọi trình duyệt
        localStorage.setItem("accessToken", res.data.accessToken);
        localStorage.setItem("refreshToken", res.data.refreshToken);

        const user = normalizeUser(res.data.user);
        set({ user, isAuthenticated: true, authReady: true });
        return user;
      },

      logout: async () => {
        try {
          await api.post("/auth/logout", null, { skipAuthRedirect: true });
        } finally {
          // ✅ Xóa token khỏi localStorage khi logout
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          set({ user: null, isAuthenticated: false, authReady: true });
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;