import dotenv from "dotenv";
dotenv.config();

import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);

// ✅ Đồng bộ CORS Socket.io với Express CORS trong app.js
const allowedOrigins = [
  "http://localhost:3000",
  "https://hotel-management-system-nnminh09.vercel.app",
  "https://hotel-management-system-eta-ten.vercel.app",
  /\.vercel\.app$/, // Cho phép tất cả subdomain Vercel (preview deployments)
];

export const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Cho phép request không có origin
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.some((allowed) =>
        allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
      );

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`Socket.io CORS blocked: ${origin}`));
      }
    },
    credentials: true,
  },
  // ✅ Tránh lỗi WebSocket đóng sớm: thử polling trước, rồi upgrade lên websocket
  transports: ["polling", "websocket"],
});

io.on("connection", (socket) => {
  console.log("🔌 Connected:", socket.id);

  socket.on("join_role", (role) => {
    socket.join(role);
    console.log(`Socket ${socket.id} joined room: ${role}`);
  });

  socket.on("join_user", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} joined user room: user_${userId}`);
  });

  socket.on("disconnect", (reason) => {
    console.log(`❌ Disconnected: ${socket.id} — reason: ${reason}`);
  });
});

// ✅ Kết nối Database và chạy Server
connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});