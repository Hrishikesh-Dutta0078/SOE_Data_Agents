const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { getPool } = require('../config/database');

const SAFE_IDENTIFIER = /^[a-zA-Z0-9_.]+$/;

function formatAsTextTable(rows, columns) {
  if (rows.length === 0) return 'No rows returned.';

  const pad = (val) => String(val ?? '').replace(/\|/g, ' ');
  const maxLen = (col) => Math.max(
    col.length,
    ...rows.map((r) => pad(r[col]).length)
  );
  const lengths = Object.fromEntries(columns.map((c) => [c, maxLen(c)]));

  const header = columns.map((c) => pad(c).padEnd(lengths[c])).join(' | ');
  const separator = columns.map((c) => '-'.repeat(lengths[c])).join('-+-');
  const dataRows = rows.map((r) =>
    columns.map((c) => pad(r[c]).padEnd(lengths[c])).join(' | ')
  );

  return [header, separator, ...dataRows].join('\n');
}

const tool = new DynamicStructuredTool({
  name: 'sample_table_data',
  description: 'Get a sample of 5 rows from a table to see real data shapes, formats, and values.',
  schema: z.object({
    table: z.string(),
  }),
  func: async ({ table }) => {
    if (!SAFE_IDENTIFIER.test(table)) {
      return 'Error: Invalid table name. Use only alphanumeric, underscore, or dot.';
    }

    try {
      const pool = await getPool();
      const request = pool.request();
      const sql = `SET NOCOUNT ON; SELECT TOP 5 * FROM [${table}]`;
      const result = await request.query(sql);
      const rows = result.recordset ?? [];
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      return formatAsTextTable(rows, columns);
    } catch (err) {
      return `Error: ${err.message}`;
    }
  },
});

module.exports = tool;
