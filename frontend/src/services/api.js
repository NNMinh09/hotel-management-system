import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const requestUrl = err.config?.url || "";
    const skipAuthRedirect = err.config?.skipAuthRedirect;
    const isAuthProbe = requestUrl.includes("/auth/me");
    const onLoginPage = window.location.pathname === "/login";

    if (status === 401 && !skipAuthRedirect && !isAuthProbe && !onLoginPage) {
      window.location.href = "/login";
    }

    return Promise.reject(err);
  }
);

export default api;