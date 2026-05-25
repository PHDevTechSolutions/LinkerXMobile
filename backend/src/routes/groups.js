const express = require("express");
const { connectToDatabase } = require("../db");
const { ObjectId } = require("mongodb");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// ─── CREATE GROUP OR COMMUNITY ───────────────────────────────────────────────
// POST /api/groups/create
router.post("/create", async (req, res) => {
  try {
    const { name, description, type = "group", memberIds = [], avatar = null } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required." });

    const db = await connectToDatabase();
    const me = await db.collection("users").findOne({ _id: new ObjectId(req.user.userId) });

    const allMemberIds = [...new Set([req.user.userId, ...memberIds])];

    const group = {
      name,
      description: description || "",
      type, // "group" | "community"
      avatar,
      adminIds: [req.user.userId],
      memberIds: allMemberIds,
      createdBy: req.user.userId,
      lastMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("groups").insertOne(group);
    return res.status(201).json({ group: { ...group, _id: result.insertedId.toString() } });
  } catch (err) {
    console.error("Create group error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─── GET MY GROUPS ────────────────────────────────────────────────────────────
// GET /api/groups/mine
router.get("/mine", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const groups = await db.collection("groups")
      .find({ memberIds: req.user.userId })
      .sort({ updatedAt: -1 })
      .toArray();

    return res.status(200).json({
      groups: groups.map((g) => ({ ...g, _id: g._id.toString() })),
    });
  } catch (err) {
    console.error("Get groups error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─── GET GROUP DETAILS ────────────────────────────────────────────────────────
// GET /api/groups/:id
router.get("/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const group = await db.collection("groups").findOne({ _id: new ObjectId(req.params.id) });
    if (!group) return res.status(404).json({ message: "Group not found." });
    if (!group.memberIds.includes(req.user.userId)) {
      return res.status(403).json({ message: "Not a member." });
    }

    // Populate members
    const members = await Promise.all(
      group.memberIds.map(async (uid) => {
        const u = await db.collection("users").findOne({ _id: new ObjectId(uid) });
        return u ? {
          _id: u._id.toString(),
          userName: u.userName,
          avatar: u.avatar || null,
          isAdmin: group.adminIds.includes(uid),
        } : null;
      })
    );

    return res.status(200).json({
      group: {
        ...group,
        _id: group._id.toString(),
        members: members.filter(Boolean),
      },
    });
  } catch (err) {
    console.error("Get group error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─── GET GROUP MESSAGES ───────────────────────────────────────────────────────
// GET /api/groups/:id/messages
router.get("/:id/messages", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const group = await db.collection("groups").findOne({ _id: new ObjectId(req.params.id) });
    if (!group) return res.status(404).json({ message: "Group not found." });
    if (!group.memberIds.includes(req.user.userId)) {
      return res.status(403).json({ message: "Not a member." });
    }

    const messages = await db.collection("groupMessages")
      .find({ groupId: req.params.id })
      .sort({ createdAt: 1 })
      .toArray();

    // Populate sender info
    const populated = await Promise.all(messages.map(async (m) => {
      const sender = await db.collection("users").findOne({ _id: new ObjectId(m.senderId) });
      return {
        ...m,
        _id: m._id.toString(),
        sender: sender ? {
          _id: sender._id.toString(),
          userName: sender.userName,
          avatar: sender.avatar || null,
        } : null,
      };
    }));

    return res.status(200).json({ messages: populated });
  } catch (err) {
    console.error("Get group messages error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─── SEND GROUP MESSAGE ───────────────────────────────────────────────────────
// POST /api/groups/:id/send
router.post("/:id/send", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Text is required." });

    const db = await connectToDatabase();
    const group = await db.collection("groups").findOne({ _id: new ObjectId(req.params.id) });
    if (!group) return res.status(404).json({ message: "Group not found." });
    if (!group.memberIds.includes(req.user.userId)) {
      return res.status(403).json({ message: "Not a member." });
    }

    const sender = await db.collection("users").findOne({ _id: new ObjectId(req.user.userId) });

    const message = {
      groupId: req.params.id,
      senderId: req.user.userId,
      text,
      createdAt: new Date(),
    };

    const result = await db.collection("groupMessages").insertOne(message);
    await db.collection("groups").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { lastMessage: { text, createdAt: message.createdAt, senderName: sender.userName }, updatedAt: new Date() } }
    );

    const saved = {
      ...message,
      _id: result.insertedId.toString(),
      sender: { _id: sender._id.toString(), userName: sender.userName, avatar: sender.avatar || null },
    };

    return res.status(201).json({ message: saved });
  } catch (err) {
    console.error("Send group message error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─── ADD MEMBER ───────────────────────────────────────────────────────────────
// POST /api/groups/:id/members/add
router.post("/:id/members/add", async (req, res) => {
  try {
    const { userId } = req.body;
    const db = await connectToDatabase();
    const group = await db.collection("groups").findOne({ _id: new ObjectId(req.params.id) });
    if (!group) return res.status(404).json({ message: "Group not found." });
    if (!group.adminIds.includes(req.user.userId)) {
      return res.status(403).json({ message: "Only admins can add members." });
    }
    if (group.memberIds.includes(userId)) {
      return res.status(400).json({ message: "User is already a member." });
    }

    await db.collection("groups").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $push: { memberIds: userId } }
    );

    return res.status(200).json({ message: "Member added." });
  } catch (err) {
    console.error("Add member error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─── REMOVE MEMBER ────────────────────────────────────────────────────────────
// POST /api/groups/:id/members/remove
router.post("/:id/members/remove", async (req, res) => {
  try {
    const { userId } = req.body;
    const db = await connectToDatabase();
    const group = await db.collection("groups").findOne({ _id: new ObjectId(req.params.id) });
    if (!group) return res.status(404).json({ message: "Group not found." });

    const isAdmin = group.adminIds.includes(req.user.userId);
    const isSelf = userId === req.user.userId;
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: "Not authorized." });
    }

    await db.collection("groups").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $pull: { memberIds: userId, adminIds: userId } }
    );

    return res.status(200).json({ message: isSelf ? "Left group." : "Member removed." });
  } catch (err) {
    console.error("Remove member error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─── PROMOTE TO ADMIN ─────────────────────────────────────────────────────────
// POST /api/groups/:id/admin/promote
router.post("/:id/admin/promote", async (req, res) => {
  try {
    const { userId } = req.body;
    const db = await connectToDatabase();
    const group = await db.collection("groups").findOne({ _id: new ObjectId(req.params.id) });
    if (!group) return res.status(404).json({ message: "Group not found." });
    if (!group.adminIds.includes(req.user.userId)) {
      return res.status(403).json({ message: "Only admins can promote members." });
    }

    await db.collection("groups").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $addToSet: { adminIds: userId } }
    );

    return res.status(200).json({ message: "Promoted to admin." });
  } catch (err) {
    console.error("Promote admin error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─── UPDATE GROUP ─────────────────────────────────────────────────────────────
// PUT /api/groups/:id
router.put("/:id", async (req, res) => {
  try {
    const { name, description, avatar } = req.body;
    const db = await connectToDatabase();
    const group = await db.collection("groups").findOne({ _id: new ObjectId(req.params.id) });
    if (!group) return res.status(404).json({ message: "Group not found." });
    if (!group.adminIds.includes(req.user.userId)) {
      return res.status(403).json({ message: "Only admins can edit group." });
    }

    const update = { updatedAt: new Date() };
    if (name) update.name = name;
    if (description !== undefined) update.description = description;
    if (avatar !== undefined) update.avatar = avatar;

    await db.collection("groups").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: update }
    );

    return res.status(200).json({ message: "Group updated." });
  } catch (err) {
    console.error("Update group error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─── DELETE GROUP ─────────────────────────────────────────────────────────────
// DELETE /api/groups/:id
router.delete("/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const group = await db.collection("groups").findOne({ _id: new ObjectId(req.params.id) });
    if (!group) return res.status(404).json({ message: "Group not found." });
    if (group.createdBy !== req.user.userId) {
      return res.status(403).json({ message: "Only the creator can delete this group." });
    }

    await db.collection("groups").deleteOne({ _id: new ObjectId(req.params.id) });
    await db.collection("groupMessages").deleteMany({ groupId: req.params.id });

    return res.status(200).json({ message: "Group deleted." });
  } catch (err) {
    console.error("Delete group error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
