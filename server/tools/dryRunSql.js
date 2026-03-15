const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { getPool } = require('../config/database');

const dryRunSqlTool = new DynamicStructuredTool({
  name: 'dry_run_sql',
  description: 'Validate SQL syntax without executing the query. Returns whether the SQL is syntactically valid.',
  schema: z.object({
    sql: z.string().describe('The SQL query to validate'),
  }),
  func: async ({ sql }) => {
    try {
      const pool = await getPool();
      const request = pool.request();
      await request.query(`SET PARSEONLY ON; ${sql}; SET PARSEONLY OFF;`);
      return JSON.stringify({ valid: true });
    } catch (err) {
      return JSON.stringify({ valid: false, error: err.message });
    }
  },
});

module.exports = dryRunSqlTool;
