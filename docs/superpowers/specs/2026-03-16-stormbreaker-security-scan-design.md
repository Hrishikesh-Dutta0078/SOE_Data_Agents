# StormBreaker External Security Scan — Design Spec

**Date:** 2026-03-16
**Status:** Approved
**Approach:** New modular `stormbreaker-scan.sh` script (Approach 2)

---

## Context

The Auto Agents project has 108 security unit tests across 11 test files and 2 scanning scripts (`security-scan.sh`, `secretScan.js`). Per the StormBreaker Product Wiki v4.6.1+, 13 additional external tools are compatible with our JS/Node codebase. After filtering out tools requiring API keys (snyk, ggshield) and heavy runtimes (.NET for devskim, Java for dependency-check), **9 tools remain** to be integrated in a priority-based rollout.

## Decisions

- **Priority-based rollout** — P0 through P4 waves, highest-impact tools first
- **Local dev only** — no CI/CD integration; developers run scans manually
- **Unified runner script** — one command, wave-based execution, terminal summary + JSON reports
- **Auto-install missing tools** — detect and install on first run, skip gracefully on failure
- **Exclude snyk, ggshield** — require API key auth, coverage overlaps with other tools
- **Exclude devskim, dependency-check** — require .NET SDK / Java, coverage overlaps with semgrep / trivy + osv-scanner

## Final Tool List (9 tools, 4 waves)

| Wave | Tool | Category | Install Method | What It Adds |
|------|------|----------|---------------|-------------|
| P0 | semgrep | SAST | `pip install semgrep` | Deep JS/Node taint tracking, data-flow analysis |
| P0 | trufflehog | Secrets | Binary from GitHub releases | Git history secret scanning (committed+removed secrets) |
| P1 | trivy | SCA | Binary from GitHub releases | Broader vuln DB than npm audit, OS-level vuln detection |
| P2 | bearer | SAST/Data | curl install script | Sensitive data flow detection (PII leaks to logs) |
| P2 | osv-scanner | SCA | Binary from GitHub releases | Google OSV database, broader coverage than npm audit |
| P4 | checkov | IaC | `pip install checkov` | Dockerfile scanning (if/when added) |
| P4 | syft | SBOM | curl install script | Bill of materials generation for compliance |
| P4 | bomber | SBOM | Binary from GitHub releases | SBOM vulnerability lookup (uses syft output) |
| P4 | depscan | SCA | `pip install owasp-depscan` | OWASP dependency scanner, additional vuln coverage |

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
   - REPORTS_DIR, INSTALL_DIR (~/.local/bin), platform detection (Windows/WSL, macOS, Linux)

2. Helper functions
   - ensure_pip()       — verify pip/pip3 is available
   - ensure_tool()      — check if tool installed, auto-install if not
   - run_tool()         — execute tool with timeout (5 min), capture JSON + exit code
   - extract_count()    — parse finding count from tool JSON output via node -e
   - print_summary()    — formatted terminal summary table

3. Wave functions
   - wave_p0()  — semgrep, trufflehog
   - wave_p1()  — trivy
   - wave_p2()  — bearer, osv-scanner
   - wave_p4()  — checkov, syft, bomber, depscan

4. Main
   - Parse args: --wave p0|p1|p2|p4|all (default: all)
   - Run selected waves
   - Print summary + write stormbreaker_summary.txt
```

### CLI Interface

```bash
bash scripts/stormbreaker-scan.sh              # Run all waves
bash scripts/stormbreaker-scan.sh --wave p0    # P0 only (semgrep + trufflehog)
bash scripts/stormbreaker-scan.sh --wave p0,p1 # P0 + P1
```

## Auto-Install Logic

### Install Methods by Tool

| Tool | Detection | Install Command | Install Target |
|------|-----------|----------------|----------------|
| semgrep | `command -v semgrep` | `pip install semgrep` | pip global |
| trufflehog | `command -v trufflehog` | Download binary from GitHub releases | `~/.local/bin` |
| trivy | `command -v trivy` | Download binary from GitHub releases | `~/.local/bin` |
| bearer | `command -v bearer` | `curl -sfL https://raw.githubusercontent.com/Bearer/bearer/main/contrib/install.sh \| sh` | `~/.local/bin` |
| osv-scanner | `command -v osv-scanner` | Download binary from GitHub releases | `~/.local/bin` |
| checkov | `command -v checkov` | `pip install checkov` | pip global |
| syft | `command -v syft` | `curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh \| sh` | `~/.local/bin` |
| bomber | `command -v bomber` | Download binary from GitHub releases | `~/.local/bin` |
| depscan | `command -v depscan` | `pip install owasp-depscan` | pip global |

### Failure Handling

- `~/.local/bin` is added to PATH within the script if not already present
- If pip is missing: skip all pip-based tools (semgrep, checkov, depscan) with message
- If any individual install fails: print manual install instructions, add to SKIPPED array, continue
- No sudo required for any install

## Report Output

### File Output

```
reports/
  preflight/                    # Existing
  npm_audit-*.json              # Existing
  semgrep_output.json           # NEW — SAST findings
  trufflehog_output.json        # NEW — git history secrets
  trivy_output.json             # NEW — filesystem vulnerabilities
  bearer_output.json            # NEW — data flow findings
  osv_output.json               # NEW — OSV database matches
  checkov_output.json           # NEW — IaC findings
  syft_sbom.json                # NEW — SBOM (input for bomber)
  bomber_output.json            # NEW — SBOM vuln lookup
  depscan_output.json           # NEW — OWASP dependency findings
  stormbreaker_summary.txt      # NEW — human-readable summary
```

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

Finding counts extracted from JSON output using `node -e` one-liners (consistent with existing `security-scan.sh` pattern).

## Integration with Existing `security-scan.sh`

A new optional Phase 5 is appended to `security-scan.sh` (existing phases 1-4 untouched):

```bash
# --- Phase 5 (optional): StormBreaker External Tools ---
if [ "${RUN_STORMBREAKER:-0}" = "1" ]; then
  echo "[5/5] Running StormBreaker external tools..."
  bash "$(dirname "$0")/stormbreaker-scan.sh" --wave all
else
  echo "[5/5] StormBreaker external scan skipped (set RUN_STORMBREAKER=1 to enable)"
fi
```

### Usage Patterns

```bash
# Existing behavior (unchanged)
bash scripts/security-scan.sh

# Full scan including external tools
RUN_STORMBREAKER=1 bash scripts/security-scan.sh

# External tools only (direct)
bash scripts/stormbreaker-scan.sh
bash scripts/stormbreaker-scan.sh --wave p0
```

No changes to `package.json` scripts. The existing `npm run test:security` continues to run only the unit test suite.

## Scan Commands per Tool

Exact commands used by `run_tool()`:

| Tool | Command |
|------|---------|
| semgrep | `semgrep scan --config auto --json -o reports/semgrep_output.json server/ client/src/` |
| trufflehog | `trufflehog git file://. --json > reports/trufflehog_output.json` |
| trivy | `trivy fs --format json --output reports/trivy_output.json .` |
| bearer | `bearer scan . --format json --output reports/bearer_output.json` |
| osv-scanner | `osv-scanner --json --lockfile=server/package-lock.json --lockfile=client/package-lock.json > reports/osv_output.json` |
| checkov | `checkov -d . --framework dockerfile --output json > reports/checkov_output.json` |
| syft | `syft dir:. -o json > reports/syft_sbom.json` |
| bomber | `syft dir:. -o cyclonedx-json > reports/sbom.cdx.json && bomber scan --output json reports/sbom.cdx.json > reports/bomber_output.json` |
| depscan | `depscan --src . --reports_dir reports/ --report_file depscan_output.json` |

## Out of Scope

- CI/CD pipeline integration
- snyk, ggshield (API key requirement)
- devskim (requires .NET SDK)
- dependency-check (requires Java)
- Docker image scanning (no images built yet)
- Custom dashboard or web UI for results
