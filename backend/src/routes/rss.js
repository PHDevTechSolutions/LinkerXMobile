const express = require("express");
const { connectToDatabase } = require("../db");
const { ObjectId } = require("mongodb");
const authMiddleware = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchAndParseRSS(feedUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(feedUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "LinkerXRSSBot/1.0", "Accept": "application/rss+xml, application/xml, text/xml, */*" },
    });
    clearTimeout(timeout);
    const xml = await res.text();

    // Extract channel info
    const titleMatch   = xml.match(/<channel[^>]*>[\s\S]*?<title[^>]*><!\[CDATA\[([^\]]+)\]\]><\/title>|<channel[^>]*>[\s\S]*?<title[^>]*>([^<]+)<\/title>/);
    const channelTitle = titleMatch?.[1] || titleMatch?.[2] || new URL(feedUrl).hostname;

    const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(feedUrl).hostname}&sz=64`;

    // Parse items
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    const items = [];
    let match;

    while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
      const item = match[1];

      const getField = (tag) => {
        const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`, "i"));
        return (m?.[1] || m?.[2] || "").trim();
      };

      const title       = getField("title");
      const link        = getField("link") || item.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] || "";
      const description = getField("description").replace(/<[^>]+>/g, "").slice(0, 200);
      const pubDate     = getField("pubDate") || getField("dc:date") || getField("published");
      const imgMatch    = item.match(/<media:thumbnail[^>]+url=["']([^"']+)["']|<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image/i);
      const image       = imgMatch?.[1] || imgMatch?.[2] || null;

      if (title && link) {
        items.push({ title, link, description, pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(), image });
      }
    }

    return { channelTitle, faviconUrl, items };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// GET /api/rss/subscriptions — list user's RSS feeds
router.get("/subscriptions", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const subs = await db.collection("rssSubscriptions")
      .find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .toArray();
    return res.status(200).json({ subscriptions: subs.map((s) => ({ ...s, _id: s._id.toString() })) });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
});

// POST /api/rss/subscribe — add a new RSS feed
router.post("/subscribe", async (req, res) => {
  try {
    const { feedUrl } = req.body;
    if (!feedUrl) return res.status(400).json({ message: "feedUrl is required." });

    try { new URL(feedUrl); } catch { return res.status(400).json({ message: "Invalid URL." }); }

    const db = await connectToDatabase();

    // Check duplicate
    const existing = await db.collection("rssSubscriptions").findOne({ userId: req.user.userId, feedUrl });
    if (existing) return res.status(409).json({ message: "Already subscribed to this feed." });

    // Fetch feed to validate and get title
    let channelTitle = feedUrl;
    let faviconUrl = null;
    try {
      const parsed = await fetchAndParseRSS(feedUrl);
      channelTitle = parsed.channelTitle;
      faviconUrl   = parsed.faviconUrl;
    } catch (_) {}

    const result = await db.collection("rssSubscriptions").insertOne({
      userId: req.user.userId,
      feedUrl,
      title: channelTitle,
      favicon: faviconUrl,
      createdAt: new Date(),
    });

    return res.status(201).json({
      subscription: { _id: result.insertedId.toString(), userId: req.user.userId, feedUrl, title: channelTitle, favicon: faviconUrl },
    });
  } catch (err) {
    console.error("RSS subscribe error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// DELETE /api/rss/subscriptions/:id — unsubscribe
router.delete("/subscriptions/:id", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const sub = await db.collection("rssSubscriptions").findOne({ _id: new ObjectId(req.params.id) });
    if (!sub) return res.status(404).json({ message: "Subscription not found." });
    if (sub.userId !== req.user.userId) return res.status(403).json({ message: "Not authorized." });
    await db.collection("rssSubscriptions").deleteOne({ _id: new ObjectId(req.params.id) });
    return res.status(200).json({ message: "Unsubscribed." });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
});

// GET /api/rss/feed — fetch latest items from all subscribed feeds
router.get("/feed", async (req, res) => {
  try {
    const db = await connectToDatabase();
    const subs = await db.collection("rssSubscriptions")
      .find({ userId: req.user.userId })
      .toArray();

    if (subs.length === 0) return res.status(200).json({ items: [] });

    // Fetch all feeds in parallel (with individual error handling)
    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        const parsed = await fetchAndParseRSS(sub.feedUrl);
        return parsed.items.map((item) => ({
          ...item,
          feedTitle: sub.title,
          feedFavicon: sub.favicon,
          feedUrl: sub.feedUrl,
          subscriptionId: sub._id.toString(),
        }));
      })
    );

    // Flatten, sort by date, limit 50
    const allItems = results
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => r.value)
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 50);

    return res.status(200).json({ items: allItems });
  } catch (err) {
    console.error("RSS feed error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// GET /api/rss/preview?url=... — preview a feed before subscribing
router.get("/preview", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ message: "url is required." });
  try {
    const parsed = await fetchAndParseRSS(url);
    return res.status(200).json({ ...parsed, feedUrl: url });
  } catch (err) {
    return res.status(400).json({ message: "Could not fetch or parse this RSS feed." });
  }
});

module.exports = router;
