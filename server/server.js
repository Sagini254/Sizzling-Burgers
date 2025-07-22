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

const getDB = require("./db/connection"); // updated DB
const { initializeSocketHandlers } = require("../src/socket-handlers");
const NotificationHandlers = require("./notification-handlers");
const emailService = require("./email-service");

// Route handlers
const orderRoutes = require("./routes/order"); // ⬅️ Add this for orders API

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

// Multer setup
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
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

// === ROUTES ===
app.use("/api/orders", orderRoutes); // 🛒 Order routes mounted

// === Email Service Routes ===
emailService.testConnection().then((result) => {
  if (result.success) console.log("✅ Email service connected successfully");
  else console.error("❌ Email service connection failed:", result.error);
});

app.post("/api/notifications/test", async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const result = await NotificationHandlers.sendTestEmail({ email, name });
    if (result.success) res.json({ message: "Test email sent successfully" });
    else res.status(500).json({ error: result.error });
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({ error: "Failed to send test email" });
  }
});

app.get("/api/notifications/history", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const result = await NotificationHandlers.getNotificationHistory(limit);
    res.json(result);
  } catch (error) {
    console.error("Get notification history error:", error);
    res.status(500).json({ error: "Failed to fetch notification history" });
  }
});

app.post("/api/notifications/campaign", async (req, res) => {
  try {
    const { title, description, discount, promoCode, validUntil } = req.body;
    const result = await NotificationHandlers.handlePromotionalCampaign({
      title,
      description,
      discount,
      promoCode,
      validUntil,
    });
    res.json(result);
  } catch (error) {
    console.error("Promotional campaign error:", error);
    res.status(500).json({ error: "Failed to send promotional campaign" });
  }
});

app.get("/api/email/settings", async (req, res) => {
  try {
    const connectionResult = await emailService.testConnection();
    res.json({
      connected: connectionResult.success,
      emailUser: process.env.EMAIL_USER,
      adminEmail: process.env.ADMIN_EMAIL,
    });
  } catch (error) {
    console.error("Email settings error:", error);
    res.status(500).json({ error: "Failed to fetch email settings" });
  }
});

app.post("/api/email/webhook", (req, res) => {
  try {
    const { event, email, messageId } = req.body;
    console.log("Email webhook received:", { event, email, messageId });
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Email webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// 404 fallback
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
server.listen(PORT, () => {
  console.log(`🍔 Sizzling Burgers API running on http://localhost:${PORT}`);
  console.log("🔌 WebSocket server ready for real-time tracking");
  console.log("📚 Available endpoints:");
  console.log("  POST /api/register - User registration");
  console.log("  POST /api/login - User login");
  console.log("  GET  /api/menu - Get menu items");
  console.log("  POST /api/orders - Place an order");
  console.log("  GET  /api/orders - Get user orders");
  console.log("  GET  /api/search - Search menu items");
  console.log("  📊 Admin endpoints available at /api/admin/*");
});
