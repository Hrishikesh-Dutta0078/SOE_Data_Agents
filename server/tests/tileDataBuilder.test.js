const test = require('node:test');
const assert = require('node:assert/strict');

test('buildTileData: KPI tile uses pre-computed aggregate', () => {
  const { buildTileData } = require('../services/tileDataBuilder');
  const spec = { tiles: [{ id: 't1', type: 'kpi', sourceIndex: 0, config: { valueColumn: 'Revenue', aggregation: 'sum', prefix: '$', suffix: '' } }] };
  const profiles = [{ preComputed: { kpiAggregates: { Revenue: { sum: 50000, avg: 10000, count: 5, min: 5000, max: 20000 } }, sparklineData: [{ period: '2024-01', value: 20000 }, { period: '2024-02', value: 30000 }] } }];
  const result = buildTileData(spec, profiles);
  assert.equal(result.t1.value, 50000);
  assert.equal(result.t1.formatted, '$50.0K');
  assert.ok(result.t1.sparklinePoints.length === 2);
});

test('buildTileData: chart tile uses grouped aggregates', () => {
  const { buildTileData } = require('../services/tileDataBuilder');
  const spec = { tiles: [{ id: 't2', type: 'chart', sourceIndex: 0, config: { chartType: 'bar', xAxis: { key: 'Region' }, yAxis: [{ key: 'Amount' }], groupBy: 'Region', aggregation: 'sum' } }] };
  const profiles = [{ preComputed: { groupedAggregates: { Region__Amount: [{ Region: 'AMERICAS', Amount: 100 }, { Region: 'EMEA', Amount: 200 }] } } }];
  const result = buildTileData(spec, profiles);
  assert.ok(result.t2.rows.length === 2);
});

test('buildTileData: insight tile passes through markdown', () => {
  const { buildTileData } = require('../services/tileDataBuilder');
  const spec = { tiles: [{ id: 't3', type: 'insight', sourceIndex: 0, config: { markdown: 'Test insight' } }] };
  const result = buildTileData(spec, [{}]);
  assert.equal(result.t3.markdown, 'Test insight');
});

test('buildTileData: missing profile returns null for tile', () => {
  const { buildTileData } = require('../services/tileDataBuilder');
  const spec = { tiles: [{ id: 't4', type: 'kpi', sourceIndex: 5, config: { valueColumn: 'X' } }] };
  const result = buildTileData(spec, []);
  assert.equal(result.t4, null);
});
