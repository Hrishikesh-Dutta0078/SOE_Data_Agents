const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { getPool } = require('../config/database');

const SAMPLE_SIZE = 10000;
const REQUEST_TIMEOUT_MS = 3000;

const checkNullRatioTool = new DynamicStructuredTool({
  name: 'check_null_ratio',
  description:
    'Check what percentage of values in a column are NULL (uses a sample of up to 10,000 rows for speed). ' +
    'Use before joining or filtering on a column to avoid misleading results. Result is approximate for large tables.',
  schema: z.object({
    table: z.string().describe('The table name'),
    column: z.string().describe('The column name'),
  }),
  func: async ({ table, column }) => {
    try {
      const pool = await getPool();
      const request = pool.request();
      request.timeout = REQUEST_TIMEOUT_MS;

      const sql = `SELECT COUNT(*) AS total, SUM(CASE WHEN [${column}] IS NULL THEN 1 ELSE 0 END) AS nulls
        FROM (SELECT TOP ${SAMPLE_SIZE} [${column}] FROM [${table}]) AS s`;
      const result = await request.query(sql);

      const rows = result.recordset ?? [];
      const row = rows[0];
      if (!row) {
        return `No data returned for table [${table}], column [${column}].`;
      }

      const total = Number(row.total) ?? 0;
      const nulls = Number(row.nulls) ?? 0;
      const pct = total > 0 ? ((nulls / total) * 100).toFixed(2) : '0';

      return `Column ${column} in table ${table}: approx ${pct}% NULL (${nulls} nulls out of ${total} rows in sample).`;
    } catch (err) {
      if (err.message && (err.message.includes('timeout') || err.message.includes('Timeout'))) {
        return `Timeout checking [${table}].[${column}]. Column may be on a very large table. Assume non-trivial NULLs and validate in SQL.`;
      }
      return `Error: ${err.message}`;
    }
  },
});

module.exports = checkNullRatioTool;
