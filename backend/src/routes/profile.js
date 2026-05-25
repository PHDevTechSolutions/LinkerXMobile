const express = require("express");
const { connectToDatabase } = require("../db");
const { ObjectId } = require("mongodb");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

// GET /api/profile/me
router.get("/me", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const users = db.collection("users");

    const user = await users.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) return res.status(404).json({ message: "User not found." });

    return res.status(200).json({
      user: {
        _id: user._id.toString(),
        userName: user.userName,
        email: user.Email,
        avatar: user.avatar || null,
        bio: user.bio || "",
        followersCount: user.followersCount || 0,
        followingCount: user.followingCount || 0,
      },
    });
  } catch (err) {
    console.error("Get profile error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// PUT /api/profile/update
router.put("/update", async (req, res) => {
  try {
    const { userName, bio, avatar } = req.body;
    const db = await connectToDatabase();
    const users = db.collection("users");

    const updateFields = { updatedAt: new Date() };
    if (userName) updateFields.userName = userName;
    if (bio !== undefined) updateFields.bio = bio;
    if (avatar !== undefined) updateFields.avatar = avatar;

    await users.updateOne(
      { _id: new ObjectId(req.user.userId) },
      { $set: updateFields }
    );

    const updated = await users.findOne({ _id: new ObjectId(req.user.userId) });

    return res.status(200).json({
      user: {
        _id: updated._id.toString(),
        userName: updated.userName,
        email: updated.Email,
        avatar: updated.avatar || null,
        bio: updated.bio || "",
        followersCount: updated.followersCount || 0,
        followingCount: updated.followingCount || 0,
      },
    });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// GET /api/profile/:id/posts
router.get("/:id/posts", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const posts = db.collection("posts");

    const userPosts = await posts
      .find({ "author._id": req.params.id })
      .sort({ createdAt: -1 })
      .toArray();

    const formatted = userPosts.map((p) => ({ ...p, _id: p._id.toString() }));
    return res.status(200).json({ posts: formatted });
  } catch (err) {
    console.error("Get user posts error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
