# StormBreaker External Security Scan — Design Spec

**Date:** 2026-03-16
**Status:** Approved (revised after spec review)
**Approach:** New modular `stormbreaker-scan.sh` script (Approach 2)

---

## Context

The Auto Agents project has 108 security unit tests across 11 test files and 2 scanning scripts (`security-scan.sh`, `secretScan.js`). Per the StormBreaker Product Wiki v4.6.1+, 13 additional external tools are compatible with our JS/Node codebase. After filtering out tools requiring API keys (snyk, ggshield) and heavy runtimes (.NET for devskim, Java for dependency-check), **9 tools remain** to be integrated in a priority-based rollout.

## Prerequisites

- **Add `reports/` to `.gitignore`** — trufflehog outputs found secrets (including values) into JSON reports. Without gitignoring `reports/`, a `git add .` could commit exposed secrets to the repo. This must be done before any scan tool is run.

## Decisions

- **Priority-based rollout** — P0 through P4 waves, highest-impact tools first
- **Local dev only** — no CI/CD integration; developers run scans manually
- **Unified runner script** — one command, wave-based execution, terminal summary + JSON reports
- **Auto-install missing tools** — detect and install on first run, skip gracefully on failure; `--no-install` flag to disable
- **Exclude snyk, ggshield** — require API key auth, coverage overlaps with other tools
- **Exclude devskim, dependency-check** — require .NET SDK / Java, coverage overlaps with semgrep / trivy + osv-scanner
- **Defer checkov** — project has no Dockerfiles yet; checkov has heavy pip dependencies for minimal value. Excluded from default waves, can be added later.
- **Use `pipx` for Python CLI tools** — avoids polluting global pip environment; fall back to `pip install --user` if pipx unavailable
- **WSL required for semgrep on Windows** — semgrep-core binary only supports Linux/macOS; script detects MINGW and runs via `wsl semgrep ...`

## Final Tool List (8 tools, 4 waves)

| Wave | Tool | Category | Install Method | What It Adds |
|------|------|----------|---------------|-------------|
| P0 | semgrep | SAST | `pipx install semgrep` (WSL on Windows) | Deep JS/Node taint tracking, data-flow analysis |
| P0 | trufflehog | Secrets | Binary from GitHub releases | Git history secret scanning (committed+removed secrets) |
| P1 | trivy | SCA | Binary from GitHub releases | Broader vuln DB than npm audit, OS-level vuln detection |
| P2 | bearer | SAST/Data | curl install script (pinned tag) | Sensitive data flow detection (PII leaks to logs) |
| P2 | osv-scanner | SCA | Binary from GitHub releases | Google OSV database, broader coverage than npm audit |
| P4 | syft | SBOM | curl install script (pinned tag) | Bill of materials generation for compliance |
| P4 | bomber | SBOM | Binary from GitHub releases | SBOM vulnerability lookup (uses syft output) |
| P4 | depscan | SCA | `pipx install owasp-depscan` | OWASP dependency scanner, additional vuln coverage |

Note: checkov removed from default waves (deferred until Dockerfiles exist).

## Architecture

### File Layout

```
scripts/
  security-scan.sh          # Existing (untouched) — Heimdall + npm audit + secretScan + unit tests
  stormbreaker-scan.sh      # NEW — external tool orchestrator
  secretScan.js             # Existing (untouched) — Heimdall-compatible scanner
```

### Script Structure (`stormbreaker-scan.sh`)

```
1. Config & constants
   - REPORTS_DIR (reports/stormbreaker/), INSTALL_DIR (~/.local/bin)
   - Platform detection: MINGW/MSYS → Windows, Darwin → macOS, Linux → Linux

2. Helper functions
   - ensure_pipx()     — verify pipx available, fall back to pip --user
   - ensure_tool()     — check if tool installed, auto-install if not (respects --no-install)
   - run_with_timeout() — bash-native timeout (background + kill), no GNU timeout dependency
   - run_tool()        — execute tool via run_with_timeout, capture JSON + exit code
   - extract_count()   — parse finding count from tool JSON output via node -e (per-tool paths)
   - print_summary()   — formatted terminal summary table

3. Wave functions
   - wave_p0()  — semgrep, trufflehog
   - wave_p1()  — trivy
   - wave_p2()  — bearer, osv-scanner
   - wave_p4()  — syft, bomber, depscan

4. Main
   - Parse args: --wave p0|p1|p2|p4|all (default: all), --no-install, --help
   - Run selected waves
   - Print summary + write stormbreaker_summary.txt
   - Exit code: 0 always (advisory mode), findings are warnings not failures
```

### CLI Interface

```bash
bash scripts/stormbreaker-scan.sh                # Run all waves
bash scripts/stormbreaker-scan.sh --wave p0      # P0 only (semgrep + trufflehog)
bash scripts/stormbreaker-scan.sh --wave p0,p1   # P0 + P1
bash scripts/stormbreaker-scan.sh --no-install   # Skip auto-install, only run tools already installed
bash scripts/stormbreaker-scan.sh --help         # Print usage
```

### Exit Code

The script always exits 0 (advisory mode). Findings are reported via the summary table and JSON files but do not cause non-zero exit. This ensures:
- The Phase 5 integration with `security-scan.sh` (which uses `set -euo pipefail`) does not abort
- Developers can run the script without fear of breaking pipelines

## Auto-Install Logic

### Platform Detection

```bash
case "$(uname -s)" in
  MINGW*|MSYS*) PLATFORM="windows" ;;
  Darwin*)      PLATFORM="macos"   ;;
  *)            PLATFORM="linux"   ;;
esac
ARCH=$(uname -m)  # x86_64, arm64, aarch64
```

### Install Methods by Tool

| Tool | Detection | Install Command | Install Target |
|------|-----------|----------------|----------------|
| semgrep | `command -v semgrep` (or `wsl which semgrep` on Windows) | `pipx install semgrep` (inside WSL on Windows) | pipx venv / WSL |
| trufflehog | `command -v trufflehog` | GitHub release: `trufflesecurity/trufflehog` → `trufflehog_*_{OS}_{ARCH}.tar.gz` | `~/.local/bin` |
| trivy | `command -v trivy` | GitHub release: `aquasecurity/trivy` → `trivy_*_{OS}-64bit.tar.gz` | `~/.local/bin` |
| bearer | `command -v bearer` | `curl -sfL https://raw.githubusercontent.com/Bearer/bearer/v1.46.0/contrib/install.sh \| sh -s -- -b ~/.local/bin` | `~/.local/bin` |
| osv-scanner | `command -v osv-scanner` | GitHub release: `google/osv-scanner` → `osv-scanner_*_{OS}_{ARCH}` | `~/.local/bin` |
| syft | `command -v syft` | `curl -sSfL https://raw.githubusercontent.com/anchore/syft/v1.20.0/install.sh \| sh -s -- -b ~/.local/bin` | `~/.local/bin` |
| bomber | `command -v bomber` | GitHub release: `devops-kung-fu/bomber` → `bomber_*_{OS}_{ARCH}.tar.gz` | `~/.local/bin` |
| depscan | `command -v depscan` | `pipx install owasp-depscan` | pipx venv |

### GitHub Release Binary Download

For tools installed from GitHub releases (trufflehog, trivy, osv-scanner, bomber):

```bash
install_github_release() {
  local repo=$1      # e.g. "trufflesecurity/trufflehog"
  local binary=$2    # e.g. "trufflehog"
  local dest=$3      # e.g. ~/.local/bin

  # 1. Fetch latest release tag
  local tag=$(curl -sL "https://api.github.com/repos/${repo}/releases/latest" | node -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).tag_name))")

  # 2. Determine asset name based on platform/arch
  local os_name arch_name
  case "$PLATFORM" in
    windows) os_name="windows" ;;
    macos)   os_name="darwin"  ;;
    linux)   os_name="linux"   ;;
  esac
  case "$ARCH" in
    x86_64|amd64) arch_name="amd64" ;;
    arm64|aarch64) arch_name="arm64" ;;
  esac

  # 3. Download, extract, move to dest
  local url="https://github.com/${repo}/releases/download/${tag}/${binary}_${tag#v}_${os_name}_${arch_name}.tar.gz"
  curl -sL "$url" | tar xz -C "$dest" "$binary"
  chmod +x "${dest}/${binary}"
}
```

Note: Asset naming patterns vary per tool. The actual script will use a lookup table mapping each tool to its exact asset naming convention.

### Failure Handling

- `~/.local/bin` is added to PATH within the script if not already present
- If pipx AND pip are both missing: skip Python-based tools (semgrep, depscan) with message
- If any individual install fails: print manual install instructions, add to SKIPPED array, continue
- `--no-install` flag skips all auto-install, only runs tools already on PATH
- No sudo required for any install
- On Windows: after pipx/pip install, check if Scripts directory is on PATH; if not, add it

### Semgrep on Windows (WSL Fallback)

semgrep-core is an OCaml binary not available for Windows natively. On MINGW/MSYS:

```bash
if [ "$PLATFORM" = "windows" ]; then
  if command -v wsl &>/dev/null; then
    # Install in WSL if not present
    wsl which semgrep &>/dev/null || wsl pip install semgrep
    # Run via WSL, translating Windows paths
    wsl semgrep scan --config auto --json ...
  else
    echo "  semgrep requires WSL on Windows. Install WSL to enable."
    SKIPPED+=("semgrep")
  fi
fi
```

## Report Output

### File Output

Reports go to `reports/stormbreaker/` subdirectory for clean separation from existing Heimdall preflight reports:

```
reports/
  preflight/                          # Existing — Heimdall reports
  npm_audit-*.json                    # Existing — npm audit
  stormbreaker/                       # NEW — all stormbreaker tool outputs
    semgrep_output.json               # SAST findings
    trufflehog_output.json            # git history secrets
    trivy_output.json                 # filesystem vulnerabilities
    bearer_output.json                # data flow findings
    osv_output.json                   # OSV database matches
    syft_sbom.json                    # SBOM (input for bomber)
    sbom.cdx.json                     # CycloneDX SBOM (intermediate for bomber)
    bomber_output.json                # SBOM vuln lookup
    depscan_output.json               # OWASP dependency findings
    stormbreaker_summary.txt          # human-readable summary
    stormbreaker_debug.log            # stderr capture from all tools
```

### Finding Count Extraction (per tool)

Each tool produces different JSON. The `extract_count()` function uses tool-specific `node -e` expressions:

| Tool | JSON Path / Expression |
|------|----------------------|
| semgrep | `JSON.parse(data).results.length` |
| trufflehog | Count lines in JSONL output (one JSON object per line) |
| trivy | `JSON.parse(data).Results?.reduce((s,r) => s + (r.Vulnerabilities?.length \|\| 0), 0)` |
| bearer | `JSON.parse(data).findings?.length \|\| 0` |
| osv-scanner | `JSON.parse(data).results?.reduce((s,r) => s + r.packages.reduce((ps,p) => ps + p.vulnerabilities.length, 0), 0)` |
| syft | N/A (SBOM, no findings — report artifact count instead) |
| bomber | `JSON.parse(data).packages?.filter(p => p.vulnerabilities?.length > 0).length` |
| depscan | `JSON.parse(data).length \|\| 0` (array of findings) |

### Terminal Summary

```
+----------------------------------------------+
|        StormBreaker Scan Summary             |
+------+-------------+---------+---------------+
| Wave | Tool        | Status  | Findings      |
+------+-------------+---------+---------------+
| P0   | semgrep     | PASS    | 0 issues      |
| P0   | trufflehog  | WARN    | 3 secrets     |
| P1   | trivy       | PASS    | 0 vulns       |
| P2   | bearer      | SKIPPED | not installed  |
| ...  | ...         | ...     | ...           |
+------+-------------+---------+---------------+
| Total: 7 run | 5 pass | 1 warn | 1 skipped   |
+----------------------------------------------+
```

### Timeout Mechanism (bash-native)

No dependency on GNU `timeout` (unavailable on MINGW64):

```bash
run_with_timeout() {
  local secs=$1; shift
  "$@" &
  local pid=$!
  ( sleep "$secs" && kill "$pid" 2>/dev/null ) &
  local watchdog=$!
  wait "$pid" 2>/dev/null
  local rc=$?
  kill "$watchdog" 2>/dev/null; wait "$watchdog" 2>/dev/null
  return $rc
}
```

Default timeout: 300 seconds (5 minutes) per tool.

## Integration with Existing `security-scan.sh`

A new optional Phase 5 is appended to `security-scan.sh` (existing phases 1-4 untouched):

```bash
# --- Phase 5 (optional): StormBreaker External Tools ---
if [ "${RUN_STORMBREAKER:-0}" = "1" ]; then
  echo "[5/5] Running StormBreaker external tools..."
  bash "$(dirname "$0")/stormbreaker-scan.sh" --wave all || true
else
  echo "[5/5] StormBreaker external scan skipped (set RUN_STORMBREAKER=1 to enable)"
fi
```

Note: `|| true` ensures the parent script (which uses `set -euo pipefail`) does not abort. The stormbreaker script itself always exits 0, but this is a safety belt.

### Usage Patterns

```bash
# Existing behavior (unchanged)
bash scripts/security-scan.sh

# Full scan including external tools
RUN_STORMBREAKER=1 bash scripts/security-scan.sh

# External tools only (direct)
bash scripts/stormbreaker-scan.sh
bash scripts/stormbreaker-scan.sh --wave p0
bash scripts/stormbreaker-scan.sh --no-install
```

No changes to `package.json` scripts. The existing `npm run test:security` continues to run only the unit test suite.

## Scan Commands per Tool

Exact commands used by `run_tool()`:

| Tool | Command |
|------|---------|
| semgrep | `semgrep scan --config auto --json -o reports/stormbreaker/semgrep_output.json server/ client/src/` |
| trufflehog | `trufflehog git file://. --json > reports/stormbreaker/trufflehog_output.json` |
| trivy | `trivy fs --format json --output reports/stormbreaker/trivy_output.json .` |
| bearer | `bearer scan . --format json --output reports/stormbreaker/bearer_output.json` |
| osv-scanner | `osv-scanner --json --lockfile=server/package-lock.json --lockfile=client/package-lock.json > reports/stormbreaker/osv_output.json` |
| syft | `syft dir:. -o json > reports/stormbreaker/syft_sbom.json` |
| bomber | `syft dir:. -o cyclonedx-json > reports/stormbreaker/sbom.cdx.json && bomber scan --output json reports/stormbreaker/sbom.cdx.json > reports/stormbreaker/bomber_output.json` |
| depscan | `depscan --src . --reports_dir reports/stormbreaker/ --report_file depscan_output.json` |

## Out of Scope

- CI/CD pipeline integration
- snyk, ggshield (API key requirement)
- devskim (requires .NET SDK)
- dependency-check (requires Java)
- checkov (deferred until Dockerfiles exist)
- Docker image scanning (no images built yet)
- Custom dashboard or web UI for results
- Checksum/signature verification of downloaded binaries (desirable future improvement)
