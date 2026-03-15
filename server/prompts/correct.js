/**
 * Prompt templates for the Correct node.
 */

const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { formatConversationContext } = require('../utils/conversationContext');

const CORRECT_SYSTEM = `You are a SQL correction expert. Fix the SQL query based on the error type and strategy below.
Error type: {errorType}
Strategy: {strategy}
{schemaBlock}

Return ONLY the corrected SQL query, no explanation or markdown fences.`;

const CORRECT_USER = `{conversationContext}Original question: {question}

Current SQL (has errors):
{sql}

Validation issues:
{validationIssues}

{reflectionFeedback}

Provide the corrected SQL only.`;

const correctPrompt = ChatPromptTemplate.fromMessages([
  ['system', CORRECT_SYSTEM],
  ['human', CORRECT_USER],
]);

const ERROR_STRATEGIES = {
  SCHEMA_ERROR: 'The SQL references a column or table that does not exist. Use the SCHEMA REFERENCE below to find the correct column names. Every column must exist in the table it is aliased to.',
  AGGREGATION_ERROR: 'Ensure every non-aggregated column in SELECT is in GROUP BY. Verify aggregate functions are used correctly.',
  RLS_ERROR: 'Re-add the RLS REGION_ID filter. The query must include the region security predicate.',
  SYNTAX_ERROR: 'Fix the SQL syntax error. Check for missing commas, parentheses, or keywords.',
  SEMANTIC_ERROR: "The SQL doesn't answer the question. Restructure the query to match the user's intent.",
  EXECUTION_ERROR: 'The SQL failed when executed against the database. If the error is "Invalid object name", the table/view does not exist — use ONLY tables from the VALID DATABASE TABLES or RESEARCH BRIEF sections provided. If the error is "Invalid column name", the column does not exist in that table — check the SCHEMA REFERENCE Columns list for the correct column name (e.g. MARKET_SEGMENT instead of SEGMENT). Do NOT guess or invent table/column names. If the error mentions "Incorrect syntax near" or "syntax" (e.g. "Incorrect syntax near \')\'"), treat it as a SYNTAX fix: ensure every opening parenthesis has a matching closing one, commas separate all SELECT/list items, no extra or missing commas, and keywords (SELECT, FROM, WHERE, GROUP BY, etc.) are in valid order. For other execution errors: fix based on the database error message (missing GROUP BY, ambiguous references, type mismatches).',
};

function buildCorrectInputs(state, { errorType, validationIssues, schemaBlock }) {
  const strategy = ERROR_STRATEGIES[errorType] || ERROR_STRATEGIES.SYNTAX_ERROR;
  const convContext = formatConversationContext(state.conversationHistory);
  return {
    errorType,
    strategy,
    schemaBlock: schemaBlock || '',
    conversationContext: convContext ? `${convContext}\n` : '',
    question: state.question,
    sql: state.sql,
    validationIssues: validationIssues.length > 0
      ? validationIssues.map((i) => `- ${i}`).join('\n')
      : '- Unknown error',
    reflectionFeedback: state.reflectionFeedback
      ? `Reflection feedback: ${state.reflectionFeedback}`
      : '',
  };
}

module.exports = { correctPrompt, buildCorrectInputs, ERROR_STRATEGIES };
