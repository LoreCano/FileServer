// ─────────────────────────────────────────────────────────────
// api.js — Client per chiamare auth-server e file-server
//
// Questo file è il "ponte" tra il frontend e i due server.
// Centralizza tutti i fetch() in un unico posto, così se cambia
// un URL devi modificarlo solo qui.
// ─────────────────────────────────────────────────────────────

const AUTH_URL = 'http://localhost:3000';   // auth-server
const FILE_URL = 'http://localhost:4000';   // file-server

// ── Helpers ──────────────────────────────────────────────────

// Legge il token JWT dal localStorage
function getToken() {
  return localStorage.getItem('token');
}

// Headers standard per le chiamate autenticate
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

// Wrapper generico per fetch — gestisce errori in modo uniforme
async function apiFetch(url, options = {}) {
  const risposta = await fetch(url, options);
  const dati = await risposta.json();

  // Se il server risponde con errore, lancia un'eccezione
  if (!risposta.ok) {
    throw new Error(dati.errore || 'Errore sconosciuto');
  }

  return dati;
}

// ── AUTH API ─────────────────────────────────────────────────

const Auth = {

  // POST /api/auth/register
  async register(nome, email, password) {
    return apiFetch(`${AUTH_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, password })
    });
  },

  // POST /api/auth/login
  async login(email, password) {
    const dati = await apiFetch(`${AUTH_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    // Salva il token e i dati utente nel localStorage
    localStorage.setItem('token', dati.token);
    localStorage.setItem('utente', JSON.stringify(dati.utente));

    return dati;
  },

  // Logout: rimuove token e reindirizza
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('utente');
    window.location.href = 'index.html';
  },

  // Legge i dati utente salvati
  getUtente() {
    const raw = localStorage.getItem('utente');
    return raw ? JSON.parse(raw) : null;
  },

  // Controlla se l'utente è loggato
  isLoggato() {
    const token = getToken();
    return !!(token && token !== 'null' && token !== 'undefined');
  }
};

// ── FILES API ────────────────────────────────────────────────

const Files = {

  // GET /api/files?cartella_id=X — lista file
  async lista(cartellaId = null) {
    const params = cartellaId ? `?cartella_id=${cartellaId}` : '';
    return apiFetch(`${FILE_URL}/api/files${params}`, {
      headers: authHeaders()
    });
  },

  // POST /api/files/upload — carica un file
  // Nota: per upload usiamo FormData, non JSON
  async upload(file, cartellaId = null) {
    const form = new FormData();
    form.append('file', file);
    if (cartellaId) form.append('cartella_id', cartellaId);

    const risposta = await fetch(`${FILE_URL}/api/files/upload`, {
      method: 'POST',
      headers: {
        // NON mettere Content-Type con FormData — il browser lo imposta da solo
        'Authorization': `Bearer ${getToken()}`
      },
      body: form
    });

    const dati = await risposta.json();
    if (!risposta.ok) throw new Error(dati.errore || 'Upload fallito');
    return dati;
  },

  // GET /api/files/download/:id — scarica un file
  // Apre il download direttamente nel browser
  async download(id, nomeFile) {
    const risposta = await fetch(`${FILE_URL}/api/files/download/${id}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });

    if (!risposta.ok) throw new Error('Download fallito');

    // Crea un link temporaneo e lo clicca per avviare il download
    const blob = await risposta.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeFile;
    a.click();
    URL.revokeObjectURL(url);
  },

  // PATCH /api/files/:id/sposta — sposta file
  async sposta(id, cartellaId) {
    return apiFetch(`${FILE_URL}/api/files/${id}/sposta`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ cartella_id: cartellaId || null })
    });
  },

  // DELETE /api/files/:id — elimina file
  async elimina(id) {
    return apiFetch(`${FILE_URL}/api/files/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
  }
};

// ── CARTELLE API ─────────────────────────────────────────────

const Cartelle = {

  // GET /api/cartelle — lista tutte le cartelle
  async lista() {
    return apiFetch(`${FILE_URL}/api/cartelle`, {
      headers: authHeaders()
    });
  },

  // POST /api/cartelle — crea cartella
  async crea(nome, percorsoPadre = null) {
    return apiFetch(`${FILE_URL}/api/cartelle`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ nome, percorso_padre: percorsoPadre || '/' })
    });
  },

  // PATCH /api/cartelle/:id/sposta — sposta cartella
  async sposta(id, percorsoDestinazione = null) {
    return apiFetch(`${FILE_URL}/api/cartelle/${id}/sposta`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ percorso_destinazione: percorsoDestinazione || '/' })
    });
  },

  // DELETE /api/cartelle/:id — elimina cartella
  async elimina(id) {
    return apiFetch(`${FILE_URL}/api/cartelle/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
  }
};
