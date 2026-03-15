/**
 * Row-Level Security Tests — Data Scope Isolation
 * Tests RLS filter injection and validation.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { applyRls, buildRlsContextFromImpersonate } = require('../../utils/rlsInjector');
const { validateRls } = require('../../validation/rlsValidator');

// --- applyRls filter injection ---

test('applyRls injects filter for single RLS table', () => {
  const sql = 'SELECT * FROM vw_TF_EBI_P2S';
  const ctx = { flmId: 100 };
  const result = applyRls(sql, ctx);
  assert.ok(result.includes('REGION_ID IN'), 'Should inject REGION_ID filter');
  assert.ok(result.includes('FLM_ID = 100'), 'Should reference correct FLM_ID');
});

test('applyRls injects filters for JOINed RLS tables', () => {
  const sql = 'SELECT p.*, q.* FROM vw_TF_EBI_P2S p JOIN vw_TF_EBI_QUOTA q ON p.REGION_ID = q.REGION_ID';
  const ctx = { flmId: 200 };
  const result = applyRls(sql, ctx);
  assert.ok(result.includes('REGION_ID IN'), 'Should inject at least one REGION_ID filter');
  assert.ok(result.includes('FLM_ID = 200'), 'Should reference correct FLM_ID');
});

test('applyRls passes through SQL without RLS tables', () => {
  const sql = 'SELECT 1 AS test';
  const ctx = { flmId: 100 };
  const result = applyRls(sql, ctx);
  assert.ok(!result.includes('REGION_ID IN'), 'Should not inject filter for non-RLS tables');
});

test('applyRls returns unchanged SQL when no RLS context', () => {
  const sql = 'SELECT * FROM vw_TF_EBI_P2S';
  const result = applyRls(sql, null);
  assert.equal(result, sql, 'Should return original SQL');
});

test('applyRls handles indirect RLS table with multi-step subquery', () => {
  const sql = 'SELECT * FROM vw_TD_ICP_UCP_SCORES';
  const ctx = { flmId: 300 };
  const result = applyRls(sql, ctx);
  assert.ok(result.includes('ACCOUNT_SUB_ID IN'), 'Should inject indirect filter chain');
  assert.ok(result.includes('vw_TD_EBI_ACCOUNT'), 'Should reference intermediate table');
});

// --- validateRls ---

test('validateRls catches missing RLS filter', () => {
  const sql = 'SELECT * FROM vw_TF_EBI_P2S WHERE SALES_STAGE_ID = 3';
  const ctx = { flmId: 100 };
  const result = validateRls(sql, ctx);
  assert.equal(result.valid, false, 'Should fail when RLS filter is missing');
  assert.ok(result.issues.length > 0, 'Should have issues');
  assert.equal(result.issues[0].type, 'RLS_MISSING');
});

test('validateRls passes when correct filter present', () => {
  const sql = 'SELECT * FROM vw_TF_EBI_P2S WHERE REGION_ID IN (SELECT rls_r.REGION_ID FROM vw_td_ebi_region_rpt rls_r WHERE rls_r.FLM_ID = 100)';
  const ctx = { flmId: 100 };
  const result = validateRls(sql, ctx);
  assert.equal(result.valid, true, 'Should pass when RLS filter is present');
});

test('validateRls passes when no RLS tables in SQL', () => {
  const sql = 'SELECT 1 AS test';
  const ctx = { flmId: 100 };
  const result = validateRls(sql, ctx);
  assert.equal(result.valid, true, 'No RLS tables means valid');
});

test('validateRls passes when no RLS context', () => {
  const sql = 'SELECT * FROM vw_TF_EBI_P2S';
  const result = validateRls(sql, null);
  assert.equal(result.valid, true, 'No context means valid');
});

// --- buildRlsContextFromImpersonate ---

test('buildRlsContextFromImpersonate returns null for null', () => {
  assert.equal(buildRlsContextFromImpersonate(null), null);
});

test('buildRlsContextFromImpersonate returns null for empty object', () => {
  assert.equal(buildRlsContextFromImpersonate({}), null);
});

test('buildRlsContextFromImpersonate returns null for unknown type', () => {
  assert.equal(buildRlsContextFromImpersonate({ type: 'admin', id: 1 }), null);
});

test('buildRlsContextFromImpersonate handles valid FLM type', () => {
  const result = buildRlsContextFromImpersonate({ type: 'flm', id: 42 });
  assert.deepEqual(result, { flmId: 42 });
});

test('buildRlsContextFromImpersonate handles valid SLM type', () => {
  const result = buildRlsContextFromImpersonate({ type: 'slm', id: 'John Doe' });
  assert.deepEqual(result, { slmName: 'John Doe' });
});

test('buildRlsContextFromImpersonate handles valid TLM type', () => {
  const result = buildRlsContextFromImpersonate({ type: 'tlm', id: 'Jane Doe' });
  assert.deepEqual(result, { tlmName: 'Jane Doe' });
});
