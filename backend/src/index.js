require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { connectToDatabase } = require("./db");

const authRoutes = require("./routes/auth");
const postsRoutes = require("./routes/posts");
const profileRoutes = require("./routes/profile");
const commentsRoutes = require("./routes/comments");
const chatRoutes = require("./routes/chat");
const usersRoutes = require("./routes/users");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Socket.io setup
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Socket auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Unauthorized"));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.userId}`);

  socket.on("join_room", (chatId) => {
    socket.join(chatId);
  });

  socket.on("leave_room", (chatId) => {
    socket.leave(chatId);
  });

  // Real-time send message via socket
  socket.on("send_message", async ({ chatId, text }) => {
    try {
      const db = await connectToDatabase();
      const { ObjectId } = require("mongodb");

      const chat = await db.collection("chats").findOne({ _id: new ObjectId(chatId) });
      if (!chat || !chat.participantIds.includes(socket.userId)) return;

      const message = {
        chatId,
        senderId: socket.userId,
        text,
        read: false,
        createdAt: new Date(),
      };

      const result = await db.collection("messages").insertOne(message);
      await db.collection("chats").updateOne(
        { _id: new ObjectId(chatId) },
        { $set: { lastMessage: { text, createdAt: message.createdAt }, updatedAt: new Date() } }
      );

      const savedMsg = { ...message, _id: result.insertedId.toString() };
      // Broadcast to everyone in the room
      io.to(chatId).emit("new_message", savedMsg);
    } catch (err) {
      console.error("Socket send_message error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Socket disconnected: ${socket.userId}`);
  });
});

// Express middleware
app.use(cors({ origin: "*" }));
app.use(express.json());

// Routes
app.use("/api", authRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/feed", postsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/users", usersRoutes);

app.get("/", (req, res) => {
  res.json({ status: "LinkerX API is running 🚀" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
