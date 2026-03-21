# Dashboard Data Profiler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a unified data profiling layer between SQL execution and the dashboard agent that provides profile-guided chart selection, anomaly-driven insights, server-side aggregation, and caching.

**Architecture:** A new `dataProfiler` service analyzes each data source (column types, shapes, anomalies, aggregates), a `profileData` LangGraph node orchestrates it, a session cache stores results, and a `tileDataBuilder` pre-computes render-ready tile data. The dashboard agent prompt switches from raw sample rows to structured profiles. Client components consume pre-computed data with fallback to existing behavior.

**Tech Stack:** Node.js (CommonJS), LangGraph StateGraph, Express.js, React 19, recharts, `node:test` + `node:assert/strict`

**Spec:** `docs/superpowers/specs/2026-03-21-dashboard-data-profiler-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `server/services/dataProfiler.js` | Core profiling engine — column analysis, shape detection, chart recommendations, anomaly signals, pre-computed outputs |
| `server/services/dashboardCache.js` | Session-scoped in-memory cache (LRU, periodic sweep) keyed by SQL hash |
| `server/services/tileDataBuilder.js` | Converts dashboard spec + profiles into per-tile render-ready data |
| `server/graph/nodes/profileData.js` | LangGraph node — collects execution results, runs profiler, stores in state + cache |
| `server/tests/dataProfiler.test.js` | Unit tests for the profiler |
| `server/tests/dashboardCache.test.js` | Unit tests for the cache |
| `server/tests/tileDataBuilder.test.js` | Unit tests for the tile data builder |
| `server/tests/profileData.test.js` | Unit tests for the LangGraph node |

### Modified Files
| File | Change |
|------|--------|
| `server/graph/state.js` | Add `dataProfiles`, `tileData`, `profileCacheKey` annotations |
| `server/graph/workflow.js` | Add `profileData` node, update routing for Path A and Path B |
| `server/graph/nodes/dashboardAgent.js` | Use profiles for prompt building and validation, add `__testables` |
| `server/prompts/dashboard.js` | Add `formatProfileContext()` to replace raw sample rows with structured profiles |
| `server/routes/textToSql.js` | Add `tile` mode to `/dashboard-data`, include `tileData`/`slicerValues`/`profileCacheKey` in `buildFinalResponse` |
| `client/src/components/dashboard/KpiSparklineCard.jsx` | Add `precomputed` prop, bypass `computeKpiValue` when present |
| `client/src/components/DashboardGrid.jsx` | Pass `tileData` to tile renderers, use server aggregates when available |
| `client/src/components/dashboard/DashboardChart.jsx` | Add `skipClientAggregation` prop, bypass `prepareData`/`applyChartGuards` when true |
| `client/src/components/DashboardOverlay.jsx` | Consume pre-computed slicers, send `profileCacheKey` on refinement |
| `client/src/components/ChatPanel.jsx` | Pass `tileData`/`slicerValues`/`profileCacheKey` through, use `profileCacheKey` on refinement |

---

## Task 1: Data Profiler — Column Analysis

**Files:**
- Create: `server/services/dataProfiler.js`
- Create: `server/tests/dataProfiler.test.js`

- [ ] **Step 1: Write failing tests for type inference**

```javascript
// server/tests/dataProfiler.test.js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && node --test tests/dataProfiler.test.js`
Expected: FAIL — `Cannot find module '../services/dataProfiler'`

- [ ] **Step 3: Write failing tests for analyzeColumn**

```javascript
// Append to server/tests/dataProfiler.test.js

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
```

- [ ] **Step 4: Implement `dataProfiler.js` — column analysis functions**

```javascript
// server/services/dataProfiler.js
'use strict';

const crypto = require('crypto');

const BOOLEAN_PAIRS = [
  new Set(['true', 'false']),
  new Set(['1', '0']),
  new Set(['yes', 'no']),
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}/;

function inferColumnType(values) {
  const nonNull = values.filter((v) => v != null && v !== '');
  if (nonNull.length === 0) return null;

  // Boolean check
  const distinct = new Set(nonNull.map((v) => String(v).toLowerCase()));
  if (distinct.size === 2) {
    for (const pair of BOOLEAN_PAIRS) {
      if ([...distinct].every((v) => pair.has(v))) return 'boolean';
    }
  }

  // Date check
  if (nonNull.every((v) => DATE_RE.test(String(v)) && !isNaN(Date.parse(String(v))))) {
    return 'date';
  }

  // Numeric check
  if (nonNull.every((v) => typeof v === 'number' || (typeof v === 'string' && !isNaN(Number(v)) && v.trim() !== ''))) {
    return 'numeric';
  }

  // Categorical vs text
  const cardinality = new Set(nonNull.map(String)).size;
  return cardinality <= 50 ? 'categorical' : 'text';
}

function analyzeColumn(name, values) {
  const total = values.length;
  const nonNull = values.filter((v) => v != null && v !== '');
  const nullRatio = total === 0 ? 1.0 : 1 - nonNull.length / total;
  const type = inferColumnType(values);
  const distinctSet = new Set(nonNull.map(String));
  const cardinality = distinctSet.size;

  const result = {
    name,
    inferredType: type,
    cardinality,
    nullRatio,
    distribution: null,
    distinctValues: cardinality <= 100 ? [...distinctSet].sort() : null,
  };

  if (type === 'numeric') {
    const nums = nonNull.map(Number).filter((n) => !isNaN(n)).sort((a, b) => a - b);
    if (nums.length > 0) {
      const sum = nums.reduce((a, b) => a + b, 0);
      result.distribution = {
        min: nums[0],
        max: nums[nums.length - 1],
        mean: sum / nums.length,
        median: nums[Math.floor(nums.length / 2)],
        p25: nums[Math.floor(nums.length * 0.25)],
        p75: nums[Math.floor(nums.length * 0.75)],
      };
    }
  }

  if (type === 'categorical' || type === 'text') {
    const freq = {};
    for (const v of nonNull) {
      const key = String(v);
      freq[key] = (freq[key] || 0) + 1;
    }
    const topValues = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100)
      .map(([value, count]) => ({ value, count }));
    result.distribution = { topValues };
  }

  return result;
}

module.exports = {
  analyzeColumn,
  __testables: { inferColumnType, analyzeColumn },
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && node --test tests/dataProfiler.test.js`
Expected: All 10 tests PASS

- [ ] **Step 6: Commit**

```bash
git add server/services/dataProfiler.js server/tests/dataProfiler.test.js
git commit -m "feat(dashboard): add dataProfiler column analysis with type inference"
```

---

## Task 2: Data Profiler — Shape Detection & Chart Recommendations

**Files:**
- Modify: `server/services/dataProfiler.js`
- Modify: `server/tests/dataProfiler.test.js`

- [ ] **Step 1: Write failing tests for shape detection**

```javascript
// Append to server/tests/dataProfiler.test.js

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && node --test tests/dataProfiler.test.js`
Expected: FAIL — `detectShapes is not a function`

- [ ] **Step 3: Write failing tests for chart recommendations**

```javascript
// Append to server/tests/dataProfiler.test.js

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
```

- [ ] **Step 4: Implement shape detection and chart recommendations**

Add to `server/services/dataProfiler.js`:

```javascript
function detectShapes(columns) {
  const dateCol = columns.find((c) => c.inferredType === 'date' && c.cardinality >= 5);
  const numericCols = columns.filter((c) => c.inferredType === 'numeric');
  const catCols = columns.filter((c) => c.inferredType === 'categorical' && c.cardinality >= 2 && c.cardinality <= 50);

  const isTimeSeries = dateCol && numericCols.length > 0
    ? { dateColumn: dateCol.name, measureColumns: numericCols.map((c) => c.name) }
    : null;

  const categoricalGroups = catCols.map((cat) => ({
    dimension: cat.name,
    measures: numericCols.map((n) => n.name),
    cardinality: cat.cardinality,
  }));

  const kpiCandidates = numericCols.map((col) => ({
    column: col.name,
    suggestedAgg: 'sum',
    prefix: col.name.toLowerCase().includes('amount') || col.name.toLowerCase().includes('revenue') ? '$' : '',
    suffix: col.name.toLowerCase().includes('percent') || col.name.toLowerCase().includes('ratio') ? '%' : '',
  }));

  const highCardinalityWarnings = columns
    .filter((c) => (c.inferredType === 'categorical' || c.inferredType === 'text') && c.cardinality > 50)
    .map((c) => ({ column: c.name, cardinality: c.cardinality }));

  return { isTimeSeries, categoricalGroups, kpiCandidates, highCardinalityWarnings };
}

function recommendCharts(shapes) {
  const recs = [];

  if (shapes.isTimeSeries) {
    const { dateColumn, measureColumns } = shapes.isTimeSeries;
    const catGroup = shapes.categoricalGroups[0];
    recs.push({
      chartType: catGroup ? 'line' : 'line',
      xAxis: dateColumn,
      yAxis: measureColumns.slice(0, 2),
      groupBy: catGroup?.dimension || null,
      reason: catGroup
        ? `Time-series trend grouped by ${catGroup.dimension}`
        : 'Time-series trend',
    });
  }

  for (const group of shapes.categoricalGroups) {
    if (group.cardinality >= 2 && group.cardinality <= 8 && group.measures.length === 1 && !shapes.isTimeSeries) {
      recs.push({
        chartType: 'pie',
        xAxis: group.dimension,
        yAxis: group.measures,
        groupBy: null,
        reason: `Part-of-whole breakdown (${group.cardinality} categories)`,
      });
    } else if (group.cardinality >= 2 && group.cardinality <= 20) {
      recs.push({
        chartType: 'bar',
        xAxis: group.dimension,
        yAxis: group.measures.slice(0, 3),
        groupBy: null,
        reason: `Categorical comparison (${group.cardinality} categories)`,
      });
    }
  }

  // Two categoricals + numeric -> stacked_bar
  if (shapes.categoricalGroups.length >= 2) {
    const [cat1, cat2] = shapes.categoricalGroups;
    recs.push({
      chartType: 'stacked_bar',
      xAxis: cat1.dimension,
      yAxis: cat1.measures.slice(0, 1),
      groupBy: cat2.dimension,
      reason: `Grouped comparison: ${cat1.dimension} by ${cat2.dimension}`,
    });
  }

  // Two numeric columns, no categorical -> scatter
  const numericCols = (shapes.kpiCandidates || []).map((k) => k.column);
  if (numericCols.length >= 2 && shapes.categoricalGroups.length === 0 && !shapes.isTimeSeries) {
    recs.push({
      chartType: 'scatter',
      xAxis: numericCols[0],
      yAxis: [numericCols[1]],
      groupBy: null,
      reason: `Correlation between ${numericCols[0]} and ${numericCols[1]}`,
    });
  }

  // Single aggregatable numeric -> kpi
  for (const kpi of (shapes.kpiCandidates || [])) {
    recs.push({
      chartType: 'kpi',
      xAxis: null,
      yAxis: [kpi.column],
      groupBy: null,
      reason: `Headline metric: ${kpi.suggestedAgg}(${kpi.column})`,
    });
  }

  return recs;
}
```

Update `module.exports` to include new functions in `__testables`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && node --test tests/dataProfiler.test.js`
Expected: All 17 tests PASS

- [ ] **Step 6: Commit**

```bash
git add server/services/dataProfiler.js server/tests/dataProfiler.test.js
git commit -m "feat(dashboard): add shape detection and chart recommendations to profiler"
```

---

## Task 3: Data Profiler — Anomaly Signals & Pre-Computed Outputs

**Files:**
- Modify: `server/services/dataProfiler.js`
- Modify: `server/tests/dataProfiler.test.js`

- [ ] **Step 1: Write failing tests for anomaly detection**

```javascript
// Append to server/tests/dataProfiler.test.js

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

test('detectAnomalies: all identical numeric values — no outliers, flat trend', () => {
  const { detectAnomalies } = require('../services/dataProfiler').__testables;
  const columns = [{ name: 'Val', inferredType: 'numeric', distribution: { p25: 5, p75: 5 } }];
  const rows = [{ Val: 5 }, { Val: 5 }, { Val: 5 }];
  const anomalies = detectAnomalies(columns, rows, { isTimeSeries: null, categoricalGroups: [] });
  assert.equal(anomalies.outliers.length, 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && node --test tests/dataProfiler.test.js`
Expected: FAIL — `detectAnomalies is not a function`

- [ ] **Step 3: Write failing tests for pre-computed outputs and the main `profileDataSource` function**

```javascript
// Append to server/tests/dataProfiler.test.js

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
```

- [ ] **Step 4: Implement anomaly detection, pre-computed outputs, and the main `profileDataSource` function**

Add to `server/services/dataProfiler.js`:

```javascript
function detectAnomalies(columns, rows, shapes) {
  const anomalies = { outliers: [], trend: [], concentration: [], periodChange: [], missingPatterns: [] };

  // Outliers via IQR
  for (const col of columns) {
    if (col.inferredType !== 'numeric' || !col.distribution) continue;
    const { p25, p75 } = col.distribution;
    const iqr = p75 - p25;
    if (iqr === 0) continue; // all identical or near-identical
    const upper = p75 + 1.5 * iqr;
    const outlierRows = rows.filter((r) => Number(r[col.name]) > upper);
    if (outlierRows.length > 0) {
      anomalies.outliers.push(
        `Column '${col.name}' has ${outlierRows.length} outlier(s) above ${formatNum(upper)}`,
      );
    }
  }

  // Trend: simple linear regression on time-series
  if (shapes.isTimeSeries) {
    const dateCol = shapes.isTimeSeries.dateColumn;
    for (const measure of shapes.isTimeSeries.measureColumns) {
      const sorted = rows
        .map((r) => ({ date: new Date(r[dateCol]), val: Number(r[measure]) }))
        .filter((r) => !isNaN(r.date) && !isNaN(r.val))
        .sort((a, b) => a.date - b.date);
      if (sorted.length < 3) continue;
      const n = sorted.length;
      const xMean = (n - 1) / 2;
      const yMean = sorted.reduce((s, r) => s + r.val, 0) / n;
      let num = 0, den = 0;
      for (let i = 0; i < n; i++) {
        num += (i - xMean) * (sorted[i].val - yMean);
        den += (i - xMean) ** 2;
      }
      if (den === 0) { anomalies.trend.push(`${measure} is flat over time`); continue; }
      const slope = num / den;
      const direction = slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'flat';
      anomalies.trend.push(`${measure} is ${direction} over time`);
    }
  }

  // Concentration: top 3 share of total for categorical+numeric pairs
  for (const group of (shapes.categoricalGroups || [])) {
    const measure = group.measures[0];
    if (!measure) continue;
    const totals = {};
    let grandTotal = 0;
    for (const row of rows) {
      const key = String(row[group.dimension] ?? '');
      const val = Number(row[measure]) || 0;
      totals[key] = (totals[key] || 0) + val;
      grandTotal += val;
    }
    if (grandTotal === 0) continue;
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const top3Sum = sorted.slice(0, 3).reduce((s, [, v]) => s + v, 0);
    const top3Pct = top3Sum / grandTotal;
    if (top3Pct > 0.5 && sorted.length > 5) {
      anomalies.concentration.push(
        `Top 3 of ${sorted.length} ${group.dimension} values represent ${(top3Pct * 100).toFixed(0)}% of total ${measure}`,
      );
    }
  }

  return anomalies;
}

function formatNum(n) {
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function computePreAggregates(rows, kpiCandidates, categoricalGroups, timeSeries) {
  const kpiAggregates = {};
  for (const kpi of kpiCandidates) {
    const nums = rows.map((r) => Number(r[kpi.column])).filter((n) => !isNaN(n));
    if (nums.length === 0) continue;
    const sum = nums.reduce((a, b) => a + b, 0);
    kpiAggregates[kpi.column] = {
      sum, avg: sum / nums.length, count: nums.length,
      min: Math.min(...nums), max: Math.max(...nums),
    };
  }

  const slicerValues = {};
  for (const group of categoricalGroups) {
    const vals = new Set(rows.map((r) => r[group.dimension]).filter((v) => v != null).map(String));
    if (vals.size <= 100) slicerValues[group.dimension] = [...vals].sort();
  }

  const groupedAggregates = {};
  for (const group of categoricalGroups.slice(0, 3)) {
    const measure = group.measures[0];
    if (!measure) continue;
    const buckets = {};
    for (const row of rows) {
      const key = String(row[group.dimension] ?? '');
      const val = Number(row[measure]) || 0;
      if (!buckets[key]) buckets[key] = { sum: 0, count: 0 };
      buckets[key].sum += val;
      buckets[key].count += 1;
    }
    groupedAggregates[`${group.dimension}__${measure}`] = Object.entries(buckets)
      .map(([key, agg]) => ({ [group.dimension]: key, [measure]: agg.sum, count: agg.count }));
  }

  let sparklineData = null;
  if (timeSeries) {
    const measure = timeSeries.measureColumns[0];
    const dateCol = timeSeries.dateColumn;
    if (measure && dateCol) {
      const buckets = {};
      for (const row of rows) {
        const d = String(row[dateCol] ?? '').substring(0, 7); // YYYY-MM
        const val = Number(row[measure]) || 0;
        buckets[d] = (buckets[d] || 0) + val;
      }
      sparklineData = Object.entries(buckets).sort().map(([period, value]) => ({ period, value }));
    }
  }

  return { kpiAggregates, slicerValues, groupedAggregates, sparklineData };
}

function sqlHash(sql) {
  return crypto.createHash('sha256').update((sql || '').trim().toLowerCase()).digest('hex').substring(0, 16);
}

const SAMPLE_THRESHOLD = 1000;

function sampleRows(rows) {
  if (rows.length <= SAMPLE_THRESHOLD) return rows;
  // Reservoir sampling: pick SAMPLE_THRESHOLD rows uniformly
  const sample = rows.slice(0, SAMPLE_THRESHOLD);
  for (let i = SAMPLE_THRESHOLD; i < rows.length; i++) {
    const j = Math.floor(Math.random() * (i + 1));
    if (j < SAMPLE_THRESHOLD) sample[j] = rows[i];
  }
  return sample;
}

function profileDataSource(sql, rows, columns) {
  // Use sampled rows for shape/anomaly detection, full rows for aggregates
  const sampleForAnalysis = rows.length > SAMPLE_THRESHOLD ? sampleRows(rows) : rows;

  const colAnalysis = columns.map((colName) => {
    const values = rows.map((r) => r[colName]);
    return analyzeColumn(colName, values);
  });

  const shapes = detectShapes(colAnalysis);
  const chartRecommendations = recommendCharts(shapes);
  // Use sampled rows for anomaly detection (statistical), full rows for aggregates (exact)
  const anomalies = sampleForAnalysis.length > 0 ? detectAnomalies(colAnalysis, sampleForAnalysis, shapes) : { outliers: [], trend: [], concentration: [], periodChange: [], missingPatterns: [] };
  const preComputed = rows.length > 0 ? computePreAggregates(rows, shapes.kpiCandidates, shapes.categoricalGroups, shapes.isTimeSeries) : { kpiAggregates: {}, slicerValues: {}, groupedAggregates: {}, sparklineData: null };

  return {
    sqlHash: sqlHash(sql),
    rowCount: rows.length,
    columns: colAnalysis,
    shapes,
    chartRecommendations,
    anomalies,
    preComputed,
  };
}
```

Update `module.exports`:
```javascript
module.exports = {
  profileDataSource,
  __testables: { inferColumnType, analyzeColumn, detectShapes, recommendCharts, detectAnomalies, computePreAggregates },
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && node --test tests/dataProfiler.test.js`
Expected: All 23 tests PASS

- [ ] **Step 6: Commit**

```bash
git add server/services/dataProfiler.js server/tests/dataProfiler.test.js
git commit -m "feat(dashboard): add anomaly detection, pre-computed outputs, and profileDataSource entry point"
```

---

## Task 4: Session Cache

**Files:**
- Create: `server/services/dashboardCache.js`
- Create: `server/tests/dashboardCache.test.js`

- [ ] **Step 1: Write failing tests**

```javascript
// server/tests/dashboardCache.test.js
const test = require('node:test');
const assert = require('node:assert/strict');

test('cache: set and get', () => {
  const cache = require('../services/dashboardCache');
  cache._reset(); // clear for test isolation
  cache.set('sess1', 'hash1', { profile: { test: true }, tileData: null });
  const result = cache.get('sess1', 'hash1');
  assert.ok(result);
  assert.equal(result.profile.test, true);
});

test('cache: getByKey', () => {
  const cache = require('../services/dashboardCache');
  cache._reset();
  cache.set('sess1', 'hash1', { profile: { a: 1 }, tileData: null });
  const result = cache.getByKey('sess1:hash1');
  assert.ok(result);
  assert.equal(result.profile.a, 1);
});

test('cache: miss returns null', () => {
  const cache = require('../services/dashboardCache');
  cache._reset();
  const result = cache.get('sess1', 'nonexistent');
  assert.equal(result, null);
});

test('cache: LRU eviction at 20 entries', () => {
  const cache = require('../services/dashboardCache');
  cache._reset();
  for (let i = 0; i < 25; i++) {
    cache.set('sess1', `hash${i}`, { profile: { i }, tileData: null });
  }
  // First 5 should be evicted
  assert.equal(cache.get('sess1', 'hash0'), null);
  assert.equal(cache.get('sess1', 'hash4'), null);
  // Last 20 should exist
  assert.ok(cache.get('sess1', 'hash5'));
  assert.ok(cache.get('sess1', 'hash24'));
});

test('cache: clearSession', () => {
  const cache = require('../services/dashboardCache');
  cache._reset();
  cache.set('sess1', 'h1', { profile: {}, tileData: null });
  cache.set('sess2', 'h2', { profile: {}, tileData: null });
  cache.clearSession('sess1');
  assert.equal(cache.get('sess1', 'h1'), null);
  assert.ok(cache.get('sess2', 'h2'));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && node --test tests/dashboardCache.test.js`
Expected: FAIL — `Cannot find module '../services/dashboardCache'`

- [ ] **Step 3: Implement the cache**

```javascript
// server/services/dashboardCache.js
'use strict';

const MAX_PER_SESSION = 20;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

const _store = new Map(); // key: "sessionId:sqlHash" -> { profile, tileData, timestamp }
const _sessionKeys = new Map(); // sessionId -> [keys in insertion order]

function _cacheKey(sessionId, sqlHash) {
  return `${sessionId}:${sqlHash}`;
}

function set(sessionId, sqlHash, { profile, tileData }) {
  const key = _cacheKey(sessionId, sqlHash);
  _store.set(key, { profile, tileData, timestamp: Date.now() });

  if (!_sessionKeys.has(sessionId)) _sessionKeys.set(sessionId, []);
  const keys = _sessionKeys.get(sessionId);
  const idx = keys.indexOf(key);
  if (idx !== -1) keys.splice(idx, 1);
  keys.push(key);

  // LRU eviction
  while (keys.length > MAX_PER_SESSION) {
    const evicted = keys.shift();
    _store.delete(evicted);
  }
}

function get(sessionId, sqlHash) {
  const key = _cacheKey(sessionId, sqlHash);
  return _store.get(key) || null;
}

function getByKey(cacheKey) {
  return _store.get(cacheKey) || null;
}

function invalidate(sessionId, sqlHash) {
  const key = _cacheKey(sessionId, sqlHash);
  _store.delete(key);
  const keys = _sessionKeys.get(sessionId);
  if (keys) {
    const idx = keys.indexOf(key);
    if (idx !== -1) keys.splice(idx, 1);
  }
}

function clearSession(sessionId) {
  const keys = _sessionKeys.get(sessionId) || [];
  for (const key of keys) _store.delete(key);
  _sessionKeys.delete(sessionId);
}

function _sweep() {
  const now = Date.now();
  for (const [key, entry] of _store) {
    if (now - entry.timestamp > MAX_AGE_MS) {
      _store.delete(key);
      // Clean from session keys
      for (const [, keys] of _sessionKeys) {
        const idx = keys.indexOf(key);
        if (idx !== -1) keys.splice(idx, 1);
      }
    }
  }
}

function _reset() {
  _store.clear();
  _sessionKeys.clear();
}

const _sweepTimer = setInterval(_sweep, SWEEP_INTERVAL_MS);
_sweepTimer.unref(); // don't block process exit

module.exports = { set, get, getByKey, invalidate, clearSession, _reset };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && node --test tests/dashboardCache.test.js`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/services/dashboardCache.js server/tests/dashboardCache.test.js
git commit -m "feat(dashboard): add session-scoped dashboard cache with LRU eviction"
```

---

## Task 5: Tile Data Builder

**Files:**
- Create: `server/services/tileDataBuilder.js`
- Create: `server/tests/tileDataBuilder.test.js`

- [ ] **Step 1: Write failing tests**

```javascript
// server/tests/tileDataBuilder.test.js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && node --test tests/tileDataBuilder.test.js`
Expected: FAIL — `Cannot find module '../services/tileDataBuilder'`

- [ ] **Step 3: Implement the tile data builder**

```javascript
// server/services/tileDataBuilder.js
'use strict';

function formatValue(num, prefix, suffix) {
  const formatted = Math.abs(num) >= 1e6
    ? `${(num / 1e6).toFixed(1)}M`
    : Math.abs(num) >= 1e3
      ? `${(num / 1e3).toFixed(1)}K`
      : num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return `${prefix || ''}${formatted}${suffix || ''}`;
}

function buildTileData(spec, profiles) {
  const result = {};

  for (const tile of spec.tiles) {
    const profile = profiles[tile.sourceIndex];
    if (!profile) {
      result[tile.id] = null;
      continue;
    }

    const pre = profile.preComputed || {};

    if (tile.type === 'kpi') {
      const col = tile.config?.valueColumn;
      const agg = tile.config?.aggregation || 'sum';
      const kpiData = pre.kpiAggregates?.[col];
      if (!kpiData) {
        result[tile.id] = null;
        continue;
      }
      const value = kpiData[agg] ?? kpiData.sum;
      result[tile.id] = {
        value,
        formatted: formatValue(value, tile.config?.prefix, tile.config?.suffix),
        sparklinePoints: pre.sparklineData || [],
      };
    } else if (tile.type === 'chart') {
      const groupBy = tile.config?.groupBy;
      const yKey = Array.isArray(tile.config?.yAxis) ? tile.config.yAxis[0]?.key || tile.config.yAxis[0] : null;
      const aggKey = groupBy && yKey ? `${groupBy}__${yKey}` : null;
      const rows = aggKey ? pre.groupedAggregates?.[aggKey] : null;
      result[tile.id] = { rows: rows || null };
    } else if (tile.type === 'insight') {
      result[tile.id] = { markdown: tile.config?.markdown || '' };
    } else {
      result[tile.id] = null;
    }
  }

  return result;
}

module.exports = { buildTileData };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && node --test tests/tileDataBuilder.test.js`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/services/tileDataBuilder.js server/tests/tileDataBuilder.test.js
git commit -m "feat(dashboard): add tileDataBuilder for pre-computing render-ready tile data"
```

---

## Task 6: ProfileData LangGraph Node + State + Workflow Integration

**Files:**
- Create: `server/graph/nodes/profileData.js`
- Modify: `server/graph/state.js:84-89`
- Modify: `server/graph/workflow.js`
- Create: `server/tests/profileData.test.js`

- [ ] **Step 1: Add state annotations**

Add after line 89 (`dashboardDataSources`) in `server/graph/state.js`:

```javascript
  dataProfiles: Annotation({ reducer: (_, b) => b, default: () => null }),
  tileData: Annotation({ reducer: (_, b) => b, default: () => null }),
  profileCacheKey: Annotation({ reducer: (_, b) => b, default: () => null }),
```

- [ ] **Step 2: Write failing tests for profileData node**

```javascript
// server/tests/profileData.test.js
const test = require('node:test');
const assert = require('node:assert/strict');

test('profileDataNode: Path B profiles from queries', async () => {
  const { profileDataNode } = require('../graph/nodes/profileData');

  const state = {
    sessionId: 'test-session',
    dashboardHasDataRequest: true,
    queries: [{
      subQuestion: 'Pipeline by region',
      sql: 'SELECT Region, Amount FROM deals',
      execution: {
        success: true,
        rows: [{ Region: 'AMERICAS', Amount: 1000 }, { Region: 'EMEA', Amount: 2000 }],
        columns: ['Region', 'Amount'],
        rowCount: 2,
      },
    }],
    execution: null,
    conversationHistory: [],
    dataProfiles: null,
  };

  const result = await profileDataNode(state);
  assert.ok(result.dataProfiles);
  assert.equal(result.dataProfiles.length, 1);
  assert.ok(result.dataProfiles[0].columns.length === 2);
  assert.ok(result.profileCacheKey);
});

test('profileDataNode: skips when dataProfiles already set', async () => {
  const { profileDataNode } = require('../graph/nodes/profileData');
  const state = {
    sessionId: 'test',
    dataProfiles: [{ existing: true }],
    queries: [],
    execution: null,
    conversationHistory: [],
    dashboardHasDataRequest: false,
  };
  const result = await profileDataNode(state);
  assert.deepEqual(result.dataProfiles, [{ existing: true }]);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd server && node --test tests/profileData.test.js`
Expected: FAIL — `Cannot find module '../graph/nodes/profileData'`

- [ ] **Step 4: Implement profileData node**

```javascript
// server/graph/nodes/profileData.js
'use strict';

const { profileDataSource } = require('../../services/dataProfiler');
const dashboardCache = require('../../services/dashboardCache');
const logger = require('../../utils/logger');

// Import dashboard event emitter — shared with dashboardAgent for SSE progress events.
// NOTE: not a circular dependency (dashboardAgent does not import profileData).
const { dashboardEvents } = require('./dashboardAgent');

function computeDimensionOverlap(profiles) {
  const dimMap = {}; // colName -> { sources: Set, values: Set }
  profiles.forEach((profile, i) => {
    for (const col of profile.columns) {
      if (col.inferredType !== 'categorical' || col.cardinality < 2 || col.cardinality > 100) continue;
      if (!dimMap[col.name]) dimMap[col.name] = { sources: new Set(), values: new Set() };
      dimMap[col.name].sources.add(i);
      if (col.distinctValues) col.distinctValues.forEach((v) => dimMap[col.name].values.add(v));
    }
  });

  const overlap = {};
  for (const [name, info] of Object.entries(dimMap)) {
    if (info.sources.size < 2) continue;
    overlap[name] = {
      sources: [...info.sources],
      matchType: 'exact',
      sharedValues: [...info.values].sort(),
    };
  }
  return overlap;
}

function collectDataSources(state) {
  const sources = [];

  if (state.dashboardHasDataRequest) {
    const queries = state.queries || [];
    for (const q of queries) {
      if (!q.execution?.success) continue;
      sources.push({ sql: q.sql, rows: q.execution.rows || [], columns: q.execution.columns || [] });
    }
    if (state.execution?.success && state.execution?.rows?.length > 0) {
      const alreadyCovered = (state.queries || []).some((q) => q.execution?.rows === state.execution.rows);
      if (!alreadyCovered) {
        sources.push({ sql: state.sql, rows: state.execution.rows, columns: state.execution.columns || [] });
      }
    }
  } else {
    const history = state.conversationHistory || [];
    for (const msg of history) {
      if (msg.role !== 'assistant') continue;
      if (!msg.sql && !msg.resultSummary) continue;
      const exec = msg.execution;
      if (exec?.rows?.length > 0) {
        sources.push({ sql: msg.sql || '', rows: exec.rows, columns: exec.columns || Object.keys(exec.rows[0]) });
      }
    }
  }

  return sources;
}

async function profileDataNode(state) {
  const start = Date.now();

  // Skip if profiles already exist (refinement path would not reach here, but defensive)
  if (state.dataProfiles) {
    return { dataProfiles: state.dataProfiles, profileCacheKey: state.profileCacheKey };
  }

  const sources = collectDataSources(state);

  if (sources.length === 0) {
    logger.info('ProfileData: no data sources to profile');
    return { dataProfiles: [], profileCacheKey: null, trace: [{ node: 'profileData', timestamp: start, duration: Date.now() - start, skipped: true }] };
  }

  dashboardEvents.emit('dashboard_progress', {
    sessionId: state.sessionId,
    status: 'profiling',
    sourceCount: sources.length,
  });

  const profiles = sources.map((src) => profileDataSource(src.sql, src.rows, src.columns));
  const dimensionOverlap = computeDimensionOverlap(profiles);

  // Cache profiles
  const sessionId = state.sessionId || 'default';
  const cacheKeys = [];
  for (const profile of profiles) {
    dashboardCache.set(sessionId, profile.sqlHash, { profile, tileData: null });
    cacheKeys.push(`${sessionId}:${profile.sqlHash}`);
  }

  const duration = Date.now() - start;
  logger.info(`[ProfileData] Profiled ${profiles.length} source(s), ${Object.keys(dimensionOverlap).length} shared dimensions (${duration}ms)`);

  return {
    dataProfiles: profiles.map((p, i) => ({ ...p, dimensionOverlap: i === 0 ? dimensionOverlap : undefined })),
    profileCacheKey: cacheKeys[0] || null,
    trace: [{ node: 'profileData', timestamp: start, duration, sourceCount: profiles.length }],
  };
}

module.exports = { profileDataNode, __testables: { computeDimensionOverlap, collectDataSources } };
```

- [ ] **Step 5: Run profileData tests**

Run: `cd server && node --test tests/profileData.test.js`
Expected: All 2 tests PASS

- [ ] **Step 6: Update workflow routing**

In `server/graph/workflow.js`:

1. Add import: `const { profileDataNode } = require('./nodes/profileData');`
2. In `routeAfterClassify`: change `return 'dashboardAgent'` for Path A (line 48) to `return 'profileData'`
3. In `routeAfterCheckResults`: change both `return 'dashboardAgent'` (lines 125, 132) to `return 'profileData'`
4. Keep `dashboard_refine` routing to `dashboardAgent` unchanged (line 36)
5. In `buildWorkflow`: add `.addNode('profileData', profileDataNode)` after `dashboardAgent` node
6. Replace `.addEdge('dashboardAgent', '__end__')` with:
   ```javascript
   .addEdge('profileData', 'dashboardAgent')
   .addEdge('dashboardAgent', '__end__')
   ```
7. Update `addConditionalEdges` for `classify` — the full destinations array must be:
   `['decompose', 'contextFetch', 'profileData', 'dashboardAgent', '__end__']`
   (`dashboardAgent` stays because `dashboard_refine` still routes there directly)
8. Update `addConditionalEdges` for `checkResults` — the full destinations array must be:
   `['present', 'profileData', 'accumulateResult', 'diagnoseEmptyResults', '__end__']`
   (`dashboardAgent` removed — `checkResults` never routes to it directly after this change)

- [ ] **Step 7: Run existing workflow tests to verify no regressions**

Run: `cd server && node --test tests/runtimeRobustness.test.js`
Expected: PASS — existing routing tests still work

- [ ] **Step 8: Commit**

```bash
git add server/graph/state.js server/graph/nodes/profileData.js server/graph/workflow.js server/tests/profileData.test.js
git commit -m "feat(dashboard): add profileData LangGraph node with workflow routing"
```

---

## Task 7: Enhanced Dashboard Agent — Profile-Aware Prompt & Validation

**Files:**
- Modify: `server/prompts/dashboard.js`
- Modify: `server/graph/nodes/dashboardAgent.js`

- [ ] **Step 1: Add `formatProfileContext` to `server/prompts/dashboard.js`**

Add a new function after `buildDataContext` (line 164):

```javascript
function formatProfileContext(profiles) {
  if (!profiles || profiles.length === 0) return null;

  const blocks = profiles.map((profile, i) => {
    const parts = [`--- Source ${i} ---`];

    // Column summary
    parts.push('Columns:');
    for (const col of profile.columns) {
      let desc = `  ${col.name} (${col.inferredType}, ${col.cardinality} distinct`;
      if (col.inferredType === 'categorical' && col.distinctValues && col.distinctValues.length <= 10) {
        desc += `: ${col.distinctValues.join(', ')}`;
      }
      if (col.inferredType === 'numeric' && col.distribution) {
        desc += `, range: ${col.distribution.min}–${col.distribution.max}, mean: ${col.distribution.mean.toFixed(1)}`;
      }
      if (col.nullRatio > 0.05) desc += `, ${(col.nullRatio * 100).toFixed(0)}% null`;
      desc += ')';
      parts.push(desc);
    }

    // Shape
    if (profile.shapes) {
      if (profile.shapes.isTimeSeries) {
        const ts = profile.shapes.isTimeSeries;
        parts.push(`\nShape: time-series (${ts.dateColumn} × ${ts.measureColumns.join(', ')})`);
      }
      if (profile.shapes.categoricalGroups.length > 0) {
        const groups = profile.shapes.categoricalGroups.map((g) => `${g.dimension}(${g.cardinality})`).join(', ');
        parts.push(`Categorical groups: ${groups}`);
      }
    }

    // Chart recommendations
    if (profile.chartRecommendations?.length > 0) {
      parts.push('\nRecommended charts:');
      for (const rec of profile.chartRecommendations.slice(0, 3)) {
        parts.push(`  ${rec.chartType} (${rec.xAxis} × ${rec.yAxis.join(', ')}${rec.groupBy ? `, groupBy: ${rec.groupBy}` : ''}) — ${rec.reason}`);
      }
    }

    // KPI candidates
    if (profile.shapes?.kpiCandidates?.length > 0) {
      parts.push('\nKPI candidates:');
      for (const kpi of profile.shapes.kpiCandidates) {
        parts.push(`  ${kpi.column} (${kpi.suggestedAgg}) ${kpi.prefix ? `prefix: "${kpi.prefix}"` : ''}${kpi.suffix ? ` suffix: "${kpi.suffix}"` : ''}`);
      }
    }

    // Anomalies
    const allAnomalies = [
      ...(profile.anomalies?.outliers || []),
      ...(profile.anomalies?.trend || []),
      ...(profile.anomalies?.concentration || []),
      ...(profile.anomalies?.periodChange || []),
    ];
    if (allAnomalies.length > 0) {
      parts.push('\nAnomalies:');
      for (const a of allAnomalies.slice(0, 5)) parts.push(`  - ${a}`);
    }

    // Slicer-eligible
    const slicerDims = profile.preComputed?.slicerValues
      ? Object.entries(profile.preComputed.slicerValues).map(([k, v]) => `${k}(${v.length})`).join(', ')
      : '';
    if (slicerDims) parts.push(`\nSlicer-eligible dimensions: ${slicerDims}`);

    return parts.join('\n');
  });

  // Dimension overlap
  const overlap = profiles[0]?.dimensionOverlap;
  if (overlap && Object.keys(overlap).length > 0) {
    blocks.push('\n=== CROSS-SOURCE DIMENSIONS ===');
    for (const [dim, info] of Object.entries(overlap)) {
      blocks.push(`"${dim}" — shared across sources ${info.sources.join(', ')}`);
    }
  }

  return `=== DATA SOURCE PROFILES (${profiles.length} total) ===\n\n${blocks.join('\n\n')}`;
}
```

Update `module.exports` to include `formatProfileContext`.

- [ ] **Step 2: Update `buildDashboardInputs` in `server/prompts/dashboard.js` to use profiles when available**

Modify the function to accept profiles and use `formatProfileContext` when present, falling back to `buildDataContext` (raw samples) when profiles are missing:

At the end of the non-refinement branch (before the final return around line 232), add:

```javascript
  // If profiles are available, use them instead of raw data context
  if (state.dataProfiles && state.dataProfiles.length > 0) {
    return { dataContext: formatProfileContext(state.dataProfiles), question: state.question, isRefinement: false };
  }
```

For refinement, similarly check for cached profiles before falling back to raw data sources.

- [ ] **Step 3: Update `dashboardAgent.js` — pass profiles to validation, add `__testables`**

In `server/graph/nodes/dashboardAgent.js`:

1. Update `getSourceColumns` to prefer profile columns when `state.dataProfiles` exists:
```javascript
function getSourceColumns(state, sourceIndex, isRefinement) {
  // Prefer profile columns if available
  if (state.dataProfiles?.[sourceIndex]?.columns) {
    return state.dataProfiles[sourceIndex].columns.map((c) => c.name);
  }
  // ... existing fallback logic unchanged
}
```

2. Add `__testables` export:
```javascript
module.exports = {
  dashboardAgentNode,
  dashboardEvents: _dashboardEvents,
  __testables: { validateAndFixSpec, getSourceColumns, buildFallbackSpec, countUsableDataSources },
};
```

- [ ] **Step 4: Run all tests to verify no regressions**

Run: `cd server && node --test`
Expected: All existing tests PASS

- [ ] **Step 5: Commit**

```bash
git add server/prompts/dashboard.js server/graph/nodes/dashboardAgent.js
git commit -m "feat(dashboard): profile-aware prompt formatting and validation in dashboard agent"
```

---

## Task 8: Server Route Changes — `buildFinalResponse` + `/dashboard-data` tile mode

**Files:**
- Modify: `server/routes/textToSql.js`

- [ ] **Step 1: Add `tileData`, `slicerValues`, `profileCacheKey` to `buildFinalResponse`**

In `server/routes/textToSql.js`, inside `buildFinalResponse` (around line 445), add after the `dashboardSpec` line:

```javascript
    tileData: state.tileData || null,
    profileCacheKey: state.profileCacheKey || null,
```

Also, collect slicer values from profiles:
```javascript
    slicerValues: state.dataProfiles
      ? Object.assign({}, ...state.dataProfiles.map((p) => p.preComputed?.slicerValues || {}))
      : null,
```

- [ ] **Step 2: Add `tile` mode to `/dashboard-data` endpoint**

In `server/routes/textToSql.js`, modify the `/dashboard-data` handler (line 848):

1. Change the `sql` validation to be conditional:
```javascript
  if (mode !== 'tile' && (!sql || typeof sql !== 'string' || sql.trim().length === 0)) {
    return res.status(400).json({ error: 'sql is required for page/distinct modes' });
  }
  if (!mode || !['page', 'distinct', 'tile'].includes(mode)) {
    return res.status(400).json({ error: 'mode must be "page", "distinct", or "tile"' });
  }
```

2. Add `tile` mode handler before the `page` mode block:
```javascript
    if (mode === 'tile') {
      const { profileCacheKey, tileId } = req.body;
      if (!profileCacheKey || !tileId) {
        return res.status(400).json({ error: 'profileCacheKey and tileId are required for tile mode' });
      }
      const dashboardCache = require('../services/dashboardCache');
      const cached = dashboardCache.getByKey(profileCacheKey);
      if (!cached?.tileData?.[tileId]) {
        return res.status(404).json({ error: 'Tile data not found in cache' });
      }
      return res.json(cached.tileData[tileId]);
    }
```

- [ ] **Step 3: Run existing tests to verify no regressions**

Run: `cd server && node --test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add server/routes/textToSql.js
git commit -m "feat(dashboard): add tileData/slicerValues to done event, add tile mode to dashboard-data endpoint"
```

---

## Task 9: Tile Data Builder Integration — Wire into Dashboard Agent

**Files:**
- Modify: `server/graph/nodes/dashboardAgent.js`

- [ ] **Step 1: Add tile data building after spec is generated**

In `dashboardAgentNode`, after `validateAndFixSpec` (around line 129), add:

```javascript
  // Build tile data if profiles are available
  let tileData = null;
  if (state.dataProfiles) {
    try {
      const { buildTileData } = require('../../services/tileDataBuilder');
      tileData = buildTileData(spec, state.dataProfiles);

      // Update cache with tile data
      const dashboardCache = require('../../services/dashboardCache');
      for (const profile of state.dataProfiles) {
        const existing = dashboardCache.get(state.sessionId, profile.sqlHash);
        if (existing) {
          dashboardCache.set(state.sessionId, profile.sqlHash, { ...existing, tileData });
        }
      }
    } catch (err) {
      logger.warn('TileDataBuilder failed, client will aggregate', { error: err.message });
    }
  }
```

Update the return value to include `tileData`:

```javascript
  return {
    dashboardSpec: spec,
    tileData,
    trace: [{ ... }],
  };
```

- [ ] **Step 2: Run all tests**

Run: `cd server && node --test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/graph/nodes/dashboardAgent.js
git commit -m "feat(dashboard): wire tileDataBuilder into dashboard agent post-spec"
```

---

## Task 10: Client — KpiSparklineCard `precomputed` Prop

**Files:**
- Modify: `client/src/components/dashboard/KpiSparklineCard.jsx`

- [ ] **Step 1: Add `precomputed` prop support**

In `client/src/components/dashboard/KpiSparklineCard.jsx`:

Change the component signature and add early return for precomputed values:

```jsx
export default function KpiSparklineCard({ config, data, precomputed }) {
  const { delta, trend, sparklineKey, sparklineData } = config || {};

  // Use precomputed values from server if available
  const displayValue = precomputed?.formatted
    ? precomputed.formatted
    : computeKpiValue(data, config);

  const trendColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#64748b';
  const trendArrow = trend === 'up' ? '\u25B2' : trend === 'down' ? '\u25BC' : '\u25CF';

  const sparkPoints = precomputed?.sparklinePoints?.length > 0
    ? precomputed.sparklinePoints
    : sparklineData
      || (sparklineKey && Array.isArray(data)
        ? data.map((row) => ({ value: Number(row[sparklineKey]) || 0 }))
        : []);
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/dashboard/KpiSparklineCard.jsx
git commit -m "feat(dashboard): add precomputed prop to KpiSparklineCard for server-side aggregates"
```

---

## Task 11: Client — DashboardChart `skipClientAggregation` Prop

**Files:**
- Modify: `client/src/components/dashboard/DashboardChart.jsx`

- [ ] **Step 1: Add `skipClientAggregation` prop**

In `DashboardChart.jsx`, the component currently runs `prepareData` (groups/aggregates rows client-side) and `applyChartGuards` (limits categories). When the server provides pre-aggregated data, both should be bypassed.

Add `skipClientAggregation` to the component props. In the data preparation section (around the `prepareData` and `applyChartGuards` calls):

```jsx
// If server already aggregated the data, use it directly
const chartData = skipClientAggregation
  ? data
  : applyChartGuards(prepareData(data, config), config.chartType, xKey, yKeys);
```

No other changes needed — the rendering logic already works with aggregated row arrays.

- [ ] **Step 2: Commit**

```bash
git add client/src/components/dashboard/DashboardChart.jsx
git commit -m "feat(dashboard): add skipClientAggregation prop to DashboardChart"
```

---

## Task 12: Client — DashboardGrid + DashboardOverlay + ChatPanel Integration

**Files:**
- Modify: `client/src/components/DashboardGrid.jsx`
- Modify: `client/src/components/DashboardOverlay.jsx`
- Modify: `client/src/components/ChatPanel.jsx`

- [ ] **Step 1: Update DashboardGrid to pass tileData**

In `DashboardGrid.jsx`, add `tileData` to props:

```jsx
export default function DashboardGrid({ tiles, dataSources, activeFilters, tileData }) {
```

In the `TileRenderer` section where tiles are rendered, pass precomputed data:

```jsx
// For KPI tiles
<KpiSparklineCard
  config={tile.config}
  data={filteredData}
  precomputed={tileData?.[tile.id] || null}
/>

// For chart tiles — use server rows if available
const chartData = tileData?.[tile.id]?.rows || filteredData;
<DashboardChart
  config={tile.config}
  data={chartData}
  sql={dataSources?.[tile.sourceIndex]?.sql}
  skipClientAggregation={!!tileData?.[tile.id]?.rows}
/>
```

- [ ] **Step 2: Update DashboardOverlay to consume pre-computed slicers and pass tileData**

In `DashboardOverlay.jsx`:

1. Add `slicerValues` and `tileData` and `profileCacheKey` to destructured `dashboardData`:
```jsx
const { spec, dataSources, slicerValues: precomputedSlicerValues, tileData, profileCacheKey } = dashboardData || {};
```

2. Initialize `slicerValues` state from precomputed when available:
```jsx
const [slicerValues, setSlicerValues] = useState(precomputedSlicerValues || {});
```

3. In the `useEffect` for slicer fetching, skip if precomputed slicers are present:
```jsx
useEffect(() => {
  // Skip fetch if we already have precomputed slicer values
  if (precomputedSlicerValues && Object.keys(precomputedSlicerValues).length > 0) {
    setSlicerValues(precomputedSlicerValues);
    return;
  }
  // ... existing fetch logic unchanged
}, [spec, dataSources, precomputedSlicerValues]);
```

4. Pass `tileData` to `DashboardGrid`:
```jsx
<DashboardGrid tiles={spec.tiles} dataSources={dataSources} activeFilters={activeFilters} tileData={tileData} />
```

- [ ] **Step 3: Update ChatPanel to pass through tileData/slicerValues/profileCacheKey and use profileCacheKey on refinement**

In `ChatPanel.jsx`:

1. When setting `dashboardData` from the SSE done event, include new fields:
```jsx
setDashboardData({
  spec: result.dashboardSpec,
  dataSources: result.queries || [...],
  tileData: result.tileData || null,
  slicerValues: result.slicerValues || null,
  profileCacheKey: result.profileCacheKey || null,
});
```

2. In `handleDashboardRefinement` (line 541-591), use `profileCacheKey` when available instead of serializing data sources:

```jsx
const dashboardOpts = {
  // ... existing fields
  previousDashboardSpec: dashboardData.spec,
  // Use profileCacheKey if available, otherwise fall back to serialized sources
  ...(dashboardData.profileCacheKey
    ? { profileCacheKey: dashboardData.profileCacheKey }
    : { dashboardDataSources: serializedSources }),
  // ... rest of fields
};
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/DashboardGrid.jsx client/src/components/DashboardOverlay.jsx client/src/components/ChatPanel.jsx
git commit -m "feat(dashboard): wire precomputed tileData, slicerValues, and profileCacheKey through client"
```

---

## Task 13: Fallback & Single-Row Edge Case Tests

**Files:**
- Create: `server/tests/profilerFallback.test.js`

- [ ] **Step 1: Write fallback and edge case tests**

```javascript
// server/tests/profilerFallback.test.js
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
  // Verify that buildDashboardInputs still works when state.dataProfiles is null
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
```

- [ ] **Step 2: Run tests**

Run: `cd server && node --test tests/profilerFallback.test.js`
Expected: All 3 tests PASS

- [ ] **Step 3: Commit**

```bash
git add server/tests/profilerFallback.test.js
git commit -m "test(dashboard): add fallback and edge case tests for data profiler"
```

---

## Task 14: End-to-End Smoke Test

**Files:**
- None (manual verification)

- [ ] **Step 1: Run all server tests**

Run: `cd server && node --test`
Expected: All tests PASS (including new profiler, cache, tileDataBuilder, profileData tests)

- [ ] **Step 2: Build client**

Run: `cd client && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Start server and verify no startup errors**

Run: `cd server && npm run dev`
Expected: Server starts, `LangGraph workflow compiled` log includes `profileData` node

- [ ] **Step 4: Commit final state**

If any fixes were needed during smoke testing, commit them:

```bash
git add -A
git commit -m "fix(dashboard): smoke test fixes for data profiler integration"
```
