import MaintenanceRequest from "../models/MaintenanceRequest.js";
import Asset from "../models/Asset.js";
import SparePart from "../models/SparePart.js";
import User from "../models/User.js";

export const getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // 1. Thống kê theo trạng thái
    const statusStats = await MaintenanceRequest.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // 2. Yêu cầu urgent chưa xử lý
    const urgentPending = await MaintenanceRequest.countDocuments({
      priority: "urgent",
      status: { $in: ["pending", "assigned"] }
    });

    // 3. Chi phí tháng này
    const costThisMonth = await MaintenanceRequest.aggregate([
      { $match: { completedAt: { $gte: startOfMonth }, status: "completed" } },
      { $group: { _id: null, total: { $sum: "$cost.total" } } }
    ]);

    // 4. Chi phí tháng trước
    const costLastMonth = await MaintenanceRequest.aggregate([
      { $match: { completedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }, status: "completed" } },
      { $group: { _id: null, total: { $sum: "$cost.total" } } }
    ]);

    // 5. Chi phí theo 6 tháng gần nhất
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const costByMonth = await MaintenanceRequest.aggregate([
      { $match: { completedAt: { $gte: sixMonthsAgo }, status: "completed" } },
      {
        $group: {
          _id: {
            year: { $year: "$completedAt" },
            month: { $month: "$completedAt" }
          },
          total: { $sum: "$cost.total" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // 6. Tài sản hay hỏng nhất (top 5)
    const mostBrokenAssets = await MaintenanceRequest.aggregate([
      { $match: { assetId: { $ne: null } } },
      { $group: { _id: "$assetId", count: { $sum: 1 }, totalCost: { $sum: "$cost.total" } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "assets",
          localField: "_id",
          foreignField: "_id",
          as: "asset"
        }
      },
      { $unwind: "$asset" },
      {
        $project: {
          count: 1,
          totalCost: 1,
          "asset.name": 1,
          "asset.code": 1,
          "asset.category": 1,
          "asset.totalRepairCost": 1
        }
      }
    ]);
    
    // 7. KTV xử lý nhiều nhất (top 5)
    const topTechnicians = await MaintenanceRequest.aggregate([
      { $match: { assignedTo: { $ne: null }, status: "completed" } },
      {
        $group: {
          _id: "$assignedTo",
          count: { $sum: 1 },
          avgTime: {
            $avg: {
              $subtract: ["$completedAt", "$assignedAt"]
            }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          count: 1,
          avgTime: 1,
          "user.name": 1,
          "user.specialization": 1
        }
      }
    ]);

    // 8. Thời gian xử lý trung bình (giờ)
    const avgResolutionTime = await MaintenanceRequest.aggregate([
      { $match: { status: "completed", completedAt: { $ne: null }, createdAt: { $ne: null } } },
      {
        $group: {
          _id: null,
          avgMs: { $avg: { $subtract: ["$completedAt", "$createdAt"] } }
        }
      }
    ]);

    // 9. Thiết bị sắp đến kỳ bảo trì (7 ngày tới)
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const upcomingMaintenance = await Asset.find({
      nextMaintenanceDate: { $lte: next7Days, $gte: new Date() },
      status: "active"
    }).populate("locationId", "name").limit(10);

    // 10. Linh kiện sắp hết
    const lowStockParts = await SparePart.find({
      $expr: { $lte: ["$quantity", "$minQuantity"] }
    }).limit(10);

    // 11. Tổng request tháng này vs tháng trước
    const requestsThisMonth = await MaintenanceRequest.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    const requestsLastMonth = await MaintenanceRequest.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });
    

    res.json({
      statusStats,
      urgentPending,
      costThisMonth: costThisMonth[0]?.total || 0,
      costLastMonth: costLastMonth[0]?.total || 0,
      costByMonth,
      mostBrokenAssets,
      topTechnicians,
      avgResolutionTimeHours: avgResolutionTime[0]
        ? Math.round(avgResolutionTime[0].avgMs / 3600000)
        : 0,
      upcomingMaintenance,
      lowStockParts,
      requestsThisMonth,
      requestsLastMonth
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};