import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import path from "path";

import authRoutes from "./routes/authRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import assetRoutes from "./routes/assetRoutes.js";
import maintenanceRoutes from "./routes/maintenanceRoutes.js";
import sparePartRoutes from "./routes/sparePartRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import preventivePlanRoutes from "./routes/preventivePlanRoutes.js";
import importRoutes from "./routes/importRoutes.js";
import exportRoutes from "./routes/exportRoutes.js";

const app = express();

// ✅ Danh sách origin được phép - đồng bộ với Socket.io trong server.js
const allowedOrigins = [
  "http://localhost:3000",
  "https://hotel-management-system-nnminh09.vercel.app",
  "https://hotel-management-system-eta-ten.vercel.app",
  /\.vercel\.app$/, // Cho phép tất cả subdomain Vercel (preview deployments)
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép request không có origin (Postman, curl, server-to-server)
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.some((allowed) =>
        allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
      );

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.use("/uploads", express.static(path.resolve("uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/spare-parts", sparePartRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/preventive-plans", preventivePlanRoutes);
app.use("/api/import", importRoutes);
app.use("/api/export", exportRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "🔧 Hotel Maintenance API is Live!",
    status: "Healthy",
  });
});

export default app;