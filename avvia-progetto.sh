#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

AUTH_DIR="$SCRIPT_DIR/Autentication Server"
FILE_DIR="$SCRIPT_DIR/File server"

echo "🔐 Inserisci la password per continuare..."
sudo -v || exit 1

# 🔥 Pulizia porte
echo "🧹 Pulizia porte..."
lsof -ti :3000 | xargs kill -9 2>/dev/null
lsof -ti :4000 | xargs kill -9 2>/dev/null

# Controlli
if [ ! -d "$AUTH_DIR" ]; then
  echo "❌ Cartella auth-server non trovata"
  exit 1
fi

if [ ! -d "$FILE_DIR" ]; then
  echo "❌ Cartella file-server non trovata"
  exit 1
fi

if ! command -v node &> /dev/null; then
  echo "❌ Node.js non trovato"
  exit 1
fi

# Avvio MySQL
echo "🚀 Avvio MySQL... e Apache per phpmyadmin"
sudo /Applications/XAMPP/xamppfiles/xampp start

# 🔥 Attesa reale
echo "⏳ Attendo XAMPP..."
sleep 5

# Auth Server
echo "🚀 Avvio Auth Server..."
cd "$AUTH_DIR" || exit
node server.js &
AUTH_PID=$!

sleep 2

# File Server
echo "📁 Avvio File Server..."
cd "$FILE_DIR" || exit
node server.js &
FILE_PID=$!

sleep 2

# Browser
echo "🌐 Apro browser..."
open http://localhost:4000

echo "✅ Tutti i server avviati!"
echo "Auth PID: $AUTH_PID"
echo "File PID: $FILE_PID"

# Stop pulito
trap "echo '🛑 Stop server...'; kill $AUTH_PID $FILE_PID; exit" SIGINT

echo ""
echo "🟡 Server avviati correttamente"
echo "👉 Scrivi 'kill' e premi INVIO per fermare tutto"

while true; do
  read INPUT

  if [ "$INPUT" = "kill" ]; then
    echo "🛑 Arresto server in corso..."

    kill $AUTH_PID 2>/dev/null
    kill $FILE_PID 2>/dev/null

    echo "✅ Server fermati"

    echo "🛑 Stop MySQL..."
    sudo /Applications/XAMPP/xamppfiles/xampp stopmysql

    exit 0
  fi

  echo "⚠️ Comando non valido. Scrivi 'kill' per terminare"
done