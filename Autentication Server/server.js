const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./src/routes/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ messaggio: 'Auth Server attivo ✅', versione: '1.0.0' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔐 Auth Server in ascolto su http://localhost:${PORT}`);
});
