#!/usr/bin/env node

/**
 * Reduce distinct-values.json so each column has at most 5 distinct values,
 * chosen randomly from the existing values. Overwrites the file in place.
 *
 * Run from project root: node scripts/reduceDistinctValuesToFive.js
 */

const fs = require('fs');
const path = require('path');

const KNOWLEDGE_DIR = path.join(__dirname, '..', 'server', 'context', 'knowledge');
const FILE = path.join(KNOWLEDGE_DIR, 'distinct-values.json');

const MAX_VALUES = 5;

function randomSample(arr, n) {
  if (arr.length <= n) return arr;
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function main() {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf-8'));

  let totalCols = 0;
  let reducedCols = 0;

  for (const tableName of Object.keys(data)) {
    const table = data[tableName];
    if (!table || typeof table !== 'object' || table.error) continue;

    for (const colName of Object.keys(table)) {
      const val = table[colName];
      totalCols++;
      if (Array.isArray(val) && val.length > MAX_VALUES) {
        table[colName] = randomSample(val, MAX_VALUES);
        reducedCols++;
      } else if (val && typeof val === 'object' && val.error) {
        // leave error entries as-is
      }
    }
  }

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Reduced ${reducedCols} columns to ${MAX_VALUES} values (total columns: ${totalCols}).`);
  console.log(`Written: ${FILE}`);
}

main();
