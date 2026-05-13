import express from "express";
import {
  createRequest,
  getRequests,
  getRequestById,
  assignRequest,
  claimRequest,
  updateStatus,
  deleteRequest,
} from "../controllers/maintenanceController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getRequests);
router.get("/:id", getRequestById);
router.post("/", upload.array("images", 5), createRequest);
router.put("/:id/assign", authorize("admin", "staff"), assignRequest);
router.put("/:id/claim", authorize("technician"), claimRequest);
router.put("/:id/status", authorize("admin", "technician"), upload.array("images", 5), updateStatus);
router.delete("/:id", authorize("admin"), deleteRequest);

export default router;