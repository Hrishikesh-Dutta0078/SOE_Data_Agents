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

# WSL command prefix — use Ubuntu distro with devuser (not docker-desktop default)
WSL_EXEC="wsl -d Ubuntu -u devuser -- bash -lc"

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

# --- Logging ---
log_info()  { echo "  $*"; }
log_warn()  { echo "  [WARN] $*"; }
log_debug() { echo "$*" >> "$DEBUG_LOG"; }

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

    # Find the binary in extracted files — use bash glob (not find, avoids Windows find.exe)
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

# --- Tool availability check + auto-install ---
# Usage: ensure_tool <tool_name> <install_function>
# Returns 0 if tool is available, 1 if skipped
ensure_tool() {
  local tool=$1
  local install_fn=$2

  # Special case: semgrep + bearer on Windows check WSL Ubuntu
  if [[ ("$tool" == "semgrep" || "$tool" == "bearer") && "$PLATFORM" == "windows" ]]; then
    if command -v wsl &>/dev/null && $WSL_EXEC "which $tool" &>/dev/null 2>&1; then
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
      if command -v wsl &>/dev/null && $WSL_EXEC "which semgrep" &>/dev/null 2>&1; then
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

# --- Per-tool install functions ---

install_semgrep() {
  if [[ "$PLATFORM" == "windows" ]]; then
    if ! command -v wsl &>/dev/null; then
      log_warn "semgrep requires WSL on Windows. Install WSL + Ubuntu to enable."
      return 1
    fi
    log_info "Installing semgrep in WSL Ubuntu..."
    $WSL_EXEC "pipx install semgrep 2>&1 || pip3 install --user semgrep 2>&1" >>"$DEBUG_LOG" 2>&1
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
  # Trivy asset naming: trivy_0.69.3_Linux-64bit.tar.gz / trivy_0.69.3_windows-64bit.zip
  local os_trivy arch_trivy ext_trivy
  case "$PLATFORM" in
    windows) os_trivy="windows"; ext_trivy="zip" ;;
    macos)   os_trivy="macOS";   ext_trivy="tar.gz" ;;
    linux)   os_trivy="Linux";   ext_trivy="tar.gz" ;;
  esac
  case "$ARCH_NAME" in
    amd64) arch_trivy="64bit"  ;;
    arm64) arch_trivy="ARM64"  ;;
    *)     arch_trivy="64bit"  ;;
  esac
  install_github_release "aquasecurity/trivy" "trivy" \
    "trivy_{TAG}_${os_trivy}-${arch_trivy}.${ext_trivy}"
}

install_bearer() {
  if [[ "$PLATFORM" == "windows" ]]; then
    if ! command -v wsl &>/dev/null; then
      log_warn "Bearer requires WSL on Windows. Install WSL + Ubuntu to enable."
      return 1
    fi
    log_info "Installing bearer in WSL Ubuntu..."
    $WSL_EXEC "curl -sfL https://raw.githubusercontent.com/Bearer/bearer/v1.46.0/contrib/install.sh | sh -s -- -b \$HOME/.local/bin 2>&1" >>"$DEBUG_LOG" 2>&1
  else
    log_info "Installing bearer via install script..."
    curl -sfL https://raw.githubusercontent.com/Bearer/bearer/v1.46.0/contrib/install.sh \
      | sh -s -- -b "$INSTALL_DIR" 2>>"$DEBUG_LOG"
  fi
}

install_osv_scanner() {
  # osv-scanner Windows assets: osv-scanner_windows_amd64.exe (no version tag)
  # Linux/macOS assets: osv-scanner_linux_amd64 (no version tag, no extension)
  if [[ "$PLATFORM" == "windows" ]]; then
    install_github_release "google/osv-scanner" "osv-scanner" \
      "osv-scanner_{OS}_{ARCH}.exe"
  else
    install_github_release "google/osv-scanner" "osv-scanner" \
      "osv-scanner_{OS}_{ARCH}"
  fi
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

# --- Finding count extraction ---
# Uses fs.readFileSync (not require) for MINGW64 path compatibility.
read_json_node() {
  local file=$1
  local expr=$2
  # Convert MINGW64 paths (/c/Users/...) to Windows paths (C:\Users\...) for Node.js
  local node_path="$file"
  if [[ "$PLATFORM" == "windows" ]] && command -v cygpath &>/dev/null; then
    node_path=$(cygpath -w "$file")
  fi
  node -e "const fs=require('fs');try{const d=JSON.parse(fs.readFileSync(String.raw\`$node_path\`,'utf8'));console.log($expr)}catch(e){console.log('?')}" 2>/dev/null || echo "?"
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
    RESULTS+=("$wave|$tool|WARN|$count")
  else
    RESULTS+=("$wave|$tool|WARN|$count")
  fi

  log_info "$tool complete — $count findings (exit $rc)"
  log_info "Report: $output_file"
}

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
      # Run via WSL Ubuntu — translate project path to Linux mount
      local win_project
      win_project=$(cygpath -w "$PROJECT_DIR")
      local wsl_project
      wsl_project=$($WSL_EXEC "wslpath -u '$win_project'" 2>/dev/null)
      local wsl_reports
      wsl_reports=$($WSL_EXEC "wslpath -u '$(cygpath -w "$REPORTS_DIR")'" 2>/dev/null)
      run_tool "P0" "semgrep" "$REPORTS_DIR/semgrep_output.json" \
        $WSL_EXEC "semgrep scan --config auto --json \
        -o '$wsl_reports/semgrep_output.json' \
        '$wsl_project/server/' '$wsl_project/client/src/'"
    else
      run_tool "P0" "semgrep" "$REPORTS_DIR/semgrep_output.json" \
        semgrep scan --config auto --json \
        -o "$REPORTS_DIR/semgrep_output.json" \
        "$PROJECT_DIR/server/" "$PROJECT_DIR/client/src/"
    fi
  fi

  # --- trufflehog ---
  if ensure_tool "trufflehog" install_trufflehog; then
    # Use cygpath -m on MINGW for valid file:// URI; resolve full binary path for bash -c
    local git_uri="file://$PROJECT_DIR"
    [[ "$PLATFORM" == "windows" ]] && git_uri="file://$(cygpath -m "$PROJECT_DIR")"
    local th_bin
    th_bin=$(command -v trufflehog)
    run_tool "P0" "trufflehog" "$REPORTS_DIR/trufflehog_output.json" \
      bash -c '"'"$th_bin"'" git "'"$git_uri"'" --json > "'"$REPORTS_DIR/trufflehog_output.json"'"'
  fi
}

# --- Wave P1: trivy (SCA) ---
wave_p1() {
  echo ""
  echo "=== Wave P1: SCA ==="

  if ensure_tool "trivy" install_trivy; then
    run_tool "P1" "trivy" "$REPORTS_DIR/trivy_output.json" \
      trivy fs --format json --output "$REPORTS_DIR/trivy_output.json" "$PROJECT_DIR"
  fi
}

# --- Wave P2: bearer (SAST/Data) + osv-scanner (SCA) ---
wave_p2() {
  echo ""
  echo "=== Wave P2: SAST/Data + SCA ==="

  # --- bearer ---
  if ensure_tool "bearer" install_bearer; then
    if [[ "$PLATFORM" == "windows" ]]; then
      # Run via WSL Ubuntu — translate paths and ensure git safe.directory
      local win_project_b
      win_project_b=$(cygpath -w "$PROJECT_DIR")
      local wsl_project_b
      wsl_project_b=$($WSL_EXEC "wslpath -u '$win_project_b'" 2>/dev/null)
      local wsl_reports_b
      wsl_reports_b=$($WSL_EXEC "wslpath -u '$(cygpath -w "$REPORTS_DIR")'" 2>/dev/null)
      # Bearer needs git safe.directory for cross-filesystem repos
      $WSL_EXEC "git config --global --add safe.directory '$wsl_project_b' 2>/dev/null" &>/dev/null
      # Run bearer directly (not via run_tool) — WSL processes don't work with run_with_timeout on MINGW64
      echo ""
      echo "[P2] Running bearer..."
      log_debug "run_tool: bearer -> $REPORTS_DIR/bearer_output.json"
      local bearer_rc=0
      $WSL_EXEC "bearer scan '$wsl_project_b' --format json --output '$wsl_reports_b/bearer_output.json'" 2>>"$DEBUG_LOG" || bearer_rc=$?
      local bearer_count
      bearer_count=$(extract_count "bearer" "$REPORTS_DIR/bearer_output.json")
      if [[ $bearer_rc -eq 0 && "$bearer_count" == "0" ]]; then
        RESULTS+=("P2|bearer|PASS|$bearer_count")
      else
        RESULTS+=("P2|bearer|WARN|$bearer_count")
      fi
      log_info "bearer complete — $bearer_count findings (exit $bearer_rc)"
      log_info "Report: $REPORTS_DIR/bearer_output.json"
    else
      run_tool "P2" "bearer" "$REPORTS_DIR/bearer_output.json" \
        bearer scan "$PROJECT_DIR" --format json --output "$REPORTS_DIR/bearer_output.json"
    fi
  fi

  # --- osv-scanner ---
  if ensure_tool "osv-scanner" install_osv_scanner; then
    # osv-scanner v2 CLI: osv-scanner scan source --format json --lockfile=... --output=...
    local osv_bin
    osv_bin=$(command -v osv-scanner)
    local osv_cmd="\"$osv_bin\" scan source --format json --output \"$REPORTS_DIR/osv_output.json\""
    [[ -f "$PROJECT_DIR/server/package-lock.json" ]] && osv_cmd+=" --lockfile \"$PROJECT_DIR/server/package-lock.json\""
    [[ -f "$PROJECT_DIR/client/package-lock.json" ]] && osv_cmd+=" --lockfile \"$PROJECT_DIR/client/package-lock.json\""

    run_tool "P2" "osv-scanner" "$REPORTS_DIR/osv_output.json" \
      bash -c "$osv_cmd"
  fi
}

# --- Wave P4: syft (SBOM) + bomber (SBOM vuln) + depscan (SCA) ---
wave_p4() {
  echo ""
  echo "=== Wave P4: SBOM + SCA ==="

  # Convert project dir to Windows path for tools that can't handle MINGW paths
  local project_native="$PROJECT_DIR"
  local reports_native="$REPORTS_DIR"
  if [[ "$PLATFORM" == "windows" ]] && command -v cygpath &>/dev/null; then
    project_native=$(cygpath -w "$PROJECT_DIR")
    reports_native=$(cygpath -w "$REPORTS_DIR")
  fi

  # --- syft ---
  local syft_available=0
  local syft_bin="" bomber_bin=""
  if ensure_tool "syft" install_syft; then
    syft_available=1
    syft_bin=$(command -v syft)
    run_tool "P4" "syft" "$REPORTS_DIR/syft_sbom.json" \
      bash -c '"'"$syft_bin"'" "dir:'"$project_native"'" -o json > "'"$REPORTS_DIR/syft_sbom.json"'"'
  fi

  # --- bomber (depends on syft for CycloneDX SBOM) ---
  if ensure_tool "bomber" install_bomber; then
    if [[ $syft_available -eq 1 ]]; then
      bomber_bin=$(command -v bomber)
      # Generate CycloneDX SBOM first, then run bomber
      run_tool "P4" "bomber" "$REPORTS_DIR/bomber_output.json" \
        bash -c '"'"$syft_bin"'" "dir:'"$project_native"'" -o cyclonedx-json > "'"$REPORTS_DIR/sbom.cdx.json"'" && "'"$bomber_bin"'" scan --output json "'"$REPORTS_DIR/sbom.cdx.json"'" > "'"$REPORTS_DIR/bomber_output.json"'"'
    else
      log_warn "bomber requires syft for SBOM input. Skipping."
      SKIPPED+=("bomber")
    fi
  fi

  # --- depscan ---
  if ensure_tool "depscan" install_depscan; then
    # depscan v6 CLI: -i for source, -o for reports dir
    run_tool "P4" "depscan" "$REPORTS_DIR/depscan_output.json" \
      depscan -i "$PROJECT_DIR" -o "$REPORTS_DIR"
  fi
}

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
