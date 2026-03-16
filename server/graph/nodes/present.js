/**
 * Present Node — LLM insights + chart recommendation
 * using centralized prompt templates and structured output.
 */

const { z } = require('zod');
const EventEmitter = require('events');
const { getModel, getModelMeta } = require('../../config/llm');
const { insightPrompt, chartPrompt, buildInsightInputs, buildChartInputs, CATEGORY_INSIGHT_GUIDANCE, DEFAULT_INSIGHT_GUIDANCE } = require('../../prompts/present');
const {
  INSIGHT_MAX_TOKENS,
  INSIGHT_TEMPERATURE,
  CHART_MAX_TOKENS,
  CHART_TEMPERATURE,
  INSIGHT_SAMPLE_ROWS,
  CHART_SAMPLE_ROWS,
} = require('../../config/constants');
const logger = require('../../utils/logger');

const _presentEvents = new EventEmitter();

const AxisSchema = z.object({
  key: z.string(),
  label: z.string(),
});

const SingleChartSchema = z.object({
  chartType: z.enum(['bar', 'stacked_bar', 'line', 'pie', 'area', 'scatter']),
  title: z.string().default(''),
  xAxis: z.union([z.string(), AxisSchema]),
  yAxis: z.union([
    z.string(),
    AxisSchema,
    z.array(z.union([z.string(), AxisSchema])),
  ]),
  series: z.array(z.string()).default([]),
  groupBy: z.string().nullable().default(null),
  aggregation: z.string().nullable().default(null),
  reasoning: z.string().default(''),
});

const ChartResponseSchema = z.object({
  chartType: z.enum(['bar', 'stacked_bar', 'line', 'pie', 'area', 'scatter']).nullable().default(null),
  title: z.string().nullable().default(null),
  xAxis: z.union([z.string(), AxisSchema]).nullable().default(null),
  yAxis: z.union([
    z.string(),
    AxisSchema,
    z.array(z.union([z.string(), AxisSchema])),
  ]).nullable().default(null),
  series: z.union([z.string(), z.array(z.string())]).nullable().default(null),
  groupBy: z.string().nullable().default(null),
  aggregation: z.string().nullable().default(null),
  reasoning: z.string().default(''),
  charts: z.array(SingleChartSchema).nullable().default(null),
});

function sampleRows(rows, limit) {
  if (rows.length <= limit) return rows;
  const step = Math.floor(rows.length / limit);
  return rows.filter((_, i) => i % step === 0).slice(0, limit);
}

/**
 * Parse follow-up questions from the LLM insight output.
 * Handles multiple format variations the LLM might use:
 *   "**Suggested Follow-Up Questions:**", "## Suggested Follow-Up Questions",
 *   "Suggested follow-up questions:", "Follow-Up Questions:", etc.
 */
function parseFollowUps(insightText) {
  if (!insightText) return { cleanedInsights: '', followUps: [] };

  const markers = [
    /#{1,3}\s*Suggested Follow[- ]?Up Questions:?/i,
    /\*{0,2}Suggested Follow[- ]?Up Questions:?\*{0,2}/i,
    /#{1,3}\s*Follow[- ]?Up Questions:?/i,
    /\*{0,2}Follow[- ]?Up Questions:?\*{0,2}/i,
    /#{1,3}\s*Next Questions:?/i,
    /\*{0,2}Next Questions:?\*{0,2}/i,
  ];

  let match = null;
  for (const marker of markers) {
    match = insightText.match(marker);
    if (match) break;
  }

  if (!match) {
    logger.debug('parseFollowUps: no follow-up marker found in LLM output', {
      outputLength: insightText.length,
      tail: insightText.slice(-200),
    });
    return { cleanedInsights: insightText, followUps: [] };
  }

  const splitIdx = match.index;
  const cleanedInsights = insightText.substring(0, splitIdx).trim();
  const followUpSection = insightText.substring(splitIdx + match[0].length).trim();

  const followUps = followUpSection
    .split('\n')
    .map((line) => line
      .replace(/^\d+[.)]\s*/, '')
      .replace(/^[-*•]\s*/, '')
      .replace(/^\*{1,2}(.*?)\*{1,2}$/, '$1')
      .replace(/^[""\u201C]|[""\u201D]$/g, '')
      .trim())
    .filter((line) => line.length > 5 && !line.startsWith('#'));

  logger.debug('parseFollowUps: parsed', { followUpCount: followUps.length, followUps });

  return { cleanedInsights, followUps };
}

function normalizeAxis(val) {
  if (typeof val === 'string') return { key: val, label: val };
  return val;
}

function normalizeYAxis(val) {
  if (Array.isArray(val)) return val.map((v) => (typeof v === 'string' ? { key: v, label: v } : v));
  if (typeof val === 'string') return [{ key: val, label: val }];
  if (val && typeof val === 'object') return [val];
  return [];
}

function buildChartOutput(raw) {
  if (raw.charts && Array.isArray(raw.charts)) {
    return {
      reasoning: raw.reasoning || '',
      charts: raw.charts.map((c) => ({
        ...c,
        xAxis: normalizeAxis(c.xAxis),
        yAxis: normalizeYAxis(c.yAxis),
      })),
    };
  }
  return {
    reasoning: raw.reasoning || '',
    charts: [{
      chartType: raw.chartType,
      title: raw.title || '',
      xAxis: normalizeAxis(raw.xAxis),
      yAxis: normalizeYAxis(raw.yAxis),
      series: raw.series ? (Array.isArray(raw.series) ? raw.series : [raw.series]) : [],
      groupBy: raw.groupBy || null,
      aggregation: raw.aggregation || null,
    }],
  };
}

function buildPartialResultsNote(allQueries) {
  const failedOrEmpty = allQueries.filter(
    (q) => !q.execution?.success || (q.execution?.rowCount ?? 0) === 0,
  );
  if (failedOrEmpty.length === 0) return { note: '', summary: null };
  const succeeded = allQueries.length - failedOrEmpty.length;
  const parts = failedOrEmpty.map((q) => {
    const err = q.execution?.error || '';
    const reason = err
      ? `${q.id}: ${(err.length > 80 ? err.substring(0, 80) + '...' : err)}`
      : `${q.id}: no data returned`;
    return reason;
  });
  const summary = `${succeeded} of ${allQueries.length} sub-queries returned data. ${failedOrEmpty.length} failed or empty: ${parts.join('; ')}`;
  const note = `Note: ${summary}\n\nInsights below are based only on the sub-queries that returned data. Interpret and caveat accordingly.\n\n`;
  return { note, summary };
}

function buildMultiQueryInsightInputs(state, allQueries) {
  const category = state.questionCategory || '';
  const blueprintHint = state.blueprintMeta?.presentationHint || '';
  const guidance = blueprintHint || CATEGORY_INSIGHT_GUIDANCE[category] || DEFAULT_INSIGHT_GUIDANCE;

  const { note: partialResultsNote, summary: _partialSummary } = buildPartialResultsNote(allQueries);

  let dataSection = '';
  for (const q of allQueries) {
    const exec = q.execution;
    if (!exec?.success || !exec.rows?.length) continue;
    const sample = sampleRows(exec.rows, Math.max(5, Math.floor(INSIGHT_SAMPLE_ROWS / allQueries.length)));
    dataSection += `\n--- Sub-query [${q.id}]: "${q.subQuestion}" (${q.purpose}) ---\n`;
    dataSection += `Columns: ${(exec.columns || []).join(', ')}\n`;
    dataSection += `Total rows: ${exec.rowCount}\n`;
    dataSection += `Sample (${sample.length} rows):\n${JSON.stringify(sample, null, 2)}\n`;
  }

  return {
    partialResultsNote: partialResultsNote || '',
    question: state.question,
    questionCategory: category || 'GENERAL',
    questionSubCategory: state.questionSubCategory || 'general',
    categoryGuidance: guidance,
    columns: 'See sub-query results below',
    rowCount: String(allQueries.reduce((sum, q) => sum + (q.execution?.rowCount || 0), 0)),
    sampleCount: 'multiple',
    sampleData: dataSection,
  };
}

async function presentNode(state) {
  const presentStart = Date.now();
  const exec = state.execution;

  const plan = state.queryPlan || [];
  const isMultiQuery = plan.length > 1;

  let allQueries = [...(state.queries || [])];
  if (exec?.success && exec.rowCount > 0) {
    const idx = state.currentQueryIndex || 0;
    const currentPlanItem = plan[idx] || {};
    allQueries.push({
      id: currentPlanItem.id || `q${idx + 1}`,
      subQuestion: currentPlanItem.subQuestion || state.question,
      purpose: currentPlanItem.purpose || '',
      sql: state.sql || '',
      reasoning: state.reasoning || '',
      execution: exec,
    });
  }

  const hasAnyResults = allQueries.some((q) => q.execution?.success && q.execution?.rowCount > 0);
  if (!hasAnyResults) {
    return {
      queries: isMultiQuery ? allQueries : [],
      insights: '',
      chart: null,
      trace: [{ node: 'present', timestamp: Date.now(), skipped: true }],
    };
  }

  const mode = state.presentMode || 'full';
  const wantInsights = mode === 'full' || mode === 'insights';
  const wantChart = mode === 'full' || mode === 'chart';

  if (!wantInsights && !wantChart) {
    logger.debug('Present: skipped — presentMode is minimal');
    return {
      queries: isMultiQuery ? allQueries : [],
      insights: '',
      chart: null,
      trace: [{ node: 'present', timestamp: Date.now(), skipped: true, reason: 'minimal mode' }],
    };
  }

  const primaryExec = exec?.success ? exec : allQueries.find((q) => q.execution?.success)?.execution;
  const insightSample = wantInsights && !isMultiQuery ? sampleRows(primaryExec?.rows || [], INSIGHT_SAMPLE_ROWS) : [];
  const chartSample = wantChart ? sampleRows((primaryExec?.rows || []), CHART_SAMPLE_ROWS) : [];
  let insightModelMeta = null;
  let chartModelMeta = null;

  const insightPromise = wantInsights
    ? (async () => {
        const inputs = isMultiQuery
          ? buildMultiQueryInsightInputs(state, allQueries)
          : buildInsightInputs(state, insightSample);
        const messages = await insightPrompt.formatMessages(inputs);
        const model = getModel({
          maxTokens: isMultiQuery ? INSIGHT_MAX_TOKENS * 2 : INSIGHT_MAX_TOKENS,
          temperature: INSIGHT_TEMPERATURE,
          nodeKey: 'presentInsights',
        });
        insightModelMeta = getModelMeta(model);
        const stream = await model.stream(messages);
        let fullContent = '';
        for await (const chunk of stream) {
          const token = chunk.content ?? '';
          if (token) {
            fullContent += token;
            _presentEvents.emit('insight_token', {
              content: token,
              sessionId: state.sessionId || '',
            });
          }
        }
        return fullContent;
      })()
    : Promise.resolve('');

  const chartPromise = wantChart && primaryExec
    ? (async () => {
        const chartState = { ...state, execution: primaryExec };
        const messages = await chartPrompt.formatMessages(buildChartInputs(chartState, chartSample));
        const baseModel = getModel({
          maxTokens: CHART_MAX_TOKENS,
          temperature: CHART_TEMPERATURE,
          nodeKey: 'presentChart',
        });
        chartModelMeta = getModelMeta(baseModel);
        const model = baseModel.withStructuredOutput(ChartResponseSchema);
        try {
          const raw = await model.invoke(messages);
          return buildChartOutput(raw);
        } catch (err) {
          logger.warn('Present: chart structured output failed', { error: err.message });
          return null;
        }
      })()
    : Promise.resolve(null);

  const [insightsRaw, chart] = await Promise.all([insightPromise, chartPromise]);

  logger.debug('Present: raw insight output', {
    length: insightsRaw.length,
    tail: insightsRaw.slice(-300),
  });

  const { cleanedInsights, followUps } = parseFollowUps(insightsRaw);
  const resolvedChartType = chart?.charts?.[0]?.chartType || null;

  const blueprintFollowUps = state.blueprintMeta?.suggestedFollowUps || [];
  const finalFollowUps = followUps.length > 0 ? followUps : blueprintFollowUps;

  const partialResults = isMultiQuery ? buildPartialResultsNote(allQueries) : { summary: null };
  const partialResultsSummary = partialResults.summary || null;

  const blueprintLabel = state.blueprintId ? ` [blueprint: ${state.blueprintId}]` : '';
  const multiLabel = isMultiQuery ? ` (synthesizing ${allQueries.length} queries)` : '';
  logger.info(`[Present]${blueprintLabel}${multiLabel} ${cleanedInsights.length} chars insights, chart: ${resolvedChartType || 'none'}, ${finalFollowUps.length} follow-ups (${Date.now() - presentStart}ms)`);

  return {
    queries: isMultiQuery ? allQueries : [],
    insights: cleanedInsights,
    chart,
    suggestedFollowUps: finalFollowUps,
    partialResultsSummary,
    trace: [{
      node: 'present',
      timestamp: Date.now(),
      insightLength: cleanedInsights.length,
      chartType: resolvedChartType,
      followUpCount: followUps.length,
      mode,
      multiQuery: isMultiQuery,
      queryCount: allQueries.length,
      llm: {
        insights: insightModelMeta,
        chart: chartModelMeta,
      },
    }],
  };
}

module.exports = { presentNode, presentEvents: _presentEvents };
