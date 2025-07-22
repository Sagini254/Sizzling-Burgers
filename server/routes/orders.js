const express = require("express");
const router = express.Router();
const db = require("../db/db");

// ✅ Place an Order
router.post("/", async (req, res) => {
  const { user_id, items, total_price, customer } = req.body;

  if (!user_id || !items || !total_price || !customer) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    await db.query(
      `INSERT INTO orders (user_id, items, total_price, customer_name, customer_phone, customer_address) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        JSON.stringify(items),
        total_price,
        customer.name,
        customer.phone,
        customer.address,
      ]
    );
    res.status(201).json({ message: "✅ Order placed successfully" });
  } catch (err) {
    console.error("❌ Order placement failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get All Orders by User ID
router.get("/user/:userId", async (req, res) => {
  try {
    const [orders] = await db.query("SELECT * FROM orders WHERE user_id = ?", [
      req.params.userId,
    ]);
    res.json(orders);
  } catch (err) {
    console.error("❌ Failed to fetch orders:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
