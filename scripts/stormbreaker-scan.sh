#!/usr/bin/env bash
# stormbreaker-scan.sh — StormBreaker-compatible external security tool orchestrator
# Runs SAST, SCA, Secrets, and SBOM tools in priority waves (P0 → P4)
# See: docs/superpowers/specs/2026-03-16-stormbreaker-security-scan-design.md

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPORTS_DIR="$PROJECT_DIR/reports/stormbreaker"
INSTALL_DIR="$HOME/.local/bin"
DEBUG_LOG="$REPORTS_DIR/stormbreaker_debug.log"
TIMEOUT_SECS=300

# Platform detection
case "$(uname -s)" in
  MINGW*|MSYS*) PLATFORM="windows" ;;
  Darwin*)      PLATFORM="macos"   ;;
  *)            PLATFORM="linux"   ;;
esac
ARCH=$(uname -m)

# Normalize arch
case "$ARCH" in
  x86_64|amd64) ARCH_NAME="amd64" ;;
  arm64|aarch64) ARCH_NAME="arm64" ;;
  *)             ARCH_NAME="$ARCH" ;;
esac

# OS name for GitHub release assets
case "$PLATFORM" in
  windows) OS_NAME="windows" ;;
  macos)   OS_NAME="darwin"  ;;
  linux)   OS_NAME="linux"   ;;
esac

# State tracking
NO_INSTALL=0
SELECTED_WAVES="all"
declare -a RESULTS=()   # "wave|tool|status|findings"
declare -a SKIPPED=()

# --- Usage ---
usage() {
  cat <<'USAGE'
Usage: stormbreaker-scan.sh [OPTIONS]

StormBreaker-compatible external security tool orchestrator.
Runs SAST, SCA, Secrets, and SBOM tools in priority waves.

Options:
  --wave WAVES    Comma-separated waves to run: p0,p1,p2,p4,all (default: all)
  --no-install    Skip auto-install of missing tools; only run what's on PATH
  --help          Show this help message

Waves:
  p0  semgrep (SAST), trufflehog (Secrets)
  p1  trivy (SCA)
  p2  bearer (SAST/Data), osv-scanner (SCA)
  p4  syft (SBOM), bomber (SBOM), depscan (SCA)

Examples:
  bash scripts/stormbreaker-scan.sh              # Run all waves
  bash scripts/stormbreaker-scan.sh --wave p0    # P0 only
  bash scripts/stormbreaker-scan.sh --wave p0,p1 # P0 + P1
  bash scripts/stormbreaker-scan.sh --no-install # Skip auto-install

Reports are written to: reports/stormbreaker/
USAGE
  exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --wave)
      if [[ -z "${2:-}" ]]; then
        echo "Error: --wave requires an argument (e.g., --wave p0,p1)"
        exit 1
      fi
      SELECTED_WAVES="$2"
      shift 2
      ;;
    --no-install)
      NO_INSTALL=1
      shift
      ;;
    --help|-h)
      usage
      ;;
    *)
      echo "Unknown option: $1"
      usage
      ;;
  esac
done

# --- Setup ---
mkdir -p "$REPORTS_DIR"
[[ -d "$INSTALL_DIR" ]] || mkdir -p "$INSTALL_DIR"

# Ensure ~/.local/bin is on PATH
case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *) export PATH="$INSTALL_DIR:$PATH" ;;
esac

# Init debug log
echo "=== StormBreaker Scan Debug Log ===" > "$DEBUG_LOG"
echo "Timestamp: $(date -Iseconds 2>/dev/null || date)" >> "$DEBUG_LOG"
echo "Platform: $PLATFORM | Arch: $ARCH_NAME" >> "$DEBUG_LOG"
echo "No-install: $NO_INSTALL | Waves: $SELECTED_WAVES" >> "$DEBUG_LOG"
echo "" >> "$DEBUG_LOG"

echo "=== StormBreaker External Security Scan ==="
echo "Platform: $PLATFORM ($ARCH_NAME)"
echo "Reports:  $REPORTS_DIR"
echo "Waves:    $SELECTED_WAVES"
echo ""
