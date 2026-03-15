const test = require('node:test');
const assert = require('node:assert/strict');

const workflow = require('../graph/workflow');
const validateNode = require('../graph/nodes/validate');
const diagnoseNode = require('../graph/nodes/diagnoseEmptyResults');
const getCurrentFiscalPeriodTool = require('../tools/getCurrentFiscalPeriod');

test('fiscal period column resolver supports month fallback', () => {
  const { resolveCalendarColumns } = getCurrentFiscalPeriodTool.__testables;
  const availableWithoutMonth = new Set(['CALENDAR_DATE', 'FISCAL_YR', 'FISCAL_YR_AND_QTR_DESC']);
  const resolvedFallback = resolveCalendarColumns(availableWithoutMonth);

  assert.equal(resolvedFallback.dateColumn, 'CALENDAR_DATE');
  assert.equal(resolvedFallback.fiscalYearColumn, 'FISCAL_YR');
  assert.equal(resolvedFallback.fiscalQuarterColumn, 'FISCAL_YR_AND_QTR_DESC');
  assert.equal(resolvedFallback.fiscalMonthColumn, null);

  const availableWithMonth = new Set(['CALENDAR_DATE', 'FISCAL_YR', 'FISCAL_YR_AND_QTR_DESC', 'FISCAL_MTH']);
  const resolvedExact = resolveCalendarColumns(availableWithMonth);
  assert.equal(resolvedExact.fiscalMonthColumn, 'FISCAL_MTH');
});

test('syntax skip only applies to matching dry-run SQL hash', () => {
  const { didAgentDryRunCurrentSql } = validateNode.__testables;

  const matchingState = {
    sql: 'SELECT *  FROM vw_TF_EBI_P2S WHERE SALES_STAGE_ID = 2',
    agentToolCalls: [
      { name: 'dry_run_sql', args: { sql: 'select * from vw_TF_EBI_P2S where SALES_STAGE_ID=2' } },
    ],
  };
  const matching = didAgentDryRunCurrentSql(matchingState);
  assert.equal(matching.matched, true);

  const nonMatchingState = {
    sql: 'SELECT * FROM vw_TF_EBI_P2S WHERE SALES_STAGE_ID = 3',
    agentToolCalls: [
      { name: 'dry_run_sql', args: { sql: 'SELECT * FROM vw_TF_EBI_P2S WHERE SALES_STAGE_ID = 2' } },
    ],
  };
  const nonMatching = didAgentDryRunCurrentSql(nonMatchingState);
  assert.equal(nonMatching.matched, false);
});

test('semantic correction exhaustion no longer auto-executes', () => {
  const { routeAfterValidate } = workflow.__testables;

  const semanticFailureState = {
    validationReport: { overall_valid: false },
    attempts: { correction: 3 },
    errorType: 'SEMANTIC_ERROR',
  };
  assert.equal(routeAfterValidate(semanticFailureState), '__end__');

  const syntaxFailureState = {
    validationReport: { overall_valid: false },
    attempts: { correction: 3 },
    errorType: 'SYNTAX_ERROR',
  };
  assert.equal(routeAfterValidate(syntaxFailureState), 'execute');
});

test('0-row suspicious results route through diagnostics', () => {
  const { routeAfterCheckResults, routeAfterDiagnose } = workflow.__testables;

  assert.equal(
    routeAfterCheckResults({
      resultsSuspicious: true,
      execution: { rowCount: 0, success: true },
      attempts: { resultCheck: 1 },
    }),
    'diagnoseEmptyResults'
  );

  assert.equal(
    routeAfterCheckResults({
      resultsSuspicious: false,
      execution: { rowCount: 5, success: true },
      attempts: { resultCheck: 1 },
    }),
    'present'
  );

  assert.equal(
    routeAfterDiagnose({
      diagnostics: { action: 'retry_with_rewrite' },
      attempts: { resultCheck: 1 },
    }),
    'validate'
  );

  assert.equal(
    routeAfterDiagnose({
      diagnostics: { action: 'retry_with_rewrite' },
      attempts: { resultCheck: 2 },
    }),
    '__end__'
  );
});

test('auto-rewrite strategy widens QTR_BKT_IND = 0 safely', () => {
  const { proposeAutoRewrite } = diagnoseNode.__testables;
  const sql = 'SELECT * FROM vw_EBI_CALDATE c WHERE c.QTR_BKT_IND = 0 AND c.FISCAL_YR = 2026';
  const rewrite = proposeAutoRewrite(sql, 0);

  assert.ok(rewrite);
  assert.equal(rewrite.strategy, 'widen_qtr_bucket_zero_eq');
  assert.match(rewrite.sql, /QTR_BKT_IND IN \(0,1\)/);
});
