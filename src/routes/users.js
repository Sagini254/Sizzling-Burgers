const express = require("express");
const router = express.Router();
const db = require("../db/db");

// Register
router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const [existing] = await db.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );
    if (existing.length > 0)
      return res.status(409).json({ error: "User already exists" });

    await db.query("INSERT INTO users (username, password) VALUES (?, ?)", [
      username,
      password,
    ]);
    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE username = ? AND password = ?",
      [username, password]
    );
    if (rows.length === 0)
      return res.status(401).json({ error: "Invalid credentials" });

    res.json({ message: "Login successful", user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
