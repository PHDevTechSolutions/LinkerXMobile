const express = require("express");
const { connectToDatabase } = require("../db");
const { ObjectId } = require("mongodb");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// GET /api/stories — get all active stories (last 24h)
router.get("/", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    const stories = await db.collection("stories")
      .find({ createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .toArray();

    // Group by user
    const grouped = {};
    for (const story of stories) {
      const uid = story.author._id;
      if (!grouped[uid]) {
        grouped[uid] = {
          author: story.author,
          stories: [],
          hasUnviewed: false,
        };
      }
      const viewed = story.views?.includes(req.user.userId) || false;
      if (!viewed) grouped[uid].hasUnviewed = true;
      grouped[uid].stories.push({ ...story, _id: story._id.toString(), viewed });
    }

    return res.status(200).json({ storyGroups: Object.values(grouped) });
  } catch (err) {
    console.error("Get stories error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST /api/stories — create story
router.post("/", async (req, res) => {
  try {
    const { mediaUrl, text, backgroundColor = "#7C3AED" } = req.body;
    if (!mediaUrl && !text) return res.status(400).json({ message: "mediaUrl or text is required." });

    const db = await connectToDatabase();
    const author = await db.collection("users").findOne({ _id: new ObjectId(req.user.userId) });

    const story = {
      mediaUrl: mediaUrl || null,
      text: text || null,
      backgroundColor,
      author: {
        _id: author._id.toString(),
        userName: author.userName,
        avatar: author.avatar || null,
      },
      views: [],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    const result = await db.collection("stories").insertOne(story);
    return res.status(201).json({ story: { ...story, _id: result.insertedId.toString() } });
  } catch (err) {
    console.error("Create story error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST /api/stories/:id/view
router.post("/:id/view", async (req, res) => {
  try {
    const db = await connectToDatabase();
    await db.collection("stories").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $addToSet: { views: req.user.userId } }
    );
    return res.status(200).json({ message: "Viewed." });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
});

// DELETE /api/stories/:id
router.delete("/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const story = await db.collection("stories").findOne({ _id: new ObjectId(req.params.id) });
    if (!story) return res.status(404).json({ message: "Story not found." });
    if (story.author._id !== req.user.userId) return res.status(403).json({ message: "Not authorized." });
    await db.collection("stories").deleteOne({ _id: new ObjectId(req.params.id) });
    return res.status(200).json({ message: "Story deleted." });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
