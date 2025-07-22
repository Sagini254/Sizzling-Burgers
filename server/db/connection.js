require("dotenv").config();
const mysql = require("mysql2/promise");

let db;

(async () => {
  try {
    db = await mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    console.log("✅ MySQL connected (with Pool + Promise)");
  } catch (err) {
    console.error("❌ MySQL connection failed:", err.message);
    process.exit(1);
  }
})();

module.exports = () => db;
