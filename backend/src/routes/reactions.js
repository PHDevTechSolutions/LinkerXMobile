const express = require("express");
const { connectToDatabase } = require("../db");
const { ObjectId } = require("mongodb");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

const VALID_REACTIONS = ["like", "love", "haha", "wow", "sad", "angry"];

// POST /api/reactions — react to a post or comment
router.post("/", async (req, res) => {
  try {
    const { targetId, targetType = "post", reaction } = req.body;
    if (!targetId || !reaction) return res.status(400).json({ message: "targetId and reaction are required." });
    if (!VALID_REACTIONS.includes(reaction)) return res.status(400).json({ message: "Invalid reaction." });

    const db = await connectToDatabase();
    const reactions = db.collection("reactions");

    // Check if already reacted
    const existing = await reactions.findOne({
      targetId,
      userId: req.user.userId,
    });

    if (existing) {
      if (existing.reaction === reaction) {
        // Same reaction — remove it (toggle off)
        await reactions.deleteOne({ _id: existing._id });
        return res.status(200).json({ action: "removed", reaction });
      } else {
        // Different reaction — update it
        await reactions.updateOne({ _id: existing._id }, { $set: { reaction, updatedAt: new Date() } });
        return res.status(200).json({ action: "updated", reaction });
      }
    }

    // New reaction
    await reactions.insertOne({
      targetId,
      targetType,
      userId: req.user.userId,
      reaction,
      createdAt: new Date(),
    });

    return res.status(201).json({ action: "added", reaction });
  } catch (err) {
    console.error("React error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// GET /api/reactions/:targetId — get all reactions for a post/comment
router.get("/:targetId", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const reactions = await db.collection("reactions")
      .find({ targetId: req.params.targetId })
      .toArray();

    // Group by reaction type
    const grouped = {};
    for (const r of reactions) {
      if (!grouped[r.reaction]) grouped[r.reaction] = [];
      grouped[r.reaction].push(r.userId);
    }

    const myReaction = reactions.find((r) => r.userId === req.user.userId)?.reaction || null;

    return res.status(200).json({ reactions: grouped, myReaction, total: reactions.length });
  } catch (err) {
    console.error("Get reactions error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
