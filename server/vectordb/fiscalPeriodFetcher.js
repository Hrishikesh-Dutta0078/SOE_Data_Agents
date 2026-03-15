/**
 * Shared fiscal period fetcher — single cache used by discover_context and get_current_fiscal_period tool.
 * Avoids duplicate DB round-trips when both research and SQL agent need current fiscal period.
 */

const { getPool } = require('../config/database');
const logger = require('../utils/logger');

let _cachedFiscalPeriod = null;

function pickColumn(availableColumns, candidates) {
  return candidates.find((c) => availableColumns.has(c.toUpperCase())) || null;
}

/**
 * Resolve calendar column names from a set of available column names (e.g. from INFORMATION_SCHEMA).
 * Exported for tests.
 */
function resolveCalendarColumns(availableColumns) {
  return {
    dateColumn: pickColumn(availableColumns, ['CALENDAR_DATE', 'CALENDAR_DT']),
    fiscalYearColumn: pickColumn(availableColumns, ['FISCAL_YR']),
    fiscalQuarterColumn: pickColumn(availableColumns, ['FISCAL_YR_AND_QTR_DESC']),
    fiscalMonthColumn: pickColumn(availableColumns, [
      'FISCAL_MTH',
      'FISCAL_MONTH',
      'FISCAL_MTH_NUM',
      'FISCAL_MONTH_NUM',
      'FISCAL_YR_AND_MTH_DESC',
    ]),
  };
}

/**
 * Get current fiscal year, quarter, and month from vw_EBI_CALDATE. Cached after first successful fetch.
 * @returns {Promise<{ FISCAL_YR: any, FISCAL_YR_AND_QTR_DESC: string, FISCAL_MTH: any }|null>}
 */
async function fetchFiscalPeriod() {
  if (_cachedFiscalPeriod) return _cachedFiscalPeriod;

  try {
    const pool = await getPool();
    const metaResult = await pool.request().query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'vw_EBI_CALDATE'"
    );
    const available = new Set(
      (metaResult.recordset || []).map((r) => String(r.COLUMN_NAME || '').toUpperCase())
    );
    const cols = resolveCalendarColumns(available);
    const dateCol = cols.dateColumn;
    const fyrCol = cols.fiscalYearColumn;
    const fqCol = cols.fiscalQuarterColumn;
    const fmCol = cols.fiscalMonthColumn;

    if (!dateCol || !fyrCol || !fqCol) return null;

    const fmExpr = fmCol ? `[${fmCol}] AS FISCAL_MTH` : `MONTH([${dateCol}]) AS FISCAL_MTH`;
    const result = await pool.request().query(
      `SELECT TOP 1 [${fyrCol}] AS FISCAL_YR, [${fqCol}] AS FISCAL_YR_AND_QTR_DESC, ${fmExpr}
       FROM vw_EBI_CALDATE WHERE [${dateCol}] <= CAST(GETDATE() AS date) ORDER BY [${dateCol}] DESC`
    );

    const row = result.recordset?.[0];
    if (!row) return null;

    _cachedFiscalPeriod = {
      FISCAL_YR: row.FISCAL_YR,
      FISCAL_YR_AND_QTR_DESC: row.FISCAL_YR_AND_QTR_DESC,
      FISCAL_MTH: row.FISCAL_MTH,
    };
    return _cachedFiscalPeriod;
  } catch (err) {
    logger.warn('Failed to fetch fiscal period', { error: err.message });
    return null;
  }
}

module.exports = { fetchFiscalPeriod, resolveCalendarColumns };
