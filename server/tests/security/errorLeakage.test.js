/**
 * Error Information Leakage Tests — CWE-209
 * Maps to StormBreaker category: InformationDisclosure
 * Verifies that error responses don't expose SQL details, stack traces, or connection strings.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '..', '..', 'routes');

test('textToSql.js analyze route uses generic error message', () => {
  const source = fs.readFileSync(path.join(ROUTES_DIR, 'textToSql.js'), 'utf8');
  // After fix: line 472 should not contain err.message in details field
  const analyzeErrorPattern = /details:\s*err\.message/;
  assert.ok(!analyzeErrorPattern.test(source), 'analyze route should not leak err.message in details field');
});

test('textToSql.js stream route uses generic error message', () => {
  const source = fs.readFileSync(path.join(ROUTES_DIR, 'textToSql.js'), 'utf8');
  // After fix: error payload in SSE should not use err.message
  const streamErrorPattern = /errorPayload\s*=\s*\{\s*error:\s*err\.message\s*\}/;
  assert.ok(!streamErrorPattern.test(source), 'stream route should not leak err.message in SSE error event');
});

test('textToSql.js dashboard-data uses generic error message', () => {
  const source = fs.readFileSync(path.join(ROUTES_DIR, 'textToSql.js'), 'utf8');
  // After fix: dashboard error should not include ${err.message}
  const dashboardErrorPattern = /Dashboard data query failed:\s*\$\{err\.message\}/;
  assert.ok(!dashboardErrorPattern.test(source), 'dashboard-data should not leak err.message');
});

test('textToSql.js history route uses generic error message', () => {
  const source = fs.readFileSync(path.join(ROUTES_DIR, 'textToSql.js'), 'utf8');
  // Find the history route error handler — should not expose err.message directly
  const lines = source.split('\n');
  let inHistoryRoute = false;
  let leaksMessage = false;
  for (const line of lines) {
    if (line.includes("'/history/:threadId'")) inHistoryRoute = true;
    if (inHistoryRoute && line.includes('module.exports')) break;
    if (inHistoryRoute && /res\.status\(500\)\.json\(\{\s*error:\s*err\.message/.test(line)) {
      leaksMessage = true;
    }
  }
  assert.ok(!leaksMessage, 'history route should not leak err.message');
});

test('health.js does not leak database error details', () => {
  const source = fs.readFileSync(path.join(ROUTES_DIR, 'health.js'), 'utf8');
  const leakPattern = /error:\s*`?.*\$\{err\.message\}/;
  assert.ok(!leakPattern.test(source), 'health route should not leak err.message');
});

// --- Verify error classes don't expose sensitive info ---

test('PipelineError does not include stack in message', () => {
  const { PipelineError } = require('../../utils/errors');
  const err = new PipelineError('test error');
  assert.ok(!err.message.includes('at '), 'Error message should not contain stack trace');
});
