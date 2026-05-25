const express = require("express");
const { connectToDatabase } = require("../db");
const { ObjectId } = require("mongodb");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// GET /api/comments?postId=xxx
router.get("/", async (req, res) => {
  try {
    const { postId } = req.query;
    if (!postId) return res.status(400).json({ message: "postId is required." });

    const db = await connectToDatabase();
    const comments = await db.collection("comments")
      .find({ postId })
      .sort({ createdAt: 1 })
      .toArray();

    return res.status(200).json({
      comments: comments.map((c) => ({ ...c, _id: c._id.toString() })),
    });
  } catch (err) {
    console.error("Get comments error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST /api/comments
router.post("/", async (req, res) => {
  try {
    const { postId, text } = req.body;
    if (!postId || !text) return res.status(400).json({ message: "postId and text are required." });

    const db = await connectToDatabase();
    const users = db.collection("users");
    const author = await users.findOne({ _id: new ObjectId(req.user.userId) });

    const comment = {
      postId,
      text,
      author: {
        _id: author._id.toString(),
        userName: author.userName,
        avatar: author.avatar || null,
      },
      createdAt: new Date(),
    };

    const result = await db.collection("comments").insertOne(comment);

    // Increment commentsCount on post
    await db.collection("posts").updateOne(
      { _id: new ObjectId(postId) },
      { $inc: { commentsCount: 1 } }
    );

    return res.status(201).json({ comment: { ...comment, _id: result.insertedId.toString() } });
  } catch (err) {
    console.error("Add comment error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// DELETE /api/comments/:id
router.delete("/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const comment = await db.collection("comments").findOne({ _id: new ObjectId(req.params.id) });
    if (!comment) return res.status(404).json({ message: "Comment not found." });
    if (comment.author._id !== req.user.userId) return res.status(403).json({ message: "Not authorized." });

    await db.collection("comments").deleteOne({ _id: new ObjectId(req.params.id) });
    await db.collection("posts").updateOne(
      { _id: new ObjectId(comment.postId) },
      { $inc: { commentsCount: -1 } }
    );

    return res.status(200).json({ message: "Comment deleted." });
  } catch (err) {
    console.error("Delete comment error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
