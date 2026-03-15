const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { getUsage } = require('../config/llm');
const { buildUsageSnapshot } = require('../utils/usageMetrics');

const getCostSummaryTool = new DynamicStructuredTool({
  name: 'get_cost_summary',
  description: 'Get accumulated LLM token usage and estimated USD cost for this request so far. Use to check if you should stop exploring and write SQL.',
  schema: z.object({}),
  func: async () => {
    const usage = buildUsageSnapshot(getUsage());
    return JSON.stringify(usage);
  },
});

module.exports = getCostSummaryTool;
