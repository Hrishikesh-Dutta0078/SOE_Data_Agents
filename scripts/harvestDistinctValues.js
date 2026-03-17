#!/usr/bin/env node

/**
 * Harvest distinct values for all important columns from SQL Server
 * and write to distinct-values.json.
 *
 * Reads schema-knowledge.json to determine which tables/columns to query.
 * Runs SELECT DISTINCT TOP 50 for each column.
 *
 * Prerequisites:
 *   - SQL Server accessible (server .env: DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD)
 *   - schema-knowledge.json already generated
 *
 * Run from project root:
 *   node scripts/harvestDistinctValues.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

const fs = require('fs');
const { getPool, closePool, getDbConfig } = require(path.join(__dirname, '..', 'server', 'config', 'database'));

const KNOWLEDGE_DIR = path.join(__dirname, '..', 'server', 'context', 'knowledge');
const SCHEMA_FILE = path.join(KNOWLEDGE_DIR, 'schema-knowledge.json');
const OUTPUT_FILE = path.join(KNOWLEDGE_DIR, 'distinct-values.json');

const DISTINCT_LIMIT = 10;
const QUERY_TIMEOUT = 30000;

async function harvestTable(pool, tableName, columns) {
  const tableResult = {};
  const colNames = Object.keys(columns);

  for (const colName of colNames) {
    const quotedTable = `[${tableName}]`;
    const quotedCol = `[${colName}]`;
    const query = `SET NOCOUNT ON; SELECT TOP ${DISTINCT_LIMIT} ${quotedCol} FROM (SELECT DISTINCT ${quotedCol} FROM ${quotedTable}) AS sub ORDER BY NEWID()`;

    try {
      const request = pool.request();
      request.timeout = QUERY_TIMEOUT;
      const result = await request.query(query);
      const rows = result.recordset ?? [];
      tableResult[colName] = rows.map((r) => r[colName]);
    } catch (err) {
      console.warn(`  SKIP ${tableName}.${colName}: ${err.message}`);
      tableResult[colName] = { error: err.message };
    }
  }

  return tableResult;
}

async function main() {
  if (!fs.existsSync(SCHEMA_FILE)) {
    console.error(`schema-knowledge.json not found. Run generateSchemaKnowledge.js first.`);
    process.exit(1);
  }

  const schema = JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf-8'));
  const tableNames = Object.keys(schema);

  const { config } = getDbConfig();
  console.log(`Harvesting distinct values for ${tableNames.length} tables...`);
  console.log(`Server: ${config.server}, DB: ${config.database}\n`);

  const pool = await getPool();
  console.log('Connected to SQL Server.\n');

  const allValues = {};
  let totalColumns = 0;
  let successColumns = 0;
  let errorColumns = 0;

  for (const tableName of tableNames) {
    const columns = schema[tableName].columns || {};
    const colCount = Object.keys(columns).length;
    totalColumns += colCount;

    console.log(`  ${tableName} (${colCount} columns)...`);

    try {
      const tableValues = await harvestTable(pool, tableName, columns);
      allValues[tableName] = tableValues;

      const errors = Object.values(tableValues).filter((v) => v && typeof v === 'object' && v.error);
      successColumns += colCount - errors.length;
      errorColumns += errors.length;

      console.log(`    OK: ${colCount - errors.length} columns, ${errors.length} errors`);
    } catch (err) {
      console.error(`    TABLE ERROR ${tableName}: ${err.message}`);
      allValues[tableName] = { _error: err.message };
      errorColumns += colCount;
    }
  }

  await closePool();

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allValues, null, 2), 'utf-8');

  console.log(`\nDone!`);
  console.log(`  Tables: ${tableNames.length}`);
  console.log(`  Columns harvested: ${successColumns}/${totalColumns} (${errorColumns} errors)`);
  console.log(`  Output: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error('Harvest failed:', err.message);
  process.exit(1);
});
