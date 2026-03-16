# StormBreaker External Security Scan — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `scripts/stormbreaker-scan.sh` — a unified runner for 8 external security tools with auto-install, wave-based execution, and terminal summary reporting.

**Architecture:** A single bash script with modular functions: platform detection, tool install helpers (pipx + GitHub release binaries), wave functions grouping tools by priority, and a summary reporter. Integrates optionally into existing `security-scan.sh` via a Phase 5 hook.

**Tech Stack:** Bash, curl, Node.js (for JSON parsing), pipx/pip (Python tools), GitHub Releases API

**Spec:** `docs/superpowers/specs/2026-03-16-stormbreaker-security-scan-design.md`

---

## Chunk 1: Script Foundation

### Task 1: Script skeleton — config, platform detection, arg parsing

**Files:**
- Create: `scripts/stormbreaker-scan.sh`

- [ ] **Step 1: Create the script with shebang, config, and platform detection**

```bash
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
```

- [ ] **Step 2: Add arg parsing and --help**

Append to the same file, after the state tracking block:

```bash
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
```

- [ ] **Step 3: Add directory setup and header output**

Append after arg parsing:

```bash
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
```

- [ ] **Step 4: Verify the skeleton runs**

Run: `bash scripts/stormbreaker-scan.sh --help`
Expected: Usage text printed, exit 0.

Run: `bash scripts/stormbreaker-scan.sh --wave p0 --no-install`
Expected: Header prints with "Platform: windows (amd64)", "Waves: p0", then exits (no waves wired yet).

- [ ] **Step 5: Commit**

```bash
git add scripts/stormbreaker-scan.sh
git commit -m "feat(security): add stormbreaker-scan.sh skeleton with arg parsing"
```

---

### Task 2: Core helper functions

**Files:**
- Modify: `scripts/stormbreaker-scan.sh`

- [ ] **Step 1: Add logging helpers**

Insert after the header output block, before any wave functions:

```bash
# --- Logging ---
log_info()  { echo "  $*"; }
log_warn()  { echo "  [WARN] $*"; }
log_debug() { echo "$*" >> "$DEBUG_LOG"; }
```

- [ ] **Step 2: Add run_with_timeout**

```bash
# --- Timeout ---
# Bash-native timeout (no GNU timeout on MINGW64)
# Uses setsid (if available) to create a process group so child processes are also killed.
run_with_timeout() {
  local secs=$1; shift
  if command -v setsid &>/dev/null; then
    setsid "$@" &
  else
    "$@" &
  fi
  local pid=$!
  ( sleep "$secs" && kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null ) &
  local watchdog=$!
  wait "$pid" 2>/dev/null
  local rc=$?
  kill "$watchdog" 2>/dev/null
  wait "$watchdog" 2>/dev/null
  return $rc
}
```

- [ ] **Step 3: Add ensure_pipx**

```bash
# --- Python tool installer ---
PIPX_CMD=""
ensure_pipx() {
  if command -v pipx &>/dev/null; then
    PIPX_CMD="pipx"
    return 0
  elif command -v pip3 &>/dev/null; then
    PIPX_CMD="pip3 install --user"
    log_warn "pipx not found, falling back to pip3 install --user"
    return 0
  elif command -v pip &>/dev/null; then
    PIPX_CMD="pip install --user"
    log_warn "pipx not found, falling back to pip install --user"
    return 0
  else
    log_warn "Neither pipx nor pip found. Python-based tools will be skipped."
    log_warn "Install pipx: https://pipx.pypa.io/stable/installation/"
    return 1
  fi
}
```

- [ ] **Step 4: Add install_github_release**

```bash
# --- GitHub release binary installer ---
# Usage: install_github_release <org/repo> <binary_name> <asset_pattern>
# asset_pattern uses {TAG}, {OS}, {ARCH} as placeholders
install_github_release() {
  local repo=$1
  local binary=$2
  local asset_pattern=$3
  local dest="$INSTALL_DIR"

  log_info "Installing $binary from github.com/$repo ..."
  log_debug "install_github_release: repo=$repo binary=$binary pattern=$asset_pattern"

  # Fetch latest release tag
  local tag
  tag=$(curl -sL "https://api.github.com/repos/${repo}/releases/latest" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).tag_name)}catch(e){console.error(e);process.exit(1)}})" 2>>"$DEBUG_LOG")

  if [[ -z "$tag" ]]; then
    log_warn "Failed to fetch latest release for $repo"
    return 1
  fi

  log_debug "  Latest tag: $tag"

  # Build asset URL from pattern
  local tag_no_v="${tag#v}"
  local asset_name="${asset_pattern}"
  asset_name="${asset_name//\{TAG\}/$tag_no_v}"
  asset_name="${asset_name//\{OS\}/$OS_NAME}"
  asset_name="${asset_name//\{ARCH\}/$ARCH_NAME}"

  local url="https://github.com/${repo}/releases/download/${tag}/${asset_name}"
  log_debug "  Download URL: $url"

  # Download and extract
  local tmp_dir
  tmp_dir=$(mktemp -d)
  if curl -sL "$url" -o "$tmp_dir/$asset_name" 2>>"$DEBUG_LOG"; then
    case "$asset_name" in
      *.tar.gz|*.tgz)
        tar xzf "$tmp_dir/$asset_name" -C "$tmp_dir" 2>>"$DEBUG_LOG"
        ;;
      *.zip)
        unzip -o "$tmp_dir/$asset_name" -d "$tmp_dir" 2>>"$DEBUG_LOG"
        ;;
      *)
        # Plain binary (e.g., osv-scanner)
        mv "$tmp_dir/$asset_name" "$tmp_dir/$binary"
        ;;
    esac

    # Find the binary in extracted files and move to dest
    # Use bash globbing instead of find to avoid Windows find.exe collision on MINGW64
    local found=""
    for f in "$tmp_dir/$binary" "$tmp_dir/${binary}.exe" "$tmp_dir"/*/"$binary" "$tmp_dir"/*/"${binary}.exe"; do
      [[ -f "$f" ]] && found="$f" && break
    done
    if [[ -n "$found" ]]; then
      cp "$found" "$dest/$binary"
      chmod +x "$dest/$binary"
      log_info "Installed $binary ($tag) to $dest/"
    else
      log_warn "Could not find $binary in downloaded release"
      rm -rf "$tmp_dir"
      return 1
    fi
  else
    log_warn "Failed to download $url"
    rm -rf "$tmp_dir"
    return 1
  fi

  rm -rf "$tmp_dir"
  return 0
}
```

- [ ] **Step 5: Add ensure_tool**

```bash
# --- Tool availability check + auto-install ---
# Usage: ensure_tool <tool_name> <install_function>
# Returns 0 if tool is available, 1 if skipped
ensure_tool() {
  local tool=$1
  local install_fn=$2

  # Special case: semgrep on Windows checks WSL
  if [[ "$tool" == "semgrep" && "$PLATFORM" == "windows" ]]; then
    if command -v wsl &>/dev/null && wsl which semgrep &>/dev/null 2>&1; then
      return 0
    fi
  elif command -v "$tool" &>/dev/null; then
    return 0
  fi

  # Tool not found — try install
  if [[ "$NO_INSTALL" -eq 1 ]]; then
    log_warn "$tool not found (--no-install set, skipping)"
    SKIPPED+=("$tool")
    return 1
  fi

  log_info "$tool not found. Attempting auto-install..."
  if $install_fn; then
    # Verify it's now available
    if [[ "$tool" == "semgrep" && "$PLATFORM" == "windows" ]]; then
      if command -v wsl &>/dev/null && wsl which semgrep &>/dev/null 2>&1; then
        return 0
      fi
    elif command -v "$tool" &>/dev/null; then
      return 0
    fi
  fi

  log_warn "Failed to install $tool. Skipping."
  SKIPPED+=("$tool")
  return 1
}
```

- [ ] **Step 6: Add per-tool install functions**

```bash
# --- Per-tool install functions ---

install_semgrep() {
  if [[ "$PLATFORM" == "windows" ]]; then
    if ! command -v wsl &>/dev/null; then
      log_warn "semgrep requires WSL on Windows. Install WSL to enable."
      return 1
    fi
    log_info "Installing semgrep in WSL..."
    wsl pip install semgrep 2>>"$DEBUG_LOG" || wsl pip3 install semgrep 2>>"$DEBUG_LOG"
  else
    ensure_pipx || return 1
    if [[ "$PIPX_CMD" == "pipx" ]]; then
      pipx install semgrep 2>>"$DEBUG_LOG"
    else
      $PIPX_CMD semgrep 2>>"$DEBUG_LOG"
    fi
  fi
}

install_trufflehog() {
  install_github_release "trufflesecurity/trufflehog" "trufflehog" \
    "trufflehog_{TAG}_{OS}_{ARCH}.tar.gz"
}

install_trivy() {
  # Trivy uses slightly different naming: trivy_0.58.0_Linux-64bit.tar.gz
  local os_trivy
  case "$PLATFORM" in
    windows) os_trivy="Windows" ;;
    macos)   os_trivy="macOS"   ;;
    linux)   os_trivy="Linux"   ;;
  esac
  local arch_trivy
  case "$ARCH_NAME" in
    amd64) arch_trivy="64bit"  ;;
    arm64) arch_trivy="ARM64"  ;;
    *)     arch_trivy="64bit"  ;;
  esac
  install_github_release "aquasecurity/trivy" "trivy" \
    "trivy_{TAG}_${os_trivy}-${arch_trivy}.tar.gz"
}

install_bearer() {
  log_info "Installing bearer via install script..."
  curl -sfL https://raw.githubusercontent.com/Bearer/bearer/v1.46.0/contrib/install.sh \
    | sh -s -- -b "$INSTALL_DIR" 2>>"$DEBUG_LOG"
}

install_osv_scanner() {
  # osv-scanner releases: osv-scanner_1.9.1_linux_amd64 (no extension, plain binary)
  # Also available as .tar.gz on some versions — check for plain binary first
  install_github_release "google/osv-scanner" "osv-scanner" \
    "osv-scanner_{TAG}_{OS}_{ARCH}"
}

install_syft() {
  log_info "Installing syft via install script..."
  curl -sSfL https://raw.githubusercontent.com/anchore/syft/v1.20.0/install.sh \
    | sh -s -- -b "$INSTALL_DIR" 2>>"$DEBUG_LOG"
}

install_bomber() {
  install_github_release "devops-kung-fu/bomber" "bomber" \
    "bomber_{TAG}_{OS}_{ARCH}.tar.gz"
}

install_depscan() {
  ensure_pipx || return 1
  if [[ "$PIPX_CMD" == "pipx" ]]; then
    pipx install owasp-depscan 2>>"$DEBUG_LOG"
  else
    $PIPX_CMD owasp-depscan 2>>"$DEBUG_LOG"
  fi
}
```

- [ ] **Step 7: Verify helpers compile (no syntax errors)**

Run: `bash -n scripts/stormbreaker-scan.sh`
Expected: No output (syntax OK).

- [ ] **Step 8: Commit**

```bash
git add scripts/stormbreaker-scan.sh
git commit -m "feat(security): add core helper functions — install, timeout, platform detection"
```

---

### Task 3: Finding count extraction and summary reporter

**Files:**
- Modify: `scripts/stormbreaker-scan.sh`

- [ ] **Step 1: Add extract_count function**

Append after the install functions:

```bash
# --- Finding count extraction ---
# Each tool outputs different JSON. Uses fs.readFileSync (not require) for MINGW64 path compat.
# Helper: read_json wraps the common fs.readFileSync pattern.
read_json_node() {
  local file=$1
  local expr=$2
  node -e "const fs=require('fs');try{const d=JSON.parse(fs.readFileSync('$file','utf8'));console.log($expr)}catch(e){console.log('?')}" 2>/dev/null || echo "?"
}

extract_count() {
  local tool=$1
  local file=$2

  if [[ ! -f "$file" ]]; then
    echo "?"
    return
  fi

  case "$tool" in
    semgrep)
      read_json_node "$file" "d.results?.length ?? 0"
      ;;
    trufflehog)
      # JSONL format: one JSON object per line
      wc -l < "$file" 2>/dev/null | tr -d ' ' || echo "?"
      ;;
    trivy)
      read_json_node "$file" "(d.Results||[]).reduce((s,r)=>s+(r.Vulnerabilities?.length||0),0)"
      ;;
    bearer)
      read_json_node "$file" "d.findings?.length ?? 0"
      ;;
    osv-scanner)
      read_json_node "$file" "(d.results||[]).reduce((s,r)=>s+r.packages.reduce((ps,p)=>ps+p.vulnerabilities.length,0),0)"
      ;;
    syft)
      # SBOM — report artifact count, not findings
      read_json_node "$file" "(d.artifacts?.length??0)+' artifacts'"
      ;;
    bomber)
      read_json_node "$file" "(d.packages||[]).filter(p=>p.vulnerabilities?.length>0).length"
      ;;
    depscan)
      read_json_node "$file" "Array.isArray(d)?d.length:0"
      ;;
    *)
      echo "?"
      ;;
  esac
}
```

- [ ] **Step 2: Add run_tool wrapper**

```bash
# --- Run a scan tool ---
# Usage: run_tool <wave> <tool_name> <output_file> <command...>
run_tool() {
  local wave=$1
  local tool=$2
  local output_file=$3
  shift 3

  echo ""
  echo "[$wave] Running $tool..."
  log_debug "run_tool: $tool -> $output_file"
  log_debug "  command: $*"

  local rc=0
  run_with_timeout "$TIMEOUT_SECS" "$@" 2>>"$DEBUG_LOG" || rc=$?

  if [[ $rc -eq 137 || $rc -eq 143 ]]; then
    log_warn "$tool timed out after ${TIMEOUT_SECS}s"
    RESULTS+=("$wave|$tool|TIMEOUT|—")
    return
  fi

  local count
  count=$(extract_count "$tool" "$output_file")

  if [[ $rc -eq 0 && ( "$count" == "0" || "$count" == "0 artifacts" ) ]]; then
    RESULTS+=("$wave|$tool|PASS|$count")
  elif [[ $rc -eq 0 ]]; then
    # Some tools exit 0 even with findings
    RESULTS+=("$wave|$tool|WARN|$count")
  else
    # Non-zero exit usually means findings found
    RESULTS+=("$wave|$tool|WARN|$count")
  fi

  log_info "$tool complete — $count findings (exit $rc)"
  log_info "Report: $output_file"
}
```

- [ ] **Step 3: Add print_summary**

```bash
# --- Summary ---
print_summary() {
  local total=0 pass=0 warn=0 timeout=0 skipped_count=${#SKIPPED[@]}

  echo ""
  echo "+------------------------------------------------+"
  echo "|          StormBreaker Scan Summary              |"
  echo "+------+--------------+---------+----------------+"
  printf "| %-4s | %-12s | %-7s | %-14s |\n" "Wave" "Tool" "Status" "Findings"
  echo "+------+--------------+---------+----------------+"

  for entry in "${RESULTS[@]}"; do
    IFS='|' read -r wave tool status findings <<< "$entry"
    printf "| %-4s | %-12s | %-7s | %-14s |\n" "$wave" "$tool" "$status" "$findings"
    total=$((total + 1))
    case "$status" in
      PASS)    pass=$((pass + 1))    ;;
      WARN)    warn=$((warn + 1))    ;;
      TIMEOUT) timeout=$((timeout + 1)) ;;
    esac
  done

  for tool in "${SKIPPED[@]}"; do
    printf "| %-4s | %-12s | %-7s | %-14s |\n" "—" "$tool" "SKIPPED" "not installed"
  done

  echo "+------+--------------+---------+----------------+"
  printf "| Total: %d run | %d pass | %d warn | %d skipped    |\n" \
    "$total" "$pass" "$warn" "$skipped_count"
  if [[ $timeout -gt 0 ]]; then
    printf "| Timeouts: %d                                    |\n" "$timeout"
  fi
  echo "+------------------------------------------------+"

  # Write summary to file
  {
    echo "StormBreaker Scan Summary — $(date -Iseconds 2>/dev/null || date)"
    echo ""
    printf "%-6s %-14s %-9s %s\n" "Wave" "Tool" "Status" "Findings"
    echo "-----  ------------- -------  --------"
    for entry in "${RESULTS[@]}"; do
      IFS='|' read -r wave tool status findings <<< "$entry"
      printf "%-6s %-14s %-9s %s\n" "$wave" "$tool" "$status" "$findings"
    done
    for tool in "${SKIPPED[@]}"; do
      printf "%-6s %-14s %-9s %s\n" "—" "$tool" "SKIPPED" "not installed"
    done
    echo ""
    echo "Total: $total run | $pass pass | $warn warn | $skipped_count skipped"
  } > "$REPORTS_DIR/stormbreaker_summary.txt"

  log_info "Summary written to $REPORTS_DIR/stormbreaker_summary.txt"
}
```

- [ ] **Step 4: Verify syntax**

Run: `bash -n scripts/stormbreaker-scan.sh`
Expected: No output (syntax OK).

- [ ] **Step 5: Commit**

```bash
git add scripts/stormbreaker-scan.sh
git commit -m "feat(security): add finding extraction, run_tool wrapper, and summary reporter"
```

---

## Chunk 2: Wave Implementations

### Task 4: Wave P0 — semgrep + trufflehog

**Files:**
- Modify: `scripts/stormbreaker-scan.sh`

- [ ] **Step 1: Add wave_p0 function**

Append after `print_summary`:

```bash
# ============================================================
# WAVE FUNCTIONS
# ============================================================

# --- Wave P0: semgrep (SAST) + trufflehog (Secrets) ---
wave_p0() {
  echo ""
  echo "=== Wave P0: SAST + Secrets ==="

  # --- semgrep ---
  if ensure_tool "semgrep" install_semgrep; then
    if [[ "$PLATFORM" == "windows" ]]; then
      # Run via WSL — translate project path
      local wsl_project
      wsl_project=$(wsl wslpath -u "$(cygpath -w "$PROJECT_DIR")" 2>/dev/null || echo "$PROJECT_DIR")
      run_tool "P0" "semgrep" "$REPORTS_DIR/semgrep_output.json" \
        wsl semgrep scan --config auto --json \
        -o "$REPORTS_DIR/semgrep_output.json" \
        "$wsl_project/server/" "$wsl_project/client/src/"
    else
      run_tool "P0" "semgrep" "$REPORTS_DIR/semgrep_output.json" \
        semgrep scan --config auto --json \
        -o "$REPORTS_DIR/semgrep_output.json" \
        "$PROJECT_DIR/server/" "$PROJECT_DIR/client/src/"
    fi
  fi

  # --- trufflehog ---
  if ensure_tool "trufflehog" install_trufflehog; then
    # Use cygpath -m on MINGW for valid file:// URI; quote paths for spaces
    local git_uri="file://$PROJECT_DIR"
    [[ "$PLATFORM" == "windows" ]] && git_uri="file://$(cygpath -m "$PROJECT_DIR")"
    run_tool "P0" "trufflehog" "$REPORTS_DIR/trufflehog_output.json" \
      bash -c 'trufflehog git "'"$git_uri"'" --json > "'"$REPORTS_DIR/trufflehog_output.json"'"'
  fi
}
```

- [ ] **Step 2: Verify syntax**

Run: `bash -n scripts/stormbreaker-scan.sh`
Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add scripts/stormbreaker-scan.sh
git commit -m "feat(security): add wave P0 — semgrep (WSL) + trufflehog"
```

---

### Task 5: Wave P1 — trivy

**Files:**
- Modify: `scripts/stormbreaker-scan.sh`

- [ ] **Step 1: Add wave_p1 function**

Append after `wave_p0`:

```bash
# --- Wave P1: trivy (SCA) ---
wave_p1() {
  echo ""
  echo "=== Wave P1: SCA ==="

  if ensure_tool "trivy" install_trivy; then
    run_tool "P1" "trivy" "$REPORTS_DIR/trivy_output.json" \
      trivy fs --format json --output "$REPORTS_DIR/trivy_output.json" "$PROJECT_DIR"
  fi
}
```

- [ ] **Step 2: Verify syntax**

Run: `bash -n scripts/stormbreaker-scan.sh`
Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add scripts/stormbreaker-scan.sh
git commit -m "feat(security): add wave P1 — trivy filesystem scan"
```

---

### Task 6: Wave P2 — bearer + osv-scanner

**Files:**
- Modify: `scripts/stormbreaker-scan.sh`

- [ ] **Step 1: Add wave_p2 function**

Append after `wave_p1`:

```bash
# --- Wave P2: bearer (SAST/Data) + osv-scanner (SCA) ---
wave_p2() {
  echo ""
  echo "=== Wave P2: SAST/Data + SCA ==="

  # --- bearer ---
  if ensure_tool "bearer" install_bearer; then
    run_tool "P2" "bearer" "$REPORTS_DIR/bearer_output.json" \
      bearer scan "$PROJECT_DIR" --format json --output "$REPORTS_DIR/bearer_output.json"
  fi

  # --- osv-scanner ---
  if ensure_tool "osv-scanner" install_osv_scanner; then
    # Build command string explicitly to avoid array-in-bash-c issues with spaces
    local osv_cmd="osv-scanner --json"
    [[ -f "$PROJECT_DIR/server/package-lock.json" ]] && osv_cmd+=" --lockfile=\"$PROJECT_DIR/server/package-lock.json\""
    [[ -f "$PROJECT_DIR/client/package-lock.json" ]] && osv_cmd+=" --lockfile=\"$PROJECT_DIR/client/package-lock.json\""
    osv_cmd+=" > \"$REPORTS_DIR/osv_output.json\""

    run_tool "P2" "osv-scanner" "$REPORTS_DIR/osv_output.json" \
      bash -c "$osv_cmd"
  fi
}
```

- [ ] **Step 2: Verify syntax**

Run: `bash -n scripts/stormbreaker-scan.sh`
Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add scripts/stormbreaker-scan.sh
git commit -m "feat(security): add wave P2 — bearer + osv-scanner"
```

---

### Task 7: Wave P4 — syft, bomber, depscan

**Files:**
- Modify: `scripts/stormbreaker-scan.sh`

- [ ] **Step 1: Add wave_p4 function**

Append after `wave_p2`:

```bash
# --- Wave P4: syft (SBOM) + bomber (SBOM vuln) + depscan (SCA) ---
wave_p4() {
  echo ""
  echo "=== Wave P4: SBOM + SCA ==="

  # --- syft ---
  local syft_available=0
  if ensure_tool "syft" install_syft; then
    syft_available=1
    run_tool "P4" "syft" "$REPORTS_DIR/syft_sbom.json" \
      bash -c 'syft "dir:'"$PROJECT_DIR"'" -o json > "'"$REPORTS_DIR/syft_sbom.json"'"'
  fi

  # --- bomber (depends on syft for CycloneDX SBOM) ---
  if ensure_tool "bomber" install_bomber; then
    if [[ $syft_available -eq 1 ]]; then
      # Generate CycloneDX SBOM first, then run bomber
      run_tool "P4" "bomber" "$REPORTS_DIR/bomber_output.json" \
        bash -c 'syft "dir:'"$PROJECT_DIR"'" -o cyclonedx-json > "'"$REPORTS_DIR/sbom.cdx.json"'" && bomber scan --output json "'"$REPORTS_DIR/sbom.cdx.json"'" > "'"$REPORTS_DIR/bomber_output.json"'"'
    else
      log_warn "bomber requires syft for SBOM input. Skipping."
      SKIPPED+=("bomber")
    fi
  fi

  # --- depscan ---
  if ensure_tool "depscan" install_depscan; then
    run_tool "P4" "depscan" "$REPORTS_DIR/depscan_output.json" \
      depscan --src "$PROJECT_DIR" --reports_dir "$REPORTS_DIR" --report_file depscan_output.json
  fi
}
```

- [ ] **Step 2: Verify syntax**

Run: `bash -n scripts/stormbreaker-scan.sh`
Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add scripts/stormbreaker-scan.sh
git commit -m "feat(security): add wave P4 — syft, bomber, depscan"
```

---

## Chunk 3: Orchestrator, Integration, Verification

### Task 8: Main orchestrator — wire waves together

**Files:**
- Modify: `scripts/stormbreaker-scan.sh`

- [ ] **Step 1: Add the main orchestrator at the end of the script**

Append at the very end of the file:

```bash
# ============================================================
# MAIN ORCHESTRATOR
# ============================================================

should_run_wave() {
  local wave=$1
  [[ "$SELECTED_WAVES" == "all" ]] && return 0
  # Check if wave is in comma-separated list
  IFS=',' read -ra waves <<< "$SELECTED_WAVES"
  for w in "${waves[@]}"; do
    [[ "$w" == "$wave" ]] && return 0
  done
  return 1
}

main() {
  should_run_wave "p0" && wave_p0
  should_run_wave "p1" && wave_p1
  should_run_wave "p2" && wave_p2
  should_run_wave "p4" && wave_p4

  print_summary

  echo ""
  echo "=== StormBreaker Scan Complete ==="
  echo "Reports:  $REPORTS_DIR/"
  echo "Debug:    $DEBUG_LOG"
  echo "Summary:  $REPORTS_DIR/stormbreaker_summary.txt"

  # Always exit 0 (advisory mode)
  exit 0
}

main
```

- [ ] **Step 2: Verify full script syntax**

Run: `bash -n scripts/stormbreaker-scan.sh`
Expected: No output.

- [ ] **Step 3: Test --help still works**

Run: `bash scripts/stormbreaker-scan.sh --help`
Expected: Usage text, exit 0.

- [ ] **Step 4: Test --no-install with no tools present**

Run: `bash scripts/stormbreaker-scan.sh --wave p0 --no-install`
Expected: Wave P0 header prints, semgrep + trufflehog show "[WARN] not found (--no-install set, skipping)", summary table shows both as SKIPPED.

- [ ] **Step 5: Commit**

```bash
git add scripts/stormbreaker-scan.sh
git commit -m "feat(security): add main orchestrator with wave selection"
```

---

### Task 9: Integration — Phase 5 hook in security-scan.sh

**Files:**
- Modify: `scripts/security-scan.sh`

- [ ] **Step 1: Add Phase 5 block at the end of security-scan.sh**

In `scripts/security-scan.sh`, replace the final line:

```bash
# Old (line 51):
echo "=== Scan Complete ==="
```

With:

```bash
# --- Phase 5 (optional): StormBreaker External Tools ---
if [ "${RUN_STORMBREAKER:-0}" = "1" ]; then
  echo "[5/5] Running StormBreaker external tools..."
  bash "$(dirname "$0")/stormbreaker-scan.sh" --wave all || true
else
  echo "[5/5] StormBreaker external scan skipped (set RUN_STORMBREAKER=1 to enable)"
fi
echo ""

echo "=== Scan Complete ==="
```

- [ ] **Step 2: Verify existing script still works**

Run: `bash scripts/security-scan.sh 2>&1 | head -20`
Expected: Phases 1-4 run as before. Phase 5 prints "StormBreaker external scan skipped (set RUN_STORMBREAKER=1 to enable)".

- [ ] **Step 3: Commit**

```bash
git add scripts/security-scan.sh
git commit -m "feat(security): add Phase 5 StormBreaker hook to security-scan.sh"
```

---

### Task 10: Make script executable and smoke test

**Files:**
- Modify: `scripts/stormbreaker-scan.sh` (chmod)

- [ ] **Step 1: Make script executable**

```bash
chmod +x scripts/stormbreaker-scan.sh
```

- [ ] **Step 2: Smoke test — --help**

Run: `bash scripts/stormbreaker-scan.sh --help`
Expected: Usage text with all waves listed, exit 0.

- [ ] **Step 3: Smoke test — --no-install all waves**

Run: `bash scripts/stormbreaker-scan.sh --no-install`
Expected: All 8 tools show SKIPPED in summary (unless any are already installed). Summary table renders correctly. `reports/stormbreaker/stormbreaker_summary.txt` is created. `reports/stormbreaker/stormbreaker_debug.log` is created.

- [ ] **Step 4: Smoke test — single wave**

Run: `bash scripts/stormbreaker-scan.sh --wave p1 --no-install`
Expected: Only "Wave P1: SCA" header appears. Only trivy in summary table. Other waves not executed.

- [ ] **Step 5: Smoke test — comma-separated waves**

Run: `bash scripts/stormbreaker-scan.sh --wave p0,p2 --no-install`
Expected: P0 and P2 headers appear. P1 and P4 do not. Summary shows only semgrep, trufflehog, bearer, osv-scanner.

- [ ] **Step 6: Verify integration**

Run: `bash scripts/security-scan.sh 2>&1 | tail -5`
Expected: "[5/5] StormBreaker external scan skipped" visible.

Run: `RUN_STORMBREAKER=1 bash scripts/security-scan.sh --no-install 2>&1 | tail -20`
Note: This will run all existing phases + stormbreaker in --no-install mode. Expected: Existing phases run, then StormBreaker summary appears at end.

- [ ] **Step 7: Commit**

```bash
git add scripts/stormbreaker-scan.sh
git commit -m "chore(security): make stormbreaker-scan.sh executable"
```
