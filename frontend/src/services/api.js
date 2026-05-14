import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  withCredentials: false, // ✅ Không dùng cookie nữa
});

// ✅ Tự động đính kèm token vào mọi request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ Xử lý lỗi 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const requestUrl = err.config?.url || "";
    const skipAuthRedirect = err.config?.skipAuthRedirect;
    const isAuthProbe = requestUrl.includes("/auth/me");
    const onLoginPage = window.location.pathname === "/login";

    if (status === 401 && !skipAuthRedirect && !isAuthProbe && !onLoginPage) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      window.location.href = "/login";
    }

    return Promise.reject(err);
  }
);

export default api;