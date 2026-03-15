const { getPool } = require('../../config/database');
const { MAX_RESULT_RETRIES } = require('../../config/constants');
const logger = require('../../utils/logger');

const SAFE_IDENTIFIER = /^[a-zA-Z0-9_.]+$/;

function extractCteNames(sql) {
  const names = new Set();
  const ctePattern = /(?:\bWITH\b|,)\s*([A-Za-z_][\w]*)\s+AS\s*\(/gi;
  let m;
  while ((m = ctePattern.exec(sql)) !== null) {
    names.add(m[1].toLowerCase());
  }
  return names;
}

function extractBaseTables(sql) {
  const cteNames = extractCteNames(sql);
  const names = new Set();
  const pattern = /\b(?:FROM|JOIN)\s+(\[?[\w.]+\]?)/gi;
  let m;
  while ((m = pattern.exec(sql)) !== null) {
    const raw = m[1].replace(/^\[|]$/g, '').trim();
    if (!raw || !SAFE_IDENTIFIER.test(raw)) continue;
    if (cteNames.has(raw.toLowerCase())) continue;
    names.add(raw);
  }
  return [...names];
}

function quoteIdentifier(ident) {
  return ident
    .split('.')
    .map((part) => `[${part}]`)
    .join('.');
}

function extractPredicatePreview(sql) {
  const lines = String(sql || '').split(/\r?\n/);
  const predicates = [];
  let inWhere = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^WHERE\b/i.test(trimmed)) {
      inWhere = true;
      predicates.push(trimmed.replace(/\s+/g, ' '));
      continue;
    }

    if (inWhere && /^(GROUP\s+BY|ORDER\s+BY|HAVING|UNION|EXCEPT|INTERSECT)\b/i.test(trimmed)) {
      inWhere = false;
      continue;
    }

    if (inWhere && /^AND\b/i.test(trimmed)) {
      predicates.push(trimmed.replace(/\s+/g, ' '));
    }
  }

  return predicates.slice(0, 10);
}

function proposeAutoRewrite(sql, resultRetryCount) {
  if (resultRetryCount >= MAX_RESULT_RETRIES) return null;

  const eqPattern = /\b((?:[A-Za-z_][\w]*\.)?)QTR_BKT_IND\s*=\s*0\b/gi;
  if (eqPattern.test(sql)) {
    return {
      strategy: 'widen_qtr_bucket_zero_eq',
      reason: 'Expanded QTR_BKT_IND = 0 to QTR_BKT_IND IN (0,1).',
      sql: sql.replace(eqPattern, '$1QTR_BKT_IND IN (0,1)'),
    };
  }

  const inPattern = /\b((?:[A-Za-z_][\w]*\.)?)QTR_BKT_IND\s+IN\s*\(\s*0\s*\)/gi;
  if (inPattern.test(sql)) {
    return {
      strategy: 'widen_qtr_bucket_zero_in',
      reason: 'Expanded QTR_BKT_IND IN (0) to QTR_BKT_IND IN (0,1).',
      sql: sql.replace(inPattern, '$1QTR_BKT_IND IN (0,1)'),
    };
  }

  return null;
}

async function fetchTableCounts(tableNames) {
  if (tableNames.length === 0) return [];

  const pool = await getPool();
  const counts = [];
  for (const tableName of tableNames.slice(0, 5)) {
    try {
      const sql = `SELECT COUNT_BIG(1) AS row_count FROM ${quoteIdentifier(tableName)}`;
      const request = pool.request();
      request.timeout = 10000;
      const result = await request.query(sql);
      const rowCount = Number(result.recordset?.[0]?.row_count ?? 0);
      counts.push({ table: tableName, rowCount, error: null });
    } catch (err) {
      counts.push({ table: tableName, rowCount: null, error: err.message });
    }
  }
  return counts;
}

async function diagnoseEmptyResultsNode(state) {
  const start = Date.now();
  const exec = state.execution;

  if (!exec?.success || exec.rowCount > 0) {
    return {
      diagnostics: {
        action: 'skip',
        reason: 'No empty-result diagnostics needed.',
      },
      trace: [{ node: 'diagnoseEmptyResults', timestamp: start, skipped: true }],
    };
  }

  const tableNames = extractBaseTables(state.sql || '');
  const predicates = extractPredicatePreview(state.sql || '');
  const tableCounts = await fetchTableCounts(tableNames);
  const rewrite = proposeAutoRewrite(state.sql || '', state.attempts?.resultCheck || 0);

  const action = rewrite ? 'retry_with_rewrite' : 'clarify_user';
  const warnings = rewrite
    ? [`0-row diagnostic: ${rewrite.reason} Retrying once with broader bucket coverage.`]
    : [
        `0-row diagnostic: unable to safely auto-rewrite SQL. Restrictive predicates likely caused empty output.`,
      ];

  const diagnostics = {
    action,
    tableCounts,
    predicates,
    rewriteStrategy: rewrite?.strategy || null,
    rewriteReason: rewrite?.reason || null,
  };

  const plan = state.queryPlan || [];
  const qIdx = state.currentQueryIndex || 0;
  const multiLabel = plan.length > 1 ? ` [Query ${qIdx + 1}/${plan.length}]` : '';
  logger.info(`[Diagnose]${multiLabel} Action: ${action} | ${predicates.length} predicates | ${tableCounts.length} tables checked (${Date.now() - start}ms)`);

  return {
    diagnostics,
    sql: rewrite ? rewrite.sql : state.sql,
    warnings,
    trace: [{
      node: 'diagnoseEmptyResults',
      timestamp: start,
      duration: Date.now() - start,
      action,
      predicates: predicates.length,
      tablesChecked: tableCounts.length,
    }],
  };
}

module.exports = {
  diagnoseEmptyResultsNode,
  __testables: {
    extractBaseTables,
    extractPredicatePreview,
    proposeAutoRewrite,
  },
};
