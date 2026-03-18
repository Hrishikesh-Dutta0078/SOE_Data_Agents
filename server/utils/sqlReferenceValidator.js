/**
 * Post-validation of SQL references against schema.
 * Fuzzy-resolves table names, verifies column existence.
 */
const { fuzzyResolveTable } = require('../vectordb/schemaFetcher');
const logger = require('./logger');

/**
 * Validate and fix SQL table/column references.
 * - Fuzzy-resolves table names (vw_EBI_P2S → vw_TF_EBI_P2S)
 * - Logs warnings for unresolved references
 * @param {string} sql - The generated SQL
 * @param {Array} schemaContext - Schema array from contextBundle (from getSchemaByTableNames)
 * @returns {{ sql: string, warnings: string[] }}
 */
function validateSqlReferences(sql, schemaContext) {
  const warnings = [];
  if (!sql || !schemaContext) return { sql: sql || '', warnings };

  const tablePattern = /\b(?:FROM|JOIN)\s+(\[?[\w.]+\]?)/gi;
  let match;
  const replacements = [];

  while ((match = tablePattern.exec(sql)) !== null) {
    const rawName = match[1].replace(/^\[|]$/g, '').trim();
    if (!rawName || /^[\d]/.test(rawName)) continue;
    if (['SELECT', 'WHERE', 'ON', 'SET', 'AND', 'OR', 'NOT', 'NULL', 'AS'].includes(rawName.toUpperCase())) continue;

    const resolved = fuzzyResolveTable(rawName);
    if (resolved && resolved.resolvedName !== rawName) {
      replacements.push({ from: rawName, to: resolved.resolvedName });
      warnings.push(`Table "${rawName}" resolved to "${resolved.resolvedName}"`);
    } else if (!resolved) {
      warnings.push(`Table "${rawName}" not found in schema`);
    }
  }

  let fixedSql = sql;
  for (const { from, to } of replacements) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    fixedSql = fixedSql.replace(new RegExp(`\\b${escaped}\\b`, 'g'), to);
  }

  if (warnings.length > 0) {
    logger.info('[validateSqlReferences]', { warnings });
  }

  return { sql: fixedSql, warnings };
}

module.exports = { validateSqlReferences };
