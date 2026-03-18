/**
 * Error analysis utilities for SQL correction.
 * Generates error-specific guidance without making LLM calls.
 */
const { fuzzyResolveTable, getAllTableNames, getColumnMetadataForTable } = require('../vectordb/schemaFetcher');

function extractTableNames(sql) {
  const cteNames = extractCteNames(sql);
  const pattern = /\b(?:FROM|JOIN)\s+(\[?[\w.]+\]?)/gi;
  const names = new Set();
  let m;
  while ((m = pattern.exec(sql)) !== null) {
    const raw = m[1].replace(/^\[|]$/g, '').trim();
    const normalized = raw.toLowerCase();
    if (raw && !/^[\d]/.test(raw)
      && !['SELECT', 'WHERE', 'ON', 'SET'].includes(raw.toUpperCase())
      && !cteNames.has(normalized)) {
      names.add(raw);
    }
  }
  return [...names];
}

function extractCteNames(sql) {
  const names = new Set();
  const ctePattern = /(?:\bWITH\b|,)\s*([A-Za-z_][\w]*)\s+AS\s*\(/gi;
  let m;
  while ((m = ctePattern.exec(sql)) !== null) {
    names.add(m[1].toLowerCase());
  }
  return names;
}

function suggestColumnsForInvalidName(badCol, tableNames, maxSuggestions = 2) {
  if (!badCol || !tableNames?.length) return [];
  const badLower = badCol.toLowerCase();
  const candidates = [];
  for (const tableName of tableNames) {
    const resolved = fuzzyResolveTable(tableName);
    if (!resolved?.entry?.columns) continue;
    for (const col of Object.keys(resolved.entry.columns)) {
      const colLower = col.toLowerCase();
      if (colLower === badLower) continue;
      if (colLower.includes(badLower)) {
        candidates.push({ column: col, table: resolved.resolvedName, score: colLower.length });
      } else if (badLower.includes(colLower) && colLower.length > 1) {
        candidates.push({ column: col, table: resolved.resolvedName, score: colLower.length });
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const seen = new Set();
  return candidates
    .filter((c) => { const key = `${c.table}.${c.column}`; if (seen.has(key)) return false; seen.add(key); return true; })
    .slice(0, maxSuggestions)
    .map((c) => `${c.column} (from ${c.table})`);
}

function stripTablePrefix(name) {
  return name.toLowerCase()
    .replace(/^vw_tf_/i, '').replace(/^vw_td_/i, '')
    .replace(/^tf_/i, '').replace(/^td_/i, '').replace(/^vw_/i, '');
}

function suggestTablesForInvalidName(badTable, maxSuggestions = 3) {
  if (!badTable) return [];
  const allNames = getAllTableNames();
  const badStripped = stripTablePrefix(badTable);
  const badTokens = badStripped.split('_').filter((t) => t.length > 2);
  const candidates = [];
  for (const realTable of allNames) {
    const realStripped = stripTablePrefix(realTable);
    if (realStripped === badStripped) { candidates.push({ table: realTable, score: 100 }); continue; }
    if (realStripped.includes(badStripped) || badStripped.includes(realStripped)) {
      const shorter = Math.min(realStripped.length, badStripped.length);
      if (shorter >= 4) { candidates.push({ table: realTable, score: 50 + shorter }); continue; }
    }
    const realTokens = realStripped.split('_').filter((t) => t.length > 2);
    const overlap = badTokens.filter((t) => realTokens.some((rt) => rt.includes(t) || t.includes(rt)));
    if (overlap.length > 0) candidates.push({ table: realTable, score: overlap.length * 10 + overlap.join('').length });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, maxSuggestions).map((c) => c.table);
}

function formatIssues(passes) {
  if (!passes) return [];
  return Object.values(passes)
    .flatMap((p) => p.issues)
    .filter(Boolean)
    .map((issue) => {
      if (typeof issue === 'string') return issue;
      const desc = issue.description || JSON.stringify(issue);
      return issue.suggested_fix ? `${desc} (Hint: ${issue.suggested_fix})` : desc;
    });
}

/**
 * Analyze validation errors and build correction guidance string.
 * No LLM call — pure error analysis with schema lookups.
 */
function buildCorrectionGuidance({ sql, errorType, validationReport, contextBundle, trace }) {
  const issues = formatIssues(validationReport?.passes);
  const issueText = issues.join(' ');
  const tableNames = extractTableNames(sql || '');
  let guidance = '';

  // Invalid column
  const invalidColMatch = issueText.match(/Invalid column name '(\w+)'/i);
  if (invalidColMatch) {
    const badCol = invalidColMatch[1];
    guidance += `\nCRITICAL: The column "${badCol}" does NOT exist. Replace it with an actual column from the COLUMN METADATA section.`;
    const searchTables = [...tableNames, ...(contextBundle?.tableNames || [])];
    const suggestions = suggestColumnsForInvalidName(badCol, searchTables, 3);
    if (suggestions.length > 0) guidance += `\nSuggested replacement(s): ${suggestions.join('; ')}.`;
  }

  // Syntax error
  if (/Incorrect syntax near|syntax\s*error|unbalanced\s*paren|near\s*'\)'/i.test(issueText)) {
    guidance += `\nCRITICAL — SQL SYNTAX ERROR. Check: balanced parentheses, commas in SELECT/GROUP BY/ORDER BY, no trailing commas before closing parens.`;
  }

  // Type conversion
  const typeMatch = issueText.match(/Conversion failed when converting (?:the )?(\w+) value '([^']+)' to data type (\w+)/i);
  if (typeMatch) {
    const [, , sampleValue, targetType] = typeMatch;
    guidance += `\nCRITICAL — TYPE CONVERSION ERROR: Column has mixed types (e.g., '${sampleValue}'). Replace ALL CAST(col AS ${targetType}) with TRY_CAST. Replace ALL CONVERT(${targetType}, col) with TRY_CONVERT.`;
  }

  // Invalid object (table)
  const invalidObjMatch = issueText.match(/Invalid object name '([^']+)'/i);
  if (invalidObjMatch) {
    const badTable = invalidObjMatch[1];
    const suggested = suggestTablesForInvalidName(badTable, 3);
    guidance += `\nCRITICAL: Table "${badTable}" does NOT exist.`;
    if (suggested.length > 0) {
      guidance += ` Suggested replacement(s): ${suggested.join(', ')}.`;
      for (const t of suggested) {
        const meta = getColumnMetadataForTable(t);
        if (meta) guidance += `\n-- ${t}:\n${meta}`;
      }
    }
  }

  // Prior attempts
  const priorCorrections = (trace || []).filter((t) => t.node === 'correct' || (t.node === 'execute' && t.error));
  if (priorCorrections.length > 0) {
    guidance += '\n\nPRIOR CORRECTION ATTEMPTS (do NOT repeat):';
    for (const t of priorCorrections) {
      if (t.node === 'execute' && t.error) guidance += `\n- Execution failed: ${t.error}`;
      else if (t.node === 'correct') guidance += `\n- Correction attempt ${t.attempt || '?'}: fixed ${t.errorType || 'unknown'}`;
    }
  }

  return guidance;
}

module.exports = {
  buildCorrectionGuidance,
  extractTableNames,
  suggestColumnsForInvalidName,
  suggestTablesForInvalidName,
  formatIssues,
};
