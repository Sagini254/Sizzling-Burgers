const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "your_password",
  database: "sizzling_burgers",
});

module.exports = pool;
