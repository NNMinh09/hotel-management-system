import dotenv from "dotenv";
dotenv.config();

import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true
  }
});

io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.id);

  // Join theo role (admin, staff)
  socket.on("join_role", (role) => {
    socket.join(role);
    console.log(`Socket ${socket.id} joined room: ${role}`);
  });

  // Join theo userId (cho technician nhận thông báo riêng)
  socket.on("join_user", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} joined user room: user_${userId}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
  });
});

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
  });
});