import express from "express";
import PreventivePlan from "../models/PreventivePlan.js";
import MaintenanceRequest from "../models/MaintenanceRequest.js";
import Location from "../models/Location.js";
import User from "../models/User.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(authenticate);

const CLOSED_STATUSES = ["completed", "cancelled"];

async function buildPreventiveRequest(plan, userId) {
  const existingOpenRequest = await MaintenanceRequest.findOne({
    preventivePlanId: plan._id,
    status: { $nin: CLOSED_STATUSES },
  });

  if (existingOpenRequest) {
    return { request: null, skipped: true };
  }

  if (plan.assignedTo) {
    const technician = await User.findById(plan.assignedTo).select("_id role isActive");
    if (!technician || technician.role !== "technician" || technician.isActive === false) {
      plan.assignedTo = null;
      await plan.save();
    }
  }

  const request = await MaintenanceRequest.create({
    title: `[BT Định kỳ] ${plan.name}`,
    description: plan.description || `Bảo trì định kỳ theo kế hoạch: ${plan.name}`,
    locationId: plan.locationId,
    assetId: plan.assetId || null,
    preventivePlanId: plan._id,
    priority: plan.priority,
    type: "scheduled",
    reportedBy: userId,
    assignedTo: plan.assignedTo || null,
    assignedAt: plan.assignedTo ? new Date() : null,
    status: plan.assignedTo ? "assigned" : "pending",
    statusHistory: [
      {
        status: plan.assignedTo ? "assigned" : "pending",
        note: `Sinh từ kế hoạch bảo trì định kỳ: ${plan.name}`,
        updatedBy: userId,
      },
    ],
  });

  await Location.findByIdAndUpdate(plan.locationId, { status: "maintenance" });

  return { request, skipped: false };
}

router.get("/", async (req, res) => {
  try {
    const plans = await PreventivePlan.find({ isActive: true })
      .populate("assetId", "name code")
      .populate("locationId", "name floor")
      .populate("assignedTo", "name specialization isActive")
      .sort({ nextDueDate: 1 });

    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", authorize("admin"), async (req, res) => {
  try {
    const { name, locationId, nextDueDate, intervalDays } = req.body || {};
    if (!name?.trim() || !locationId || !nextDueDate) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc cho kế hoạch" });
    }

    const plan = await PreventivePlan.create({
      ...req.body,
      intervalDays: Number(intervalDays) || 30,
      createdBy: req.user.id,
    });

    res.status(201).json(plan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", authorize("admin"), async (req, res) => {
  try {
    const payload = {
      ...req.body,
      intervalDays: Number(req.body?.intervalDays) || 30,
    };

    const plan = await PreventivePlan.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!plan) {
      return res.status(404).json({ message: "Không tìm thấy kế hoạch" });
    }

    res.json(plan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", authorize("admin"), async (req, res) => {
  try {
    await PreventivePlan.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: "Đã xóa kế hoạch" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/generate-due", authorize("admin"), async (req, res) => {
  try {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const duePlans = await PreventivePlan.find({
      isActive: true,
      nextDueDate: { $lte: endOfToday },
    });

    let created = 0;
    let skipped = 0;

    for (const plan of duePlans) {
      const result = await buildPreventiveRequest(plan, req.user.id);
      if (result.skipped) skipped += 1;
      else created += 1;
    }

    res.json({
      message: `Đã tạo ${created} phiếu bảo trì đến hạn${skipped ? `, bỏ qua ${skipped} kế hoạch đã có phiếu mở` : ""}`,
      created,
      skipped,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/generate", authorize("admin"), async (req, res) => {
  try {
    const plan = await PreventivePlan.findById(req.params.id)
      .populate("assetId", "name")
      .populate("locationId", "name");

    if (!plan) {
      return res.status(404).json({ message: "Không tìm thấy kế hoạch" });
    }

    const { request, skipped } = await buildPreventiveRequest(plan, req.user.id);

    if (skipped) {
      return res.status(400).json({ message: "Kế hoạch này đã có phiếu đang mở" });
    }

    res.json({ message: "Đã tạo phiếu bảo trì", request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;