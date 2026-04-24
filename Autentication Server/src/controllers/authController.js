const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

// ─────────────────────────────────────────────
// POST /api/auth/register
// Body: { nome, email, password }
// ─────────────────────────────────────────────
const register = async (req, res) => {
  const { nome, email, password } = req.body;

  // 1. Validazione campi obbligatori
  if (!nome || !email || !password) {
    return res.status(400).json({ errore: 'Tutti i campi sono obbligatori' });
  }

  // 2. Validazione formato email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ errore: 'Formato email non valido' });
  }

  // 3. Validazione lunghezza password
  if (password.length < 6) {
    return res.status(400).json({ errore: 'La password deve essere di almeno 6 caratteri' });
  }

  try {
    // 4. Controlla se l'email è già registrata
    const [esistente] = await db.query(
      'SELECT id FROM utenti WHERE email = ?',
      [email]
    );
    if (esistente.length > 0) {
      return res.status(409).json({ errore: 'Email già registrata' });
    }

    // 5. Hash della password (mai salvare password in chiaro!)
    // Il numero 10 è il "salt rounds" — più alto = più sicuro ma più lento
    const passwordHash = await bcrypt.hash(password, 10);

    // 6. Inserisce l'utente nel database
    const [risultato] = await db.query(
      'INSERT INTO utenti (nome, email, password) VALUES (?, ?, ?)',
      [nome, email, passwordHash]
    );

    res.status(201).json({
      messaggio: 'Utente registrato con successo',
      utente: {
        id: risultato.insertId,
        nome,
        email,
      }
    });

  } catch (err) {
    console.error('Errore register:', err);
    res.status(500).json({ errore: 'Errore interno del server' });
  }
};

// ─────────────────────────────────────────────
// POST /api/auth/login
// Body: { email, password }
// ─────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  // 1. Validazione campi
  if (!email || !password) {
    return res.status(400).json({ errore: 'Email e password sono obbligatorie' });
  }

  try {
    // 2. Cerca l'utente nel database
    const [utenti] = await db.query(
      'SELECT * FROM utenti WHERE email = ?',
      [email]
    );

    // 3. Utente non trovato
    // Nota: non diciamo "email non trovata" per sicurezza,
    // ma usiamo un messaggio generico
    if (utenti.length === 0) {
      return res.status(401).json({ errore: 'Credenziali non valide' });
    }

    const utente = utenti[0];

    // 4. Confronta la password con l'hash salvato
    const passwordCorretta = await bcrypt.compare(password, utente.password);
    if (!passwordCorretta) {
      return res.status(401).json({ errore: 'Credenziali non valide' });
    }

    // 5. Genera il token JWT
    // Il payload contiene info sull'utente (mai mettere la password!)
    const token = jwt.sign(
      {
        id: utente.id,
        nome: utente.nome,
        email: utente.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      messaggio: 'Login effettuato con successo',
      token,
      utente: {
        id: utente.id,
        nome: utente.nome,
        email: utente.email,
      }
    });

  } catch (err) {
    console.error('Errore login:', err);
    res.status(500).json({ errore: 'Errore interno del server' });
  }
};

// ─────────────────────────────────────────────
// POST /api/auth/verify
// Body: { token }
// Chiamato dal file-server per verificare il JWT
// ─────────────────────────────────────────────
const verify = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ errore: 'Token mancante' });
  }

  try {
    // Verifica e decodifica il token
    // Se il token è scaduto o non valido, lancia un'eccezione
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Controlla che l'utente esista ancora nel database
    const [utenti] = await db.query(
      'SELECT id, nome, email FROM utenti WHERE id = ?',
      [payload.id]
    );

    if (utenti.length === 0) {
      return res.status(401).json({ valido: false, errore: 'Utente non trovato' });
    }

    res.json({
      valido: true,
      utente: utenti[0]
    });

  } catch (err) {
    // jwt.verify lancia JsonWebTokenError se il token non è valido
    // e TokenExpiredError se è scaduto
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ valido: false, errore: 'Token scaduto' });
    }
    return res.status(401).json({ valido: false, errore: 'Token non valido' });
  }
};

module.exports = { register, login, verify };
