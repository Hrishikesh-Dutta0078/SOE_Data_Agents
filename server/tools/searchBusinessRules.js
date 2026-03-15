const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { searchRules } = require('../vectordb/rulesFetcher');

const searchBusinessRulesTool = new DynamicStructuredTool({
  name: 'search_business_rules',
  description: 'Search business rules and domain knowledge. Returns rules about pipeline definitions, fiscal formats, SQL patterns, and data conventions.',
  schema: z.object({
    query: z.string(),
  }),
  func: async ({ query }) => {
    const rules = searchRules(query, 8);
    if (!rules || rules.length === 0) {
      return 'No relevant business rules found for this query.';
    }
    const lines = rules.map((r) => `- [${r.category}] ${r.text}`);
    return lines.join('\n');
  },
});

module.exports = searchBusinessRulesTool;
