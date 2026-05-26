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
        coverPhoto: user.coverPhoto || null,
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
    const { userName, bio, avatar, coverPhoto } = req.body;
    const db = await connectToDatabase();
    const users = db.collection("users");

    const updateFields = { updatedAt: new Date() };
    if (userName)                 updateFields.userName    = userName;
    if (bio !== undefined)        updateFields.bio         = bio;
    if (avatar !== undefined)     updateFields.avatar      = avatar;
    if (coverPhoto !== undefined) updateFields.coverPhoto  = coverPhoto;

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
        coverPhoto: updated.coverPhoto || null,
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

// ── Saved Posts ───────────────────────────────────────────────────────────────

// POST /api/profile/saved/:postId — toggle save
router.post("/saved/:postId", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const users = db.collection("users");
    const postId = req.params.postId;

    const me = await users.findOne({ _id: new ObjectId(req.user.userId) });
    const saved = me.savedPosts || [];
    const isSaved = saved.includes(postId);

    await users.updateOne(
      { _id: new ObjectId(req.user.userId) },
      isSaved ? { $pull: { savedPosts: postId } } : { $push: { savedPosts: postId } }
    );

    return res.status(200).json({ saved: !isSaved });
  } catch (err) {
    console.error("Save post error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// GET /api/profile/saved — get all saved posts
router.get("/saved", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const me = await db.collection("users").findOne({ _id: new ObjectId(req.user.userId) });
    const savedIds = (me.savedPosts || []).map((id) => {
      try { return new ObjectId(id); } catch { return null; }
    }).filter(Boolean);

    if (savedIds.length === 0) return res.status(200).json({ posts: [] });

    const posts = await db.collection("posts")
      .find({ _id: { $in: savedIds } })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      posts: posts.map((p) => ({ ...p, _id: p._id.toString() })),
    });
  } catch (err) {
    console.error("Get saved posts error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ── My Links ──────────────────────────────────────────────────────────────────

// GET /api/profile/links
router.get("/links", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const links = await db.collection("userLinks")
      .find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .toArray();
    return res.status(200).json({ links: links.map((l) => ({ ...l, _id: l._id.toString() })) });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
});

// POST /api/profile/links
router.post("/links", async (req, res) => {
  try {
    const { title, url } = req.body;
    if (!title || !url) return res.status(400).json({ message: "title and url are required." });

    try { new URL(url); } catch { return res.status(400).json({ message: "Invalid URL." }); }

    const db = await connectToDatabase();
    const result = await db.collection("userLinks").insertOne({
      userId: req.user.userId,
      title: title.trim(),
      url: url.trim(),
      createdAt: new Date(),
    });
    return res.status(201).json({ link: { _id: result.insertedId.toString(), userId: req.user.userId, title, url } });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
});

// DELETE /api/profile/links/:id
router.delete("/links/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const link = await db.collection("userLinks").findOne({ _id: new ObjectId(req.params.id) });
    if (!link) return res.status(404).json({ message: "Link not found." });
    if (link.userId !== req.user.userId) return res.status(403).json({ message: "Not authorized." });
    await db.collection("userLinks").deleteOne({ _id: new ObjectId(req.params.id) });
    return res.status(200).json({ message: "Deleted." });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
});

// ── My Files ──────────────────────────────────────────────────────────────────

// GET /api/profile/files
router.get("/files", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const files = await db.collection("userFiles")
      .find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .toArray();
    return res.status(200).json({ files: files.map((f) => ({ ...f, _id: f._id.toString() })) });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
});

// POST /api/profile/files
router.post("/files", async (req, res) => {
  try {
    const { name, url, size, mimeType } = req.body;
    if (!name || !url) return res.status(400).json({ message: "name and url are required." });

    const db = await connectToDatabase();
    const result = await db.collection("userFiles").insertOne({
      userId: req.user.userId,
      name: name.trim(),
      url,
      size: size || 0,
      mimeType: mimeType || 'application/octet-stream',
      createdAt: new Date(),
    });
    return res.status(201).json({
      file: { _id: result.insertedId.toString(), userId: req.user.userId, name, url, size, mimeType },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
});

// DELETE /api/profile/files/:id
router.delete("/files/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const file = await db.collection("userFiles").findOne({ _id: new ObjectId(req.params.id) });
    if (!file) return res.status(404).json({ message: "File not found." });
    if (file.userId !== req.user.userId) return res.status(403).json({ message: "Not authorized." });
    await db.collection("userFiles").deleteOne({ _id: new ObjectId(req.params.id) });
    return res.status(200).json({ message: "Deleted." });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
});

// ── User posts — MUST be last because /:id matches everything above ───────────
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
