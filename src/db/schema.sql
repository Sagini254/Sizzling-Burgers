const db = require("./db/connection");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { initializeSocketHandlers } = require("./socket-handlers");
const NotificationHandlers = require("./notification-handlers");
const emailService = require("./email-service");

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here";

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use(express.static("public"));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      Date.now() +
        "-" +
        Math.round(Math.random() * 1e9) +
        path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// In-memory database (replace with actual database in production)
let users = [
  {
    id: 1,
    email: "admin@sizzlingburgers.com",
    password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password: password
    role: "admin",
    name: "Admin User",
  },
];

let menuItems = [
  {
    id: 1,
    name: "Classic Beef Burger",
    description:
      "Juicy beef patty with lettuce, tomato, onion, and our special sauce",
    price: 12.99,
    category: "burgers",
    image: "/uploads/classic-burger.jpg",
    available: true,
    ingredients: ["beef patty", "lettuce", "tomato", "onion", "special sauce"],
  },
  {
    id: 2,
    name: "Cheese Deluxe",
    description: "Double cheese burger with bacon and crispy onions",
    price: 15.99,
    category: "burgers",
    image: "/uploads/cheese-deluxe.jpg",
    available: true,
    ingredients: ["beef patty", "double cheese", "bacon", "crispy onions"],
  },
  {
    id: 3,
    name: "Spicy Chicken Burger",
    description: "Grilled chicken with spicy mayo and jalapeños",
    price: 13.99,
    category: "burgers",
    image: "/uploads/spicy-chicken.jpg",
    available: true,
    ingredients: ["chicken breast", "spicy mayo", "jalapeños", "lettuce"],
  },
];

let orders = [];
let orderIdCounter = 1;

// Initialize Socket.IO handlers
const socketHandlers = initializeSocketHandlers(io, orders);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// Routes

// Auth Routes
app.post("/api/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if user exists
    const existingUser = users.find((u) => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = {
      id: users.length + 1,
      email,
      password: hashedPassword,
      name,
      role: "customer",
    };

    users.push(newUser);

    // Generate JWT
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user
    const user = users.find((u) => u.email === email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Menu Routes
app.get("/api/menu", (req, res) => {
  const { category } = req.query;
  let items = menuItems.filter((item) => item.available);

  if (category) {
    items = items.filter((item) => item.category === category);
  }

  res.json(items);
});

app.get("/api/menu/:id", (req, res) => {
  const item = menuItems.find((item) => item.id === parseInt(req.params.id));
  if (!item) {
    return res.status(404).json({ error: "Menu item not found" });
  }
  res.json(item);
});

// Admin Menu Routes
app.post(
  "/api/admin/menu",
  authenticateToken,
  requireAdmin,
  upload.single("image"),
  (req, res) => {
    try {
      const { name, description, price, category, ingredients } = req.body;

      const newItem = {
        id: Math.max(...menuItems.map((item) => item.id), 0) + 1,
        name,
        description,
        price: parseFloat(price),
        category,
        image: req.file ? /uploads/${req.file.filename} : null,
        available: true,
        ingredients: ingredients ? JSON.parse(ingredients) : [],
      };

      menuItems.push(newItem);
      res.status(201).json(newItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to create menu item" });
    }
  }
);

app.put(
  "/api/admin/menu/:id",
  authenticateToken,
  requireAdmin,
  upload.single("image"),
  (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const itemIndex = menuItems.findIndex((item) => item.id === itemId);

      if (itemIndex === -1) {
        return res.status(404).json({ error: "Menu item not found" });
      }

      const { name, description, price, category, ingredients, available } =
        req.body;

      menuItems[itemIndex] = {
        ...menuItems[itemIndex],
        name: name || menuItems[itemIndex].name,
        description: description || menuItems[itemIndex].description,
        price: price ? parseFloat(price) : menuItems[itemIndex].price,
        category: category || menuItems[itemIndex].category,
        image: req.file
          ? /uploads/${req.file.filename}
          : menuItems[itemIndex].image,
        available:
          available !== undefined
            ? available === "true"
            : menuItems[itemIndex].available,
        ingredients: ingredients
          ? JSON.parse(ingredients)
          : menuItems[itemIndex].ingredients,
      };

      res.json(menuItems[itemIndex]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update menu item" });
    }
  }
);

app.delete(
  "/api/admin/menu/:id",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const itemId = parseInt(req.params.id);
    const itemIndex = menuItems.findIndex((item) => item.id === itemId);

    if (itemIndex === -1) {
      return res.status(404).json({ error: "Menu item not found" });
    }

    menuItems.splice(itemIndex, 1);
    res.json({ message: "Menu item deleted successfully" });
  }
);

// Order Routes
app.post("/api/orders", authenticateToken, (req, res) => {
  try {
    const { items, customerInfo, deliveryAddress, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Order items are required" });
    }

    // Calculate total
    let total = 0;
    const orderItems = items.map((item) => {
      const menuItem = menuItems.find((mi) => mi.id === item.id);
      if (!menuItem) {
        throw new Error(Menu item with id ${item.id} not found);
      }
      const itemTotal = menuItem.price * item.quantity;
      total += itemTotal;

      return {
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
        total: itemTotal,
        customizations: item.customizations || [],
      };
    });

    const newOrder = {
      id: orderIdCounter++,
      userId: req.user.id,
      items: orderItems,
      total: total,
      customerInfo: customerInfo || {},
      deliveryAddress: deliveryAddress || {},
      paymentMethod: paymentMethod || "cash",
      status: "pending",
      createdAt: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
    };

    orders.push(newOrder);

    // Notify admins of new order via WebSocket
    socketHandlers.notifyNewOrder(newOrder);

    res.status(201).json(newOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/orders", authenticateToken, (req, res) => {
  const userOrders = orders.filter((order) => order.userId === req.user.id);
  res.json(userOrders);
});

app.get("/api/orders/:id", authenticateToken, (req, res) => {
  const order = orders.find(
    (order) =>
      order.id === parseInt(req.params.id) && order.userId === req.user.id
  );

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  res.json(order);
});

// Admin Order Routes
app.get("/api/admin/orders", authenticateToken, requireAdmin, (req, res) => {
  const { status, limit } = req.query;
  let filteredOrders = orders;

  if (status) {
    filteredOrders = orders.filter((order) => order.status === status);
  }

  if (limit) {
    filteredOrders = filteredOrders.slice(0, parseInt(limit));
  }

  // Sort by creation date (newest first)
  filteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(filteredOrders);
});

app.put(
  "/api/admin/orders/:id/status",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;

    const validStatuses = [
      "pending",
      "confirmed",
      "preparing",
      "ready",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const orderIndex = orders.findIndex((order) => order.id === orderId);
    if (orderIndex === -1) {
      return res.status(404).json({ error: "Order not found" });
    }

    orders[orderIndex].status = status;
    orders[orderIndex].updatedAt = new Date().toISOString();

    // Broadcast status update via WebSocket
    io.to(order:${orderId}).emit("order_status_updated", {
      orderId: orders[orderIndex].id,
      status: orders[orderIndex].status,
      estimatedDelivery: orders[orderIndex].estimatedDelivery,
      lastUpdated: orders[orderIndex].updatedAt,
    });

    // Send notification to customer
    io.to(user:${orders[orderIndex].userId}).emit("order_notification", {
      type: "status_update",
      orderId: orders[orderIndex].id,
      status: orders[orderIndex].status,
      message: getStatusMessage(orders[orderIndex].status),
      timestamp: new Date().toISOString(),
    });

    res.json(orders[orderIndex]);
  }
);

// Analytics Routes (Admin only)
app.get("/api/admin/analytics", authenticateToken, requireAdmin, (req, res) => {
  const today = new Date();
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Daily orders
  const todayOrders = orders.filter(
    (order) => new Date(order.createdAt).toDateString() === today.toDateString()
  );

  // Weekly orders
  const weeklyOrders = orders.filter(
    (order) => new Date(order.createdAt) >= lastWeek
  );

  // Monthly revenue
  const monthlyRevenue = orders
    .filter((order) => new Date(order.createdAt) >= lastMonth)
    .reduce((sum, order) => sum + order.total, 0);

  // Popular items
  const itemCounts = {};
  orders.forEach((order) => {
    order.items.forEach((item) => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
    });
  });

  const popularItems = Object.entries(itemCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  res.json({
    todayOrders: todayOrders.length,
    weeklyOrders: weeklyOrders.length,
    monthlyRevenue: monthlyRevenue.toFixed(2),
    totalOrders: orders.length,
    totalUsers: users.length,
    popularItems,
  });
});

// Search Route
app.get("/api/search", (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: "Search query is required" });
  }

  const results = menuItems.filter(
    (item) =>
      item.available &&
      (item.name.toLowerCase().includes(q.toLowerCase()) ||
        item.description.toLowerCase().includes(q.toLowerCase()) ||
        item.category.toLowerCase().includes(q.toLowerCase()) ||
        item.ingredients.some((ingredient) =>
          ingredient.toLowerCase().includes(q.toLowerCase())
        ))
  );

  res.json(results);
});

// Test email service connection on server start
emailService.testConnection().then((result) => {
  if (result.success) {
    console.log("✅ Email service connected successfully");
  } else {
    console.error("❌ Email service connection failed:", result.error);
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File size too large" });
    }
  }
  res.status(500).json({ error: error.message });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

server.listen(PORT, () => {
  console.log(🍔 Sizzling Burgers API running on http://localhost:${PORT});
  console.log("🔌 WebSocket server ready for real-time tracking");
  console.log("📚 Available endpoints:");
  console.log("  POST /api/register - User registration");
  console.log("  POST /api/login - User login");
  console.log("  GET  /api/menu - Get menu items");
  console.log("  POST /api/orders - Place an order");
  console.log("  GET  /api/orders - Get user orders");
  console.log("  GET  /api/search - Search menu items");
  console.log("  📊 Admin endpoints available at /api/admin/*");
  console.log("  🔌 Real-time tracking via Socket.IO");
});

// Helper function for status messages
const getStatusMessage = (status) => {
  const messages = {
    pending: "Your order has been received and is being reviewed.",
    confirmed: "Your order has been confirmed and will be prepared soon.",
    preparing: "Your delicious meal is being prepared with care.",
    ready: "Your order is ready! We'll start delivery shortly.",
    out_for_delivery:
      "Your order is on the way! Estimated delivery in 15-20 minutes.",
    delivered: "Your order has been delivered. Enjoy your meal!",
    cancelled:
      "Your order has been cancelled. If you have questions, please contact us.",
  };

  return messages[status] || "Order status updated.";
};