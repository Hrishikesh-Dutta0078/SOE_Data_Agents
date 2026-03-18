/**
 * Context Fetch Node — programmatic context assembly.
 *
 * Replaces the ReAct research agent's discover_context tool with a
 * direct programmatic node. Runs LLM table selection + keyword searches
 * (examples, rules, KPIs) + fiscal period in parallel, then assembles
 * schema, joins, column metadata, and distinct values sequentially
 * (these depend on the selected table names).
 *
 * Returns a raw contextBundle for the downstream generateSql node.
 */

const { selectTablesAndColumnsByLLM } = require('../../vectordb/llmSchemaSelector');
const { getSchemaByTableNames, getColumnMetadataForTable } = require('../../vectordb/schemaFetcher');
const { searchExamples } = require('../../vectordb/examplesFetcher');
const { searchRules } = require('../../vectordb/rulesFetcher');
const { searchKpis } = require('../../vectordb/kpiFetcher');
const { getJoinRulesForTables, formatJoinRulesText } = require('../../vectordb/joinRuleFetcher');
const { fetchFiscalPeriod } = require('../../vectordb/fiscalPeriodFetcher');
const { getDistinctValues, getAvailableColumns } = require('../../vectordb/distinctValuesFetcher');
const logger = require('../../utils/logger');

const MAX_COLUMN_METADATA_TABLES = 12;
const DISTINCT_VALUES_LIMIT = 15;
const DISTINCT_VALUES_MAX_COLS_PER_TABLE = 30;

/**
 * Build an enriched query string by appending entity terms (duplicated for
 * keyword weight boost) to the original question. Matches the logic in
 * discoverContext.js exactly.
 *
 * @param {string} query
 * @param {{ metrics?: string[], dimensions?: string[], filters?: string[], operations?: string[] }|null} entities
 * @returns {string}
 */
function buildEnrichedQuery(query, entities) {
  const parts = [query || ''];

  if (!entities) return parts[0];

  for (const key of ['metrics', 'dimensions', 'filters', 'operations']) {
    const terms = entities[key];
    if (Array.isArray(terms)) {
      for (const term of terms) {
        parts.push(term);
        parts.push(term);
      }
    }
  }

  return parts.join(' ');
}

/**
 * Resolve the current question, accounting for decomposed sub-queries.
 * When the pipeline is processing a multi-part query plan, use the
 * sub-question for the current index; otherwise use the top-level question.
 *
 * @param {object} state — LangGraph workflow state
 * @returns {string}
 */
function getCurrentQuestion(state) {
  const plan = state.queryPlan || [];
  const idx = state.currentQueryIndex || 0;
  if (plan.length > 1 && plan[idx]?.subQuestion) {
    return plan[idx].subQuestion;
  }
  return state.question;
}

/**
 * Collect pre-harvested distinct values for the selected tables.
 * Returns a map of tableName -> array of "Table.Column: val1, val2, ..." strings.
 *
 * @param {string[]} tableNames
 * @returns {Record<string, string[]>}
 */
function collectDistinctValues(tableNames) {
  const dvByTable = {};
  for (const tableName of tableNames) {
    const allCols = getAvailableColumns(tableName);
    const lines = [];
    for (const col of allCols.slice(0, DISTINCT_VALUES_MAX_COLS_PER_TABLE)) {
      const result = getDistinctValues(tableName, col, DISTINCT_VALUES_LIMIT);
      if (result.available && result.values && result.values.length > 0) {
        lines.push(`${tableName}.${col}: ${result.values.join(', ')}`);
      }
    }
    if (lines.length > 0) {
      dvByTable[tableName] = lines;
    }
  }
  return dvByTable;
}

/**
 * contextFetchNode — the LangGraph node function.
 *
 * Gathers all context needed for SQL generation:
 *   Phase 1 (parallel): LLM table selection, keyword searches, fiscal period
 *   Phase 2 (sequential, depends on tableNames): schema, joins, column metadata,
 *           distinct values
 *
 * @param {object} state — LangGraph workflow state
 * @returns {object} — state update with contextBundle and trace entry
 */
async function contextFetchNode(state) {
  const start = Date.now();
  const question = getCurrentQuestion(state);
  const entities = state.entities;
  const enrichedQuery = buildEnrichedQuery(question, entities);

  // --- Phase 1: parallel fetches ---
  // selectTablesAndColumnsByLLM and fetchFiscalPeriod are async;
  // searchExamples, searchRules, searchKpis are synchronous but harmless in Promise.all.
  const [tableSelection, examples, rules, kpis, fiscalPeriod] = await Promise.all([
    selectTablesAndColumnsByLLM(question, entities || null),
    Promise.resolve(searchExamples(enrichedQuery, 5)),
    Promise.resolve(searchRules(enrichedQuery, 8)),
    Promise.resolve(searchKpis(enrichedQuery, 5)),
    fetchFiscalPeriod(),
  ]);

  const { tableNames, columnsByTable } = tableSelection;

  // --- Phase 2: sequential, depends on selected tables ---
  const joinRules = getJoinRulesForTables(tableNames);
  const joinText = formatJoinRulesText(joinRules);
  const schema = getSchemaByTableNames(tableNames);

  // Column metadata — optionally filtered to LLM-selected columns
  const columnMetadata = {};
  for (const t of tableNames.slice(0, MAX_COLUMN_METADATA_TABLES)) {
    const fullMeta = getColumnMetadataForTable(t);
    if (!fullMeta) continue;

    const selectedCols = columnsByTable[t];
    if (selectedCols && selectedCols.length > 0) {
      // Filter to only the LLM-selected columns (same logic as discoverContext.js)
      const lines = fullMeta.split('\n');
      const selectedSet = new Set(selectedCols.map((c) => c.toUpperCase()));
      const filtered = lines.filter((line) => {
        const colName = line.split(/\s/)[0];
        return colName && selectedSet.has(colName.toUpperCase());
      });
      columnMetadata[t] = filtered.length > 0 ? filtered.join('\n') : fullMeta;
    } else {
      columnMetadata[t] = fullMeta;
    }
  }

  // Distinct values for WHERE clause filter hints
  const distinctValues = collectDistinctValues(tableNames);

  const duration = Date.now() - start;
  logger.info('contextFetch complete', {
    tables: tableNames.join(', '),
    tableCount: tableNames.length,
    exampleCount: examples.length,
    ruleCount: rules.length,
    kpiCount: kpis.length,
    fiscalPeriod: fiscalPeriod ? fiscalPeriod.FISCAL_YR_AND_QTR_DESC : 'unavailable',
    distinctValueTables: Object.keys(distinctValues).length,
    durationMs: duration,
  });

  return {
    contextBundle: {
      tableNames,
      columnsByTable,
      schema,
      columnMetadata,
      joinRules,
      joinText,
      examples,
      rules,
      kpis,
      fiscalPeriod,
      distinctValues,
    },
    trace: [{
      node: 'contextFetch',
      timestamp: Date.now(),
      duration,
      tableCount: tableNames.length,
    }],
  };
}

module.exports = { contextFetchNode, getCurrentQuestion, buildEnrichedQuery };
