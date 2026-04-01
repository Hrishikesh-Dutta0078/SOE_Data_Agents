/**
 * LLM Schema Selector — select relevant tables and columns from schema using an LLM.
 *
 * Used by discover_context: converts schema to Markdown, prompts the model with
 * the user question and optional entities, parses structured output (tables + columns
 * per table), and validates/fuzzy-resolves names against schema-knowledge.
 */

const { z } = require('zod');
const { getModel } = require('../config/llm');
const { loadSchemaKnowledgeAsync, fuzzyResolveTable } = require('./schemaFetcher');
const { searchTables } = require('./schemaSearcher');
const logger = require('../utils/logger');

const SchemaSelectionSchema = z.object({
  tables: z.array(z.string()).describe('Relevant table names from the schema'),
  columns: z
    .record(z.string(), z.array(z.string()))
    .describe('For each table name, the list of relevant column names'),
});

/**
 * Convert raw schema object (table name -> { description, columns }) to Markdown.
 *
 * @param {Record<string, { description?: string, columns: Record<string, { type: string, description?: string }> }>} rawSchema
 * @returns {string}
 */
function schemaToMarkdown(rawSchema) {
  const lines = [];
  for (const [tableName, tableData] of Object.entries(rawSchema)) {
    lines.push(`## ${tableName}`);
    if (tableData.description) {
      lines.push(tableData.description);
    }
    const cols = tableData.columns || {};
    if (Object.keys(cols).length > 0) {
      lines.push('| Column | Type | Description |');
      lines.push('|--------|------|-------------|');
      for (const [colName, col] of Object.entries(cols)) {
        const type = col.type || '';
        const desc = (col.description || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
        lines.push(`| ${colName} | ${type} | ${desc} |`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * Build the prompt for table/column selection.
 *
 * @param {string} query
 * @param {{ metrics?: string[], dimensions?: string[], filters?: string[], operations?: string[] }|null} entities
 * @param {string} schemaMarkdown
 * @returns {{ system: string, user: string }}
 */
function buildSelectionPrompt(query, entities, schemaMarkdown) {
  const system = `You are a database schema expert. Given a user question and the full database schema (tables and columns with types and descriptions), you must select ONLY the tables and columns that are relevant to answering the question.

Rules:
- Return table names exactly as they appear in the schema (e.g. vw_td_ebi_region_rpt).
- For each selected table, return the list of column names that are relevant to the question. Use exact column names from the schema.
- Do not invent table or column names. Only use names that appear in the schema below.
- If the question is ambiguous, include tables/columns that might be needed for common interpretations.
- Prefer a focused set of tables and columns; avoid listing every column of a table unless the question is broad.`;

  let userContent = `User question: ${query}\n\n`;
  if (entities && (entities.metrics?.length || entities.dimensions?.length || entities.filters?.length || entities.operations?.length)) {
    const parts = [];
    if (entities.metrics?.length) parts.push(`Metrics/dimensions of interest: ${entities.metrics.join(', ')}`);
    if (entities.dimensions?.length) parts.push(`Dimensions: ${entities.dimensions.join(', ')}`);
    if (entities.filters?.length) parts.push(`Filters: ${entities.filters.join(', ')}`);
    if (entities.operations?.length) parts.push(`Operations: ${entities.operations.join(', ')}`);
    userContent += `${parts.join('\n')}\n\n`;
  }
  userContent += `Schema:\n\n${schemaMarkdown}\n\nRespond with a JSON object with two keys: "tables" (array of table names) and "columns" (object mapping each table name to an array of column names).`;

  return { system, user: userContent };
}

/**
 * Validate and resolve table names; filter columns to those that exist on each table.
 *
 * @param {string[]} tableNames
 * @param {Record<string, string[]>} columnsByTable
 * @param {import('./schemaFetcher')} knowledge - loaded schema knowledge (tableIndex)
 * @returns {{ tableNames: string[], columnsByTable: Record<string, string[]> }}
 */
function validateAndResolve(tableNames, columnsByTable, knowledge) {
  const resolvedTableNames = [];
  const resolvedColumnsByTable = {};
  const tableIndex = knowledge.tableIndex;

  for (const name of tableNames || []) {
    const resolved = fuzzyResolveTable(name);
    if (resolved) {
      const canonical = resolved.resolvedName;
      if (!resolvedTableNames.includes(canonical)) {
        resolvedTableNames.push(canonical);
      }
      const entry = tableIndex.get(canonical.toLowerCase());
      const requestedCols = columnsByTable?.[name] || columnsByTable?.[canonical] || [];
      const validCols = [];
      if (entry && entry.columns) {
        const colKeysUpper = new Set(Object.keys(entry.columns).map((c) => c.toUpperCase()));
        for (const col of requestedCols) {
          const colUpper = (col || '').toUpperCase();
          if (colUpper && colKeysUpper.has(colUpper)) {
            const actualName = Object.keys(entry.columns).find((k) => k.toUpperCase() === colUpper);
            if (actualName && !validCols.includes(actualName)) validCols.push(actualName);
          }
        }
      }
      resolvedColumnsByTable[canonical] = validCols.length > 0 ? validCols : Object.keys(entry?.columns || {});
    }
  }

  return { tableNames: resolvedTableNames, columnsByTable: resolvedColumnsByTable };
}

/**
 * Select relevant tables and columns using the LLM. Returns validated table names
 * and columns per table (invalid/hallucinated names are dropped or fuzzy-resolved).
 *
 * @param {string} query - User question
 * @param {{ metrics?: string[], dimensions?: string[], filters?: string[], operations?: string[] }|null} [entities]
 * @param {{ profile?: string }|null} [opts]
 * @returns {Promise<{ tableNames: string[], columnsByTable: Record<string, string[]> }>}
 */
let _fullSchemaMarkdownCache = null;

async function selectTablesAndColumnsByLLM(query, entities = null, opts = null) {
  const knowledge = await loadSchemaKnowledgeAsync();
  const rawSchema = knowledge.tables || {};
  if (Object.keys(rawSchema).length === 0) {
    logger.warn('LLM schema selector: no schema loaded, returning empty selection');
    return { tableNames: [], columnsByTable: {} };
  }

  // Cache full markdown for fallback
  if (!_fullSchemaMarkdownCache) {
    _fullSchemaMarkdownCache = schemaToMarkdown(rawSchema);
  }

  // Pre-filter: keyword search to narrow candidate tables
  const candidateNames = searchTables(query, entities, 8);
  let schemaMarkdown;
  if (candidateNames.length >= 3) {
    const filtered = {};
    for (const name of candidateNames) {
      const lower = name.toLowerCase();
      const entry = Object.entries(rawSchema).find(([k]) => k.toLowerCase() === lower);
      if (entry) filtered[entry[0]] = entry[1];
    }
    schemaMarkdown = schemaToMarkdown(filtered);
    logger.info('Schema pre-filter', { candidates: candidateNames.length, fullTables: Object.keys(rawSchema).length });
  } else {
    schemaMarkdown = _fullSchemaMarkdownCache;
    logger.info('Schema pre-filter fallback: using full schema', { candidates: candidateNames.length });
  }

  const { system, user } = buildSelectionPrompt(query, entities, schemaMarkdown);

  const model = getModel({
    maxTokens: 2048,
    temperature: 0,
    nodeKey: 'contextFetch',
    profile: opts?.profile || undefined,
  }).withStructuredOutput(SchemaSelectionSchema);

  let parsed;
  try {
    const response = await model.invoke([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]);
    parsed = response;
  } catch (err) {
    logger.error('LLM schema selector: LLM call failed', { error: err.message });
    return { tableNames: [], columnsByTable: {} };
  }

  const tableNames = Array.isArray(parsed?.tables) ? parsed.tables : [];
  const columnsByTable = parsed?.columns && typeof parsed.columns === 'object' ? parsed.columns : {};

  const { tableNames: resolvedNames, columnsByTable: resolvedColumns } = validateAndResolve(
    tableNames,
    columnsByTable,
    knowledge
  );

  logger.info('LLM schema selection', {
    requested: tableNames.length,
    resolved: resolvedNames.length,
    tables: resolvedNames.join(', '),
  });

  return { tableNames: resolvedNames, columnsByTable: resolvedColumns };
}

module.exports = {
  schemaToMarkdown,
  buildSelectionPrompt,
  validateAndResolve,
  selectTablesAndColumnsByLLM,
};
