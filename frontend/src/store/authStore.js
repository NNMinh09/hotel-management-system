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
        try {
          const res = await api.get("/auth/me", { skipAuthRedirect: true });
          set({
            user: normalizeUser(res.data),
            isAuthenticated: true,
            authReady: true,
          });
        } catch {
          set({
            user: null,
            isAuthenticated: false,
            authReady: true,
          });
        }
      },
      login: async (email, password) => {
        const res = await api.post("/auth/login", { email, password });
        const user = normalizeUser(res.data.user);
        set({ user, isAuthenticated: true, authReady: true });
        return user;
      },
      logout: async () => {
        try {
          await api.post("/auth/logout", null, { skipAuthRedirect: true });
        } finally {
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