/**
 * Correct Node — LLM-based SQL correction.
 *
 * Uses direct message construction (not ChatPromptTemplate) because
 * the SQL and schema content can contain curly braces that would be
 * misinterpreted as template variables.
 */

const { getModel, getModelMeta } = require('../../config/llm');
const { CORRECT_MAX_TOKENS, CORRECT_TEMPERATURE } = require('../../config/constants');
const { getSchemaByTableNames, getAllTableNames, getColumnMetadataForTable, fuzzyResolveTable, loadSchemaKnowledgeAsync } = require('../../vectordb/schemaFetcher');
const { ERROR_STRATEGIES } = require('../../prompts/correct');
const logger = require('../../utils/logger');

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

function extractCteNames(sql) {
  const names = new Set();
  const ctePattern = /(?:\bWITH\b|,)\s*([A-Za-z_][\w]*)\s+AS\s*\(/gi;
  let m;
  while ((m = ctePattern.exec(sql)) !== null) {
    names.add(m[1].toLowerCase());
  }
  return names;
}

/**
 * Find schema-based column suggestions for an invalid column name.
 * Returns at most 2 suggestions: columns that contain the bad name (e.g. MARKET_SEGMENT for SEGMENT)
 * or that the bad name contains, preferring longer matches.
 */
function suggestColumnsForInvalidName(badCol, tableNames, maxSuggestions = 2) {
  if (!badCol || !tableNames?.length) return [];
  const badLower = badCol.toLowerCase();
  const candidates = [];

  for (const tableName of tableNames) {
    const resolved = fuzzyResolveTable(tableName);
    if (!resolved?.entry?.columns) continue;
    const colNames = Object.keys(resolved.entry.columns);

    for (const col of colNames) {
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
    .filter((c) => {
      const key = `${c.table}.${c.column}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxSuggestions)
    .map((c) => `${c.column} (from ${c.table})`);
}

function stripTablePrefix(name) {
  return name.toLowerCase()
    .replace(/^vw_tf_/i, '')
    .replace(/^vw_td_/i, '')
    .replace(/^tf_/i, '')
    .replace(/^td_/i, '')
    .replace(/^vw_/i, '');
}

/**
 * Suggest real tables for a hallucinated table name using stripped-name
 * containment and keyword overlap. Returns table names + column metadata.
 */
function suggestTablesForInvalidName(badTable, maxSuggestions = 3) {
  if (!badTable) return [];
  const allNames = getAllTableNames();
  const badStripped = stripTablePrefix(badTable);
  const badTokens = badStripped.split('_').filter((t) => t.length > 2);
  const candidates = [];

  for (const realTable of allNames) {
    const realStripped = stripTablePrefix(realTable);
    if (realStripped === badStripped) {
      candidates.push({ table: realTable, score: 100 });
      continue;
    }
    if (realStripped.includes(badStripped) || badStripped.includes(realStripped)) {
      const shorter = Math.min(realStripped.length, badStripped.length);
      if (shorter >= 4) {
        candidates.push({ table: realTable, score: 50 + shorter });
        continue;
      }
    }
    const realTokens = realStripped.split('_').filter((t) => t.length > 2);
    const overlap = badTokens.filter((t) => realTokens.some((rt) => rt.includes(t) || t.includes(rt)));
    if (overlap.length > 0) {
      candidates.push({ table: realTable, score: overlap.length * 10 + overlap.join('').length });
    }
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

function formatResearchBriefForCorrection(brief) {
  if (!brief) return '';
  let text = '\n\n=== RESEARCH BRIEF (tables, joins, and rules from research phase) ===\n';

  if (brief.tables?.length > 0) {
    text += 'TABLES:\n';
    for (const t of brief.tables) {
      text += `- ${t.name}`;
      if (t.description) text += ` — ${t.description}`;
      text += '\n';
      if (t.verifiedColumns?.length > 0) {
        text += `  Verified columns: ${t.verifiedColumns.join(', ')}\n`;
      } else if (t.relevantColumns?.length > 0) {
        text += `  Columns: ${t.relevantColumns.join(', ')}\n`;
      }
    }
  }

  if (brief.joins?.length > 0) {
    text += 'JOIN PATHS:\n';
    for (const j of brief.joins) {
      text += `- ${j.from} ${j.type || 'JOIN'} ${j.to}`;
      if (j.on) text += ` ON ${j.on}`;
      text += '\n';
    }
  }

  if (brief.businessRules?.length > 0) {
    text += 'BUSINESS RULES:\n';
    for (const r of brief.businessRules) {
      text += `- ${r}\n`;
    }
  }

  if (brief.examplePatterns?.length > 0) {
    text += 'EXAMPLE PATTERNS:\n';
    for (const p of brief.examplePatterns) {
      text += `- ${p}\n`;
    }
  }

  return text;
}

async function correctNode(state) {
  const start = Date.now();

  await loadSchemaKnowledgeAsync();

  const errorType = state.errorType || 'SYNTAX_ERROR';
  const strategy = ERROR_STRATEGIES[errorType] || ERROR_STRATEGIES.SYNTAX_ERROR;
  const validationIssues = formatIssues(state.validationReport?.passes);
  const previousCorrectionAttempts = state.attempts?.correction || 0;

  const exactColumnRefHeader = '\n\n=== EXACT COLUMN REFERENCE (use ONLY these columns — anything else will cause "Invalid column name") ===\n';
  let schemaBlock = '';
  const tablesCovered = new Set();
  let tableNames = [];

  try {
    if (state.correctionColumnReference) {
      schemaBlock = state.correctionColumnReference;
      if (schemaBlock && !schemaBlock.includes('EXACT COLUMN REFERENCE')) {
        schemaBlock = exactColumnRefHeader + schemaBlock;
      }
      if (state.researchBrief?.tables) {
        state.researchBrief.tables.forEach((bt) => tablesCovered.add(bt.name.toLowerCase()));
      }
    }

    if (!schemaBlock && state.researchBrief?.tables?.length > 0) {
      const briefCols = state.researchBrief.tables.map((bt) => {
        const meta = bt.columnMetadata || getColumnMetadataForTable(bt.name);
        if (!meta) return null;
        tablesCovered.add(bt.name.toLowerCase());
        return `-- ${bt.name}:\n${meta}`;
      }).filter(Boolean);
      if (briefCols.length > 0) {
        schemaBlock = exactColumnRefHeader + briefCols.join('\n\n');
      }
    }

    tableNames = extractTableNames(state.sql);
    if (tableNames.length > 0) {
      const extraCols = tableNames
        .filter((t) => !tablesCovered.has(t.toLowerCase()))
        .map((t) => {
          const colMeta = getColumnMetadataForTable(t);
          if (!colMeta) return null;
          return `-- ${t}:\n${colMeta}`;
        })
        .filter(Boolean);
      if (extraCols.length > 0) {
        const extraBlock = extraCols.join('\n\n');
        schemaBlock = schemaBlock
          ? schemaBlock + '\n\n' + extraBlock
          : exactColumnRefHeader + extraBlock;
      }

      if (!schemaBlock) {
        const schemas = getSchemaByTableNames(tableNames);
        if (schemas.length > 0) {
          schemaBlock = '\n\n=== SCHEMA REFERENCE (use ONLY columns listed here) ===\n'
            + schemas.map((t) => {
              let entry = `-- ${t.table_name}: ${t.description}`;
              if (t.important_columns) {
                entry += `\n   Columns: ${t.important_columns}`;
              }
              return entry;
            }).join('\n\n');
        }
      }
    }
  } catch (err) {
    logger.warn('Correct: schema lookup failed', { error: err.message });
  }

  let researchContext = formatResearchBriefForCorrection(state.researchBrief);

  if (!schemaBlock && (errorType === 'EXECUTION_ERROR' || errorType === 'SCHEMA_ERROR')) {
    try {
      const allTables = getAllTableNames();
      const schemas = getSchemaByTableNames(allTables);
      schemaBlock = '\n\n=== VALID DATABASE TABLES (use ONLY these table/view names) ===\n'
        + schemas.map((t) => `- ${t.table_name} — ${t.description || ''}`).join('\n');

      const unresolvedFromSql = tableNames.filter((t) => !fuzzyResolveTable(t));
      const suggestedReplacements = new Set();
      for (const bad of unresolvedFromSql) {
        for (const suggested of suggestTablesForInvalidName(bad, 2)) {
          suggestedReplacements.add(suggested);
        }
      }
      const metaBlocks = [...suggestedReplacements]
        .map((t) => {
          const meta = getColumnMetadataForTable(t);
          return meta ? `-- ${t}:\n${meta}` : null;
        })
        .filter(Boolean);
      if (metaBlocks.length > 0) {
        schemaBlock += '\n\n=== EXACT COLUMN REFERENCE (use ONLY these columns — anything else will cause "Invalid column name") ===\n'
          + metaBlocks.join('\n\n');
      }
    } catch (err) {
      logger.warn('Correct: getAllTableNames failed', { error: err.message });
    }
  }

  let errorSpecificGuidance = '';
  const issueText = validationIssues.join(' ');
  const invalidColMatch = issueText.match(/Invalid column name '(\w+)'/i);
  if (invalidColMatch) {
    const badCol = invalidColMatch[1];
    errorSpecificGuidance += `\n\nCRITICAL: The column "${badCol}" does NOT exist in any table. You MUST replace it with an actual column from the EXACT COLUMN REFERENCE above. Search the column lists carefully — do NOT guess or invent column names.`;

    let searchTables = tableNames.length > 0 ? [...tableNames] : [];
    if (state.researchBrief?.tables?.length > 0) {
      for (const bt of state.researchBrief.tables) {
        if (!searchTables.includes(bt.name)) searchTables.push(bt.name);
      }
    }
    const unresolvedFromSql = tableNames.filter((t) => !fuzzyResolveTable(t));
    for (const bad of unresolvedFromSql) {
      for (const suggested of suggestTablesForInvalidName(bad, 2)) {
        if (!searchTables.includes(suggested)) searchTables.push(suggested);
      }
    }

    const suggestions = suggestColumnsForInvalidName(badCol, searchTables, 3);
    if (suggestions.length > 0) {
      errorSpecificGuidance += `\nSuggested replacement(s): ${suggestions.join('; ')}.`;
    }
  }
  const isSyntaxLikeError = /Incorrect syntax near|syntax\s*error|unbalanced\s*paren|near\s*'\)'/i.test(issueText);
  if (isSyntaxLikeError) {
    errorSpecificGuidance += `\n\nCRITICAL — This is a SQL SYNTAX/STRUCTURE error. You MUST:
- Count and balance every parenthesis: each ( must have a matching ). Check CTEs and subqueries.
- Ensure commas separate all items in SELECT lists, GROUP BY, ORDER BY, and function arguments. No missing or extra commas.
- Do not leave an empty expression or trailing comma before a closing parenthesis.
Return ONLY valid, executable SQL with no explanation.`;
  }

  const typeConversionMatch = issueText.match(/Conversion failed when converting (?:the )?(\w+) value '([^']+)' to data type (\w+)/i);
  if (typeConversionMatch) {
    const [, sourceType, sampleValue, targetType] = typeConversionMatch;
    errorSpecificGuidance += `\n\nCRITICAL — TYPE CONVERSION ERROR: The column being converted contains non-${targetType} values like '${sampleValue}'.
This means the column has MIXED data types (e.g., both numbers and text like 'INTL', 'N/A', 'WW', 'TBD').
You MUST fix ALL ${sourceType}-to-${targetType} conversions in the query, not just the one that failed:
- Replace CAST(col AS ${targetType}) with TRY_CAST(col AS ${targetType})
- Replace CONVERT(${targetType}, col) with TRY_CONVERT(${targetType}, col)
- For WHERE clauses filtering on numeric values, add ISNUMERIC(col) = 1 or use TRY_CAST(col AS ${targetType}) IS NOT NULL
- For SUM/AVG aggregations, use SUM(TRY_CAST(col AS ${targetType})) instead of SUM(CAST(col AS ${targetType}))
- Check ALL columns in the query that might have mixed types — the error showed '${sampleValue}' but the same column likely has other non-numeric values too.
Do NOT just handle the specific value '${sampleValue}' — use TRY_CAST/TRY_CONVERT to handle ALL non-numeric values generically.`;
  }

  const invalidObjMatch = issueText.match(/Invalid object name '([^']+)'/i);
  if (invalidObjMatch) {
    const badTable = invalidObjMatch[1];
    const briefTables = (state.researchBrief?.tables || [])
      .filter((t) => t.columnMetadata)
      .map((t) => t.name);
    let tableList = '';
    if (briefTables.length > 0) {
      tableList = `\nYou MUST use ONLY one of these valid tables: ${briefTables.join(', ')}. Replace "${badTable}" with the correct table from this list.`;
    } else {
      const suggested = suggestTablesForInvalidName(badTable, 3);
      if (suggested.length > 0) {
        tableList = `\nSuggested replacement table(s): ${suggested.join(', ')}. Replace "${badTable}" with one of these.`;
        const metaParts = suggested
          .map((t) => { const m = getColumnMetadataForTable(t); return m ? `-- ${t}:\n${m}` : null; })
          .filter(Boolean);
        if (metaParts.length > 0 && !schemaBlock.includes('EXACT COLUMN REFERENCE')) {
          schemaBlock += '\n\n=== EXACT COLUMN REFERENCE (use ONLY these columns — anything else will cause "Invalid column name") ===\n'
            + metaParts.join('\n\n');
        }
      }
    }
    errorSpecificGuidance += `\n\nCRITICAL: The table/view "${badTable}" does NOT exist.${tableList}
- Replace "${badTable}" with the correct table name from the list above. Use the EXACT COLUMN REFERENCE for that table for all column names.
- Do NOT guess table or column names.`;
  }

  let priorAttemptsBlock = '';
  const trace = state.trace || [];
  const priorCorrections = trace.filter((t) => t.node === 'correct' || (t.node === 'execute' && t.error));
  if (priorCorrections.length > 0) {
    priorAttemptsBlock = '\n\n=== PRIOR CORRECTION ATTEMPTS (do NOT repeat these mistakes) ===\n';
    for (const t of priorCorrections) {
      if (t.node === 'execute' && t.error) {
        priorAttemptsBlock += `- Attempt execution failed: ${t.error}\n`;
      } else if (t.node === 'correct') {
        priorAttemptsBlock += `- Correction attempt ${t.attempt || '?'}: fixed ${t.errorType || 'unknown'}\n`;
      }
    }
  }

  const issuesText = validationIssues.length > 0
    ? validationIssues.map((i) => `- ${i}`).join('\n')
    : '- Unknown error';

  const feedbackText = state.reflectionFeedback
    ? `Reflection feedback: ${state.reflectionFeedback}`
    : '';

  const plan = state.queryPlan || [];
  const qIdx = state.currentQueryIndex || 0;
  const isMultiQuery = plan.length > 1;
  const multiLabel = isMultiQuery ? ` [Query ${qIdx + 1}/${plan.length}]` : '';
  const activeQuestion = isMultiQuery
    ? (plan[qIdx]?.subQuestion || state.question)
    : state.question;

  const messages = [
    {
      role: 'system',
      content: `You are a SQL correction expert. Fix the SQL query based on the error type and strategy below.
Error type: ${errorType}
Strategy: ${strategy}
${schemaBlock}
${researchContext}
${priorAttemptsBlock}${errorSpecificGuidance}

IMPORTANT:
- Do NOT remove or modify any REGION_ID / FLM_ID subquery filters — those are security filters that must remain.
- PRESERVE dimension label joins: if the SQL joins with vw_EBI_CALDATE or other dimension tables for human-readable labels (e.g., FISCAL_YR_AND_QTR_DESC instead of numeric IDs), keep those joins intact. If showing fiscal quarters, use FISCAL_YR_AND_QTR_DESC from vw_EBI_CALDATE, not raw ID columns.
Return ONLY the corrected SQL query, no explanation or markdown fences.`,
    },
    {
      role: 'user',
      content: `Original question: ${activeQuestion}

Current SQL (has errors):
${state.sql}

Validation issues:
${issuesText}

${feedbackText}

Provide the corrected SQL only.`,
    },
  ];
  const issueSummary = validationIssues.join(' | ');
  logger.info(`[Correct]${multiLabel} Fixing ${errorType}: ${issueSummary.substring(0, 200)}`, {
    errorType,
    issueCount: validationIssues.length,
    attempt: previousCorrectionAttempts + 1,
    sqlLength: (state.sql || '').length,
    ...(errorType === 'EXECUTION_ERROR' && issueSummary
      ? { executionErrorPreview: issueSummary.substring(0, 150) }
      : {}),
  });

  const model = getModel({
    maxTokens: CORRECT_MAX_TOKENS,
    temperature: CORRECT_TEMPERATURE,
    nodeKey: 'correct',
    profile: state.useFastModel === true ? 'opus' : undefined,
  });
  const resolvedModelMeta = getModelMeta(model);

  const llmStart = Date.now();
  const response = await model.invoke(messages);

  const llmMs = Date.now() - llmStart;
  const correctedSql = response.content ?? '';
  let cleanSql = correctedSql.replace(/```sql\n?/gi, '').replace(/```/g, '').trim();

  const sqlStartMatch = cleanSql.match(/^.*?(?=\b(?:WITH|SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DECLARE|MERGE|EXEC)\b)/is);
  if (sqlStartMatch && sqlStartMatch[0].length > 0) {
    cleanSql = cleanSql.substring(sqlStartMatch[0].length).trim();
  }

  const attempts = { ...(state.attempts || { agent: 0, correction: 0, reflection: 0, resultCheck: 0 }) };
  attempts.correction += 1;

  const sqlChanged = cleanSql !== state.sql;
  logger.info(`[Correct]${multiLabel} Done (${Date.now() - start}ms) — SQL ${sqlChanged ? 'changed' : 'unchanged'}, attempt ${attempts.correction}`, {
    errorType,
    attempt: attempts.correction,
    llmMs,
    sqlChanged,
    sqlLength: cleanSql.length,
    model: resolvedModelMeta?.modelName || 'unknown',
    ...(sqlChanged ? { fixApplied: true } : { fixApplied: false }),
  });

  return {
    sql: cleanSql,
    attempts,
    trace: [{
      node: 'correct',
      timestamp: Date.now(),
      errorType,
      attempt: attempts.correction,
      llm: resolvedModelMeta,
    }],
  };
}

module.exports = { correctNode };
