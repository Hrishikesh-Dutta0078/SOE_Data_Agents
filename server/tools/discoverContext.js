/**
 * Discover Context — single-call research discovery tool.
 *
 * Merges six formerly separate tools into one in-memory call:
 *   search_schema + search_examples + search_business_rules
 *   + get_join_rules + get_column_metadata + get_current_fiscal_period
 *
 * Accepts an optional entities object (from the classify step) to boost
 * search relevance with validated entity terms.
 */

const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { selectTablesAndColumnsByLLM } = require('../vectordb/llmSchemaSelector');
const { getSchemaByTableNames, getColumnMetadataForTable } = require('../vectordb/schemaFetcher');
const { searchExamples } = require('../vectordb/examplesFetcher');
const { searchRules } = require('../vectordb/rulesFetcher');
const { searchKpis } = require('../vectordb/kpiFetcher');
const { getJoinRulesForTables, formatJoinRulesText } = require('../vectordb/joinRuleFetcher');
const { fetchFiscalPeriod } = require('../vectordb/fiscalPeriodFetcher');
const { getDistinctValues, getAvailableColumns } = require('../vectordb/distinctValuesFetcher');
const logger = require('../utils/logger');

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

const COLUMN_METADATA_TOP_N = 12;
const DISTINCT_VALUES_LIMIT = 15;
const DISTINCT_VALUES_MAX_COLS_PER_TABLE = 30;

function appendDistinctValuesSection(sections, tableNames) {
  const dvLines = [];
  for (const tableName of tableNames) {
    const allCols = getAvailableColumns(tableName);
    for (const col of allCols.slice(0, DISTINCT_VALUES_MAX_COLS_PER_TABLE)) {
      const result = getDistinctValues(tableName, col, DISTINCT_VALUES_LIMIT);
      if (result.available && result.values && result.values.length > 0) {
        dvLines.push(`  ${tableName}.${col}: ${result.values.join(', ')}`);
      }
    }
  }
  if (dvLines.length > 0) {
    sections.push('\n=== DISTINCT VALUES (pre-fetched for selected columns) ===');
    sections.push('Use these values for WHERE clause filters. No need to call query_distinct_values unless you need a column not listed here.');
    sections.push(dvLines.join('\n'));
  }
}

const discoverContextTool = new DynamicStructuredTool({
  name: 'discover_context',
  description:
    'Discover all relevant context for a query in one call: schema tables, example SQL patterns, ' +
    'business rules, join rules, column metadata for top tables, the current fiscal period, ' +
    'and pre-fetched distinct values for selected columns. ' +
    'Pass the user question and optionally the detected entities to boost search accuracy.',
  schema: z.object({
    query: z.string().describe('The user question or search terms'),
    entities: z.object({
      metrics: z.array(z.string()).nullable().optional(),
      dimensions: z.array(z.string()).nullable().optional(),
      filters: z.array(z.string()).nullable().optional(),
      operations: z.array(z.string()).nullable().optional(),
    }).nullable().optional().describe('Detected entities from classification (metrics, dimensions, filters, operations)'),
  }),
  func: async ({ query, entities }) => {
    const enrichedQuery = buildEnrichedQuery(query, entities);

    // Start async calls first — these run in parallel
    const fiscalPromise = fetchFiscalPeriod();
    const llmPromise = selectTablesAndColumnsByLLM(query, entities || null);

    // Keyword searches don't depend on LLM result — run while LLM processes
    const examples = searchExamples(enrichedQuery, 5);
    const rules = searchRules(enrichedQuery, 8);
    const kpis = searchKpis(enrichedQuery, 5);

    // Wait for LLM table/column selection
    const { tableNames, columnsByTable } = await llmPromise;

    // These depend on tableNames from LLM
    const joinRules = getJoinRulesForTables(tableNames);
    const joinText = formatJoinRulesText(joinRules);

    const tables = getSchemaByTableNames(tableNames);

    const columnDetails = {};
    for (const tableName of tableNames.slice(0, COLUMN_METADATA_TOP_N)) {
      const fullMeta = getColumnMetadataForTable(tableName);
      if (!fullMeta) continue;
      const selectedCols = columnsByTable[tableName];
      if (selectedCols && selectedCols.length > 0) {
        const lines = fullMeta.split('\n');
        const selectedSet = new Set(selectedCols.map((c) => c.toUpperCase()));
        const filtered = lines.filter((line) => {
          const colName = line.split(/\s/)[0];
          return colName && selectedSet.has(colName.toUpperCase());
        });
        columnDetails[tableName] = filtered.length > 0 ? filtered.join('\n') : fullMeta;
      } else {
        columnDetails[tableName] = fullMeta;
      }
    }

    const fiscalPeriod = await fiscalPromise;

    logger.info('Context discovered', {
      tables: tableNames.join(', '),
      exampleCount: examples.length,
      ruleCount: rules.length,
      kpiCount: kpis.length,
      fiscalPeriod: fiscalPeriod ? fiscalPeriod.FISCAL_YR_AND_QTR_DESC : 'unavailable',
    });

    const sections = [];

    sections.push('=== TABLES ===');
    if (tables.length > 0) {
      for (const t of tables) {
        const parts = [`**${t.table_name}**`];
        if (t.description) parts.push(`  Description: ${t.description}`);
        if (t.key_columns) parts.push(`  Key columns: ${t.key_columns}`);
        if (t.important_columns) parts.push(`  Important columns: ${t.important_columns}`);
        sections.push(parts.join('\n'));
      }
    } else {
      sections.push('No relevant tables found.');
    }

    sections.push('\n=== EXAMPLE SQL PATTERNS ===');
    if (examples.length > 0) {
      for (const ex of examples) {
        sections.push(`Q: "${ex.question}"\nSQL: ${ex.sql}\n(tables: ${ex.tables_used})`);
      }
    } else {
      sections.push('No matching examples found.');
    }

    sections.push('\n=== BUSINESS RULES ===');
    if (rules.length > 0) {
      for (const r of rules) {
        sections.push(`- [${r.category}] ${r.text}`);
      }
    } else {
      sections.push('No matching business rules found.');
    }

    sections.push('\n=== KPI DEFINITIONS ===');
    if (kpis.length > 0) {
      for (const k of kpis) {
        let block = `**${k.name}** (id: ${k.id})\n  Definition: ${k.definition}\n  Formula: ${k.formula}`;
        if (Object.keys(k.components).length > 0) {
          const compLines = Object.entries(k.components).map(([key, val]) => `    ${key}: ${val}`).join('\n');
          block += `\n  Components:\n${compLines}`;
        }
        if (k.relatedTables && k.relatedTables.length > 0) {
          block += `\n  Related tables: ${k.relatedTables.join(', ')}`;
        }
        if (k.relatedColumns && k.relatedColumns.length > 0) {
          block += `\n  Related columns: ${k.relatedColumns.join(', ')}`;
        }
        sections.push(block);
      }
    } else {
      sections.push('No matching KPI definitions found.');
    }

    if (joinText) {
      sections.push(`\n${joinText}`);
    }

    if (Object.keys(columnDetails).length > 0) {
      sections.push('\n=== COLUMN DETAILS (top tables) ===');
      for (const [tableName, meta] of Object.entries(columnDetails)) {
        sections.push(`\n**${tableName}**\n${meta}`);
      }
    }

    if (fiscalPeriod) {
      sections.push(`\n=== CURRENT FISCAL PERIOD ===\nFiscal Year: ${fiscalPeriod.FISCAL_YR}\nFiscal Quarter: ${fiscalPeriod.FISCAL_YR_AND_QTR_DESC}\nFiscal Month: ${fiscalPeriod.FISCAL_MTH}`);
    }

    appendDistinctValuesSection(sections, tableNames);

    return sections.join('\n');
  },
});

module.exports = discoverContextTool;
module.exports.__testables = { appendDistinctValuesSection };
