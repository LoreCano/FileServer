// ─────────────────────────────────────────────
// auth.js — Logica della pagina di login
// ─────────────────────────────────────────────

// Se l'utente è già loggato, va direttamente alla dashboard
if (Auth.isLoggato()) {
  window.location.href = 'dashboard.html';
}

// Alterna tra tab Login e Registrazione
function showTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.form').forEach(f => f.classList.remove('active'));

  document.querySelector(`.tab-btn[onclick="showTab('${tab}')"]`).classList.add('active');
  document.getElementById(`form-${tab}`).classList.add('active');
}

// Mostra un messaggio di errore o successo nel form
function showAlert(formId, messaggio, tipo = 'error') {
  const el = document.getElementById(`${formId}-alert`);
  el.textContent = messaggio;
  el.className = `alert ${tipo}`;
}

function hideAlert(formId) {
  const el = document.getElementById(`${formId}-alert`);
  el.className = 'alert';
}

// ── Handler Login ──────────────────────────────
async function handleLogin(event) {
  event.preventDefault(); // blocca il reload della pagina
  hideAlert('login');

  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn      = document.getElementById('btn-login');

  // Mostra spinner sul bottone
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    await Auth.login(email, password);
    // Login ok — vai alla dashboard
    window.location.href = 'dashboard.html';

  } catch (err) {
    showAlert('login', err.message);
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

// ── Handler Registrazione ──────────────────────
async function handleRegister(event) {
  event.preventDefault();
  hideAlert('register');

  const nome     = document.getElementById('reg-nome').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const btn      = document.getElementById('btn-register');

  // Validazione lato client (prima ancora di chiamare il server)
  let valido = true;

  if (nome.length < 2) {
    document.getElementById('err-nome').textContent = 'Inserisci il tuo nome';
    document.getElementById('err-nome').classList.add('visible');
    valido = false;
  } else {
    document.getElementById('err-nome').classList.remove('visible');
  }

  if (password.length < 6) {
    document.getElementById('err-password').textContent = 'La password deve essere di almeno 6 caratteri';
    document.getElementById('err-password').classList.add('visible');
    valido = false;
  } else {
    document.getElementById('err-password').classList.remove('visible');
  }

  if (!valido) return;

  btn.classList.add('loading');
  btn.disabled = true;

  try {
    await Auth.register(nome, email, password);

    // Registrazione ok — mostra messaggio e passa al login
    showAlert('register', 'Account creato! Ora puoi accedere.', 'success');

    setTimeout(() => {
      showTab('login');
      document.getElementById('login-email').value = email;
    }, 1500);

  } catch (err) {
    showAlert('register', err.message);
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}
