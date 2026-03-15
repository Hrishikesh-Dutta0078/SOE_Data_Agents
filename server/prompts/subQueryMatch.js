/**
 * Prompt for LLM-based sub-query template match (fallback when programmatic match fails).
 */

const { ChatPromptTemplate } = require('@langchain/core/prompts');

const SUB_QUERY_MATCH_SYSTEM = `You are a matcher for a Text-to-SQL system. Given a sub-question and a list of gold SQL template descriptions (id, question, variants), decide if the sub-question semantically matches one template.

Rules:
- Match when the sub-question clearly has the same intent and core metrics/dimensions as a template, even if worded differently (e.g. "What is total pipeline by quarter?" matches "What is my pipeline?").
- When no template clearly fits (different metrics, different dimensions, or unclear fit), output null so the system can send the sub-question to research. Research is a first-class path and handles discovery when templates don't apply.
- Output the template id in matched_example_id only when the sub-question is answered by that template's SQL. Otherwise output null.
- Use only the provided template ids; do not invent ids.`;

const SUB_QUERY_MATCH_USER = `=== GOLD TEMPLATES ===
{goldTemplates}

=== SUB-QUESTION ===
{subQuestion}

Output matched_example_id (template id or null):`;

const subQueryMatchPrompt = ChatPromptTemplate.fromMessages([
  ['system', SUB_QUERY_MATCH_SYSTEM],
  ['human', SUB_QUERY_MATCH_USER],
]);

function formatGoldTemplatesForSubQueryMatch(examples) {
  if (!examples || examples.length === 0) return '(none)';
  return examples
    .map((ex) => {
      const variants = (ex.variants || []).slice(0, 5).join('; ');
      return `[id: ${ex.id}] "${ex.question}"${variants ? ` | Variants: ${variants}` : ''}`;
    })
    .join('\n');
}

function buildSubQueryMatchInputs(subQuestion, goldTemplatesText) {
  return {
    subQuestion,
    goldTemplates: goldTemplatesText || '(none)',
  };
}

module.exports = {
  subQueryMatchPrompt,
  formatGoldTemplatesForSubQueryMatch,
  buildSubQueryMatchInputs,
};
