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

module.exports = {
  analyzeColumn,
  __testables: { inferColumnType, analyzeColumn },
};
