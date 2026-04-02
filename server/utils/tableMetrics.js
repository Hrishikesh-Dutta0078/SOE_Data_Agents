'use strict';

const SUMMABLE_PATTERN = /revenue|sales|amount|cost|qty|quantity|count|total|budget|spend|profit|income|expense|price|fee|payment|balance/i;
const RATE_PATTERN = /pct|percent|rate|ratio|margin|avg_|average_|_avg|_pct|_rate/i;
const MAX_RANKING = 8;

function classifyColumn(name, rows) {
  const vals = rows.map(r => r[name]).filter(v => v !== null && v !== undefined && v !== '');
  if (vals.length === 0) return 'empty';

  const numericVals = vals.filter(v => typeof v === 'number' || (typeof v === 'string' && !isNaN(Number(v)) && v.trim() !== ''));
  const isAllNumeric = numericVals.length === vals.length;

  if (isAllNumeric) {
    if (SUMMABLE_PATTERN.test(name)) return 'summable';
    if (RATE_PATTERN.test(name)) return 'rate';
    const numbers = numericVals.map(Number);
    const allInPercRange = numbers.every(n => n >= 0 && n <= 100);
    if (allInPercRange && numbers.some(n => n !== Math.round(n))) return 'rate';
    return 'numeric';
  }

  const distinct = new Set(vals);
  if (distinct.size <= Math.max(vals.length * 0.5, 2)) return 'categorical';
  return 'label';
}

function pickColumns(columns, rows) {
  const classified = columns.map(col => ({ name: col, type: classifyColumn(col, rows) }));

  const metricPriority = ['summable', 'rate', 'numeric'];
  let metric = null;
  for (const prio of metricPriority) {
    metric = classified.find(c => c.type === prio);
    if (metric) break;
  }

  const labelCol = classified.find(c => c.type === 'categorical' || c.type === 'label');

  return { metric, labelCol, classified };
}

function formatValue(val) {
  if (val === null || val === undefined) return '—';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  const abs = Math.abs(num);
  if (abs >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (abs >= 1e4) return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (Number.isInteger(num)) return num.toLocaleString('en-US');
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function computeTableMetrics(rows, columns) {
  if (!rows || rows.length === 0 || !columns || columns.length === 0) return null;

  const { metric, labelCol } = pickColumns(columns, rows);
  if (!metric) return null;

  const metricName = metric.name;
  const labelName = labelCol?.name || null;

  const values = rows
    .map(r => ({ val: Number(r[metricName]), label: labelName ? String(r[labelName] ?? '') : '' }))
    .filter(v => !isNaN(v.val));

  if (values.length === 0) return null;

  const nums = values.map(v => v.val);
  const total = nums.reduce((s, n) => s + n, 0);
  const average = total / nums.length;

  const sorted = [...values].sort((a, b) => b.val - a.val);
  const maxEntry = sorted[0];
  const minEntry = sorted[sorted.length - 1];
  const spread = maxEntry.val - minEntry.val;
  const maxVal = Math.max(Math.abs(maxEntry.val), 1);

  const ranking = sorted.slice(0, MAX_RANKING).map((entry, i) => ({
    rank: i + 1,
    label: entry.label,
    value: entry.val,
    pctOfMax: Math.round((Math.abs(entry.val) / maxVal) * 100),
  }));

  return {
    metricColumn: metricName,
    labelColumn: labelName,
    metricType: metric.type,
    total: metric.type === 'rate' ? null : total,
    average: Math.round(average * 100) / 100,
    max: { value: maxEntry.val, label: maxEntry.label, formatted: formatValue(maxEntry.val) },
    min: { value: minEntry.val, label: minEntry.label, formatted: formatValue(minEntry.val) },
    spread,
    rowCount: rows.length,
    ranking,
  };
}

module.exports = { computeTableMetrics };
