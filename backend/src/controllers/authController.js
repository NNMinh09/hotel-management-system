import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
  return { accessToken, refreshToken };
};

// ✅ Cấu hình cookie dùng chung — cross-origin (Vercel → Render) bắt buộc cần
// secure: true và sameSite: "None"
const cookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: true,        // ✅ Bắt buộc khi dùng sameSite: "None"
  sameSite: "None",    // ✅ Cho phép gửi cookie cross-origin
  maxAge,
});

export const register = async (req, res) => {
  try {
    const { name, email, phone, password, role, specialization } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email đã tồn tại" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name, email, phone,
      password: hashed,
      role: role || "staff",
      specialization: specialization || null,
    });

    res.status(201).json({ message: "Tạo tài khoản thành công", userId: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.isActive)
      return res.status(401).json({ message: "Tài khoản không tồn tại hoặc bị khóa" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Sai mật khẩu" });

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = refreshToken;
    await user.save();

    // ✅ Set cookie với đúng cấu hình cross-origin
    res.cookie("accessToken", accessToken, cookieOptions(86400000));       // 1 ngày
    res.cookie("refreshToken", refreshToken, cookieOptions(604800000));    // 7 ngày

    res.json({
      message: "Đăng nhập thành công",
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { refreshToken: null });

    // ✅ clearCookie phải cùng options với lúc set (trừ maxAge)
    res.clearCookie("accessToken", { httpOnly: true, secure: true, sameSite: "None" });
    res.clearCookie("refreshToken", { httpOnly: true, secure: true, sameSite: "None" });

    res.json({ message: "Đã đăng xuất" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -refreshToken");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter).select("-password -refreshToken");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};