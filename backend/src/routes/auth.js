const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { connectToDatabase } = require("../db");

const router = express.Router();

// POST /api/register
router.post("/register", async (req, res) => {
  try {
    const { userName, Email, Password } = req.body;

    if (!userName || !Email || !Password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (Password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const db = await connectToDatabase();
    const users = db.collection("users");

    const existing = await users.findOne({ Email });
    if (existing) {
      return res.status(409).json({ message: "Email already in use." });
    }

    const hashedPassword = await bcrypt.hash(Password, 10);
    await users.insertOne({
      userName,
      Email,
      Password: hashedPassword,
      avatar: null,
      bio: "",
      followersCount: 0,
      followingCount: 0,
      createdAt: new Date(),
    });

    return res.status(201).json({ message: "Account created successfully." });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// POST /api/login
router.post("/login", async (req, res) => {
  try {
    const { Email, Password } = req.body;

    if (!Email || !Password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const db = await connectToDatabase();
    const users = db.collection("users");

    const user = await users.findOne({ Email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isValid = await bcrypt.compare(Password, user.Password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.Email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      token,
      user: {
        _id: user._id.toString(),
        userName: user.userName,
        email: user.Email,
        avatar: user.avatar || null,
        bio: user.bio || "",
        followersCount: user.followersCount || 0,
        followingCount: user.followingCount || 0,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
