const emailService = require("./email-service");
const db = require("./db");

class NotificationHandlers {
  // Handle new order notifications
  static async handleNewOrder(orderData, io) {
    try {
      console.log("Processing new order notifications...");

      // Send confirmation email to customer
      const confirmationResult = await emailService.sendOrderConfirmation({
        customerEmail: orderData.customerEmail,
        customerName: orderData.customerName,
        orderId: orderData.orderId,
        items: orderData.items,
        totalAmount: orderData.totalAmount,
        estimatedTime: orderData.estimatedTime || 20,
      });

      // Send notification email to admin
      const adminResult = await emailService.sendAdminNotification({
        orderId: orderData.orderId,
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail,
        items: orderData.items,
        totalAmount: orderData.totalAmount,
        orderTime: new Date().toLocaleString(),
      });

      // Emit real-time notification to admin dashboard
      io.emit("newOrderAlert", {
        orderId: orderData.orderId,
        customerName: orderData.customerName,
        totalAmount: orderData.totalAmount,
        timestamp: new Date().toISOString(),
      });

      // Store notification in database
      await this.storeNotification({
        type: "new_order",
        orderId: orderData.orderId,
        message: `New order #${orderData.orderId} received from ${orderData.customerName}`,
        status: "sent",
        emailResult: confirmationResult,
      });

      return {
        success: true,
        customerEmailSent: confirmationResult.success,
        adminEmailSent: adminResult.success,
      };
    } catch (error) {
      console.error("Error handling new order notifications:", error);
      return { success: false, error: error.message };
    }
  }

  // Handle order status updates
  static async handleStatusUpdate(orderData, io) {
    try {
      console.log(
        `Processing status update for order #${orderData.orderId}...`
      );

      // Get customer details from database
      const customerQuery = `
        SELECT customer_name, customer_email 
        FROM orders 
        WHERE order_id = ?
      `;
      const [customerResult] = await db.query(customerQuery, [
        orderData.orderId,
      ]);

      if (customerResult.length === 0) {
        throw new Error("Order not found");
      }

      const customer = customerResult[0];

      // Send status update email to customer
      const updateResult = await emailService.sendOrderStatusUpdate({
        customerEmail: customer.customer_email,
        customerName: customer.customer_name,
        orderId: orderData.orderId,
        status: orderData.status,
        estimatedTime: orderData.estimatedTime,
      });

      // Emit real-time update to customer and admin
      io.emit("orderStatusUpdate", {
        orderId: orderData.orderId,
        status: orderData.status,
        estimatedTime: orderData.estimatedTime,
        timestamp: new Date().toISOString(),
      });

      // Store notification
      await this.storeNotification({
        type: "status_update",
        orderId: orderData.orderId,
        message: `Order #${orderData.orderId} status updated to ${orderData.status}`,
        status: "sent",
        emailResult: updateResult,
      });

      return { success: true, emailSent: updateResult.success };
    } catch (error) {
      console.error("Error handling status update notifications:", error);
      return { success: false, error: error.message };
    }
  }

  // Handle promotional campaigns
  static async handlePromotionalCampaign(promotionData) {
    try {
      console.log("Processing promotional campaign...");

      // Get customer list from database
      const customersQuery = `
        SELECT DISTINCT customer_name, customer_email 
        FROM orders 
        WHERE customer_email IS NOT NULL
      `;
      const [customers] = await db.query(customersQuery);

      const results = [];

      for (const customer of customers) {
        const result = await emailService.sendPromotionalEmail(
          {
            customerEmail: customer.customer_email,
            customerName: customer.customer_name,
          },
          promotionData
        );

        results.push({
          email: customer.customer_email,
          sent: result.success,
        });

        // Add small delay to avoid overwhelming the email service
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Store campaign results
      await this.storeNotification({
        type: "promotional_campaign",
        message: `Promotional campaign "${promotionData.title}" sent to ${results.length} customers`,
        status: "sent",
        emailResult: {
          totalSent: results.filter((r) => r.sent).length,
          totalAttempted: results.length,
        },
      });

      return {
        success: true,
        totalAttempted: results.length,
        totalSent: results.filter((r) => r.sent).length,
        results: results,
      };
    } catch (error) {
      console.error("Error handling promotional campaign:", error);
      return { success: false, error: error.message };
    }
  }

  // Store notification in database for tracking
  static async storeNotification(notificationData) {
    try {
      const query = `
        INSERT INTO notifications (type, order_id, message, status, email_result, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `;

      await db.query(query, [
        notificationData.type,
        notificationData.orderId || null,
        notificationData.message,
        notificationData.status,
        JSON.stringify(notificationData.emailResult),
      ]);
    } catch (error) {
      console.error("Error storing notification:", error);
    }
  }

  // Get notification history
  static async getNotificationHistory(limit = 50) {
    try {
      const query = `
        SELECT * FROM notifications 
        ORDER BY created_at DESC 
        LIMIT ?
      `;
      const [results] = await db.query(query, [limit]);
      return { success: true, notifications: results };
    } catch (error) {
      console.error("Error fetching notification history:", error);
      return { success: false, error: error.message };
    }
  }

  // Send test email
  static async sendTestEmail(testData) {
    try {
      const result = await emailService.sendOrderConfirmation({
        customerEmail: testData.email,
        customerName: testData.name || "Test Customer",
        orderId: "TEST-" + Date.now(),
        items: [
          { name: "Classic Burger", quantity: 1, price: 12.99 },
          { name: "Fries", quantity: 1, price: 4.99 },
        ],
        totalAmount: 17.98,
        estimatedTime: 15,
      });

      return result;
    } catch (error) {
      console.error("Error sending test email:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = NotificationHandlers;
