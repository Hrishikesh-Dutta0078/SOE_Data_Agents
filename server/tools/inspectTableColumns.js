/**
 * Inspect Table Columns — focused column metadata lookup for specific tables.
 *
 * Use after discover_context when you need detailed column info for a table
 * that wasn't in the top results. Returns every column with its type and
 * nullable status. No database calls — reads from schema-knowledge.json.
 */

const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { getColumnMetadataForTable, getSchemaByTableNames } = require('../vectordb/schemaFetcher');

const tool = new DynamicStructuredTool({
  name: 'inspect_table_columns',
  description:
    'Get detailed column metadata (name, type, nullable) for one or more specific tables. ' +
    'Use this when discover_context did not return column details for a table you need, ' +
    'or when you need to verify exact column names before the SQL writer uses them.',
  schema: z.object({
    tables: z.array(z.string()).min(1).max(5)
      .describe('Table or view names to inspect (e.g., ["vw_TF_EBI_QUOTA", "vw_EBI_CALDATE"])'),
  }),
  func: async ({ tables }) => {
    const results = {};
    for (const table of tables) {
      const meta = getColumnMetadataForTable(table);
      if (meta) {
        results[table] = meta;
      } else {
        const schemaMatch = getSchemaByTableNames([table]);
        if (schemaMatch.length > 0 && schemaMatch[0].important_columns) {
          results[table] = schemaMatch[0].important_columns;
        } else {
          results[table] = `Table "${table}" not found in schema knowledge.`;
        }
      }
    }
    return JSON.stringify(results, null, 2);
  },
});

module.exports = tool;
