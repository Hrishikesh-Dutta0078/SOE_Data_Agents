/**
 * POST /api/text-to-sql/analyze        — batch (original)
 * POST /api/text-to-sql/analyze-stream  — SSE streaming with per-node progress
 */

const express = require('express');
const router = express.Router();
const { getWorkflow } = require('../graph/workflow');
const { resetUsage, getUsage, getUsageByNodeAndModel } = require('../config/llm');
const { resetStartTime } = require('../tools/getElapsedTime');
const { setSessionId } = require('../tools/searchSessionMemory');
const { researchToolEvents } = require('../graph/nodes/researchAgent');
const { writerToolEvents } = require('../graph/nodes/sqlWriterAgent');
const { presentEvents } = require('../graph/nodes/present');
const { decomposeEvents } = require('../graph/nodes/decompose');
const { accumulateEvents } = require('../graph/nodes/accumulateResult');
const { parallelPipelineEvents } = require('../graph/nodes/parallelSubQueryPipeline');
const { dashboardEvents } = require('../graph/nodes/dashboardAgent');
const { buildUsageSnapshot, buildUsageBreakdown } = require('../utils/usageMetrics');
const { DB_REQUEST_TIMEOUT, DASHBOARD_DB_TIMEOUT } = require('../config/constants');
const logger = require('../utils/logger');

function stableStringify(value) {
  if (value == null) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((x) => stableStringify(x)).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function toolCallSignature(toolCall) {
  return `${toolCall.name || ''}|${stableStringify(toolCall.args || {})}`;
}

/** Normalize req.body.enabledTools so workflow state always gets { research: string[], sqlWriter: string[] } or null. */
function normalizeEnabledTools(value) {
  if (value == null) return null;
  if (typeof value !== 'object') return null;
  const research = Array.isArray(value.research) ? value.research.map(String) : [];
  const sqlWriter = Array.isArray(value.sqlWriter) ? value.sqlWriter.map(String) : [];
  return { research, sqlWriter };
}

function isModelMeta(value) {
  return !!(
    value
    && typeof value === 'object'
    && (
      typeof value.modelName === 'string'
      || typeof value.provider === 'string'
      || typeof value.profile === 'string'
    )
  );
}

function registerModelBucket(buckets, key, meta) {
  if (!isModelMeta(meta)) return;
  if (!buckets[key]) {
    buckets[key] = { calls: 0, models: new Set(), providers: new Set(), profiles: new Set() };
  }

  const bucket = buckets[key];
  bucket.calls += 1;
  if (meta.modelName) bucket.models.add(meta.modelName);
  if (meta.provider) bucket.providers.add(meta.provider);
  if (meta.profile) bucket.profiles.add(meta.profile);
}

function collectModelMetrics(trace) {
  const buckets = {};
  const fallbackEvents = [];

  for (const step of trace || []) {
    if (!step?.node || !step.llm) continue;
    const llm = step.llm;

    if (llm.primary || llm.fallback) {
      registerModelBucket(buckets, `${step.node}.primary`, llm.primary);
      registerModelBucket(buckets, `${step.node}.fallback`, llm.fallback);
      if (llm.decision) {
        fallbackEvents.push({ node: step.node, decision: llm.decision });
      }
      continue;
    }

    if (llm.insights || llm.chart) {
      registerModelBucket(buckets, `${step.node}.insights`, llm.insights);
      registerModelBucket(buckets, `${step.node}.chart`, llm.chart);
      continue;
    }

    registerModelBucket(buckets, step.node, llm);
  }

  const byNode = {};
  for (const [key, value] of Object.entries(buckets)) {
    byNode[key] = {
      calls: value.calls,
      models: [...value.models],
      providers: [...value.providers],
      profiles: [...value.profiles],
    };
  }

  return { byNode, fallbackEvents };
}

function aggregateNodeDurationsFromTrace(trace) {
  const nodeDurations = {};
  for (const step of trace || []) {
    if (!step?.node || typeof step.duration !== 'number') continue;
    nodeDurations[step.node] = (nodeDurations[step.node] || 0) + step.duration;
  }
  return nodeDurations;
}

function buildRuntimeMetrics(state, opts = {}) {
  const trace = state.trace || [];
  const attempts = state.attempts || {};
  const toolCalls = state.agentToolCalls || [];
  const uniqueToolCalls = new Set();
  const toolCountsByName = {};

  for (const tc of toolCalls) {
    uniqueToolCalls.add(toolCallSignature(tc));
    if (tc?.name) toolCountsByName[tc.name] = (toolCountsByName[tc.name] || 0) + 1;
  }

  const sqlAgentTraces = trace.filter((step) =>
    step?.node === 'sqlAgent' || step?.node === 'researchAgent' || step?.node === 'sqlWriterAgent'
  );
  const cacheHits = sqlAgentTraces.reduce((sum, step) => sum + (step.cacheHits || 0), 0);
  const cacheMisses = sqlAgentTraces.reduce((sum, step) => sum + (step.cacheMisses || 0), 0);
  const cacheTotal = cacheHits + cacheMisses;

  const semanticFailureBuckets = {};
  let semanticFailureCount = 0;
  for (const step of trace) {
    if (step?.node !== 'validate' || step.errorType !== 'SEMANTIC_ERROR') continue;
    semanticFailureCount += 1;
    for (const [bucket, count] of Object.entries(step.semanticIssueBuckets || {})) {
      semanticFailureBuckets[bucket] = (semanticFailureBuckets[bucket] || 0) + count;
    }
  }

  const nodeDurationsMs = Object.keys(opts.nodeDurations || {}).length > 0
    ? opts.nodeDurations
    : aggregateNodeDurationsFromTrace(trace);
  const modelMetrics = collectModelMetrics(trace);

  const toolMsTotal = trace.reduce((sum, step) => {
    if (step?.toolMsTotal != null) return sum + step.toolMsTotal;
    if (Array.isArray(step?.toolTimings)) return sum + step.toolTimings.reduce((s, t) => s + (t?.ms ?? 0), 0);
    return sum;
  }, 0);
  const queryExecutionMs = trace
    .filter((step) => step?.node === 'execute' && typeof step.duration === 'number')
    .reduce((sum, step) => sum + step.duration, 0);
  const llmMs = typeof opts.llmMs === 'number' ? opts.llmMs : 0;
  const totalMs = typeof opts.totalDuration === 'number' ? opts.totalDuration : null;

  const timingMs = {
    llm: llmMs,
    toolCalls: toolMsTotal,
    queryExecution: queryExecutionMs,
    ...(totalMs != null && { total: totalMs }),
  };

  return {
    attempts: {
      agent: attempts.agent || 0,
      reflection: attempts.reflection || 0,
      correction: attempts.correction || 0,
      resultCheck: attempts.resultCheck || 0,
    },
    tools: {
      totalCalls: toolCalls.length,
      uniqueCalls: uniqueToolCalls.size,
      byName: toolCountsByName,
      cacheHits,
      cacheMisses,
      cacheHitRatio: cacheTotal > 0 ? Number((cacheHits / cacheTotal).toFixed(3)) : null,
    },
    validation: {
      semanticFailureCount,
      semanticFailureBuckets,
    },
    models: {
      byNode: modelMetrics.byNode,
      fallbackEvents: modelMetrics.fallbackEvents,
    },
    nodeDurationsMs,
    timingMs,
  };
}

function mergeStateUpdate(target, update) {
  for (const [key, value] of Object.entries(update || {})) {
    if (Array.isArray(value)) {
      if (['trace', 'warnings', 'agentToolCalls'].includes(key)) {
        target[key] = [...(target[key] || []), ...value];
      } else {
        target[key] = value;
      }
      continue;
    }

    if (value && typeof value === 'object' && key === 'attempts') {
      target[key] = { ...(target[key] || {}), ...value };
      continue;
    }

    target[key] = value;
  }
  return target;
}

function extractNodeSummary(nodeName, update) {
  switch (nodeName) {
    case 'classify':
      return [update.intent, update.complexity, update.questionCategory, update.blueprintId ? `blueprint:${update.blueprintId}` : '', update.needsDecomposition ? 'multi-query' : ''].filter(Boolean).join(' | ');
    case 'decompose': {
      const plan = update.queryPlan || [];
      return `${plan.length} sub-queries planned`;
    }
    case 'researchAgent': {
      const calls = update.researchToolCalls?.length;
      const attempt = update.attempts?.agent;
      const parts = [];
      if (attempt) parts.push(`attempt ${attempt}`);
      if (calls != null) parts.push(`${calls} tool calls`);
      parts.push(update.researchBrief ? 'brief ready' : 'researching');
      return parts.join(', ');
    }
    case 'sqlWriterAgent': {
      const calls = update.agentToolCalls?.length;
      const parts = [];
      if (calls != null) parts.push(`${calls} tool calls`);
      parts.push(update.sql ? 'SQL submitted' : 'writing SQL');
      return parts.join(', ');
    }
    case 'sqlAgent': {
      const calls = update.agentToolCalls?.length;
      const attempt = update.attempts?.agent;
      const parts = [];
      if (attempt) parts.push(`attempt ${attempt}`);
      if (calls != null) parts.push(`${calls} tool calls`);
      return parts.join(', ') || 'generating SQL';
    }
    case 'reflect': {
      const c = update.reflectionConfidence;
      return c != null ? `confidence ${c.toFixed(2)}` : '';
    }
    case 'injectRls': {
      const rlsTrace = (update.trace || []).find((t) => t.node === 'injectRls');
      if (rlsTrace?.rlsDisabled) return 'RLS disabled';
      return rlsTrace?.rlsApplied ? 'RLS applied' : 'skipped';
    }
    case 'validate':
      return update.validationReport?.overall_valid ? 'valid' : 'issues found';
    case 'correct':
      return `correction attempt ${update.attempts?.correction || '?'}`;
    case 'execute': {
      const ex = update.execution;
      if (!ex) return '';
      return ex.success ? `${ex.rowCount ?? ex.rows?.length ?? 0} rows` : `error: ${(ex.error || '').substring(0, 60)}`;
    }
    case 'checkResults':
      return update.warnings?.length ? `${update.warnings.length} warning(s)` : 'OK';
    case 'accumulateResult': {
      const t = (update.trace || []).find((s) => s.node === 'accumulateResult');
      return t ? `saved query ${t.queryIndex + 1}/${t.totalQueries}` : 'accumulating';
    }
    case 'diagnoseEmptyResults':
      return update.diagnostics?.action || 'diagnosing empty results';
    case 'present': {
      const pt = (update.trace || []).find((s) => s.node === 'present');
      const multi = pt?.multiQuery ? ` (${pt.queryCount} queries synthesized)` : '';
      return `done${multi}`;
    }
    case 'dashboardAgent': {
      const dt = (update.trace || []).find((s) => s.node === 'dashboardAgent');
      if (dt?.skipped) return 'no data available';
      return dt ? `${dt.tileCount} tiles, ${dt.slicerCount} slicers` : 'building dashboard';
    }
    default:
      return '';
  }
}

function extractThinkingMessage(nodeName, update, fullState) {
  const plan = fullState.queryPlan || [];
  const idx = fullState.currentQueryIndex || 0;
  const multiPrefix = plan.length > 1 ? `[Query ${idx + 1}/${plan.length}] ` : '';

  switch (nodeName) {
    case 'classify':
      if (update.blueprintId) return `Analysis blueprint detected: "${update.blueprintMeta?.name || update.blueprintId}" — expanding into sub-queries`;
      if (update.needsDecomposition) return 'Complex question detected — will decompose into multiple sub-queries';
      return `Classified as ${update.intent || 'unknown'} (${update.complexity || ''})`;
    case 'decompose': {
      const items = (update.queryPlan || []).map((q, i) => `${i + 1}. ${q.subQuestion}`).join('\n');
      return `Decomposed into ${(update.queryPlan || []).length} sub-queries:\n${items}`;
    }
    case 'researchAgent':
      return `${multiPrefix}Research complete — ${(update.researchToolCalls || []).length} tool calls, brief ${update.researchBrief ? 'ready' : 'unavailable'}`;
    case 'sqlWriterAgent':
      return update.sql ? `${multiPrefix}SQL generated` : `${multiPrefix}SQL writer finished (no SQL produced)`;
    case 'validate': {
      const report = update.validationReport;
      if (!report) return `${multiPrefix}Validation skipped`;
      if (report.overall_valid) return `${multiPrefix}Validation passed`;
      const issues = [];
      for (const [pass, result] of Object.entries(report.passes || {})) {
        if (!result.passed && result.issues?.length) {
          issues.push(`${pass}: ${result.issues.map((i) => i.description).join('; ')}`);
        }
      }
      return `${multiPrefix}Validation failed — ${issues.join(' | ')}`;
    }
    case 'correct':
      return `${multiPrefix}Correcting SQL (attempt ${update.attempts?.correction || '?'})`;
    case 'execute': {
      const ex = update.execution;
      if (!ex) return `${multiPrefix}Executing query...`;
      return ex.success
        ? `${multiPrefix}Query returned ${ex.rowCount} rows`
        : `${multiPrefix}Execution failed: ${(ex.error || '').substring(0, 100)}`;
    }
    case 'accumulateResult': {
      const t = (update.trace || []).find((s) => s.node === 'accumulateResult');
      if (t) return `Saved result for query ${t.queryIndex + 1}/${t.totalQueries}. Moving to next sub-query...`;
      return 'Accumulating results...';
    }
    case 'present': {
      const pt = (update.trace || []).find((s) => s.node === 'present');
      if (pt?.multiQuery) return `Synthesizing insights across ${pt.queryCount} query results...`;
      return 'Generating insights and chart recommendations...';
    }
    case 'dashboardAgent': {
      const dt = (update.trace || []).find((s) => s.node === 'dashboardAgent');
      if (dt?.skipped) return 'No data available to build a dashboard.';
      return dt
        ? `Dashboard ready — ${dt.tileCount} tiles, ${dt.slicerCount} slicers`
        : 'Building interactive dashboard...';
    }
    default:
      return null;
  }
}

function buildQuerySummary(state) {
  const parts = [];
  if (state.matchType === 'blueprint') {
    parts.push(`Running analysis: ${state.blueprintMeta?.name || state.blueprintId}`);
    if (state.blueprintMeta?.userParams) parts.push(`Filtered by: ${state.blueprintMeta.userParams}`);
    const planSize = state.queryPlan?.length || state.blueprintMeta?.subQueries?.length || 0;
    if (planSize > 0) parts.push(`This will run ${planSize} sub-queries in parallel`);
  } else if (state.matchType === 'exact') {
    parts.push('Found an exact match in verified templates — executing directly');
  } else if (state.matchType === 'followup') {
    parts.push('Adapting previous query for your follow-up');
  } else {
    parts.push(`Researching: "${state.question}"`);
    if (state.entities?.filters?.length > 0) parts.push(`Filters: ${state.entities.filters.join(', ')}`);
    if (state.entities?.dimensions?.length > 0) parts.push(`Grouped by: ${state.entities.dimensions.join(', ')}`);
    if (state.entities?.metrics?.length > 0) parts.push(`Metrics: ${state.entities.metrics.join(', ')}`);
  }
  return parts.join('. ') + '.';
}

function computeConfidence(state) {
  let score = 0.5;
  if (state.matchType === 'exact') score += 0.4;
  else if (state.matchType === 'partial' || state.matchType === 'followup') score += 0.25;
  else if (state.matchType === 'blueprint') score += 0.2;

  if (state.validationReport?.overall_valid) score += 0.15;
  if (state.execution?.success && state.execution?.rowCount > 0) score += 0.1;
  if (state.execution?.rowCount === 0) score -= 0.2;
  if (state.attempts?.correction > 0) score -= 0.1 * state.attempts.correction;

  score = Math.max(0, Math.min(1, score));
  const level = score >= 0.8 ? 'high' : score >= 0.5 ? 'medium' : 'low';
  return { score: Number(score.toFixed(2)), level };
}

function extractNodeModel(update) {
  const trace = Array.isArray(update?.trace) ? update.trace : [];
  if (trace.length === 0) return null;
  return trace[trace.length - 1]?.llm || null;
}

function buildFinalResponse(state, usage, runtimeMetrics = null, usageByNodeAndModel = null) {
  const queries = state.queries || [];
  const payload = {
    intent: state.intent,
    complexity: state.complexity,
    entities: state.entities,
    questionCategory: state.questionCategory,
    questionSubCategory: state.questionSubCategory,
    needsDecomposition: state.needsDecomposition || false,
    queryPlan: state.queryPlan || [],
    queries: queries.map((q) => ({
      id: q.id,
      subQuestion: q.subQuestion,
      purpose: q.purpose,
      sql: q.sql,
      reasoning: q.reasoning,
      execution: q.execution,
    })),
    clarificationQuestions: state.clarificationQuestions,
    generalChatReply: state.generalChatReply,
    orchestrationReasoning: state.orchestrationReasoning,
    sql: state.sql ? { generated: state.sql, reasoning: state.reasoning } : null,
    execution: state.execution,
    diagnostics: state.diagnostics,
    insights: state.insights,
    chart: state.chart,
    suggestedFollowUps: state.suggestedFollowUps || [],
    partialResultsSummary: state.partialResultsSummary || null,
    dashboardSpec: state.dashboardSpec || null,
    trace: state.trace,
    warnings: state.warnings,
    runtimeMetrics,
    usage,
  };
  if (usageByNodeAndModel) payload.usageByNodeAndModel = usageByNodeAndModel;
  return payload;
}

function logCycleUsage(endpoint, sessionId, usage) {
  const log = {
    endpoint,
    sessionId,
    inputTokens: usage.inputTokens,
    cachedInputTokens: usage.cachedInputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    estimatedCostUsd: usage.estimatedCostUsd,
    calls: usage.calls,
    duration: usage.duration,
  };
  if (usage.timingMs) {
    log.timingMs = usage.timingMs;
  }
  logger.info('E2E cycle usage', log);
}

router.post('/analyze', async (req, res) => {
  const {
    question,
    conversationHistory,
    previousEntities,
    resolvedQuestions,
    impersonateContext,
    validationEnabled,
    isFollowUp,
    enabledTools,
    useFastModel,
  } = req.body;

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ error: 'Request body must include a non-empty "question" string.' });
  }

  logger.info('New query', { question: question.substring(0, 80) });

  resetUsage();
  if (resetStartTime) resetStartTime();
  const requestStart = Date.now();

  const sessionId = req.headers['x-session-id'] || `session-${Date.now()}`;
  if (setSessionId) setSessionId(sessionId);

  try {
    const workflow = getWorkflow();
    const threadConfig = { configurable: { thread_id: sessionId } };
    const result = await workflow.invoke({
      question: question.trim(),
      conversationHistory: conversationHistory || [],
      previousEntities: previousEntities || null,
      resolvedQuestions: resolvedQuestions || [],
      sessionId,
      rlsEnabled: !!impersonateContext,
      impersonateContext: impersonateContext || null,
      validationEnabled: validationEnabled !== false,
      isFollowUp: !!isFollowUp,
      enabledTools: normalizeEnabledTools(enabledTools),
      useFastModel: useFastModel ?? null,
    }, { ...threadConfig, recursionLimit: 100 });

    const totalDuration = Date.now() - requestStart;
    const usage = buildUsageSnapshot(getUsage(), { duration: totalDuration });
    const runtimeMetrics = buildRuntimeMetrics(result, {
      llmMs: getUsage().llmMs,
      totalDuration,
    });
    const usageWithTiming = runtimeMetrics?.timingMs
      ? { ...usage, timingMs: runtimeMetrics.timingMs }
      : usage;
    logCycleUsage('analyze', sessionId, usageWithTiming);
    const usageByNodeAndModel = buildUsageBreakdown(getUsageByNodeAndModel());
    res.json(buildFinalResponse(result, usageWithTiming, runtimeMetrics, usageByNodeAndModel));
  } catch (err) {
    logger.error('Pipeline failed', { error: err.message });
    res.status(500).json({
      error: 'Failed to analyze the question. Please try again.',
      details: 'Internal processing error',
    });
  }
});

router.post('/analyze-stream', async (req, res) => {
  const {
    question,
    conversationHistory,
    previousEntities,
    resolvedQuestions,
    presentMode,
    impersonateContext,
    validationEnabled,
    isFollowUp,
    previousDashboardSpec,
    dashboardDataSources,
    enabledTools,
    useFastModel,
  } = req.body;

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ error: 'Request body must include a non-empty "question" string.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  logger.info('New query (stream)', { question: question.substring(0, 80) });

  resetUsage();
  if (resetStartTime) resetStartTime();
  const requestStart = Date.now();

  const sessionId = req.headers['x-session-id'] || `session-${Date.now()}`;
  if (setSessionId) setSessionId(sessionId);

  const inputs = {
    question: question.trim(),
    conversationHistory: conversationHistory || [],
    previousEntities: previousEntities || null,
    resolvedQuestions: resolvedQuestions || [],
    sessionId,
    presentMode: presentMode || 'full',
    rlsEnabled: !!impersonateContext,
    impersonateContext: impersonateContext || null,
    validationEnabled: validationEnabled !== false,
    isFollowUp: !!isFollowUp,
    previousDashboardSpec: previousDashboardSpec || null,
    dashboardRefinement: previousDashboardSpec ? question.trim() : '',
    dashboardDataSources: dashboardDataSources || [],
    enabledTools: normalizeEnabledTools(enabledTools),
    useFastModel: useFastModel ?? null,
  };

  let onToolCall = null;
  let onToolResult = null;
  let onPrefetchStart = null;
  let onPrefetchComplete = null;
  let onPrefetchAllComplete = null;
  let onDiscoverContextPrefetchUsed = null;
  let onInsightToken = null;
  let onQueryPlan = null;
  let onQueryProgress = null;
  let onDashboardProgress = null;
  let onParallelPipelineStart = null;
  let onParallelSubqueryProgress = null;
  let onParallelCorrectionStart = null;
  let onParallelCorrectionComplete = null;
  let onParallelPipelineComplete = null;
  let onSubqueryResult = null;

  const emitThinking = (message, category) => {
    const event = { type: 'thinking', message, category, elapsed: Date.now() - requestStart };
    res.write(`event: thinking\ndata: ${JSON.stringify(event)}\n\n`);
  };

  try {
    const workflow = getWorkflow();
    const threadConfig = { configurable: { thread_id: sessionId } };
    const stream = await workflow.stream(inputs, { ...threadConfig, recursionLimit: 100, streamMode: 'updates' });
    const seenToolEvents = new Set();

    const shouldEmitToolEvent = (kind, data) => {
      const eventSession = data.sessionId || sessionId;
      if (eventSession !== sessionId) return false;

      const key = [
        kind,
        eventSession,
        data.attempt || 0,
        data.index || 0,
        data.name || '',
        data.callId || '',
      ].join('|');

      if (seenToolEvents.has(key)) return false;
      seenToolEvents.add(key);
      return true;
    };

    onToolCall = (data) => {
      if (!shouldEmitToolEvent('tool_call', data)) return;
      const event = { type: 'tool_call', ...data, elapsed: Date.now() - requestStart };
      res.write(`event: tool_call\ndata: ${JSON.stringify(event)}\n\n`);
      const label = data.name === 'discover_context'
        ? 'Discover context...'
        : `Running ${data.name}...`;
      emitThinking(label, data.phase || 'tool');
    };
    onToolResult = (data) => {
      if (!shouldEmitToolEvent('tool_result', data)) return;
      const event = { type: 'tool_result', ...data, elapsed: Date.now() - requestStart };
      res.write(`event: tool_result\ndata: ${JSON.stringify(event)}\n\n`);
    };

    researchToolEvents.on('tool_call', onToolCall);
    researchToolEvents.on('tool_result', onToolResult);
    writerToolEvents.on('tool_call', onToolCall);
    writerToolEvents.on('tool_result', onToolResult);

    onPrefetchStart = (data) => {
      if (data.sessionId && data.sessionId !== sessionId) return;
      const n = data.total ?? 0;
      emitThinking(
        n === 1
          ? 'Parallel research started (1 sub-query)'
          : `Parallel research started (${n} sub-queries)`,
        'researchAgent'
      );
    };
    onPrefetchComplete = (data) => {
      if (data.sessionId && data.sessionId !== sessionId) return;
      const { index, total } = data;
      if (total == null || total <= 0) return;
      emitThinking(
        `Parallel research: context ready for sub-query ${index + 1}/${total + 1}`,
        'researchAgent'
      );
    };
    onPrefetchAllComplete = (data) => {
      if (data.sessionId && data.sessionId !== sessionId) return;
      const n = data.total ?? 0;
      emitThinking(
        n === 1
          ? 'Parallel research complete (1/1)'
          : `Parallel research complete (${n}/${n})`,
        'researchAgent'
      );
    };
    researchToolEvents.on('prefetch_start', onPrefetchStart);
    researchToolEvents.on('prefetch_complete', onPrefetchComplete);
    researchToolEvents.on('prefetch_all_complete', onPrefetchAllComplete);

    onDiscoverContextPrefetchUsed = (data) => {
      if (data.sessionId && data.sessionId !== sessionId) return;
      const n = (data.queryIndex ?? 0) + 1;
      emitThinking(`Using prefetched context (sub-query ${n})`, 'researchAgent');
    };
    researchToolEvents.on('discover_context_prefetch_used', onDiscoverContextPrefetchUsed);

    onInsightToken = (data) => {
      if (data.sessionId && data.sessionId !== sessionId) return;
      const event = { type: 'insight_token', content: data.content, elapsed: Date.now() - requestStart };
      res.write(`event: insight_token\ndata: ${JSON.stringify(event)}\n\n`);
    };
    presentEvents.on('insight_token', onInsightToken);

    onQueryPlan = (data) => {
      if (data.sessionId && data.sessionId !== sessionId) return;
      const event = { type: 'query_plan', queryPlan: data.queryPlan, elapsed: Date.now() - requestStart };
      res.write(`event: query_plan\ndata: ${JSON.stringify(event)}\n\n`);
      emitThinking(`Decomposed into ${data.queryPlan.length} sub-queries`, 'decompose');
    };
    decomposeEvents.on('query_plan', onQueryPlan);

    onParallelPipelineStart = (data) => {
      if (data.sessionId && data.sessionId !== sessionId) return;
      const n = data.total ?? 0;
      emitThinking(
        n <= 1 ? 'Running sub-query...' : `Parallel pipeline: running ${n} sub-queries`,
        'parallelSubQueryPipeline'
      );
    };
    onParallelSubqueryProgress = (data) => {
      if (data.sessionId && data.sessionId !== sessionId) return;
      const { index, total, stage } = data;
      const label = stage === 'research' ? 'Researching...' : stage === 'sql' ? 'Writing SQL...' : stage === 'correct' ? 'Correcting...' : 'Executing...';
      emitThinking(`Sub-query ${(index ?? 0) + 1}/${total ?? 1}: ${label}`, 'parallelSubQueryPipeline');
    };
    onParallelCorrectionStart = (data) => {
      if (data.sessionId && data.sessionId !== sessionId) return;
      const n = data.total ?? 0;
      emitThinking(n <= 1 ? 'Correcting failed sub-query...' : `Correcting ${n} failed sub-queries...`, 'parallelSubQueryPipeline');
    };
    onParallelCorrectionComplete = (data) => {
      if (data.sessionId && data.sessionId !== sessionId) return;
      const { recovered, total } = data;
      emitThinking(`Correction complete: ${recovered ?? 0}/${total ?? 0} recovered`, 'parallelSubQueryPipeline');
    };
    onParallelPipelineComplete = (data) => {
      if (data.sessionId && data.sessionId !== sessionId) return;
      const n = data.total ?? 0;
      emitThinking(
        n <= 1 ? 'Sub-query complete' : `Parallel pipeline complete (${n} sub-queries)`,
        'parallelSubQueryPipeline'
      );
    };
    onSubqueryResult = (data) => {
      if (data.sessionId && data.sessionId !== sessionId) return;
      const event = {
        type: 'subquery_result',
        index: data.index,
        total: data.total,
        result: data.result,
        elapsed: Date.now() - requestStart,
      };
      res.write(`event: subquery_result\ndata: ${JSON.stringify(event)}\n\n`);
    };
    parallelPipelineEvents.on('parallel_pipeline_start', onParallelPipelineStart);
    parallelPipelineEvents.on('parallel_subquery_progress', onParallelSubqueryProgress);
    parallelPipelineEvents.on('parallel_pipeline_complete', onParallelPipelineComplete);
    parallelPipelineEvents.on('parallel_correction_start', onParallelCorrectionStart);
    parallelPipelineEvents.on('parallel_correction_complete', onParallelCorrectionComplete);
    parallelPipelineEvents.on('subquery_result', onSubqueryResult);

    onQueryProgress = (data) => {
      if (data.sessionId && data.sessionId !== sessionId) return;
      const event = { type: 'query_progress', ...data, elapsed: Date.now() - requestStart };
      res.write(`event: query_progress\ndata: ${JSON.stringify(event)}\n\n`);
      if (data.nextSubQuestion) {
        emitThinking(`Query ${data.queryIndex + 1}/${data.total} complete. Next: "${data.nextSubQuestion}"`, 'loop');
      }
    };
    accumulateEvents.on('query_progress', onQueryProgress);

    onDashboardProgress = (data) => {
      if (data.sessionId && data.sessionId !== sessionId) return;
      const event = { type: 'dashboard_progress', ...data, elapsed: Date.now() - requestStart };
      res.write(`event: dashboard_progress\ndata: ${JSON.stringify(event)}\n\n`);
      if (data.status === 'planning') {
        emitThinking(`Building dashboard from ${data.sourceCount} data source(s)...`, 'dashboardAgent');
      } else if (data.status === 'refining') {
        emitThinking(`Refining dashboard (${data.sourceCount} data source(s))...`, 'dashboardAgent');
      }
    };
    dashboardEvents.on('dashboard_progress', onDashboardProgress);

    let lastState = {};
    let nodeStart = Date.now();
    const nodeDurationsMs = {};

    for await (const chunk of stream) {
      const nodeName = Object.keys(chunk)[0];
      const update = chunk[nodeName];
      if (!nodeName || !update) continue;

      mergeStateUpdate(lastState, update);

      const now = Date.now();
      const duration = now - nodeStart;
      nodeStart = now;
      nodeDurationsMs[nodeName] = (nodeDurationsMs[nodeName] || 0) + duration;

      const usage = buildUsageSnapshot(getUsage(), { duration: now - requestStart });

      const thinkingMsg = extractThinkingMessage(nodeName, update, lastState);
      if (thinkingMsg) emitThinking(thinkingMsg, nodeName);

      if (nodeName === 'classify') {
        const summary = buildQuerySummary(lastState);
        const summaryEvent = { type: 'query_summary', summary, matchType: lastState.matchType || '', elapsed: Date.now() - requestStart };
        res.write(`event: query_summary\ndata: ${JSON.stringify(summaryEvent)}\n\n`);
      }

      const event = {
        node: nodeName,
        duration,
        summary: extractNodeSummary(nodeName, update),
        model: extractNodeModel(update),
        usage,
      };

      res.write(`event: node_complete\ndata: ${JSON.stringify(event)}\n\n`);
    }

    const totalDuration = Date.now() - requestStart;
    const usage = buildUsageSnapshot(getUsage(), { duration: totalDuration });
    const runtimeMetrics = buildRuntimeMetrics(lastState, {
      nodeDurations: nodeDurationsMs,
      llmMs: getUsage().llmMs,
      totalDuration,
    });
    const usageWithTiming = runtimeMetrics?.timingMs
      ? { ...usage, timingMs: runtimeMetrics.timingMs }
      : usage;
    logCycleUsage('analyze-stream', sessionId, usageWithTiming);

    if (onToolCall) {
      researchToolEvents.removeListener('tool_call', onToolCall);
      writerToolEvents.removeListener('tool_call', onToolCall);
    }
    if (onToolResult) {
      researchToolEvents.removeListener('tool_result', onToolResult);
      writerToolEvents.removeListener('tool_result', onToolResult);
    }
    if (onPrefetchStart) researchToolEvents.removeListener('prefetch_start', onPrefetchStart);
    if (onPrefetchComplete) researchToolEvents.removeListener('prefetch_complete', onPrefetchComplete);
    if (onPrefetchAllComplete) researchToolEvents.removeListener('prefetch_all_complete', onPrefetchAllComplete);
    if (onDiscoverContextPrefetchUsed) researchToolEvents.removeListener('discover_context_prefetch_used', onDiscoverContextPrefetchUsed);
    if (onInsightToken) presentEvents.removeListener('insight_token', onInsightToken);
    if (onQueryPlan) decomposeEvents.removeListener('query_plan', onQueryPlan);
    if (onQueryProgress) accumulateEvents.removeListener('query_progress', onQueryProgress);
    if (onParallelPipelineStart) parallelPipelineEvents.removeListener('parallel_pipeline_start', onParallelPipelineStart);
    if (onParallelSubqueryProgress) parallelPipelineEvents.removeListener('parallel_subquery_progress', onParallelSubqueryProgress);
    if (onParallelPipelineComplete) parallelPipelineEvents.removeListener('parallel_pipeline_complete', onParallelPipelineComplete);
    if (onParallelCorrectionStart) parallelPipelineEvents.removeListener('parallel_correction_start', onParallelCorrectionStart);
    if (onParallelCorrectionComplete) parallelPipelineEvents.removeListener('parallel_correction_complete', onParallelCorrectionComplete);
    if (onSubqueryResult) parallelPipelineEvents.removeListener('subquery_result', onSubqueryResult);
    if (onDashboardProgress) dashboardEvents.removeListener('dashboard_progress', onDashboardProgress);

    const usageByNodeAndModel = buildUsageBreakdown(getUsageByNodeAndModel());
    const finalPayload = buildFinalResponse(lastState, usageWithTiming, runtimeMetrics, usageByNodeAndModel);
    finalPayload.confidence = computeConfidence(lastState);
    res.write(`event: done\ndata: ${JSON.stringify(finalPayload)}\n\n`);
    res.end();
  } catch (err) {
    if (onToolCall) {
      researchToolEvents.removeListener('tool_call', onToolCall);
      writerToolEvents.removeListener('tool_call', onToolCall);
    }
    if (onToolResult) {
      researchToolEvents.removeListener('tool_result', onToolResult);
      writerToolEvents.removeListener('tool_result', onToolResult);
    }
    if (onPrefetchStart) researchToolEvents.removeListener('prefetch_start', onPrefetchStart);
    if (onPrefetchComplete) researchToolEvents.removeListener('prefetch_complete', onPrefetchComplete);
    if (onPrefetchAllComplete) researchToolEvents.removeListener('prefetch_all_complete', onPrefetchAllComplete);
    if (onDiscoverContextPrefetchUsed) researchToolEvents.removeListener('discover_context_prefetch_used', onDiscoverContextPrefetchUsed);
    if (onInsightToken) presentEvents.removeListener('insight_token', onInsightToken);
    if (onQueryPlan) decomposeEvents.removeListener('query_plan', onQueryPlan);
    if (onQueryProgress) accumulateEvents.removeListener('query_progress', onQueryProgress);
    if (onParallelPipelineStart) parallelPipelineEvents.removeListener('parallel_pipeline_start', onParallelPipelineStart);
    if (onParallelSubqueryProgress) parallelPipelineEvents.removeListener('parallel_subquery_progress', onParallelSubqueryProgress);
    if (onParallelPipelineComplete) parallelPipelineEvents.removeListener('parallel_pipeline_complete', onParallelPipelineComplete);
    if (onParallelCorrectionStart) parallelPipelineEvents.removeListener('parallel_correction_start', onParallelCorrectionStart);
    if (onParallelCorrectionComplete) parallelPipelineEvents.removeListener('parallel_correction_complete', onParallelCorrectionComplete);
    if (onSubqueryResult) parallelPipelineEvents.removeListener('subquery_result', onSubqueryResult);
    if (onDashboardProgress) dashboardEvents.removeListener('dashboard_progress', onDashboardProgress);
    logger.error('Pipeline stream failed', { error: err.message });
    const errorPayload = { error: 'Stream processing failed' };
    res.write(`event: error\ndata: ${JSON.stringify(errorPayload)}\n\n`);
    res.end();
  }
});

const DASHBOARD_MAX_DISTINCT = 500;
const DASHBOARD_DEFAULT_PAGE_SIZE = 50;

function stripTrailingOrderBy(sql) {
  return sql.replace(/\s+ORDER\s+BY\s+[^)]*$/i, '');
}

function isCte(sql) {
  return /^\s*WITH\s/i.test(sql);
}

function wrapAsSubquery(sql) {
  const clean = stripTrailingOrderBy(sql);
  if (isCte(clean)) {
    const mainIdx = findOuterSelect(clean);
    if (mainIdx === -1) return { inner: `(${clean}) _t`, ctePrefix: '' };
    const ctePrefix = clean.substring(0, mainIdx);
    const mainSelect = clean.substring(mainIdx);
    return { inner: `(${mainSelect}) _t`, ctePrefix };
  }
  return { inner: `(${clean}) _t`, ctePrefix: '' };
}

function findOuterSelect(sql) {
  const upper = sql.toUpperCase();
  let depth = 0;
  for (let i = 0; i < sql.length; i++) {
    if (sql[i] === '(') depth++;
    else if (sql[i] === ')') depth--;
    else if (depth === 0 && upper.startsWith('SELECT', i)) {
      const before = i > 0 ? sql[i - 1] : ' ';
      if (/[\s\n\r,]/.test(before) || i === 0) return i;
    }
  }
  return -1;
}

router.post('/dashboard-data', async (req, res) => {
  const { mode, sql, page, pageSize, columns } = req.body;

  if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
    return res.status(400).json({ error: 'sql is required' });
  }
  if (!mode || !['page', 'distinct'].includes(mode)) {
    return res.status(400).json({ error: 'mode must be "page" or "distinct"' });
  }

  try {
    const { getPool } = require('../config/database');
    const pool = await getPool();

    const makeRequest = () => {
      const r = pool.request();
      r.timeout = DASHBOARD_DB_TIMEOUT;
      return r;
    };

    const { inner, ctePrefix } = wrapAsSubquery(sql);

    if (mode === 'page') {
      const pg = Math.max(1, parseInt(page, 10) || 1);
      const ps = Math.min(200, Math.max(1, parseInt(pageSize, 10) || DASHBOARD_DEFAULT_PAGE_SIZE));
      const offset = (pg - 1) * ps;

      const countSql = `${ctePrefix}SELECT COUNT(*) AS total FROM ${inner}`;
      const pageSql = `${ctePrefix}SELECT * FROM ${inner} ORDER BY (SELECT NULL) OFFSET ${offset} ROWS FETCH NEXT ${ps} ROWS ONLY`;

      let totalRows = -1;
      try {
        const countResult = await makeRequest().query(countSql);
        totalRows = countResult.recordset?.[0]?.total ?? -1;
      } catch (countErr) {
        logger.warn('Dashboard count query failed, skipping total', { error: countErr.message });
      }

      const pageResult = await makeRequest().query(pageSql);
      const rows = pageResult.recordset ?? [];
      const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

      return res.json({ rows, columns: cols, page: pg, pageSize: ps, totalRows });
    }

    if (mode === 'distinct') {
      if (!Array.isArray(columns) || columns.length === 0) {
        return res.status(400).json({ error: 'columns array is required for distinct mode' });
      }

      const safeColumns = columns.filter((c) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c)).slice(0, 20);
      const slicerValues = {};

      await Promise.all(safeColumns.map(async (col) => {
        const distinctSql = `${ctePrefix}SELECT DISTINCT TOP ${DASHBOARD_MAX_DISTINCT} [${col}] FROM ${inner} WHERE [${col}] IS NOT NULL ORDER BY [${col}]`;
        const result = await makeRequest().query(distinctSql);
        slicerValues[col] = (result.recordset ?? []).map((r) => String(r[col]));
      }));

      return res.json({ slicerValues });
    }
  } catch (err) {
    logger.error('Dashboard data query failed', { mode, error: err.message });
    res.status(500).json({ error: 'Dashboard data query failed' });
  }
});

router.get('/history/:threadId', async (req, res) => {
  const { threadId } = req.params;
  if (!threadId) {
    return res.status(400).json({ error: 'threadId is required' });
  }

  try {
    const workflow = getWorkflow();
    const config = { configurable: { thread_id: threadId } };
    const history = [];

    for await (const checkpoint of workflow.getStateHistory(config)) {
      history.push({
        id: checkpoint.config?.configurable?.checkpoint_id,
        timestamp: checkpoint.metadata?.created_at,
        source: checkpoint.metadata?.source,
        step: checkpoint.metadata?.step,
        state: {
          question: checkpoint.values?.question,
          intent: checkpoint.values?.intent,
          sql: checkpoint.values?.sql,
          reflectionConfidence: checkpoint.values?.reflectionConfidence,
          attempts: checkpoint.values?.attempts,
        },
      });
    }

    res.json({ threadId, checkpoints: history });
  } catch (err) {
    logger.error('History retrieval failed', { error: err.message });
    res.status(500).json({ error: 'History retrieval failed' });
  }
});

router.get('/blueprints', (req, res) => {
  const { loadBlueprints } = require('../graph/nodes/classify');
  const blueprints = loadBlueprints();
  res.json(
    blueprints.map((bp) => ({
      id: bp.id,
      name: bp.name,
      slashCommand: bp.slashCommand,
      description: bp.description,
      icon: bp.icon || null,
    }))
  );
});

module.exports = router;
