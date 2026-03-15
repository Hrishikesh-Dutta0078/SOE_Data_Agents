const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { fetchFiscalPeriod, resolveCalendarColumns } = require('../vectordb/fiscalPeriodFetcher');

const getCurrentFiscalPeriodTool = new DynamicStructuredTool({
  name: 'get_current_fiscal_period',
  description: "Get the current fiscal year, quarter, and month from the database calendar table. Use for questions about 'this quarter', 'current year', etc.",
  schema: z.object({}),
  func: async () => {
    const fiscal = await fetchFiscalPeriod();
    if (fiscal) {
      return JSON.stringify(fiscal);
    }
    return JSON.stringify({ error: 'Fiscal period unavailable (database or calendar table issue).' });
  },
});

module.exports = getCurrentFiscalPeriodTool;
module.exports.__testables = { resolveCalendarColumns };
