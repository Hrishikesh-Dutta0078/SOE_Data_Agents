const { QUERY_RESULT_ROW_LIMIT } = require('../../config/constants');
const logger = require('../../utils/logger');

const NULL_RATIO_THRESHOLD = 0.8;

function computeNullRatios(rows, columns) {
  if (rows.length === 0) return {};
  const ratios = {};
  for (const col of columns) {
    const nullCount = rows.reduce((n, row) => n + (row[col] == null ? 1 : 0), 0);
    ratios[col] = nullCount / rows.length;
  }
  return ratios;
}

async function checkResultsNode(state) {
  const exec = state.execution;
  const warnings = [];
  let resultsSuspicious = false;
  const hasMultiQueryResults = (state.queries || []).length > 0;

  if (!exec || !exec.success) {
    if (hasMultiQueryResults) {
      return {
        warnings: [],
        resultsSuspicious: false,
        attempts: { ...state.attempts, resultCheck: (state.attempts?.resultCheck || 0) + 1 },
        trace: [{ node: 'checkResults', timestamp: Date.now(), skipped: true, reason: 'multi-query' }],
      };
    }
    return {
      warnings: ['Execution failed — cannot check results'],
      trace: [{ node: 'checkResults', timestamp: Date.now(), skipped: true, reason: 'execution failed' }],
    };
  }

  if (exec.rowCount === 0) {
    warnings.push('Query returned 0 rows — the result set is empty');
    resultsSuspicious = true;
  }

  if (exec.rowCount >= QUERY_RESULT_ROW_LIMIT) {
    warnings.push(`Results capped at ${QUERY_RESULT_ROW_LIMIT} rows for display. Use the dashboard view for full data exploration.`);
  }

  if (exec?.rows?.length > 0 && exec?.columns?.length > 0) {
    const nullRatios = computeNullRatios(exec.rows, exec.columns);
    const badCols = Object.entries(nullRatios)
      .filter(([, ratio]) => ratio > NULL_RATIO_THRESHOLD)
      .map(([col, ratio]) => `${col} (${(ratio * 100).toFixed(0)}% NULL)`);

    if (badCols.length > 0) {
      warnings.push(`High NULL ratio detected (possible bad join): ${badCols.join(', ')}`);
    }
  }

  const plan = state.queryPlan || [];
  const qIdx = state.currentQueryIndex || 0;
  const multiLabel = plan.length > 1 ? ` [Query ${qIdx + 1}/${plan.length}]` : '';
  const warningsSummary = warnings.length > 0 ? `: ${warnings.join('; ').substring(0, 200)}` : '';
  logger.info(`[CheckResults]${multiLabel} ${warnings.length} warning(s)${warningsSummary}`, { suspicious: resultsSuspicious });

  return {
    warnings,
    resultsSuspicious,
    attempts: { ...state.attempts, resultCheck: (state.attempts?.resultCheck || 0) + 1 },
    trace: [{
      node: 'checkResults',
      timestamp: Date.now(),
      warningCount: warnings.length,
      suspicious: resultsSuspicious,
    }],
  };
}

module.exports = { checkResultsNode };
