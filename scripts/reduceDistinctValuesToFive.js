#!/usr/bin/env node

/**
 * Reduce schema-knowledge.json so each column's distinct_values has at most 5 values,
 * chosen randomly from the existing values. Overwrites the file in place.
 *
 * Run from project root: node scripts/reduceDistinctValuesToFive.js
 */

const fs = require('fs');
const path = require('path');

const KNOWLEDGE_DIR = path.join(__dirname, '..', 'server', 'context', 'knowledge');
const FILE = path.join(KNOWLEDGE_DIR, 'schema-knowledge.json');

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
  const schema = JSON.parse(fs.readFileSync(FILE, 'utf-8'));

  let totalCols = 0;
  let reducedCols = 0;

  for (const tableName of Object.keys(schema)) {
    const tableData = schema[tableName];
    if (!tableData?.columns) continue;

    for (const colName of Object.keys(tableData.columns)) {
      const colData = tableData.columns[colName];
      if (!colData.distinct_values) continue;

      totalCols++;
      if (Array.isArray(colData.distinct_values) && colData.distinct_values.length > MAX_VALUES) {
        colData.distinct_values = randomSample(colData.distinct_values, MAX_VALUES);
        reducedCols++;
      }
    }
  }

  const tmpFile = FILE + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(schema, null, 2), 'utf-8');
  fs.renameSync(tmpFile, FILE);

  console.log(`Reduced ${reducedCols} columns to ${MAX_VALUES} values (total columns: ${totalCols}).`);
  console.log(`Written: ${FILE}`);
}

main();
