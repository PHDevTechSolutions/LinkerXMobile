const express = require("express");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

const DAILY_API_KEY  = process.env.DAILY_API_KEY;
const DAILY_BASE_URL = "https://api.daily.co/v1";

// POST /api/calls/room
router.post("/room", async (req, res) => {
  try {
    const { roomName } = req.body;
    if (!roomName) return res.status(400).json({ message: "roomName is required." });

    if (!DAILY_API_KEY) {
      console.error("DAILY_API_KEY is not set in environment variables");
      return res.status(500).json({ message: "Video call service not configured. Please set DAILY_API_KEY." });
    }

    // Daily.co only allows alphanumeric and hyphens, max 100 chars
    const safeName = roomName.replace(/[^a-zA-Z0-9-]/g, "-").substring(0, 100);
    console.log(`Creating/fetching Daily room: ${safeName}`);

    // Try to get existing room first
    const getRes = await fetch(`${DAILY_BASE_URL}/rooms/${safeName}`, {
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });

    if (getRes.ok) {
      const room = await getRes.json();
      console.log(`Found existing room: ${room.url}`);
      return res.status(200).json({ url: room.url, name: room.name });
    }

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
        },
      }),
    });

    const createData = await createRes.json();

    if (!createRes.ok) {
      console.error("Daily API error:", JSON.stringify(createData));
      return res.status(500).json({
        message: createData.error || createData.info || "Failed to create call room.",
      });
    }

    console.log(`Created new room: ${createData.url}`);
    return res.status(200).json({ url: createData.url, name: createData.name });

  } catch (err) {
    console.error("Create room error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
