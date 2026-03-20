/**
 * Parallel Sub-Query Pipeline Node (Option A)
 *
 * Runs all sub-queries in parallel: for each index, subQueryMatch → contextFetch → generateSql
 * → injectRls → validate → execute. Failed sub-queries get one correction pass
 * (correct → generateSql → injectRls → validate → execute) in parallel. Merges results into state.queries
 * and sets currentQueryIndex = plan.length so the graph routes to checkResults → present/dashboard.
 */

const { findSubQueryMatch, findSubQueryMatchLLMFallback } = require('./subQueryMatch');
const { loadGoldIndex } = require('./classify');
const { contextFetchNode } = require('./contextFetch');
const { generateSqlNode } = require('./generateSql');
const { injectRlsNode } = require('./injectRls');
const { validateNode } = require('./validate');
const { executeNode } = require('./execute');
const { correctNode } = require('./correct');
const { PARALLEL_CORRECTION_ROUNDS } = require('../../config/constants');
const logger = require('../../utils/logger');

const EventEmitter = require('events');
const _parallelPipelineEvents = new EventEmitter();

function buildStateSlice(baseState, plan, index) {
  const item = plan[index] || {};
  return {
    ...baseState,
    question: item.subQuestion || baseState.question,
    queryPlan: plan,
    currentQueryIndex: index,
    queries: [],
    questionCategory: baseState.questionCategory,
    questionSubCategory: baseState.questionSubCategory,
    attempts: { ...baseState.attempts, correction: 0, reflection: 0, resultCheck: 0 },
    // Preserve request-level toggles so tool filtering is applied in contextFetch/generateSql
    enabledTools: baseState.enabledTools,
    nodeModelOverrides: baseState.nodeModelOverrides,
  };
}

async function runOneSubQuery(baseState, plan, index, emit) {
  const total = plan.length;
  const item = plan[index] || {};
  const id = item.id || `q${index + 1}`;
  const subQuestion = item.subQuestion || baseState.question;
  const purpose = item.purpose || '';

  const emitProgress = (stage) => {
    if (emit) {
      _parallelPipelineEvents.emit('parallel_subquery_progress', {
        sessionId: baseState.sessionId || '',
        index,
        total,
        stage,
      });
    }
  };

  let state = buildStateSlice(baseState, plan, index);

  // Check if blueprint has user-supplied parameters (e.g., "for EMEA", "Q2")
  // that require the SQL writer to adapt template SQL with additional filters.
  const hasUserParams = !!(baseState.blueprintMeta?.userParams);

  let match = null;
  if (item.templateId) {
    const { examplesMap } = loadGoldIndex();
    const example = examplesMap.get(item.templateId);
    if (example?.sql) {
      match = { id: item.templateId, sql: example.sql, score: null };
      logger.info(`[ParallelPipeline] [${index + 1}/${total}] Direct templateId resolve: ${item.templateId}`);
    }
  }
  if (!match) match = findSubQueryMatch(subQuestion);
  if (!match) match = await findSubQueryMatchLLMFallback(subQuestion, state);
  if (match && !hasUserParams) {
    // Exact template match with no user params — run through contextFetch + generateSql with template
    state = {
      ...state,
      templateSql: match.sql,
      subQueryMatchFound: true,
      matchType: 'template',
    };
    logger.info(`[ParallelPipeline] [${index + 1}/${total}] Template hit for "${subQuestion.substring(0, 60)}" → ${match.id} (template match, routing to contextFetch + generateSql)`);

    emitProgress('research');
    const contextResult = await contextFetchNode(state);
    Object.assign(state, contextResult);
    emitProgress('sql');
    const sqlResult = await generateSqlNode(state);
    Object.assign(state, sqlResult);
  } else if (match && hasUserParams) {
    state = {
      ...state,
      templateSql: match.sql,
      subQueryMatchFound: true,
      matchType: 'partial',
    };
    logger.info(`[ParallelPipeline] [${index + 1}/${total}] Template hit for "${subQuestion.substring(0, 60)}" → ${match.id} (partial match with user params, routing to contextFetch + generateSql)`);

    emitProgress('research');
    const contextResult = await contextFetchNode(state);
    Object.assign(state, contextResult);
    emitProgress('sql');
    const sqlResult = await generateSqlNode(state);
    Object.assign(state, sqlResult);
  } else {
    // No template match — full contextFetch + generateSql path
    emitProgress('research');
    const contextResult = await contextFetchNode(state);
    Object.assign(state, contextResult);
    if (!state.contextBundle) {
      logger.warn(`[ParallelPipeline] [${index + 1}/${total}] contextFetch produced no bundle, continuing anyway`);
    }

    emitProgress('sql');
    const sqlResult = await generateSqlNode(state);
    Object.assign(state, sqlResult);
  }

  if (!state.sql) {
    logger.warn(`[ParallelPipeline] [${index + 1}/${total}] No SQL produced`);
    return {
      id,
      subQuestion,
      purpose,
      sql: '',
      reasoning: state.reasoning || '',
      execution: { success: false, rowCount: 0, columns: [], rows: [], error: 'No SQL produced' },
      validationReport: null,
      errorType: '',
      contextBundle: state.contextBundle || null,
    };
  }

  const rlsUpdate = await injectRlsNode(state);
  state = { ...state, ...rlsUpdate };

  if (state.validationEnabled !== false) {
    const validateUpdate = await validateNode(state);
    state = { ...state, ...validateUpdate };
  }

  emitProgress('execute');
  const execUpdate = await executeNode(state);
  state = { ...state, ...execUpdate };

  const result = {
    id,
    subQuestion,
    purpose,
    sql: state.sql || '',
    reasoning: state.reasoning || '',
    execution: state.execution || { success: false, rowCount: 0, columns: [], rows: [], error: 'No execution' },
    validationReport: state.validationReport || null,
    errorType: state.errorType || '',
    contextBundle: state.contextBundle || null,
  };

  if (emit) {
    _parallelPipelineEvents.emit('subquery_result', {
      sessionId: baseState.sessionId || '',
      index,
      total,
      result: {
        id,
        subQuestion,
        purpose,
        sql: state.sql || '',
        execution: state.execution || null,
      },
    });
  }

  return result;
}

/**
 * Correction loop for a single sub-query: (correct → injectRls → validate → execute) × up to maxRounds.
 * Retries if the corrected SQL still fails, feeding the new error back each round.
 */
async function runOneSubQueryCorrection(baseState, plan, index, previousResult, emit, maxRounds = PARALLEL_CORRECTION_ROUNDS) {
  const total = plan.length;
  const item = plan[index] || {};
  const id = item.id || `q${index + 1}`;
  const subQuestion = item.subQuestion || baseState.question;
  const purpose = item.purpose || '';

  if (emit) {
    _parallelPipelineEvents.emit('parallel_subquery_progress', {
      sessionId: baseState.sessionId || '',
      index,
      total,
      stage: 'correct',
    });
  }

  // Build column reference once from the context bundle
  let correctionColumnReference = '';
  const bundleColMeta = previousResult.contextBundle?.columnMetadata || {};
  const colMetaEntries = Object.entries(bundleColMeta);
  if (colMetaEntries.length > 0) {
    const parts = colMetaEntries
      .map(([tableName, meta]) => {
        if (!meta) return null;
        return `-- ${tableName}:\n${meta}`;
      })
      .filter(Boolean);
    if (parts.length > 0) {
      correctionColumnReference = parts.join('\n\n');
    }
  }

  let current = previousResult;
  let lastState = null;

  for (let round = 1; round <= maxRounds; round++) {
    const execError = current.execution?.error || '';
    const errorType = current.errorType || 'EXECUTION_ERROR';
    logger.info(`[ParallelPipeline] [${index + 1}/${total}] Correction round ${round}/${maxRounds}`, {
      errorType,
      errorPreview: (execError || 'validation failed').substring(0, 120),
    });

    let state = buildStateSlice(baseState, plan, index);
    state = {
      ...state,
      sql: current.sql || '',
      reasoning: current.reasoning || '',
      validationReport: current.validationReport || null,
      errorType,
      contextBundle: current.contextBundle || previousResult.contextBundle || null,
      correctionColumnReference,
      attempts: { ...baseState.attempts, correction: round - 1, reflection: 0, resultCheck: 0 },
      trace: lastState?.trace || [
        { node: 'execute', timestamp: Date.now(), success: false, error: execError || 'Unknown' },
      ],
    };

    const correctionResult = await correctNode(state);
    Object.assign(state, correctionResult);
    const regenResult = await generateSqlNode(state);
    Object.assign(state, regenResult);
    if (!state.sql) {
      logger.warn(`[ParallelPipeline] [${index + 1}/${total}] Correction round ${round} produced no SQL`);
      break;
    }

    const rlsUpdate = await injectRlsNode(state);
    state = { ...state, ...rlsUpdate };
    if (state.validationEnabled !== false) {
      const validateUpdate = await validateNode(state);
      state = { ...state, ...validateUpdate };
    }
    const execUpdate = await executeNode(state);
    state = { ...state, ...execUpdate };
    lastState = state;

    if (state.execution?.success) {
      logger.info(`[ParallelPipeline] [${index + 1}/${total}] Correction recovered on round ${round}`);
      return {
        id,
        subQuestion,
        purpose,
        sql: state.sql || '',
        reasoning: state.reasoning || '',
        execution: state.execution,
        validationReport: state.validationReport || null,
        contextBundle: state.contextBundle || previousResult.contextBundle || null,
      };
    }

    // Feed the new error back for the next round
    current = {
      ...current,
      sql: state.sql || current.sql,
      reasoning: state.reasoning || current.reasoning,
      execution: state.execution,
      validationReport: state.validationReport || null,
      errorType: state.errorType || errorType,
    };
  }

  logger.warn(`[ParallelPipeline] [${index + 1}/${total}] Correction exhausted ${maxRounds} rounds`, {
    errorPreview: (lastState?.execution?.error || current.execution?.error || '').substring(0, 120),
  });

  return {
    id,
    subQuestion,
    purpose,
    sql: lastState?.sql || current.sql || '',
    reasoning: lastState?.reasoning || current.reasoning || '',
    execution: lastState?.execution || current.execution || previousResult.execution,
  };
}

async function parallelSubQueryPipelineNode(state) {
  const start = Date.now();
  const plan = state.queryPlan || [];
  const total = plan.length;

  if (total <= 0) {
    logger.warn('[ParallelPipeline] No query plan, returning empty queries');
    return {
      queries: [],
      currentQueryIndex: 0,
      sql: '',
      reasoning: '',
      execution: null,
      contextBundle: null,
      templateSql: '',
      subQueryMatchFound: false,
      trace: [{ node: 'parallelSubQueryPipeline', timestamp: start, duration: Date.now() - start, error: 'No plan' }],
    };
  }

  logger.info(`[ParallelPipeline] Starting parallel pipeline for ${total} sub-queries`);
  _parallelPipelineEvents.emit('parallel_pipeline_start', {
    sessionId: state.sessionId || '',
    total,
  });

  // Preserve request-level tool toggles so contextFetch and generateSql use them in multi-query flow
  const baseState = {
    ...state,
    queries: [],
    enabledTools: state.enabledTools,
    nodeModelOverrides: state.nodeModelOverrides,
  };
  const emit = true;
  const promises = plan.map((_, index) =>
    runOneSubQuery(baseState, plan, index, emit).catch((err) => {
      const item = plan[index] || {};
      logger.error(`[ParallelPipeline] [${index + 1}/${total}] Sub-query crashed`, { error: err.message });
      return {
        id: item.id || `q${index + 1}`,
        subQuestion: item.subQuestion || baseState.question,
        purpose: item.purpose || '',
        sql: '',
        reasoning: '',
        execution: { success: false, rowCount: 0, columns: [], rows: [], error: err.message },
        validationReport: null,
        errorType: 'EXECUTION_ERROR',
        contextBundle: null,
      };
    })
  );
  let results = await Promise.all(promises);

  const failedIndices = results
    .map((r, i) => (!r.execution?.success && r.sql?.trim() ? i : null))
    .filter((i) => i != null);
  if (failedIndices.length > 0 && PARALLEL_CORRECTION_ROUNDS > 0) {
    logger.info(`[ParallelPipeline] Correction pass: ${failedIndices.length} failed sub-queries (indices ${failedIndices.join(', ')})`, {
      errors: failedIndices.map((i) => ({
        index: i,
        errorType: results[i].errorType || 'EXECUTION_ERROR',
        errorPreview: (results[i].execution?.error || '').substring(0, 80),
      })),
    });
    _parallelPipelineEvents.emit('parallel_correction_start', {
      sessionId: state.sessionId || '',
      total: failedIndices.length,
    });
    const correctionPromises = failedIndices.map((index) =>
      runOneSubQueryCorrection(baseState, plan, index, results[index], emit).catch((err) => {
        logger.error(`[ParallelPipeline] [${index + 1}/${total}] Correction crashed`, { error: err.message });
        return results[index];
      })
    );
    const corrected = await Promise.all(correctionPromises);
    const resultByIndex = [...results];
    failedIndices.forEach((index, i) => {
      resultByIndex[index] = corrected[i];
    });
    results = resultByIndex;
    const correctedSuccess = corrected.filter((r) => r.execution?.success).length;
    logger.info(`[ParallelPipeline] Correction complete: ${correctedSuccess}/${failedIndices.length} recovered`, {
      recovered: correctedSuccess,
      totalFailed: failedIndices.length,
    });
    _parallelPipelineEvents.emit('parallel_correction_complete', {
      sessionId: state.sessionId || '',
      total: failedIndices.length,
      recovered: correctedSuccess,
    });
  }

  const duration = Date.now() - start;
  logger.info(`[ParallelPipeline] Completed ${total} sub-queries in ${duration}ms`);

  _parallelPipelineEvents.emit('parallel_pipeline_complete', {
    sessionId: state.sessionId || '',
    total,
    duration,
  });

  // Surface the first successful sub-query execution so the client can render charts/tables
  const primaryResult = results.find((r) => r.execution?.success && r.execution?.rowCount > 0);

  return {
    queries: results,
    currentQueryIndex: total,
    sql: primaryResult?.sql || '',
    reasoning: primaryResult?.reasoning || '',
    execution: primaryResult?.execution || null,
    contextBundle: null,
    correctionGuidance: null,
    researchToolCalls: [],
    validationReport: null,
    errorType: '',
    validationMeta: null,
    resultsSuspicious: false,
    diagnostics: null,
    templateSql: '',
    subQueryMatchFound: false,
    attempts: state.attempts || {},
    trace: [{
      node: 'parallelSubQueryPipeline',
      timestamp: start,
      duration,
      totalQueries: total,
      successCount: results.filter((r) => r.execution?.success).length,
    }],
  };
}

module.exports = {
  parallelSubQueryPipelineNode,
  parallelPipelineEvents: _parallelPipelineEvents,
};
