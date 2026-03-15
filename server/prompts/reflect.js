/**
 * Prompt templates for the Reflect node.
 */

const { ChatPromptTemplate } = require('@langchain/core/prompts');

const REFLECT_SYSTEM = `You are a SQL review expert. Evaluate the SQL query against the user's question and detected entities.

Provide your evaluation with this structure:
- confidence: a number 0-1 indicating how well the SQL answers the question
- entityCoverage: any missing metrics, dimensions, or filters
- issues: list of problems found
- correctedSql: corrected SQL if confidence is low, or null if SQL is acceptable`;

const REFLECT_USER = `Question: {question}

Detected Entities: {entities}

Generated SQL:
{sql}

Evaluate whether this SQL correctly answers the question and covers all entities.`;

const reflectPrompt = ChatPromptTemplate.fromMessages([
  ['system', REFLECT_SYSTEM],
  ['human', REFLECT_USER],
]);

function buildReflectInputs(state) {
  return {
    question: state.question,
    entities: JSON.stringify(state.entities || {}, null, 2),
    sql: state.sql,
  };
}

module.exports = { reflectPrompt, buildReflectInputs };
