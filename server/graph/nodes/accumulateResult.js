/**
 * AccumulateResult Node — Snapshots the current query result and advances to the next sub-query.
 *
 * Appends the current sql/execution/reasoning to the queries accumulator,
 * increments currentQueryIndex, and resets working fields for the next iteration.
 */

const logger = require('../../utils/logger');

const EventEmitter = require('events');
const _accumulateEvents = new EventEmitter();

async function accumulateResultNode(state) {
  const idx = state.currentQueryIndex || 0;
  const plan = state.queryPlan || [];
  const currentPlanItem = plan[idx] || {};
  const nextIdx = idx + 1;
  const total = plan.length;

  const snapshot = {
    id: currentPlanItem.id || `q${idx + 1}`,
    subQuestion: currentPlanItem.subQuestion || state.question,
    purpose: currentPlanItem.purpose || '',
    sql: state.sql || '',
    reasoning: state.reasoning || '',
    execution: state.execution || null,
  };

  logger.info(`[Loop] Completed query ${idx + 1}/${total}: "${snapshot.subQuestion.substring(0, 80)}"`, {
    rows: snapshot.execution?.rowCount ?? 0,
    success: snapshot.execution?.success ?? false,
  });

  if (nextIdx < total) {
    const nextItem = plan[nextIdx];
    logger.info(`[Loop] Next: query ${nextIdx + 1}/${total}: "${nextItem.subQuestion.substring(0, 80)}"`);
  }

  _accumulateEvents.emit('query_progress', {
    queryIndex: idx,
    total,
    subQuestion: snapshot.subQuestion,
    status: 'completed',
    nextSubQuestion: nextIdx < total ? plan[nextIdx]?.subQuestion : null,
    sessionId: state.sessionId || '',
  });

  return {
    queries: [snapshot],
    currentQueryIndex: nextIdx,
    sql: '',
    reasoning: '',
    execution: null,
    researchBrief: null,
    researchToolCalls: [],
    validationReport: null,
    errorType: '',
    validationMeta: null,
    resultsSuspicious: false,
    diagnostics: null,
    reflectionFeedback: '',
    reflectionCorrectedSql: null,
    templateSql: '',
    subQueryMatchFound: false,
    attempts: {
      ...(state.attempts || {}),
      correction: 0,
      reflection: 0,
      resultCheck: 0,
    },
    trace: [{
      node: 'accumulateResult',
      timestamp: Date.now(),
      queryIndex: idx,
      nextQueryIndex: nextIdx,
      totalQueries: total,
      snapshotId: snapshot.id,
    }],
  };
}

module.exports = { accumulateResultNode, accumulateEvents: _accumulateEvents };
