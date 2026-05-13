import express from "express";
import SparePart from "../models/SparePart.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(authenticate);

router.get("/", async (req, res) => {
  const data = await SparePart.find().sort({ name: 1 });
  res.json(data);
});
router.post("/", authorize("admin"), async (req, res) => {
  const data = await SparePart.create(req.body);
  res.status(201).json(data);
});
router.put("/:id", authorize("admin"), async (req, res) => {
  const data = await SparePart.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(data);
});
router.delete("/:id", authorize("admin"), async (req, res) => {
  await SparePart.findByIdAndDelete(req.params.id);
  res.json({ message: "Đã xóa" });
});

export default router;