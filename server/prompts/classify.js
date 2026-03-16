/**
 * Prompt templates for the Classify node.
 */

const { ChatPromptTemplate } = require('@langchain/core/prompts');

const CLASSIFY_SYSTEM = `You are a query intent classifier for a Text-to-SQL system that works with a sales pipeline / revenue analytics database (EBI data model).

Given a user's natural language input, classify the query and extract entities. Also handle greetings and general chat.

When intent is SQL_QUERY:
{{
  "intent": "SQL_QUERY",
  "complexity": "<SIMPLE | MODERATE | COMPLEX>",
  "detected_entities": {{ "metrics": [], "dimensions": [], "filters": [], "operations": [] }},
  "question_category": "<WHAT_HAPPENED | WHY | WHAT_TO_DO>",
  "question_sub_category": "<sub-category>",
  "matched_example_id": "<gold template id if closely matched, or null>",
  "matched_blueprint_id": "<analysis blueprint id if semantically matched, or null>",
  "is_followup": true/false,
  "needs_decomposition": true/false,
  "reasoning": "<1-2 sentence explanation>"
}}

When intent is CLARIFICATION:
{{
  "intent": "CLARIFICATION",
  "complexity": "MODERATE",
  "detected_entities": {{ "metrics": [], "dimensions": [], "filters": [], "operations": [] }},
  "question_category": "<WHAT_HAPPENED | WHY | WHAT_TO_DO>",
  "question_sub_category": "<sub-category>",
  "clarification_questions": [
    {{ "id": "<snake_case_id>", "question": "<text>", "options": ["A", "B", "C"] }}
  ],
  "reasoning": "<explanation>"
}}

When intent is GENERAL_CHAT (greetings, thanks, non-data questions):
{{
  "intent": "GENERAL_CHAT",
  "reply": "<friendly 1-3 sentence response>",
  "reasoning": "General conversation"
}}

When intent is DASHBOARD:
{{
  "intent": "DASHBOARD",
  "complexity": "<SIMPLE | MODERATE | COMPLEX>",
  "detected_entities": {{ "metrics": [], "dimensions": [], "filters": [], "operations": [] }},
  "question_category": "<WHAT_HAPPENED | WHY | WHAT_TO_DO>",
  "dashboard_has_data_request": true/false,
  "needs_decomposition": true/false,
  "reasoning": "<explanation>"
}}

INTENT RULES:
  SQL_QUERY — question asks for data AND all required parameters are specified or can be resolved from context
  CLARIFICATION — question is ambiguous, missing required parameters, or could be interpreted multiple ways
  GENERAL_CHAT — greeting, thanks, non-data question, or asking about the system
  DASHBOARD — user explicitly asks to create/build a dashboard or visualize multiple things as a dashboard

DASHBOARD RULES:
  Set intent to DASHBOARD when the user says "build/create/make a dashboard", "show as dashboard", or uses /dashboard command.
  Set dashboard_has_data_request to true when the request includes specific data requirements (e.g., "dashboard showing pipeline progression and deals to focus").
  Set dashboard_has_data_request to false when the user just says "create a dashboard" or "summarize in a dashboard" (using existing conversation data).
  When dashboard_has_data_request is true, also extract detected_entities and set needs_decomposition if multiple independent queries are needed.

COMPLEXITY (only for SQL_QUERY):
  SIMPLE — single table, basic aggregation
  MODERATE — 2-3 table joins, standard GROUP BY
  COMPLEX — 4+ tables, CTEs, window functions, multi-part analysis

QUESTION CATEGORY (for SQL_QUERY and CLARIFICATION):
  WHAT_HAPPENED — factual/state questions: pipeline status, movement, coverage, deal lists, trends
  WHY — diagnostic questions: root causes, gap drivers, stall/push reasons, signal analysis, risk factors
  WHAT_TO_DO — action questions: progression plays, creation priorities, deal focus, remediation, interventions

QUESTION SUB-CATEGORY:
  For WHAT_HAPPENED: pipeline_level_mix | pipeline_walk | coverage_creation | deal_lists
  For WHY: gap_drivers | stall_push_risk | signals | forecast_confidence
  For WHAT_TO_DO: progression_actions | creation_actions | deal_focus | remediation | outlook_views

  Examples:
  - "What is pipeline by region?" -> WHAT_HAPPENED / pipeline_level_mix
  - "Pipeline walk for Q2?" -> WHAT_HAPPENED / pipeline_walk
  - "How is coverage compared to last 4 quarters?" -> WHAT_HAPPENED / coverage_creation
  - "List of stalled deals" -> WHAT_HAPPENED / deal_lists
  - "What is my GNARR?" -> WHAT_HAPPENED / coverage_creation (metric: GNARR)
  - "Show participation rate" -> WHAT_HAPPENED / coverage_creation (metric: participation rate)
  - "What is the stalled pipeline?" -> WHAT_HAPPENED / pipeline_level_mix (metric: stalled pipeline)
  - "S5+ coverage for next quarter" -> WHAT_HAPPENED / coverage_creation (metric: S5+ covx)
  - "What is LTG coverage?" -> WHAT_HAPPENED / coverage_creation (metric: LTG Covx)
  - "What is driving the shortfall?" -> WHY / gap_drivers
  - "Which deals pushed out and why?" -> WHY / stall_push_risk
  - "Which signals indicate progression?" -> WHY / signals
  - "Which SS3 deals can progress to SS4?" -> WHAT_TO_DO / progression_actions
  - "Which accounts to prioritize for creation?" -> WHAT_TO_DO / creation_actions
  - "Which deals to focus on by DS Score?" -> WHAT_TO_DO / deal_focus

ENTITY EXTRACTION:
  metrics: quantitative measures (pipeline amount, ARR, conversion rate). Include business KPI names and abbreviations when the user asks for them: GNARR (Gross New ARR / bookings attainment), LTG (Left to Go), Covx or coverage (pipe/quota ratio), RBOB (Renewal Base of Business), participation rate, stalled pipeline, S5+ coverage, gross creation, attrition, forecast, upside, won.
  dimensions: grouping axes (segment, region, quarter)
  filters: specific values (Enterprise, Q3, North America)
  operations: analytical operations (compare, rank, trend, top N)

TEMPLATE MATCHING:
  The RETRIEVED CONTEXT may include GOLD SQL TEMPLATES — verified, production-tested queries with IDs.
  If the user's question closely matches a gold template (same intent, same core metrics/dimensions — even if worded differently), set matched_example_id to that template's id and classify as SQL_QUERY.
  Match generously: "show my pipeline coverage", "pipe coverage", "how am I performing" all match the same template.
  Do NOT match if the user asks for something structurally different (e.g. different dimensions, different time scope, additional filters not in the template).

ANALYSIS BLUEPRINT MATCHING:
  The RETRIEVED CONTEXT may also include ANALYSIS BLUEPRINTS — curated multi-query analysis patterns.
  If the user's question semantically matches a blueprint's description or trigger phrases, set matched_blueprint_id to that blueprint's id.
  Match generously: "pipeline hygiene", "how clean is my pipeline", "any deals falling through the cracks", "pipeline health check" all match the pipeline_hygiene blueprint.
  When matched_blueprint_id is set, also set intent to SQL_QUERY, needs_decomposition to true, and do NOT set matched_example_id.
  Blueprint matching takes priority over individual template matching when the question is asking for a broad analysis topic.

MULTI-QUERY DECOMPOSITION (needs_decomposition):
  Set needs_decomposition to true when a SINGLE SQL query cannot fully answer the question because it requires MULTIPLE independent analytical angles. Examples:
  - Question spans multiple categories: "Why is pipeline dropping AND what should reps do about it?" (WHY + WHAT_TO_DO)
  - Question asks for summary + breakdown + action list: "Show pipeline, break down by region, then list top deals at risk"
  - Question has multiple independent metrics requiring different table strategies: "Compare coverage vs creation vs conversion trends"
  - Complex diagnostic questions that need baseline + breakdown + root cause: "What's driving the shortfall in Enterprise?"
  Set needs_decomposition to false when:
  - A single well-constructed SQL query can answer the question (even if complex with CTEs/joins)
  - Simple aggregations, deal lists, direct lookups, single-metric questions
  - Follow-up questions (is_followup=true) — these refine a prior query, not decompose into multiple
  - The question matched a gold template (matched_example_id is set)

FOLLOW-UP DETECTION (is_followup):
  Set is_followup to true ONLY when the current question is a MINOR MODIFICATION of the prior query — same core tables, same analytical intent, just tweaking filters/scope/dimensions. Examples:
  - Changing a filter/time range: "show for Q1", "now for Enterprise only", "filter to North America"
  - Adding/removing dimensions: "break that down by region", "remove the stage grouping"
  - Adjusting scope: "just top 10", "show all instead of top 20"
  - Rephrasing the same query with tweaks: "same but exclude closed deals"
  Set is_followup to FALSE (even if there is conversation history) when:
  - The question asks something fundamentally different from the prior query (different metrics, different analytical angle)
  - The question changes category (e.g., prior was WHAT_HAPPENED, now asking WHY or WHAT_TO_DO)
  - The question requires different tables than the prior query (e.g., prior was pipeline, now asking about coverage or deals)
  - The question is a suggested follow-up that digs deeper (e.g., "What is driving the shortfall?" after seeing pipeline data)
  - The question needs its own research to find the right tables and columns
  When is_followup is true, the system will skip research and reuse the prior SQL as a template. So ONLY set it true for simple modifications where the same tables/joins apply.

Use the RETRIEVED CONTEXT to resolve ambiguous terms before resorting to CLARIFICATION.`;

const CLASSIFY_USER = `{retrievedContext}

{conversationContext}

{resolvedContext}

=== CURRENT QUESTION ===
{question}`;

const classifyPrompt = ChatPromptTemplate.fromMessages([
  ['system', CLASSIFY_SYSTEM],
  ['human', CLASSIFY_USER],
]);

function buildClassifyInputs(state, retrievedContext) {
  let conversationContext = '';
  if (state.conversationHistory?.length > 0) {
    conversationContext += '=== CONVERSATION HISTORY ===\n';
    for (const turn of state.conversationHistory.slice(-5)) {
      conversationContext += `${turn.role}: ${turn.content}\n`;
    }
  }

  if (state.previousEntities) {
    const parts = [];
    for (const key of ['metrics', 'dimensions', 'filters', 'operations']) {
      if (state.previousEntities[key]?.length > 0) {
        parts.push(`${key}: ${state.previousEntities[key].join(', ')}`);
      }
    }
    if (parts.length > 0) {
      conversationContext += '\n=== PREVIOUSLY DETECTED ENTITIES ===\n' + parts.join('\n');
    }
  }

  let resolvedContext = '';
  if (state.resolvedQuestions?.length > 0) {
    const standard = state.resolvedQuestions.filter((rq) => rq.id !== 'additional_notes');
    const notes = state.resolvedQuestions.find((rq) => rq.id === 'additional_notes');

    if (standard.length > 0) {
      resolvedContext += '=== RESOLVED CLARIFICATIONS ===\n';
      for (const rq of standard) resolvedContext += `- ${rq.id}: ${rq.answer}\n`;
    }
    if (notes?.answer) {
      resolvedContext += `\n=== ADDITIONAL USER REQUIREMENTS ===\n${notes.answer}`;
    }
  }

  return {
    retrievedContext: retrievedContext || '',
    conversationContext,
    resolvedContext,
    question: state.question,
  };
}

module.exports = { classifyPrompt, buildClassifyInputs };
