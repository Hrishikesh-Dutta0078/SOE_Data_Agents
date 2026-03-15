const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { getModel } = require('../config/llm');

const optimizeSlowQueryTool = new DynamicStructuredTool({
  name: 'optimize_slow_query',
  description: 'Get optimization suggestions for a slow or expensive SQL query. Provides tips to make the query faster.',
  schema: z.object({
    sql: z.string().describe('The SQL query to optimize'),
    issue: z.string().describe("What's wrong: timeout, table scan, etc."),
  }),
  func: async ({ sql, issue }) => {
    const prompt = `You are a T-SQL performance expert. The user has a slow or expensive query and reports this issue: "${issue}"

Here is the SQL:
\`\`\`sql
${sql}
\`\`\`

Suggest specific T-SQL optimizations. Consider:
- Adding TOP to limit result size
- Using indexed columns in WHERE clauses
- Simplifying joins or breaking into CTEs
- Avoiding SELECT * when possible
- Using EXISTS instead of IN for subqueries when appropriate
- Adding appropriate indexes (mention which columns)

Return clear, actionable suggestions.`;

    const model = getModel({
      temperature: 0,
      maxTokens: 1024,
    });
    const response = await model.invoke([{ role: 'user', content: prompt }]);
    return response.content ?? '';
  },
});

module.exports = optimizeSlowQueryTool;
