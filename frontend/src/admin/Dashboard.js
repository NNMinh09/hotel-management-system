import React, { useEffect, useMemo, useState } from "react";
import { dashboardService, maintenanceService } from "../services";

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

const MONTH_NAMES = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [monthRequests, setMonthRequests] = useState([]);
  const [loadingMonth, setLoadingMonth] = useState(false);

  useEffect(() => {
    dashboardService
      .get()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Không thể tải dữ liệu dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const handleClickMonth = async (monthData) => {
  if (selectedMonth?.label === monthData.label) {
    setSelectedMonth(null);
    setMonthRequests([]);
    return;
  }
  setSelectedMonth(monthData);
  setLoadingMonth(true);
  try {
    const res = await maintenanceService.getAll({
      year: monthData.year,
      month: monthData.month,
      limit: 100
    });

    // Filter cứng tại frontend — đảm bảo đúng tháng
    const filtered = (res.data.requests || []).filter(req => {
      const d = new Date(req.createdAt);
      return d.getFullYear() === monthData.year && (d.getMonth() + 1) === monthData.month;
    });

    setMonthRequests(filtered);
  } catch {
    setMonthRequests([]);
  } finally {
    setLoadingMonth(false);
  }
};

  const statusStats = data?.statusStats || [];
  const totalRequests = statusStats.reduce((sum, item) => sum + item.count, 0);
  const requestDiff = (data?.requestsThisMonth || 0) - (data?.requestsLastMonth || 0);
  const costDiff = (data?.costThisMonth || 0) - (data?.costLastMonth || 0);

  const chartData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        label: MONTH_NAMES[date.getMonth()]
      };
    });
    return months.map(({ year, month, label }) => {
      const found = data?.costByMonth?.find(
        (item) => item._id.year === year && item._id.month === month
      );
      return {
        label, year, month,
        total: found?.total || 0,
        count: found?.count || 0,
      };
    });
  }, [data]);

  const maxCost = Math.max(...chartData.map((item) => item.total), 1);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-zinc-500">Đang tải dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-red-400">{error || "Không thể tải dữ liệu"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500">Tổng quan hệ thống bảo trì khách sạn</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon="📋" label="Tổng yêu cầu" value={totalRequests}
          sub={`Tháng này: ${data.requestsThisMonth || 0}`}
          trend={requestDiff}
        />
        <StatCard
          icon="🚨" label="Khẩn chưa xử lý" value={data.urgentPending || 0}
          sub="Cần ưu tiên ngay"
          danger={(data.urgentPending || 0) > 0}
        />
        <StatCard
          icon="💸" label="Chi phí tháng này"
          value={`${(data.costThisMonth || 0).toLocaleString("vi-VN")}đ`}
          sub={`Tháng trước: ${(data.costLastMonth || 0).toLocaleString("vi-VN")}đ`}
          trend={costDiff} money
        />
        <StatCard
          icon="⏱️" label="Thời gian xử lý TB"
          value={`${data.avgResolutionTimeHours || 0}h`}
          sub="Tính từ lúc tạo đến lúc hoàn thành"
        />
      </div>

      {/* Biểu đồ + Trạng thái */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

        {/* Biểu đồ chi phí 6 tháng */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-1 text-sm font-semibold text-white">Chi phí 6 tháng gần nhất</h2>
          <p className="mb-4 text-xs text-zinc-600">Nhấn vào cột để xem chi tiết</p>
          <div className="flex h-40 items-end gap-2">
            {chartData.map((item) => (
              <div
                key={item.label}
                className="flex flex-1 cursor-pointer flex-col items-center gap-2 group"
                onClick={() => handleClickMonth(item)}
              >
                <span className="text-[11px] text-zinc-600 group-hover:text-zinc-400 transition-colors">
                  {item.total > 0 ? `${Math.round(item.total / 1000)}k` : ""}
                </span>
                <div className="relative h-24 w-full overflow-hidden rounded-t-md bg-amber-500/10">
                  <div
                    className={`absolute bottom-0 left-0 right-0 rounded-t-md transition-all ${
                      selectedMonth?.label === item.label
                        ? "bg-amber-400"
                        : "bg-amber-500 group-hover:bg-amber-400"
                    }`}
                    style={{ height: `${(item.total / maxCost) * 100}%` }}
                  />
                </div>
                <span className={`text-xs transition-colors ${
                  selectedMonth?.label === item.label
                    ? "font-bold text-amber-400"
                    : "text-zinc-500"
                }`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* Chi tiết tháng được chọn */}
          {selectedMonth && (
            <div className="mt-4 border-t border-zinc-800 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">
                  Chi tiết tháng {selectedMonth.label}
                </p>
                <button
                  onClick={() => { setSelectedMonth(null); setMonthRequests([]); }}
                  className="text-xs text-zinc-500 hover:text-white transition-colors"
                >
                  ✕ Đóng
                </button>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-zinc-800 p-3 text-center">
                  <p className="font-bold text-white">{selectedMonth.count}</p>
                  <p className="text-xs text-zinc-500">Yêu cầu</p>
                </div>
                <div className="rounded-xl bg-zinc-800 p-3 text-center">
                  <p className="font-bold text-white">
                    {monthRequests.filter(r => r.status === "completed").length}
                  </p>
                  <p className="text-xs text-zinc-500">Hoàn thành</p>
                </div>
                <div className="rounded-xl bg-zinc-800 p-3 text-center">
                  <p className="font-bold text-amber-400">
                    {(selectedMonth.total || 0).toLocaleString("vi-VN")}đ
                  </p>
                  <p className="text-xs text-zinc-500">Chi phí</p>
                </div>
              </div>

              {loadingMonth ? (
                <p className="py-4 text-center text-sm text-zinc-500">Đang tải...</p>
              ) : monthRequests.length === 0 ? (
                <p className="py-4 text-center text-sm text-zinc-500">Không có dữ liệu</p>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {monthRequests.map(req => (
                    <div key={req._id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-zinc-800 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{req.title}</p>
                        <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-zinc-500">
                          <span>📍 {req.locationId?.name}</span>
                          {req.assignedTo && <span>👷 {req.assignedTo?.name}</span>}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`rounded-full px-2 py-1 text-xs ${
                          req.status === "completed" ? "bg-green-500/20 text-green-400" :
                          req.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-blue-500/20 text-blue-400"
                        }`}>
                          {req.status === "completed" ? "Xong" :
                           req.status === "pending" ? "Chờ" : "Đang xử lý"}
                        </span>
                        {req.cost?.total > 0 && (
                          <p className="mt-1 text-xs text-zinc-500">
                            {req.cost.total.toLocaleString("vi-VN")}đ
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Trạng thái */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Yêu cầu theo trạng thái</h2>
          <div className="space-y-3">
            {statusStats.map(({ _id, count }) => (
              <div key={_id} className="flex items-center justify-between gap-4">
                <span className={`rounded-full px-2.5 py-1 text-xs ${STATUS_COLOR[_id] || "bg-zinc-700 text-zinc-300"}`}>
                  {STATUS_LABEL[_id] || _id}
                </span>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-28 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${totalRequests ? (count / totalRequests) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-5 text-right text-sm font-bold text-white">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Thiết bị + KTV */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SimpleListCard
          title="🔧 Thiết bị hỏng nhiều nhất"
          empty="Chưa có dữ liệu"
          items={data.mostBrokenAssets || []}
          renderItem={(item, index) => (
            <div key={item._id} className="flex items-center justify-between border-b border-zinc-800 py-2 last:border-0">
              <div className="flex items-center gap-3">
                <span className="w-4 font-mono text-xs text-zinc-600">{index + 1}</span>
                <div>
                  <p className="text-sm font-medium text-white">{item.asset?.name || "-"}</p>
                  <p className="text-xs text-zinc-500">{item.asset?.code || "-"}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-red-400">{item.count} lần</p>
                <p className="text-xs text-zinc-600">{(item.totalCost || 0).toLocaleString("vi-VN")}đ</p>
              </div>
            </div>
          )}
        />

        <SimpleListCard
          title="🏆 Kỹ thuật viên tích cực nhất"
          empty="Chưa có dữ liệu"
          items={data.topTechnicians || []}
          renderItem={(item, index) => (
            <div key={item._id} className="flex items-center justify-between border-b border-zinc-800 py-2 last:border-0">
              <div className="flex items-center gap-3">
                <span className="w-4 font-mono text-xs text-zinc-600">{index + 1}</span>
                <div>
                  <p className="text-sm font-medium text-white">{item.user?.name || "-"}</p>
                  <p className="text-xs text-zinc-500">{item.user?.specialization || "Đa năng"}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-400">{item.count} việc</p>
                {item.avgTime > 0 && (
                  <p className="text-xs text-zinc-600">TB: {Math.round(item.avgTime / 3600000)}h</p>
                )}
              </div>
            </div>
          )}
        />
      </div>

      {/* Bảo trì sắp đến + Linh kiện */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {data.upcomingMaintenance?.length > 0 && (
          <SimpleListCard
            title="🗓️ Bảo trì sắp đến"
            empty="Không có lịch gần"
            borderClass="border-amber-500/20"
            items={data.upcomingMaintenance}
            renderItem={(asset) => (
              <div key={asset._id} className="flex items-center justify-between border-b border-zinc-800 py-2 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{asset.name}</p>
                  <p className="text-xs text-zinc-500">{asset.locationId?.name || "-"}</p>
                </div>
                <span className="text-xs text-amber-400">
                  {new Date(asset.nextMaintenanceDate).toLocaleDateString("vi-VN")}
                </span>
              </div>
            )}
          />
        )}

        {data.lowStockParts?.length > 0 && (
          <SimpleListCard
            title="⚙️ Linh kiện sắp hết"
            empty="Kho đang ổn"
            borderClass="border-red-500/20"
            items={data.lowStockParts}
            renderItem={(part) => (
              <div key={part._id} className="flex items-center justify-between border-b border-zinc-800 py-2 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{part.name}</p>
                  <p className="text-xs text-zinc-500">{part.code}</p>
                </div>
                <span className="text-sm font-bold text-red-400">{part.quantity} {part.unit}</span>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, trend, danger, money }) {
  return (
    <div className={`rounded-2xl border p-5 bg-zinc-900 ${danger ? "border-red-500/30" : "border-zinc-800"}`}>
      <div className="mb-2 text-2xl">{icon}</div>
      <div className="mb-1 text-2xl font-black text-white">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
      {sub && <div className="mt-1 text-xs text-zinc-600">{sub}</div>}
      {trend !== undefined && trend !== 0 && (
        <div className={`mt-2 text-xs font-medium ${trend > 0 ? "text-green-400" : "text-red-400"}`}>
          {trend > 0 ? "▲" : "▼"} {Math.abs(trend).toLocaleString("vi-VN")}
          {money ? "đ" : ""} so với tháng trước
        </div>
      )}
    </div>
  );
}

function SimpleListCard({ title, items, empty, renderItem, borderClass = "border-zinc-800" }) {
  return (
    <div className={`rounded-2xl border bg-zinc-900 p-5 ${borderClass}`}>
      <h2 className="mb-4 text-sm font-semibold text-white">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">{empty}</p>
      ) : (
        <div className="space-y-1">{items.map((item, index) => renderItem(item, index))}</div>
      )}
    </div>
  );
}