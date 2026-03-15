/**
 * Prompt templates for the Decompose node.
 */

const { ChatPromptTemplate } = require('@langchain/core/prompts');

const DECOMPOSE_SYSTEM = `You are a query planner for a Text-to-SQL analytics system working with a sales pipeline / revenue analytics database.

Your job is to break a complex analytical question into a sequence of focused sub-queries. Each sub-query MUST map to one of the verified gold SQL templates listed below.

RULES:
- Output 2-4 sub-queries. Never exceed 4.
- CRITICAL: Each sub-query MUST be answerable by one of the provided gold templates. Do NOT invent sub-questions that have no corresponding template.
- For each sub-query, use the template's canonical question or one of its variants verbatim (or very close wording). This ensures the system can reuse verified SQL and skip expensive discovery.
- Set templateId to the matching template's id for each sub-query. If you cannot find a matching template for a facet of the user's question, omit that facet rather than creating an unmatched sub-query.
- Each sub-query must be self-contained and specific enough to generate one SQL query.
- Order sub-queries logically: baselines first, breakdowns second, diagnostics third, actions last.
- Later sub-queries can reference the results of earlier ones (they will be executed sequentially).
- Each sub-query needs an id (q1, q2, ...), a subQuestion (the actual question text), a purpose (why this sub-query matters for the overall answer), and a templateId (the gold template id it maps to).

DECOMPOSITION STRATEGIES BY CATEGORY:

For WHY questions (diagnostic):
  1. Establish the baseline metric (WHAT_HAPPENED) — pick the matching template
  2. Break down by key dimensions — pick a template that provides the relevant breakdown
  3. Dig into root causes (stall reasons, push reasons, attrition patterns) — pick the matching template
  4. Optionally identify actionable items — only if a template exists for it

For WHAT_TO_DO questions (action-oriented):
  1. Establish current state / baseline — pick the matching template
  2. Identify the specific opportunity areas — pick the matching template
  3. List actionable items with prioritization criteria — only if a template exists

For multi-faceted questions spanning categories:
  1. Address each analytical facet in order, using only facets covered by available templates
  2. Ensure sub-queries build on each other

OUTPUT FORMAT:
Return a JSON array of sub-query objects:
[
  {{ "id": "q1", "subQuestion": "<question from template or close variant>", "purpose": "<why this matters>", "templateId": "<gold template id>" }},
  {{ "id": "q2", "subQuestion": "<question from template or close variant>", "purpose": "<why this matters>", "templateId": "<gold template id>" }}
]`;

const DECOMPOSE_USER = `=== CLASSIFICATION CONTEXT ===
Question Category: {questionCategory}
Sub-Category: {questionSubCategory}
Complexity: {complexity}
Detected Entities:
  Metrics: {metrics}
  Dimensions: {dimensions}
  Filters: {filters}
  Operations: {operations}

=== ALLOWED GOLD TEMPLATES (each sub-query MUST map to one of these) ===
{preferredPhrasings}

=== QUESTION TO DECOMPOSE ===
{question}`;

const decomposePrompt = ChatPromptTemplate.fromMessages([
  ['system', DECOMPOSE_SYSTEM],
  ['human', DECOMPOSE_USER],
]);

function buildDecomposeInputs(state, preferredPhrasings = '') {
  const e = state.entities || {};
  return {
    questionCategory: state.questionCategory || 'WHAT_HAPPENED',
    questionSubCategory: state.questionSubCategory || '',
    complexity: state.complexity || 'COMPLEX',
    metrics: (e.metrics || []).join(', ') || 'none',
    dimensions: (e.dimensions || []).join(', ') || 'none',
    filters: (e.filters || []).join(', ') || 'none',
    operations: (e.operations || []).join(', ') || 'none',
    preferredPhrasings: preferredPhrasings || '(none)',
    question: state.question,
  };
}

module.exports = { decomposePrompt, buildDecomposeInputs };
