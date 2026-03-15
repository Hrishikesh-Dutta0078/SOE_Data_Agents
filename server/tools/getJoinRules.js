const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { getJoinRulesForTables, formatJoinRulesText } = require('../vectordb/joinRuleFetcher');

const getJoinRulesTool = new DynamicStructuredTool({
  name: 'get_join_rules',
  description: 'Get JOIN rules (direct and multi-hop) between specific database tables. Provide the table names you plan to use.',
  schema: z.object({
    tables: z.array(z.string()).describe('Array of table names to get join rules for'),
  }),
  func: async ({ tables }) => {
    const rules = getJoinRulesForTables(tables);
    if (!rules || rules.length === 0) {
      return 'No join rules found for these tables.';
    }
    return formatJoinRulesText(rules);
  },
});

module.exports = getJoinRulesTool;
