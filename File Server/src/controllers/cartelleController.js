const db = require('../db');

function normalizzaPercorso(percorso) {
  if (!percorso || percorso === '/') return '/';
  let pulito = String(percorso).trim();
  if (!pulito.startsWith('/')) pulito = `/${pulito}`;
  pulito = pulito.replace(/\/+/g, '/');
  if (pulito.length > 1 && pulito.endsWith('/')) pulito = pulito.slice(0, -1);
  return pulito || '/';
}

function costruisciPercorsoFiglio(percorsoPadre, nome) {
  const padre = normalizzaPercorso(percorsoPadre);
  if (padre === '/') return `/${nome}`;
  return `${padre}/${nome}`;
}

function parentPath(percorso) {
  const p = normalizzaPercorso(percorso);
  if (p === '/') return null;
  const idx = p.lastIndexOf('/');
  if (idx <= 0) return '/';
  return p.slice(0, idx);
}

// ─────────────────────────────────────────────
// GET /api/cartelle
// Lista tutte le cartelle dell'utente
// ─────────────────────────────────────────────
const lista = async (req, res) => {
  const utenteId = req.utente.id;

  try {
    const [cartelle] = await db.query(
      `SELECT id, nome, percorso, creata_il
       FROM cartelle
       WHERE utente_id = ?
       ORDER BY percorso ASC`,
      [utenteId]
    );

    res.json({ cartelle });
  } catch (err) {
    console.error('Errore lista cartelle:', err);
    res.status(500).json({ errore: 'Errore interno del server' });
  }
};

// ─────────────────────────────────────────────
// POST /api/cartelle
// Body: { nome, percorso_padre (opzionale) }
// Crea una nuova cartella
// ─────────────────────────────────────────────
const crea = async (req, res) => {
  const utenteId = req.utente.id;
  const { nome, percorso_padre } = req.body;
  const percorsoPadre = normalizzaPercorso(percorso_padre);
  if (!nome || nome.trim() === '') {
    return res.status(400).json({ errore: 'Il nome della cartella è obbligatorio' });
  }

  if (!/^[a-zA-Z0-9 _\-àèìòùÀÈÌÒÙ]+$/.test(nome)) {
    return res.status(400).json({ errore: 'Il nome contiene caratteri non validi' });
  }

  const nomePulito = nome.trim();
  const nuovoPercorso = costruisciPercorsoFiglio(percorsoPadre, nomePulito);

  try {
    if (percorsoPadre !== '/') {
      const [parentRows] = await db.query(
        'SELECT id FROM cartelle WHERE utente_id = ? AND percorso = ?',
        [utenteId, percorsoPadre]
      );
      if (parentRows.length === 0) {
        return res.status(404).json({ errore: 'Cartella padre non trovata' });
      }
    }

    const [esistente] = await db.query(
      'SELECT id FROM cartelle WHERE utente_id = ? AND percorso = ?',
      [utenteId, nuovoPercorso]
    );
    if (esistente.length > 0) {
      return res.status(409).json({ errore: 'Esiste già una cartella con questo nome in questa posizione' });
    }

    const [risultato] = await db.query(
      'INSERT INTO cartelle (nome, utente_id, percorso) VALUES (?, ?, ?)',
      [nomePulito, utenteId, nuovoPercorso]
    );

    res.status(201).json({
      messaggio: 'Cartella creata con successo',
      cartella: {
        id: risultato.insertId,
        nome: nomePulito,
        percorso: nuovoPercorso
      }
    });
  } catch (err) {
    console.error('Errore crea cartella:', err);
    res.status(500).json({ errore: 'Errore interno del server' });
  }
};

// ─────────────────────────────────────────────
// PATCH /api/cartelle/:id/sposta
// Body: { percorso_destinazione } oppure null per root
// ─────────────────────────────────────────────
const sposta = async (req, res) => {
  const utenteId = req.utente.id;
  const cartellaId = Number(req.params.id);
  const percorsoDestinazione = normalizzaPercorso(req.body.percorso_destinazione);

  if (!Number.isInteger(cartellaId) || cartellaId <= 0) {
    return res.status(400).json({ errore: 'ID cartella non valido' });
  }

  try {
    // Controlla che la cartella da spostare esista e appartenga all'utente
    const [origineRows] = await db.query(
      'SELECT id, nome, percorso FROM cartelle WHERE id = ? AND utente_id = ?',
      [cartellaId, utenteId]
    );
    if (origineRows.length === 0) {
      return res.status(404).json({ errore: 'Cartella da spostare non trovata' });
    }

    const origine = origineRows[0];

    if (percorsoDestinazione !== '/') {
      const [destRows] = await db.query(
        'SELECT id, percorso FROM cartelle WHERE utente_id = ? AND percorso = ?',
        [utenteId, percorsoDestinazione]
      );
      if (destRows.length === 0) {
        return res.status(404).json({ errore: 'Cartella di destinazione non trovata' });
      }
    }

    if (percorsoDestinazione === origine.percorso) {
      return res.status(400).json({ errore: 'Una cartella non può essere spostata dentro sé stessa' });
    }

    const nuovoPercorsoBase = costruisciPercorsoFiglio(percorsoDestinazione, origine.nome);

    if (nuovoPercorsoBase === origine.percorso) {
      return res.json({ messaggio: 'Cartella già nella destinazione richiesta' });
    }

    if (percorsoDestinazione.startsWith(`${origine.percorso}/`)) {
      return res.status(400).json({ errore: 'Non puoi spostare una cartella dentro una sua sottocartella' });
    }

    const [conflittoRows] = await db.query(
      'SELECT id FROM cartelle WHERE utente_id = ? AND percorso = ? AND id <> ?',
      [utenteId, nuovoPercorsoBase, cartellaId]
    );
    if (conflittoRows.length > 0) {
      return res.status(409).json({ errore: 'Esiste già una cartella con questo nome nella destinazione' });
    }

    const oldPathLen = origine.percorso.length;
    await db.query(
      `UPDATE cartelle
       SET percorso = CONCAT(?, SUBSTRING(percorso, ?))
       WHERE utente_id = ?
         AND (percorso = ? OR percorso LIKE CONCAT(?, '/%'))`,
      [nuovoPercorsoBase, oldPathLen + 1, utenteId, origine.percorso, origine.percorso]
    );

    res.json({ messaggio: 'Cartella spostata con successo' });
  } catch (err) {
    console.error('Errore sposta cartella:', err);
    res.status(500).json({ errore: 'Errore interno del server' });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/cartelle/:id
// Elimina una cartella solo se è vuota
// ─────────────────────────────────────────────
const elimina = async (req, res) => {
  const utenteId = req.utente.id;
  const cartellaId = req.params.id;

  try {
    const [cartelle] = await db.query(
      'SELECT id, percorso FROM cartelle WHERE id = ? AND utente_id = ?',
      [cartellaId, utenteId]
    );
    if (cartelle.length === 0) {
      return res.status(404).json({ errore: 'Cartella non trovata' });
    }

    const cartella = cartelle[0];

    const [files] = await db.query(
      'SELECT id FROM files WHERE cartella_id = ?',
      [cartellaId]
    );
    if (files.length > 0) {
      return res.status(400).json({ errore: 'La cartella non è vuota. Elimina prima i file al suo interno.' });
    }

    const [sotto] = await db.query(
      `SELECT id FROM cartelle
       WHERE utente_id = ? AND percorso LIKE CONCAT(?, '/%')
       LIMIT 1`,
      [utenteId, cartella.percorso]
    );
    if (sotto.length > 0) {
      return res.status(400).json({ errore: 'La cartella contiene altre cartelle. Eliminale prima.' });
    }

    await db.query('DELETE FROM cartelle WHERE id = ? AND utente_id = ?', [cartellaId, utenteId]);
    res.json({ messaggio: 'Cartella eliminata con successo' });
  } catch (err) {
    console.error('Errore elimina cartella:', err);
    res.status(500).json({ errore: 'Errore interno del server' });
  }
};

module.exports = { lista, crea, sposta, elimina };
