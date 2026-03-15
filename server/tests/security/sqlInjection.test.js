/**
 * SQL Injection Prevention Tests — CWE-89
 * Maps to StormBreaker rule: heimdall.risky.sql_concat.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { applyRls, buildRlsContextFromImpersonate } = require('../../utils/rlsInjector');

// --- RLS String Escaping (slmName / tlmName) ---

test('RLS escapes apostrophes in slmName', () => {
  const sql = "SELECT * FROM vw_TF_EBI_P2S WHERE 1=1";
  const ctx = { slmName: "O'Brien" };
  const result = applyRls(sql, ctx);
  assert.ok(result.includes("N'O''Brien'"), 'Apostrophe should be double-escaped');
  assert.ok(!result.includes("N'O'Brien'"), 'Single apostrophe should not appear unescaped');
});

test('RLS escapes classic SQL injection in slmName', () => {
  const sql = "SELECT * FROM vw_TF_EBI_P2S WHERE 1=1";
  const ctx = { slmName: "'; DROP TABLE vw_TF_EBI_P2S --" };
  const result = applyRls(sql, ctx);
  // The apostrophe in the injection payload gets doubled: ' → ''
  // Input: '; DROP TABLE... → Output: N'''; DROP TABLE...'
  // The '' is the escaped apostrophe, and the third ' ends the N'...' string
  assert.ok(result.includes("''"), 'Apostrophe should be doubled');
  // The SLM filter should be present with the escaped value
  assert.ok(result.includes("rls_r.SLM = N'"), 'SLM filter should be present');
});

test('RLS escapes tautology injection in slmName', () => {
  const sql = "SELECT * FROM vw_TF_EBI_P2S WHERE 1=1";
  const ctx = { slmName: "foo' OR '1'='1" };
  const result = applyRls(sql, ctx);
  assert.ok(result.includes("''"), 'Tautology attempt should be escaped');
});

test('RLS escapes apostrophes in tlmName', () => {
  const sql = "SELECT * FROM vw_TF_EBI_P2S WHERE 1=1";
  const ctx = { tlmName: "test'; EXEC xp_cmdshell('whoami')--" };
  const result = applyRls(sql, ctx);
  assert.ok(result.includes("''"), 'Command injection attempt should be escaped');
});

// --- RLS Numeric Validation (flmId / repId) ---

test('RLS rejects non-numeric string in flmId', () => {
  const ctx = buildRlsContextFromImpersonate({ type: 'flm', id: '123; DROP TABLE users' });
  const sql = "SELECT * FROM vw_TF_EBI_P2S WHERE 1=1";
  const result = applyRls(sql, ctx);
  // flmId will be NaN, so Number.isFinite fails and no filter is injected
  assert.ok(!result.includes('DROP TABLE'), 'Non-numeric flmId should not produce injection');
});

test('RLS rejects NaN flmId', () => {
  const sql = "SELECT * FROM vw_TF_EBI_P2S WHERE 1=1";
  const ctx = { flmId: NaN };
  const result = applyRls(sql, ctx);
  assert.ok(!result.includes('NaN'), 'NaN should not appear in SQL');
});

test('RLS rejects Infinity flmId', () => {
  const sql = "SELECT * FROM vw_TF_EBI_P2S WHERE 1=1";
  const ctx = { flmId: Infinity };
  const result = applyRls(sql, ctx);
  assert.ok(!result.includes('Infinity'), 'Infinity should not appear in SQL');
});

test('RLS accepts valid numeric flmId', () => {
  const sql = "SELECT * FROM vw_TF_EBI_P2S WHERE 1=1";
  const ctx = { flmId: 42 };
  const result = applyRls(sql, ctx);
  assert.ok(result.includes('FLM_ID = 42'), 'Valid numeric flmId should be injected');
});

// --- Column Name Regex Validation (from dashboard-data endpoint) ---

test('Column name regex accepts valid identifiers', () => {
  const regex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  assert.ok(regex.test('VALID_COLUMN'));
  assert.ok(regex.test('col1'));
  assert.ok(regex.test('_private'));
  assert.ok(regex.test('A'));
});

test('Column name regex rejects injection payloads', () => {
  const regex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  assert.ok(!regex.test('col; DROP TABLE x'));
  assert.ok(!regex.test("col' OR '1'='1"));
  assert.ok(!regex.test('col\nDROP'));
  assert.ok(!regex.test('col--comment'));
  assert.ok(!regex.test('col/*comment*/'));
  assert.ok(!regex.test('col[0]'));
});

test('Column name regex rejects empty and digit-start', () => {
  const regex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  assert.ok(!regex.test(''));
  assert.ok(!regex.test('123col'));
  assert.ok(!regex.test('0'));
});
