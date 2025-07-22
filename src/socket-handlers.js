// socket-handlers.js
// Place this file in the root directory alongside server.js

const jwt = require("jsonwebtoken");

// Socket authentication middleware
const authenticateSocket = (socket, next) => {
  const token =
    socket.handshake.auth.token ||
    socket.handshake.headers.authorization?.split(" ")[1];

  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-here"
    );
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    socket.userEmail = decoded.email;
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
};

// Initialize socket handlers
const initializeSocketHandlers = (io, orders) => {
  // Socket authentication
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    console.log(`🔌 User ${socket.userEmail} connected (${socket.id})`);

    // Join user-specific room for order updates
    socket.join(`user:${socket.userId}`);

    // Join admin room if user is admin
    if (socket.userRole === "admin") {
      socket.join("admin");
      console.log(`👨‍💼 Admin ${socket.userEmail} joined admin room`);
    }

    // Send connection confirmation
    socket.emit("connected", {
      message: "Connected to real-time tracking",
      userId: socket.userId,
      role: socket.userRole,
    });

    // Customer: Join order tracking room
    socket.on("track_order", (data) => {
      const { orderId } = data;

      // Verify user owns this order or is admin
      const order = orders.find(
        (o) =>
          o.id === parseInt(orderId) &&
          (o.userId === socket.userId || socket.userRole === "admin")
      );

      if (!order) {
        socket.emit("error", { message: "Order not found or access denied" });
        return;
      }

      // Join order-specific room
      socket.join(`order:${orderId}`);

      // Send current order status
      socket.emit("order_status", {
        orderId: order.id,
        status: order.status,
        estimatedDelivery: order.estimatedDelivery,
        items: order.items,
        total: order.total,
        lastUpdated: order.updatedAt || order.createdAt,
      });

      console.log(`📱 User ${socket.userEmail} tracking order ${orderId}`);
    });

    // Customer: Stop tracking order
    socket.on("stop_tracking", (data) => {
      const { orderId } = data;
      socket.leave(`order:${orderId}`);
      console.log(
        `📱 User ${socket.userEmail} stopped tracking order ${orderId}`
      );
    });

    // Admin: Update order status
    socket.on("update_order_status", (data) => {
      if (socket.userRole !== "admin") {
        socket.emit("error", { message: "Admin access required" });
        return;
      }

      const { orderId, status, estimatedDelivery, notes } = data;

      // Find and update order
      const orderIndex = orders.findIndex((o) => o.id === parseInt(orderId));
      if (orderIndex === -1) {
        socket.emit("error", { message: "Order not found" });
        return;
      }

      const order = orders[orderIndex];
      const oldStatus = order.status;

      // Update order
      orders[orderIndex] = {
        ...order,
        status,
        estimatedDelivery: estimatedDelivery || order.estimatedDelivery,
        updatedAt: new Date().toISOString(),
        statusHistory: [
          ...(order.statusHistory || []),
          {
            status,
            timestamp: new Date().toISOString(),
            updatedBy: socket.userEmail,
            notes,
          },
        ],
      };

      const updatedOrder = orders[orderIndex];

      // Broadcast to order tracking room
      io.to(`order:${orderId}`).emit("order_status_updated", {
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        previousStatus: oldStatus,
        estimatedDelivery: updatedOrder.estimatedDelivery,
        lastUpdated: updatedOrder.updatedAt,
        notes,
        updatedBy: socket.userEmail,
      });

      // Send notification to customer
      io.to(`user:${updatedOrder.userId}`).emit("order_notification", {
        type: "status_update",
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        message: getStatusMessage(updatedOrder.status),
        timestamp: new Date().toISOString(),
      });

      // Broadcast to all admins
      io.to("admin").emit("admin_order_updated", {
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        updatedBy: socket.userEmail,
        timestamp: updatedOrder.updatedAt,
      });

      console.log(
        `📊 Admin ${socket.userEmail} updated order ${orderId} to ${status}`
      );
    });

    // Admin: Get live order statistics
    socket.on("get_live_stats", () => {
      if (socket.userRole !== "admin") {
        socket.emit("error", { message: "Admin access required" });
        return;
      }

      const today = new Date().toDateString();
      const stats = {
        totalOrders: orders.length,
        todayOrders: orders.filter(
          (o) => new Date(o.createdAt).toDateString() === today
        ).length,
        pendingOrders: orders.filter((o) => o.status === "pending").length,
        preparingOrders: orders.filter((o) => o.status === "preparing").length,
        readyOrders: orders.filter((o) => o.status === "ready").length,
        outForDeliveryOrders: orders.filter(
          (o) => o.status === "out_for_delivery"
        ).length,
        revenue: orders
          .filter((o) => o.status === "delivered")
          .reduce((sum, o) => sum + o.total, 0),
        averageOrderValue:
          orders.length > 0
            ? (
                orders.reduce((sum, o) => sum + o.total, 0) / orders.length
              ).toFixed(2)
            : 0,
      };

      socket.emit("live_stats", stats);
    });

    // Customer: Get order updates
    socket.on("get_my_orders", () => {
      const userOrders = orders
        .filter((o) => o.userId === socket.userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10); // Last 10 orders

      socket.emit("my_orders", userOrders);
    });

    // Handle delivery location updates (for delivery tracking)
    socket.on("update_delivery_location", (data) => {
      if (socket.userRole !== "admin") {
        socket.emit("error", { message: "Admin access required" });
        return;
      }

      const { orderId, latitude, longitude, address } = data;

      // Broadcast location update to order tracking room
      io.to(`order:${orderId}`).emit("delivery_location_updated", {
        orderId,
        location: {
          latitude,
          longitude,
          address,
          timestamp: new Date().toISOString(),
        },
      });

      console.log(`🚚 Delivery location updated for order ${orderId}`);
    });

    // Handle estimated time updates
    socket.on("update_estimated_time", (data) => {
      if (socket.userRole !== "admin") {
        socket.emit("error", { message: "Admin access required" });
        return;
      }

      const { orderId, estimatedDelivery } = data;

      // Update order
      const orderIndex = orders.findIndex((o) => o.id === parseInt(orderId));
      if (orderIndex !== -1) {
        orders[orderIndex].estimatedDelivery = estimatedDelivery;

        // Broadcast to order tracking room
        io.to(`order:${orderId}`).emit("estimated_time_updated", {
          orderId,
          estimatedDelivery,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Handle disconnect
    socket.on("disconnect", (reason) => {
      console.log(`🔌 User ${socket.userEmail} disconnected: ${reason}`);
    });

    // Handle connection errors
    socket.on("error", (error) => {
      console.error(`❌ Socket error for user ${socket.userEmail}:`, error);
    });
  });

  // Broadcast system-wide notifications
  const broadcastSystemNotification = (message, type = "info") => {
    io.emit("system_notification", {
      type,
      message,
      timestamp: new Date().toISOString(),
    });
  };

  // Broadcast new order notifications to admins
  const notifyNewOrder = (order) => {
    io.to("admin").emit("new_order", {
      orderId: order.id,
      customerName: order.customerInfo?.name || "Anonymous",
      total: order.total,
      items: order.items.length,
      timestamp: order.createdAt,
      orderType: order.orderType || "delivery",
    });

    // Update live stats for all connected admins
    updateLiveStatsForAdmins(io, orders);
  };

  // Update live stats for all admins
  const updateLiveStatsForAdmins = (io, orders) => {
    const today = new Date().toDateString();
    const stats = {
      totalOrders: orders.length,
      todayOrders: orders.filter(
        (o) => new Date(o.createdAt).toDateString() === today
      ).length,
      pendingOrders: orders.filter((o) => o.status === "pending").length,
      preparingOrders: orders.filter((o) => o.status === "preparing").length,
      readyOrders: orders.filter((o) => o.status === "ready").length,
      revenue: orders
        .filter((o) => o.status === "delivered")
        .reduce((sum, o) => sum + o.total, 0),
    };

    io.to("admin").emit("live_stats_update", stats);
  };

  return {
    broadcastSystemNotification,
    notifyNewOrder,
    updateLiveStatsForAdmins,
  };
};

// Helper function to get user-friendly status messages
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

module.exports = {
  initializeSocketHandlers,
  authenticateSocket,
  getStatusMessage,
};
