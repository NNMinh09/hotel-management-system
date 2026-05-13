import express from "express";
import bcrypt from "bcryptjs";
import { register, login, logout, getMe, getUsers } from "../controllers/authController.js";
import { authenticate, authorize } from "../middlewares/authMiddleware.js";
import User from "../models/User.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getMe);
router.get("/users", authenticate, authorize("admin", "staff"), getUsers);

// Reset mật khẩu (Admin)
router.patch("/users/:id/reset-password", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.params.id, { password: hashed });
    res.json({ message: "Đã đổi mật khẩu thành công" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Khóa / Mở khóa tài khoản (Admin)
router.patch("/users/:id/toggle-active", authenticate, authorize("admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy tài khoản" });
    if (user.role === "admin") return res.status(400).json({ message: "Không thể khóa tài khoản Admin" });

    user.isActive = !user.isActive;
    await user.save();
    res.json({
      message: user.isActive ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản",
      isActive: user.isActive
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;