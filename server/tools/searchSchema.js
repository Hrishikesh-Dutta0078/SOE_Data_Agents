const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { selectTablesAndColumnsByLLM } = require('../vectordb/llmSchemaSelector');
const { getSchemaByTableNames } = require('../vectordb/schemaFetcher');

const searchSchemaTool = new DynamicStructuredTool({
  name: 'search_schema',
  description: 'Search the database schema for tables and columns relevant to a query. Uses LLM to select relevant tables and columns. Returns table names, key columns, and important columns.',
  schema: z.object({
    query: z.string().describe('Search query describing what tables/columns you need'),
  }),
  func: async ({ query }) => {
    const { tableNames, columnsByTable } = await selectTablesAndColumnsByLLM(query, null);
    if (!tableNames || tableNames.length === 0) {
      return 'No relevant schema found for this query.';
    }
    const tables = getSchemaByTableNames(tableNames);
    const lines = tables.map((t) => {
      const parts = [`**${t.table_name}**`];
      if (t.description) parts.push(`  Description: ${t.description}`);
      if (t.key_columns) parts.push(`  Key columns: ${t.key_columns}`);
      if (t.important_columns) parts.push(`  Important columns: ${t.important_columns}`);
      const selectedCols = columnsByTable[t.table_name];
      if (selectedCols && selectedCols.length > 0) {
        parts.push(`  Relevant columns (LLM-selected): ${selectedCols.join(', ')}`);
      }
      return parts.join('\n');
    });
    return lines.join('\n\n');
  },
});

module.exports = searchSchemaTool;
