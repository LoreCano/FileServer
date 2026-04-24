// ─────────────────────────────────────────────
// dashboard.js — Logica della dashboard
// ─────────────────────────────────────────────

let stato = {
  cartellaCorrente: null,        // id cartella corrente (null = root)
  percorsoCorrente: '/',         // percorso corrente (root = '/')
  tutteLeCartelle: [],           // lista completa cartelle
  fileDaSpostare: null,          // id file da spostare via modal
  elementoTrascinato: null,      // { type: 'file'|'cartella', ... }
};

if (!Auth.isLoggato()) {
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', async () => {
  popolaUtente();
  aggiornaBreadcrumb();
  await caricaTutto();
});

function popolaUtente() {
  const utente = Auth.getUtente();
  if (!utente) return;

  document.getElementById('user-name-display').textContent = utente.nome;
  document.getElementById('user-email-display').textContent = utente.email;
  document.getElementById('user-avatar').textContent = utente.nome.charAt(0).toUpperCase();
}

async function caricaTutto() {
  await caricaCartelle();
  await caricaFile();
}

// ── Helpers cartelle/percorsi ─────────────────

function normalizzaPercorso(percorso) {
  if (!percorso || percorso === '/') return '/';
  let p = String(percorso).trim();
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/+/g, '/');
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p || '/';
}

function parentPath(percorso) {
  const p = normalizzaPercorso(percorso);
  if (p === '/') return null;
  const idx = p.lastIndexOf('/');
  if (idx <= 0) return '/';
  return p.slice(0, idx);
}

function figliDi(percorsoPadre) {
  const parent = normalizzaPercorso(percorsoPadre);
  return stato.tutteLeCartelle
    .filter(c => parentPath(c.percorso) === parent)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
}

function trovaCartellaById(id) {
  return stato.tutteLeCartelle.find(c => c.id === id) || null;
}

function trovaCartellaByPercorso(percorso) {
  const p = normalizzaPercorso(percorso);
  return stato.tutteLeCartelle.find(c => c.percorso === p) || null;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function jsString(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ── Cartelle ──────────────────────────────────

async function caricaCartelle() {
  try {
    const dati = await Cartelle.lista();
    stato.tutteLeCartelle = dati.cartelle.map(c => ({
      ...c,
      percorso: normalizzaPercorso(c.percorso),
    }));

    if (stato.cartellaCorrente) {
      const corrente = trovaCartellaById(stato.cartellaCorrente);
      if (!corrente) {
        stato.cartellaCorrente = null;
        stato.percorsoCorrente = '/';
      } else {
        stato.percorsoCorrente = corrente.percorso;
      }
    }

    renderSidebarCartelle();
    aggiornaBreadcrumb();
  } catch (err) {
    toast('Errore nel caricare le cartelle', 'error');
  }
}

function renderSidebarCartelle() {
  const container = document.getElementById('sidebar-cartelle');

  const renderNodo = (cartella, livello) => {
    const children = figliDi(cartella.percorso);
    const active = stato.cartellaCorrente === cartella.id ? 'active' : '';
    const padding = 1.5 + livello * 0.95;

    const self = `
      <button class="sidebar-item ${active}"
              style="padding-left:${padding}rem"
              onclick="navigaCartella(${cartella.id})"
              ondragover="dragOverDestinazione(event)"
              ondragleave="dragLeaveDestinazione(event)"
              ondrop="dropSuCartella(event, ${cartella.id})"
              title="${escapeHtml(cartella.percorso)}">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
        </svg>
        ${escapeHtml(cartella.nome)}
      </button>`;

    const figliHtml = children.map(child => renderNodo(child, livello + 1)).join('');
    return self + figliHtml;
  };

  const rootChildren = figliDi('/');
  container.innerHTML = rootChildren.map(c => renderNodo(c, 0)).join('');
}

// ── File/Grid ─────────────────────────────────

async function caricaFile() {
  const grid = document.getElementById('file-grid');
  grid.innerHTML = '<div class="loading-state"><div class="spinner-lg"></div></div>';

  try {
    const dati = await Files.lista(stato.cartellaCorrente);
    const cartelleFiglie = figliDi(stato.percorsoCorrente);
    renderGrid(cartelleFiglie, dati.files);
  } catch (err) {
    toast('Errore nel caricare i file', 'error');
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠</div><p>Errore nel caricamento</p></div>';
  }
}

function renderGrid(cartelle, files) {
  const grid = document.getElementById('file-grid');

  if (cartelle.length === 0 && files.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📂</div>
        <p>Nessun file qui. Carica qualcosa!</p>
      </div>`;
    return;
  }

  const htmlCartelle = cartelle.map(c => `
    <div class="file-card folder-card"
         draggable="true"
         ondblclick="navigaCartella(${c.id})"
         ondragstart="iniziaDragCartella(event, ${c.id})"
         ondragend="fineDrag(event)"
         ondragover="dragOverDestinazione(event)"
         ondragleave="dragLeaveDestinazione(event)"
         ondrop="dropSuCartella(event, ${c.id})">
      <span class="card-icon">📁</span>
      <div class="card-name">${escapeHtml(c.nome)}</div>
      <div class="card-meta">Cartella</div>
      <div class="card-actions">
        <div class="card-action-btn danger" title="Elimina" onclick="eliminaCartella(${c.id}, event)">✕</div>
      </div>
    </div>
  `).join('');

  const htmlFiles = files.map(f => `
    <div class="file-card file-draggable"
         draggable="true"
         ondragstart="iniziaDragFile(event, ${f.id}, '${jsString(f.nome_originale)}')"
         ondragend="fineDrag(event)">
      <span class="card-icon">${iconaFile(f.mimetype)}</span>
      <div class="card-name" title="${escapeHtml(f.nome_originale)}">${escapeHtml(f.nome_originale)}</div>
      <div class="card-meta">${formatBytes(f.dimensione)}</div>
      <div class="card-actions">
        <div class="card-action-btn" title="Scarica" onclick="scaricaFile(${f.id}, '${jsString(f.nome_originale)}', event)">↓</div>
        <div class="card-action-btn" title="Sposta" onclick="apriModalSposta(${f.id}, event)">→</div>
        <div class="card-action-btn danger" title="Elimina" onclick="eliminaFile(${f.id}, event)">✕</div>
      </div>
    </div>
  `).join('');

  grid.innerHTML = htmlCartelle + htmlFiles;
}

// ── Navigazione ───────────────────────────────

function navigaRoot() {
  stato.cartellaCorrente = null;
  stato.percorsoCorrente = '/';
  document.getElementById('section-title').textContent = 'I miei file';
  renderSidebarCartelle();
  aggiornaBreadcrumb();
  caricaFile();
}

function navigaCartella(id) {
  const cartella = trovaCartellaById(id);
  if (!cartella) return;

  stato.cartellaCorrente = cartella.id;
  stato.percorsoCorrente = cartella.percorso;
  document.getElementById('section-title').textContent = cartella.nome;
  renderSidebarCartelle();
  aggiornaBreadcrumb();
  caricaFile();
}

function navigaPercorso(percorso) {
  const p = normalizzaPercorso(percorso);
  if (p === '/') return navigaRoot();
  const cartella = trovaCartellaByPercorso(p);
  if (cartella) navigaCartella(cartella.id);
}

function aggiornaBreadcrumb() {
  const el = document.getElementById('breadcrumb');
  let html = `<span class="drop-root"
               onclick="navigaRoot()"
               ondragover="dragOverDestinazione(event)"
               ondragleave="dragLeaveDestinazione(event)"
               ondrop="dropSuRoot(event)"
               style="cursor:pointer;color:var(--muted);transition:color .15s"
               onmouseover="this.style.color='var(--text)'"
               onmouseout="this.style.color='var(--muted)'">Home</span>`;

  if (stato.percorsoCorrente && stato.percorsoCorrente !== '/') {
    const parti = stato.percorsoCorrente.split('/').filter(Boolean);
    let accum = '';

    parti.forEach((segmento, i) => {
      accum += `/${segmento}`;
      const ultimo = i === parti.length - 1;
      const cartella = trovaCartellaByPercorso(accum);
      html += `<span class="breadcrumb-sep">/</span>`;

      if (ultimo || !cartella) {
        html += `<span>${escapeHtml(segmento)}</span>`;
      } else {
        html += `<span style="cursor:pointer" onclick="navigaCartella(${cartella.id})">${escapeHtml(segmento)}</span>`;
      }
    });
  }

  el.innerHTML = html;
}

// ── Drag & drop: cartelle + file ─────────────

function iniziaDragCartella(event, id) {
  const cartella = trovaCartellaById(id);
  if (!cartella) return;
  stato.elementoTrascinato = {
    type: 'cartella',
    id: cartella.id,
    nome: cartella.nome,
    percorso: cartella.percorso,
  };
  event.dataTransfer.effectAllowed = 'move';
  event.currentTarget.classList.add('dragging');
}

function iniziaDragFile(event, id, nome) {
  stato.elementoTrascinato = { type: 'file', id, nome };
  event.dataTransfer.effectAllowed = 'move';
  event.currentTarget.classList.add('dragging');
}

function fineDrag(event = null) {
  if (event && event.currentTarget) event.currentTarget.classList.remove('dragging');
  stato.elementoTrascinato = null;
  pulisciDropTargets();
}

function dragOverDestinazione(event) {
  if (!stato.elementoTrascinato) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  event.currentTarget.classList.add('drop-target');
}

function dragLeaveDestinazione(event) {
  event.currentTarget.classList.remove('drop-target');
}

async function dropSuCartella(event, cartellaDestId) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove('drop-target');

  const drag = stato.elementoTrascinato;
  if (!drag) return;

  const destinazione = trovaCartellaById(cartellaDestId);
  if (!destinazione) return fineDrag();

  try {
    if (drag.type === 'file') {
      await Files.sposta(drag.id, destinazione.id);
      toast(`File "${drag.nome}" spostato in "${destinazione.nome}"`, 'success');
      await caricaFile();
    } else {
      if (drag.id === destinazione.id) {
        return fineDrag();
      }
      if (destinazione.percorso.startsWith(`${drag.percorso}/`)) {
        toast('Non puoi spostare una cartella dentro una sua sottocartella', 'error');
        return fineDrag();
      }
      await Cartelle.sposta(drag.id, destinazione.percorso);
      toast(`Cartella "${drag.nome}" spostata in "${destinazione.nome}"`, 'success');
      await caricaTutto();
    }
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    fineDrag();
  }
}

async function dropSuRoot(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove('drop-target');

  const drag = stato.elementoTrascinato;
  if (!drag) return;

  try {
    if (drag.type === 'file') {
      await Files.sposta(drag.id, null);
      toast(`File "${drag.nome}" spostato in Home`, 'success');
      await caricaFile();
    } else {
      await Cartelle.sposta(drag.id, '/');
      toast(`Cartella "${drag.nome}" spostata in Home`, 'success');
      await caricaTutto();
    }
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    fineDrag();
  }
}

function pulisciDropTargets() {
  document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
}

// ── Azioni file ───────────────────────────────

async function scaricaFile(id, nome, event) {
  event.stopPropagation();
  try {
    await Files.download(id, nome);
    toast(`Download avviato: ${nome}`, 'success');
  } catch (err) {
    toast('Errore nel download', 'error');
  }
}

async function eliminaFile(id, event) {
  event.stopPropagation();
  if (!confirm('Eliminare questo file? L\'azione è irreversibile.')) return;

  try {
    await Files.elimina(id);
    toast('File eliminato', 'success');
    caricaFile();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function eliminaCartella(id, event) {
  event.stopPropagation();
  if (!confirm('Eliminare questa cartella? Deve essere vuota.')) return;

  try {
    await Cartelle.elimina(id);
    toast('Cartella eliminata', 'success');
    await caricaTutto();
    if (stato.cartellaCorrente === id) navigaRoot();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ── Modali ────────────────────────────────────

function apriModalCartella() {
  document.getElementById('input-nome-cartella').value = '';
  document.getElementById('modal-cartella').classList.add('open');
  setTimeout(() => document.getElementById('input-nome-cartella').focus(), 100);
}

function apriModalUpload() {
  document.getElementById('file-selezionato').style.display = 'none';
  document.getElementById('btn-upload').disabled = true;
  document.getElementById('file-input').value = '';
  document.getElementById('modal-upload').classList.add('open');
}

function apriModalSposta(fileId, event) {
  event.stopPropagation();
  stato.fileDaSpostare = fileId;

  const sel = document.getElementById('select-cartella-dest');
  sel.innerHTML = '<option value="">— Root (nessuna cartella) —</option>';
  stato.tutteLeCartelle.forEach(c => {
    sel.innerHTML += `<option value="${c.id}">${escapeHtml(c.percorso)}</option>`;
  });

  document.getElementById('modal-sposta').classList.add('open');
}

function chiudiModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ── Azioni modali ─────────────────────────────

async function creaCartella() {
  const nome = document.getElementById('input-nome-cartella').value.trim();
  if (!nome) return;

  try {
    await Cartelle.crea(nome, stato.percorsoCorrente);
    chiudiModal('modal-cartella');
    toast(`Cartella "${nome}" creata`, 'success');
    await caricaTutto();
  } catch (err) {
    toast(err.message, 'error');
  }
}

function fileSelezionato(event) {
  const file = event.target.files[0];
  if (!file) return;

  document.getElementById('file-nome').textContent = file.name;
  document.getElementById('file-dim').textContent = formatBytes(file.size);
  document.getElementById('file-selezionato').style.display = 'block';
  document.getElementById('btn-upload').disabled = false;
}

// Drag & drop upload file (modale)
function dragOver(event) {
  event.preventDefault();
  document.getElementById('upload-zone').classList.add('drag-over');
}

function dragLeave() {
  document.getElementById('upload-zone').classList.remove('drag-over');
}

function dropFile(event) {
  event.preventDefault();
  dragLeave();
  const file = event.dataTransfer.files[0];
  if (!file) return;
  const input = document.getElementById('file-input');
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  fileSelezionato({ target: input });
}

async function uploadFile() {
  const file = document.getElementById('file-input').files[0];
  if (!file) return;

  const btn = document.getElementById('btn-upload');
  btn.disabled = true;
  btn.innerHTML = '<span style="display:inline-block;width:16px;height:16px;border:2px solid rgba(10,10,15,.3);border-top-color:#0a0a0f;border-radius:50%;animation:spin .6s linear infinite"></span>';

  try {
    await Files.upload(file, stato.cartellaCorrente);
    chiudiModal('modal-upload');
    toast(`"${file.name}" caricato con successo`, 'success');
    caricaFile();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Carica</span>';
  }
}

async function spostaFileConferma() {
  const destinazione = document.getElementById('select-cartella-dest').value;

  try {
    await Files.sposta(stato.fileDaSpostare, destinazione || null);
    chiudiModal('modal-sposta');
    toast('File spostato', 'success');
    caricaFile();
  } catch (err) {
    toast(err.message, 'error');
  }
}

function logout() {
  Auth.logout();
}

// ── Utilities ─────────────────────────────────

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function iconaFile(mimetype) {
  if (!mimetype) return '📄';
  if (mimetype.startsWith('image/')) return '🖼';
  if (mimetype === 'application/pdf') return '📕';
  if (mimetype.includes('zip')) return '🗜';
  if (mimetype.includes('word')) return '📝';
  if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊';
  if (mimetype.startsWith('text/')) return '📃';
  return '📄';
}

function toast(messaggio, tipo = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.innerHTML = `<span>${tipo === 'success' ? '✓' : '⚠'}</span> ${messaggio}`;
  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    el.style.transition = 'all 0.2s';
    setTimeout(() => el.remove(), 200);
  }, 3000);
}
