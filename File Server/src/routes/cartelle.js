const express = require('express');
const router = express.Router();
const cartelleController = require('../controllers/cartelleController');
const authMiddleware = require('../middleware/authMiddleware');

// GET    /api/cartelle        → lista tutte le cartelle dell'utente
router.get('/', authMiddleware, cartelleController.lista);

// POST   /api/cartelle        → crea una nuova cartella
router.post('/', authMiddleware, cartelleController.crea);

// PATCH  /api/cartelle/:id/sposta → sposta cartella in un'altra cartella/root
router.patch('/:id/sposta', authMiddleware, cartelleController.sposta);

// DELETE /api/cartelle/:id    → elimina una cartella (solo se vuota)
router.delete('/:id', authMiddleware, cartelleController.elimina);

module.exports = router;
