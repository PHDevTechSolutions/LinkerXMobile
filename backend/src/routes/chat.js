const express = require("express");
const { connectToDatabase } = require("../db");
const { ObjectId } = require("mongodb");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// GET /api/chat/fetch — get all chats for current user
router.get("/fetch", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const chats = await db.collection("chats")
      .find({ participantIds: req.user.userId })
      .sort({ updatedAt: -1 })
      .toArray();

    // Populate participant info
    const users = db.collection("users");
    const populated = await Promise.all(chats.map(async (chat) => {
      const participants = await Promise.all(
        chat.participantIds.map(async (uid) => {
          const u = await users.findOne({ _id: new ObjectId(uid) });
          return u ? { _id: u._id.toString(), userName: u.userName, avatar: u.avatar || null } : null;
        })
      );
      return {
        _id: chat._id.toString(),
        participants: participants.filter(Boolean),
        lastMessage: chat.lastMessage || null,
        unreadCount: chat.unreadCount?.[req.user.userId] || 0,
      };
    }));

    return res.status(200).json({ chats: populated });
  } catch (err) {
    console.error("Fetch chats error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST /api/chat/start — start or get existing chat with a user
router.post("/start", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required." });

    const db = await connectToDatabase();
    const chats = db.collection("chats");

    // Check if chat already exists
    let chat = await chats.findOne({
      participantIds: { $all: [req.user.userId, userId] },
    });

    if (!chat) {
      const result = await chats.insertOne({
        participantIds: [req.user.userId, userId],
        lastMessage: null,
        unreadCount: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      chat = await chats.findOne({ _id: result.insertedId });
    }

    return res.status(200).json({ chatId: chat._id.toString() });
  } catch (err) {
    console.error("Start chat error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// GET /api/chat/messages?chatId=xxx
router.get("/messages", async (req, res) => {
  try {
    const { chatId } = req.query;
    if (!chatId) return res.status(400).json({ message: "chatId is required." });

    const db = await connectToDatabase();

    // Verify user is participant
    const chat = await db.collection("chats").findOne({ _id: new ObjectId(chatId) });
    if (!chat) return res.status(404).json({ message: "Chat not found." });
    if (!chat.participantIds.includes(req.user.userId)) {
      return res.status(403).json({ message: "Not authorized." });
    }

    const messages = await db.collection("messages")
      .find({ chatId, hiddenFor: { $ne: req.user.userId } })
      .sort({ createdAt: 1 })
      .toArray();

    // Get other user info
    const otherUserId = chat.participantIds.find((id) => id !== req.user.userId);
    const otherUser = await db.collection("users").findOne({ _id: new ObjectId(otherUserId) });

    return res.status(200).json({
      messages: messages.map((m) => ({ ...m, _id: m._id.toString() })),
      otherUser: otherUser
        ? { _id: otherUser._id.toString(), userName: otherUser.userName, avatar: otherUser.avatar || null }
        : null,
    });
  } catch (err) {
    console.error("Get messages error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST /api/chat/send
router.post("/send", async (req, res) => {
  try {
    const { chatId, text } = req.body;
    if (!chatId || !text) return res.status(400).json({ message: "chatId and text are required." });

    const db = await connectToDatabase();

    const chat = await db.collection("chats").findOne({ _id: new ObjectId(chatId) });
    if (!chat) return res.status(404).json({ message: "Chat not found." });
    if (!chat.participantIds.includes(req.user.userId)) {
      return res.status(403).json({ message: "Not authorized." });
    }

    const message = {
      chatId,
      senderId: req.user.userId,
      text,
      read: false,
      createdAt: new Date(),
    };

    const result = await db.collection("messages").insertOne(message);

    // Update chat lastMessage
    await db.collection("chats").updateOne(
      { _id: new ObjectId(chatId) },
      {
        $set: {
          lastMessage: { text, createdAt: message.createdAt },
          updatedAt: new Date(),
        },
      }
    );

    const savedMessage = { ...message, _id: result.insertedId.toString() };
    return res.status(201).json({ message: savedMessage });
  } catch (err) {
    console.error("Send message error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// PUT /api/chat/messages/:id — edit message text (sender only)
router.put("/messages/:id", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "text is required." });

    const db = await connectToDatabase();
    const msg = await db.collection("messages").findOne({ _id: new ObjectId(req.params.id) });
    if (!msg) return res.status(404).json({ message: "Message not found." });
    if (msg.senderId !== req.user.userId) return res.status(403).json({ message: "Not authorized." });

    await db.collection("messages").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { text: text.trim(), edited: true, editedAt: new Date() } }
    );
    return res.status(200).json({ message: "Message updated." });
  } catch (err) {
    console.error("Edit message error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// DELETE /api/chat/messages/:id — delete for everyone (sender only)
router.delete("/messages/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const msg = await db.collection("messages").findOne({ _id: new ObjectId(req.params.id) });
    if (!msg) return res.status(404).json({ message: "Message not found." });
    if (msg.senderId !== req.user.userId) return res.status(403).json({ message: "Not authorized." });

    await db.collection("messages").deleteOne({ _id: new ObjectId(req.params.id) });
    return res.status(200).json({ message: "Message deleted." });
  } catch (err) {
    console.error("Delete message error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST /api/chat/messages/:id/hide — delete only for me
router.post("/messages/:id/hide", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const msg = await db.collection("messages").findOne({ _id: new ObjectId(req.params.id) });
    if (!msg) return res.status(404).json({ message: "Message not found." });

    // Add current user to hiddenFor array
    await db.collection("messages").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $addToSet: { hiddenFor: req.user.userId } }
    );
    return res.status(200).json({ message: "Message hidden." });
  } catch (err) {
    console.error("Hide message error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST /api/chat/messages/:id/pin — toggle pin (any participant)
router.post("/messages/:id/pin", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const msg = await db.collection("messages").findOne({ _id: new ObjectId(req.params.id) });
    if (!msg) return res.status(404).json({ message: "Message not found." });

    // Verify user is a participant of this chat
    const chat = await db.collection("chats").findOne({ _id: new ObjectId(msg.chatId) });
    if (!chat?.participantIds.includes(req.user.userId)) {
      return res.status(403).json({ message: "Not authorized." });
    }

    const pinned = !msg.pinned;
    await db.collection("messages").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { pinned, pinnedAt: pinned ? new Date() : null } }
    );
    return res.status(200).json({ pinned });
  } catch (err) {
    console.error("Pin message error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
