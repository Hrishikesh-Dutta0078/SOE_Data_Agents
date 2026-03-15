/**
 * SQL Writer Agent Node — Focused SQL generation.
 *
 * Receives the research brief from the Research Agent and writes
 * T-SQL using only the context provided. Calls submit_sql with
 * the final query. Syntax validation is handled by the downstream
 * validate node.
 */

const { createReactAgent } = require('@langchain/langgraph/prebuilt');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { getModel, getModelMeta } = require('../../config/llm');
const { SQL_AGENT_TIMEOUT_MS, SQL_AGENT_TIMEOUT_COMPLEX_MS } = require('../../config/constants');
const logger = require('../../utils/logger');
const { AgentTimeoutError, LLMError } = require('../../utils/errors');

const submitSql = require('../../tools/submitSql');
const { formatConversationContext } = require('../../utils/conversationContext');
const { getSession } = require('../../memory/sessionMemory');
const { getColumnMetadataForTable, getSchemaByTableNames, getAllTableNames } = require('../../vectordb/schemaFetcher');
const { extractTableNames } = require('../../validation/schemaValidator');

const CORE_TABLES = [
  'vw_TF_EBI_P2S',
  'vw_TF_EBI_QUOTA',
  'vw_td_ebi_region_rpt',
  'vw_EBI_CALDATE',
  'vw_ebi_sales_stage',
];

const SQL_WRITER_TOOLS = [submitSql];

function filterToolsByEnabled(allTools, enabledNames) {
  if (!enabledNames || !Array.isArray(enabledNames)) return allTools;
  if (enabledNames.length === 0) return [];
  const set = new Set(enabledNames.map((n) => String(n)));
  const filtered = allTools.filter((t) => set.has(t.name));
  return filtered.length > 0 ? filtered : allTools;
}

const EventEmitter = require('events');
const _writerToolEvents = new EventEmitter();

function stableStringify(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

/**
 * Build EXACT COLUMN REFERENCE block for all tables referenced in the given SQL.
 * Used for follow-up and template paths so the writer has a single source of truth.
 */
function buildExactColumnReferenceForSql(sql) {
  if (!sql || typeof sql !== 'string') return '';
  const tableNames = extractTableNames(sql);
  if (tableNames.length === 0) return '';
  const blocks = [];
  for (const t of tableNames) {
    const meta = getColumnMetadataForTable(t);
    if (meta) blocks.push(`-- ${t}:\n${meta}`);
  }
  if (blocks.length === 0) return '';
  return '\n\n=== EXACT COLUMN REFERENCE (use ONLY these column names per table — anything else will cause "Invalid column name") ===\n'
    + blocks.join('\n\n');
}

function buildFallbackSchemaBlock() {
  const allTables = getAllTableNames();
  const schemas = getSchemaByTableNames(allTables);

  let text = '=== RESEARCH BRIEF (auto-generated — no research brief was available) ===\n\n';

  text += '**ALLOWED TABLES (use ONLY these table names — any other table does not exist and will cause "Invalid object name"):**\n';
  for (const t of schemas) {
    text += `- ${t.table_name} — ${t.description || ''}\n`;
  }
  text += '\n';

  const coreMeta = CORE_TABLES
    .map((name) => {
      const meta = getColumnMetadataForTable(name);
      return meta ? `-- ${name}:\n${meta}` : null;
    })
    .filter(Boolean);

  if (coreMeta.length > 0) {
    text += '**EXACT COLUMN REFERENCE (use ONLY these column names per table — anything else will cause "Invalid column name"):**\n';
    text += coreMeta.join('\n\n') + '\n\n';
  }

  text += 'For tables not listed in EXACT COLUMN REFERENCE, use ONLY columns you can confirm from the ALLOWED TABLES list above. Do NOT guess or invent column names.\n';
  return text;
}

function formatResearchBrief(brief) {
  if (!brief) return buildFallbackSchemaBlock();

  const tablesWithMeta = (brief.tables || []).filter((t) => t.columnMetadata);
  const allowedNames = tablesWithMeta.map((t) => t.name);

  let text = '=== RESEARCH BRIEF ===\n\n';

  if (allowedNames.length > 0) {
    text += '**ALLOWED TABLES (use ONLY these table names — any other table does not exist and will cause "Invalid object name"):**\n';
    text += allowedNames.join(', ') + '\n\n';
  }

  if (brief.tables?.length > 0) {
    text += '**TABLES:**\n';
    for (const t of brief.tables) {
      if (!t.columnMetadata) continue;
      text += `- ${t.name}`;
      if (t.description) text += ` — ${t.description}`;
      text += '\n';
      if (t.relevantColumns?.length > 0) {
        text += `  Relevant columns: ${t.relevantColumns.join(', ')}\n`;
      }
    }
    text += '\n';
  }

  if (tablesWithMeta.length > 0) {
    text += '**EXACT COLUMN REFERENCE (use ONLY these column names per table — anything else will cause "Invalid column name"):**\n';
    for (const t of tablesWithMeta) {
      text += `\n-- ${t.name}:\n${t.columnMetadata}\n`;
    }
    text += '\n';
  }

  if (brief.joins?.length > 0) {
    text += '**JOIN PATHS:**\n';
    for (const j of brief.joins) {
      text += `- ${j.from} ${j.type || 'JOIN'} ${j.to}\n`;
    }
    text += '\n';
  }

  if (brief.businessRules?.length > 0) {
    text += '**BUSINESS RULES:**\n';
    for (const r of brief.businessRules) {
      text += `- ${r}\n`;
    }
    text += '\n';
  }

  if (brief.examplePatterns?.length > 0) {
    text += '**EXAMPLE PATTERNS:**\n';
    for (const p of brief.examplePatterns) {
      text += `- ${p}\n`;
    }
    text += '\n';
  }

  if (brief.filterValues?.length > 0) {
    text += '**VERIFIED FILTER VALUES:**\n';
    for (const f of brief.filterValues) {
      text += `- ${f.column}: ${f.values.join(', ')}\n`;
    }
    text += '\n';
  }

  if (brief.fiscalPeriod) {
    text += `**CURRENT FISCAL PERIOD:** ${brief.fiscalPeriod}\n\n`;
  }

  if (brief.reasoning) {
    text += `**RESEARCH SUMMARY:** ${brief.reasoning}\n`;
  }

  return text;
}

function buildFollowUpPriorContext(state) {
  const session = state.sessionId ? getSession(state.sessionId) : null;
  const lastQuery = session?.queryHistory?.slice(-1)[0];

  let priorQuestion = '';
  const history = state.conversationHistory || [];
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'user') {
      priorQuestion = history[i].content;
      break;
    }
  }

  const priorEntities = lastQuery?.entities || null;
  return { priorQuestion, priorEntities };
}

function buildWriterSystemPrompt(state) {
  const isFollowUp = state.matchType === 'followup';
  const hasTemplate = !isFollowUp && !!state.templateSql && !state.researchBrief;
  const briefText = formatResearchBrief(state.researchBrief);

  let prompt;

  if (isFollowUp) {
    const { priorQuestion, priorEntities } = buildFollowUpPriorContext(state);

    prompt = `You are a precise T-SQL writer for Microsoft SQL Server. This is a FOLLOW-UP query — the user is modifying a prior question. Adapt the prior SQL with minimal changes.

=== FOLLOW-UP QUERY MODIFICATION ===
Original question: "${priorQuestion}"
Follow-up question: "${state.question}"

=== PRIOR SQL (adapt this) ===
${state.templateSql}
`;

    if (priorEntities) {
      prompt += '\n=== PRIOR DETECTED ENTITIES ===\n';
      if (priorEntities.metrics?.length > 0) prompt += `  Metrics: ${priorEntities.metrics.join(', ')}\n`;
      if (priorEntities.dimensions?.length > 0) prompt += `  Dimensions: ${priorEntities.dimensions.join(', ')}\n`;
      if (priorEntities.filters?.length > 0) prompt += `  Filters: ${priorEntities.filters.join(', ')}\n`;
      if (priorEntities.operations?.length > 0) prompt += `  Operations: ${priorEntities.operations.join(', ')}\n`;
    }

    if (state.researchBrief) {
      prompt += `\n${briefText}\n`;
    }
    const priorSqlColumnRef = buildExactColumnReferenceForSql(state.templateSql);
    if (priorSqlColumnRef) {
      prompt += priorSqlColumnRef + '\n';
    }

    prompt += `
Adapt the prior SQL to answer the follow-up question.
Common modifications: changing filters/time ranges, adding/removing dimensions, adjusting aggregation level, adding TOP N.
Preserve the query structure (tables, joins, column names) and only change what the follow-up requires.
Use ONLY tables and columns from the prior SQL or research brief — do not invent names.

MANDATORY SQL RULES:
- Use table aliases for every column reference.
- Use NULLIF() for all division operations.
- Do NOT include SQL comments (-- or /* */).
- Do NOT use SUSER_SNAME(), FLM_LDAP, or any session-based user filtering. Row-level security is automatically injected after submission.
- DIMENSION LABELS: When showing fiscal quarters/years, JOIN with vw_EBI_CALDATE and use FISCAL_YR_AND_QTR_DESC (format "YYYY-QN", e.g., "2026-Q2") instead of raw numeric IDs like QUOTA_FISCAL_QUARTER_ID. Always prefer human-readable labels over ID columns in SELECT output.
- CURRENT FISCAL PERIOD: If the research brief includes a CURRENT FISCAL PERIOD, use that fiscal year for any unqualified quarter references (e.g., "Q2" without a year). Do NOT assume or hardcode a year.

Call submit_sql with the adapted SQL and reasoning explaining what you changed and why.`;
  } else if (hasTemplate) {
    const templateColumnRef = buildExactColumnReferenceForSql(state.templateSql);
    prompt = `You are a precise T-SQL writer for Microsoft SQL Server. A related SQL template has been found for a similar question.

=== REFERENCE SQL TEMPLATE ===
${state.templateSql}
${templateColumnRef}

This template handles a related question. Use it as a REFERENCE for table selections, join patterns, and column names, but ADAPT the query to match the user's specific request. The user may want:
- Different grouping / dimensions (e.g., "per quarter" means GROUP BY quarter only, not per rep)
- Different filters or time ranges
- Different aggregation level (summary vs detail)
- A subset of the template's columns

Write SQL that answers the user's ACTUAL question, using the template's tables and joins as your guide. Use ONLY the columns listed in the EXACT COLUMN REFERENCE above for each table — do not invent or guess column names.

MANDATORY SQL RULES:
- Use table aliases for every column reference.
- Use NULLIF() for all division operations.
- Do NOT include SQL comments (-- or /* */).
- Do NOT use SUSER_SNAME(), FLM_LDAP, or any session-based user filtering. Row-level security is automatically injected after submission.
- DIMENSION LABELS: When showing fiscal quarters/years, JOIN with vw_EBI_CALDATE and use FISCAL_YR_AND_QTR_DESC (format "YYYY-QN", e.g., "2026-Q2") instead of raw numeric IDs like QUOTA_FISCAL_QUARTER_ID. Always prefer human-readable labels over ID columns in SELECT output.
- CURRENT FISCAL PERIOD: If the research brief includes a CURRENT FISCAL PERIOD, use that fiscal year for any unqualified quarter references (e.g., "Q2" without a year). Do NOT assume or hardcode a year.

Call submit_sql with the final SQL and reasoning explaining how you adapted the template.`;
  } else {
    prompt = `You are a precise T-SQL writer for Microsoft SQL Server. Your research team has gathered context for you. Write the SQL query using ONLY the information provided.

${briefText}

MANDATORY SQL RULES:
- Do NOT use table or column names that appear only in EXAMPLE PATTERNS. Use only ALLOWED TABLES and EXACT COLUMN REFERENCE for this question.
- Use ONLY the tables listed in ALLOWED TABLES and ONLY the columns listed in EXACT COLUMN REFERENCE for each table. Any other table or column name does not exist and will cause execution failure.
- Use table aliases for every column reference (e.g., p.SEGMENT, not SEGMENT).
- Use NULLIF() for all division operations.
- Default to TOP 1000 unless the user specifies a different limit.
- Do NOT include SQL comments (-- or /* */).
- Do NOT use SUSER_SNAME(), FLM_LDAP, or any session-based user filtering. Row-level security (REGION_ID scoping to "my reps") is automatically injected by the system AFTER you submit SQL. You do not need to filter by the current user — just write the query for the data requested.
- DIMENSION LABELS: When showing fiscal quarters/years, JOIN with vw_EBI_CALDATE and use FISCAL_YR_AND_QTR_DESC (format "YYYY-QN", e.g., "2026-Q2") instead of raw numeric IDs like QUOTA_FISCAL_QUARTER_ID. Always prefer human-readable labels over ID columns in SELECT output.
- CURRENT FISCAL PERIOD: If the research brief includes a CURRENT FISCAL PERIOD, use that fiscal year for any unqualified quarter references (e.g., "Q2" without a year). Do NOT assume or hardcode a year.

WORKFLOW:
1. Analyze the research brief and plan your query approach
2. Write the SQL and call submit_sql with the final SQL and your reasoning

The system will validate syntax and semantics after submission. Focus on writing correct SQL the first time using the research brief.
Include chain-of-thought reasoning explaining your table selection, joins, filters, and aggregations.`;
  }

  const plan = state.queryPlan || [];
  const qIdx = state.currentQueryIndex || 0;
  if (plan.length > 1) {
    const current = plan[qIdx];
    prompt += `\n\n=== MULTI-QUERY CONTEXT (Sub-query ${qIdx + 1}/${plan.length}) ===`;
    prompt += `\nYou are writing SQL for this specific sub-question: "${current.subQuestion}"`;
    prompt += `\nPurpose: ${current.purpose}`;
    prompt += '\nFocus ONLY on what this sub-question asks. The other sub-questions will be handled separately.';

    const completed = state.queries || [];
    if (completed.length > 0) {
      prompt += '\n\n=== PRIOR SUB-QUERY RESULTS ===';
      for (const q of completed) {
        prompt += `\n[${q.id}] "${q.subQuestion}"`;
        if (q.sql) prompt += `\n  SQL pattern: ${q.sql.substring(0, 200)}...`;
        if (q.execution?.success) {
          prompt += `\n  Result: ${q.execution.rowCount} rows`;
        }
      }
      prompt += '\nMaintain consistency with prior queries (same table aliases, join patterns) where applicable.';
    }
  }

  if (state.entities) {
    const e = state.entities;
    prompt += '\n\n=== DETECTED ENTITIES ===\n';
    prompt += 'You MUST incorporate ALL of these:\n';
    if (e.metrics?.length > 0) prompt += `  Metrics (MUST be in SELECT): ${e.metrics.join(', ')}\n`;
    if (e.dimensions?.length > 0) prompt += `  Dimensions (MUST be in GROUP BY): ${e.dimensions.join(', ')}\n`;
    if (e.filters?.length > 0) prompt += `  Filters (MUST be in WHERE/HAVING): ${e.filters.join(', ')}\n`;
    if (e.operations?.length > 0) prompt += `  Operations (MUST be reflected): ${e.operations.join(', ')}\n`;
  }

  if (state.reflectionFeedback) {
    prompt += `\n\n=== FEEDBACK FROM PREVIOUS ATTEMPT ===\n${state.reflectionFeedback}\n`;
    prompt += 'Address ALL the issues listed above.\n';

    if (state.sql) {
      prompt += `\n=== YOUR PREVIOUS SQL (improve this) ===\n${state.sql}\n`;
      prompt += 'Fix the issues above in this SQL. Do NOT start from scratch.\n';
    }
    if (state.reflectionCorrectedSql) {
      prompt += `\n=== REFLECT-SUGGESTED SQL (use as starting point) ===\n${state.reflectionCorrectedSql}\n`;
      prompt += 'Use this as your starting point, improve if needed, then submit_sql.\n';
    }
  }

  const convContext = formatConversationContext(state.conversationHistory);
  if (convContext) {
    prompt += `\n\n${convContext}`;
    prompt += 'Use the prior SQL as a reference for table selections, joins, and column names when adapting for the current question.\n';
  }

  // Always require tool call so extraction reliably gets SQL (some models reply with text/code only)
  prompt += '\n\nIMPORTANT: You MUST call the submit_sql tool with your final SQL and reasoning. Do not respond with text only — always invoke the submit_sql tool.';

  return prompt;
}

/** Normalize message content to string (handles LangChain string or content_blocks array). */
function messageContentToString(msg) {
  if (!msg?.content) return '';
  const c = msg.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) {
    return c.map((part) => (part && typeof part.text === 'string' ? part.text : typeof part === 'string' ? part : '')).join('');
  }
  return '';
}

function parseSubmitSqlPayload(content) {
  if (!content) return { sql: '', reasoning: '' };
  if (typeof content === 'object') {
    return {
      sql: typeof content.sql === 'string' ? content.sql : '',
      reasoning: typeof content.reasoning === 'string' ? content.reasoning : '',
    };
  }
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      return {
        sql: typeof parsed.sql === 'string' ? parsed.sql : '',
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
      };
    } catch {
      const fenceMatch = content.match(/```(?:sql)?\s*([\s\S]*?)```/i);
      if (fenceMatch) {
        return { sql: fenceMatch[1].trim(), reasoning: content.replace(fenceMatch[0], '').trim() };
      }
      return { sql: content.trim(), reasoning: '' };
    }
  }
  return { sql: '', reasoning: '' };
}

function extractWriterOutput(result) {
  const toolCalls = [];
  const seen = new Set();
  let sql = '';
  let reasoning = '';
  const messages = result?.messages || [];

  for (const msg of messages) {
    if (msg.tool_calls?.length > 0) {
      for (const tc of msg.tool_calls) {
        const key = `${tc.id || ''}|${tc.name}|${stableStringify(tc.args || {})}`;
        if (seen.has(key)) continue;
        seen.add(key);
        toolCalls.push({ name: tc.name, args: tc.args });
        if (tc.name === 'submit_sql' && tc.args) {
          let args = tc.args;
          if (typeof args === 'string') {
            try {
              args = JSON.parse(args);
            } catch {
              args = {};
            }
          }
          const s = args?.sql;
          const r = args?.reasoning;
          if (typeof s === 'string' && s.trim()) {
            sql = s.trim();
            reasoning = typeof r === 'string' ? r : '';
          }
        }
      }
    }
    if (msg.name === 'submit_sql' && msg.content && !sql) {
      const parsed = parseSubmitSqlPayload(msg.content);
      sql = parsed.sql || '';
      reasoning = parsed.reasoning || '';
    }
  }

  if (!sql) {
    // Fallback: scan for ```sql ... ``` (some models return text + code block instead of tool call; stream may split across messages)
    const combinedText = messages.map((m) => messageContentToString(m)).filter(Boolean).join('\n');
    if (combinedText) {
      const fenceMatch = combinedText.match(/```(?:sql)?\s*([\s\S]*?)```/i);
      if (fenceMatch && fenceMatch[1].trim()) {
        sql = fenceMatch[1].trim();
        reasoning = combinedText.replace(fenceMatch[0], '').trim().substring(0, 2000);
      }
    }
  }

  return { sql, reasoning, toolCalls };
}

async function sqlWriterAgentNode(state) {
  const start = Date.now();

  const planItems = state.queryPlan || [];
  const qIdx = state.currentQueryIndex || 0;
  const multiLabel = planItems.length > 1 ? ` [${qIdx + 1}/${planItems.length}]` : '';
  logger.stage('2b', 'SqlWriter', `generate SQL from research${multiLabel}`);

  const model = getModel({
    temperature: 0,
    maxTokens: 4096,
    nodeKey: 'sqlWriterAgent',
    profile: 'haiku',
  });
  const llmMeta = getModelMeta(model);
  const systemPrompt = buildWriterSystemPrompt(state);

  const enabledNames = state.enabledTools?.sqlWriter;
  const toolsToUse = filterToolsByEnabled(SQL_WRITER_TOOLS, enabledNames);
  logger.info('SqlWriter agent tools', { enabledFilter: enabledNames ?? 'all', using: toolsToUse.map((t) => t.name) });
  const agent = createReactAgent({
    llm: model,
    tools: toolsToUse,
    stateModifier: new SystemMessage(systemPrompt),
  });

  let result;
  const timeoutMs = state.complexity === 'COMPLEX'
    ? SQL_AGENT_TIMEOUT_COMPLEX_MS
    : SQL_AGENT_TIMEOUT_MS;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const hasHistory = state.conversationHistory?.length > 0;
      const humanMsg = hasHistory
        ? `Given the conversation context in the system prompt, write SQL for this follow-up question:\n\n${state.question}`
        : `Generate T-SQL for the following request. You must call submit_sql with your SQL and reasoning.\n\nRequest: ${state.question}`;

      const input = { messages: [new HumanMessage(humanMsg)] };
      const opts = { recursionLimit: 10, signal: controller.signal };

      if (!hasHistory) {
        // Use invoke for first message so we get a single complete response with tool_calls
        // (stream updates can miss or mis-merge tool_calls for some phrasings)
        const finalState = await agent.invoke(input, opts);
        result = finalState;
      } else {
        const stream = await agent.stream(input, { ...opts, streamMode: 'updates' });
        let lastAgentState = null;
        const accumulatedMessages = [];
        let toolCallCount = 0;
        let submittedSql = false;
        const seenToolCallKeys = new Set();
        const seenToolResultKeys = new Set();

        for await (const chunk of stream) {
          lastAgentState = chunk;
          const msgs = chunk.messages || [];
          accumulatedMessages.push(...msgs);

          for (const msg of msgs) {
            if (msg.tool_calls?.length > 0) {
              for (const tc of msg.tool_calls) {
                const dedupKey = tc.id ? `id:${tc.id}` : `${tc.name}|${stableStringify(tc.args || {})}`;
                if (seenToolCallKeys.has(dedupKey)) continue;
                seenToolCallKeys.add(dedupKey);
                toolCallCount++;
                _writerToolEvents.emit('tool_call', {
                  name: tc.name,
                  index: toolCallCount,
                  phase: 'sql_generation',
                  sessionId: state.sessionId || '',
                });
              }
            }
            if (msg.name && msg.content) {
              const resultKey = msg.tool_call_id
                ? `${msg.name}|${msg.tool_call_id}`
                : `${msg.name}|${typeof msg.content === 'string' ? msg.content.substring(0, 240) : ''}`;
              if (seenToolResultKeys.has(resultKey)) continue;
              seenToolResultKeys.add(resultKey);
              _writerToolEvents.emit('tool_result', {
                name: msg.name,
                index: toolCallCount,
                phase: 'sql_generation',
                sessionId: state.sessionId || '',
              });
              if (msg.name === 'submit_sql') {
                submittedSql = true;
              }
            }
          }

          if (submittedSql) break;
        }

        result = accumulatedMessages.length > 0
          ? { ...lastAgentState, messages: accumulatedMessages }
          : lastAgentState;
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    const typed = isTimeout
      ? new AgentTimeoutError(`SQL writer timed out after ${timeoutMs / 1000}s`, { node: 'sqlWriterAgent', timeoutMs, agent: 'sqlWriter' })
      : new LLMError(err.message, { node: 'sqlWriterAgent', cause: err });
    logger.error(typed.name, { error: typed.message });
    return {
      sql: '',
      reasoning: `SQL writer error: ${typed.message}`,
      agentToolCalls: [],
      trace: [{ node: 'sqlWriterAgent', timestamp: start, duration: Date.now() - start, error: typed.message, errorType: typed.name }],
    };
  }

  const extracted = extractWriterOutput(result);
  let sql = extracted.sql;
  let reasoning = extracted.reasoning;
  const toolCalls = extracted.toolCalls;

  // Partial match fallback: if writer produced no SQL, use template so exact-style questions still get a result
  if (!sql && state.matchType === 'partial' && state.templateSql) {
    sql = state.templateSql.trim();
    reasoning = 'Used template SQL (writer produced no output for this phrasing).';
    logger.info('SqlWriter: using template SQL fallback (writer produced no SQL)');
  }

  const duration = Date.now() - start;

  logger.info(`SqlWriter done (${duration}ms)`, { sql: `${sql.length}chars`, tools: toolCalls.length });

  if (sql) {
    logger.info('SQL generated', {
      sql: sql.substring(0, 500),
      reasoning: reasoning?.substring(0, 200),
    });
  } else {
    const msgCount = result?.messages?.length ?? 0;
    logger.warn('SqlWriter: no SQL produced', {
      messageCount: msgCount,
      toolCallsFromStream: toolCalls.map((t) => t.name),
      hint: 'Check if model called submit_sql; extraction uses accumulated stream messages, tool_calls, and code blocks.',
    });
  }

  return {
    sql,
    reasoning,
    agentToolCalls: [...(state.researchToolCalls || []), ...toolCalls],
    trace: [{
      node: 'sqlWriterAgent',
      timestamp: start,
      duration,
      toolCallCount: toolCalls.length,
      decision: sql ? 'submitted SQL' : 'no SQL produced',
      llm: llmMeta,
    }],
  };
}

module.exports = { sqlWriterAgentNode, writerToolEvents: _writerToolEvents };
