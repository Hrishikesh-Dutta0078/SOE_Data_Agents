# OSV-Scanner + Bearer Scan Review — Wave P2

**Date:** 2026-03-16
**Tools:** osv-scanner v2.3.3, bearer v2.0.1 (skipped on Windows)
**Scan scope:** server/package-lock.json + client/package-lock.json
**Total findings:** 1

---

## Summary

osv-scanner found **1 moderate vulnerability** — the same langsmith SSRF that trivy flagged in Wave P1. Bearer was skipped because it does not provide Windows binaries.

## Tool Results

| Tool | Status | Findings | Notes |
|------|--------|----------|-------|
| osv-scanner v2.3.3 | RAN | 1 | Successfully installed from GitHub releases |
| bearer v2.0.1 | SKIPPED | — | No Windows binaries available (Linux/macOS only) |

## Vulnerability Detail

| Field | Value |
|-------|-------|
| **Advisory** | GHSA-v34v-rq6j-cj6p |
| **CVE** | CVE-2026-25528 |
| **Package** | `langsmith@0.3.87` |
| **Fixed in** | `0.6.3` (per Google OSV) / `0.4.6` (per Trivy/NVD) |
| **Severity** | MODERATE |
| **Summary** | LangSmith Client SDK SSRF via Tracing Header Injection |
| **Source** | `server/package-lock.json` |

### Cross-Reference with Trivy (P1)

This is the same vulnerability found by trivy in Wave P1 (CVE-2026-25528). The fix version differs:
- **Trivy (NVD):** fixed in `0.4.6`
- **OSV-Scanner (GHSA):** fixed in `0.6.3`

The discrepancy is normal — NVD and GitHub Security Advisories sometimes track different patch versions. The safer approach is to upgrade to the higher version (`0.6.3+`).

### Remediation

```bash
cd server
npm install langsmith@^0.6.3
```

## Bearer — Windows Limitation

Bearer does not publish Windows binaries. Options for running bearer on this project:
1. Run via WSL: `wsl bearer scan . --format json`
2. Run via Docker: `docker run --rm -v $(pwd):/src bearer/bearer scan /src --format json`
3. Run on a Linux/macOS dev machine or CI

Bearer adds sensitive data flow detection (PII leaking to logs, unencrypted storage) which is not covered by other tools in our suite. Consider running it in CI or via WSL as a follow-up.

## Scan Verdict

**WARN** — 1 moderate vulnerability found (same as P1). No new unique findings beyond what trivy already reported. Bearer skipped on Windows.

## Fixes Applied During This Wave

1. **Bearer:** Added Windows detection — skip with message instead of failing install script
2. **osv-scanner:** Fixed GitHub release asset pattern for Windows (`.exe` extension)
3. **osv-scanner:** Updated to v2 CLI syntax (`scan source --format json` instead of `--json`)
4. **All bash -c tools:** Resolved full binary paths to fix PATH inheritance in MINGW64 subshells
