const express = require("express");
const router = express.Router();
const db = require("../db/connection");

// Get all menu items
router.get("/", (req, res) => {
  db.query("SELECT * FROM menu_items", (err, results) => {
    if (err)
      return res.status(500).json({ error: "Failed to fetch menu items" });
    res.json(results);
  });
});

// Add a menu item
router.post("/", (req, res) => {
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

  db.query(
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
    ],
    (err, result) => {
      if (err)
        return res.status(500).json({ error: "Failed to add menu item" });
      res.status(201).json({ message: "Menu item added", id: result.insertId });
    }
  );
});

module.exports = router;
