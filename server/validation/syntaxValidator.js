/**
 * SQL syntax validation using SQL Server SET PARSEONLY ON.
 * Validates syntax without executing the query.
 */

const { getPool } = require('../config/database');

/**
 * Parses SQL Server error message into a structured issue.
 * @param {Error} err - The error from SQL Server
 * @returns {Array<{ type: string, severity: string, description: string, suggested_fix?: string }>}
 */
function parseSqlError(err) {
  const issues = [];
  const msg = err.message || String(err);

  // Common SQL Server error patterns
  // Line/column: "Incorrect syntax near 'X' at line 1"
  const nearMatch = msg.match(/Incorrect syntax near '([^']*)'/i);
  const lineMatch = msg.match(/line\s+(\d+)/i);
  const colMatch = msg.match(/column\s+(\d+)/i);

  const description = msg.split('\n')[0] || msg;
  const severity = /error|invalid|incorrect/i.test(msg) ? 'error' : 'warning';

  issues.push({
    type: 'SYNTAX_ERROR',
    severity,
    description,
    suggested_fix: nearMatch
      ? `Check syntax around '${nearMatch[1]}' — ensure proper keywords, commas, and parentheses.`
      : undefined,
  });

  return issues;
}

/**
 * Validates SQL syntax using SET PARSEONLY ON (no execution).
 * @param {string} sql - The SQL to validate
 * @returns {Promise<{ valid: boolean, issues: Array<{ type, severity, description, suggested_fix }> }>}
 */
async function validateSyntax(sql) {
  const issues = [];

  if (!sql || typeof sql !== 'string') {
    issues.push({
      type: 'INVALID_INPUT',
      severity: 'error',
      description: 'SQL must be a non-empty string',
    });
    return { valid: false, issues };
  }

  const trimmed = sql.trim();
  if (!trimmed) {
    issues.push({
      type: 'INVALID_INPUT',
      severity: 'error',
      description: 'SQL cannot be empty or whitespace only',
    });
    return { valid: false, issues };
  }

  try {
    const pool = await getPool();
    const batch = `SET PARSEONLY ON;\n${trimmed};\nSET PARSEONLY OFF;`;
    await pool.request().query(batch);
    return { valid: true, issues: [] };
  } catch (err) {
    const parsed = parseSqlError(err);
    return { valid: false, issues: parsed };
  }
}

module.exports = { validateSyntax };
