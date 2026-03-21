const test = require('node:test');
const assert = require('node:assert/strict');

test('profileDataSource: single row returns types but no shapes', () => {
  const { profileDataSource } = require('../services/dataProfiler');
  const profile = profileDataSource('SELECT 1', [{ A: 100 }], ['A']);
  assert.equal(profile.columns[0].inferredType, 'numeric');
  assert.equal(profile.shapes.isTimeSeries, null);
  assert.equal(profile.shapes.categoricalGroups.length, 0);
});

test('profileDataSource: large dataset uses sampling', () => {
  const { profileDataSource } = require('../services/dataProfiler');
  const rows = Array.from({ length: 2000 }, (_, i) => ({ Val: i, Cat: `C${i % 10}` }));
  const profile = profileDataSource('SELECT Val, Cat FROM t', rows, ['Val', 'Cat']);
  // Should complete without error and produce valid aggregates from full data
  assert.equal(profile.preComputed.kpiAggregates.Val.count, 2000);
  assert.equal(profile.rowCount, 2000);
});

test('dashboardAgent falls back to raw samples when profiles are null', () => {
  const { buildDashboardInputs } = require('../prompts/dashboard');
  const state = {
    dashboardHasDataRequest: true,
    dataProfiles: null,
    queries: [{ subQuestion: 'test', sql: 'SELECT 1', execution: { success: true, rows: [{ a: 1 }], columns: ['a'], rowCount: 1 } }],
    execution: null,
    question: 'test',
  };
  const result = buildDashboardInputs(state);
  assert.ok(result.dataContext.includes('Data Source'));
  assert.ok(!result.dataContext.includes('PROFILES'));
});
