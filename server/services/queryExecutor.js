/**
 * Query Executor Service — Stage 6
 *
 * Executes validated, RLS-filtered SQL against SQL Server and returns
 * structured results. Includes safety guards (TOP limit, timeout) and
 * rich emoji logging.
 *
 * Usage:
 *   const { executeQuery } = require('./services/queryExecutor');
 *   const result = await executeQuery(sql);
 */

const { getPool } = require('../config/database');
const logger = require('../utils/logger');
const {
  DB_REQUEST_TIMEOUT,
  QUERY_RESULT_ROW_LIMIT,
} = require('../config/constants');

/**
 * Ensure the SQL has a TOP clause to cap result size.
 * If the query already contains TOP, leave it alone.
 * For CTE queries (WITH ... AS (...) SELECT ...), injects TOP into the
 * main SELECT rather than a CTE subquery.
 */
function ensureTopLimit(sql, limit) {
  if (/\bTOP\s*\(?\s*\d+\s*\)?/i.test(sql)) return sql;

  const mainSelectIdx = findMainSelectIndex(sql);
  if (mainSelectIdx === -1) return sql;

  return sql.substring(0, mainSelectIdx) + `SELECT TOP ${limit}` + sql.substring(mainSelectIdx + 6);
}

function findMainSelectIndex(sql) {
  const upper = sql.toUpperCase();
  const trimmedUpper = upper.trimStart();

  if (!trimmedUpper.startsWith('WITH')) {
    const m = sql.match(/\bSELECT\b/i);
    return m ? m.index : -1;
  }

  let depth = 0;
  for (let i = 0; i < sql.length; i++) {
    if (sql[i] === '(') depth++;
    else if (sql[i] === ')') depth--;
    else if (depth === 0 && upper.startsWith('SELECT', i)) {
      const before = i > 0 ? sql[i - 1] : ' ';
      if (/[\s\n\r]/.test(before) || i === 0) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Execute a SQL query against the database.
 *
 * @param {string} sql — the T-SQL to execute
 * @returns {Promise<{
 *   success: boolean,
 *   rowCount: number,
 *   columns: string[],
 *   rows: object[],
 *   error: string|null
 * }>}
 */
async function executeQuery(sql) {
  const safeSql = ensureTopLimit(sql, QUERY_RESULT_ROW_LIMIT);
  const done = logger.startTimer('🗄️  Query execution');

  try {
    const pool = await getPool();
    const request = pool.request();
    request.timeout = DB_REQUEST_TIMEOUT;

    // executing silently — timing from startTimer

    const result = await request.query(safeSql);

    const rows = result.recordset ?? [];
    const columns = result.recordset?.columns
      ? Object.keys(result.recordset.columns)
      : rows.length > 0
        ? Object.keys(rows[0])
        : [];

    done({ rows: rows.length, columns: columns.length });

    return {
      success: true,
      rowCount: rows.length,
      columns,
      rows,
      error: null,
    };
  } catch (err) {
    done({ error: err.message });

    logger.error('🗄️  Query execution failed', { error: err.message });

    return {
      success: false,
      rowCount: 0,
      columns: [],
      rows: [],
      error: err.message,
    };
  }
}

module.exports = { executeQuery };
