import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "./store/authStore";

// Import các Layouts
import AdminLayout from "./layouts/AdminLayout";
import StaffLayout from "./layouts/StaffLayout";
import TechLayout from "./layouts/TechLayout";

// Import các Pages
import Login from "./pages/Login";
import NotificationToast from "./components/NotificationToast";

// Import các thành phần Admin
import AdminDashboard from "./admin/Dashboard";
import AdminRequests from "./admin/Requests";
import AdminLocations from "./admin/Locations";
import AdminAssets from "./admin/Assets";
import AdminUsers from "./admin/Users";
import AdminPreventivePlans from "./admin/PreventivePlans";

// Import các thành phần Staff
import StaffReport from "./staff/ReportForm";
import StaffMyRequests from "./staff/MyRequests";

// Import các thành phần Technician
import TechTasks from "./technician/Tasks";
import TechCreateRequest from "./technician/CreateRequest";

// Màn hình chờ khi đang kiểm tra phiên đăng nhập
const LoadingScreen = () => (
  <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-400">
    Đang kiểm tra phiên đăng nhập...
  </div>
);

// Thành phần bảo vệ đường dẫn theo quyền (Role-based Private Route)
const PrivateRoute = ({ children, roles }) => {
  const { isAuthenticated, user, authReady } = useAuthStore();

  if (!authReady) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/unauthorized" replace />;
  return children;
};

// Logic điều hướng sau khi đăng nhập thành công
function RoleRedirect() {
  const { user, isAuthenticated, authReady } = useAuthStore();

  if (!authReady) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === "admin") return <Navigate to="/admin" replace />;
  if (user?.role === "staff") return <Navigate to="/staff" replace />;
  return <Navigate to="/technician" replace />;
}



export default function App() {
  const { initialize, authReady } = useAuthStore(); 
  useEffect(() => {
    initialize(); 
  }, [initialize]);

  
  return (
    <BrowserRouter>
      {/* Hiển thị thông báo Toast cho toàn hệ thống */}
      <NotificationToast />
      
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route
          path="/unauthorized"
          element={<div className="p-10 text-white">Không có quyền truy cập</div>}
        />

        {/* Admin Routes */}
        <Route path="/admin" element={<PrivateRoute roles={["admin"]}><AdminLayout /></PrivateRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="requests" element={<AdminRequests />} />
          <Route path="locations" element={<AdminLocations />} />
          <Route path="assets" element={<AdminAssets />} />
          <Route path="spare-parts" element={<Navigate to="/admin" replace />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="preventive" element={<AdminPreventivePlans />} />
          <Route path="reports" element={<Navigate to="/admin" replace />} />
        </Route>

        {/* Staff Routes */}
        <Route path="/staff" element={<PrivateRoute roles={["staff"]}><StaffLayout /></PrivateRoute>}>
          <Route index element={<StaffReport />} />
          <Route path="my-requests" element={<StaffMyRequests />} />
        </Route>

        {/* Technician Routes */}
        <Route path="/technician" element={<PrivateRoute roles={["technician"]}><TechLayout /></PrivateRoute>}>
          <Route index element={<TechTasks />} />
          <Route path="create" element={<TechCreateRequest />} />
        </Route>

        {/* Điều hướng mặc định */}
        <Route path="/" element={<RoleRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}