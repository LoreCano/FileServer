const axios = require('axios');
require('dotenv').config();

// Questo middleware viene eseguito PRIMA di ogni route protetta.
// Prende il token JWT dall'header, lo manda all'auth server per verificarlo,
// e se è valido aggiunge i dati dell'utente a req.utente.

const authMiddleware = async (req, res, next) => {
  // 1. Legge il token dall'header Authorization
  // Il formato standard è: "Bearer <token>"
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ errore: 'Token mancante. Effettua il login.' });
  }

  const token = authHeader.split(' ')[1]; // prende solo il token, senza "Bearer "

  try {
    // 2. Chiama l'auth server per verificare il token
    // Questo è il punto chiave dell'architettura a due server!
    const risposta = await axios.post(
      `${process.env.AUTH_SERVER_URL}/api/auth/verify`,
      { token }
    );

    // 3. Se il token è valido, salva i dati utente nella request
    // Così i controller possono usare req.utente.id, req.utente.email, ecc.
    req.utente = risposta.data.utente;

    // 4. Passa al prossimo middleware o alla route
    next();

  } catch (err) {
    // L'auth server ha risposto con errore (token non valido o scaduto)
    if (err.response) {
      return res.status(401).json({ errore: err.response.data.errore });
    }
    // L'auth server non è raggiungibile
    console.error('Errore contattando auth server:', err.message);
    return res.status(503).json({ errore: 'Servizio di autenticazione non disponibile' });
  }
};

module.exports = authMiddleware;
