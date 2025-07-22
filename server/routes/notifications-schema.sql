-- Add this to your existing schema.sql file

-- Notifications table for tracking email notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('new_order', 'status_update', 'promotional_campaign', 'test') NOT NULL,
    order_id VARCHAR(50) NULL,
    message TEXT NOT NULL,
    status ENUM('pending', 'sent', 'failed', 'retry') DEFAULT 'pending',
    email_result JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_order_id (order_id),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Update orders table to include customer email if not already present
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255) AFTER customer_phone,
ADD COLUMN IF NOT EXISTS estimated_delivery_time INT DEFAULT 20 AFTER total_amount;

-- Add index for customer email
CREATE INDEX IF NOT EXISTS idx_customer_email ON orders(customer_email);

-- Create promotional campaigns table for tracking marketing campaigns
CREATE TABLE IF NOT EXISTS promotional_campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    discount_percentage INT DEFAULT 0,
    promo_code VARCHAR(50) UNIQUE,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    emails_sent INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Email templates table for customizable email content
CREATE TABLE IF NOT EXISTS email_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('order_confirmation', 'status_update', 'promotional', 'admin_notification') NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_content LONGTEXT NOT NULL,
    text_content TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default email templates
INSERT IGNORE INTO email_templates (type, subject, html_content, text_content) VALUES
('order_confirmation', 'Order Confirmation - Sizzling Burgers #{orderId}', 
 '<div style="font-family: Arial, sans-serif;"><h1>Order Confirmed!</h1><p>Thank you for your order #{orderId}.</p></div>',
 'Order Confirmed! Thank you for your order #{orderId}.'),
('status_update', 'Order Update - Sizzling Burgers #{orderId}',
 '<div style="font-family: Arial, sans-serif;"><h1>Order Status Update</h1><p>Your order #{orderId} status: {status}</p></div>',
 'Order Status Update: Your order #{orderId} status: {status}');

-- Email queue table for reliable email delivery
CREATE TABLE IF NOT EXISTS email_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_content LONGTEXT,
    text_content TEXT,
    priority INT DEFAULT 1,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    status ENUM('pending', 'sent', 'failed', 'cancelled') DEFAULT 'pending',
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_status (status),
    INDEX idx_scheduled_at (scheduled_at),
    INDEX idx_priority (priority)
);