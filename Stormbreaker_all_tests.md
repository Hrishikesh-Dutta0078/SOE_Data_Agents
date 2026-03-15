# StormBreaker — All Compatible External Security Tests

**Project:** Auto Agents (Node.js / Express.js + React)
**Reference:** StormBreaker Product Wiki v4.6.1+
**Date:** 2026-03-16

This document lists every external security tool from StormBreaker's orchestration catalog, filtered for compatibility with our JavaScript/Node.js codebase. Each tool is categorized, with its install command, run command for this project, and compatibility status.

---

## 1. SAST (Static Application Security Testing)

| # | Tool | Compatible? | Why | Install | Run Command |
|---|------|-------------|-----|---------|-------------|
| 1 | **semgrep** | YES | JavaScript/TypeScript rules built-in | `pip install semgrep` | `semgrep scan --config auto --json -o reports/semgrep_output.json server/ client/src/` |
| 2 | **bearer** | YES | Data-flow analysis for JS/Node, detects sensitive data leaks | `curl -sfL https://raw.githubusercontent.com/Bearer/bearer/main/contrib/install.sh \| sh` | `bearer scan . --format json --output reports/bearer_output.json` |
| 3 | **devskim** | YES | Microsoft's multi-language security linter (includes JS) | `dotnet tool install -g Microsoft.CST.DevSkim.CLI` | `devskim analyze -I server/ client/src/ -f json -o reports/devskim_output.json` |
| 4 | **gosec** | NO | Go-only SAST scanner | — | — |
| 5 | **flawfinder** | NO | C/C++-only scanner | — | — |
| 6 | **pmd** | NO | Java/Apex only | — | — |
| 7 | **ktlint/detekt** | NO | Kotlin only | — | — |
| 8 | **brakeman** | NO | Ruby on Rails only | — | — |
| 9 | **codenarc** | NO | Groovy/Grails only | — | — |
| 10 | **phpstan** | NO | PHP only | — | — |
| 11 | **staticcheck** | NO | Go only | — | — |

---

## 2. Dependency / SCA (Software Composition Analysis)

| # | Tool | Compatible? | Why | Install | Run Command |
|---|------|-------------|-----|---------|-------------|
| 1 | **npm audit** | YES | Native Node.js dependency scanner | Built-in with npm | `cd server && npm audit --json > ../reports/npm_audit_server.json && cd ../client && npm audit --json > ../reports/npm_audit_client.json` |
| 2 | **snyk** | YES | SaaS vulnerability scanner with deep JS/Node support | `npm install -g snyk && snyk auth` | `snyk test --json > reports/snyk_output.json` |
| 3 | **trivy** | YES | Filesystem/container scanner, detects npm/yarn vulns | `brew install trivy` (macOS) or [binary](https://github.com/aquasecurity/trivy/releases) | `trivy fs --format json --output reports/trivy_output.json .` |
| 4 | **osv-scanner** | YES | Google's OSV database scanner, supports package-lock.json | `go install github.com/google/osv-scanner/cmd/osv-scanner@latest` | `osv-scanner --json --lockfile=server/package-lock.json --lockfile=client/package-lock.json > reports/osv_output.json` |
| 5 | **syft** | YES | SBOM generator, produces bill of materials from node_modules | `curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh \| sh` | `syft dir:. -o json > reports/syft_sbom.json` |
| 6 | **depscan** | YES | OWASP dependency scanner, supports npm | `pip install owasp-depscan` | `depscan --src . --reports_dir reports/ --report_file depscan_output.json` |
| 7 | **bomber** | YES | SBOM vulnerability lookup (use with syft output) | `go install github.com/devops-kung-fu/bomber@latest` | `syft dir:. -o cyclonedx-json > reports/sbom.cdx.json && bomber scan --output json reports/sbom.cdx.json > reports/bomber_output.json` |
| 8 | **dependency-check** | YES | OWASP NVD-based scanner, supports Node.js | Download from [OWASP](https://owasp.org/www-project-dependency-check/) | `dependency-check.sh --scan . --format JSON --out reports/depcheck_output.json` |

---

## 3. Secret Detection

| # | Tool | Compatible? | Why | Install | Run Command |
|---|------|-------------|-----|---------|-------------|
| 1 | **trufflehog** | YES | Scans git history for secrets using entropy + regex | `brew install trufflehog` or [binary](https://github.com/trufflesecurity/trufflehog/releases) | `trufflehog git file://. --json > reports/trufflehog_output.json` |
| 2 | **ggshield** | YES | GitGuardian's secret detection (SaaS, needs API key) | `pip install ggshield && ggshield auth login` | `ggshield secret scan repo . --json > reports/ggshield_output.json` |
| 3 | **Heimdall (built-in)** | YES | StormBreaker's own regex-based preflight scanner | Build from source: `cargo build --release` | `stormbreaker heimdall --tool all -p . -o reports/` |
| 4 | **secretScan.js (custom)** | YES | Our Heimdall-compatible Node.js scanner | Already in `scripts/` | `node scripts/secretScan.js --path . > reports/preflight/secretScan.txt` |

---

## 4. Infrastructure as Code (IaC) Scanning

| # | Tool | Compatible? | Why | Install | Run Command |
|---|------|-------------|-----|---------|-------------|
| 1 | **checkov** | PARTIAL | Scans Dockerfiles, Azure configs (web.config). No Terraform/K8s in this project. | `pip install checkov` | `checkov -d . --framework dockerfile --output json > reports/checkov_output.json` |
| 2 | **terrascan** | NO | Primarily Terraform/K8s/CloudFormation. No IaC files in this repo. | — | — |

---

## 5. Container Security

| # | Tool | Compatible? | Why | Install | Run Command |
|---|------|-------------|-----|---------|-------------|
| 1 | **trivy** (image mode) | CONDITIONAL | Only if Docker images are built for deployment | Already installed (see SCA) | `trivy image --format json --output reports/trivy_image.json <image_name>:<tag>` |
| 2 | **docker scout** | CONDITIONAL | Docker's built-in vulnerability scanner | Built-in with Docker Desktop | `docker scout cves <image_name>:<tag> --format json > reports/docker_scout.json` |

---

## 6. Heimdall Preflight Categories (Built-in)

These are StormBreaker Heimdall's regex-based checks that run without external tools:

| # | Category | What It Detects | Applicable? |
|---|----------|-----------------|-------------|
| 1 | `secrets_found` | Generic secrets, tokens, API keys | YES |
| 2 | `azure_secrets` | Azure connection strings, SAS tokens | YES |
| 3 | `aws_secrets` | AWS access keys, secret keys | YES |
| 4 | `secrets_certs` | Certificate/key files (.pem, .pfx) | YES |
| 5 | `env_files` | .env files containing secrets | YES |
| 6 | `secrets_privkey_content` | Private key content in files | YES |
| 7 | `secrets_connstrings` | Database connection strings | YES |
| 8 | `secrets_configs` | Config files with embedded secrets | YES |
| 9 | `ip_private` | Hardcoded private IPs | YES |
| 10 | `crypt_hashes` | Weak crypto usage (MD5, SHA1, DES) | YES |
| 11 | `fqdn_targets` | Hardcoded domain names / URLs | YES |
| 12 | `security_todos` | TODO/FIXME comments indicating unfinished security work | YES |
| 13 | `comments` | Code comments (informational) | YES |

---

## 7. Already Implemented (In-Repo)

These security checks are already running in our codebase:

| Tool/Test | Type | Location | Tests |
|-----------|------|----------|-------|
| npm audit | SCA | `scripts/security-scan.sh` | `dependencyAudit.test.js` (2 tests) |
| Heimdall preflight | Secret/config scanning | `scripts/security-scan.sh` | — |
| Custom secret scanner | Heimdall-compatible secrets | `scripts/secretScan.js` | `secretDetection.test.js` (7 tests) |
| SQL injection tests | SAST (unit tests) | `server/tests/security/` | `sqlInjection.test.js` (10 tests) |
| DML/DDL prevention | SAST (unit tests) | `server/tests/security/` | `dmlPrevention.test.js` (9 tests) |
| Banned API detection | SAST (unit tests) | `server/tests/security/` | `bannedApis.test.js` (8 tests) |
| Input validation | Runtime validation | `server/tests/security/` | `inputValidation.test.js` (14 tests) |
| Auth/session security | Auth checks | `server/tests/security/` | `authSession.test.js` (17 tests) |
| HTTP header security | Transport security | `server/tests/security/` | `httpHeaders.test.js` (11 tests) |
| Error information leakage | CWE-209 | `server/tests/security/` | `errorLeakage.test.js` (6 tests) |
| Prompt injection | LLM security | `server/tests/security/` | `promptInjection.test.js` (5 tests) |
| RLS data isolation | Row-level security | `server/tests/security/` | `rlsSecurity.test.js` (11 tests) |
| **Total** | | **11 test files + 2 scripts** | **108 tests** |

---

## 8. Recommended Additions (Not Yet Implemented)

Priority-ordered external tools that would add new coverage:

| Priority | Tool | Category | Gap It Fills | Effort |
|----------|------|----------|--------------|--------|
| P0 | **semgrep** | SAST | Deep JS/Node static analysis (taint tracking, data flow). Catches issues unit tests can't. | Low — `pip install semgrep && semgrep scan --config auto .` |
| P0 | **trufflehog** | Secrets | Scans git history for secrets that were committed and removed. Our scanner only checks working tree. | Low — single binary |
| P1 | **trivy** | SCA | Broader vulnerability DB than npm audit. Catches OS-level vulns if containerized. | Low — single binary |
| P1 | **snyk** | SCA | Commercial-grade SCA with reachability analysis and fix suggestions. | Medium — needs auth |
| P2 | **bearer** | SAST/Data | Detects sensitive data flows (PII leaking to logs, unencrypted storage). | Low — single binary |
| P2 | **osv-scanner** | SCA | Google's OSV database provides broader coverage than npm audit alone. | Low — single binary |
| P3 | **devskim** | SAST | Microsoft's security linter catches crypto issues, hardcoded creds patterns. | Medium — needs .NET SDK |
| P3 | **ggshield** | Secrets | GitGuardian's engine has higher accuracy for secret detection than regex-based tools. | Medium — needs API key |
| P4 | **checkov** | IaC | Only useful if we add Dockerfiles or Azure ARM templates. | Low but limited value now |
| P4 | **syft + bomber** | SBOM | Generates SBOM + checks against vulnerability DBs. Good for compliance. | Low |

---

## 9. StormBreaker Profile Mapping

How our tools map to StormBreaker's curated profiles:

| Profile | Tools Included | Our Coverage |
|---------|---------------|--------------|
| **minimal** | semgrep, syft, depscan, osv-scanner, trufflehog + language-specific | We have: npm audit, custom secret scanner. **Missing: semgrep, syft, osv-scanner, trufflehog** |
| **default** | minimal + snyk + trivy | **Missing: snyk, trivy** |
| **extended** | default + checkov + terrascan + devskim + bearer + ggshield | **Missing: checkov, devskim, bearer, ggshield** |
| **all** | Every available tool | — |

---

## 10. Quick-Start: Run All Compatible Tools

```bash
#!/usr/bin/env bash
# Run all compatible StormBreaker external tools against this project
set -euo pipefail
REPORTS="reports"
mkdir -p "$REPORTS/preflight"

echo "=== StormBreaker-Compatible Full Scan ==="

# Phase 1: SAST
echo "[SAST] semgrep..."
semgrep scan --config auto --json -o "$REPORTS/semgrep_output.json" server/ client/src/ 2>/dev/null || true

echo "[SAST] bearer..."
bearer scan . --format json --output "$REPORTS/bearer_output.json" 2>/dev/null || true

echo "[SAST] devskim..."
devskim analyze -I server/ client/src/ -f json -o "$REPORTS/devskim_output.json" 2>/dev/null || true

# Phase 2: SCA / Dependencies
echo "[SCA] npm audit (server)..."
cd server && npm audit --json > "../$REPORTS/npm_audit_server.json" 2>/dev/null || true && cd ..

echo "[SCA] npm audit (client)..."
cd client && npm audit --json > "../$REPORTS/npm_audit_client.json" 2>/dev/null || true && cd ..

echo "[SCA] trivy filesystem..."
trivy fs --format json --output "$REPORTS/trivy_output.json" . 2>/dev/null || true

echo "[SCA] osv-scanner..."
osv-scanner --json --lockfile=server/package-lock.json --lockfile=client/package-lock.json > "$REPORTS/osv_output.json" 2>/dev/null || true

echo "[SCA] snyk..."
snyk test --json > "$REPORTS/snyk_output.json" 2>/dev/null || true

echo "[SCA] syft SBOM..."
syft dir:. -o json > "$REPORTS/syft_sbom.json" 2>/dev/null || true

# Phase 3: Secrets
echo "[SECRETS] trufflehog git history..."
trufflehog git file://. --json > "$REPORTS/trufflehog_output.json" 2>/dev/null || true

echo "[SECRETS] ggshield..."
ggshield secret scan repo . --json > "$REPORTS/ggshield_output.json" 2>/dev/null || true

echo "[SECRETS] Custom Heimdall-style scanner..."
node scripts/secretScan.js --path . > "$REPORTS/preflight/secretScan.txt" 2>/dev/null || true

# Phase 4: IaC (if applicable)
echo "[IAC] checkov..."
checkov -d . --framework dockerfile --output json > "$REPORTS/checkov_output.json" 2>/dev/null || true

# Phase 5: Unit security tests
echo "[TESTS] Security test suite (108 tests)..."
cd server && node --test "tests/security/*.test.js" 2>&1 | tail -15 && cd ..

echo "=== Scan Complete — results in $REPORTS/ ==="
```

---

## 11. Tool Compatibility Summary

| Category | Total in StormBreaker | Compatible with JS/Node | Already Running | To Add |
|----------|-----------------------|-------------------------|-----------------|--------|
| SAST | 11 | 3 (semgrep, bearer, devskim) | 0 external (3 via unit tests) | 3 |
| SCA | 8 | 8 (all language-agnostic) | 1 (npm audit) | 7 |
| Secrets | 4 | 4 (all) | 2 (Heimdall, secretScan.js) | 2 |
| IaC | 2 | 1 (checkov, partial) | 0 | 1 |
| Container | 2 | 2 (conditional) | 0 | 0-2 |
| **Total** | **27** | **18** | **3** | **13** |
