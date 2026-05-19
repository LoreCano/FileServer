const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const fs = require('fs');
require('dotenv').config();

const filesRoutes = require('./src/routes/files');
const cartelleRoutes = require('./src/routes/cartelle');

const app = express();

// Percorso alla cartella frontend
const frontendPath = path.join(__dirname, '../FrontEnd');

// Middleware
app.use(cors());
app.use(express.json());

// Serve i file statici (HTML, CSS, JS)
app.use(express.static(frontendPath));

// Routes API
app.use('/api/files', filesRoutes);
app.use('/api/cartelle', cartelleRoutes);

// Quando vai su "/", apre index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const PORT = process.env.PORT || 4000;

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'server.cert'))
};

https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`File Server pronto https://localhost:${PORT}`);
});