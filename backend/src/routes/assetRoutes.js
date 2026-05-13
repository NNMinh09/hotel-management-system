import express from "express";
import Asset from "../models/Asset.js";
import MaintenanceRequest from "../models/MaintenanceRequest.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(authenticate);

router.get("/", async (req, res) => {
  const { status, category } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  const data = await Asset.find(filter).populate("locationId", "name floor");
  res.json(data);
});

router.get("/:id/history", async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id)
      .populate("locationId", "name floor")
      .populate("maintenanceHistory.reportedBy", "name role")
      .populate("maintenanceHistory.assignedTo", "name specialization");

    if (!asset) {
      return res.status(404).json({ message: "Không tìm thấy thiết bị" });
    }

    let history = (asset.maintenanceHistory || []).map((item) => ({
      _id: item._id,
      title: item.title,
      type: item.type,
      status: item.status || "completed",
      reportedBy: item.reportedBy,
      assignedTo: item.assignedTo,
      createdAt: item.createdAt,
      completedAt: item.completedAt,
      resolution: item.resolution,
      cost: item.cost || { labor: 0, parts: 0, total: 0 },
      images: item.images || [],
    }));

    if (history.length === 0) {
      const requests = await MaintenanceRequest.find({ assetId: req.params.id })
        .populate("reportedBy", "name role")
        .populate("assignedTo", "name specialization")
        .sort({ createdAt: -1 });

      history = requests.map((request) => ({
        _id: request._id,
        title: request.title,
        type: request.type,
        status: request.status,
        reportedBy: request.reportedBy,
        assignedTo: request.assignedTo,
        createdAt: request.createdAt,
        completedAt: request.completedAt,
        resolution: request.resolution,
        cost: request.cost || { labor: 0, parts: 0, total: 0 },
        images: request.images || [],
      }));
    }

    history.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const completedItems = history.filter((item) => item.status === "completed");
    const stats = {
      totalRepairs: history.length,
      completedCount: completedItems.length,
      totalCost: completedItems.reduce((sum, item) => sum + Number(item.cost?.total || 0), 0),
    };

    res.json({
      asset: {
        _id: asset._id,
        name: asset.name,
        code: asset.code,
        locationId: asset.locationId,
      },
      stats,
      history,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Không thể tải lịch sử thiết bị" });
  }
});

router.get("/:id", async (req, res) => {
  const data = await Asset.findById(req.params.id).populate("locationId");
  if (!data) return res.status(404).json({ message: "Khong tim thay" });
  res.json(data);
});

router.post("/", authorize("admin"), async (req, res) => {
  try {
    const data = await Asset.create(req.body);
    res.status(201).json(data);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Ma thiet bi da ton tai" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || "Khong the tao thiet bi" });
  }
});

router.put("/:id", authorize("admin"), async (req, res) => {
  try {
    const data = await Asset.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.json(data);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Ma thiet bi da ton tai" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || "Khong the cap nhat thiet bi" });
  }
});

router.delete("/:id", authorize("admin"), async (req, res) => {
  await Asset.findByIdAndDelete(req.params.id);
  res.json({ message: "Da xoa" });
});

export default router;