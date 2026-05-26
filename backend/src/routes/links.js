const express = require("express");
const { connectToDatabase } = require("../db");
const { ObjectId } = require("mongodb");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// ── Public: fetch OG metadata for link preview (no auth needed) ──────────────
// GET /api/links/preview?url=https://...
router.get("/preview", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ message: "url is required." });

  try {
    new URL(url); // validate
  } catch {
    return res.status(400).json({ message: "Invalid URL." });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "LinkerXBot/1.0 (link preview fetcher)",
        "Accept": "text/html",
      },
    });
    clearTimeout(timeout);

    const html = await response.text();

    // Extract OG / meta tags with regex (no DOM parser needed)
    const getMeta = (property) => {
      const patterns = [
        new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"),
        new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, "i"),
      ];
      for (const p of patterns) {
        const m = html.match(p);
        if (m?.[1]) return m[1].trim();
      }
      return null;
    };

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

    const preview = {
      url,
      title: getMeta("og:title") || getMeta("twitter:title") || titleMatch?.[1]?.trim() || null,
      description: getMeta("og:description") || getMeta("twitter:description") || getMeta("description") || null,
      image: getMeta("og:image") || getMeta("twitter:image") || null,
      siteName: getMeta("og:site_name") || null,
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`,
      hostname: new URL(url).hostname.replace("www.", ""),
    };

    return res.status(200).json({ preview });
  } catch (err) {
    // Return minimal preview on fetch failure
    const hostname = (() => { try { return new URL(url).hostname.replace("www.", ""); } catch { return url; } })();
    return res.status(200).json({
      preview: {
        url,
        title: null,
        description: null,
        image: null,
        siteName: null,
        favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
        hostname,
      },
    });
  }
});

// ── Public: get a user's link-in-bio page ────────────────────────────────────
// GET /api/links/bio/:userName  (no auth)
router.get("/bio/:userName", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const user = await db.collection("users").findOne({
      userName: { $regex: new RegExp(`^${req.params.userName}$`, "i") },
    });
    if (!user) return res.status(404).json({ message: "User not found." });

    const links = await db.collection("userLinks")
      .find({ userId: user._id.toString() })
      .sort({ order: 1, createdAt: -1 })
      .toArray();

    const posts = await db.collection("posts")
      .find({ "author._id": user._id.toString() })
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();

    return res.status(200).json({
      user: {
        _id: user._id.toString(),
        userName: user.userName,
        avatar: user.avatar || null,
        coverPhoto: user.coverPhoto || null,
        bio: user.bio || "",
        followersCount: user.followersCount || 0,
        followingCount: user.followingCount || 0,
      },
      links: links.map((l) => ({ ...l, _id: l._id.toString() })),
      recentPosts: posts.map((p) => ({ ...p, _id: p._id.toString() })),
    });
  } catch (err) {
    console.error("Bio page error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ── Authenticated: update link order ─────────────────────────────────────────
// PUT /api/links/reorder  { ids: ['id1','id2',...] }
router.put("/reorder", authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ message: "ids array required." });
    const db = await connectToDatabase();
    await Promise.all(ids.map((id, index) =>
      db.collection("userLinks").updateOne(
        { _id: new ObjectId(id), userId: req.user.userId },
        { $set: { order: index } }
      )
    ));
    return res.status(200).json({ message: "Reordered." });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
