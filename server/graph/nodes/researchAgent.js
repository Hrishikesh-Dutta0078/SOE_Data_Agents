/**
 * Research Agent Node — Autonomous context gathering.
 *
 * A ReAct agent with research-focused tools that discovers relevant tables,
 * business rules, join paths, filter values, and example patterns.
 * Ends by calling submit_research with a structured brief.
 */

const { createReactAgent } = require('@langchain/langgraph/prebuilt');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { DynamicStructuredTool } = require('@langchain/core/tools');
const { getModel, getModelMeta } = require('../../config/llm');
const { SQL_AGENT_TIMEOUT_MS, SQL_AGENT_TIMEOUT_COMPLEX_MS } = require('../../config/constants');
const logger = require('../../utils/logger');
const { AgentTimeoutError, ResearchError } = require('../../utils/errors');

const discoverContext = require('../../tools/discoverContext');
const queryDistinctValues = require('../../tools/queryDistinctValues');
const inspectTableColumns = require('../../tools/inspectTableColumns');
const checkNullRatio = require('../../tools/checkNullRatio');
const searchSessionMemoryMod = require('../../tools/searchSessionMemory');
const submitResearch = require('../../tools/submitResearch');
const { enrichBriefWithSchema } = require('../../tools/submitResearch');
const finishDiscovery = require('../../tools/finishDiscovery');
const { formatConversationContext } = require('../../utils/conversationContext');
const { z } = require('zod');

const RESEARCH_TOOLS = [
  discoverContext,
  queryDistinctValues,
  inspectTableColumns,
  checkNullRatio,
  searchSessionMemoryMod.tool || searchSessionMemoryMod,
  submitResearch,
];

/** Phase 1 (Fast mode): discovery tools only + finish_discovery. No submit_research. */
const DISCOVERY_TOOLS = [
  discoverContext,
  queryDistinctValues,
  inspectTableColumns,
  checkNullRatio,
  searchSessionMemoryMod.tool || searchSessionMemoryMod,
  finishDiscovery,
];

const RESEARCH_TOOL_NAMES = RESEARCH_TOOLS.map((t) => t.name);

const ResearchBriefSchema = z.object({
  tables: z.array(z.object({
    name: z.string(),
    relevantColumns: z.array(z.string()),
    description: z.string().nullable(),
  })),
  joins: z.array(z.object({
    from: z.string(),
    to: z.string(),
    type: z.string().nullable(),
  })),
  businessRules: z.array(z.string()),
  examplePatterns: z.array(z.string()),
  filterValues: z.array(z.object({
    column: z.string(),
    values: z.array(z.string()),
  })),
  fiscalPeriod: z.string().nullable(),
  reasoning: z.string(),
});

const EventEmitter = require('events');
const _researchToolEvents = new EventEmitter();

/** Prefetched discover_context results for later sub-queries; key: `${sessionId}:${queryIndex}` */
const prefetchedDiscoverContext = new Map();
/** Pending prefetch promises so we can wait up to PREFETCH_WAIT_MS before falling back to real tool; key: `${sessionId}:${queryIndex}` */
const prefetchPendingByKey = new Map();
const PREFETCH_WAIT_MS = 2000;
const PREFETCH_TIMEOUT = Symbol('PREFETCH_TIMEOUT');
function sleep(ms) {
  return new Promise((resolve) => setTimeout(() => resolve(PREFETCH_TIMEOUT), ms));
}

function stableStringify(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function summarizeToolResult(name, result) {
  if (!result || typeof result !== 'string') return '';
  try {
    const parsed = JSON.parse(result);
    if (name === 'discover_context') {
      const tables = parsed.tables?.length || 0;
      const rules = parsed.businessRules?.length || 0;
      const joins = parsed.joins?.length || 0;
      return `${tables} tables, ${rules} rules, ${joins} joins`;
    }
    if (name === 'query_distinct_values') {
      const total = Object.values(parsed).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0);
      return `${total} distinct values`;
    }
    if (name === 'inspect_table_columns') {
      const tableCount = Object.keys(parsed).length;
      return `${tableCount} table(s) inspected`;
    }
  } catch { /* not JSON */ }
  return `${result.length} chars`;
}

/**
 * Build a structured research brief by parsing the text output from discover_context.
 * Used as a fallback when the ReAct agent exhausts its recursion limit without
 * calling submit_research (common when discover_context returns very large payloads).
 */
function buildFallbackBriefFromDiscoverContext(discoverText) {
  if (!discoverText || discoverText.length < 200) return null;

  const brief = {
    tables: [],
    joins: [],
    businessRules: [],
    examplePatterns: [],
    filterValues: [],
    fiscalPeriod: null,
    reasoning: 'Auto-generated fallback brief from discover_context (research agent did not call submit_research).',
  };

  const tablesSection = discoverText.match(/=== TABLES ===([\s\S]*?)(?=\n===)/);
  if (tablesSection) {
    const tableRegex = /\*\*([^*]+)\*\*/g;
    let m;
    while ((m = tableRegex.exec(tablesSection[1])) !== null) {
      const name = m[1].trim();
      const afterName = tablesSection[1].substring(m.index + m[0].length, m.index + m[0].length + 500);
      const descMatch = afterName.match(/Description:\s*(.+)/);
      brief.tables.push({
        name,
        relevantColumns: [],
        description: descMatch ? descMatch[1].trim().substring(0, 200) : null,
      });
    }
  }

  if (brief.tables.length === 0) return null;

  const colSection = discoverText.match(/=== COLUMN DETAILS[\s\S]*?===([\s\S]*?)(?=\n===|$)/);
  if (colSection) {
    const colBlocks = colSection[1].split(/\n\*\*/).filter((b) => b.trim());
    for (const block of colBlocks) {
      const nameEnd = block.indexOf('**');
      if (nameEnd < 0) continue;
      const tableName = block.substring(0, nameEnd).trim();
      const lines = block.substring(nameEnd + 2).trim().split('\n');
      const cols = [];
      for (const line of lines) {
        const colName = line.trim().split(/\s/)[0];
        if (colName && /^[A-Z_][A-Z0-9_]*$/i.test(colName)) {
          cols.push(colName);
        }
      }
      const existing = brief.tables.find(
        (t) => t.name.toLowerCase() === tableName.toLowerCase()
      );
      if (existing && cols.length > 0) {
        existing.relevantColumns = cols;
      }
    }
  }

  const rulesSection = discoverText.match(/=== BUSINESS RULES ===([\s\S]*?)(?=\n===|$)/);
  if (rulesSection) {
    const lines = rulesSection[1].split('\n').filter((l) => l.trim().startsWith('-'));
    for (const line of lines) {
      brief.businessRules.push(line.trim().replace(/^-\s*/, ''));
    }
  }

  const exSection = discoverText.match(/=== EXAMPLE SQL PATTERNS ===([\s\S]*?)(?=\n===|$)/);
  if (exSection) {
    const text = exSection[1].trim();
    if (text && !text.startsWith('No matching')) {
      const patterns = text.split(/\nQ: /).filter((p) => p.trim());
      for (const p of patterns) {
        const cleaned = p.startsWith('"') ? `Q: ${p.trim()}` : p.trim();
        brief.examplePatterns.push(cleaned.substring(0, 500));
      }
    }
  }

  const joinSection = discoverText.match(/=== VALID JOINS ===([\s\S]*?)(?=\n===|$)/);
  if (joinSection) {
    const joinLineRegex = /(\S+)\s*(?:↔|↔|joins to)\s*(\S+)/g;
    let jm;
    while ((jm = joinLineRegex.exec(joinSection[1])) !== null) {
      brief.joins.push({ from: jm[1], to: jm[2], type: null });
    }
  }

  const fiscalSection = discoverText.match(/=== CURRENT FISCAL PERIOD ===([\s\S]*?)(?=\n===|$)/);
  if (fiscalSection) {
    const qtrMatch = fiscalSection[1].match(/Fiscal Quarter:\s*(.+)/);
    if (qtrMatch) brief.fiscalPeriod = qtrMatch[1].trim();
  }

  return enrichBriefWithSchema(brief);
}

function filterToolsByEnabled(allTools, enabledNames) {
  // No filter specified: use all tools (backward compatible).
  if (!enabledNames || !Array.isArray(enabledNames)) return allTools;
  // Explicit empty list: user disabled all tools for this agent.
  if (enabledNames.length === 0) return [];
  const set = new Set(enabledNames.map((n) => String(n)));
  const filtered = allTools.filter((t) => set.has(t.name));
  return filtered.length > 0 ? filtered : allTools;
}

function createMemoizedTools(cacheStats, toolTimings, enabledToolNames, sessionId, currentQueryIndex, opts = {}) {
  const baseTools = opts.toolsOverride || RESEARCH_TOOLS;
  const phase1Mode = opts.phase1Mode || false;
  let toolsToUse = filterToolsByEnabled(baseTools, enabledToolNames);
  if (phase1Mode && !toolsToUse.some((t) => t.name === 'finish_discovery')) {
    toolsToUse = [...toolsToUse, finishDiscovery];
  }
  const toolCache = new Map();
  let discoverContextAlreadyRun = false;
  return toolsToUse.map((tool) => new DynamicStructuredTool({
    name: tool.name,
    description: tool.description,
    schema: tool.schema,
    func: async (args) => {
      // Prefetch hit or wait: use discover_context result from background prefetch for this sub-query
      if (tool.name === 'discover_context' && sessionId != null && currentQueryIndex != null) {
        const prefetchKey = `${sessionId}:${currentQueryIndex}`;
        if (prefetchedDiscoverContext.has(prefetchKey)) {
          const result = prefetchedDiscoverContext.get(prefetchKey);
          prefetchedDiscoverContext.delete(prefetchKey);
          discoverContextAlreadyRun = true; // prevent second call from running real tool
          logger.info(`  [Tool] ${tool.name}() -> prefetch hit (${result?.length ?? 0} chars)`);
          _researchToolEvents.emit('discover_context_prefetch_used', { sessionId, queryIndex: currentQueryIndex });
          return result;
        }
        // Optional enhancement: wait up to PREFETCH_WAIT_MS for in-flight prefetch before running real tool
        const pending = prefetchPendingByKey.get(prefetchKey);
        if (pending) {
          const result = await Promise.race([
            pending.catch(() => PREFETCH_TIMEOUT),
            sleep(PREFETCH_WAIT_MS),
          ]);
          prefetchPendingByKey.delete(prefetchKey);
          if (result !== PREFETCH_TIMEOUT && typeof result === 'string') {
            discoverContextAlreadyRun = true; // prevent second call from running real tool
            logger.info(`  [Tool] ${tool.name}() -> prefetch hit after wait (${result.length} chars)`);
            _researchToolEvents.emit('discover_context_prefetch_used', { sessionId, queryIndex: currentQueryIndex });
            return result;
          }
        }
      }
      // Enforce single discover_context per research attempt to avoid 3x payload and stuck agent
      if (tool.name === 'discover_context') {
        if (discoverContextAlreadyRun) {
          logger.info(`  [Tool] ${tool.name}() -> skipped (already run once this research step)`);
          return phase1Mode
            ? 'Context was already discovered in this step. Use that result and proceed to finish_discovery. Do not call discover_context again.'
            : 'Context was already discovered in this step. Use that result and proceed to submit_research with your findings. Do not call discover_context again.';
        }
        discoverContextAlreadyRun = true;
      }
      const cacheKey = `${tool.name}|${stableStringify(args || {})}`;
      if (toolCache.has(cacheKey)) {
        cacheStats.hits += 1;
        logger.info(`  [Tool] ${tool.name}() -> cache hit`);
        return toolCache.get(cacheKey);
      }
      cacheStats.misses += 1;
      const argsPreview = JSON.stringify(args || {}).substring(0, 100);
      logger.info(`  [Tool] ${tool.name}(${argsPreview})...`);
      const t0 = Date.now();
      const result = await tool.func(args);
      const ms = Date.now() - t0;
      toolTimings.push({ name: tool.name, ms });
      const summary = summarizeToolResult(tool.name, result);
      logger.info(`  [Tool] ${tool.name}() -> ${summary} (${ms}ms)`);
      toolCache.set(cacheKey, result);
      return result;
    },
  }));
}

function buildResearchSystemPrompt(state) {
  let prompt = `You are a research specialist for a T-SQL Text-to-SQL system working with a sales pipeline / revenue analytics database (EBI data model).

YOUR GOAL: Gather all the context needed to write accurate SQL. Do NOT write SQL yourself — your job is research only.

RESEARCH WORKFLOW:
1. Call discover_context exactly ONCE with the user's question and detected entities. This returns tables, example SQL patterns, business rules, join rules, column details (top 5 tables), and the current fiscal period — all in one call. Do NOT call discover_context multiple times with different query phrasings; one call is enough.
2. Review the discover_context results:
   a. If the question involves filter values (e.g. specific stage names, segment values), call query_distinct_values with all the table/column pairs you need to verify in a single batched call.
   b. If you need column details for a table that discover_context did NOT include in its COLUMN DETAILS section, call inspect_table_columns with those specific table names. This is critical for avoiding "Invalid column name" errors — verify exact column names before recommending them.
3. Call submit_research with your complete findings.

EFFICIENCY: Call discover_context (once only) and search_session_memory in parallel in your first step if needed. Then call query_distinct_values / inspect_table_columns / submit_research together if possible.

WHEN DONE: Call submit_research with your complete findings including:
- All relevant tables and their key columns
- Join relationships between tables
- Business rules that apply
- Example SQL patterns to follow
- Verified filter values
- Your recommendation for the SQL approach

IMPORTANT: Do NOT recommend using SUSER_SNAME(), FLM_LDAP, or any session-based user scoping. The system automatically injects Row-Level Security (REGION_ID filters) after SQL is generated. Queries about "my reps" or "my team" are handled by this automatic RLS injection — do NOT add user-identity filters in your research brief.

DIMENSION LABELS: When the question involves fiscal quarters, years, or time periods, ALWAYS include the calendar dimension table (vw_EBI_CALDATE) in your research brief. The SQL must show human-readable labels (e.g., FISCAL_YR_AND_QTR_DESC in format "YYYY-QN") instead of numeric IDs (e.g., QUOTA_FISCAL_QUARTER_ID). This is critical for output readability.

CURRENT FISCAL PERIOD: discover_context returns the CURRENT FISCAL PERIOD from the database. When the user mentions a quarter without specifying a year (e.g., "Q2", "this quarter", "current quarter"), you MUST use the fiscal year from the CURRENT FISCAL PERIOD section — do NOT assume or guess the year. Include the current fiscal period in your submit_research call so the SQL writer knows the correct year.

Be thorough but efficient. Focus on what's needed for the question.`;

  const plan = state.queryPlan || [];
  const idx = state.currentQueryIndex || 0;
  if (plan.length > 1) {
    const current = plan[idx];
    prompt += `\n\n=== MULTI-QUERY CONTEXT (Sub-query ${idx + 1}/${plan.length}) ===`;
    prompt += `\nYou are researching for this specific sub-question: "${current.subQuestion}"`;
    prompt += `\nPurpose: ${current.purpose}`;
    prompt += '\nFocus your research ONLY on what is needed for this sub-question, not the full original question.';

    const completed = state.queries || [];
    if (completed.length > 0) {
      prompt += '\n\n=== RESULTS FROM PRIOR SUB-QUERIES ===';
      for (const q of completed) {
        prompt += `\n[${q.id}] "${q.subQuestion}"`;
        if (q.execution?.success) {
          const cols = (q.execution.columns || []).join(', ');
          prompt += `\n  Result: ${q.execution.rowCount} rows — columns: ${cols}`;
        } else {
          prompt += '\n  Result: failed or empty';
        }
      }
      prompt += '\nUse this context to avoid redundant research and to ensure consistency with prior queries.';
    }
  }

  const convContext = formatConversationContext(state.conversationHistory);
  if (convContext) {
    prompt += `\n\n${convContext}`;
  }

  if (state.entities) {
    const e = state.entities;
    prompt += '\n\n=== DETECTED ENTITIES (from intent classification) ===\n';
    prompt += 'Your research MUST cover all of these. Pass them to discover_context in the entities parameter to boost search accuracy:\n';
    if (e.metrics?.length > 0) prompt += `  Metrics: ${e.metrics.join(', ')}\n`;
    if (e.dimensions?.length > 0) prompt += `  Dimensions: ${e.dimensions.join(', ')}\n`;
    if (e.filters?.length > 0) prompt += `  Filters: ${e.filters.join(', ')}\n`;
    if (e.operations?.length > 0) prompt += `  Operations: ${e.operations.join(', ')}\n`;
  }

  const categoryStrategies = {
    WHAT_HAPPENED: `\n\n=== RESEARCH STRATEGY (WHAT_HAPPENED) ===
This is a factual/state question. Focus your research on:
- Current-state tables and latest snapshot data (SNAPSHOT_DATE_ID = max).
- Standard aggregations: SUM, COUNT(DISTINCT OPP_ID), GROUP BY dimensions.
- Find the right GROUP BY dimensions matching the user's request (region, segment, product, stage, source).
- Time filters: identify the correct fiscal quarter/year and QTR_BKT_IND values.
- For coverage/creation questions: ensure you find both pipeline and quota tables with correct join keys.
- For deal list questions: identify the right sort/filter columns (ARR, stage, push count).`,

    WHY: `\n\n=== RESEARCH STRATEGY (WHY — Diagnosis) ===
This is a diagnostic/root-cause question. Focus your research on:
- Comparison data: historical benchmarks (last 4 quarters average, YoY), week-in-quarter comparisons.
- Breakdown dimensions: creation vs progression vs attrition, by segment/region/product.
- Correlation tables: stall reasons, push reasons, BANT qualification fields, mutual plan indicators.
- Deal Sensei Score data: DS Score columns, risk factors, next best action fields.
- Concentration metrics: deal count distribution, top-N deal contribution to total.
- Look for columns related to WALK_CATEGORY, SALES_STAGE progression, OPP_FOCUS_TIER.
- Call discover_context with broader entity scope to capture diagnostic dimensions.`,

    WHAT_TO_DO: `\n\n=== RESEARCH STRATEGY (WHAT_TO_DO — Actions) ===
This is an action-oriented question. Focus your research on:
- Progression candidate criteria: stage (SS3 -> SS4), missing prerequisites (mutual plan, BANT, access to power).
- Account prioritization signals: whitespace/install base, recent engagement (AES), partner attach, propensity scores (ICP, UCP).
- Deal Sensei Score thresholds: DS Score >= 65 for high-priority, < 40 for cleanup candidates.
- Momentum indicators: stage velocity, push count, days-in-stage.
- Actionable segmentation: group by stall reason, by intervention type, by account tier.
- For creation plays: source types (Sales/BDR/Partner), creation targets, coverage gaps by segment.`,
  };

  const strategy = categoryStrategies[state.questionCategory];
  if (strategy) {
    prompt += strategy;
  }

  if (state.reflectionFeedback) {
    prompt += `\n\n=== FEEDBACK FROM PREVIOUS ATTEMPT ===\n${state.reflectionFeedback}\n`;
    prompt += 'Focus your research on addressing these issues.\n';
  }

  if (state.validationReport && !state.validationReport.overall_valid) {
    prompt += '\n\n=== VALIDATION ERRORS FROM PREVIOUS ATTEMPT ===\n';
    const passes = state.validationReport.passes || {};
    for (const [passName, passResult] of Object.entries(passes)) {
      if (!passResult.passed && passResult.issues?.length > 0) {
        for (const issue of passResult.issues) {
          prompt += `- [${passName}] ${issue.description}\n`;
        }
      }
    }
    prompt += 'Research the correct schema/values to fix these issues.\n';
  }

  return prompt;
}

/** Phase 1 prompt for Fast mode: discovery only, end with finish_discovery (no submit_research). */
function buildResearchSystemPromptPhase1(state) {
  const base = buildResearchSystemPrompt(state);
  return base
    .replace(/submit_research/g, 'finish_discovery')
    .replace(/Call finish_discovery with your complete findings/, 'Call finish_discovery when you have gathered enough context')
    .replace(/EFFICIENCY:.*?submit_research.*?\./s, 'EFFICIENCY: Call discover_context (once only) and search_session_memory in parallel in your first step if needed. Then call query_distinct_values / inspect_table_columns / finish_discovery together if possible.')
    .replace(/WHEN DONE: Call finish_discovery when you have gathered enough context including:/, 'WHEN DONE: Call finish_discovery when you have gathered enough context. Before calling it, ensure you have:')
    .replace(/Include the current fiscal period in your finish_discovery call/, 'Include the current fiscal period in your findings so the next phase can use it');
}

function formatPhase1MessagesForPrompt(messages) {
  const parts = [];
  for (const msg of messages || []) {
    const type = msg.constructor?.name || msg._getType?.() || 'Message';
    if (type === 'HumanMessage' || msg.role === 'human') {
      parts.push(`[USER]\n${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}\n`);
    } else if (type === 'AIMessage' || msg.role === 'assistant') {
      let text = typeof msg.content === 'string' ? msg.content : '';
      if (msg.tool_calls?.length > 0) {
        text += '\n' + msg.tool_calls.map((tc) => `Tool call: ${tc.name}(${JSON.stringify(tc.args || {})})`).join('\n');
      }
      if (text.trim()) parts.push(`[ASSISTANT]\n${text}\n`);
    } else if (type === 'ToolMessage' || msg.role === 'tool') {
      const content = typeof msg.content === 'string' ? msg.content : String(msg.content);
      const truncated = content.length > 8000 ? content.substring(0, 8000) + '\n...[truncated]' : content;
      parts.push(`[TOOL RESULT: ${msg.name || 'tool'}]\n${truncated}\n`);
    }
  }
  return parts.join('\n');
}

function parseResearchBrief(result) {
  const messages = result.messages || [];

  for (const msg of messages) {
    if (msg.name === 'submit_research' && msg.content) {
      const content = msg.content;
      if (typeof content === 'object') return content;
      if (typeof content === 'string') {
        try { return JSON.parse(content); } catch { /* fall through */ }
      }
    }
  }

  return null;
}

function extractToolCalls(result) {
  const toolCalls = [];
  const seen = new Set();
  const messages = result.messages || [];

  for (const msg of messages) {
    if (msg.tool_calls?.length > 0) {
      for (const tc of msg.tool_calls) {
        const key = `${tc.id || ''}|${tc.name}|${stableStringify(tc.args || {})}`;
        if (seen.has(key)) continue;
        seen.add(key);
        toolCalls.push({ name: tc.name, args: tc.args });
      }
    }
  }

  return toolCalls;
}

function phase1CalledFinishDiscovery(result) {
  const toolCalls = extractToolCalls(result);
  return toolCalls.some((tc) => tc.name === 'finish_discovery');
}

async function researchAgentNode(state) {
  const start = Date.now();
  const attempts = { ...state.attempts, agent: (state.attempts?.agent || 0) + 1 };

  const plan = state.queryPlan || [];
  const qIdx = state.currentQueryIndex || 0;
  const multiLabel = plan.length > 1 ? ` [${qIdx + 1}/${plan.length}]` : '';
  logger.stage('2a', 'Research', `attempt ${attempts.agent}${multiLabel}`);

  // Fire-and-forget prefetch discover_context for later sub-queries while this one runs
  if (qIdx === 0 && plan.length > 1 && state.sessionId) {
    const sessionId = state.sessionId;
    const entities = state.entities || null;
    const total = plan.length - 1;
    const prefetchPromises = [];
    _researchToolEvents.emit('prefetch_start', { sessionId, total });
    for (let i = 1; i < plan.length; i++) {
      const key = `${sessionId}:${i}`;
      const subQuestion = plan[i]?.subQuestion || '';
      const promise = discoverContext.func({ query: subQuestion, entities })
        .then((result) => {
          prefetchedDiscoverContext.set(key, result);
          _researchToolEvents.emit('prefetch_complete', { sessionId, index: i, total });
          return result;
        })
        .catch((err) => {
          logger.warn('Prefetch discover_context failed', { index: i, err: err?.message || String(err) });
          _researchToolEvents.emit('prefetch_complete', { sessionId, index: i, total });
          throw err;
        });
      prefetchPendingByKey.set(key, promise);
      prefetchPromises.push(promise);
    }
    Promise.allSettled(prefetchPromises).then(() => {
      _researchToolEvents.emit('prefetch_all_complete', { sessionId, total });
    });
  }

  const useFastModel = state.useFastModel === true;
  const cacheStats = { hits: 0, misses: 0 };
  const toolTimings = [];
  const enabledNames = state.enabledTools?.research;
  const timeoutMs = state.complexity === 'COMPLEX'
    ? SQL_AGENT_TIMEOUT_COMPLEX_MS
    : SQL_AGENT_TIMEOUT_MS;

  let result;
  let discoverContextContent = null;
  let llmMeta;

  try {
  if (useFastModel) {
    // --- Phase 1: Haiku discovery only ---
    const phase1Model = getModel({
      temperature: 0,
      maxTokens: 4096,
      nodeKey: 'researchAgent',
      profile: 'haiku',
    });
    llmMeta = getModelMeta(phase1Model);
    const phase1Tools = createMemoizedTools(cacheStats, toolTimings, enabledNames, state.sessionId ?? null, qIdx, {
      toolsOverride: DISCOVERY_TOOLS,
      phase1Mode: true,
    });
    const phase1Prompt = buildResearchSystemPromptPhase1(state);
    logger.info('Research agent (Fast mode) Phase 1: Haiku discovery', { tools: phase1Tools.map((t) => t.name) });

    const phase1Agent = createReactAgent({
      llm: phase1Model,
      tools: phase1Tools,
      stateModifier: new SystemMessage(phase1Prompt),
    });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const plan = state.queryPlan || [];
      const activeQuestion = plan.length > 1 ? plan[qIdx]?.subQuestion || state.question : state.question;
      const hasHistory = state.conversationHistory?.length > 0;
      const humanMsg = hasHistory
        ? `Given the conversation context in the system prompt, research what is needed for this follow-up question:\n\n${activeQuestion}`
        : activeQuestion;

      const stream = await phase1Agent.stream(
        { messages: [new HumanMessage(humanMsg)] },
        { recursionLimit: 16, signal: controller.signal, streamMode: 'updates' }
      );

      let lastAgentState = null;
      let finishedDiscovery = false;
      const seenToolCallKeys = new Set();
      const seenToolResultKeys = new Set();
      let toolCallCount = 0;

      for await (const chunk of stream) {
        lastAgentState = chunk;
        const msgs = chunk.messages || [];
        for (const msg of msgs) {
          if (msg.tool_calls?.length > 0) {
            for (const tc of msg.tool_calls) {
              const dedupKey = tc.id ? `id:${tc.id}` : `${tc.name}|${stableStringify(tc.args || {})}`;
              if (seenToolCallKeys.has(dedupKey)) continue;
              seenToolCallKeys.add(dedupKey);
              toolCallCount++;
              _researchToolEvents.emit('tool_call', { name: tc.name, index: toolCallCount, attempt: attempts.agent, phase: 'research', sessionId: state.sessionId || '' });
              if (tc.name === 'finish_discovery') finishedDiscovery = true;
            }
          }
          if (msg.name && msg.content) {
            if (msg.name === 'discover_context' && typeof msg.content === 'string' && msg.content.length > 500) {
              discoverContextContent = msg.content;
            }
            const resultKey = msg.tool_call_id ? `${msg.name}|${msg.tool_call_id}` : `${msg.name}|${typeof msg.content === 'string' ? msg.content.substring(0, 240) : ''}`;
            if (seenToolResultKeys.has(resultKey)) continue;
            seenToolResultKeys.add(resultKey);
            _researchToolEvents.emit('tool_result', { name: msg.name, index: toolCallCount, attempt: attempts.agent, phase: 'research', sessionId: state.sessionId || '' });
          }
        }
        if (finishedDiscovery) break;
      }

      result = lastAgentState;

      // --- Phase 2: Opus brief synthesis ---
      if (result?.messages?.length > 0 && (finishedDiscovery || discoverContextContent)) {
        try {
          const opusModel = getModel({
            temperature: 0,
            maxTokens: 4096,
            nodeKey: 'researchAgent',
            profile: 'opus',
          });
          const structuredModel = opusModel.withStructuredOutput(ResearchBriefSchema);
          const convText = formatPhase1MessagesForPrompt(result.messages);
          const phase2Prompt = `You are synthesizing a research brief from a discovery conversation. The assistant (Haiku) ran discovery tools. Extract and structure the findings into the required JSON format.

=== DISCOVERY CONVERSATION ===
${convText}

=== INSTRUCTIONS ===
Generate the research brief as JSON with: tables (name, relevantColumns, description), joins (from, to, type), businessRules, examplePatterns, filterValues (column, values), fiscalPeriod, reasoning.
Use ONLY tables and columns that appear in the discovery results. Do not invent column names.`;

          const briefRaw = await structuredModel.invoke([new HumanMessage(phase2Prompt)]);
          const brief = briefRaw ? enrichBriefWithSchema(briefRaw) : null;
          if (brief) {
            result = { ...result, _phase2Brief: brief };
          }
        } catch (phase2Err) {
          logger.warn('Phase 2 Opus brief synthesis failed', { error: phase2Err?.message });
        }
      }
      clearTimeout(timeout);
    } catch (err) {
      if (typeof timeout !== 'undefined') clearTimeout(timeout);
      throw err;
    }
  } else {
    // --- Single-model flow (Opus or default) ---
    const model = getModel({
      temperature: 0,
      maxTokens: 4096,
      nodeKey: 'researchAgent',
      profile: state.useFastModel === false ? 'opus' : undefined,
    });
    llmMeta = getModelMeta(model);
    const systemPrompt = buildResearchSystemPrompt(state);
    const memoizedTools = createMemoizedTools(cacheStats, toolTimings, enabledNames, state.sessionId ?? null, qIdx);
    logger.info('Research agent tools', { enabledFilter: enabledNames ?? 'all', using: memoizedTools.map((t) => t.name) });

    const agent = createReactAgent({
      llm: model,
      tools: memoizedTools,
      stateModifier: new SystemMessage(systemPrompt),
    });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const plan = state.queryPlan || [];
      const activeQuestion = plan.length > 1 ? plan[qIdx]?.subQuestion || state.question : state.question;
      const hasHistory = state.conversationHistory?.length > 0;
      const humanMsg = hasHistory
        ? `Given the conversation context in the system prompt, research what is needed for this follow-up question:\n\n${activeQuestion}`
        : activeQuestion;

      const stream = await agent.stream(
        { messages: [new HumanMessage(humanMsg)] },
        { recursionLimit: 16, signal: controller.signal, streamMode: 'updates' }
      );

      let toolCallCount = 0;
      let lastAgentState = null;
      let submittedResearch = false;
      const seenToolCallKeys = new Set();
      const seenToolResultKeys = new Set();

      for await (const chunk of stream) {
        lastAgentState = chunk;
        const msgs = chunk.messages || [];
        for (const msg of msgs) {
          if (msg.tool_calls?.length > 0) {
            for (const tc of msg.tool_calls) {
              const dedupKey = tc.id ? `id:${tc.id}` : `${tc.name}|${stableStringify(tc.args || {})}`;
              if (seenToolCallKeys.has(dedupKey)) continue;
              seenToolCallKeys.add(dedupKey);
              toolCallCount++;
              _researchToolEvents.emit('tool_call', { name: tc.name, index: toolCallCount, attempt: attempts.agent, phase: 'research', sessionId: state.sessionId || '' });
            }
          }
          if (msg.name && msg.content) {
            if (msg.name === 'discover_context' && typeof msg.content === 'string' && msg.content.length > 500) {
              discoverContextContent = msg.content;
            }
            const resultKey = msg.tool_call_id ? `${msg.name}|${msg.tool_call_id}` : `${msg.name}|${typeof msg.content === 'string' ? msg.content.substring(0, 240) : ''}`;
            if (seenToolResultKeys.has(resultKey)) continue;
            seenToolResultKeys.add(resultKey);
            _researchToolEvents.emit('tool_result', { name: msg.name, index: toolCallCount, attempt: attempts.agent, phase: 'research', sessionId: state.sessionId || '' });
            if (msg.name === 'submit_research') submittedResearch = true;
          }
        }
        if (submittedResearch) break;
      }

      result = lastAgentState;
      clearTimeout(timeout);
    } finally {
      // timeout cleared above
    }
  }

  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    const typed = isTimeout
      ? new AgentTimeoutError(`Research agent timed out after ${timeoutMs / 1000}s`, { node: 'researchAgent', timeoutMs, agent: 'research' })
      : new ResearchError(err.message, { node: 'researchAgent', cause: err });
    logger.error(typed.name, { error: typed.message });

    let fallbackBrief = null;
    if (discoverContextContent) {
      logger.warn('Research agent errored but discover_context was available; building fallback brief');
      fallbackBrief = buildFallbackBriefFromDiscoverContext(discoverContextContent);
    }
    const toolMsTotalErr = toolTimings.reduce((s, t) => s + t.ms, 0);
    return {
      researchBrief: fallbackBrief,
      researchToolCalls: [],
      attempts,
      trace: [{
        node: 'researchAgent', timestamp: start, duration: Date.now() - start,
        toolMsTotal: toolMsTotalErr,
        toolTimings,
        error: typed.message, errorType: typed.name,
        hasBrief: !!fallbackBrief, briefSource: fallbackBrief ? 'fallback_discover_context' : null,
      }],
    };
  }

  let brief = result?._phase2Brief || parseResearchBrief(result);
  const toolCalls = extractToolCalls(result);
  const duration = Date.now() - start;
  let briefSource = result?._phase2Brief ? 'phase2_opus' : 'submit_research';

  const toolSummary = toolTimings.map((t) => `${t.name}(${t.ms}ms)`).join(', ');
  logger.info(`Research done (${duration}ms)`, {
    tools: `${toolCalls.length} [${toolSummary}]`,
    cache: `${cacheStats.hits}hit/${cacheStats.misses}miss`,
  });

  if (!brief && discoverContextContent) {
    logger.warn('Research agent did not call submit_research; building fallback brief from discover_context');
    brief = buildFallbackBriefFromDiscoverContext(discoverContextContent);
    if (brief) {
      briefSource = 'fallback_discover_context';
      logger.info('Fallback brief generated', {
        tables: brief.tables?.map((t) => t.name).join(', '),
        fiscalPeriod: brief.fiscalPeriod || 'none',
      });
    }
  }

  if (brief) {
    logger.info('Research brief submitted', {
      source: briefSource,
      tables: brief.tables?.map((t) => t.name).join(', '),
      filterValues: JSON.stringify(brief.filterValues || []),
      fiscalPeriod: brief.fiscalPeriod || 'none',
      joins: brief.joins?.length || 0,
      reasoning: brief.reasoning?.substring(0, 200),
    });
  }

  const toolMsTotal = toolTimings.reduce((s, t) => s + t.ms, 0);

  return {
    researchBrief: brief,
    researchToolCalls: toolCalls,
    attempts,
    trace: [{
      node: 'researchAgent',
      timestamp: start,
      duration,
      toolCallCount: toolCalls.length,
      toolNames: toolCalls.map((tc) => tc.name),
      toolMsTotal,
      toolTimings,
      cacheHits: cacheStats.hits,
      cacheMisses: cacheStats.misses,
      hasBrief: !!brief,
      briefSource,
      llm: llmMeta,
    }],
  };
}

module.exports = { researchAgentNode, researchToolEvents: _researchToolEvents };
