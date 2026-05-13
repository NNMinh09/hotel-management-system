import api from "./api";

export const authService = {
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  getMe: () => api.get("/auth/me"),
  getUsers: (role) => api.get("/auth/users", { params: { role } }),
};

export const maintenanceService = {
  getAll: (params) => api.get("/maintenance", { params }),
  getById: (id) => api.get(`/maintenance/${id}`),
  getHistory: (id) => api.get(`/assets/${id}/history`),
  create: (formData) => api.post("/maintenance", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  assign: (id, data) => api.put(`/maintenance/${id}/assign`, data),
  claim: (id) => api.put(`/maintenance/${id}/claim`),
  updateStatus: (id, data) => api.put(`/maintenance/${id}/status`, data),
  delete: (id) => api.delete(`/maintenance/${id}`),
};

export const assetService = {
  getAll: (params) => api.get("/assets", { params }),
  getById: (id) => api.get(`/assets/${id}`),
  getHistory: (id) => api.get(`/assets/${id}/history`),
  create: (data) => api.post("/assets", data),
  update: (id, data) => api.put(`/assets/${id}`, data),
  delete: (id) => api.delete(`/assets/${id}`),
};

export const locationService = {
  getAll: () => api.get("/locations"),
  create: (data) => api.post("/locations", data),
  update: (id, data) => api.put(`/locations/${id}`, data),
  delete: (id) => api.delete(`/locations/${id}`),
};

export const sparePartService = {
  getAll: () => api.get("/spare-parts"),
  create: (data) => api.post("/spare-parts", data),
  update: (id, data) => api.put(`/spare-parts/${id}`, data),
  delete: (id) => api.delete(`/spare-parts/${id}`),
};

export const dashboardService = {
  get: () => api.get("/dashboard"),
};

export const preventivePlanService = {
  getAll: () => api.get("/preventive-plans"),
  create: (data) => api.post("/preventive-plans", data),
  update: (id, data) => api.put(`/preventive-plans/${id}`, data),
  delete: (id) => api.delete(`/preventive-plans/${id}`),
  generate: (id) => api.post(`/preventive-plans/${id}/generate`),
  generateDue: () => api.post("/preventive-plans/generate-due"),
};

export const importService = {
  importExcel: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/import/excel", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export const userService = {
  resetPassword: (id, newPassword) => api.patch(`/auth/users/${id}/reset-password`, { newPassword }),
  toggleActive: (id) => api.patch(`/auth/users/${id}/toggle-active`),
};