const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { getPool } = require('../config/database');

const SAFE_IDENTIFIER = /^[a-zA-Z0-9_.]+$/;

const tool = new DynamicStructuredTool({
  name: 'check_table_size',
  description: 'Check the row count and size of a table. Use before joining to avoid accidental full-table scans on very large tables.',
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
      const sql = `EXEC sp_spaceused '${table.replace(/'/g, "''")}'`;
      const result = await request.query(sql);
      const rows = result.recordset ?? [];

      if (rows.length === 0) {
        return `Table: ${table}, No data returned from sp_spaceused.`;
      }

      const r = rows[0];
      const name = r.name ?? table;
      const rowsCount = r.rows ?? 'N/A';
      const size = r.reserved ?? r.data ?? 'N/A';

      return `Table: ${name}, Rows: ${rowsCount}, Size: ${size}`;
    } catch (err) {
      return `Error: ${err.message}`;
    }
  },
});

module.exports = tool;
