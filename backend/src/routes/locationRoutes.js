import express from "express";
import Location from "../models/Location.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(authenticate);

router.get("/", async (req, res) => {
  const data = await Location.find().sort({ floor: 1, name: 1 });
  res.json(data);
});
router.post("/", authorize("admin"), async (req, res) => {
  const data = await Location.create(req.body);
  res.status(201).json(data);
});
router.put("/:id", authorize("admin"), async (req, res) => {
  const data = await Location.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(data);
});
router.delete("/:id", authorize("admin"), async (req, res) => {
  await Location.findByIdAndDelete(req.params.id);
  res.json({ message: "Đã xóa" });
});

export default router;