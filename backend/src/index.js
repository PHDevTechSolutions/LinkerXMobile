require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { connectToDatabase } = require("./db");

const authRoutes    = require("./routes/auth");
const postsRoutes   = require("./routes/posts");
const profileRoutes = require("./routes/profile");
const commentsRoutes = require("./routes/comments");
const chatRoutes    = require("./routes/chat");
const usersRoutes   = require("./routes/users");
const groupsRoutes   = require("./routes/groups");
const callsRoutes    = require("./routes/calls");
const storiesRoutes  = require("./routes/stories");
const reactionsRoutes = require("./routes/reactions");

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 3000;

// ─── Socket.io ───────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

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

  // ── Direct chat ──────────────────────────────────────────────────────────
  socket.on("join_room",  (chatId) => socket.join(chatId));
  socket.on("leave_room", (chatId) => socket.leave(chatId));

  socket.on("typing", ({ chatId, userId }) => {
    socket.to(chatId).emit("typing", { userId });
  });

  socket.on("send_message", async ({ chatId, text }) => {
    try {
      const { ObjectId } = require("mongodb");
      const db = await connectToDatabase();

      const chat = await db.collection("chats").findOne({ _id: new ObjectId(chatId) });
      if (!chat || !chat.participantIds.includes(socket.userId)) return;

      const message = { chatId, senderId: socket.userId, text, read: false, createdAt: new Date() };
      const result  = await db.collection("messages").insertOne(message);

      await db.collection("chats").updateOne(
        { _id: new ObjectId(chatId) },
        { $set: { lastMessage: { text, createdAt: message.createdAt }, updatedAt: new Date() } }
      );

      io.to(chatId).emit("new_message", { ...message, _id: result.insertedId.toString() });
    } catch (err) {
      console.error("send_message error:", err);
    }
  });

  // ── Group / Community chat ────────────────────────────────────────────────
  socket.on("join_group",  (groupId) => socket.join(`group_${groupId}`));
  socket.on("leave_group", (groupId) => socket.leave(`group_${groupId}`));

  socket.on("group_typing", ({ groupId, userName }) => {
    socket.to(`group_${groupId}`).emit("group_typing", { userId: socket.userId, userName });
  });

  // ── WebRTC Signaling ──────────────────────────────────────────────────────
  socket.on("webrtc_offer", ({ targetUserId, offer, callId, callerName, callerAvatar, callType }) => {
    // Send incoming call notification to receiver
    socket.to(`user_${targetUserId}`).emit("webrtc_incoming_call", {
      callId,
      callerId: socket.userId,
      callerName: callerName || "Unknown",
      callerAvatar: callerAvatar || null,
      callType: callType || "video",
      offer,
    });
    // Also send the offer directly
    socket.to(`user_${targetUserId}`).emit("webrtc_offer", {
      fromUserId: socket.userId,
      offer,
      callId,
    });
  });

  socket.on("webrtc_answer", ({ targetUserId, answer, callId }) => {
    socket.to(`user_${targetUserId}`).emit("webrtc_answer", {
      fromUserId: socket.userId,
      answer,
      callId,
    });
  });

  socket.on("webrtc_ice_candidate", ({ targetUserId, candidate, callId }) => {
    socket.to(`user_${targetUserId}`).emit("webrtc_ice_candidate", {
      fromUserId: socket.userId,
      candidate,
      callId,
    });
  });

  socket.on("webrtc_end_call", ({ targetUserId, callId }) => {
    // Send end call only to the target, not back to sender
    socket.to(`user_${targetUserId}`).emit("webrtc_end_call", { callId });
  });

  // Join personal room for receiving calls
  socket.on("join_user_room", () => {
    socket.join(`user_${socket.userId}`);
  });

  socket.on("send_group_message", async ({ groupId, text }) => {
    try {
      const { ObjectId } = require("mongodb");
      const db = await connectToDatabase();

      const group = await db.collection("groups").findOne({ _id: new ObjectId(groupId) });
      if (!group || !group.memberIds.includes(socket.userId)) return;

      const sender  = await db.collection("users").findOne({ _id: new ObjectId(socket.userId) });
      const message = { groupId, senderId: socket.userId, text, createdAt: new Date() };
      const result  = await db.collection("groupMessages").insertOne(message);

      await db.collection("groups").updateOne(
        { _id: new ObjectId(groupId) },
        {
          $set: {
            lastMessage: { text, createdAt: message.createdAt, senderName: sender.userName },
            updatedAt: new Date(),
          },
        }
      );

      const savedMsg = {
        ...message,
        _id: result.insertedId.toString(),
        sender: { _id: sender._id.toString(), userName: sender.userName, avatar: sender.avatar || null },
      };

      io.to(`group_${groupId}`).emit("new_group_message", savedMsg);
    } catch (err) {
      console.error("send_group_message error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Socket disconnected: ${socket.userId}`);
  });
});

// ─── Express ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());

app.use("/api",          authRoutes);
app.use("/api/posts",    postsRoutes);
app.use("/api/feed",     postsRoutes);
app.use("/api/profile",  profileRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/chat",     chatRoutes);
app.use("/api/users",    usersRoutes);
app.use("/api/groups",    groupsRoutes);
app.use("/api/calls",     callsRoutes);
app.use("/api/stories",   storiesRoutes);
app.use("/api/reactions", reactionsRoutes);

app.get("/", (_req, res) => res.json({ status: "LinkerX API is running 🚀" }));

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
