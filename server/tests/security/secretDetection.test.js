/**
 * Secret Detection Tests — CWE-798
 * Maps to StormBreaker Heimdall secret rules (70+ YAML rules).
 * Scans source files for hardcoded secrets, API keys, and credentials.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SERVER_DIR = path.join(__dirname, '..', '..');
const PROJECT_ROOT = path.join(SERVER_DIR, '..');

function getSourceFiles(dir, extensions = ['.js']) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'reports') {
        results.push(...getSourceFiles(fullPath, extensions));
      } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  } catch (_) { /* skip inaccessible dirs */ }
  return results;
}

// --- AWS key patterns (ghost.aws.1) ---

test('no AWS access key IDs in source files', () => {
  const awsKeyPattern = /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/;
  const files = getSourceFiles(SERVER_DIR);
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const match = awsKeyPattern.exec(content);
    assert.ok(!match, `AWS key pattern found in ${path.relative(PROJECT_ROOT, file)}: ${match?.[0]}`);
  }
});

// --- Anthropic key patterns (ghost.anthropic.1) ---

test('no Anthropic API keys in source files', () => {
  const anthropicKeyPattern = /sk-ant-api\d{2}-[A-Za-z0-9_-]{20,}/;
  const files = getSourceFiles(SERVER_DIR);
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const match = anthropicKeyPattern.exec(content);
    assert.ok(!match, `Anthropic key found in ${path.relative(PROJECT_ROOT, file)}`);
  }
});

// --- Generic hardcoded passwords (heimdall.config.hardcoded_password) ---

test('no hardcoded passwords in server source (excluding examples/tests)', () => {
  const passwordPattern = /(?:password|passwd|pass)\s*[:=]\s*['"][^'"]{8,}['"]/i;
  const files = getSourceFiles(SERVER_DIR).filter(
    (f) => !f.includes('node_modules') && !f.includes('.env') && !f.includes('.test.') && !f.includes('test')
  );
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comments and env var references
      if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.includes('process.env')) continue;
      // Skip lines that are config descriptions or example strings
      if (line.includes('example') || line.includes('placeholder') || line.includes('change-in-production')) continue;
      const match = passwordPattern.exec(line);
      if (match) {
        assert.fail(`Hardcoded password in ${path.relative(PROJECT_ROOT, file)}:${i + 1}: ${match[0]}`);
      }
    }
  }
});

// --- Database connection strings (heimdall built-in) ---

test('no database connection strings in source files', () => {
  const connStringPattern = /(?:jdbc:|mongodb(?:\+srv)?:\/\/|postgres(?:ql)?:\/\/|mysql:\/\/|redis:\/\/|mssql:\/\/)[^\s'"]+/i;
  const files = getSourceFiles(SERVER_DIR).filter((f) => !f.includes('node_modules') && !f.includes('.test.'));
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const match = connStringPattern.exec(content);
    assert.ok(!match, `Connection string found in ${path.relative(PROJECT_ROOT, file)}: ${match?.[0]}`);
  }
});

// --- .env.example validation ---

test('.env.example contains no real values', () => {
  const envExamplePath = path.join(SERVER_DIR, '.env.example');
  if (!fs.existsSync(envExamplePath)) return;
  const content = fs.readFileSync(envExamplePath, 'utf8');
  const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  // Known safe patterns: placeholders like <...>, YOUR_*, localhost, model names, paths
  const SAFE_VALUE = /^(<[^>]+>|YOUR_\w+|true|false|localhost|https?:\/\/localhost|\/\w+|\d+|claude-[\w-]+|http:\/\/localhost:\d+)$/i;
  const SECRET_KEYS = /KEY|SECRET|PASSWORD|TOKEN/i;
  for (const line of lines) {
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1).trim();
    if (!value || SAFE_VALUE.test(value)) continue;
    // Only flag keys that look like secrets with high-entropy values
    if (SECRET_KEYS.test(key) && value.length > 30) {
      const uniqueChars = new Set(value).size;
      const entropy = uniqueChars / value.length;
      if (entropy > 0.6) {
        assert.fail(`Possible real secret in .env.example for key ${key}`);
      }
    }
  }
});

// --- .gitignore excludes .env ---

test('.gitignore excludes .env files', () => {
  const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    // Check server-level .gitignore
    const serverGitignore = path.join(SERVER_DIR, '.gitignore');
    if (fs.existsSync(serverGitignore)) {
      const content = fs.readFileSync(serverGitignore, 'utf8');
      assert.ok(content.includes('.env'), '.gitignore should exclude .env files');
      return;
    }
    return; // Skip if no .gitignore found
  }
  const content = fs.readFileSync(gitignorePath, 'utf8');
  assert.ok(content.includes('.env'), '.gitignore should exclude .env files');
});

// --- No private keys in source (heimdall private key regex) ---

test('no private key content in source files', () => {
  const privKeyPattern = /-----BEGIN\s+(RSA|OPENSSH|EC|DSA|PGP|ENCRYPTED)\s+PRIVATE\s+KEY/;
  const files = getSourceFiles(SERVER_DIR).filter((f) => !f.includes('node_modules') && !f.endsWith('.pem'));
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const match = privKeyPattern.exec(content);
    assert.ok(!match, `Private key content found in ${path.relative(PROJECT_ROOT, file)}`);
  }
});
