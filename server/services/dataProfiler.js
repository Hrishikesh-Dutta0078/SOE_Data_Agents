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

function formatNum(n) {
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function detectAnomalies(columns, rows, shapes) {
  const anomalies = { outliers: [], trend: [], concentration: [], periodChange: [], missingPatterns: [] };

  for (const col of columns) {
    if (col.inferredType !== 'numeric' || !col.distribution) continue;
    const { p25, p75 } = col.distribution;
    const iqr = p75 - p25;
    if (iqr === 0) continue;
    const upper = p75 + 1.5 * iqr;
    const outlierRows = rows.filter((r) => Number(r[col.name]) > upper);
    if (outlierRows.length > 0) {
      anomalies.outliers.push(`Column '${col.name}' has ${outlierRows.length} outlier(s) above ${formatNum(upper)}`);
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
      anomalies.concentration.push(`Top 3 of ${sorted.length} ${group.dimension} values represent ${(top3Pct * 100).toFixed(0)}% of total ${measure}`);
    }
  }

  return anomalies;
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
        const d = String(row[dateCol] ?? '').substring(0, 7);
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
  const sample = rows.slice(0, SAMPLE_THRESHOLD);
  for (let i = SAMPLE_THRESHOLD; i < rows.length; i++) {
    const j = Math.floor(Math.random() * (i + 1));
    if (j < SAMPLE_THRESHOLD) sample[j] = rows[i];
  }
  return sample;
}

function profileDataSource(sql, rows, columns) {
  const sampleForAnalysis = rows.length > SAMPLE_THRESHOLD ? sampleRows(rows) : rows;

  const colAnalysis = columns.map((colName) => {
    const values = sampleForAnalysis.map((r) => r[colName]);
    return analyzeColumn(colName, values);
  });

  const shapes = detectShapes(colAnalysis);
  const chartRecommendations = recommendCharts(shapes);
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

module.exports = {
  profileDataSource,
  __testables: { inferColumnType, analyzeColumn, detectShapes, recommendCharts, detectAnomalies, computePreAggregates },
};
