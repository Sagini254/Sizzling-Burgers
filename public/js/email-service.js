const nodemailer = require("nodemailer");
require("dotenv").config();

class EmailService {
  constructor() {
    // Configure email transporter
    this.transporter = nodemailer.createTransporter({
      service: "gmail", // You can use other services like 'outlook', 'yahoo', etc.
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Use app password for Gmail
      },
    });
  }

  // Send order confirmation email to customer
  async sendOrderConfirmation(orderData) {
    try {
      const {
        customerEmail,
        customerName,
        orderId,
        items,
        totalAmount,
        estimatedTime,
      } = orderData;

      const itemsList = items
        .map(
          (item) =>
            `<li>${item.name} x${item.quantity} - $${(
              item.price * item.quantity
            ).toFixed(2)}</li>`
        )
        .join("");

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: customerEmail,
        subject: `Order Confirmation - Sizzling Burgers #${orderId}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #ff8c00, #ff6b00); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .total { font-size: 18px; font-weight: bold; color: #ff8c00; }
              .footer { text-align: center; margin-top: 20px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🍔 Sizzling Burgers</h1>
                <h2>Order Confirmed!</h2>
              </div>
              <div class="content">
                <p>Hi ${customerName},</p>
                <p>Thank you for your order! We're excited to prepare your delicious burgers.</p>
                
                <div class="order-details">
                  <h3>Order Details:</h3>
                  <p><strong>Order ID:</strong> #${orderId}</p>
                  <p><strong>Estimated Preparation Time:</strong> ${estimatedTime} minutes</p>
                  
                  <h4>Items Ordered:</h4>
                  <ul>
                    ${itemsList}
                  </ul>
                  
                  <p class="total">Total Amount: $${totalAmount.toFixed(2)}</p>
                </div>
                
                <p>We'll notify you when your order is ready for pickup/delivery!</p>
                
                <div class="footer">
                  <p>Thank you for choosing Sizzling Burgers!</p>
                  <p>Questions? Contact us at support@sizzlingburgers.com</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Order confirmation email sent to ${customerEmail}`);
      return { success: true, message: "Email sent successfully" };
    } catch (error) {
      console.error("Error sending order confirmation email:", error);
      return { success: false, error: error.message };
    }
  }

  // Send order status update email
  async sendOrderStatusUpdate(orderData) {
    try {
      const { customerEmail, customerName, orderId, status, estimatedTime } =
        orderData;

      const statusMessages = {
        preparing: "👨‍🍳 Your order is being prepared",
        ready: "✅ Your order is ready for pickup",
        out_for_delivery: "🚗 Your order is out for delivery",
        delivered: "🎉 Your order has been delivered",
        cancelled: "❌ Your order has been cancelled",
      };

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: customerEmail,
        subject: `Order Update - Sizzling Burgers #${orderId}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #ff8c00, #ff6b00); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .status-update { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
              .status { font-size: 20px; font-weight: bold; color: #ff8c00; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🍔 Sizzling Burgers</h1>
                <h2>Order Status Update</h2>
              </div>
              <div class="content">
                <p>Hi ${customerName},</p>
                
                <div class="status-update">
                  <p class="status">${
                    statusMessages[status] || "Order status updated"
                  }</p>
                  <p><strong>Order ID:</strong> #${orderId}</p>
                  ${
                    estimatedTime
                      ? `<p><strong>Estimated Time:</strong> ${estimatedTime} minutes</p>`
                      : ""
                  }
                </div>
                
                ${
                  status === "ready"
                    ? "<p>Your order is ready for pickup at our location!</p>"
                    : ""
                }
                ${
                  status === "delivered"
                    ? "<p>We hope you enjoy your meal! Please rate your experience.</p>"
                    : ""
                }
                
                <div style="text-align: center; margin-top: 20px;">
                  <p>Thank you for choosing Sizzling Burgers!</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Status update email sent to ${customerEmail}`);
      return {
        success: true,
        message: "Status update email sent successfully",
      };
    } catch (error) {
      console.error("Error sending status update email:", error);
      return { success: false, error: error.message };
    }
  }

  // Send promotional email
  async sendPromotionalEmail(customerData, promotion) {
    try {
      const { customerEmail, customerName } = customerData;
      const { title, description, discount, validUntil, promoCode } = promotion;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: customerEmail,
        subject: `Special Offer - ${title} 🍔`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #ff8c00, #ff6b00); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .promo-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px dashed #ff8c00; }
              .discount { font-size: 24px; font-weight: bold; color: #ff8c00; }
              .promo-code { background: #ff8c00; color: white; padding: 10px 20px; border-radius: 5px; font-weight: bold; display: inline-block; margin: 10px 0; }
              .cta-button { background: #ff8c00; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🍔 Sizzling Burgers</h1>
                <h2>${title}</h2>
              </div>
              <div class="content">
                <p>Hi ${customerName},</p>
                
                <div class="promo-box">
                  <p class="discount">${discount}% OFF</p>
                  <p>${description}</p>
                  <div class="promo-code">Code: ${promoCode}</div>
                  <p><strong>Valid until:</strong> ${validUntil}</p>
                </div>
                
                <div style="text-align: center;">
                  <a href="#" class="cta-button">Order Now & Save!</a>
                </div>
                
                <p style="text-align: center; margin-top: 20px;">
                  Don't miss out on this delicious deal!<br>
                  Visit us today or order online.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Promotional email sent to ${customerEmail}`);
      return { success: true, message: "Promotional email sent successfully" };
    } catch (error) {
      console.error("Error sending promotional email:", error);
      return { success: false, error: error.message };
    }
  }

  // Send admin notification for new orders
  async sendAdminNotification(orderData) {
    try {
      const {
        orderId,
        customerName,
        customerEmail,
        items,
        totalAmount,
        orderTime,
      } = orderData;

      const itemsList = items
        .map((item) => `<li>${item.name} x${item.quantity}</li>`)
        .join("");

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: `New Order Received - #${orderId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ff8c00;">New Order Alert! 🍔</h2>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
              <p><strong>Order ID:</strong> #${orderId}</p>
              <p><strong>Customer:</strong> ${customerName} (${customerEmail})</p>
              <p><strong>Order Time:</strong> ${orderTime}</p>
              <p><strong>Total Amount:</strong> $${totalAmount.toFixed(2)}</p>
              
              <h4>Items:</h4>
              <ul>${itemsList}</ul>
              
              <p style="margin-top: 20px;">
                <strong>Action Required:</strong> Please prepare this order and update the status in the system.
              </p>
            </div>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Admin notification sent for order #${orderId}`);
      return { success: true, message: "Admin notification sent successfully" };
    } catch (error) {
      console.error("Error sending admin notification:", error);
      return { success: false, error: error.message };
    }
  }

  // Test email configuration
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log("Email service is ready to send emails");
      return { success: true, message: "Email service connected successfully" };
    } catch (error) {
      console.error("Email service connection failed:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
