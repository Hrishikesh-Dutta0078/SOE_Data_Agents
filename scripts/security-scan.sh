#!/usr/bin/env bash
# security-scan.sh — StormBreaker-compatible security scanning script
# Runs StormBreaker Heimdall (if available) + npm audit + custom secret scanner
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPORTS_DIR="$PROJECT_DIR/reports"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
STORMBREAKER_BIN="/tmp/stormbreaker/target/release/stormbreaker"

mkdir -p "$REPORTS_DIR/preflight"

echo "=== Auto Agents Security Scan ==="
echo "Timestamp: $TIMESTAMP"
echo "Project: $PROJECT_DIR"
echo ""

# --- Phase 1: StormBreaker Heimdall (if available) ---
if [ -x "$STORMBREAKER_BIN" ]; then
  echo "[1/4] Running StormBreaker Heimdall scan..."
  "$STORMBREAKER_BIN" heimdall --tool all -p "$PROJECT_DIR" -o "$REPORTS_DIR" 2>&1 || true
  echo "  Heimdall results in $REPORTS_DIR/preflight/"
else
  echo "[1/4] StormBreaker not found at $STORMBREAKER_BIN — skipping Heimdall"
fi
echo ""

# --- Phase 2: npm audit ---
echo "[2/4] Running npm audit..."
cd "$PROJECT_DIR/server"
npm audit --json > "$REPORTS_DIR/npm_audit-$TIMESTAMP.json" 2>/dev/null || true
CRITICAL=$(node -e "const a=require('$REPORTS_DIR/npm_audit-$TIMESTAMP.json'); console.log(a.metadata?.vulnerabilities?.critical||0)" 2>/dev/null || echo "?")
HIGH=$(node -e "const a=require('$REPORTS_DIR/npm_audit-$TIMESTAMP.json'); console.log(a.metadata?.vulnerabilities?.high||0)" 2>/dev/null || echo "?")
echo "  Critical: $CRITICAL | High: $HIGH"
echo "  Full report: $REPORTS_DIR/npm_audit-$TIMESTAMP.json"
echo ""

# --- Phase 3: Custom secret scanner ---
echo "[3/4] Running Heimdall-style secret scanner..."
cd "$PROJECT_DIR"
node scripts/secretScan.js --path "$PROJECT_DIR" > "$REPORTS_DIR/preflight/secretScan-$TIMESTAMP.txt" 2>&1 || true
echo "  Results in $REPORTS_DIR/preflight/secretScan-$TIMESTAMP.txt"
echo ""

# --- Phase 4: Security unit tests ---
echo "[4/4] Running security unit tests..."
cd "$PROJECT_DIR/server"
node --test "tests/security/*.test.js" 2>&1 | tail -10
echo ""

echo "=== Scan Complete ==="
