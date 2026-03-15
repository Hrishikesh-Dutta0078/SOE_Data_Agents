const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { getPool } = require('../config/database');

const SELECT_ONLY = /^\s*SELECT\b/i;
const DANGEROUS = /\b(DROP|DELETE|UPDATE|INSERT|EXEC|EXECUTE|TRUNCATE|ALTER|CREATE)\b/i;

const tool = new DynamicStructuredTool({
  name: 'verify_join',
  description: 'Test if a JOIN between tables produces any rows. Provide a SELECT TOP 1 query with the JOIN to verify.',
  schema: z.object({
    sql: z.string().describe('A SELECT TOP 1 query testing the join'),
  }),
  func: async ({ sql }) => {
    const trimmed = sql.trim();
    if (!SELECT_ONLY.test(trimmed)) {
      return 'Error: Query must start with SELECT.';
    }
    if (DANGEROUS.test(trimmed)) {
      return 'Error: Query contains disallowed keywords (DROP, DELETE, UPDATE, INSERT, EXEC, etc.).';
    }

    try {
      const pool = await getPool();
      const request = pool.request();
      request.timeout = 10000;

      const result = await request.query(trimmed);
      const rows = result.recordset ?? [];
      const count = rows.length;
      const verdict = count > 0 ? 'yes' : 'no';

      return `Join produces rows: ${verdict}\nRow count: ${count}`;
    } catch (err) {
      return `Error: ${err.message}`;
    }
  },
});

module.exports = tool;
