/**
 * daxParser.js
 *
 * Parses DAX expressions into structured representations for SQL translation.
 * Handles function calls, VAR/RETURN blocks, table/column refs, and measure refs.
 */

'use strict';

/**
 * Remove DAX comments (--- and --) from expression
 * @param {string} expr - DAX expression
 * @returns {string} - Expression without comments
 */
function stripDaxComments(expr) {
  const lines = expr.split('\n');
  const cleaned = lines.map(line => {
    // Remove --- comments (entire line) — only if not inside a string
    if (line.trim().startsWith('---')) {
      return '';
    }
    // Find -- outside of string literals
    let inString = false;
    let stringChar = null;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inString) {
        if (ch === stringChar) inString = false;
      } else {
        if (ch === '"' || ch === "'") {
          inString = true;
          stringChar = ch;
        } else if (ch === '-' && i + 1 < line.length && line[i + 1] === '-') {
          return line.substring(0, i);
        }
      }
    }
    return line;
  });
  return cleaned.join('\n');
}

/**
 * Extract function call name and inner content, handling nested parens
 * @param {string} expr - DAX expression
 * @returns {{name: string, innerRaw: string, rest: string} | null}
 */
function extractFunctionCall(expr) {
  const trimmed = expr.trim();
  const match = /^([A-Z_][A-Z0-9_]*)\s*\(/i.exec(trimmed);
  if (!match) {
    return null;
  }

  const name = match[1].toUpperCase();
  const startPos = match[0].length - 1; // Position of opening paren

  let depth = 0;
  let i = startPos;

  for (; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === '(' || ch === '{') {
      depth++;
    } else if (ch === ')' || ch === '}') {
      depth--;
      if (depth === 0) {
        // Found matching close paren
        const innerRaw = trimmed.substring(startPos + 1, i);
        const rest = trimmed.substring(i + 1);
        return { name, innerRaw, rest };
      }
    }
  }

  // No matching close paren found
  return null;
}

/**
 * Split string on commas at depth 0 (outside parens/braces)
 * @param {string} str - String to split
 * @returns {string[]} - Array of split arguments
 */
function splitTopLevelArgs(str) {
  if (!str || str.trim() === '') {
    return [];
  }

  const result = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '(' || ch === '{') {
      depth++;
      current += ch;
    } else if (ch === ')' || ch === '}') {
      depth--;
      current += ch;
    } else if (ch === ',' && depth === 0) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }

  if (current.trim() !== '') {
    result.push(current.trim());
  }

  return result;
}

/**
 * Parse table[column] or 'table'[column] reference
 * @param {string} expr - DAX expression
 * @returns {{table: string, column: string} | null}
 */
function parseTableColumnRef(expr) {
  const trimmed = expr.trim();

  // Match 'Table'[Column] or Table[Column]
  const quotedMatch = /^'([^']+)'\s*\[\s*([^\]]+)\s*\]$/.exec(trimmed);
  if (quotedMatch) {
    return { table: quotedMatch[1], column: quotedMatch[2].trim() };
  }

  const unquotedMatch = /^([A-Z_][A-Z0-9_]*)\s*\[\s*([^\]]+)\s*\]$/i.exec(trimmed);
  if (unquotedMatch) {
    return { table: unquotedMatch[1], column: unquotedMatch[2].trim() };
  }

  return null;
}

/**
 * Parse VAR ... RETURN ... blocks
 * @param {string} expr - DAX expression
 * @returns {{vars: Array<{name: string, expr: string}>, returnExpr: string} | null}
 */
function parseVarReturn(expr) {
  const trimmed = expr.trim();

  // Find all VAR positions
  const varRegex = /\bVAR\s+([A-Z_][A-Z0-9_]*)\s*=/gi;
  const varMatches = [];
  let match;

  while ((match = varRegex.exec(trimmed)) !== null) {
    varMatches.push({
      name: match[1],
      startPos: match.index,
      exprStartPos: match.index + match[0].length
    });
  }

  // Find RETURN position
  const returnMatch = /\bRETURN\s+/i.exec(trimmed);
  if (!returnMatch) {
    return null;
  }

  const returnPos = returnMatch.index;
  const returnExprStart = returnPos + returnMatch[0].length;

  // Extract VAR expressions
  const vars = varMatches.map((v, idx) => {
    const nextPos = idx < varMatches.length - 1
      ? varMatches[idx + 1].startPos
      : returnPos;
    const exprRaw = trimmed.substring(v.exprStartPos, nextPos).trim();
    // Remove trailing newlines and VAR keywords
    const cleaned = exprRaw.replace(/\s*\n\s*VAR\s*$/i, '').trim();
    return {
      name: v.name,
      expr: cleaned
    };
  });

  const returnExpr = trimmed.substring(returnExprStart).trim();

  return { vars, returnExpr };
}

/**
 * Known DAX functions mapped to type identifiers
 */
const KNOWN_FUNCTIONS = {
  CALCULATE: 'CALCULATE',
  DIVIDE: 'DIVIDE',
  SUM: 'SUM',
  SUMX: 'SUMX',
  SWITCH: 'SWITCH',
  COUNTROWS: 'COUNTROWS',
  FILTER: 'FILTER',
  DISTINCTCOUNT: 'DISTINCTCOUNT',
  MAX: 'MAX',
  MIN: 'MIN',
  MAXX: 'MAXX',
  ROUND: 'ROUND',
  RANKX: 'RANKX',
  TOPN: 'TOPN',
  IF: 'IF',
  NOT: 'NOT',
  ISBLANK: 'ISBLANK',
  BLANK: 'BLANK',
  COALESCE: 'COALESCE',
  SELECTEDVALUE: 'SELECTEDVALUE',
  ALL: 'ALL',
  ALLSELECTED: 'ALLSELECTED',
  VALUES: 'VALUES',
  HASONEVALUE: 'HASONEVALUE',
  ABS: 'ABS',
  FORMAT: 'FORMAT',
  CONCATENATEX: 'CONCATENATEX',
  RELATED: 'RELATED',
  AVERAGEX: 'AVERAGEX',
  AVERAGE: 'AVERAGE',
  COUNT: 'COUNT',
  ISINSCOPE: 'ISINSCOPE',
  SUMMARIZE: 'SUMMARIZE',
  ADDCOLUMNS: 'ADDCOLUMNS'
};

/**
 * Parse DAX expression and identify top-level pattern
 * @param {string} expr - DAX expression
 * @returns {Object} - Parsed structure with type and data
 */
function parseDaxExpression(expr) {
  const trimmed = expr.trim();

  // Literal number
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return { type: 'LITERAL', value: parseFloat(trimmed) };
  }

  // Literal string
  if (/^"[^"]*"$/.test(trimmed)) {
    return { type: 'LITERAL', value: trimmed.slice(1, -1) };
  }

  // Standalone measure ref [MeasureName]
  if (/^\[[^\]]+\]$/.test(trimmed)) {
    const name = trimmed.slice(1, -1);
    return { type: 'MEASURE_REF', name };
  }

  // Table[Column] reference
  const tableColRef = parseTableColumnRef(trimmed);
  if (tableColRef) {
    return { type: 'TABLE_COLUMN_REF', table: tableColRef.table, column: tableColRef.column };
  }

  // VAR ... RETURN
  if (/\bVAR\s+/i.test(trimmed) && /\bRETURN\s+/i.test(trimmed)) {
    const varReturn = parseVarReturn(trimmed);
    if (varReturn) {
      return { type: 'VAR_RETURN', vars: varReturn.vars, returnExpr: varReturn.returnExpr };
    }
  }

  // Function call
  const funcCall = extractFunctionCall(trimmed);
  if (funcCall) {
    const args = splitTopLevelArgs(funcCall.innerRaw);
    const funcType = KNOWN_FUNCTIONS[funcCall.name] || 'FUNCTION';
    return {
      type: funcType,
      name: funcCall.name,
      args,
      innerRaw: funcCall.innerRaw,
      rest: funcCall.rest
    };
  }

  // Binary expression (contains operators)
  const operators = ['+', '-', '*', '/', '=', '<', '>', '&', '&&', '||', '<>', '<=', '>='];
  for (const op of operators) {
    if (trimmed.includes(op)) {
      return { type: 'EXPRESSION', raw: trimmed };
    }
  }

  // Fallback
  return { type: 'RAW', raw: trimmed };
}

module.exports = {
  stripDaxComments,
  extractFunctionCall,
  splitTopLevelArgs,
  parseTableColumnRef,
  parseVarReturn,
  parseDaxExpression
};
