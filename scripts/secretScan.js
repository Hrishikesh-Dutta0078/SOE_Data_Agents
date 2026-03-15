#!/usr/bin/env node
/**
 * Heimdall-style Secret Scanner — Node.js implementation
 * Implements key regex patterns from StormBreaker's Heimdall module
 * for detecting hardcoded secrets, credentials, and sensitive data.
 *
 * Usage: node scripts/secretScan.js [--path <dir>]
 */
const fs = require('fs');
const path = require('path');

const SKIP_DIRS = new Set(['node_modules', '.git', 'reports', 'dist', 'build', 'public']);
const SCAN_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.yml', '.yaml', '.env', '.toml', '.cfg', '.ini', '.conf']);

const RULES = [
  { id: 'ghost.aws.1', name: 'AWS Access Key ID', severity: 'HIGH',
    pattern: /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/ },
  { id: 'ghost.anthropic.1', name: 'Anthropic API Key', severity: 'HIGH',
    pattern: /sk-ant-api\d{2}-[A-Za-z0-9_-]{20,}/ },
  { id: 'ghost.generic.3', name: 'Generic Password', severity: 'HIGH',
    pattern: /(?:password|passwd|pass)\s*[:=]\s*['"][^'"]{8,}['"]/i },
  { id: 'ghost.generic.4', name: 'JWT Token', severity: 'MEDIUM',
    pattern: /eyJ[A-Za-z0-9_-]{30,}\.eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{8,}/ },
  { id: 'heimdall.connstring', name: 'Database Connection String', severity: 'HIGH',
    pattern: /(?:jdbc:|mongodb(?:\+srv)?:\/\/|postgres(?:ql)?:\/\/|mysql:\/\/|redis:\/\/|mssql:\/\/)[^\s'"]+/i },
  { id: 'heimdall.privkey', name: 'Private Key Content', severity: 'CRITICAL',
    pattern: /-----BEGIN\s+(?:RSA|OPENSSH|EC|DSA|PGP|ENCRYPTED)\s+PRIVATE\s+KEY/ },
  { id: 'heimdall.config.hardcoded_password', name: 'Hardcoded Password', severity: 'HIGH',
    pattern: /(?:password|passwd|pass)\s*[:=]\s*['"][^'"]{4,}['"]/i },
  { id: 'heimdall.config.debug_mode', name: 'Debug Mode Enabled', severity: 'MEDIUM',
    pattern: /(?:debug|DEBUG)\s*[:=]\s*(?:true|1|yes|on)\b/i },
  { id: 'heimdall.weakCrypto', name: 'Weak Cryptography', severity: 'MEDIUM',
    pattern: /\b(?:MD4|MD5|RC4|RC2|DES|3DES|Blowfish|SHA-1|ECB)\b.*\b(?:cipher|hash|algorithm)\b/i },
  { id: 'heimdall.internalUrl', name: 'Internal/Staging URL', severity: 'LOW',
    pattern: /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|internal|staging|dev|preprod|uat|qa|test)\b[^\s'"<>)}\]]+/i },
];

function getFiles(dir) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...getFiles(full));
      } else if (SCAN_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        results.push(full);
      }
    }
  } catch (_) { /* skip */ }
  return results;
}

function scan(targetDir) {
  const files = getFiles(targetDir);
  const findings = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//') || line.trim().startsWith('#')) continue;
      for (const rule of RULES) {
        if (rule.pattern.test(line)) {
          // Skip .env files for internal URL rule (expected)
          if (rule.id === 'heimdall.internalUrl' && file.includes('.env')) continue;
          // Skip config descriptions
          if (line.includes('process.env') || line.includes('placeholder') || line.includes('<')) continue;
          findings.push({
            rule: rule.id,
            name: rule.name,
            severity: rule.severity,
            file: path.relative(targetDir, file),
            line: i + 1,
            text: line.trim().substring(0, 120),
          });
        }
      }
    }
  }
  return findings;
}

// --- Main ---
const targetDir = process.argv.includes('--path')
  ? process.argv[process.argv.indexOf('--path') + 1]
  : path.join(__dirname, '..');

console.log(`Scanning ${targetDir} ...\n`);
const findings = scan(targetDir);

if (findings.length === 0) {
  console.log('No secrets or sensitive patterns found.');
  process.exit(0);
}

console.log(`Found ${findings.length} finding(s):\n`);
const grouped = {};
for (const f of findings) {
  (grouped[f.severity] = grouped[f.severity] || []).push(f);
}
for (const sev of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) {
  if (!grouped[sev]) continue;
  console.log(`--- ${sev} (${grouped[sev].length}) ---`);
  for (const f of grouped[sev]) {
    console.log(`  [${f.rule}] ${f.file}:${f.line} — ${f.name}`);
    console.log(`    ${f.text}`);
  }
  console.log();
}

process.exit(findings.some((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH') ? 1 : 0);
