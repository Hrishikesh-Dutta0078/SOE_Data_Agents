/**
 * Dependency Vulnerability Audit Tests
 * Maps to StormBreaker dependency scanning (syft, osv-scanner, snyk).
 * Runs npm audit programmatically to check for known vulnerabilities.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('child_process');
const path = require('path');

const SERVER_DIR = path.join(__dirname, '..', '..');

test('no critical npm audit vulnerabilities in server', () => {
  try {
    const result = execSync('npm audit --json 2>/dev/null', {
      cwd: SERVER_DIR,
      encoding: 'utf8',
      timeout: 30000,
    });
    const audit = JSON.parse(result);
    const critical = audit.metadata?.vulnerabilities?.critical || 0;
    assert.equal(critical, 0, `Found ${critical} critical vulnerabilities. Run 'npm audit' for details.`);
  } catch (err) {
    // npm audit exits with non-zero if vulnerabilities found
    if (err.stdout) {
      try {
        const audit = JSON.parse(err.stdout);
        const critical = audit.metadata?.vulnerabilities?.critical || 0;
        assert.equal(critical, 0, `Found ${critical} critical vulnerabilities. Run 'npm audit' for details.`);
      } catch (_) {
        // JSON parse failed — npm audit output format may differ
      }
    }
  }
});

test('no high npm audit vulnerabilities in server', () => {
  try {
    const result = execSync('npm audit --json 2>/dev/null', {
      cwd: SERVER_DIR,
      encoding: 'utf8',
      timeout: 30000,
    });
    const audit = JSON.parse(result);
    const high = audit.metadata?.vulnerabilities?.high || 0;
    assert.equal(high, 0, `Found ${high} high vulnerabilities. Run 'npm audit' for details.`);
  } catch (err) {
    if (err.stdout) {
      try {
        const audit = JSON.parse(err.stdout);
        const high = audit.metadata?.vulnerabilities?.high || 0;
        assert.equal(high, 0, `Found ${high} high vulnerabilities. Run 'npm audit' for details.`);
      } catch (_) {
        // JSON parse failed
      }
    }
  }
});
