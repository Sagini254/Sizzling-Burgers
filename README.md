Sizzling Burgers Backend API
A comprehensive REST API for a burger restaurant website with user authentication, menu management, order processing, and admin functionality.

Features
🔐 User Authentication - JWT-based auth with registration and login
🍔 Menu Management - Full CRUD operations for menu items
📦 Order Processing - Complete order lifecycle management
👨‍💼 Admin Dashboard - Admin-only routes for management
🔍 Search Functionality - Search through menu items
📊 Analytics - Sales and order analytics for admins
🖼️ File Upload - Image upload for menu items
🔒 Security - Password hashing, JWT tokens, input validation

Quick Start
Prerequisites
Node.js (v14 or higher)
npm or yarn
Installation
Clone and navigate to the project directory

Install dependencies:
bash
npm install
Create environment variables:
bash
cp .env.example .env
Edit .env and set your values (especially JWT_SECRET)

Start the server:
bash

# Development mode with auto-reload

npm run dev

# Production mode

npm start
The API will be available at http://localhost:3000

API Endpoints
Authentication
Register User
http
POST /api/register
Body:

json
{
"email": "user@example.com",
"password": "password123",
"name": "John Doe"
}
Response:

json
{
"message": "User created successfully",
"token": "jwt-token-here",
"user": {
"id": 1,
"email": "user@example.com",
"name": "John Doe",
"role": "customer"
}
}
Login User
http
POST /api/login
Body:

json
{
"email": "user@example.com",
"password": "password123"
}
Menu Items
Get All Menu Items
http
GET /api/menu
Query Parameters:

category (optional): Filter by category (e.g., "burgers", "sides", "drinks")
Get Single Menu Item
http
GET /api/menu/:id
Search Menu Items
http
GET /api/search?q=chicken
Orders
Place Order (Requires Authentication)
http
POST /api/orders
Authorization: Bearer <jwt-token>
Body:

json
{
"items": [
{
"id": 1,
"quantity": 2,
"customizations": ["No onions", "Extra cheese"]
}
],
"customerInfo": {
"name": "John Doe",
"phone": "+1234567890"
},
"deliveryAddress": {
"street": "123 Main St",
"city": "Anytown",
"zipCode": "12345"
},
"paymentMethod": "card"
}
Get User Orders (Requires Authentication)
http
GET /api/orders
Authorization: Bearer <jwt-token>
Get Single Order (Requires Authentication)
http
GET /api/orders/:id
Authorization: Bearer <jwt-token>
Admin Routes (Requires Admin Role)
All admin routes require authentication with an admin role.

Menu Management
Create Menu Item:

http
POST /api/admin/menu
Authorization: Bearer <admin-jwt-token>
Content-Type: multipart/form-data
Update Menu Item:

http
PUT /api/admin/menu/:id
Authorization: Bearer <admin-jwt-token>
Delete Menu Item:

http
DELETE /api/admin/menu/:id
Authorization: Bearer <admin-jwt-token>
Order Management
Get All Orders:

http
GET /api/admin/orders
Authorization: Bearer <admin-jwt-token>
Query Parameters:

status: Filter by order status
limit: Limit number of results
Update Order Status:

http
PUT /api/admin/orders/:id/status
Authorization: Bearer <admin-jwt-token>
Body:

json
{
"status": "confirmed"
}
Valid statuses: pending, confirmed, preparing, ready, delivered, cancelled

Analytics
Get Analytics:

http
GET /api/admin/analytics
Authorization: Bearer <admin-jwt-token>
Response:

json
{
"todayOrders": 15,
"weeklyOrders": 89,
"monthlyRevenue": "2547.85",
"totalOrders": 234,
"totalUsers": 67,
"popularItems": [
{
"name": "Classic Beef Burger",
"count": 45
}
]
}
Data Models
User
json
{
"id": 1,
"email": "user@example.com",
"password": "hashed-password",
"name": "John Doe",
"role": "customer" // or "admin"
}
Menu Item
json
{
"id": 1,
"name": "Classic Beef Burger",
"description": "Juicy beef patty with lettuce, tomato, onion",
"price": 12.99,
"category": "burgers",
"image": "/uploads/burger.jpg",
"available": true,
"ingredients": ["beef patty", "lettuce", "tomato"]
}
Order
json
{
"id": 1,
"userId": 1,
"items": [
{
"id": 1,
"name": "Classic Beef Burger",
"price": 12.99,
"quantity": 2,
"total": 25.98,
"customizations": ["No onions"]
}
],
"total": 25.98,
"customerInfo": {
"name": "John Doe",
"phone": "+1234567890"
},
"deliveryAddress": {
"street": "123 Main St",
"city": "Anytown",
"zipCode": "12345"
},
"paymentMethod": "card",
"status": "pending",
"createdAt": "2024-01-15T10:30:00Z",
"estimatedDelivery": "2024-01-15T11:00:00Z"
}
Error Responses
All endpoints return consistent error responses:

json
{
"error": "Error message description"
}
Common HTTP Status Codes:

200 - Success
201 - Created
400 - Bad Request
401 - Unauthorized
403 - Forbidden (Admin required)
404 - Not Found
500 - Internal Server Error
Security
Passwords are hashed using bcrypt
JWT tokens expire after 24 hours
File uploads are restricted to images only (max 5MB)
CORS is enabled for cross-origin requests
Input validation and sanitization
Default Admin Account
For testing purposes, a default admin account is created:

Email: admin@sizzlingburgers.com
Password: password
⚠️ Important: Change this password in production!

Database Migration
Currently using in-memory storage. To integrate with a real database:

Install database driver (e.g., pg for PostgreSQL, mysql2 for MySQL)
Replace the in-memory arrays with database queries
Add database connection configuration
Create migration scripts for table setup
File Structure
backend/
├── server.js # Main application file
├── package.json # Dependencies and scripts
├── .env.example # Environment variables template
├── uploads/ # Directory for uploaded files
└── README.md # This documentation
Development
Adding New Features
New Routes: Add to the appropriate section in server.js
Middleware: Create reusable middleware functions
Validation: Add input validation for new endpoints
Testing: Write tests for new functionality
Testing
bash
npm test
Deployment
Environment Variables
Set these in your production environment:

JWT_SECRET - Strong random string
NODE_ENV=production
Database connection details
File upload paths
Recommended Production Setup
Use a reverse proxy (nginx)
Enable HTTPS
Use a real database (PostgreSQL, MongoDB)
Set up monitoring and logging
Use PM2 for process management
Contributing
Fork the repository
Create a feature branch
Add tests for new functionality
Submit a pull request
License
MIT License - feel free to use this project for your own restaurant!
