const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');

let _startTime = Date.now();

function resetStartTime() {
  _startTime = Date.now();
}

const getElapsedTimeTool = new DynamicStructuredTool({
  name: 'get_elapsed_time',
  description: 'Get seconds elapsed since this request started. Use to self-impose time budgets.',
  schema: z.object({}),
  func: async () => {
    const elapsedSeconds = (Date.now() - _startTime) / 1000;
    return JSON.stringify({ elapsedSeconds });
  },
});

module.exports = { tool: getElapsedTimeTool, resetStartTime };
