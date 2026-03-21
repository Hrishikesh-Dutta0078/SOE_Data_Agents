const test = require('node:test');
const assert = require('node:assert/strict');

test('inferColumnType: numeric values', () => {
  const { inferColumnType } = require('../services/dataProfiler').__testables;
  assert.equal(inferColumnType([100, 200, 300, null, 500]), 'numeric');
});

test('inferColumnType: date values', () => {
  const { inferColumnType } = require('../services/dataProfiler').__testables;
  assert.equal(inferColumnType(['2024-01-01', '2024-02-15', '2024-03-20']), 'date');
});

test('inferColumnType: boolean-like values', () => {
  const { inferColumnType } = require('../services/dataProfiler').__testables;
  assert.equal(inferColumnType([true, false, true, false]), 'boolean');
  assert.equal(inferColumnType(['yes', 'no', 'yes']), 'boolean');
  assert.equal(inferColumnType([1, 0, 1, 0]), 'boolean');
});

test('inferColumnType: categorical values', () => {
  const { inferColumnType } = require('../services/dataProfiler').__testables;
  assert.equal(inferColumnType(['AMERICAS', 'EMEA', 'APAC', 'AMERICAS']), 'categorical');
});

test('inferColumnType: text (high cardinality)', () => {
  const { inferColumnType } = require('../services/dataProfiler').__testables;
  const names = Array.from({ length: 60 }, (_, i) => `Account_${i}`);
  assert.equal(inferColumnType(names), 'text');
});

test('inferColumnType: all nulls returns null', () => {
  const { inferColumnType } = require('../services/dataProfiler').__testables;
  assert.equal(inferColumnType([null, null, undefined]), null);
});

test('analyzeColumn: numeric distribution', () => {
  const { analyzeColumn } = require('../services/dataProfiler').__testables;
  const values = [10, 20, 30, 40, 50, null];
  const result = analyzeColumn('Amount', values);
  assert.equal(result.name, 'Amount');
  assert.equal(result.inferredType, 'numeric');
  assert.equal(result.cardinality, 5);
  assert.ok(result.nullRatio > 0.16 && result.nullRatio < 0.17);
  assert.equal(result.distribution.min, 10);
  assert.equal(result.distribution.max, 50);
  assert.equal(result.distribution.mean, 30);
});

test('analyzeColumn: categorical with topValues', () => {
  const { analyzeColumn } = require('../services/dataProfiler').__testables;
  const values = ['A', 'A', 'A', 'B', 'B', 'C'];
  const result = analyzeColumn('Region', values);
  assert.equal(result.inferredType, 'categorical');
  assert.equal(result.cardinality, 3);
  assert.deepEqual(result.distinctValues, ['A', 'B', 'C']);
  assert.equal(result.distribution.topValues[0].value, 'A');
  assert.equal(result.distribution.topValues[0].count, 3);
});

test('analyzeColumn: all identical values', () => {
  const { analyzeColumn } = require('../services/dataProfiler').__testables;
  const result = analyzeColumn('Status', ['Active', 'Active', 'Active']);
  assert.equal(result.cardinality, 1);
});

test('analyzeColumn: empty array', () => {
  const { analyzeColumn } = require('../services/dataProfiler').__testables;
  const result = analyzeColumn('Empty', []);
  assert.equal(result.cardinality, 0);
  assert.equal(result.nullRatio, 1.0);
});
