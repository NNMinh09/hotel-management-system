import jwt from "jsonwebtoken";

export const authenticate = (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Chưa đăng nhập" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};
export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Không có quyền truy cập" });
  }
  next();
};
