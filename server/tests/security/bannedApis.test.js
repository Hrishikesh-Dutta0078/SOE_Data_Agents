/**
 * Banned API Usage Tests — CWE-78, CWE-79, CWE-95
 * Maps directly to StormBreaker AST rules (banned_calls/js_ts.yaml):
 *   - heimdall.banned.js.eval
 *   - heimdall.banned.js.function_constructor
 *   - heimdall.banned.js.settimeout_string
 *   - heimdall.banned.js.innerhtml
 *   - heimdall.banned.js.document_write
 *   - heimdall.banned.js.child_process_exec
 *   - heimdall.banned.js.dangerously_set_innerhtml
 *   - heimdall.risky.cmdi.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SERVER_DIR = path.join(__dirname, '..', '..');
const CLIENT_DIR = path.join(SERVER_DIR, '..', 'client', 'src');
const PROJECT_ROOT = path.join(SERVER_DIR, '..');

function getSourceFiles(dir, extensions = ['.js', '.jsx', '.mjs', '.cjs']) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !['node_modules', '.git', 'reports', 'dist', 'build', 'public'].includes(entry.name)) {
        results.push(...getSourceFiles(fullPath, extensions));
      } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  } catch (_) { /* skip inaccessible dirs */ }
  return results;
}

function scanFiles(files, pattern, description) {
  const findings = [];
  for (const file of files) {
    // Skip test files themselves to avoid false positives from regex patterns in tests
    if (file.includes('security') && file.includes('.test.')) continue;
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comments and regex pattern definitions
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
      if (pattern.test(line)) {
        findings.push({ file: path.relative(PROJECT_ROOT, file), line: i + 1, text: line.trim() });
      }
    }
  }
  return findings;
}

// --- heimdall.banned.js.eval (CWE-95) ---

test('no eval() usage in server source', () => {
  const files = getSourceFiles(SERVER_DIR);
  const findings = scanFiles(files, /\beval\s*\(/, 'eval() usage');
  assert.equal(findings.length, 0, `eval() found:\n${findings.map((f) => `  ${f.file}:${f.line}: ${f.text}`).join('\n')}`);
});

// --- heimdall.banned.js.function_constructor (CWE-95) ---

test('no new Function() in server source', () => {
  const files = getSourceFiles(SERVER_DIR);
  const findings = scanFiles(files, /new\s+Function\s*\(/, 'new Function()');
  assert.equal(findings.length, 0, `new Function() found:\n${findings.map((f) => `  ${f.file}:${f.line}: ${f.text}`).join('\n')}`);
});

// --- heimdall.banned.js.innerhtml (CWE-79) ---

test('no innerHTML/outerHTML assignment in source', () => {
  const serverFiles = getSourceFiles(SERVER_DIR);
  const clientFiles = fs.existsSync(CLIENT_DIR) ? getSourceFiles(CLIENT_DIR) : [];
  const allFiles = [...serverFiles, ...clientFiles];
  const findings = scanFiles(allFiles, /\.innerHTML\s*=|\.outerHTML\s*=/, 'innerHTML assignment');
  assert.equal(findings.length, 0, `innerHTML found:\n${findings.map((f) => `  ${f.file}:${f.line}: ${f.text}`).join('\n')}`);
});

// --- heimdall.banned.js.document_write (CWE-79) ---

test('no document.write() in source', () => {
  const clientFiles = fs.existsSync(CLIENT_DIR) ? getSourceFiles(CLIENT_DIR) : [];
  const findings = scanFiles(clientFiles, /document\.(write|writeln)\s*\(/, 'document.write()');
  assert.equal(findings.length, 0, `document.write() found:\n${findings.map((f) => `  ${f.file}:${f.line}: ${f.text}`).join('\n')}`);
});

// --- heimdall.banned.js.dangerously_set_innerhtml (CWE-79) ---

test('no dangerouslySetInnerHTML in React components', () => {
  const clientFiles = fs.existsSync(CLIENT_DIR) ? getSourceFiles(CLIENT_DIR, ['.jsx', '.tsx', '.js']) : [];
  const findings = scanFiles(clientFiles, /dangerouslySetInnerHTML/, 'dangerouslySetInnerHTML');
  assert.equal(findings.length, 0, `dangerouslySetInnerHTML found:\n${findings.map((f) => `  ${f.file}:${f.line}: ${f.text}`).join('\n')}`);
});

// --- heimdall.banned.js.settimeout_string (CWE-95) ---

test('no setTimeout/setInterval with string argument in server', () => {
  const files = getSourceFiles(SERVER_DIR);
  // Match setTimeout('string...') or setTimeout("string...")
  const findings = scanFiles(files, /set(Timeout|Interval)\s*\(\s*['"]/, 'setTimeout with string');
  assert.equal(findings.length, 0, `setTimeout with string arg found:\n${findings.map((f) => `  ${f.file}:${f.line}: ${f.text}`).join('\n')}`);
});

// --- heimdall.banned.js.child_process_exec (CWE-78) ---

test('child_process exec/execSync usage review', () => {
  const files = getSourceFiles(SERVER_DIR);
  const findings = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
      // Match exec() or execSync() calls
      if (/\b(exec|execSync)\s*\(/.test(line) && !line.includes('execFile')) {
        // Check if using template strings (injection risk)
        if (/\b(exec|execSync)\s*\(\s*`/.test(line)) {
          findings.push({ file: path.relative(PROJECT_ROOT, file), line: i + 1, text: line.trim(), risk: 'template_string' });
        }
      }
    }
  }
  // Template string arguments to exec are high risk (command injection)
  const templateFindings = findings.filter((f) => f.risk === 'template_string');
  assert.equal(
    templateFindings.length, 0,
    `exec with template string (command injection risk):\n${templateFindings.map((f) => `  ${f.file}:${f.line}: ${f.text}`).join('\n')}`
  );
});

// --- heimdall.risky.sql_concat.js (CWE-89) ---

test('no SQL string concatenation in server source', () => {
  const files = getSourceFiles(SERVER_DIR);
  const sqlConcatPattern = /["'](SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\s[^"']*["']\s*\+/i;
  const findings = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
      // Skip test files and regex patterns
      if (file.includes('.test.') || file.includes('test')) continue;
      if (sqlConcatPattern.test(line)) {
        findings.push({ file: path.relative(PROJECT_ROOT, file), line: i + 1, text: line.trim() });
      }
    }
  }
  assert.equal(
    findings.length, 0,
    `SQL string concatenation found:\n${findings.map((f) => `  ${f.file}:${f.line}: ${f.text}`).join('\n')}`
  );
});
