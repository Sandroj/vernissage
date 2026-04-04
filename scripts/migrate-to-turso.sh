#!/bin/bash
# Exporteer lokale SQLite database naar Turso
#
# Vereisten:
#   brew install turso
#   turso auth login
#
# Gebruik:
#   bash scripts/migrate-to-turso.sh arttracker

DB_NAME=${1:-arttracker}

echo "📦 Exporteren lokale database naar Turso database: $DB_NAME"
echo ""

# Check of turso CLI beschikbaar is
if ! command -v turso &> /dev/null; then
  echo "Turso CLI niet gevonden. Installeer via:"
  echo "  brew install turso"
  exit 1
fi

# Maak database aan (negeert fout als al bestaat)
turso db create $DB_NAME 2>/dev/null || echo "Database bestaat al, doorgaan..."

# Haal URL en token op
TURSO_URL=$(turso db show $DB_NAME --url)
TURSO_TOKEN=$(turso db tokens create $DB_NAME)

echo "TURSO_DATABASE_URL=$TURSO_URL"
echo "TURSO_AUTH_TOKEN=$TURSO_TOKEN"
echo ""

# Push de SQLite database naar Turso
echo "⬆️  Database uploaden naar Turso..."
turso db shell $DB_NAME < dev.db 2>/dev/null || {
  # Alternatief: gebruik dump en import
  sqlite3 dev.db .dump > /tmp/arttracker_dump.sql
  turso db shell $DB_NAME < /tmp/arttracker_dump.sql
  rm /tmp/arttracker_dump.sql
}

echo ""
echo "✅ Klaar! Voeg dit toe aan je Vercel environment variables:"
echo ""
echo "  TURSO_DATABASE_URL=$TURSO_URL"
echo "  TURSO_AUTH_TOKEN=$TURSO_TOKEN"
