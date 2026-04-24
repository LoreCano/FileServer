const express = require('express');
const router = express.Router();
const filesController = require('../controllers/filesController');
const authMiddleware = require('../middleware/authMiddleware');
const { upload } = require('../middleware/multerConfig');

// Tutte le route qui sotto richiedono autenticazione
// authMiddleware viene eseguito prima di ogni controller

// GET  /api/files            → lista file (con filtro cartella opzionale)
router.get('/', authMiddleware, filesController.lista);

// POST /api/files/upload     → carica un file
router.post('/upload', authMiddleware, upload.single('file'), filesController.upload);

// GET  /api/files/download/:id → scarica un file
router.get('/download/:id', authMiddleware, filesController.download);

// PATCH /api/files/:id/sposta → sposta file in un'altra cartella
router.patch('/:id/sposta', authMiddleware, filesController.sposta);

// DELETE /api/files/:id      → elimina un file
router.delete('/:id', authMiddleware, filesController.elimina);

module.exports = router;
