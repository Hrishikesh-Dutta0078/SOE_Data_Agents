# Trivy SCA Scan Review — Wave P1

**Date:** 2026-03-16
**Tool:** trivy v0.69.3
**Scan scope:** Filesystem (server + client package-lock.json)
**Total vulnerabilities:** 1
**Severity breakdown:** 0 Critical | 0 High | 1 Medium | 0 Low

---

## Summary

Trivy found **1 medium-severity vulnerability** in the server's npm dependencies. The client dependencies are clean.

## Vulnerability Detail

| Field | Value |
|-------|-------|
| **CVE** | CVE-2026-25528 |
| **Package** | `langsmith@0.3.87` |
| **Fixed in** | `0.4.6` |
| **Severity** | MEDIUM |
| **CVSS Score** | 5.8 (NVD) |
| **Title** | LangSmith Client SDK Affected by Server-Side Request Forgery via Tracing Header Injection |
| **Target** | `server/package-lock.json` (npm) |

### Description

The LangSmith SDK's distributed tracing feature is vulnerable to Server-Side Request Forgery (SSRF) via malicious HTTP headers. An attacker who can control tracing headers could induce the SDK to make requests to arbitrary internal endpoints.

### Risk Assessment for This Project

**Moderate risk.** LangSmith is used by LangGraph/LangChain for tracing in the agent pipeline. The SSRF vector requires an attacker to inject malicious tracing headers into requests processed by the LangGraph pipeline. In this project:

- The server is behind Okta authentication, limiting who can send requests
- Tracing headers would need to pass through the Express middleware layer
- The CVSS score (5.8) reflects moderate exploitability

### Remediation

Upgrade `langsmith` in `server/package.json`:

```bash
cd server
npm install langsmith@^0.4.6
```

Note: langsmith is a transitive dependency of `@langchain/core` / `langchain`. Upgrading may require updating LangChain packages to ensure compatibility:

```bash
cd server
npm update langsmith
npm audit fix
```

## Scan Targets

| Target | Type | Vulnerabilities |
|--------|------|----------------|
| server/package-lock.json | npm | 1 |
| client/package-lock.json | npm | 0 |
| (OS packages) | N/A | 0 |

## Scan Verdict

**WARN** — 1 medium-severity vulnerability found. Not blocking, but should be remediated as part of regular dependency maintenance.
