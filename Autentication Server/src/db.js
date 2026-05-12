const mysql = require('mysql2/promise');
require('dotenv').config();

// Crea un pool di connessioni al database
// Un pool riutilizza le connessioni invece di crearne una nuova ad ogni query
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
});


module.exports = pool;
