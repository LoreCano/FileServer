-- Crea il database
CREATE DATABASE IF NOT EXISTS auth_db;
USE auth_db;

-- Tabella utenti
CREATE TABLE IF NOT EXISTS utenti (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(100)  NOT NULL,
  email       VARCHAR(100)  NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,
  creato_il   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- Indice sull'email per velocizzare le query di login
CREATE INDEX idx_email ON utenti(email);
