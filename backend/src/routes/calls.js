const express = require("express");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

const DAILY_API_KEY  = process.env.DAILY_API_KEY;
const DAILY_DOMAIN   = process.env.DAILY_DOMAIN || "voice-call";
const DAILY_BASE_URL = "https://api.daily.co/v1";

// POST /api/calls/room — create or get a Daily.co room
router.post("/room", async (req, res) => {
  try {
    const { roomName } = req.body;
    if (!roomName) return res.status(400).json({ message: "roomName is required." });

    if (!DAILY_API_KEY) {
      return res.status(500).json({ message: "Daily.co API key not configured." });
    }

    // Sanitize room name — Daily only allows alphanumeric and hyphens, max 100 chars
    const safeName = roomName.replace(/[^a-zA-Z0-9-]/g, "-").substring(0, 100);

    // Try to get existing room
    const getRes = await fetch(`${DAILY_BASE_URL}/rooms/${safeName}`, {
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });

    let room;
    if (getRes.ok) {
      room = await getRes.json();
    } else {
      // Create new room
      const createRes = await fetch(`${DAILY_BASE_URL}/rooms`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: safeName,
          privacy: "public",
          properties: {
            exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours
            enable_chat: true,
            enable_screenshare: true,
            enable_knocking: false,
            max_participants: 50,
            start_video_off: false,
            start_audio_off: false,
          },
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        console.error("Daily create room error:", err);
        return res.status(500).json({ message: err.error || "Failed to create room." });
      }

      room = await createRes.json();
    }

    return res.status(200).json({
      url: room.url,
      name: room.name,
    });
  } catch (err) {
    console.error("Create room error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
