-- Crea il database
CREATE DATABASE IF NOT EXISTS files_db;
USE files_db;

-- Tabella cartelle
-- percorso: path logico completo della cartella (es. /Documenti/Scuola)
CREATE TABLE IF NOT EXISTS cartelle (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(100)  NOT NULL,
  utente_id   INT           NOT NULL,
  percorso    VARCHAR(500)  NOT NULL,
  creata_il   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cartella_percorso_utente (utente_id, percorso)
);

-- Tabella files
CREATE TABLE IF NOT EXISTS files (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nome_originale  VARCHAR(255)  NOT NULL,
  nome_salvato    VARCHAR(255)  NOT NULL,
  dimensione      INT           NOT NULL,
  mimetype        VARCHAR(100),
  utente_id       INT           NOT NULL,
  cartella_id     INT           DEFAULT NULL,
  caricato_il     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cartella_id) REFERENCES cartelle(id)
);

-- Indici per velocizzare le query più frequenti
CREATE INDEX idx_files_utente    ON files(utente_id);
CREATE INDEX idx_files_cartella  ON files(cartella_id);
CREATE INDEX idx_cartelle_utente ON cartelle(utente_id);
CREATE INDEX idx_cartelle_percorso ON cartelle(percorso);
