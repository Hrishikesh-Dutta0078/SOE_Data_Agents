const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { searchExamples } = require('../vectordb/examplesFetcher');

const searchExamplesTool = new DynamicStructuredTool({
  name: 'search_examples',
  description: 'Find similar question-to-SQL examples from the gold example library. Use as few-shot references.',
  schema: z.object({
    query: z.string(),
  }),
  func: async ({ query }) => {
    const examples = searchExamples(query, 5);
    if (!examples || examples.length === 0) {
      return 'No similar examples found for this query.';
    }
    const lines = examples.map((ex) => {
      const tablesPart = ex.tables_used ? ` (tables: ${ex.tables_used})` : '';
      return `Q: "${ex.question}"\nSQL: ${ex.sql}${tablesPart}`;
    });
    return lines.join('\n\n');
  },
});

module.exports = searchExamplesTool;
