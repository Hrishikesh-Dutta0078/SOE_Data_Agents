const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { getDistinctValuesAsync } = require('../vectordb/distinctValuesFetcher');
const logger = require('../utils/logger');

const tool = new DynamicStructuredTool({
  name: 'query_distinct_values',
  description:
    'Get distinct values for one or more table/column pairs. Use to verify filter values ' +
    'exist before using them in WHERE clauses. Pass multiple columns in one call to check ' +
    'several filters at once.',
  schema: z.object({
    columns: z.array(
      z.object({
        table: z.string().describe('Table or view name'),
        column: z.string().describe('Column name to inspect'),
      })
    ).min(1).describe('Array of {table, column} pairs to look up'),
    limit: z.number().int().min(1).max(100).nullable().optional().default(5)
      .describe('Maximum number of distinct values to return per column'),
  }),
  func: async ({ columns, limit }) => {
    const results = {};
    for (const { table, column } of columns) {
      const key = `${table}.${column}`;
      const result = await getDistinctValuesAsync(table, column, limit);
      if (result.available) {
        results[key] = result.values;
        logger.info('Distinct values fetched', {
          column: key,
          count: result.values.length,
          sample: result.values.slice(0, 5).join(', '),
        });
      } else {
        results[key] = { error: result.message };
        logger.warn('Distinct values not found', { column: key, message: result.message });
      }
    }
    return JSON.stringify(results);
  },
});

module.exports = tool;
