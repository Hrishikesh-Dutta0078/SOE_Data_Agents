const { validate } = require('../../validation/validator');
const crypto = require('crypto');
const { MAX_CORRECTION_ROUNDS } = require('../../config/constants');
const { buildRlsContextFromImpersonate } = require('../../utils/rlsInjector');
const logger = require('../../utils/logger');

const ERROR_TYPE_MAP = {
  rls: 'RLS_ERROR',
  syntax: 'SYNTAX_ERROR',
  schema: 'SCHEMA_ERROR',
  semantic: 'SEMANTIC_ERROR',
};

function classifyErrorType(passes) {
  const allIssues = Object.values(passes).flatMap((p) => p.issues).filter(Boolean);
  const joined = allIssues
    .map((i) => (typeof i === 'string' ? i : i.description || ''))
    .join(' ');

  if (/invalid.*column.*name|invalid.*object.*name|column.*not.*found/i.test(joined)) return 'SCHEMA_ERROR';
  if (/group\s*by|aggregat/i.test(joined)) return 'AGGREGATION_ERROR';

  for (const [pass, label] of Object.entries(ERROR_TYPE_MAP)) {
    if (!passes[pass].passed) return label;
  }

  return 'SYNTAX_ERROR';
}

function normalizeSql(sql) {
  return String(sql || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([(),=<>+\-/*])\s*/g, '$1')
    .trim()
    .toLowerCase();
}

function sqlHash(sql) {
  const normalized = normalizeSql(sql);
  if (!normalized) return '';
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function didAgentDryRunCurrentSql(state) {
  const currentSqlHash = sqlHash(state.sql);
  const dryRunSqlHashes = (state.agentToolCalls || [])
    .filter((tc) => tc.name === 'dry_run_sql' && tc.args?.sql)
    .map((tc) => sqlHash(tc.args.sql))
    .filter(Boolean);
  return {
    currentSqlHash,
    dryRunSqlHashes,
    matched: dryRunSqlHashes.includes(currentSqlHash),
  };
}

function bucketSemanticIssue(description) {
  const text = String(description || '').toLowerCase();
  if (!text) return 'other';
  if (/qtr_bkt|quarter|fiscal|time scope|time_period|current quarter|month|year/.test(text)) return 'time_scope';
  if (/join|region_id|rep_id|misattribute|wrong rep|many-to-many|grain/.test(text)) return 'join_scope';
  if (/leak|scope|my reps|other reps|security|mixing data/.test(text)) return 'entity_scope';
  if (/metric|aggregation|coverage|ratio/.test(text)) return 'metric_scope';
  return 'other';
}

function collectSemanticIssueBuckets(issues) {
  const buckets = {};
  for (const issue of issues || []) {
    const description = typeof issue === 'string' ? issue : issue?.description;
    const bucket = bucketSemanticIssue(description);
    buckets[bucket] = (buckets[bucket] || 0) + 1;
  }
  return buckets;
}

async function validateNode(state) {
  const start = Date.now();
  const correctionAttempt = state.attempts?.correction || 0;
  const rlsContext = buildRlsContextFromImpersonate(state.impersonateContext);

  const plan = state.queryPlan || [];
  const qIdx = state.currentQueryIndex || 0;
  const multiLabel = plan.length > 1 ? ` [Query ${qIdx + 1}/${plan.length}]` : '';
  logger.info(`Validate starting${multiLabel} (correction attempt ${correctionAttempt})`, {
    sqlLength: (state.sql || '').length,
    sqlPreview: (state.sql || '').substring(0, 120).replace(/\n/g, ' '),
  });

  const { currentSqlHash, dryRunSqlHashes, matched: agentRanDryRunForSameSql } = didAgentDryRunCurrentSql(state);

  const isMultiQuery = plan.length > 1;
  const activeQuestion = isMultiQuery
    ? (plan[qIdx]?.subQuestion || state.question)
    : state.question;

  const report = await validate({
    sql: state.sql,
    rlsContext,
    question: activeQuestion,
    detectedEntities: isMultiQuery ? null : state.entities,
    skipSyntax: true,
    multiQueryContext: isMultiQuery
      ? `This SQL addresses sub-question ${qIdx + 1} of ${plan.length}: "${activeQuestion}" (purpose: ${plan[qIdx]?.purpose || 'N/A'}). It does NOT need to answer the full original question — only this specific sub-question.`
      : null,
    nodeModelOverrides: state.nodeModelOverrides,
  });
  const semanticMeta = report?.passes?.semantic?.meta || null;

  let errorType = '';
  const warnings = [];
  const semanticIssueBuckets = collectSemanticIssueBuckets(report?.passes?.semantic?.issues || []);
  if (!report.overall_valid) {
    errorType = classifyErrorType(report.passes);
    const failedPasses = Object.entries(report.passes)
      .filter(([, pass]) => !pass.passed)
      .map(([name]) => name);
    warnings.push(`Validation failed (${failedPasses.join(', ')}).`);

    if (
      errorType === 'SEMANTIC_ERROR'
      && (state.attempts?.correction || 0) >= MAX_CORRECTION_ROUNDS
    ) {
      warnings.push('Semantic validation still failing after max correction attempts; SQL execution will be skipped for safety.');
    }
  }

  const rlsStatus = report.passes.rls.passed ? 'PASS' : 'FAIL';
  const syntaxStatus = report.passes.syntax.passed ? 'PASS' : 'FAIL';
  const schemaStatus = report.passes.schema?.passed !== false ? 'PASS' : 'FAIL';
  const semanticStatus = report.passes.semantic.passed ? 'PASS' : 'FAIL';
  const semanticIssueList = (report.passes.semantic.issues || [])
    .map((i) => typeof i === 'string' ? i : i.description || '').filter(Boolean);
  const issueDetail = semanticIssueList.length > 0 ? ` (${semanticIssueList.length} issues: ${semanticIssueList.join('; ').substring(0, 200)})` : '';
  logger.info(`[Validate]${multiLabel} RLS: ${rlsStatus} | Syntax: ${syntaxStatus} | Schema: ${schemaStatus} | Semantic: ${semanticStatus}${issueDetail} (${Date.now() - start}ms)`);

  return {
    validationReport: report,
    errorType,
    warnings,
    validationMeta: {
      syntaxSkipped: agentRanDryRunForSameSql,
      currentSqlHash,
      dryRunSqlHashes,
      semanticIssueBuckets,
      semantic: semanticMeta,
    },
    trace: [{
      node: 'validate',
      timestamp: Date.now(),
      valid: report.overall_valid,
      errorType: errorType || null,
      syntaxSkipped: agentRanDryRunForSameSql,
      semanticIssueBuckets,
      passes: {
        rls: report.passes.rls.passed,
        syntax: report.passes.syntax.passed,
        schema: report.passes.schema?.passed !== false,
        semantic: report.passes.semantic.passed,
      },
      llm: semanticMeta?.fallbackUsed
        ? {
          primary: semanticMeta.primaryModel || null,
          fallback: semanticMeta.fallbackModel || null,
          decision: semanticMeta.decision,
        }
        : (semanticMeta?.primaryModel || null),
    }],
  };
}

module.exports = {
  validateNode,
  __testables: {
    normalizeSql,
    sqlHash,
    didAgentDryRunCurrentSql,
    collectSemanticIssueBuckets,
  },
};
