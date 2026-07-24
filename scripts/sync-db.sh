#!/bin/bash
# Copia la base de datos de production a testing.
# Requiere: .env.sync en la raíz del proyecto con PROD_DB_URL y TEST_DB_URL
# Uso: bash scripts/sync-db.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.sync"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: No se encontró .env.sync en la raíz del proyecto."
  echo "Creá el archivo con:"
  echo "  PROD_DB_URL=postgresql://..."
  echo "  TEST_DB_URL=postgresql://..."
  exit 1
fi

source "$ENV_FILE"

if [ -z "$PROD_DB_URL" ] || [ -z "$TEST_DB_URL" ]; then
  echo "ERROR: PROD_DB_URL o TEST_DB_URL no están definidas en .env.sync"
  exit 1
fi

echo "⚠️  Esto va a SOBREESCRIBIR la base de datos de testing con los datos de production."
read -p "¿Confirmás? (s/N): " confirm
if [[ "$confirm" != "s" && "$confirm" != "S" ]]; then
  echo "Cancelado."
  exit 0
fi

DUMP_FILE="/tmp/prod_dump_$(date +%Y%m%d_%H%M%S).dump"

echo "→ Exportando production..."
pg_dump -Fc "$PROD_DB_URL" -f "$DUMP_FILE"

echo "→ Restaurando en testing..."
pg_restore --clean --if-exists --no-owner --no-privileges -d "$TEST_DB_URL" "$DUMP_FILE"

rm -f "$DUMP_FILE"
echo "✓ Sync completo. Testing ahora tiene los datos de production."
