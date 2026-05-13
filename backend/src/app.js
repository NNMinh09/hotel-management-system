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

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
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

app.get("/", (req, res) => res.json({ message: "🔧 Hotel Maintenance API running!" }));

export default app;