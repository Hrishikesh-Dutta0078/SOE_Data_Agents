/**
 * Shared conversation context formatter for agent prompts.
 *
 * Builds a compact text block summarising prior conversation turns
 * (question, SQL generated, result summary) so that research and
 * SQL-writing agents understand follow-up questions like
 * "break that down by region" or "now filter to Q3 only".
 */

const MAX_SQL_CHARS = 500;
const DEFAULT_MAX_TURNS = 3;

/**
 * @param {Array<{role: string, content: string, sql?: string, resultSummary?: string}>} history
 * @param {{ maxTurns?: number }} [opts]
 * @returns {string} formatted context block, or '' if no relevant history
 */
function formatConversationContext(history, opts = {}) {
  if (!Array.isArray(history) || history.length === 0) return '';

  const maxTurns = opts.maxTurns ?? DEFAULT_MAX_TURNS;

  const pairs = [];
  let current = null;

  for (const turn of history) {
    if (turn.role === 'user') {
      current = { question: turn.content, sql: null, resultSummary: null };
    } else if (turn.role === 'assistant' && current) {
      current.sql = turn.sql || null;
      current.resultSummary = turn.resultSummary || null;
      pairs.push(current);
      current = null;
    }
  }
  if (current) pairs.push(current);

  const recentPairs = pairs.slice(-maxTurns);
  if (recentPairs.length === 0) return '';

  let block = '=== CONVERSATION CONTEXT (prior turns) ===\n';

  for (let i = 0; i < recentPairs.length; i++) {
    const p = recentPairs[i];
    block += `\nTurn ${i + 1} — User: ${p.question}\n`;

    if (p.sql) {
      const truncated = p.sql.length > MAX_SQL_CHARS
        ? p.sql.substring(0, MAX_SQL_CHARS) + '...(truncated)'
        : p.sql;
      block += `Turn ${i + 1} — SQL: ${truncated}\n`;
    }

    if (p.resultSummary) {
      block += `Turn ${i + 1} — Result: ${p.resultSummary}\n`;
    }
  }

  block += '\nThe current question is a follow-up to the conversation above.\n';
  return block;
}

module.exports = { formatConversationContext };
