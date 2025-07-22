const express = require("express");
const router = express.Router();
const db = require("../db/db");

// Get all menu items
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM menu_items");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new menu item
router.post("/", async (req, res) => {
  const {
    name,
    description,
    price,
    ingredients,
    allergens,
    nutrition_facts,
    image_url,
    category,
  } = req.body;
  try {
    await db.query(
      `INSERT INTO menu_items (name, description, price, ingredients, allergens, nutrition_facts, image_url, category) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description,
        price,
        JSON.stringify(ingredients),
        JSON.stringify(allergens),
        JSON.stringify(nutrition_facts),
        image_url,
        category,
      ]
    );
    res.status(201).json({ message: "Menu item created" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
