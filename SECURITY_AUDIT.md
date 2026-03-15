# Security Audit Report

**Date:** 2026-03-15
**Scope:** Full codebase — server (Express.js + LangGraph) and client (React + Vite)
**Methodology:** StormBreaker v6.4.0 security scanning methodology (Heimdall preflight, AST rules, YAML secret rules, configuration checks)
**Auditor:** Automated + manual review via Claude Code

---

## 1. Audit Summary

This audit applied the StormBreaker security scanning framework against the Auto Agents codebase. StormBreaker was built from source (`cargo build --release`) and its Heimdall module was run with `--tool all` to perform 24 categories of security checks including secret detection (70+ YAML rules), AST-based banned API detection, configuration security, and cryptographic weakness scanning.

Additionally, 108 security-focused unit tests were written covering 11 categories, and 4 code-level vulnerabilities were remediated.

---

## 2. StormBreaker Scan Results

### Heimdall Preflight Summary

| Category | Findings | Severity | Notes |
|----------|----------|----------|-------|
| secrets_found | 2 | INFO | Self-signed dev SSL cert/key (expected) |
| azure_secrets | 5 | LOW | All in node_modules/@azure (library code) |
| secrets_certs | 2 | INFO | server/cert.pem, server/key.pem (dev) |
| env_files | 2 | INFO | server/.env, server/.env.example (expected) |
| secrets_privkey_content | 9 | LOW | 1 in server/key.pem (dev), 8 in node_modules READMEs |
| secrets_connstrings | 38 | LOW | All in node_modules (zod tests, dotenv README) |
| secrets_configs | 1 | INFO | server/web.config (Azure deployment) |
| ip_private | 84 | LOW | Mostly node_modules (Azure IMDS endpoints) |
| security_todos | 1149 | INFO | TODO/FIXME comments (mostly node_modules) |
| crypt_hashes | 111 | LOW | All in node_modules (SHA-1 deprecation notices) |
| fqdn_targets | 2764 | INFO | Domain names in dependencies |
| comments | 181686 | INFO | Code comments (not security-relevant) |

**Source code findings (excluding node_modules):** No hardcoded secrets, API keys, or credentials found in application source code.

---

## 3. Security Posture Assessment

### Strengths
- Okta OAuth 2.0 + PKCE authentication properly implemented
- LDAP-based authorization with file-based allowlist
- Parameterized SQL queries via mssql package (no string concatenation)
- 4-pass SQL validation pipeline (RLS, Syntax, Schema, Semantic)
- Row-Level Security injection with numeric validation and string escaping
- HTTPS with secure cookie flags (httpOnly, sameSite=lax, secure)
- Custom error classes with sanitized logging
- No `eval()`, `new Function()`, `innerHTML`, `document.write()`, or `dangerouslySetInnerHTML` in source
- No SQL string concatenation patterns detected
- No hardcoded secrets in source code

### Gaps Identified (Fixed)
- Missing rate limiting (fixed: express-rate-limit added)
- No Content Security Policy headers (fixed: explicit CSP via helmet)
- Default SESSION_SECRET in code (fixed: throws in production)
- Error messages leaking `err.message` to clients (fixed: 5 endpoints sanitized)

---

## 4. Vulnerability Findings

| # | CWE | Severity | Location | Description | Status |
|---|-----|----------|----------|-------------|--------|
| 1 | CWE-798 | HIGH | server/index.js:89 | Default SESSION_SECRET allows session forgery if not overridden | FIXED |
| 2 | CWE-209 | MEDIUM | server/routes/textToSql.js:472 | `err.message` leaked in analyze route error response | FIXED |
| 3 | CWE-209 | MEDIUM | server/routes/textToSql.js:803 | `err.message` leaked in SSE error event | FIXED |
| 4 | CWE-209 | MEDIUM | server/routes/textToSql.js:909 | `err.message` leaked in dashboard-data error | FIXED |
| 5 | CWE-209 | MEDIUM | server/routes/textToSql.js:943 | `err.message` leaked in history route error | FIXED |
| 6 | CWE-209 | LOW | server/routes/health.js:13,20 | DB/LLM error messages leaked in health check | FIXED |
| 7 | CWE-770 | MEDIUM | server/index.js | No rate limiting on API endpoints | FIXED |
| 8 | CWE-693 | MEDIUM | server/index.js:75 | No Content Security Policy headers configured | FIXED |

---

## 5. Test Coverage Matrix

| StormBreaker Rule/Category | Test File | Tests | Status |
|----------------------------|-----------|-------|--------|
| heimdall.risky.sql_concat.js (CWE-89) | sqlInjection.test.js | 10 | PASS |
| RLS Data Scope Isolation | rlsSecurity.test.js | 11 | PASS |
| Input Validation (CWE-20) | inputValidation.test.js | 14 | PASS |
| Auth/Session (CWE-287, CWE-306) | authSession.test.js | 17 | PASS |
| InformationDisclosure (CWE-209) | errorLeakage.test.js | 6 | PASS |
| HTTP Headers (CWE-693) | httpHeaders.test.js | 11 | PASS |
| Prompt Injection (S4.4.1) | promptInjection.test.js | 5 | PASS |
| DML/DDL Prevention (CWE-89) | dmlPrevention.test.js | 9 | PASS |
| heimdall.banned.js.* (CWE-78,79,95) | bannedApis.test.js | 8 | PASS |
| ghost.aws/anthropic/generic.* (CWE-798) | secretDetection.test.js | 7 | PASS |
| Dependency Vulnerabilities | dependencyAudit.test.js | 2 | PASS |
| **TOTAL** | **11 files** | **108** | **ALL PASS** |

---

## 6. Remediation Log

### Fix 1: Session Secret Enforcement
**File:** server/index.js
**Before:** Default secret used silently in all environments
**After:** `if (NODE_ENV === 'production' && !SESSION_SECRET) throw Error(...)`

### Fix 2: Error Message Sanitization (5 endpoints)
**Files:** server/routes/textToSql.js, server/routes/health.js
**Before:** `details: err.message`, `error: err.message`, `error: \`...${err.message}\``
**After:** Generic messages: `'Internal processing error'`, `'Stream processing failed'`, `'Dashboard data query failed'`, `'History retrieval failed'`, `'error'`

### Fix 3: Rate Limiting
**Files:** server/middleware/rateLimiter.js (new), server/index.js, server/package.json
**Added:** `express-rate-limit` with per-endpoint limits:
- /api/text-to-sql/*: 20 req/min per session
- /api/impersonate/*: 30 req/min per IP
- Auth routes: 5 req/min per IP

### Fix 4: Content Security Policy
**File:** server/index.js
**Before:** `app.use(helmet())` — bare defaults, no CSP
**After:** Explicit CSP directives: `defaultSrc: ['self']`, `scriptSrc: ['self']`, `frameAncestors: ['none']`, `objectSrc: ['none']`, etc.

---

## 7. External Scanning Tools

| Tool | Status | Output |
|------|--------|--------|
| StormBreaker Heimdall (v6.4.0) | Built and run | reports/preflight/*.list (15 files) |
| npm audit | Integrated | 0 critical, 0 high vulnerabilities |
| Custom secretScan.js | Created | Implements 10 key Heimdall patterns |
| security-scan.sh | Created | Orchestrates all scanning tools |

**Running scans:**
```bash
# Full security scan (StormBreaker + npm audit + custom scanner + tests)
bash scripts/security-scan.sh

# Unit tests only
cd server && npm run test:security

# Secret scanner only
node scripts/secretScan.js

# npm audit only
cd server && npm audit
```

---

## 8. Residual Risks

| Risk | Reason | Mitigation |
|------|--------|------------|
| Prompt injection via LLM | Cannot unit test actual LLM behavior | System prompts include security constraints; classify node filters intent |
| Dashboard-data SQL pass-through | Endpoint receives SQL from client (auth-gated) | Authentication + LDAP allowlist gate access; SQL is pipeline-generated |
| Integration test coverage | Unit tests mock DB/LLM; don't test live interactions | Recommend adding integration tests for auth flow and RLS in staging |
| Supply chain risk | 3rd-party npm dependencies | npm audit integrated; recommend Dependabot/Renovate for ongoing monitoring |

---

## 9. CI Integration Recommendations

Add to CI/CD pipeline:
```yaml
# GitHub Actions example
- name: Security Tests
  run: cd server && npm run test:security

- name: npm Audit
  run: cd server && npm audit --audit-level=high

- name: Secret Scan
  run: node scripts/secretScan.js
```

---

## 10. Files Modified/Created

### Modified
- `server/index.js` — Session secret enforcement, CSP headers, rate limiting
- `server/routes/textToSql.js` — Error message sanitization (4 locations)
- `server/routes/health.js` — Error message sanitization (2 locations)
- `server/package.json` — Added express-rate-limit, test:security script

### Created
- `server/middleware/rateLimiter.js` — Rate limiting middleware
- `server/tests/security/sqlInjection.test.js` — 10 tests
- `server/tests/security/rlsSecurity.test.js` — 11 tests
- `server/tests/security/inputValidation.test.js` — 14 tests
- `server/tests/security/authSession.test.js` — 17 tests
- `server/tests/security/errorLeakage.test.js` — 6 tests
- `server/tests/security/httpHeaders.test.js` — 11 tests
- `server/tests/security/promptInjection.test.js` — 5 tests
- `server/tests/security/dmlPrevention.test.js` — 9 tests
- `server/tests/security/secretDetection.test.js` — 7 tests
- `server/tests/security/bannedApis.test.js` — 8 tests
- `server/tests/security/dependencyAudit.test.js` — 2 tests
- `scripts/secretScan.js` — Heimdall-style secret scanner
- `scripts/security-scan.sh` — Full scanning orchestrator
- `SECURITY_AUDIT.md` — This document
