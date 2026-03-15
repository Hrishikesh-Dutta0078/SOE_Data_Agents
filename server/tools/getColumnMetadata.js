const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { getColumnMetadataForTable } = require('../vectordb/schemaFetcher');

const tool = new DynamicStructuredTool({
  name: 'get_column_metadata',
  description: 'Get column names, data types, and nullability for a database table.',
  schema: z.object({
    table: z.string().describe('Table name (without schema prefix)'),
  }),
  func: async ({ table }) => {
    const result = getColumnMetadataForTable(table);
    if (result) return result;
    return `No columns found for table: ${table}`;
  },
});

module.exports = tool;
