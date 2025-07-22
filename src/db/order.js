const express = require("express");
const router = express.Router();
const db = require("../db/connection");

router.post("/", (req, res) => {
  const { user_id, items, total_price } = req.body;

  db.query(
    "INSERT INTO orders (user_id, items, total_price) VALUES (?, ?, ?)",
    [user_id, JSON.stringify(items), total_price],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Order failed" });
      res
        .status(201)
        .json({ message: "Order placed", orderId: result.insertId });
    }
  );
});

router.get("/", (req, res) => {
  db.query("SELECT * FROM orders", (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch orders" });
    res.json(results);
  });
});

module.exports = router;
