import MaintenanceRequest from "../models/MaintenanceRequest.js";
import Asset from "../models/Asset.js";
import Location from "../models/Location.js";
import PreventivePlan from "../models/PreventivePlan.js";
import User from "../models/User.js";

const CLOSED_STATUSES = ["completed", "cancelled"];
const VALID_STATUSES = ["pending", "assigned", "in_progress", "waiting_parts", "completed", "cancelled"];

function normalizeUploadedFiles(files = []) {
  return files.map((file) => {
    const normalized = file.path.replace(/\\/g, "/");
    return normalized.startsWith("/") ? normalized : `/${normalized}`;
  });
}

function parseRequestCost(body = {}) {
  if (body.cost && typeof body.cost === "object") {
    return {
      labor: Number(body.cost.labor || 0),
      parts: Number(body.cost.parts || 0),
    };
  }

  return {
    labor: Number(body["cost[labor]"] || 0),
    parts: Number(body["cost[parts]"] || 0),
  };
}

async function syncLocationStatus(locationId) {
  if (!locationId) return;

  const openRequestCount = await MaintenanceRequest.countDocuments({
    locationId,
    status: { $nin: CLOSED_STATUSES },
  });

  await Location.findByIdAndUpdate(locationId, {
    status: openRequestCount > 0 ? "maintenance" : "active",
  });
}

async function getAssignableTechnician(technicianId) {
  if (!technicianId) return null;

  const technician = await User.findById(technicianId).select("_id role isActive");
  if (!technician || technician.role !== "technician") {
    const error = new Error("Kỹ thuật viên không hợp lệ");
    error.statusCode = 400;
    throw error;
  }

  if (technician.isActive === false) {
    const error = new Error("Kỹ thuật viên đã bị khóa");
    error.statusCode = 400;
    throw error;
  }

  return technician;
}

async function syncPreventivePlanAfterCompletion(request, completedAt) {
  if (!request.preventivePlanId || !completedAt) return;

  const plan = await PreventivePlan.findById(request.preventivePlanId);
  if (!plan) return;

  const nextDueDate = new Date(completedAt);
  nextDueDate.setDate(nextDueDate.getDate() + (plan.intervalDays || 30));

  await PreventivePlan.findByIdAndUpdate(plan._id, {
    lastDoneDate: completedAt,
    nextDueDate,
  });
}

export const createRequest = async (req, res) => {
  try {
    const body = req.body || {};
    const title = body.title?.trim();
    const description = body.description?.trim();
    const locationId = body.locationId;
    const assetId = body.assetId || null;
    const priority = body.priority || "medium";
    const type = body.type || "repair";
    const preventivePlanId = body.preventivePlanId || null;
    const images = normalizeUploadedFiles(req.files);

    if (!title || !description || !locationId) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc cho phiếu bảo trì" });
    }

    let assignedTechnician = null;

    if (req.user.role === "technician") {
      assignedTechnician = { _id: req.user.id };
    } else if (body.assignedTo) {
      assignedTechnician = await getAssignableTechnician(body.assignedTo);
    }

    const assignedTo = assignedTechnician?._id || null;
    const assignedAt = assignedTo ? new Date() : null;
    const status = assignedTo ? "assigned" : "pending";
    const note = req.user.role === "technician"
      ? "Kỹ thuật viên tự tạo phiếu và tự nhận việc"
      : assignedTo
        ? "Phiếu được tạo và giao trực tiếp cho kỹ thuật viên"
        : "Yêu cầu mới được tạo";

    const request = await MaintenanceRequest.create({
      title,
      description,
      locationId,
      assetId,
      preventivePlanId,
      priority,
      type,
      reportedBy: req.user.id,
      images,
      assignedTo,
      assignedAt,
      status,
      statusHistory: [
        {
          status,
          note,
          updatedBy: req.user.id,
        },
      ],
    });

    if (assetId && type === "repair") {
      await Asset.findByIdAndUpdate(assetId, {
        status: assignedTo ? "under_maintenance" : "broken",
      });
    }

    await syncLocationStatus(locationId);

    res.status(201).json({ message: "Đã tạo yêu cầu bảo trì", request });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const getRequests = async (req, res) => {
  try {
    const {
      status,
      priority,
      year,
      month,
      page = 1,
      limit = 10,
      scope = "all",
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    if (year && month) {
      const parsedYear = Number(year);
      const parsedMonth = Number(month);
      if (!Number.isNaN(parsedYear) && !Number.isNaN(parsedMonth)) {
        const start = new Date(parsedYear, parsedMonth - 1, 1);
        const end = new Date(parsedYear, parsedMonth, 1);
        filter.createdAt = { $gte: start, $lt: end };
      }
    }

    if (req.user.role === "staff") {
      filter.reportedBy = req.user.id;
    }

    if (req.user.role === "technician") {
      if (scope === "pool") {
        filter.status = "pending";
        filter.assignedTo = null;
      } else if (scope === "mine") {
        filter.assignedTo = req.user.id;
      } else {
        filter.$or = [
          { assignedTo: req.user.id },
          { status: "pending", assignedTo: null },
        ];
      }
    }

    const parsedPage = Math.max(Number(page) || 1, 1);
    const parsedLimit = Math.max(Number(limit) || 10, 1);
    const total = await MaintenanceRequest.countDocuments(filter);
    const requests = await MaintenanceRequest.find(filter)
      .populate("reportedBy", "name role")
      .populate("assignedTo", "name specialization")
      .populate("locationId", "name type floor status")
      .populate("assetId", "name code category")
      .populate("preventivePlanId", "name intervalDays nextDueDate")
      .sort({ priority: -1, createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    res.json({
      requests,
      total,
      page: parsedPage,
      totalPages: Math.ceil(total / parsedLimit),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getRequestById = async (req, res) => {
  try {
    const request = await MaintenanceRequest.findById(req.params.id)
      .populate("reportedBy", "name role phone")
      .populate("assignedTo", "name specialization phone")
      .populate("locationId", "name type floor status")
      .populate("assetId", "name code brand model")
      .populate("preventivePlanId", "name intervalDays nextDueDate")
      .populate("statusHistory.updatedBy", "name role");

    if (!request) {
      return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const assignRequest = async (req, res) => {
  try {
    const { technicianId, note } = req.body || {};
    const technician = await getAssignableTechnician(technicianId);

    const existingRequest = await MaintenanceRequest.findById(req.params.id);
    if (!existingRequest) {
      return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
    }

    if (CLOSED_STATUSES.includes(existingRequest.status)) {
      return res.status(400).json({ message: "Phiếu đã đóng, không thể phân công" });
    }

    const request = await MaintenanceRequest.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo: technician._id,
        assignedAt: new Date(),
        status: "assigned",
        $push: {
          statusHistory: {
            status: "assigned",
            note: note || "Đã phân công kỹ thuật viên",
            updatedBy: req.user.id,
          },
        },
      },
      { new: true }
    ).populate("assignedTo", "name specialization");

    if (request?.assetId && request.type === "repair") {
      await Asset.findByIdAndUpdate(request.assetId, { status: "under_maintenance" });
    }

    await syncLocationStatus(request.locationId);

    res.json({ message: "Đã phân công thành công", request });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const claimRequest = async (req, res) => {
  try {
    const request = await MaintenanceRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
    }

    if (request.status !== "pending" || request.assignedTo) {
      return res.status(400).json({ message: "Phiếu này không còn trong bảng chờ" });
    }

    const updatedRequest = await MaintenanceRequest.findByIdAndUpdate(
      request._id,
      {
        assignedTo: req.user.id,
        assignedAt: new Date(),
        status: "assigned",
        $push: {
          statusHistory: {
            status: "assigned",
            note: "Kỹ thuật viên tự nhận việc từ bảng chờ",
            updatedBy: req.user.id,
          },
        },
      },
      { new: true }
    ).populate("assignedTo", "name specialization");

    if (updatedRequest?.assetId && updatedRequest.type === "repair") {
      await Asset.findByIdAndUpdate(updatedRequest.assetId, { status: "under_maintenance" });
    }

    await syncLocationStatus(updatedRequest.locationId);

    res.json({ message: "Đã nhận việc thành công", request: updatedRequest });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const body = req.body || {};
    const status = body.status;
    const note = body.note?.trim() || "";
    const cost = parseRequestCost(body);
    const newImages = normalizeUploadedFiles(req.files);

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Trạng thái cập nhật không hợp lệ" });
    }

    const existingRequest = await MaintenanceRequest.findById(req.params.id);
    if (!existingRequest) {
      return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
    }

    if (
      req.user.role === "technician" &&
      String(existingRequest.assignedTo || "") !== String(req.user.id)
    ) {
      return res.status(403).json({ message: "Bạn chỉ có thể cập nhật phiếu được giao cho mình" });
    }

    if (status === "completed" && !note) {
      return res.status(400).json({ message: "Vui lòng nhập mô tả cách xử lý trước khi hoàn thành" });
    }

    const wasCompleted = existingRequest.status === "completed";
    const completedAt = status === "completed" ? new Date() : null;
    const totalCost = cost.labor + cost.parts;

    const updateData = {
      status,
      $push: {
        statusHistory: {
          status,
          note: note || "Cập nhật trạng thái phiếu",
          updatedBy: req.user.id,
        },
      },
    };

    if (newImages.length > 0) {
      updateData.$push.images = { $each: newImages };
    }

    if (status === "completed") {
      updateData.completedAt = completedAt;
      updateData.resolution = note;
      updateData["cost.labor"] = cost.labor;
      updateData["cost.parts"] = cost.parts;
      updateData["cost.total"] = totalCost;
    }

    const request = await MaintenanceRequest.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (request.assetId) {
      if (status === "completed") {
        const asset = await Asset.findById(request.assetId);
        if (asset) {
          const nextDate = new Date(completedAt);
          nextDate.setDate(nextDate.getDate() + (asset.maintenanceIntervalDays || 90));

          const assetUpdate = {
            status: "active",
            lastMaintenanceDate: completedAt,
            nextMaintenanceDate: nextDate,
            $inc: { totalRepairCost: totalCost },
          };

          if (!wasCompleted) {
            assetUpdate.$push = {
              maintenanceHistory: {
                requestId: request._id,
                title: request.title,
                type: request.type,
                reportedBy: request.reportedBy,
                assignedTo: request.assignedTo,
                createdAt: request.createdAt,
                completedAt,
                resolution: note,
                status: "completed",
                cost: {
                  labor: cost.labor,
                  parts: cost.parts,
                  total: totalCost,
                },
                images: request.images || [],
              },
            };
          }

          await Asset.findByIdAndUpdate(request.assetId, assetUpdate);
        }

        await syncPreventivePlanAfterCompletion(request, completedAt);
      } else if (status === "cancelled") {
        await Asset.findByIdAndUpdate(request.assetId, {
          status: request.type === "repair" ? "broken" : "active",
        });
      } else if (request.type === "repair") {
        await Asset.findByIdAndUpdate(request.assetId, {
          status: "under_maintenance",
        });
      }
    }

    await syncLocationStatus(request.locationId);

    res.json({ message: "Đã cập nhật trạng thái", request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteRequest = async (req, res) => {
  try {
    const request = await MaintenanceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
    }

    await MaintenanceRequest.findByIdAndDelete(req.params.id);
    await syncLocationStatus(request.locationId);

    res.json({ message: "Đã xóa yêu cầu" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};