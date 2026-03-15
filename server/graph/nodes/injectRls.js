const { applyRls, buildRlsContextFromImpersonate } = require('../../utils/rlsInjector');
const logger = require('../../utils/logger');

async function injectRlsNode(state) {
  const rlsContext = buildRlsContextFromImpersonate(state.impersonateContext);
  if (state.rlsEnabled === false || !rlsContext) {
    logger.info('InjectRLS skipped (disabled or no impersonation)');
    return {
      sql: state.sql,
      trace: [{ node: 'injectRls', timestamp: Date.now(), rlsApplied: false, rlsDisabled: true }],
    };
  }

  const start = Date.now();
  const filteredSql = applyRls(state.sql, rlsContext);
  const rlsApplied = filteredSql !== state.sql;

  const plan = state.queryPlan || [];
  const qIdx = state.currentQueryIndex || 0;
  const multiLabel = plan.length > 1 ? ` [Query ${qIdx + 1}/${plan.length}]` : '';
  logger.info(`[InjectRLS]${multiLabel} ${rlsApplied ? 'Applied' : 'No changes needed'} (${Date.now() - start}ms)`);

  return {
    sql: filteredSql,
    trace: [{ node: 'injectRls', timestamp: Date.now(), rlsApplied }],
  };
}

module.exports = { injectRlsNode };
