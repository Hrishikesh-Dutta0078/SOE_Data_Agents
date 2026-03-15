const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { getPool } = require('../config/database');

const SHOWPLAN_TIMEOUT = 15000;

const estimateQueryCostTool = new DynamicStructuredTool({
  name: 'estimate_query_cost',
  description: 'Preview the SQL Server execution plan for a query WITHOUT executing it. Use to check for table scans or expensive operations before running.',
  schema: z.object({
    sql: z.string().describe('The SQL query to analyze'),
  }),
  func: async ({ sql }) => {
    try {
      const pool = await getPool();
      const request = pool.request();
      request.timeout = SHOWPLAN_TIMEOUT;

      const result = await request.query(
        `SET SHOWPLAN_TEXT ON; ${sql}; SET SHOWPLAN_TEXT OFF;`
      );

      const rows = result.recordset ?? [];
      const planText = rows
        .map((r) => (r['StmtText'] != null ? r['StmtText'] : Object.values(r)[0]))
        .filter(Boolean)
        .join('\n');

      return planText || 'Execution plan retrieved (no text output).';
    } catch (err) {
      return `Error: ${err.message}`;
    }
  },
});

module.exports = estimateQueryCostTool;
