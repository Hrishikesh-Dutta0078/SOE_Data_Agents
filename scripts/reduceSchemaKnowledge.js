#!/usr/bin/env node

/**
 * Reduce schema-knowledge.json to minimal fields for LLM-driven discovery:
 * - Per table: description, columns (no keywords)
 * - Per column: type, description, pk, fk (retained for downstream). Remove nullable.
 * Overwrites the file in place.
 *
 * Run from project root: node scripts/reduceSchemaKnowledge.js
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, '..', 'server', 'context', 'knowledge', 'schema-knowledge.json');

function reduceTable(tableName, tableData) {
  const reduced = {
    description: tableData.description || '',
    columns: {},
  };
  for (const [colName, col] of Object.entries(tableData.columns || {})) {
    reduced.columns[colName] = {
      type: col.type || 'UNKNOWN',
      description: col.description || '',
    };
    if (col.pk != null) reduced.columns[colName].pk = !!col.pk;
    if (col.fk != null) reduced.columns[colName].fk = !!col.fk;
  }
  return reduced;
}

function main() {
  const raw = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
  const reduced = {};
  for (const [tableName, tableData] of Object.entries(raw)) {
    reduced[tableName] = reduceTable(tableName, tableData);
  }
  fs.writeFileSync(SCHEMA_PATH, JSON.stringify(reduced, null, 2), 'utf-8');
  console.log('Reduced schema-knowledge.json: %d tables', Object.keys(reduced).length);
}

main();
