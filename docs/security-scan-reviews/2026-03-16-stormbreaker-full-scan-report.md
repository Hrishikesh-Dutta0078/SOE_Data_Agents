# StormBreaker Full Security Scan Report

**Project:** Auto Agents — Text-to-SQL Multi-Agent System
**Date:** 2026-03-16
**Scanner:** StormBreaker-compatible toolchain (Heimdall preflight + 8 external tools)
**Scanned by:** stormbreaker-scan.sh v1.0 + scripts/security-scan.sh

---

## Executive Summary

The Auto Agents codebase was scanned using StormBreaker's Heimdall preflight regex scanner and 8 external security tools across 4 priority waves. **One actionable vulnerability was found and remediated** (CVE-2026-25528 — langsmith SSRF). The codebase is now clean across all scanners.

| Metric | Value |
|--------|-------|
| External tools run | 7 of 8 (depscan partial — needs cdxgen) |
| Vulnerabilities found | 1 (CVE-2026-25528) |
| Vulnerabilities remediated | 1 |
| Open vulnerabilities | **0** |
| False positives triaged | 37 (trufflehog) + ~630K (Heimdall node_modules noise) |

---

## 1. Heimdall Preflight Scan (Regex-Based)

StormBreaker's Heimdall module performs regex-based scanning across 13 categories. Results below exclude `node_modules/` (which dominates counts with library documentation matches).

### Findings Summary (Application Code Only)

| Category | App Findings | Assessment |
|----------|-------------|------------|
| **secrets_found** | 2 | `cert.pem` + `key.pem` — self-signed dev SSL certs (gitignored, expected) |
| **secrets_certs** | 2 | Same cert/key files (expected for local HTTPS dev server) |
| **secrets_privkey_content** | 1 | `key.pem` contains RSA private key (gitignored, expected) |
| **secrets_configs** | 1 | `web.config` — Azure deployment config (no secrets inside) |
| **env_files** | 2 | `.env` (gitignored) + `.env.example` (no real secrets, expected) |
| **azure_secrets** | 0 | Clean — no Azure secrets in app code |
| **secrets_connstrings** | 0 | Clean — connection strings only in node_modules docs |
| **crypt_hashes** | 0 | Clean — no weak crypto in app code |
| **ip_private** | 0 | Clean — no hardcoded private IPs in app code |
| **fqdn_targets** | 33 | Mostly API endpoint URLs in config (localhost, Azure endpoints — expected) |
| **security_todos** | 62 | False positives — regex matches `templateSql` variable names, not actual TODOs |
| **usr_pwd** | 800 | False positives — regex matches variable names containing `pass`/`password` |

### Heimdall Verdict

**PASS** — No real secrets or sensitive data found in application code. All flagged items are expected development artifacts (self-signed certs, .env.example) or regex false positives.

---

## 2. SAST — Static Application Security Testing

### semgrep v1.155.0 (Wave P0)

| Field | Value |
|-------|-------|
| **Scope** | `server/` + `client/src/` |
| **Config** | `--config auto` (community + pro rules) |
| **Platform** | WSL Ubuntu 24.04 (semgrep-core requires Linux) |
| **Findings** | **0** |

semgrep performed taint tracking and data-flow analysis across all JavaScript files. No security issues, code injection vectors, or dangerous patterns detected.

### bearer v2.0.1 (Wave P2)

| Field | Value |
|-------|-------|
| **Scope** | Full project directory (170 files analyzed, 237 rules evaluated) |
| **Platform** | WSL Ubuntu 24.04 (no Windows binary available) |
| **Findings** | **0** |
| **Warnings** | **0** |

Bearer scanned for sensitive data flows (PII leaking to logs, unencrypted storage, data exposure). No issues found.

---

## 3. SCA — Software Composition Analysis

### trivy v0.69.3 (Wave P1)

| Field | Value |
|-------|-------|
| **Scope** | `server/package-lock.json` + `client/package-lock.json` |
| **Findings (pre-fix)** | 1 MEDIUM |
| **Findings (post-fix)** | **0** |

**Pre-fix finding:**

| CVE | Package | Severity | CVSS | Description |
|-----|---------|----------|------|-------------|
| CVE-2026-25528 | langsmith@0.3.87 | MEDIUM | 5.8 | SSRF via tracing header injection |

**Remediation:** Upgraded LangChain stack to v1.x → langsmith@0.5.10. See Section 6.

### osv-scanner v2.3.3 (Wave P2)

| Field | Value |
|-------|-------|
| **Scope** | `server/package-lock.json` + `client/package-lock.json` |
| **Findings (pre-fix)** | 1 MODERATE (GHSA-v34v-rq6j-cj6p) |
| **Findings (post-fix)** | **0** |

Confirmed same langsmith SSRF found by trivy. Cross-validation successful.

### npm audit (Built-in)

| Field | Value |
|-------|-------|
| **Scope** | `server/` + `client/` |
| **Findings (post-fix)** | **0 vulnerabilities** |

---

## 4. Secrets Detection

### trufflehog v3.93.8 (Wave P0)

| Field | Value |
|-------|-------|
| **Scope** | Full git history |
| **Total findings** | 39 |
| **Real secrets** | **0** |
| **False positives** | 39 |

All findings originated from `server/deploy.zip` (35 MB deployment artifact, now gitignored and untracked):

| Detector | Count | Pattern | Verdict |
|----------|-------|---------|---------|
| URI | 20 | `abc:xyz@example.com`, `anonymous:flabada@developer.mozilla.org` | FALSE POSITIVE — placeholder/docs examples |
| MongoDB | 19 | `mongodb://username:password@host:1234` | FALSE POSITIVE — documentation templates |

**Action taken:** `server/deploy.zip` added to `.gitignore` and removed from git tracking.

### Custom Heimdall Scanner (secretScan.js)

| Field | Value |
|-------|-------|
| **Scope** | Working tree (10 regex rules) |
| **Findings** | Covered by Heimdall preflight results above |

---

## 5. SBOM — Software Bill of Materials

### syft v1.20.0 (Wave P4)

| Field | Value |
|-------|-------|
| **Artifacts catalogued** | 483 packages |
| **Output formats** | JSON SBOM + CycloneDX |

Generated comprehensive bill of materials for compliance and audit purposes.

### bomber v0.5.1 (Wave P4)

| Field | Value |
|-------|-------|
| **Packages scanned** | 483 (from syft SBOM) |
| **Vulnerable app packages** | 1 (langsmith — same as trivy/osv-scanner, now fixed) |
| **Vulnerable tooling packages** | 1 (Go stdlib — 19 CVEs in bundled Go binaries, not app code) |

The Go stdlib CVEs exist in tooling binaries captured by the SBOM scan and do not affect the Node.js application.

### depscan v6.1.0 (Wave P4)

| Field | Value |
|-------|-------|
| **Status** | PARTIAL |
| **Issue** | Requires `cdxgen` (@cyclonedx/cdxgen) for BOM generation |

depscan could not produce results without cdxgen. Coverage is already provided by trivy + osv-scanner + bomber.

---

## 6. Vulnerability Remediation

### CVE-2026-25528 — LangSmith SSRF (REMEDIATED)

| Field | Value |
|-------|-------|
| **CVE** | CVE-2026-25528 |
| **GHSA** | GHSA-v34v-rq6j-cj6p |
| **Severity** | MEDIUM (CVSS 5.8) |
| **Package** | langsmith@0.3.87 → **0.5.10** |
| **Attack** | SSRF via malicious tracing headers |
| **Found by** | trivy, osv-scanner, bomber |
| **Status** | **REMEDIATED** |

**Root cause:** langsmith was a transitive dependency of `@langchain/core@0.3.80` (pinned to `^0.3.67`). The fix version (0.4.6+) was outside the allowed range.

**Fix applied:** Upgraded entire LangChain stack to v1.x:

| Package | Before | After |
|---------|--------|-------|
| @langchain/core | 0.3.80 | 1.1.32 |
| @langchain/anthropic | 0.3.x | 1.3.23 |
| @langchain/langgraph | 0.2.x | 1.2.2 |
| @langchain/openai | 0.6.x | 1.2.13 |
| langsmith (transitive) | 0.3.87 | 0.5.10 |

**Verification:**
- Trivy re-scan: PASS (0 vulnerabilities)
- npm audit: 0 vulnerabilities
- Full test suite: 120/121 pass (1 pre-existing rate limiter test)
- All LangChain imports, graph nodes, and tools: OK
- Runtime robustness tests (workflow graph): 5/5 pass

---

## 7. Tool Coverage Matrix

| Tool | Category | Status | Findings | Platform |
|------|----------|--------|----------|----------|
| Heimdall preflight | Secrets/Config | RAN | 0 real issues | Native |
| semgrep v1.155.0 | SAST | **PASS** | 0 | WSL Ubuntu |
| bearer v2.0.1 | SAST/Data Flow | **PASS** | 0 | WSL Ubuntu |
| trufflehog v3.93.8 | Secrets (git history) | **PASS** | 0 real (39 FPs triaged) | Native Windows |
| trivy v0.69.3 | SCA | **PASS** | 0 (post-fix) | Native Windows |
| osv-scanner v2.3.3 | SCA | **PASS** | 0 (post-fix) | Native Windows |
| syft v1.20.0 | SBOM | **INFO** | 483 artifacts | Native Windows |
| bomber v0.5.1 | SBOM Vuln Lookup | **PASS** | 0 app vulns (post-fix) | Native Windows |
| depscan v6.1.0 | SCA | PARTIAL | Needs cdxgen | Native Windows |
| npm audit | SCA | **PASS** | 0 | Native |

### StormBreaker Profile Coverage

| Profile | Required Tools | Status |
|---------|---------------|--------|
| **minimal** | semgrep, syft, osv-scanner, trufflehog | **COMPLETE** |
| **default** | minimal + trivy | **COMPLETE** (snyk excluded — needs API key) |
| **extended** | default + bearer | **COMPLETE** (devskim/ggshield excluded — .NET/API key) |

---

## 8. Recommendations

### Completed

- [x] CVE-2026-25528 remediated (LangChain v1.x upgrade)
- [x] `server/deploy.zip` gitignored and untracked
- [x] `reports/` added to `.gitignore`
- [x] WSL Ubuntu installed with semgrep + bearer
- [x] StormBreaker scan script operational (7/8 tools running)

### Future Considerations

| Priority | Item | Notes |
|----------|------|-------|
| Low | Install `cdxgen` for depscan | `npm install -g @cyclonedx/cdxgen` — marginal value since trivy + osv-scanner cover SCA |
| Low | BFG purge of deploy.zip from git history | Saves ~35 MB in repo; requires team re-clone |
| Low | Wire `loginLimiter` in server/index.js | Pre-existing test failure (httpHeaders.test.js:52) |
| Info | Monitor LangChain v1.x in production | Major version upgrade — watch for behavioral changes |

---

## 9. Scan Infrastructure

### Files Created

| File | Purpose |
|------|---------|
| `scripts/stormbreaker-scan.sh` | Unified external tool orchestrator (640+ lines) |
| `scripts/security-scan.sh` (modified) | Added Phase 5 StormBreaker hook |
| `docs/superpowers/specs/2026-03-16-stormbreaker-security-scan-design.md` | Design spec |
| `docs/superpowers/plans/2026-03-16-stormbreaker-security-scan.md` | Implementation plan |

### Usage

```bash
# Full scan (all waves, auto-install missing tools)
bash scripts/stormbreaker-scan.sh

# Specific waves
bash scripts/stormbreaker-scan.sh --wave p0        # semgrep + trufflehog
bash scripts/stormbreaker-scan.sh --wave p1        # trivy
bash scripts/stormbreaker-scan.sh --wave p2        # bearer + osv-scanner
bash scripts/stormbreaker-scan.sh --wave p0,p1,p2  # Multiple waves

# Skip auto-install (only run tools already installed)
bash scripts/stormbreaker-scan.sh --no-install

# Via existing security-scan.sh
RUN_STORMBREAKER=1 bash scripts/security-scan.sh
```

### Installed Tools

| Tool | Location | Version |
|------|----------|---------|
| semgrep | WSL Ubuntu (~/.local/bin via pipx) | 1.155.0 |
| bearer | WSL Ubuntu (~/.local/bin) | 2.0.1 |
| trufflehog | Windows (~/.local/bin) | 3.93.8 |
| trivy | Windows (~/.local/bin) | 0.69.3 |
| osv-scanner | Windows (~/.local/bin) | 2.3.3 |
| syft | Windows (~/.local/bin) | 1.20.0 |
| bomber | Windows (~/.local/bin) | 0.5.1 |
| depscan | Windows (pip --user) | 6.1.0 |
