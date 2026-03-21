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

test('detectShapes: time-series detection', () => {
  const { detectShapes } = require('../services/dataProfiler').__testables;
  const columns = [
    { name: 'CloseDate', inferredType: 'date', cardinality: 12 },
    { name: 'Amount', inferredType: 'numeric', cardinality: 100 },
    { name: 'Region', inferredType: 'categorical', cardinality: 5 },
  ];
  const shapes = detectShapes(columns);
  assert.ok(shapes.isTimeSeries);
  assert.equal(shapes.isTimeSeries.dateColumn, 'CloseDate');
  assert.ok(shapes.isTimeSeries.measureColumns.includes('Amount'));
});

test('detectShapes: categorical groups', () => {
  const { detectShapes } = require('../services/dataProfiler').__testables;
  const columns = [
    { name: 'Region', inferredType: 'categorical', cardinality: 5 },
    { name: 'Amount', inferredType: 'numeric', cardinality: 100 },
    { name: 'Count', inferredType: 'numeric', cardinality: 50 },
  ];
  const shapes = detectShapes(columns);
  assert.ok(shapes.categoricalGroups.length > 0);
  assert.equal(shapes.categoricalGroups[0].dimension, 'Region');
});

test('detectShapes: KPI candidates', () => {
  const { detectShapes } = require('../services/dataProfiler').__testables;
  const columns = [
    { name: 'TotalRevenue', inferredType: 'numeric', cardinality: 100 },
    { name: 'Region', inferredType: 'categorical', cardinality: 3 },
  ];
  const shapes = detectShapes(columns);
  assert.ok(shapes.kpiCandidates.length > 0);
  assert.equal(shapes.kpiCandidates[0].column, 'TotalRevenue');
});

test('detectShapes: no date columns -> isTimeSeries is null', () => {
  const { detectShapes } = require('../services/dataProfiler').__testables;
  const columns = [
    { name: 'Region', inferredType: 'categorical', cardinality: 5 },
    { name: 'Amount', inferredType: 'numeric', cardinality: 50 },
  ];
  const shapes = detectShapes(columns);
  assert.equal(shapes.isTimeSeries, null);
});

test('recommendCharts: time-series -> line', () => {
  const { recommendCharts } = require('../services/dataProfiler').__testables;
  const shapes = {
    isTimeSeries: { dateColumn: 'Month', measureColumns: ['Revenue'] },
    categoricalGroups: [],
    kpiCandidates: [],
    highCardinalityWarnings: [],
  };
  const recs = recommendCharts(shapes);
  assert.ok(recs.length > 0);
  assert.equal(recs[0].chartType, 'line');
});

test('recommendCharts: small categorical -> pie', () => {
  const { recommendCharts } = require('../services/dataProfiler').__testables;
  const shapes = {
    isTimeSeries: null,
    categoricalGroups: [{ dimension: 'Status', measures: ['Count'], cardinality: 4 }],
    kpiCandidates: [],
    highCardinalityWarnings: [],
  };
  const recs = recommendCharts(shapes);
  assert.equal(recs[0].chartType, 'pie');
});

test('recommendCharts: medium categorical -> bar', () => {
  const { recommendCharts } = require('../services/dataProfiler').__testables;
  const shapes = {
    isTimeSeries: null,
    categoricalGroups: [{ dimension: 'BU', measures: ['Revenue'], cardinality: 15 }],
    kpiCandidates: [],
    highCardinalityWarnings: [],
  };
  const recs = recommendCharts(shapes);
  assert.equal(recs[0].chartType, 'bar');
});

test('detectAnomalies: outliers via IQR', () => {
  const { detectAnomalies } = require('../services/dataProfiler').__testables;
  const columns = [{ name: 'Amount', inferredType: 'numeric', distribution: { p25: 100, p75: 500 } }];
  const rows = [
    { Amount: 100 }, { Amount: 200 }, { Amount: 300 }, { Amount: 400 },
    { Amount: 500 }, { Amount: 5000 },
  ];
  const anomalies = detectAnomalies(columns, rows, { isTimeSeries: null, categoricalGroups: [] });
  assert.ok(anomalies.outliers.length > 0);
  assert.ok(anomalies.outliers[0].includes('Amount'));
});

test('detectAnomalies: concentration', () => {
  const { detectAnomalies } = require('../services/dataProfiler').__testables;
  const columns = [
    { name: 'Account', inferredType: 'categorical', cardinality: 10 },
    { name: 'Revenue', inferredType: 'numeric', distribution: { min: 0, max: 1000 } },
  ];
  const rows = [
    { Account: 'A', Revenue: 500 }, { Account: 'B', Revenue: 300 },
    { Account: 'C', Revenue: 100 }, { Account: 'D', Revenue: 10 },
    { Account: 'E', Revenue: 10 }, { Account: 'F', Revenue: 10 },
    { Account: 'G', Revenue: 5 }, { Account: 'H', Revenue: 5 },
    { Account: 'I', Revenue: 5 }, { Account: 'J', Revenue: 5 },
  ];
  const anomalies = detectAnomalies(columns, rows, { isTimeSeries: null, categoricalGroups: [{ dimension: 'Account', measures: ['Revenue'], cardinality: 10 }] });
  assert.ok(anomalies.concentration.length > 0);
});

test('detectAnomalies: all identical numeric values — no outliers', () => {
  const { detectAnomalies } = require('../services/dataProfiler').__testables;
  const columns = [{ name: 'Val', inferredType: 'numeric', distribution: { p25: 5, p75: 5 } }];
  const rows = [{ Val: 5 }, { Val: 5 }, { Val: 5 }];
  const anomalies = detectAnomalies(columns, rows, { isTimeSeries: null, categoricalGroups: [] });
  assert.equal(anomalies.outliers.length, 0);
});

test('computePreAggregates: KPI aggregates', () => {
  const { computePreAggregates } = require('../services/dataProfiler').__testables;
  const rows = [{ Revenue: 100 }, { Revenue: 200 }, { Revenue: 300 }];
  const kpiCandidates = [{ column: 'Revenue', suggestedAgg: 'sum', prefix: '$', suffix: '' }];
  const result = computePreAggregates(rows, kpiCandidates, [], null);
  assert.equal(result.kpiAggregates.Revenue.sum, 600);
  assert.equal(result.kpiAggregates.Revenue.avg, 200);
  assert.equal(result.kpiAggregates.Revenue.count, 3);
});

test('profileDataSource: full pipeline', () => {
  const { profileDataSource } = require('../services/dataProfiler');
  const rows = [
    { Region: 'AMERICAS', Amount: 1000, CloseDate: '2024-01-15' },
    { Region: 'EMEA', Amount: 2000, CloseDate: '2024-02-20' },
    { Region: 'APAC', Amount: 1500, CloseDate: '2024-03-10' },
    { Region: 'AMERICAS', Amount: 3000, CloseDate: '2024-04-05' },
    { Region: 'EMEA', Amount: 500, CloseDate: '2024-05-12' },
  ];
  const columns = ['Region', 'Amount', 'CloseDate'];
  const profile = profileDataSource('SELECT * FROM deals', rows, columns);
  assert.ok(profile.columns.length === 3);
  assert.ok(profile.shapes);
  assert.ok(profile.chartRecommendations.length > 0);
  assert.ok(profile.anomalies);
  assert.ok(profile.preComputed);
  assert.ok(profile.sqlHash);
});

test('profileDataSource: empty rows returns skeleton profile', () => {
  const { profileDataSource } = require('../services/dataProfiler');
  const profile = profileDataSource('SELECT 1', [], ['Col1']);
  assert.equal(profile.columns.length, 1);
  assert.equal(profile.columns[0].cardinality, 0);
  assert.equal(profile.chartRecommendations.length, 0);
});
