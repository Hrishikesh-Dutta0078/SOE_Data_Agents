/**
 * Correct Node — lightweight error analyzer (no LLM call).
 *
 * Analyzes validation/execution errors, builds error-specific guidance,
 * and routes to generateSql for the actual fix.
 */
const { buildCorrectionGuidance, extractTableNames } = require('../../utils/correctionAnalyzer');
const { getColumnMetadataForTable } = require('../../vectordb/schemaFetcher');
const { ERROR_STRATEGIES } = require('../../prompts/correct');
const logger = require('../../utils/logger');

async function correctNode(state) {
  const start = Date.now();

  const errorType = state.errorType || 'SYNTAX_ERROR';
  const previousCorrectionAttempts = state.attempts?.correction || 0;

  const plan = state.queryPlan || [];
  const qIdx = state.currentQueryIndex || 0;
  const multiLabel = plan.length > 1 ? ` [Query ${qIdx + 1}/${plan.length}]` : '';

  logger.info(`[Correct]${multiLabel} Analyzing ${errorType}, attempt ${previousCorrectionAttempts + 1}`, {
    errorType,
    attempt: previousCorrectionAttempts + 1,
    sqlLength: (state.sql || '').length,
  });

  // Build error-specific guidance (no LLM call)
  let correctionGuidance = buildCorrectionGuidance({
    sql: state.sql,
    errorType,
    validationReport: state.validationReport,
    contextBundle: state.contextBundle,
    trace: state.trace,
    executionError: state.execution?.error,
  });

  // Ensure non-empty guidance so generateSql always shows the correction section
  if (!correctionGuidance) {
    correctionGuidance = state.execution?.error
      ? `Execution failed: ${state.execution.error}\nFix the SQL to resolve this error.`
      : 'Review and fix the SQL to address the validation issues.';
  }

  // Build supplemental column metadata for tables in the failed SQL
  // that might not be in contextBundle
  const tableNames = extractTableNames(state.sql || '');
  const existingTables = new Set((state.contextBundle?.tableNames || []).map((t) => t.toLowerCase()));
  const extraMeta = {};
  for (const t of tableNames) {
    if (!existingTables.has(t.toLowerCase())) {
      const meta = getColumnMetadataForTable(t);
      if (meta) extraMeta[t] = meta;
    }
  }

  // Merge extra column metadata into contextBundle if any new tables found
  let contextBundle = state.contextBundle;
  if (Object.keys(extraMeta).length > 0 && contextBundle) {
    contextBundle = {
      ...contextBundle,
      columnMetadata: { ...contextBundle.columnMetadata, ...extraMeta },
    };
  }

  const attempts = { ...(state.attempts || { agent: 0, correction: 0, reflection: 0, resultCheck: 0 }) };
  attempts.correction += 1;

  const duration = Date.now() - start;
  logger.info(`[Correct]${multiLabel} Analysis done (${duration}ms), routing to generateSql`, {
    errorType,
    attempt: attempts.correction,
    guidanceLength: correctionGuidance.length,
  });

  return {
    correctionGuidance,
    contextBundle,
    attempts,
    trace: [{
      node: 'correct',
      timestamp: Date.now(),
      duration,
      errorType,
      attempt: attempts.correction,
      priorSqlSnippet: (state.sql || '').substring(0, 300),
    }],
  };
}

module.exports = { correctNode };
