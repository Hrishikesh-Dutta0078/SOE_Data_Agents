/**
 * Schema validation — validate SQL column and table references against schema-knowledge
 * before execution. Catches invalid column/table names without hitting the DB.
 */

const { fuzzyResolveTable } = require('../vectordb/schemaFetcher');
const logger = require('../utils/logger');

function extractCteNames(sql) {
  const names = new Set();
  const ctePattern = /(?:\bWITH\b|,)\s*([A-Za-z_][\w]*)\s+AS\s*\(/gi;
  let m;
  while ((m = ctePattern.exec(sql)) !== null) {
    names.add(m[1].toLowerCase());
  }
  return names;
}

function extractTableNames(sql) {
  const cteNames = extractCteNames(sql);
  const pattern = /\b(?:FROM|JOIN)\s+(\[?[\w.]+\]?)/gi;
  const names = new Set();
  let m;
  while ((m = pattern.exec(sql)) !== null) {
    const raw = m[1].replace(/^\[|]$/g, '').trim();
    const normalized = raw.toLowerCase();
    if (
      raw
      && !/^[\d]/.test(raw)
      && !['SELECT', 'WHERE', 'ON', 'SET'].includes(raw.toUpperCase())
      && !cteNames.has(normalized)
    ) {
      names.add(raw);
    }
  }
  return [...names];
}

/**
 * Build alias -> resolved table name from FROM/JOIN clauses.
 * Pattern: FROM table [AS] alias, JOIN table [AS] alias.
 */
function buildAliasToTableMap(sql, resolvedTableNames) {
  const aliasToTable = new Map();
  const pattern = /\b(?:FROM|JOIN)\s+(\[?[\w.]+\]?)(?:\s+(?:AS\s+)?(\w+))?\b/gi;
  let m;
  const cteNames = extractCteNames(sql);

  while ((m = pattern.exec(sql)) !== null) {
    const rawTable = m[1].replace(/^\[|]$/g, '').trim();
    const alias = m[2] ? m[2].trim() : null;
    const rawLower = rawTable.toLowerCase();
    if (cteNames.has(rawLower)) continue;
    const resolved = resolvedTableNames.find((r) => r.raw.toLowerCase() === rawLower || (r.resolvedName && r.resolvedName.toLowerCase() === rawLower));
    const tableName = resolved?.resolvedName || rawTable;
    if (alias) {
      aliasToTable.set(alias.toLowerCase(), tableName);
    }
  }
  return aliasToTable;
}

/**
 * Find similar column name in list (containment, case-insensitive). At most one suggestion.
 */
function suggestColumn(badCol, allowedColumns) {
  if (!allowedColumns.length) return null;
  const badLower = badCol.toLowerCase();
  const allowed = [...allowedColumns];
  const containing = allowed.filter((c) => c.toLowerCase().includes(badLower));
  if (containing.length > 0) return containing[0];
  const contained = allowed.filter((c) => badLower.includes(c.toLowerCase()));
  if (contained.length > 0) return contained[0];
  return null;
}

/**
 * Validate SQL column/table references against schema-knowledge.
 * Returns { valid, issues }. Issues include suggested replacement when available.
 */
function validateSchema(sql) {
  const issues = [];

  if (!sql || typeof sql !== 'string') {
    issues.push({
      type: 'SCHEMA_ERROR',
      severity: 'error',
      description: 'SQL must be a non-empty string',
    });
    return { valid: false, issues };
  }

  const trimmed = sql.trim();
  if (!trimmed) {
    issues.push({
      type: 'SCHEMA_ERROR',
      severity: 'error',
      description: 'SQL cannot be empty',
    });
    return { valid: false, issues };
  }

  const tableNames = extractTableNames(trimmed);
  if (tableNames.length === 0) {
    return { valid: true, issues: [] };
  }

  const resolvedTableNames = tableNames.map((raw) => {
    const resolved = fuzzyResolveTable(raw);
    const columns = resolved?.entry?.columns ? Object.keys(resolved.entry.columns) : [];
    return {
      raw,
      resolvedName: resolved?.resolvedName || null,
      columns,
      entry: resolved?.entry,
    };
  });

  const aliasToTable = buildAliasToTableMap(trimmed, resolvedTableNames);

  const qualifiedRefPattern = /\b([A-Za-z_][\w]*)\.([A-Za-z_][\w]*)\b/g;
  const seenRefs = new Set();
  let match;

  while ((match = qualifiedRefPattern.exec(trimmed)) !== null) {
    const left = match[1];
    const col = match[2];
    const key = `${left}.${col}`;
    if (seenRefs.has(key)) continue;
    seenRefs.add(key);

    let tableName = null;
    const leftLower = left.toLowerCase();
    if (aliasToTable.has(leftLower)) {
      tableName = aliasToTable.get(leftLower);
    } else {
      const byName = resolvedTableNames.find(
        (r) => r.raw.toLowerCase() === leftLower || (r.resolvedName && r.resolvedName.toLowerCase() === leftLower)
      );
      if (byName) tableName = byName.resolvedName || byName.raw;
    }

    if (!tableName) continue;

    const resolved = resolvedTableNames.find(
      (r) => (r.resolvedName && r.resolvedName.toLowerCase() === tableName.toLowerCase()) || r.raw.toLowerCase() === tableName.toLowerCase()
    );
    if (!resolved) continue;
    if (!resolved.columns || resolved.columns.length === 0) continue;

    const colUpper = col.toUpperCase();
    const allowedUpper = new Set((resolved.columns || []).map((c) => c.toUpperCase()));
    if (allowedUpper.has(colUpper)) continue;

    const suggestion = suggestColumn(col, resolved.columns);
    let description = `Column "${col}" not found in table ${resolved.resolvedName || resolved.raw}.`;
    if (suggestion) {
      description += ` Did you mean: ${suggestion}?`;
    }
    issues.push({
      type: 'SCHEMA_ERROR',
      severity: 'error',
      description,
      suggested_fix: suggestion ? `Use ${suggestion} instead of ${col}.` : undefined,
    });
  }

  const valid = issues.length === 0;
  if (!valid) {
    logger.info('Schema validation failed', { issueCount: issues.length, issues: issues.map((i) => i.description) });
  }
  return { valid, issues };
}

module.exports = { validateSchema, extractTableNames, extractCteNames };
