#!/usr/bin/env bash

# Wrapper that reads DB vars from server/.env and launches the MSSQL MCP server.
# Maps DB_* vars to the env vars @connorbritain/mssql-mcp-server expects.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../server/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found" >&2
  exit 1
fi

# Read only the DB_* vars from .env and map to MCP server env vars
while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  # Strip carriage returns (Windows CRLF) and surrounding quotes
  key="${key//$'\r'/}"
  value="${value//$'\r'/}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  case "$key" in
    DB_SERVER)            export SERVER_NAME="$value" ;;
    DB_DATABASE)          export DATABASE_NAME="$value" ;;
    DB_USER)              export SQL_USERNAME="$value" ;;
    DB_PASSWORD)          export SQL_PASSWORD="$value" ;;
  esac
done < "$ENV_FILE"

export SQL_AUTH_MODE="sql"

exec npx -y @connorbritain/mssql-mcp-server@0.5.2
