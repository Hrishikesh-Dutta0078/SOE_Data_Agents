const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { getSession } = require('../memory/sessionMemory');

let _currentSessionId = null;

function setSessionId(id) {
  _currentSessionId = id;
}

function searchInArray(arr, query) {
  if (!Array.isArray(arr)) return [];
  const q = query.toLowerCase();
  return arr.filter((item) => {
    const str = typeof item === 'string' ? item : JSON.stringify(item);
    return str.toLowerCase().includes(q);
  });
}

const searchSessionMemoryTool = new DynamicStructuredTool({
  name: 'search_session_memory',
  description: 'Search past queries and corrections from the current conversation session. Use for multi-turn context.',
  schema: z.object({
    query: z.string().describe('What to search for in session history'),
  }),
  func: async ({ query }) => {
    if (!_currentSessionId) {
      return 'No session history available.';
    }

    const session = getSession(_currentSessionId);
    if (!session) {
      return 'No session history available.';
    }

    const queryMatches = searchInArray(session.queryHistory ?? [], query);
    const correctionMatches = searchInArray(session.correctionHistory ?? [], query);

    const parts = [];
    if (queryMatches.length > 0) {
      parts.push('**Query history matches:**\n' + queryMatches.map((q, i) => `${i + 1}. ${q}`).join('\n'));
    }
    if (correctionMatches.length > 0) {
      parts.push('**Correction history matches:**\n' + correctionMatches.map((c, i) => `${i + 1}. ${c}`).join('\n'));
    }
    if (parts.length === 0) {
      return 'No matching queries or corrections found in session history.';
    }
    return parts.join('\n\n');
  },
});

module.exports = { tool: searchSessionMemoryTool, setSessionId };
