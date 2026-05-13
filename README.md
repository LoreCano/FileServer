# FileVault

> Fileserver con autenticazione JWT su architettura a due server separati.  
> Progetto per l'esame di maturità — ITIS Informatica, classe 5°.

---

## Indice

- [Descrizione](#descrizione)
- [Tecnologie utilizzate](#tecnologie-utilizzate)
- [Installazione avvio e configurazione](#installazione-avvio-e-configurazione)
- [API Reference](#api-reference)
- [Funzionalità](#funzionalità)
- [Come funziona JWT](#come-funziona-jwt)

---

## Descrizione

FileVault è un web service che permette di **caricare, organizzare, scaricare ed eliminare file** in modo sicuro tramite un'interfaccia web moderna.

Il progetto presenta due server Node.js separati che comunicano tra loro tramite API REST:

- **Auth Server** — gestisce registrazione, login e verifica dei token JWT
- **File Server** — gestisce tutte le operazioni sui file, verificando l'identità dell'utente tramite l'auth server

---

**Flusso di autenticazione:**

1. L'utente fa login → l'auth server restituisce un **token JWT**
2. Il frontend salva il token nel `localStorage`
3. Ad ogni richiesta al file server, il token viene inviato nell'header `Authorization`
4. Il file server chiama l'auth server per **verificare il token**
5. Solo se il token è valido, l'operazione viene eseguita

---

## Tecnologie utilizzate

| Componente | Tecnologia |
|---|---|
| Backend | Node.js + Express |
| Database | MySQL  |
| Autenticazione | JWT  |
| Password | bcrypt  |
| Upload file | Multer |
| Comunicazione inter-server | Axios |
| Frontend | HTML + CSS + JavaScript |

---


## Installazione avvio e configurazione

### 1. Crea i database

Esegui i file `database.sql` che trovi in `Autentication Server` e `File Server`.

---

### 2. Configura e avvia l'Authentication Server

Avviare mysql per poter usare auth_db.
```bash
cd Autentication Server
npm install
node server.js
```

---

### 3. Configura e avvia il File Server

Avviare mysql per poter usare file_db.
```bash
cd File Server
npm install
node server.js
```

---

## API Reference

### Autentication Server

| Metodo | Endpoint | Descrizione 
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Registra un nuovo utente |
| `POST` | `/api/auth/login` | Login, restituisce JWT |
| `POST` | `/api/auth/verify` | Verifica un token JWT |


---

### File Server

Tutte le route richiedono l'header: `Authorization: Bearer <token>`

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/files/:cartella_id?` | Lista file  |
| `POST` | `/api/files/upload` | Carica un file (FormData) |
| `GET` | `/api/files/:id/download` | Scarica un file |
| `PATCH` | `/api/files/:id/sposta` | Sposta file in altra cartella |
| `DELETE` | `/api/files/:id` | Elimina un file |
| `GET` | `/api/cartelle` | Lista tutte le cartelle |
| `POST` | `/api/cartelle` | Crea una cartella |
| `DELETE` | `/api/cartelle/:id` | Elimina una cartella (solo se vuota) |

---

## Funzionalità

- Registrazione e login utente
- Autenticazione con token JWT (scadenza 24h)
- Caricamento file (max 50MB) con drag & drop
- Download file
- Eliminazione file
- Creazione cartelle
- Spostamento file tra cartelle
- Eliminazione cartelle (solo se vuote)
- Interfaccia web responsive

**Tipi di file supportati:** immagini (JPG, PNG, GIF, WebP), PDF, testo, CSV, ZIP, documenti Word/Excel.

---

## Come funziona JWT

JWT (JSON Web Token) è il meccanismo che permette ai due server di comunicare in modo sicuro.

```
1. LOGIN
   Frontend → POST /login → Auth Server
                                │
                           genera token JWT
                                │
   Frontend ← { token } ────────┘
   
2. OGNI RICHIESTA AL FILE SERVER  
   Frontend → GET /api/files
              Header: Authorization: Bearer <token>
                                │
                         File Server riceve il token
                                │
                         POST /api/auth/verify → Auth Server
                                                      │
                                                 token valido?
                                                 sì → { utente }
                                                 no → 401
```

Il token contiene l'ID e l'email dell'utente, è firmato con una chiave segreta e scade dopo 24 ore. Non viene mai salvato nel database — la verifica avviene controllando la firma crittografica.

---