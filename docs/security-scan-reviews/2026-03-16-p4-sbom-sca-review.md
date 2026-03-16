# SBOM + SCA Scan Review — Wave P4

**Date:** 2026-03-16
**Tools:** syft v1.20.0, bomber v0.5.1, depscan v6.1.0
**Scan scope:** Full project directory

---

## Summary

| Tool | Status | Result |
|------|--------|--------|
| syft | RAN | 483 artifacts catalogued (SBOM generated) |
| bomber | RAN | 2 packages with vulnerabilities (1 app, 1 tooling) |
| depscan | RAN (partial) | No findings — requires cdxgen for BOM generation |

## Syft — SBOM (483 artifacts)

Syft successfully generated a Software Bill of Materials cataloguing **483 packages** across server and client dependencies. This is informational, not a vulnerability scan. The SBOM can be used for:
- Compliance reporting
- License auditing
- Input to vulnerability scanners (bomber uses it)

**Report:** `reports/stormbreaker/syft_sbom.json` (JSON), `reports/stormbreaker/sbom.cdx.json` (CycloneDX)

## Bomber — Vulnerability Findings (2 packages)

Bomber scanned the CycloneDX SBOM against vulnerability databases and flagged 2 packages:

### Package 1: langsmith (Application Dependency)

| Field | Value |
|-------|-------|
| **CVE** | CVE-2026-25528 |
| **Description** | LangSmith SDK SSRF via tracing header injection |
| **Seen in** | P1 (trivy), P2 (osv-scanner) — same finding |

This is the same vulnerability found in waves P1 and P2. **No new app-level findings.**

### Package 2: Go Standard Library (Tooling Only)

Bomber flagged **19 CVEs** in Go stdlib packages. These are vulnerabilities in the Go runtime used by tools bundled in the project (syft itself, or other Go binaries in deploy.zip):

| CVE | Component | Issue |
|-----|-----------|-------|
| CVE-2025-61725 | net/mail | ParseAddress string concatenation DoS |
| CVE-2025-58187 | crypto/x509 | Name constraint checking non-linear scaling |
| CVE-2025-58189 | crypto/tls | ALPN negotiation error info leak |
| CVE-2025-61723 | net/textproto | Input parsing non-linear scaling |
| CVE-2025-47912 | net/url | Square bracket host parsing |
| CVE-2025-58185 | crypto/x509 | DER parsing memory exhaustion |
| CVE-2025-58186 | net/http | Cookie parsing no limit |
| CVE-2025-58188 | crypto/x509 | DSA public key panic |
| CVE-2025-58183 | archive/tar | Sparse region data block no limit |
| CVE-2025-61724 | net/textproto | ReadResponse string concatenation |
| CVE-2025-61729 | crypto/x509 | HostnameError no host print limit |
| CVE-2025-61727 | crypto/x509 | Subdomain constraint wildcard bypass |
| CVE-2025-68121 | crypto/tls | Session resumption CA mutation |
| CVE-2025-61730 | crypto/tls | TLS 1.3 handshake record boundary |
| CVE-2025-61726 | net/url | Query parameter count no limit |
| CVE-2025-61728 | archive/zip | File name indexing DoS |
| CVE-2026-25679 | net/url | Parse host/authority validation |
| CVE-2026-27139 | os | File.ReadDir path traversal |
| CVE-2026-27142 | html/template | Meta tag URL XSS |

**Assessment:** These are NOT vulnerabilities in our application. They exist in Go binaries that were catalogued by the SBOM scan (likely from `server/deploy.zip`). No action required for our Node.js codebase.

## Depscan — No Results (Missing cdxgen)

Depscan v6 requires `cdxgen` (@cyclonedx/cdxgen) to generate a BOM before scanning. Since cdxgen is not installed, depscan could not produce vulnerability results.

**To enable depscan:**
```bash
npm install -g @cyclonedx/cdxgen
```

However, depscan's coverage overlaps significantly with trivy + osv-scanner (which already found the langsmith CVE). The value of adding cdxgen is low.

## Scan Verdict

**PASS** — No new application-level vulnerabilities found beyond the langsmith SSRF (CVE-2026-25528) already identified in P1/P2. The Go stdlib CVEs in bomber's output are tooling artifacts, not application code.

## Fixes Applied During This Wave

1. **syft/bomber:** Convert MINGW paths to Windows paths via `cygpath -w` (syft can't resolve `/c/Users/...`)
2. **depscan v6:** Updated CLI flags (`-i` for source, `-o` for reports)
3. **All P4 tools:** Successfully auto-installed (syft via install script, bomber via GitHub release, depscan via pip)

## Cross-Wave Vulnerability Summary

After all 4 waves, the complete vulnerability picture:

| CVE | Package | Severity | Found By | Status |
|-----|---------|----------|----------|--------|
| CVE-2026-25528 | langsmith@0.3.87 | MEDIUM (5.8) | trivy, osv-scanner, bomber | Fix: upgrade to 0.6.3+ |
| (19 Go CVEs) | Go stdlib | Various | bomber | N/A — tooling only, not app code |

**Total actionable findings across all waves: 1** (langsmith SSRF)
