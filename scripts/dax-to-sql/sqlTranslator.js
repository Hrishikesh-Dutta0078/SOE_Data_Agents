// scripts/dax-to-sql/sqlTranslator.js
'use strict';

const {
  stripDaxComments,
  extractFunctionCall,
  splitTopLevelArgs,
  parseTableColumnRef,
  parseDaxExpression,
  parseVarReturn,
} = require('./daxParser');
const { TABLE_MAP, TABLE_ALIAS } = require('./constants');

/**
 * Create translation context shared across all measure translations.
 */
function createTranslationContext({ tableMap, tableAlias, joinMap, resolvedMeasures }) {
  return {
    tableMap: tableMap || TABLE_MAP,
    tableAlias: tableAlias || TABLE_ALIAS,
    joinMap: joinMap || {},
    resolvedMeasures: resolvedMeasures || {},
    warnings: [],
    relatedTables: new Set(),
    relatedColumns: new Set(),
    confidence: 'mapped',
  };
}

/**
 * Resolve a PBIX table name to its SQL view name.
 */
function resolveTable(pbixTable, ctx) {
  const view = ctx.tableMap[pbixTable];
  if (view === null) {
    ctx.warnings.push(`Table "${pbixTable}" has no SQL equivalent (manual/DAX table)`);
    ctx.confidence = downgrade(ctx.confidence, 'pbix_only');
    return pbixTable; // fallback
  }
  if (view === undefined) {
    ctx.warnings.push(`Table "${pbixTable}" not found in table map`);
    ctx.confidence = downgrade(ctx.confidence, 'inferred');
    return pbixTable;
  }
  return view;
}

/**
 * Get a short alias for a SQL view.
 */
function getAlias(view, ctx) {
  if (ctx.tableAlias[view]) return ctx.tableAlias[view];
  // Generate from initials
  return view.replace(/^vw_[A-Z]*_EBI_/i, '').substring(0, 3).toLowerCase();
}

function downgrade(current, to) {
  const order = { 'mapped': 0, 'inferred': 1, 'pbix_only': 2 };
  return order[to] > order[current] ? to : current;
}

/**
 * Translate a DAX expression to T-SQL.
 * Returns { sql: string, confidence: string, relatedTables: string[], relatedColumns: string[], warnings: string[] }
 */
function translateMeasure(rawExpr, ctx) {
  // Reset per-measure tracking
  ctx.relatedTables = new Set();
  ctx.relatedColumns = new Set();
  ctx.confidence = 'mapped';
  ctx.warnings = [];
  ctx._depth = 0;
  ctx._depthWarned = false;

  const sql = translateExpr(rawExpr, ctx);

  return {
    sql,
    confidence: ctx.confidence,
    relatedTables: [...ctx.relatedTables],
    relatedColumns: [...ctx.relatedColumns],
    warnings: [...ctx.warnings],
  };
}

const MAX_DEPTH = 50;

/**
 * Recursively translate a DAX expression to SQL.
 */
function translateExpr(rawExpr, ctx) {
  ctx._depth = (ctx._depth || 0) + 1;
  if (ctx._depth > MAX_DEPTH) {
    ctx.confidence = downgrade(ctx.confidence, 'pbix_only');
    if (!ctx._depthWarned) {
      ctx.warnings.push('Max recursion depth exceeded');
      ctx._depthWarned = true;
    }
    ctx._depth--;
    return `/* depth limit: ${rawExpr.substring(0, 60)}... */`;
  }

  const result = _translateExprInner(rawExpr, ctx);
  ctx._depth--;
  return result;
}

/**
 * Inner translation logic (called by translateExpr with depth tracking).
 */
function _translateExprInner(rawExpr, ctx) {
  if (rawExpr == null || typeof rawExpr !== 'string') return 'NULL';
  const expr = stripDaxComments(rawExpr).trim();
  if (!expr) return 'NULL';

  const parsed = parseDaxExpression(expr);

  switch (parsed.type) {
    case 'LITERAL':
      return translateLiteral(parsed.value);

    case 'MEASURE_REF':
      return translateMeasureRef(parsed.name, ctx);

    case 'TABLE_COLUMN_REF':
      return translateTableColumnRef(parsed.table, parsed.column, ctx);

    case 'VAR_RETURN':
      return translateVarReturn(parsed, ctx);

    case 'SUM':
    case 'MAX':
    case 'MIN':
    case 'AVERAGE':
    case 'COUNT':
      return translateSimpleAgg(parsed, ctx);

    case 'DISTINCTCOUNT':
      return translateDistinctCount(parsed, ctx);

    case 'CALCULATE':
      return translateCalculate(parsed, ctx);

    case 'DIVIDE':
      return translateDivide(parsed, ctx);

    case 'SWITCH':
      return translateSwitch(parsed, ctx);

    case 'IF':
      return translateIf(parsed, ctx);

    case 'ROUND':
      return translateRound(parsed, ctx);

    case 'ABS':
      return translateAbs(parsed, ctx);

    case 'COUNTROWS':
      return translateCountrows(parsed, ctx);

    case 'FILTER':
      return translateFilter(parsed, ctx);

    case 'SELECTEDVALUE':
      return translateSelectedValue(parsed, ctx);

    case 'ISBLANK':
      return translateIsBlank(parsed, ctx);

    case 'BLANK':
      return 'NULL';

    case 'COALESCE':
      return translateCoalesce(parsed, ctx);

    case 'NOT':
      return translateNot(parsed, ctx);

    case 'RANKX':
      return translateRankx(parsed, ctx);

    case 'SUMX':
    case 'AVERAGEX':
      return translateIterator(parsed, ctx);

    case 'MAXX':
      return translateMaxx(parsed, ctx);

    case 'TOPN':
      return translateTopN(parsed, ctx);

    case 'ALL':
    case 'ALLSELECTED':
      return '/* ALL: removes filters */';

    case 'VALUES':
      return translateValues(parsed, ctx);

    case 'HASONEVALUE':
      return translateHasOneValue(parsed, ctx);

    case 'RELATED':
      return translateRelated(parsed, ctx);

    case 'ISINSCOPE':
      ctx.confidence = downgrade(ctx.confidence, 'inferred');
      return '1 = 1 /* ISINSCOPE */';

    case 'FORMAT':
      return translateFormat(parsed, ctx);

    case 'CONCATENATEX':
    case 'SUMMARIZE':
    case 'ADDCOLUMNS':
      ctx.confidence = downgrade(ctx.confidence, 'inferred');
      return `/* ${parsed.name}(...) — complex DAX, manual review needed */`;

    case 'EXPRESSION':
      return translateBinaryExpr(parsed.raw, ctx);

    case 'FUNCTION':
      ctx.confidence = downgrade(ctx.confidence, 'inferred');
      return `/* Unhandled: ${parsed.name}(...) */`;

    case 'RAW':
    default:
      return translateBinaryExpr(parsed.raw || expr, ctx);
  }
}

// --- Individual translators ---

function translateLiteral(value) {
  if (typeof value === 'string') return `'${value}'`;
  return String(value);
}

function translateMeasureRef(name, ctx) {
  const resolved = ctx.resolvedMeasures[name];
  if (resolved) {
    resolved.relatedTables.forEach(t => ctx.relatedTables.add(t));
    resolved.relatedColumns.forEach(c => ctx.relatedColumns.add(c));
    return resolved.sql;
  }
  ctx.warnings.push(`Unresolved measure ref: [${name}]`);
  ctx.confidence = downgrade(ctx.confidence, 'inferred');
  return `/* [${name}] — unresolved */`;
}

function translateTableColumnRef(table, column, ctx) {
  const view = resolveTable(table, ctx);
  const alias = getAlias(view, ctx);
  ctx.relatedTables.add(view);
  ctx.relatedColumns.add(`${view}.${column}`);
  return `${alias}.${column}`;
}

function translateSimpleAgg(parsed, ctx) {
  const funcName = parsed.name; // SUM, MAX, MIN, AVERAGE, COUNT
  const sqlFunc = funcName === 'AVERAGE' ? 'AVG' : funcName;
  const argExpr = parsed.args[0];
  const tcRef = parseTableColumnRef(argExpr.trim());

  if (tcRef) {
    const view = resolveTable(tcRef.table, ctx);
    const alias = getAlias(view, ctx);
    ctx.relatedTables.add(view);
    ctx.relatedColumns.add(`${view}.${tcRef.column}`);
    return `(SELECT ${sqlFunc}(${alias}.${tcRef.column}) FROM ${view} ${alias})`;
  }

  // Arg is a sub-expression
  const innerSql = translateExpr(argExpr, ctx);
  return `${sqlFunc}(${innerSql})`;
}

function translateDistinctCount(parsed, ctx) {
  const argExpr = parsed.args[0];
  const tcRef = parseTableColumnRef(argExpr.trim());

  if (tcRef) {
    const view = resolveTable(tcRef.table, ctx);
    const alias = getAlias(view, ctx);
    ctx.relatedTables.add(view);
    ctx.relatedColumns.add(`${view}.${tcRef.column}`);
    return `(SELECT COUNT(DISTINCT ${alias}.${tcRef.column}) FROM ${view} ${alias})`;
  }

  const innerSql = translateExpr(argExpr, ctx);
  return `COUNT(DISTINCT ${innerSql})`;
}

function translateCalculate(parsed, ctx) {
  const args = parsed.args;
  if (args.length === 0) return 'NULL';

  const measureExpr = args[0];
  const filterExprs = args.slice(1);

  // Translate the measure expression
  const measureSql = translateExpr(measureExpr, ctx);

  // Extract the base table info from the measure SQL for JOIN resolution
  const baseInfo = extractBaseFromSql(measureSql);

  const filterClauses = [];
  const joinClauses = [];

  filterExprs.forEach(f => {
    const filterResult = translateFilterArg(f.trim(), ctx, baseInfo);
    if (filterResult.where) filterClauses.push(filterResult.where);
    if (filterResult.join) joinClauses.push(filterResult.join);
  });

  if (filterClauses.length === 0 && joinClauses.length === 0) return measureSql;

  // Try to inject filters into existing subquery
  const subqueryMatch = measureSql.match(/^\(SELECT (.+?) FROM (.+?)\)$/is);
  if (subqueryMatch) {
    const selectPart = subqueryMatch[1];
    let fromPart = subqueryMatch[2];
    const joinStr = joinClauses.length > 0 ? ' ' + joinClauses.join(' ') : '';
    const whereStr = filterClauses.length > 0 ? ' WHERE ' + filterClauses.join(' AND ') : '';

    // Check if FROM already has WHERE
    const whereIdx = fromPart.toUpperCase().indexOf(' WHERE ');
    if (whereIdx >= 0 && filterClauses.length > 0) {
      return `(SELECT ${selectPart} FROM ${fromPart}${joinStr} AND ${filterClauses.join(' AND ')})`;
    }
    return `(SELECT ${selectPart} FROM ${fromPart}${joinStr}${whereStr})`;
  }

  // Wrap as subquery with filters
  const joinStr = joinClauses.join(' ');
  const whereStr = filterClauses.length > 0 ? ' WHERE ' + filterClauses.join(' AND ') : '';
  return `(SELECT ${measureSql}${joinStr ? ' ' + joinStr : ''}${whereStr})`;
}

/**
 * Extract base table info from a SQL subquery for JOIN resolution.
 * Returns { pbixTable, view, alias } or null.
 */
function extractBaseFromSql(sql) {
  const match = sql.match(/FROM\s+(\S+)\s+(\w+)/i);
  if (!match) return null;
  const view = match[1];
  const alias = match[2];
  // Reverse lookup: SQL view → PBIX table name
  const pbixTable = Object.entries(TABLE_MAP).find(([, v]) => v === view)?.[0];
  return { pbixTable, view, alias };
}

/**
 * Find JOIN clause between base table and filter table using joinMap.
 */
function buildJoinClause(basePbix, filterPbix, filterView, filterAlias, baseAlias, ctx) {
  if (!basePbix || !ctx.joinMap[basePbix]) return null;
  const rel = ctx.joinMap[basePbix][filterPbix];
  if (!rel) return null;
  return `JOIN ${filterView} ${filterAlias} ON ${baseAlias}.${rel.fromCol} = ${filterAlias}.${rel.toCol}`;
}

/**
 * Escape a SQL string value (double single quotes inside).
 */
function escapeSqlString(val) {
  return val.replace(/"/g, "'").replace(/'([^']*)'/g, (m, inner) => `'${inner.replace(/'/g, "''")}'`);
}

/**
 * Translate a CALCULATE filter argument to { where, join }.
 * baseInfo: { pbixTable, view, alias } from the measure's FROM clause.
 */
function translateFilterArg(filterExpr, ctx, baseInfo) {
  const trimmed = filterExpr.trim();

  // ALL('Table') — removes filters, ignore
  if (/^ALL\s*\(/i.test(trimmed) || /^ALLSELECTED\s*\(/i.test(trimmed)) {
    return {};
  }

  // Helper: build join if filter table differs from base table
  function maybeJoin(pbixTable, view, alias) {
    if (!baseInfo || view === baseInfo.view) return null;
    return buildJoinClause(baseInfo.pbixTable, pbixTable, view, alias, baseInfo.alias, ctx);
  }

  // NOT 'Table'[Col] IN {...}
  const notInMatch = trimmed.match(/^NOT\s+'([^']+)'\[([^\]]+)\]\s+IN\s+\{(.+)\}$/is);
  if (notInMatch) {
    const pbixTable = notInMatch[1];
    const view = resolveTable(pbixTable, ctx);
    const alias = getAlias(view, ctx);
    const values = notInMatch[3].split(',').map(v => escapeSqlString(v.trim()));
    ctx.relatedTables.add(view);
    ctx.relatedColumns.add(`${view}.${notInMatch[2]}`);
    return { where: `${alias}.${notInMatch[2]} NOT IN (${values.join(', ')})`, join: maybeJoin(pbixTable, view, alias) };
  }

  // 'Table'[Col] IN {"val1", "val2"}
  const inMatch = trimmed.match(/^'([^']+)'\[([^\]]+)\]\s+IN\s+\{(.+)\}$/is);
  if (inMatch) {
    const pbixTable = inMatch[1];
    const view = resolveTable(pbixTable, ctx);
    const alias = getAlias(view, ctx);
    const values = inMatch[3].split(',').map(v => escapeSqlString(v.trim()));
    ctx.relatedTables.add(view);
    ctx.relatedColumns.add(`${view}.${inMatch[2]}`);
    return { where: `${alias}.${inMatch[2]} IN (${values.join(', ')})`, join: maybeJoin(pbixTable, view, alias) };
  }

  // Unquoted Table[Col] IN {values}
  const inMatchUnquoted = trimmed.match(/^([A-Za-z_][\w\s]*)\[([^\]]+)\]\s+IN\s+\{(.+)\}$/is);
  if (inMatchUnquoted) {
    const pbixTable = inMatchUnquoted[1].trim();
    const view = resolveTable(pbixTable, ctx);
    const alias = getAlias(view, ctx);
    const values = inMatchUnquoted[3].split(',').map(v => escapeSqlString(v.trim()));
    ctx.relatedTables.add(view);
    ctx.relatedColumns.add(`${view}.${inMatchUnquoted[2]}`);
    return { where: `${alias}.${inMatchUnquoted[2]} IN (${values.join(', ')})`, join: maybeJoin(pbixTable, view, alias) };
  }

  // 'Table'[Col] = value or 'Table'[Col] <> value etc.
  const eqMatch = trimmed.match(/^'([^']+)'\[([^\]]+)\]\s*(=|<>|!=|<=|>=|<|>)\s*(.+)$/is);
  if (eqMatch) {
    const pbixTable = eqMatch[1];
    const view = resolveTable(pbixTable, ctx);
    const alias = getAlias(view, ctx);
    let value = escapeSqlString(eqMatch[4].trim());
    if (/^TRUE\(\)$/i.test(value)) value = '1';
    if (/^FALSE\(\)$/i.test(value)) value = '0';
    ctx.relatedTables.add(view);
    ctx.relatedColumns.add(`${view}.${eqMatch[2]}`);
    return { where: `${alias}.${eqMatch[2]} ${eqMatch[3]} ${value}`, join: maybeJoin(pbixTable, view, alias) };
  }

  // Unquoted Table[Col] = value
  const eqMatchUnquoted = trimmed.match(/^([A-Za-z_][\w\s]*)\[([^\]]+)\]\s*(=|<>|!=|<=|>=|<|>)\s*(.+)$/is);
  if (eqMatchUnquoted) {
    const pbixTable = eqMatchUnquoted[1].trim();
    const view = resolveTable(pbixTable, ctx);
    const alias = getAlias(view, ctx);
    let value = escapeSqlString(eqMatchUnquoted[4].trim());
    ctx.relatedTables.add(view);
    ctx.relatedColumns.add(`${view}.${eqMatchUnquoted[2]}`);
    return { where: `${alias}.${eqMatchUnquoted[2]} ${eqMatchUnquoted[3]} ${value}`, join: maybeJoin(pbixTable, view, alias) };
  }

  // FILTER() as a filter arg — translate inline
  if (/^FILTER\s*\(/i.test(trimmed)) {
    const filterSql = translateExpr(trimmed, ctx);
    return { where: `/* FILTER: ${filterSql} */` };
  }

  // Fallback
  ctx.confidence = downgrade(ctx.confidence, 'inferred');
  return { where: `/* filter: ${trimmed} */` };
}

function translateDivide(parsed, ctx) {
  const numerator = translateExpr(parsed.args[0], ctx);
  const denominator = translateExpr(parsed.args[1], ctx);
  const altResult = parsed.args.length > 2 ? translateExpr(parsed.args[2], ctx) : null;

  if (altResult) {
    return `CASE WHEN (${denominator}) = 0 OR (${denominator}) IS NULL THEN ${altResult} ELSE (${numerator}) / (${denominator}) END`;
  }
  return `(${numerator}) / NULLIF((${denominator}), 0)`;
}

function translateSwitch(parsed, ctx) {
  const args = parsed.args;

  // SWITCH(TRUE(), cond1, val1, cond2, val2, ..., default)
  if (args[0].trim().toUpperCase() === 'TRUE()') {
    const pairs = args.slice(1);
    let sql = 'CASE';
    for (let i = 0; i < pairs.length - 1; i += 2) {
      const cond = translateExpr(pairs[i], ctx);
      const val = translateExpr(pairs[i + 1], ctx);
      sql += ` WHEN ${cond} THEN ${val}`;
    }
    // If odd number of remaining args, last is default
    if (pairs.length % 2 === 1) {
      sql += ` ELSE ${translateExpr(pairs[pairs.length - 1], ctx)}`;
    }
    sql += ' END';
    return sql;
  }

  // SWITCH(expr, val1, result1, val2, result2, ..., default)
  const switchExpr = translateExpr(args[0], ctx);
  let sql = `CASE ${switchExpr}`;
  const rest = args.slice(1);
  for (let i = 0; i < rest.length - 1; i += 2) {
    sql += ` WHEN ${translateExpr(rest[i], ctx)} THEN ${translateExpr(rest[i + 1], ctx)}`;
  }
  if (rest.length % 2 === 1) {
    sql += ` ELSE ${translateExpr(rest[rest.length - 1], ctx)}`;
  }
  sql += ' END';
  return sql;
}

function translateIf(parsed, ctx) {
  const cond = translateExpr(parsed.args[0], ctx);
  const thenVal = translateExpr(parsed.args[1], ctx);
  const elseVal = parsed.args.length > 2 ? translateExpr(parsed.args[2], ctx) : 'NULL';
  return `CASE WHEN ${cond} THEN ${thenVal} ELSE ${elseVal} END`;
}

function translateRound(parsed, ctx) {
  const val = translateExpr(parsed.args[0], ctx);
  const decimals = parsed.args[1] ? parsed.args[1].trim() : '0';
  return `ROUND(${val}, ${decimals})`;
}

function translateAbs(parsed, ctx) {
  const val = translateExpr(parsed.args[0], ctx);
  return `ABS(${val})`;
}

function translateCountrows(parsed, ctx) {
  const innerExpr = parsed.args[0].trim();

  // COUNTROWS(FILTER('Table', condition))
  const filterCall = extractFunctionCall(innerExpr);
  if (filterCall && filterCall.name === 'FILTER') {
    const filterArgs = splitTopLevelArgs(filterCall.innerRaw);
    const tableExpr = filterArgs[0].trim().replace(/'/g, '');
    const view = resolveTable(tableExpr, ctx);
    const alias = getAlias(view, ctx);
    const condition = filterArgs.slice(1).map(a => translateExpr(a, ctx)).join(' AND ');
    ctx.relatedTables.add(view);
    return `(SELECT COUNT(*) FROM ${view} ${alias} WHERE ${condition})`;
  }

  // COUNTROWS('Table')
  const tableRef = innerExpr.replace(/'/g, '').trim();
  const view = resolveTable(tableRef, ctx);
  const alias = getAlias(view, ctx);
  ctx.relatedTables.add(view);
  return `(SELECT COUNT(*) FROM ${view} ${alias})`;
}

function translateFilter(parsed, ctx) {
  const args = parsed.args;
  const tableExpr = args[0].trim().replace(/'/g, '');
  const view = resolveTable(tableExpr, ctx);
  const alias = getAlias(view, ctx);
  const conditions = args.slice(1).map(a => translateExpr(a, ctx)).join(' AND ');
  ctx.relatedTables.add(view);
  return `${view} ${alias} WHERE ${conditions}`;
}

function translateSelectedValue(parsed, ctx) {
  const argExpr = parsed.args[0].trim();
  const tcRef = parseTableColumnRef(argExpr);

  ctx.confidence = downgrade(ctx.confidence, 'inferred');

  if (tcRef) {
    const view = resolveTable(tcRef.table, ctx);
    const alias = getAlias(view, ctx);
    ctx.relatedTables.add(view);
    ctx.relatedColumns.add(`${view}.${tcRef.column}`);
    return `${alias}.${tcRef.column} /* @param: ${tcRef.column} — filter context */`;
  }

  return `/* SELECTEDVALUE: ${argExpr} */`;
}

function translateIsBlank(parsed, ctx) {
  const inner = translateExpr(parsed.args[0], ctx);
  return `(${inner}) IS NULL`;
}

function translateCoalesce(parsed, ctx) {
  const args = parsed.args.map(a => translateExpr(a, ctx));
  return `COALESCE(${args.join(', ')})`;
}

function translateNot(parsed, ctx) {
  const inner = translateExpr(parsed.args[0], ctx);
  return `NOT (${inner})`;
}

function translateRankx(parsed, ctx) {
  const args = parsed.args;
  // RANKX(table, expression, , , Dense/Skip)
  const tableExpr = args[0].trim().replace(/'/g, '');
  const rankExpr = translateExpr(args[1], ctx);
  const direction = (args.length > 3 && args[3]) ? args[3].trim() : '';
  const orderDir = /DESC/i.test(direction) ? 'DESC' : 'ASC';
  const rankType = (args.length > 4 && /DENSE/i.test(args[4])) ? 'DENSE_RANK' : 'RANK';
  const view = resolveTable(tableExpr, ctx);
  ctx.relatedTables.add(view);

  return `${rankType}() OVER (ORDER BY ${rankExpr} ${orderDir})`;
}

function translateIterator(parsed, ctx) {
  // SUMX/AVERAGEX('Table', expression)
  const funcName = parsed.name === 'SUMX' ? 'SUM' : 'AVG';
  const args = parsed.args;
  const tableExpr = args[0].trim().replace(/'/g, '');
  const view = resolveTable(tableExpr, ctx);
  const alias = getAlias(view, ctx);
  const rowExpr = translateExpr(args[1], ctx);
  ctx.relatedTables.add(view);

  return `(SELECT ${funcName}(${rowExpr}) FROM ${view} ${alias})`;
}

function translateMaxx(parsed, ctx) {
  const args = parsed.args;
  const tableExpr = args[0].trim().replace(/'/g, '');
  const view = resolveTable(tableExpr, ctx);
  const alias = getAlias(view, ctx);
  const rowExpr = translateExpr(args[1], ctx);
  ctx.relatedTables.add(view);

  return `(SELECT MAX(${rowExpr}) FROM ${view} ${alias})`;
}

function translateTopN(parsed, ctx) {
  const args = parsed.args;
  const n = args[0].trim();
  const tableExpr = args[1].trim().replace(/'/g, '');
  const view = resolveTable(tableExpr, ctx);
  const alias = getAlias(view, ctx);
  const orderExpr = args.length > 2 ? translateExpr(args[2], ctx) : '1';
  ctx.relatedTables.add(view);

  return `(SELECT TOP ${n} * FROM ${view} ${alias} ORDER BY ${orderExpr} DESC)`;
}

function translateValues(parsed, ctx) {
  const argExpr = parsed.args[0].trim();
  const tcRef = parseTableColumnRef(argExpr);
  if (tcRef) {
    const view = resolveTable(tcRef.table, ctx);
    const alias = getAlias(view, ctx);
    ctx.relatedTables.add(view);
    return `(SELECT DISTINCT ${alias}.${tcRef.column} FROM ${view} ${alias})`;
  }
  return `/* VALUES(${argExpr}) */`;
}

function translateHasOneValue(parsed, ctx) {
  const argExpr = parsed.args[0].trim();
  const tcRef = parseTableColumnRef(argExpr);
  if (tcRef) {
    const view = resolveTable(tcRef.table, ctx);
    const alias = getAlias(view, ctx);
    ctx.relatedTables.add(view);
    return `(SELECT CASE WHEN COUNT(DISTINCT ${alias}.${tcRef.column}) = 1 THEN 1 ELSE 0 END FROM ${view} ${alias})`;
  }
  return `/* HASONEVALUE(${argExpr}) */`;
}

function translateRelated(parsed, ctx) {
  const argExpr = parsed.args[0].trim();
  const tcRef = parseTableColumnRef(argExpr);
  if (tcRef) {
    const view = resolveTable(tcRef.table, ctx);
    const alias = getAlias(view, ctx);
    ctx.relatedTables.add(view);
    ctx.relatedColumns.add(`${view}.${tcRef.column}`);
    return `${alias}.${tcRef.column} /* via JOIN to ${view} */`;
  }
  return `/* RELATED(${argExpr}) */`;
}

function translateFormat(parsed, ctx) {
  const val = translateExpr(parsed.args[0], ctx);
  const fmt = parsed.args[1] ? parsed.args[1].trim() : '';
  return `FORMAT(${val}, ${fmt.replace(/"/g, "'")})`;
}

function translateVarReturn(parsed, ctx) {
  // Translate each VAR as a CTE-like inline, then compose RETURN
  const varValues = {};

  for (const v of parsed.vars) {
    // Replace previous VAR references in this var's expression
    let expr = v.expr;
    for (const [prevName, prevSql] of Object.entries(varValues)) {
      // Replace standalone occurrences of the var name
      const varRegex = new RegExp(`\\b${escapeRegex(prevName)}\\b`, 'g');
      expr = expr.replace(varRegex, `(${prevSql})`);
    }
    const sql = translateExpr(expr, ctx);
    varValues[v.name] = sql;
  }

  // Translate RETURN expression, substituting VARs
  let returnExpr = parsed.returnExpr;
  for (const [name, sql] of Object.entries(varValues)) {
    const varRegex = new RegExp(`\\b${escapeRegex(name)}\\b`, 'g');
    returnExpr = returnExpr.replace(varRegex, `(${sql})`);
  }

  return translateExpr(returnExpr, ctx);
}

/**
 * Translate a binary expression (operators at top level).
 * Handles: +, -, *, /, comparisons, &&, ||, AND, OR.
 */
function translateBinaryExpr(expr, ctx) {
  const trimmed = expr.trim();

  // Replace DAX-specific tokens
  let sql = trimmed;

  // Replace && with AND, || with OR
  sql = sql.replace(/&&/g, ' AND ');
  sql = sql.replace(/\|\|/g, ' OR ');

  // Replace TRUE() / FALSE()
  sql = sql.replace(/\bTRUE\(\)/gi, '1');
  sql = sql.replace(/\bFALSE\(\)/gi, '0');

  // Replace BLANK() with NULL
  sql = sql.replace(/\bBLANK\(\)/gi, 'NULL');

  // Translate table[column] references and measure refs inline
  // 'Table'[Column] refs
  sql = sql.replace(/'([^']+)'\[([^\]]+)\]/g, (match, table, column) => {
    const view = resolveTable(table, ctx);
    const alias = getAlias(view, ctx);
    ctx.relatedTables.add(view);
    ctx.relatedColumns.add(`${view}.${column}`);
    return `${alias}.${column}`;
  });

  // Unquoted Table[Column] refs (but not [MeasureRef])
  sql = sql.replace(/([A-Za-z_]\w*)\[([^\]]+)\]/g, (match, table, column) => {
    const view = resolveTable(table, ctx);
    if (view) {
      const alias = getAlias(view, ctx);
      ctx.relatedTables.add(view);
      ctx.relatedColumns.add(`${view}.${column}`);
      return `${alias}.${column}`;
    }
    return match;
  });

  // Standalone [MeasureRef]
  sql = sql.replace(/\[([^\]]+)\]/g, (match, name) => {
    const resolved = ctx.resolvedMeasures[name];
    if (resolved) {
      resolved.relatedTables.forEach(t => ctx.relatedTables.add(t));
      resolved.relatedColumns.forEach(c => ctx.relatedColumns.add(c));
      return resolved.sql;
    }
    ctx.confidence = downgrade(ctx.confidence, 'inferred');
    return `/* [${name}] */`;
  });

  // DAX IN {values} → SQL IN (values)
  sql = sql.replace(/\bIN\s+\{([^}]+)\}/gi, (match, values) => {
    const sqlValues = values.split(',').map(v => v.trim().replace(/"/g, "'")).join(', ');
    return `IN (${sqlValues})`;
  });

  // Replace DAX double-quote strings with single quotes
  sql = sql.replace(/"([^"]*)"/g, "'$1'");

  return sql;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  createTranslationContext,
  translateMeasure,
  translateExpr,
};
