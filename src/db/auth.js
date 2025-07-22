const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../db/connection");

router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, hashed],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "User creation failed" });
      }
      res
        .status(201)
        .json({ message: "User created", userId: result.insertId });
    }
  );
});

module.exports = router;
