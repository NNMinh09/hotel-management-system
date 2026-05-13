import React, { useEffect, useState } from "react";
import { maintenanceService } from "../services";

const STATUS_LABEL = {
  pending: "Chờ xử lý",
  assigned: "Đã phân công",
  in_progress: "Đang xử lý",
  waiting_parts: "Chờ linh kiện",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

const STATUS_COLOR = {
  pending: "bg-yellow-500/20 text-yellow-400",
  assigned: "bg-blue-500/20 text-blue-400",
  in_progress: "bg-purple-500/20 text-purple-400",
  waiting_parts: "bg-orange-500/20 text-orange-400",
  completed: "bg-green-500/20 text-green-400",
  cancelled: "bg-zinc-500/20 text-zinc-400",
};

export default function StaffMyRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    maintenanceService
      .getAll()
      .then((res) => {
        setRequests(res.data.requests || []);
        setError("");
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Không thể tải danh sách yêu cầu");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">Yêu cầu của tôi</h1>
        <p className="text-sm text-zinc-500">{requests.length} yêu cầu đã gửi</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Đang tải...</p>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center">
          <p className="mb-3 text-4xl">📋</p>
          <p className="text-zinc-400">Bạn chưa có yêu cầu nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request._id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="mb-2 flex items-start justify-between">
                <h3 className="font-medium text-white">{request.title}</h3>
                <span className={`rounded-full px-2 py-1 text-xs ${STATUS_COLOR[request.status]}`}>
                  {STATUS_LABEL[request.status]}
                </span>
              </div>
              <p className="mb-3 line-clamp-2 text-sm text-zinc-500">{request.description}</p>
              <div className="flex items-center gap-4 text-xs text-zinc-600">
                <span>📍 {request.locationId?.name}</span>
                <span>🕐 {new Date(request.createdAt).toLocaleDateString("vi-VN")}</span>
                {request.assignedTo && <span>👷 {request.assignedTo.name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}