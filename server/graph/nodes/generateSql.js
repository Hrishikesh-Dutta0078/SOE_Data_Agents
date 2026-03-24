/**
 * Generate SQL Node — single Opus LLM call for SQL generation.
 *
 * Replaces both the researchAgent (ReAct loop) and sqlWriterAgent (Haiku)
 * with a single Opus LLM call. Builds a comprehensive prompt from the
 * contextBundle assembled by contextFetch, handles template/follow-up/research
 * routes, correction retries, and multi-query context.
 *
 * Returns: { sql, reasoning, correctionGuidance: null, trace }
 */

const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { getModel, getModelMeta } = require('../../config/llm');
const { validateSqlReferences } = require('../../utils/sqlReferenceValidator');
const { formatConversationContext } = require('../../utils/conversationContext');
const { getSession } = require('../../memory/sessionMemory');
const logger = require('../../utils/logger');
const { LLMError, AgentTimeoutError } = require('../../utils/errors');

const GENERATE_SQL_TIMEOUT_MS = 60_000;
const GENERATE_SQL_TIMEOUT_COMPLEX_MS = 120_000;
const GENERATE_SQL_MAX_TOKENS = 4096;

// ---------------------------------------------------------------------------
// Prompt formatting helpers
// ---------------------------------------------------------------------------

/**
 * Format schema table descriptions from the contextBundle schema array.
 * Each entry has { table_name, description, important_columns }.
 */
function formatSchema(schema) {
  if (!Array.isArray(schema) || schema.length === 0) return '';
  let text = '**ALLOWED TABLES (use ONLY these table names — any other table does not exist and will cause "Invalid object name"):**\n';
  for (const t of schema) {
    text += `- ${t.table_name}`;
    if (t.description) text += ` — ${t.description}`;
    text += '\n';
  }
  return text;
}

/**
 * Format exact column metadata — CRITICAL for preventing hallucinated column names.
 * columnMetadata is { tableName: "COL_NAME TYPE  description\n..." }
 */
function formatColumnMetadata(columnMetadata) {
  if (!columnMetadata || typeof columnMetadata !== 'object') return '';
  const entries = Object.entries(columnMetadata);
  if (entries.length === 0) return '';

  let text = '**EXACT COLUMN REFERENCE (use ONLY these column names per table — anything else will cause "Invalid column name"):**\n';
  for (const [tableName, meta] of entries) {
    if (!meta) continue;
    text += `\n-- ${tableName}:\n${meta}\n`;
  }
  return text;
}

/**
 * Format join rules from the contextBundle.
 * joinRules is an array of { from, to, type, on } objects.
 * joinText is a pre-formatted string from formatJoinRulesText().
 */
function formatJoinRules(joinRules, joinText) {
  if (joinText && typeof joinText === 'string' && joinText.trim()) {
    return `**JOIN PATHS:**\n${joinText}\n`;
  }
  if (!Array.isArray(joinRules) || joinRules.length === 0) return '';
  let text = '**JOIN PATHS:**\n';
  for (const j of joinRules) {
    text += `- ${j.from} ${j.type || 'JOIN'} ${j.to}`;
    if (j.on) text += ` ON ${j.on}`;
    text += '\n';
  }
  return text;
}

/**
 * Format business rules with categories.
 * rules is an array of { text, category?, score? } or plain strings.
 */
function formatRules(rules) {
  if (!Array.isArray(rules) || rules.length === 0) return '';
  let text = '**BUSINESS RULES:**\n';
  for (const r of rules) {
    const ruleText = typeof r === 'string' ? r : r.text || r.rule || JSON.stringify(r);
    text += `- ${ruleText}\n`;
  }
  return text;
}

/**
 * Format example SQL patterns.
 * examples is an array of { text, sql?, score? } or plain strings.
 */
function formatExamples(examples) {
  if (!Array.isArray(examples) || examples.length === 0) return '';
  let text = '**EXAMPLE PATTERNS:**\n';
  for (const p of examples) {
    const exText = typeof p === 'string' ? p : p.text || p.pattern || JSON.stringify(p);
    text += `- ${exText}\n`;
  }
  return text;
}

/**
 * Format KPI definitions.
 * kpis is an array of { text, name?, formula?, score? } or plain strings.
 */
function formatKpis(kpis) {
  if (!Array.isArray(kpis) || kpis.length === 0) return '';
  let text = '**KPI DEFINITIONS:**\n';
  for (const k of kpis) {
    const kpiText = typeof k === 'string' ? k : k.text || k.definition || JSON.stringify(k);
    text += `- ${kpiText}\n`;
  }
  return text;
}

/**
 * Format distinct values for WHERE clause filter hints.
 * distinctValues is { tableName: ["Table.Col: val1, val2, ..."] }
 */
function formatDistinctValues(distinctValues) {
  if (!distinctValues || typeof distinctValues !== 'object') return '';
  const entries = Object.entries(distinctValues);
  if (entries.length === 0) return '';

  let text = '**VERIFIED FILTER VALUES (use these exact values in WHERE clauses):**\n';
  for (const [, lines] of entries) {
    for (const line of lines) {
      text += `- ${line}\n`;
    }
  }
  return text;
}

/**
 * Format mandatory filters from definitions.json.
 * filters is an array of { id, sql, appliesTo, always, note? }.
 */
function formatMandatoryFilters(filters) {
  if (!filters || filters.length === 0) return '';
  const lines = filters.map(f => {
    let line = `- ${f.sql}`;
    const tables = (f.appliesTo || []).join(', ');
    if (tables) line += `  [${tables}]`;
    if (f.note) {
      // Highlight join instructions so the LLM adds the required join
      if (f.note.startsWith('JOIN ')) {
        line += `\n  REQUIRED: ${f.note}`;
      } else {
        line += `  -- ${f.note}`;
      }
    }
    return line;
  });
  return `=== MANDATORY FILTERS ===\nApply ALL filters below that match tables in your query. If a filter requires a JOIN, you MUST add that join.\n\n${lines.join('\n')}`;
}

/**
 * Format detected entities — metrics, dimensions, filters, operations.
 */
function formatEntities(entities) {
  if (!entities) return '';
  let text = '=== DETECTED ENTITIES ===\nYou MUST incorporate ALL of these:\n';
  let hasContent = false;
  if (entities.metrics?.length > 0) { text += `  Metrics (MUST be in SELECT): ${entities.metrics.join(', ')}\n`; hasContent = true; }
  if (entities.dimensions?.length > 0) { text += `  Dimensions (MUST be in GROUP BY): ${entities.dimensions.join(', ')}\n`; hasContent = true; }
  if (entities.filters?.length > 0) { text += `  Filters (MUST be in WHERE/HAVING): ${entities.filters.join(', ')}\n`; hasContent = true; }
  if (entities.operations?.length > 0) { text += `  Operations (MUST be reflected): ${entities.operations.join(', ')}\n`; hasContent = true; }
  return hasContent ? text : '';
}

/**
 * Format multi-query context (sub-query index, purpose, prior results).
 */
function formatMultiQueryContext(state) {
  const plan = state.queryPlan || [];
  const qIdx = state.currentQueryIndex || 0;
  if (plan.length <= 1) return '';

  const current = plan[qIdx];
  let text = `\n=== MULTI-QUERY CONTEXT (Sub-query ${qIdx + 1}/${plan.length}) ===`;
  text += `\nYou are writing SQL for this specific sub-question: "${current.subQuestion}"`;
  text += `\nPurpose: ${current.purpose}`;
  text += '\nFocus ONLY on what this sub-question asks. The other sub-questions will be handled separately.';

  const completed = state.queries || [];
  if (completed.length > 0) {
    text += '\n\n=== PRIOR SUB-QUERY RESULTS ===';
    for (const q of completed) {
      text += `\n[${q.id}] "${q.subQuestion}"`;
      if (q.sql) text += `\n  SQL pattern: ${q.sql.substring(0, 200)}...`;
      if (q.execution?.success) {
        text += `\n  Result: ${q.execution.rowCount} rows`;
      }
    }
    text += '\nMaintain consistency with prior queries (same table aliases, join patterns) where applicable.';
  }

  return text;
}

// ---------------------------------------------------------------------------
// Main prompt builder
// ---------------------------------------------------------------------------

/**
 * Build the full system prompt for the generateSql LLM call.
 *
 * @param {object} params
 * @param {object} params.contextBundle — from contextFetch node
 * @param {string} params.matchType — 'exact'|'partial'|'followup'|'none'
 * @param {string} params.templateSql — gold-template SQL if available
 * @param {Array}  params.conversationHistory — prior turns
 * @param {object} params.entities — classified entities
 * @param {object} params.correctionGuidance — { priorSql, validationReport, errorType }
 * @param {string} params.priorSql — previous SQL attempt (on retry)
 * @param {object} params.validationReport — validation failure details
 * @param {object} params.state — full workflow state (for multi-query context)
 * @param {string} params.sessionId — for session memory lookups
 * @returns {string}
 */
function buildSystemPrompt(params) {
  const {
    contextBundle,
    matchType,
    templateSql,
    conversationHistory,
    entities,
    correctionGuidance,
    state,
    sessionId,
  } = params;

  const bundle = contextBundle || {};
  const isFollowUp = matchType === 'followup';
  const hasTemplate = !isFollowUp && !!templateSql;

  // ── 1. Role declaration ──
  let prompt = 'You are a precise T-SQL writer for Microsoft SQL Server.\n\n';

  // ── Route-specific intro ──
  if (isFollowUp && !correctionGuidance) {
    // Only show follow-up adaptation context on the FIRST attempt.
    // During correction retries, suppress this to avoid conflicting with correction instructions
    // (the LLM would re-derive from the original SQL instead of fixing the broken SQL).

    // Resolve prior question from conversation history
    let priorQuestion = '';
    const history = conversationHistory || [];
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'user') {
        priorQuestion = history[i].content;
        break;
      }
    }

    // Resolve prior entities from session memory
    const session = sessionId ? getSession(sessionId) : null;
    const lastQuery = session?.queryHistory?.slice(-1)[0];
    const priorEntities = lastQuery?.entities || null;

    prompt += `This is a FOLLOW-UP query — the user is modifying a prior question. Adapt the prior SQL with minimal changes.

=== FOLLOW-UP QUERY MODIFICATION ===
Original question: "${priorQuestion}"
Follow-up question: "${state?.question || ''}"

=== PRIOR SQL (adapt this) ===
${templateSql || '(no prior SQL available)'}
`;

    if (priorEntities) {
      prompt += '\n=== PRIOR DETECTED ENTITIES ===\n';
      if (priorEntities.metrics?.length > 0) prompt += `  Metrics: ${priorEntities.metrics.join(', ')}\n`;
      if (priorEntities.dimensions?.length > 0) prompt += `  Dimensions: ${priorEntities.dimensions.join(', ')}\n`;
      if (priorEntities.filters?.length > 0) prompt += `  Filters: ${priorEntities.filters.join(', ')}\n`;
      if (priorEntities.operations?.length > 0) prompt += `  Operations: ${priorEntities.operations.join(', ')}\n`;
    }
  } else if (isFollowUp && correctionGuidance) {
    // Correction retry for a follow-up query — provide context about the original question
    // but do NOT show the "adapt this" SQL (the correction section handles the SQL to fix).
    prompt += `This is a FOLLOW-UP query that failed on a previous attempt. Focus on FIXING the SQL error below, not re-adapting from scratch.\n`;
    prompt += `Original question context: "${state?.question || ''}"\n\n`;
  } else if (hasTemplate && !bundle.schema?.length) {
    // Template-only path (no research brief)
    prompt += `A related SQL template has been found for a similar question.

=== REFERENCE SQL TEMPLATE ===
${templateSql}

This template handles a related question. Use it as a REFERENCE for table selections, join patterns, and column names, but ADAPT the query to match the user's specific request. The user may want:
- Different grouping / dimensions (e.g., "per quarter" means GROUP BY quarter only, not per rep)
- Different filters or time ranges
- Different aggregation level (summary vs detail)
- A subset of the template's columns

Write SQL that answers the user's ACTUAL question, using the template's tables and joins as your guide.
`;
  } else {
    prompt += 'Your context team has gathered all schema and business context. Write the SQL query using ONLY the information provided below.\n\n';
  }

  // ── 1b. Mandatory filters (before schema so the LLM sees constraints first) ──
  const mandatoryFiltersBlock = formatMandatoryFilters(bundle.mandatoryFilters);
  if (mandatoryFiltersBlock) prompt += '\n\n' + mandatoryFiltersBlock;

  // ── 2. Schema section ──
  const schemaText = formatSchema(bundle.schema);
  if (schemaText) prompt += schemaText + '\n';

  // ── 3. Column metadata (CRITICAL) ──
  const colMetaText = formatColumnMetadata(bundle.columnMetadata);
  if (colMetaText) prompt += colMetaText + '\n';

  // ── 4. Join paths ──
  const joinText = formatJoinRules(bundle.joinRules, bundle.joinText);
  if (joinText) prompt += joinText + '\n';

  // ── 5. Business rules ──
  const rulesText = formatRules(bundle.rules);
  if (rulesText) prompt += rulesText + '\n';

  // ── 6. Example SQL patterns ──
  const examplesText = formatExamples(bundle.examples);
  if (examplesText) prompt += examplesText + '\n';

  // ── 7. KPI definitions ──
  const kpisText = formatKpis(bundle.kpis);
  if (kpisText) prompt += kpisText + '\n';

  // ── 8. Distinct values for WHERE filters ──
  const dvText = formatDistinctValues(bundle.distinctValues);
  if (dvText) prompt += dvText + '\n';

  // ── 9. Fiscal period ──
  if (bundle.fiscalPeriod) {
    const fp = bundle.fiscalPeriod;
    const desc = fp.FISCAL_YR_AND_QTR_DESC || fp.fiscalYrAndQtrDesc || JSON.stringify(fp);
    prompt += `**CURRENT FISCAL PERIOD:** ${desc}\n\n`;
  }

  // ── 10. Route-specific section ──
  if (isFollowUp && !correctionGuidance) {
    // Follow-up: conversation context already injected above.
    // Add adapt instructions (only on first attempt, not during correction retries).
    prompt += `
Adapt the prior SQL to answer the follow-up question.
Common modifications: changing filters/time ranges, adding/removing dimensions, adjusting aggregation level, adding TOP N.
Preserve the query structure (tables, joins, column names) and only change what the follow-up requires.
Use ONLY tables and columns from the prior SQL or the context above — do not invent names.
`;
  } else if (hasTemplate && bundle.schema?.length) {
    // Research path WITH a template — show it as adaptation reference
    prompt += `
=== REFERENCE SQL TEMPLATE (adapt this) ===
A verified SQL template exists for a closely related question. Use it as your starting point — preserve its table selections, join patterns, and column names. Adapt it to answer the user's specific question by applying the detected entities (filters, dimensions, etc.) listed below.

${templateSql}

IMPORTANT: Adapt this template rather than writing from scratch. Add WHERE clauses for any user-specified filters while keeping the template's structure intact.
`;
  }

  // ── 11. Detected entities ──
  const entitiesText = formatEntities(entities);
  if (entitiesText) prompt += '\n' + entitiesText + '\n';

  // ── 12. Multi-query context ──
  if (state) {
    const mqText = formatMultiQueryContext(state);
    if (mqText) prompt += mqText + '\n';
  }

  // ── 13. Correction section (only on retries) ──
  // correctionGuidance is a STRING from correctionAnalyzer.buildCorrectionGuidance()
  // The prior SQL, error type, and validation report come from state (passed via params.state)
  if (correctionGuidance) {
    const priorSql = state?.sql || '';
    const errType = state?.errorType || 'UNKNOWN';
    const valReport = state?.validationReport;

    prompt += '\n=== CORRECTION — FIX THE SQL BELOW ===\n';
    prompt += 'Your previous SQL attempt failed. You MUST fix the issues listed below.\n\n';

    if (priorSql) {
      prompt += `=== YOUR PREVIOUS SQL (this failed — fix it) ===\n${priorSql}\n\n`;
    }

    prompt += `Error type: ${errType}\n`;

    // Format validation issues from state
    if (valReport?.passes) {
      const issues = Object.values(valReport.passes)
        .flatMap((p) => p.issues)
        .filter(Boolean)
        .map((issue) => {
          if (typeof issue === 'string') return issue;
          const desc = issue.description || JSON.stringify(issue);
          return issue.suggested_fix ? `${desc} (Hint: ${issue.suggested_fix})` : desc;
        });
      if (issues.length > 0) {
        prompt += `\nValidation issues:\n${issues.map((i) => `- ${i}`).join('\n')}\n`;
      }
    }

    // Execution error (direct from state for EXECUTION_ERROR type)
    if (state?.execution?.error) {
      prompt += `\nExecution error: ${state.execution.error}\n`;
    }

    // Inject the error-specific guidance from correctionAnalyzer
    // (column suggestions, table suggestions, TRY_CAST hints, prior attempts)
    prompt += `\n=== ERROR-SPECIFIC GUIDANCE ===\n${correctionGuidance}\n`;

    prompt += '\nFix ALL the issues above. Do NOT repeat the same mistakes.\n';
  }

  // ── 14. Reflection feedback (from previous reflect node) ──
  if (state?.reflectionFeedback) {
    prompt += `\n=== FEEDBACK FROM PREVIOUS ATTEMPT ===\n${state.reflectionFeedback}\n`;
    prompt += 'Address ALL the issues listed above.\n';

    if (state.reflectionCorrectedSql) {
      prompt += `\n=== REFLECT-SUGGESTED SQL (use as starting point) ===\n${state.reflectionCorrectedSql}\n`;
      prompt += 'Use this as your starting point and improve if needed.\n';
    }
  }

  // ── 15. Conversation context (follow-up only — explicit via UI button) ──
  // Only inject prior conversation when the user explicitly clicked follow-up.
  // Otherwise each query is independent — no blending of prior context.
  if (isFollowUp) {
    const convContext = formatConversationContext(conversationHistory);
    if (convContext) {
      prompt += '\n' + convContext;
      if (!correctionGuidance) {
        prompt += 'Use the prior SQL as a reference for table selections, joins, and column names when adapting for the current question.\n';
      }
    }
  }

  // ── 16. Mandatory SQL rules ──
  prompt += `
MANDATORY SQL RULES:
- Do NOT use table or column names that appear only in EXAMPLE PATTERNS. Use only ALLOWED TABLES and EXACT COLUMN REFERENCE for this question.
- Use ONLY the tables listed in ALLOWED TABLES and ONLY the columns listed in EXACT COLUMN REFERENCE for each table. Any other table or column name does not exist and will cause execution failure.
- Use table aliases for every column reference (e.g., p.SEGMENT, not SEGMENT).
- Use NULLIF() for all division operations.
- Default to TOP 5000 unless the user specifies a different limit.
- Do NOT include SQL comments (-- or /* */).
- Do NOT use SUSER_SNAME(), FLM_LDAP, or any session-based user filtering. Row-level security (REGION_ID scoping to "my reps") is automatically injected by the system AFTER you submit SQL. You do not need to filter by the current user — just write the query for the data requested.
- Do NOT remove REGION_ID / FLM_ID security filters if they already exist in prior SQL being adapted.
- DIMENSION LABELS: When showing fiscal quarters/years, JOIN with vw_EBI_CALDATE and use FISCAL_YR_AND_QTR_DESC (format "YYYY-QN", e.g., "2026-Q2") instead of raw numeric IDs like QUOTA_FISCAL_QUARTER_ID. Always prefer human-readable labels over ID columns in SELECT output.
- CURRENT FISCAL PERIOD: If the context includes a CURRENT FISCAL PERIOD, use that fiscal year for any unqualified quarter references (e.g., "Q2" without a year). Do NOT assume or hardcode a year.

RESPONSE FORMAT:
Return your SQL inside a \`\`\`sql code fence, then explain your approach after a "REASONING:" marker.

Example:
\`\`\`sql
SELECT TOP 5000 ...
\`\`\`
REASONING: I chose table X because ... joined with Y on ... filtered by ...
`;

  return prompt;
}

// ---------------------------------------------------------------------------
// Response parser
// ---------------------------------------------------------------------------

/**
 * Parse the LLM response to extract SQL and reasoning.
 * @param {string} response — raw LLM text content
 * @returns {{ sql: string, reasoning: string }}
 */
function parseResponse(response) {
  if (!response || typeof response !== 'string') {
    return { sql: '', reasoning: '' };
  }

  let sql = '';
  let reasoning = '';

  // Primary: extract SQL from ```sql ... ``` code fence
  const fenceMatch = response.match(/```(?:sql)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1].trim()) {
    sql = fenceMatch[1].trim();
    // Extract reasoning after the fence
    const afterFence = response.substring(response.indexOf('```', fenceMatch.index + 3) + 3);
    const reasoningMatch = afterFence.match(/REASONING:\s*([\s\S]*)/i);
    if (reasoningMatch) {
      reasoning = reasoningMatch[1].trim();
    } else if (afterFence.trim()) {
      reasoning = afterFence.trim();
    }
  }

  // Also check for REASONING: marker elsewhere in the response
  if (!reasoning) {
    const globalReasoning = response.match(/REASONING:\s*([\s\S]*?)(?:```|$)/i);
    if (globalReasoning) {
      reasoning = globalReasoning[1].trim();
    }
  }

  // Fallback: look for bare WITH/SELECT statement if no fence found
  if (!sql) {
    const bareMatch = response.match(/\b(WITH\s+[\s\S]+|SELECT\s+[\s\S]+)/i);
    if (bareMatch) {
      sql = bareMatch[1].trim();
      // If the bare SQL is followed by REASONING:, split them
      const reasoningSplit = sql.match(/^([\s\S]+?)\s*REASONING:\s*([\s\S]*)$/i);
      if (reasoningSplit) {
        sql = reasoningSplit[1].trim();
        reasoning = reasoningSplit[2].trim();
      }
    }
  }

  // Strip any trailing semicolons from SQL (some models add them)
  sql = sql.replace(/;\s*$/, '').trim();

  return { sql, reasoning };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the current question, accounting for decomposed sub-queries.
 */
function getCurrentQuestion(state) {
  const plan = state.queryPlan || [];
  const idx = state.currentQueryIndex || 0;
  if (plan.length > 1 && plan[idx]?.subQuestion) {
    return plan[idx].subQuestion;
  }
  return state.question;
}

// ---------------------------------------------------------------------------
// Main node function
// ---------------------------------------------------------------------------

/**
 * generateSqlNode — LangGraph node that generates SQL via a single Opus call.
 *
 * @param {object} state — LangGraph workflow state
 * @returns {object} — state update: { sql, reasoning, correctionGuidance, trace }
 */
async function generateSqlNode(state) {
  const start = Date.now();

  const planItems = state.queryPlan || [];
  const qIdx = state.currentQueryIndex || 0;
  const multiLabel = planItems.length > 1 ? ` [${qIdx + 1}/${planItems.length}]` : '';
  const question = getCurrentQuestion(state);
  const isRetry = !!state.correctionGuidance;

  logger.stage('2', 'GenerateSql', `${isRetry ? 'retry' : 'generate'} SQL${multiLabel}`);

  // ── 1. Build system prompt ──
  const systemPrompt = buildSystemPrompt({
    contextBundle: state.contextBundle,
    matchType: state.matchType,
    templateSql: state.templateSql,
    conversationHistory: state.conversationHistory,
    entities: state.entities,
    correctionGuidance: state.correctionGuidance,
    state,
    sessionId: state.sessionId,
  });

  // ── 2. Get Opus model ──
  const model = getModel({
    temperature: 0,
    maxTokens: GENERATE_SQL_MAX_TOKENS,
    nodeKey: 'generateSql', // Not in FAST_NODE_KEYS or SONNET_NODE_KEYS → resolves to opus
    profile: state.nodeModelOverrides?.generateSql,
  });
  const llmMeta = getModelMeta(model);

  // ── 3. Invoke model ──
  const hasHistory = state.conversationHistory?.length > 0;
  const humanMsg = hasHistory
    ? `Given the conversation context in the system prompt, write SQL for this question:\n\n${question}`
    : `Generate T-SQL for the following request.\n\nRequest: ${question}`;

  const timeoutMs = state.complexity === 'COMPLEX'
    ? GENERATE_SQL_TIMEOUT_COMPLEX_MS
    : GENERATE_SQL_TIMEOUT_MS;

  let responseText = '';
  const llmStart = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await model.invoke(
        [
          new SystemMessage(systemPrompt),
          new HumanMessage(humanMsg),
        ],
        { signal: controller.signal },
      );

      // Extract text content from response
      const content = response.content;
      if (typeof content === 'string') {
        responseText = content;
      } else if (Array.isArray(content)) {
        responseText = content
          .map((part) => (part && typeof part.text === 'string' ? part.text : typeof part === 'string' ? part : ''))
          .join('');
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    const typed = isTimeout
      ? new AgentTimeoutError(`GenerateSql timed out after ${timeoutMs / 1000}s`, { node: 'generateSql', timeoutMs })
      : new LLMError(err.message, { node: 'generateSql', cause: err });
    logger.error(typed.name, { error: typed.message });

    return {
      sql: '',
      reasoning: `SQL generation error: ${typed.message}`,
      correctionGuidance: null,
      trace: [{
        node: 'generateSql',
        timestamp: start,
        duration: Date.now() - start,
        error: typed.message,
        errorType: typed.name,
        llm: llmMeta,
      }],
    };
  }

  const llmMs = Date.now() - llmStart;

  // ── 4. Parse response ──
  let { sql, reasoning } = parseResponse(responseText);

  // Partial match fallback: if no SQL produced, use template
  if (!sql && state.matchType === 'partial' && state.templateSql) {
    sql = state.templateSql.trim();
    reasoning = 'Used template SQL (LLM produced no output for this phrasing).';
    logger.info('GenerateSql: using template SQL fallback');
  }

  // ── 5. Post-validate SQL references ──
  if (sql && state.contextBundle?.schema) {
    const validation = validateSqlReferences(sql, state.contextBundle.schema);
    if (validation.sql !== sql) {
      logger.info('GenerateSql: SQL references auto-corrected', { warnings: validation.warnings });
      sql = validation.sql;
    }
  }

  const duration = Date.now() - start;
  logger.info(`GenerateSql done (${duration}ms, LLM ${llmMs}ms)`, {
    sql: sql ? `${sql.length}chars` : 'none',
    isRetry,
    matchType: state.matchType,
  });

  if (sql) {
    logger.info('SQL generated', {
      sql: sql.substring(0, 500),
      reasoning: reasoning?.substring(0, 200),
    });
  } else {
    logger.warn('GenerateSql: no SQL produced', {
      responseLength: responseText.length,
      hint: 'Check LLM response for missing code fence or bare SQL.',
    });
  }

  // ── 6. Return state update ──
  return {
    sql,
    reasoning,
    correctionGuidance: null, // Clear after use to prevent persisting to next iteration
    trace: [{
      node: 'generateSql',
      timestamp: start,
      duration,
      llmMs,
      decision: sql ? 'generated SQL' : 'no SQL produced',
      isRetry,
      llm: llmMeta,
    }],
  };
}

module.exports = { generateSqlNode, buildSystemPrompt, parseResponse };
