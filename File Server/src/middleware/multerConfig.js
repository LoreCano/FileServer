const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Cartella dove vengono salvati fisicamente i file
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Crea la cartella uploads se non esiste
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configurazione dello storage di Multer
const storage = multer.diskStorage({

  // Dove salvare il file
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },

  // Come chiamare il file salvato su disco
  // Usiamo un nome univoco per evitare sovrascritture: timestamp + numero random
  filename: (req, file, cb) => {
    const nomeUnico = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, nomeUnico);
  }
});

// Filtro: accetta solo certi tipi di file
const fileFilter = (req, file, cb) => {
  const tipiPermessi = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'text/plain', 'text/csv',
    'application/zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (tipiPermessi.includes(file.mimetype)) {
    cb(null, true); // accetta il file
  } else {
    cb(new Error(`Tipo file non permesso: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // max 50 MB
  }
});

module.exports = { upload, UPLOAD_DIR };
