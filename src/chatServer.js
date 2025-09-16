// chatServer.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// Khởi tạo socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // cho phép client kết nối (React/React Native)
    methods: ["GET", "POST"],
  },
});

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Model người dùng
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  avatar: String,
});
const User = mongoose.model("User", UserSchema);

// Model chat (giữa A và B)
const MessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: String,
    seen: { type: Boolean, default: false },
  },
  { timestamps: true }
);
const Message = mongoose.model("Message", MessageSchema);

// Socket.io events
io.on("connection", (socket) => {
  console.log("🔗 User connected:", socket.id);

  // Tham gia vào room riêng theo userId
  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`✅ User ${userId} joined their room`);
  });

  // Nhận tin nhắn
  socket.on("sendMessage", async ({ senderId, receiverId, content }) => {
    const message = new Message({ sender: senderId, receiver: receiverId, content });
    await message.save();

    // Gửi lại cho cả sender + receiver
    io.to(senderId).emit("newMessage", message);
    io.to(receiverId).emit("newMessage", message);
  });

  // Đánh dấu đã xem
  socket.on("markAsSeen", async (messageId) => {
    await Message.findByIdAndUpdate(messageId, { seen: true });
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

server.listen(8070, () => {
  console.log("🚀 Chat server running on port 8070");
});
