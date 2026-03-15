/**
 * Dashboard Agent Node — LLM-powered dashboard layout planner.
 *
 * Receives conversation data (Path A) or fresh query results (Path B)
 * and produces a structured dashboard specification with tiles, slicers,
 * and react-grid-layout positions.
 */

const EventEmitter = require('events');
const { z } = require('zod');
const { getModel, getModelMeta } = require('../../config/llm');
const { dashboardPrompt, dashboardRefinePrompt, buildDashboardInputs } = require('../../prompts/dashboard');
const logger = require('../../utils/logger');
const { DASHBOARD_MAX_TOKENS, DASHBOARD_TEMPERATURE } = require('../../config/constants');

const _dashboardEvents = new EventEmitter();

const LayoutSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  minW: z.number().optional(),
  minH: z.number().optional(),
});

const SlicerSchema = z.object({
  id: z.string(),
  dimension: z.string(),
  values: z.array(z.string()),
  defaultValue: z.string().nullable().default(null),
});

const TileSchema = z.object({
  id: z.string(),
  type: z.enum(['kpi', 'chart', 'table', 'insight']),
  title: z.string(),
  sourceIndex: z.number(),
  config: z.record(z.any()),
  layout: LayoutSchema,
  filterDimensions: z.array(z.string()).default([]),
});

const DashboardSpecSchema = z.object({
  title: z.string(),
  description: z.string().default(''),
  slicers: z.array(SlicerSchema).default([]),
  tiles: z.array(TileSchema),
});

function countUsableDataSources(state) {
  if (state.dashboardHasDataRequest) {
    const queries = state.queries || [];
    const successQueries = queries.filter((q) => q.execution?.success);
    const hasCurrentExecution = state.execution?.success && state.execution?.rows?.length > 0;
    return successQueries.length + (hasCurrentExecution ? 1 : 0);
  }

  const history = state.conversationHistory || [];
  return history.filter(
    (msg) => msg.role === 'assistant' && (msg.sql || msg.resultSummary),
  ).length;
}

async function dashboardAgentNode(state) {
  const start = Date.now();
  const isRefinement = !!(state.previousDashboardSpec && state.dashboardRefinement);
  logger.stage('D', 'DashboardAgent', isRefinement ? 'refining dashboard' : 'planning dashboard layout');

  if (!isRefinement) {
    const sourceCount = countUsableDataSources(state);

    if (sourceCount === 0) {
      const duration = Date.now() - start;
      const reason = state.dashboardHasDataRequest
        ? 'All queries failed or returned no data.'
        : 'No query results found in the conversation.';

      logger.info(`DashboardAgent: no usable data (${duration}ms)`);
      return {
        dashboardSpec: {
          title: 'No Data Available',
          description: reason,
          slicers: [],
          tiles: [],
        },
        trace: [{ node: 'dashboardAgent', timestamp: start, duration, skipped: true, reason: 'no_data' }],
      };
    }

    _dashboardEvents.emit('dashboard_progress', {
      sessionId: state.sessionId,
      status: 'planning',
      sourceCount,
    });
  } else {
    _dashboardEvents.emit('dashboard_progress', {
      sessionId: state.sessionId,
      status: 'refining',
      sourceCount: (state.dashboardDataSources || []).length,
    });
  }

  const inputs = buildDashboardInputs(state);
  const prompt = inputs.isRefinement ? dashboardRefinePrompt : dashboardPrompt;
  const messages = await prompt.formatMessages(inputs);

  const baseModel = getModel({
    temperature: DASHBOARD_TEMPERATURE,
    maxTokens: DASHBOARD_MAX_TOKENS,
    nodeKey: 'dashboardAgent',
  });
  const llmMeta = getModelMeta(baseModel);
  const model = baseModel.withStructuredOutput(DashboardSpecSchema);

  let spec;
  try {
    spec = await model.invoke(messages);
  } catch (err) {
    logger.warn('DashboardAgent structured output failed, building fallback', { error: err.message });
    if (isRefinement) {
      spec = state.previousDashboardSpec;
    } else {
      spec = buildFallbackSpec(state, countUsableDataSources(state));
    }
  }

  spec = validateAndFixSpec(spec, state, isRefinement);

  const duration = Date.now() - start;
  logger.info(`[DashboardAgent] ${spec.tiles.length} tiles, ${spec.slicers.length} slicers${isRefinement ? ' (refinement)' : ''} (${duration}ms)`);

  _dashboardEvents.emit('dashboard_progress', {
    sessionId: state.sessionId,
    status: 'ready',
    tileCount: spec.tiles.length,
  });

  return {
    dashboardSpec: spec,
    trace: [{
      node: 'dashboardAgent',
      timestamp: start,
      duration,
      tileCount: spec.tiles.length,
      slicerCount: spec.slicers.length,
      sourceCount: isRefinement ? (state.dashboardDataSources || []).length : countUsableDataSources(state),
      isRefinement,
      llm: llmMeta,
    }],
  };
}

function getSourceColumns(state, sourceIndex, isRefinement) {
  if (isRefinement) {
    const src = (state.dashboardDataSources || [])[sourceIndex];
    return src?.execution?.columns || [];
  }
  if (state.dashboardHasDataRequest) {
    const queries = state.queries || [];
    const q = queries[sourceIndex];
    if (q?.execution?.columns) return q.execution.columns;
    if (sourceIndex === queries.length && state.execution?.columns) return state.execution.columns;
    return [];
  }
  return [];
}

function getSourceCount(state, isRefinement) {
  if (isRefinement) return (state.dashboardDataSources || []).length;
  return countUsableDataSources(state);
}

function findClosestColumn(target, columns) {
  if (!target || !columns.length) return null;
  const lower = target.toLowerCase();
  const exact = columns.find((c) => c.toLowerCase() === lower);
  if (exact) return exact;
  const partial = columns.find((c) => c.toLowerCase().includes(lower) || lower.includes(c.toLowerCase()));
  return partial || null;
}

function validateAndFixSpec(spec, state, isRefinement) {
  const totalSources = getSourceCount(state, isRefinement);
  let fixCount = 0;

  const validTiles = spec.tiles.filter((tile) => {
    if (tile.sourceIndex >= totalSources || tile.sourceIndex < 0) {
      if (totalSources > 0) {
        tile.sourceIndex = 0;
        fixCount++;
      } else {
        logger.warn(`Validation: removing tile "${tile.title}" — sourceIndex ${tile.sourceIndex} out of bounds`);
        return false;
      }
    }

    const columns = getSourceColumns(state, tile.sourceIndex, isRefinement);
    if (columns.length === 0) return true;

    if (tile.type === 'kpi' && tile.config?.valueColumn) {
      if (!columns.includes(tile.config.valueColumn)) {
        const fix = findClosestColumn(tile.config.valueColumn, columns);
        if (fix) {
          logger.info(`Validation: fixed KPI column "${tile.config.valueColumn}" -> "${fix}"`);
          tile.config.valueColumn = fix;
          fixCount++;
        }
      }
    }

    if (tile.type === 'chart') {
      const xKey = tile.config?.xAxis?.key || tile.config?.xAxis;
      if (xKey && !columns.includes(xKey)) {
        const fix = findClosestColumn(xKey, columns);
        if (fix) {
          if (typeof tile.config.xAxis === 'object') tile.config.xAxis.key = fix;
          else tile.config.xAxis = { key: fix, label: fix };
          fixCount++;
        }
      }
      const yAxes = Array.isArray(tile.config?.yAxis) ? tile.config.yAxis : [];
      for (const yEntry of yAxes) {
        const yKey = typeof yEntry === 'string' ? yEntry : yEntry?.key;
        if (yKey && !columns.includes(yKey)) {
          const fix = findClosestColumn(yKey, columns);
          if (fix) {
            if (typeof yEntry === 'object') yEntry.key = fix;
            fixCount++;
          }
        }
      }
    }

    return true;
  });

  if (fixCount > 0) {
    logger.info(`Validation: applied ${fixCount} auto-fix(es) to dashboard spec`);
  }

  return { ...spec, tiles: validTiles };
}

function buildFallbackSpec(state, sourceCount) {
  const tiles = [];
  let y = 0;

  if (state.dashboardHasDataRequest) {
    const queries = state.queries || [];
    for (let i = 0; i < queries.length; i++) {
      const q = queries[i];
      if (!q.execution?.success) continue;
      tiles.push({
        id: `tile-${tiles.length + 1}`,
        type: 'table',
        title: q.subQuestion || `Query ${i + 1}`,
        sourceIndex: i,
        config: {
          columns: q.execution.columns || [],
          maxRows: 20,
        },
        layout: { x: 0, y, w: 12, h: 4 },
        filterDimensions: [],
      });
      y += 4;
    }
  }

  return {
    title: 'Dashboard',
    description: `Auto-generated from ${sourceCount} data source(s).`,
    slicers: [],
    tiles,
  };
}

module.exports = { dashboardAgentNode, dashboardEvents: _dashboardEvents };
