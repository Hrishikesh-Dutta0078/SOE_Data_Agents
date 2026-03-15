const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');

const submitSqlTool = new DynamicStructuredTool({
  name: 'submit_sql',
  description: "Submit your final T-SQL query. Call this when you have gathered enough context and are confident in your SQL. This ends the research phase.",
  schema: z.object({
    sql: z.string().describe('The complete T-SQL query'),
    reasoning: z.string().describe('Chain-of-thought explanation of your approach'),
  }),
  func: async ({ sql, reasoning }) => {
    return JSON.stringify({ sql, reasoning });
  },
});

module.exports = submitSqlTool;
