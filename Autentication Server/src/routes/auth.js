const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/register  → registra un nuovo utente
router.post('/register', authController.register);

// POST /api/auth/login     → login, restituisce JWT
router.post('/login', authController.login);

// POST /api/auth/verify    → verifica un token JWT (chiamato dal file server)
router.post('/verify', authController.verify);

module.exports = router;
