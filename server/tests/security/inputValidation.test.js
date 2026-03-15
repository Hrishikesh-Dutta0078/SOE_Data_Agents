/**
 * Input Validation Tests — CWE-20
 * Tests API boundary input validation logic.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

// --- Question field validation (replicates textToSql.js:426-428 logic) ---

function validateQuestion(question) {
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return { valid: false, error: 'Request body must include a non-empty "question" string.' };
  }
  return { valid: true };
}

test('question validation rejects empty string', () => {
  assert.equal(validateQuestion('').valid, false);
});

test('question validation rejects whitespace only', () => {
  assert.equal(validateQuestion('   ').valid, false);
});

test('question validation rejects non-string number', () => {
  assert.equal(validateQuestion(123).valid, false);
});

test('question validation rejects null', () => {
  assert.equal(validateQuestion(null).valid, false);
});

test('question validation rejects undefined', () => {
  assert.equal(validateQuestion(undefined).valid, false);
});

test('question validation accepts valid string', () => {
  assert.equal(validateQuestion('What is the total revenue?').valid, true);
});

test('question validation accepts XSS payload as text (does not execute)', () => {
  const xss = '<script>alert("xss")</script>';
  assert.equal(validateQuestion(xss).valid, true);
});

test('question validation accepts SQL injection text', () => {
  const sqli = "'; DROP TABLE users; --";
  assert.equal(validateQuestion(sqli).valid, true);
});

// --- Dashboard mode validation (replicates textToSql.js:852-853 logic) ---

function validateDashboardMode(mode) {
  if (!mode || !['page', 'distinct'].includes(mode)) {
    return { valid: false };
  }
  return { valid: true };
}

test('dashboard mode accepts "page"', () => {
  assert.equal(validateDashboardMode('page').valid, true);
});

test('dashboard mode accepts "distinct"', () => {
  assert.equal(validateDashboardMode('distinct').valid, true);
});

test('dashboard mode rejects invalid value', () => {
  assert.equal(validateDashboardMode('invalid').valid, false);
});

test('dashboard mode rejects null', () => {
  assert.equal(validateDashboardMode(null).valid, false);
});

test('dashboard mode rejects empty string', () => {
  assert.equal(validateDashboardMode('').valid, false);
});

// --- SAFE_IDENTIFIER regex (from sampleTableData tool) ---

test('SAFE_IDENTIFIER accepts valid table names', () => {
  const SAFE_IDENTIFIER = /^[a-zA-Z0-9_.]+$/;
  assert.ok(SAFE_IDENTIFIER.test('vw_TF_EBI_P2S'));
  assert.ok(SAFE_IDENTIFIER.test('dbo.TableName'));
  assert.ok(SAFE_IDENTIFIER.test('schema.table.column'));
});

test('SAFE_IDENTIFIER rejects injection payloads', () => {
  const SAFE_IDENTIFIER = /^[a-zA-Z0-9_.]+$/;
  assert.ok(!SAFE_IDENTIFIER.test('table; DROP'));
  assert.ok(!SAFE_IDENTIFIER.test("table' OR"));
  assert.ok(!SAFE_IDENTIFIER.test('table--comment'));
  assert.ok(!SAFE_IDENTIFIER.test(''));
  assert.ok(!SAFE_IDENTIFIER.test('table name'));
  assert.ok(!SAFE_IDENTIFIER.test('table[0]'));
});

// --- normalizeEnabledTools (replicates textToSql.js logic) ---

function normalizeEnabledTools(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const result = {};
  for (const phase of ['research', 'sqlWriter']) {
    if (Array.isArray(raw[phase])) {
      result[phase] = raw[phase].filter((t) => typeof t === 'string');
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

test('normalizeEnabledTools returns null for null', () => {
  assert.equal(normalizeEnabledTools(null), null);
});

test('normalizeEnabledTools returns null for non-object', () => {
  assert.equal(normalizeEnabledTools('string'), null);
  assert.equal(normalizeEnabledTools(123), null);
});

test('normalizeEnabledTools filters non-string tool names', () => {
  const result = normalizeEnabledTools({ research: ['validTool', 123, null] });
  assert.deepEqual(result, { research: ['validTool'] });
});
