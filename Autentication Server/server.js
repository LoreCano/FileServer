const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
require('dotenv').config();

// Ignora errori per certificati auto-firmati
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const authRoutes = require('./src/routes/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3000;



http.createServer(app).listen(PORT, () => {
  console.log(`Auth Server in ascolto su http://localhost:${PORT}`);
});
