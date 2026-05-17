const path = require('path');
const fs = require('fs');
const db = require('../db');

// Cartella dove vengono salvati fisicamente i file
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Crea la cartella uploads se non esiste
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ─────────────────────────────────────────────
// GET /api/files/:cartella_id?
// Lista i file dell'utente, opzionalmente filtrati per cartella
// ─────────────────────────────────────────────
const lista = async (req, res) => {
  const utenteId = req.utente.id;
  const cartellaId = req.params.cartella_id || null;

  try {
    let query, params;

    if (cartellaId) {
      // File dentro una cartella specifica
      query = `SELECT id, nome_originale, dimensione, mimetype, cartella_id, caricato_il
               FROM files
               WHERE utente_id = ? AND cartella_id = ?
               ORDER BY caricato_il DESC`;
      params = [utenteId, cartellaId];
    } else {
      // File nella root (senza cartella)
      query = `SELECT id, nome_originale, dimensione, mimetype, cartella_id, caricato_il
               FROM files
               WHERE utente_id = ? AND cartella_id IS NULL
               ORDER BY caricato_il DESC`;
      params = [utenteId];
    }

    const [files] = await db.query(query, params);

    res.json({ files });

  } catch (err) {
    console.error('Errore lista file:', err);
    res.status(500).json({ errore: 'Errore interno del server' });
  }
};

// ─────────────────────────────────────────────
// POST /api/files/upload
// Carica un file sul server tramite base64
// ─────────────────────────────────────────────
const upload = async (req, res) => {
  const { fileBase64, nome_originale, mimetype, dimensione, cartella_id } = req.body;

  // Se non c'è il file in base64
  if (!fileBase64) {
    return res.status(400).json({ errore: 'Nessun file ricevuto' });
  }

  const utenteId = req.utente.id;
  const cartellaId = cartella_id || null;

  // Verifica che la cartella esista e appartenga all'utente
  if (cartellaId) {
    const [cartelle] = await db.query(
      'SELECT id FROM cartelle WHERE id = ? AND utente_id = ?',
      [cartellaId, utenteId]
    );
    if (cartelle.length === 0) {
      return res.status(404).json({ errore: 'Cartella non trovata' });
    }
  }

  let percorsoSalvataggio = null;

  try {
    // Estrai la parte base64 vera e propria
    let base64String = fileBase64;
    const matches = fileBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      base64String = matches[2];
    } else if (fileBase64.includes('base64,')) {
      base64String = fileBase64.split('base64,')[1];
    }

    const fileBuffer = Buffer.from(base64String, 'base64');
    const nome_salvato = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${nome_originale.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    percorsoSalvataggio = path.join(UPLOAD_DIR, nome_salvato);

    // Salva il file su disco
    fs.writeFileSync(percorsoSalvataggio, fileBuffer);

    // Salva le info del file nel database
    const [risultato] = await db.query(
      `INSERT INTO files (nome_originale, nome_salvato, dimensione, mimetype, utente_id, cartella_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        nome_originale,
        nome_salvato,
        dimensione,
        mimetype,
        utenteId,
        cartellaId
      ]
    );

    res.status(201).json({
      messaggio: 'File caricato con successo',
      file: {
        id: risultato.insertId,
        nome_originale: nome_originale,
        dimensione: dimensione,
        mimetype: mimetype,
        cartella_id: cartellaId,
      }
    });

  } catch (err) {
    if (percorsoSalvataggio && fs.existsSync(percorsoSalvataggio)) {
      fs.unlinkSync(percorsoSalvataggio);
    }
    console.error('Errore upload:', err);
    res.status(500).json({ errore: 'Errore interno del server' });
  }
};

// ─────────────────────────────────────────────
// GET /api/files/:id/download
// Scarica un file
// ─────────────────────────────────────────────
const download = async (req, res) => {
  const utenteId = req.utente.id;
  const fileId = req.params.id;

  try {
    // Cerca il file nel DB e verifica che appartenga all'utente
    const [files] = await db.query(
      'SELECT * FROM files WHERE id = ? AND utente_id = ?',
      [fileId, utenteId]
    );

    if (files.length === 0) {
      return res.status(404).json({ errore: 'File non trovato' });
    }

    const file = files[0];
    const percorsoFile = path.join(UPLOAD_DIR, file.nome_salvato);

    // Controlla che il file esista fisicamente su disco
    if (!fs.existsSync(percorsoFile)) {
      return res.status(404).json({ errore: 'File non trovato su disco' });
    }

    // Invia il file al client con il nome originale
    res.download(percorsoFile, file.nome_originale);

  } catch (err) {
    console.error('Errore download:', err);
    res.status(500).json({ errore: 'Errore interno del server' });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/files/:id/sposta
// Body: { cartella_id (opzionale)}  
// ─────────────────────────────────────────────
const sposta = async (req, res) => {
  const utenteId = req.utente.id;
  const fileId = req.params.id;
  const nuovaCartellaId = req.body.cartella_id ?? null;

  try {
    // Verifica che il file esista e appartenga all'utente
    const [files] = await db.query(
      'SELECT id FROM files WHERE id = ? AND utente_id = ?',
      [fileId, utenteId]
    );
    if (files.length === 0) {
      return res.status(404).json({ errore: 'File non trovato' });
    }

    // Se si sposta in una cartella, verifica che esista
    if (nuovaCartellaId) {
      const [cartelle] = await db.query(
        'SELECT id FROM cartelle WHERE id = ? AND utente_id = ?',
        [nuovaCartellaId, utenteId]
      );
      if (cartelle.length === 0) {
        return res.status(404).json({ errore: 'Cartella di destinazione non trovata' });
      }
    }

    // Aggiorna la cartella del file
    await db.query(
      'UPDATE files SET cartella_id = ? WHERE id = ?',
      [nuovaCartellaId, fileId]
    );

    res.json({ messaggio: 'File spostato con successo' });

  } catch (err) {
    console.error('Errore sposta:', err);
    res.status(500).json({ errore: 'Errore interno del server' });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/files/:id
// Elimina un file dal DB e dal disco
// ─────────────────────────────────────────────
const elimina = async (req, res) => {
  const utenteId = req.utente.id;
  const fileId = req.params.id;

  try {
    // Cerca il file e verifica che appartenga all'utente
    const [files] = await db.query(
      'SELECT * FROM files WHERE id = ? AND utente_id = ?',
      [fileId, utenteId]
    );

    if (files.length === 0) {
      return res.status(404).json({ errore: 'File non trovato' });
    }

    const file = files[0];

    // 1. Elimina dal database
    await db.query('DELETE FROM files WHERE id = ?', [fileId]);

    // 2. Elimina dal disco
    const percorsoFile = path.join(UPLOAD_DIR, file.nome_salvato);
    if (fs.existsSync(percorsoFile)) {
      fs.unlinkSync(percorsoFile);
    }

    res.json({ messaggio: 'File eliminato con successo' });

  } catch (err) {
    console.error('Errore elimina file:', err);
    res.status(500).json({ errore: 'Errore interno del server' });
  }
};

module.exports = { lista, upload, download, sposta, elimina };
