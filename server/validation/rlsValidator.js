/**
 * Programmatic RLS validation — ensures FLM_ID filters are present
 * for RLS-affected tables.
 */

const { RLS_TABLES } = require('../utils/rlsInjector');

/**
 * Finds which RLS_TABLES appear in the SQL (case-insensitive word boundary match).
 * @param {string} sql - The SQL text
 * @returns {string[]} - Table names found
 */
function findRlsTablesInSql(sql) {
  const upper = sql.toUpperCase();
  const found = [];

  for (const table of RLS_TABLES) {
    const escaped = table.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
    if (pattern.test(sql)) {
      found.push(table);
    }
  }

  return found;
}

/**
 * Checks if the expected RLS filter exists in SQL based on rlsContext.
 * @param {string} sql - The SQL text
 * @param {{ flmId?, repId?, slmName?, tlmName? }} rlsContext - RLS context
 * @returns {boolean}
 */
function hasExpectedRlsFilter(sql, rlsContext) {
  if (!rlsContext) return true;
  if (rlsContext.flmId != null) {
    const safeId = String(Number(rlsContext.flmId));
    if (safeId === 'NaN') return false;
    return new RegExp(`(?:rls_r\\.)?FLM_ID\\s*=\\s*${safeId}\\b`, 'i').test(sql);
  }
  if (rlsContext.repId != null) {
    const safeId = String(Number(rlsContext.repId));
    if (safeId === 'NaN') return false;
    return new RegExp(`(?:rls_r\\.)?REP_ID\\s*=\\s*${safeId}\\b`, 'i').test(sql);
  }
  if (rlsContext.slmName != null) {
    const escaped = String(rlsContext.slmName).replace(/'/g, "''");
    return /rls_r\.SLM\s*=\s*N?'[^']*'/.test(sql) && (sql.includes(`N'${escaped}'`) || sql.includes(`'${escaped}'`));
  }
  if (rlsContext.tlmName != null) {
    const escaped = String(rlsContext.tlmName).replace(/'/g, "''");
    return /rls_r\.TLM\s*=\s*N?'[^']*'/.test(sql) && (sql.includes(`N'${escaped}'`) || sql.includes(`'${escaped}'`));
  }
  return true;
}

function getRlsFilterDescription(rlsContext) {
  if (!rlsContext) return '';
  if (rlsContext.flmId != null) return `FLM_ID = ${rlsContext.flmId}`;
  if (rlsContext.repId != null) return `REP_ID = ${rlsContext.repId}`;
  if (rlsContext.slmName != null) return `SLM = '${rlsContext.slmName}'`;
  if (rlsContext.tlmName != null) return `TLM = '${rlsContext.tlmName}'`;
  return '';
}

/**
 * Validates that RLS-affected tables have the expected filters when rlsContext is provided.
 * @param {string} sql - The SQL to validate
 * @param {{ flmId?, repId?, slmName?, tlmName? }} [rlsContext] - RLS context
 * @returns {{ valid: boolean, issues: Array<{ type, severity, description, suggested_fix }> }}
 */
function validateRls(sql, rlsContext) {
  const issues = [];

  if (!rlsContext || (!rlsContext.flmId && rlsContext.repId == null && !rlsContext.slmName && !rlsContext.tlmName)) {
    return { valid: true, issues: [] };
  }

  if (!sql || typeof sql !== 'string') {
    return { valid: true, issues: [] };
  }

  const rlsTablesFound = findRlsTablesInSql(sql);

  if (rlsTablesFound.length === 0) {
    return { valid: true, issues: [] };
  }

  if (!hasExpectedRlsFilter(sql, rlsContext)) {
    const filterDesc = getRlsFilterDescription(rlsContext);
    issues.push({
      type: 'RLS_MISSING',
      severity: 'error',
      description: `SQL references RLS-affected table(s) (${rlsTablesFound.join(', ')}) but does not include ${filterDesc} filter. Data may be exposed beyond intended scope.`,
      suggested_fix: `Add ${filterDesc} to the WHERE clause for each RLS-affected table, or use the RLS injector to apply filters automatically.`,
    });
    return { valid: false, issues };
  }

  return { valid: true, issues: [] };
}

module.exports = { validateRls };
