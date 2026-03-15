const { executeQuery } = require('../../services/queryExecutor');
const { addQueryToSession } = require('../../memory/sessionMemory');
const logger = require('../../utils/logger');

async function executeNode(state) {
  const start = Date.now();
  const result = await executeQuery(state.sql);

  if (result.success && state.sessionId) {
    addQueryToSession(state.sessionId, {
      question: state.question,
      sql: state.sql,
      rowCount: result.rowCount,
      columns: result.columns || [],
      entities: state.entities || null,
      researchBrief: state.researchBrief || null,
      questionCategory: state.questionCategory || null,
      timestamp: Date.now(),
    });
  }

  const plan = state.queryPlan || [];
  const qIdx = state.currentQueryIndex || 0;
  const multiLabel = plan.length > 1 ? ` [Query ${qIdx + 1}/${plan.length}]` : '';
  if (result.success) {
    logger.info(`[Execute]${multiLabel} ${result.rowCount} rows returned (${Date.now() - start}ms), columns: ${(result.columns || []).join(', ')}`);
  } else {
    logger.info(`[Execute]${multiLabel} FAILED (${Date.now() - start}ms): ${(result.error || '').substring(0, 150)}`);
  }

  const duration = Date.now() - start;
  const update = {
    execution: result,
    trace: [{
      node: 'execute',
      timestamp: Date.now(),
      duration,
      success: result.success,
      rowCount: result.rowCount,
      error: result.error || null,
    }],
  };

  if (!result.success && result.error) {
    const isSchemaError = /Invalid column name|Invalid object name/i.test(result.error);
    update.errorType = isSchemaError ? 'SCHEMA_ERROR' : 'EXECUTION_ERROR';
    update.validationReport = {
      overall_valid: false,
      passes: {
        rls: { passed: true, issues: [] },
        syntax: { passed: false, issues: [{ type: 'EXECUTION_ERROR', severity: 'error', description: result.error }] },
        semantic: { passed: true, issues: [] },
      },
    };
  }

  return update;
}

module.exports = { executeNode };
