const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Routers
const conversationRouter = require("./routes/conversationRouter");
const messageRouter = require("./routes/messageRouter");

const app = express();
app.use(cors());
app.use(express.json());

const mongoUri = process.env.MONGODB_URI;

// MongoDB
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// API
app.use("/api/conversations", conversationRouter);
app.use("/api/messages", messageRouter);

const server = http.createServer(app);

// SocketIO
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

let users = [];

// add user online
const addUser = (userId, socketId) => {
  if (!users.some((u) => u.userId === userId)) {
    users.push({ userId, socketId });
  }
};

// remove user offline
const removeUser = (socketId) => {
  users = users.filter((u) => u.socketId !== socketId);
};

// get user by id
const getUser = (userId) => users.find((u) => u.userId === userId);

// socket logic
io.on("connection", (socket) => {
  console.log("a user connected:", socket.id);

  // khi user login
  socket.on("addUser", (userId) => {
    addUser(userId, socket.id);
    io.emit("getUsers", users);
  });

  // khi gửi message
  socket.on("sendMessage", ({ senderId, receiverId, text }) => {
    const user = getUser(receiverId);
    if (user) {
      io.to(user.socketId).emit("getMessage", {
        senderId,
        text,
        createdAt: new Date(),
      });
    }
  });

  // disconnect
  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
    removeUser(socket.id);
    io.emit("getUsers", users);
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});
