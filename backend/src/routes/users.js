const express = require("express");
const { connectToDatabase } = require("../db");
const { ObjectId } = require("mongodb");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// GET /api/users/suggested — random users excluding self
router.get("/suggested", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const users = await db.collection("users")
      .find({ _id: { $ne: new ObjectId(req.user.userId) } })
      .limit(20)
      .toArray();

    return res.status(200).json({
      users: users.map((u) => ({
        _id: u._id.toString(),
        userName: u.userName,
        avatar: u.avatar || null,
        bio: u.bio || "",
        followersCount: u.followersCount || 0,
      })),
    });
  } catch (err) {
    console.error("Suggested users error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// GET /api/users/search?q=xxx
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.status(200).json({ users: [] });

    const db = await connectToDatabase();
    const users = await db.collection("users")
      .find({
        userName: { $regex: q, $options: "i" },
        _id: { $ne: new ObjectId(req.user.userId) }, // exclude self
      })
      .limit(20)
      .toArray();

    return res.status(200).json({
      users: users.map((u) => ({
        _id: u._id.toString(),
        userName: u.userName,
        avatar: u.avatar || null,
        bio: u.bio || "",
        followersCount: u.followersCount || 0,
      })),
    });
  } catch (err) {
    console.error("Search users error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// GET /api/users/:id
router.get("/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const user = await db.collection("users").findOne({ _id: new ObjectId(req.params.id) });
    if (!user) return res.status(404).json({ message: "User not found." });

    return res.status(200).json({
      user: {
        _id: user._id.toString(),
        userName: user.userName,
        avatar: user.avatar || null,
        bio: user.bio || "",
        followersCount: user.followersCount || 0,
        followingCount: user.followingCount || 0,
      },
    });
  } catch (err) {
    console.error("Get user error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST /api/users/:id/follow
router.post("/:id/follow", async (req, res) => {
  try {
    const targetId = req.params.id;
    const myId = req.user.userId;
    if (targetId === myId) return res.status(400).json({ message: "Cannot follow yourself." });

    const db = await connectToDatabase();
    const users = db.collection("users");

    const me = await users.findOne({ _id: new ObjectId(myId) });
    const following = me.following || [];
    const isFollowing = following.includes(targetId);

    if (isFollowing) {
      await users.updateOne({ _id: new ObjectId(myId) }, { $pull: { following: targetId }, $inc: { followingCount: -1 } });
      await users.updateOne({ _id: new ObjectId(targetId) }, { $pull: { followers: myId }, $inc: { followersCount: -1 } });
    } else {
      await users.updateOne({ _id: new ObjectId(myId) }, { $push: { following: targetId }, $inc: { followingCount: 1 } });
      await users.updateOne({ _id: new ObjectId(targetId) }, { $push: { followers: myId }, $inc: { followersCount: 1 } });

      // Emit follow notification via socket
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${targetId}`).emit('notification', {
          type: 'follow',
          title: me.userName || 'Someone',
          body: `${me.userName} started following you`,
          fromUserId: myId,
          fromUserName: me.userName || '',
          fromUserAvatar: me.avatar || null,
          targetId: myId,
        });
      }
    }

    return res.status(200).json({ following: !isFollowing });
  } catch (err) {
    console.error("Follow error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
