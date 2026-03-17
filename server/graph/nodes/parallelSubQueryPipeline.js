/**
 * Parallel Sub-Query Pipeline Node (Option A)
 *
 * Runs all sub-queries in parallel: for each index, subQueryMatch → research (or skip if template)
 * → sqlWriter → injectRls → validate → execute. Failed sub-queries get one correction pass
 * (correct → injectRls → validate → execute) in parallel. Merges results into state.queries
 * and sets currentQueryIndex = plan.length so the graph routes to checkResults → present/dashboard.
 */

const { findSubQueryMatch, findSubQueryMatchLLMFallback } = require('./subQueryMatch');
const { loadGoldIndex } = require('./classify');
const { researchAgentNode } = require('./researchAgent');
const { sqlWriterAgentNode } = require('./sqlWriterAgent');
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
    // Preserve request-level toggles so tool filtering is applied in researchAgent/sqlWriterAgent
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
  if (!match) match = await findSubQueryMatchLLMFallback(subQuestion);
  if (match && !hasUserParams) {
    // Exact template match with no user params — use gold SQL directly, skip writer + validation
    state = {
      ...state,
      sql: match.sql,
      templateSql: match.sql,
      subQueryMatchFound: true,
      researchBrief: null,
      matchType: 'exact',
      reasoning: `Direct template match: ${match.id}`,
      validationEnabled: false,
    };
    logger.info(`[ParallelPipeline] [${index + 1}/${total}] Template hit for "${subQuestion.substring(0, 60)}" → ${match.id} (using gold SQL directly)`);
  } else if (match && hasUserParams) {
    // Template match WITH user params — need research + writer to adapt the SQL with filters
    state = {
      ...state,
      templateSql: match.sql,
      subQueryMatchFound: true,
      matchType: 'partial',
    };
    logger.info(`[ParallelPipeline] [${index + 1}/${total}] Template hit for "${subQuestion.substring(0, 60)}" → ${match.id} (routing through writer for user params)`);

    emitProgress('research');
    const researchUpdate = await researchAgentNode(state);
    state = { ...state, ...researchUpdate };

    emitProgress('sql');
    const writerUpdate = await sqlWriterAgentNode(state);
    state = { ...state, ...writerUpdate };
  } else {
    // No template match — full research + writer path
    emitProgress('research');
    const researchUpdate = await researchAgentNode(state);
    state = { ...state, ...researchUpdate };
    if (!state.researchBrief) {
      logger.warn(`[ParallelPipeline] [${index + 1}/${total}] Research produced no brief, continuing anyway`);
    }

    emitProgress('sql');
    const writerUpdate = await sqlWriterAgentNode(state);
    state = { ...state, ...writerUpdate };
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
      researchBrief: state.researchBrief || null,
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
    researchBrief: state.researchBrief || null,
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

  // Build column reference once from the research brief
  let correctionColumnReference = '';
  const briefTables = previousResult.researchBrief?.tables || [];
  if (briefTables.length > 0) {
    const parts = briefTables
      .map((bt) => {
        const meta = bt.columnMetadata || '';
        if (!meta) return null;
        return `-- ${bt.name}:\n${meta}`;
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
      researchBrief: current.researchBrief || previousResult.researchBrief || null,
      correctionColumnReference,
      attempts: { ...baseState.attempts, correction: round - 1, reflection: 0, resultCheck: 0 },
      trace: lastState?.trace || [
        { node: 'execute', timestamp: Date.now(), success: false, error: execError || 'Unknown' },
      ],
    };

    const correctUpdate = await correctNode(state);
    state = { ...state, ...correctUpdate };
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
        researchBrief: state.researchBrief || previousResult.researchBrief || null,
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
      researchBrief: null,
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

  // Preserve request-level Haiku/tool toggles so researchAgent and sqlWriterAgent use them in multi-query flow
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
        researchBrief: null,
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
    researchBrief: null,
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
