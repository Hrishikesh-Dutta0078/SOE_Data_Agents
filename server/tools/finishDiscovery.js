/**
 * finish_discovery tool — Used by the Research Agent (Phase 1, Haiku) to signal
 * that discovery is complete. When Fast mode is on, Haiku runs discovery tools only
 * and calls this to indicate it has gathered enough context for Opus to synthesize
 * the research brief.
 */

const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');

const finishDiscoveryTool = new DynamicStructuredTool({
  name: 'finish_discovery',
  description: 'Call this when you have gathered enough context from discover_context, query_distinct_values, inspect_table_columns, check_null_ratio, and search_session_memory. Do NOT call this until you have at least run discover_context and reviewed the results. Once you call this, the research phase is complete.',
  schema: z.object({
    summary: z.string().optional().describe('Brief summary of what was discovered'),
  }),
  func: async () => {
    return 'Discovery complete. Context has been gathered for brief synthesis.';
  },
});

module.exports = finishDiscoveryTool;
