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

  const distinct = new Set(nonNull.map((v) => String(v).toLowerCase()));
  if (distinct.size === 2) {
    for (const pair of BOOLEAN_PAIRS) {
      if ([...distinct].every((v) => pair.has(v))) return 'boolean';
    }
  }

  if (nonNull.every((v) => DATE_RE.test(String(v)) && !isNaN(Date.parse(String(v))))) {
    return 'date';
  }

  if (nonNull.every((v) => typeof v === 'number' || (typeof v === 'string' && !isNaN(Number(v)) && v.trim() !== ''))) {
    return 'numeric';
  }

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
      chartType: 'line',
      xAxis: dateColumn,
      yAxis: measureColumns.slice(0, 2),
      groupBy: catGroup?.dimension || null,
      reason: catGroup ? `Time-series trend grouped by ${catGroup.dimension}` : 'Time-series trend',
    });
  }

  for (const group of shapes.categoricalGroups) {
    if (group.cardinality >= 2 && group.cardinality <= 8 && group.measures.length === 1 && !shapes.isTimeSeries) {
      recs.push({ chartType: 'pie', xAxis: group.dimension, yAxis: group.measures, groupBy: null, reason: `Part-of-whole breakdown (${group.cardinality} categories)` });
    } else if (group.cardinality >= 2 && group.cardinality <= 20) {
      recs.push({ chartType: 'bar', xAxis: group.dimension, yAxis: group.measures.slice(0, 3), groupBy: null, reason: `Categorical comparison (${group.cardinality} categories)` });
    }
  }

  if (shapes.categoricalGroups.length >= 2) {
    const [cat1, cat2] = shapes.categoricalGroups;
    recs.push({ chartType: 'stacked_bar', xAxis: cat1.dimension, yAxis: cat1.measures.slice(0, 1), groupBy: cat2.dimension, reason: `Grouped comparison: ${cat1.dimension} by ${cat2.dimension}` });
  }

  // scatter: two numeric, no categorical
  const numericCols = (shapes.kpiCandidates || []).map((k) => k.column);
  if (numericCols.length >= 2 && shapes.categoricalGroups.length === 0 && !shapes.isTimeSeries) {
    recs.push({ chartType: 'scatter', xAxis: numericCols[0], yAxis: [numericCols[1]], groupBy: null, reason: `Correlation between ${numericCols[0]} and ${numericCols[1]}` });
  }

  // kpi recommendations
  for (const kpi of (shapes.kpiCandidates || [])) {
    recs.push({ chartType: 'kpi', xAxis: null, yAxis: [kpi.column], groupBy: null, reason: `Headline metric: ${kpi.suggestedAgg}(${kpi.column})` });
  }

  return recs;
}

module.exports = {
  analyzeColumn,
  __testables: { inferColumnType, analyzeColumn, detectShapes, recommendCharts },
};
