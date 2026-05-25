const express = require("express");
const { connectToDatabase } = require("../db");
const { ObjectId } = require("mongodb");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// POST /api/posts/create
router.post("/create", async (req, res) => {
  try {
    const { type = "text", content, linkUrl } = req.body;

    if (!content && !linkUrl) {
      return res.status(400).json({ message: "Content is required." });
    }

    const db = await connectToDatabase();
    const posts = db.collection("posts");
    const users = db.collection("users");

    const author = await users.findOne({ _id: new ObjectId(req.user.userId) });
    if (!author) return res.status(404).json({ message: "User not found." });

    const newPost = {
      type,
      content: content || "",
      linkUrl: linkUrl || null,
      media: null,
      author: {
        _id: author._id.toString(),
        userName: author.userName,
        avatar: author.avatar || null,
      },
      likes: [],
      commentsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await posts.insertOne(newPost);
    return res.status(201).json({ post: { ...newPost, _id: result.insertedId.toString() } });
  } catch (err) {
    console.error("Create post error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// GET /api/feed/fetch
router.get("/feed", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const posts = db.collection("posts");

    const allPosts = await posts
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    const formatted = allPosts.map((p) => ({
      ...p,
      _id: p._id.toString(),
    }));

    return res.status(200).json({ posts: formatted });
  } catch (err) {
    console.error("Fetch feed error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST /api/posts/like
router.post("/like", async (req, res) => {
  try {
    const { postId } = req.body;
    if (!postId) return res.status(400).json({ message: "postId is required." });

    const db = await connectToDatabase();
    const posts = db.collection("posts");

    const post = await posts.findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).json({ message: "Post not found." });

    const userId = req.user.userId;
    const alreadyLiked = post.likes.includes(userId);

    await posts.updateOne(
      { _id: new ObjectId(postId) },
      alreadyLiked
        ? { $pull: { likes: userId } }
        : { $push: { likes: userId } }
    );

    return res.status(200).json({ liked: !alreadyLiked });
  } catch (err) {
    console.error("Like error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// PUT /api/posts/:id
router.put("/:id", async (req, res) => {
  try {
    const { content, linkUrl } = req.body;
    const db = await connectToDatabase();
    const posts = db.collection("posts");

    const post = await posts.findOne({ _id: new ObjectId(req.params.id) });
    if (!post) return res.status(404).json({ message: "Post not found." });

    if (post.author._id !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized." });
    }

    await posts.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { content, linkUrl: linkUrl || null, updatedAt: new Date() } }
    );

    return res.status(200).json({ message: "Post updated." });
  } catch (err) {
    console.error("Update post error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// DELETE /api/posts/:id
router.delete("/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const posts = db.collection("posts");

    const post = await posts.findOne({ _id: new ObjectId(req.params.id) });
    if (!post) return res.status(404).json({ message: "Post not found." });

    if (post.author._id !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized." });
    }

    await posts.deleteOne({ _id: new ObjectId(req.params.id) });
    return res.status(200).json({ message: "Post deleted." });
  } catch (err) {
    console.error("Delete post error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
