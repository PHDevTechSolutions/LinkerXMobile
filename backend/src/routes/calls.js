const express = require("express");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

const DAILY_API_KEY  = process.env.DAILY_API_KEY;
const DAILY_BASE_URL = "https://api.daily.co/v1";

// GET /api/calls/ice-servers
// Returns fresh Xirsys ICE server credentials (valid for ~30s each request)
router.get("/ice-servers", async (req, res) => {
  try {
    const ident   = process.env.XIRSYS_IDENT;
    const secret  = process.env.XIRSYS_SECRET;
    const channel = process.env.XIRSYS_CHANNEL;

    if (!ident || !secret || !channel) {
      return res.status(500).json({ message: "Xirsys credentials not configured." });
    }

    const response = await fetch(`https://global.xirsys.net/_turn/${channel}`, {
      method: "PUT",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${ident}:${secret}`).toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ format: "urls" }),
    });

    const data = await response.json();

    if (!response.ok || data.s !== "ok") {
      console.error("Xirsys error:", data);
      return res.status(500).json({ message: "Failed to fetch ICE servers." });
    }

    return res.status(200).json({ iceServers: data.v.iceServers });
  } catch (err) {
    console.error("ICE servers error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST /api/calls/room
router.post("/room", async (req, res) => {
  try {
    const { roomName } = req.body;
    if (!roomName) return res.status(400).json({ message: "roomName is required." });

    if (!DAILY_API_KEY) {
      return res.status(500).json({ message: "DAILY_API_KEY not configured." });
    }

    // Sanitize: Daily only allows alphanumeric and hyphens, max 100 chars
    const safeName = roomName.replace(/[^a-zA-Z0-9-]/g, "-").substring(0, 100);

    // 1. Try to get existing room first
    const getRes = await fetch(`${DAILY_BASE_URL}/rooms/${safeName}`, {
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });

    if (getRes.ok) {
      const room = await getRes.json();
      return res.status(200).json({ url: room.url, name: room.name });
    }

    // 2. Create new room — minimal properties only
    const createRes = await fetch(`${DAILY_BASE_URL}/rooms`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: safeName,
        privacy: "public",
      }),
    });

    const createData = await createRes.json();

    if (!createRes.ok) {
      console.error("Daily API error:", JSON.stringify(createData));
      return res.status(500).json({
        message: createData.info || createData.error || "Failed to create room.",
      });
    }

    return res.status(200).json({ url: createData.url, name: createData.name });

  } catch (err) {
    console.error("Create room error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
