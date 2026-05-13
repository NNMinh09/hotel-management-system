import React, { useEffect, useMemo, useState } from "react";
import { dashboardService } from "../services";

const MONTH_NAMES = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
const STATUS_LABEL = {
  pending: "Chờ xử lý",
  assigned: "Đã phân công",
  in_progress: "Đang xử lý",
  waiting_parts: "Chờ linh kiện",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

export default function AdminReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    dashboardService
      .get()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Không thể tải dữ liệu báo cáo"))
      .finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        label: MONTH_NAMES[date.getMonth()],
      };
    });

    return months.map(({ year, month, label }) => {
      const found = data?.costByMonth?.find(
        (item) => item._id.year === year && item._id.month === month
      );

      return {
        label,
        year,
        month,
        total: found?.total || 0,
        count: found?.count || 0,
      };
    });
  }, [data]);

  if (loading) {
    return <div className="py-16 text-center text-sm text-zinc-500">Đang tải báo cáo...</div>;
  }

  if (error || !data) {
    return <div className="py-16 text-center text-sm text-red-400">{error || "Không thể tải báo cáo"}</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">Báo cáo</h1>
        <p className="text-sm text-zinc-500">Tổng hợp chi phí, trạng thái và hiệu suất bảo trì</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          label="Chi phí tháng này"
          value={`${(data.costThisMonth || 0).toLocaleString("vi-VN")}đ`}
          sub={`Tháng trước: ${(data.costLastMonth || 0).toLocaleString("vi-VN")}đ`}
        />
        <SummaryCard
          label="Yêu cầu tháng này"
          value={data.requestsThisMonth || 0}
          sub={`Tháng trước: ${data.requestsLastMonth || 0}`}
        />
        <SummaryCard
          label="Thời gian xử lý TB"
          value={`${data.avgResolutionTimeHours || 0}h`}
          sub="Tính từ lúc tạo đến khi hoàn thành"
        />
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">Chi phí 6 tháng gần nhất</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-500">
                <th className="px-3 py-2">Tháng</th>
                <th className="px-3 py-2">Năm</th>
                <th className="px-3 py-2">Số phiếu</th>
                <th className="px-3 py-2">Tổng chi phí</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((item) => (
                <tr key={`${item.year}-${item.month}`} className="border-b border-zinc-800/60 text-zinc-300 last:border-0">
                  <td className="px-3 py-2 font-medium text-white">{item.label}</td>
                  <td className="px-3 py-2">{item.year}</td>
                  <td className="px-3 py-2">{item.count}</td>
                  <td className="px-3 py-2 text-amber-400">{item.total.toLocaleString("vi-VN")}đ</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Yêu cầu theo trạng thái</h2>
          <div className="space-y-3">
            {(data.statusStats || []).map((item) => (
              <div key={item._id} className="flex items-center justify-between rounded-xl bg-zinc-800 px-4 py-3">
                <span className="text-sm text-white">{STATUS_LABEL[item._id] || item._id}</span>
                <span className="font-bold text-amber-400">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Kỹ thuật viên tích cực nhất</h2>
          <div className="space-y-3">
            {(data.topTechnicians || []).length === 0 ? (
              <p className="text-sm text-zinc-500">Chưa có dữ liệu</p>
            ) : (
              data.topTechnicians.map((item, index) => (
                <div key={item._id} className="flex items-center justify-between rounded-xl bg-zinc-800 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{index + 1}. {item.user?.name || "-"}</p>
                    <p className="text-xs text-zinc-500">{item.user?.specialization || "Đa năng"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-400">{item.count} việc</p>
                    <p className="text-xs text-zinc-500">TB: {Math.round((item.avgTime || 0) / 3600000)}h</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-600">{sub}</p>
    </div>
  );
}