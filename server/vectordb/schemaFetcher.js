/**
 * Schema Fetcher — programmatic schema retrieval from schema-knowledge.json.
 *
 * Table/column selection for discovery is done by the LLM (see llmSchemaSelector.js).
 * This module provides: getSchemaByTableNames, getColumnMetadataForTable,
 * fuzzyResolveTable, loadSchemaKnowledgeAsync. Schema format is reduced:
 * table description + columns with type, description, optional pk/fk.
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const SCHEMA_KNOWLEDGE_PATH = path.join(
  __dirname,
  '..',
  'context',
  'knowledge',
  'schema-knowledge.json'
);

let _schemaKnowledge = null;
let _loadPromise = null;

function buildSchemaKnowledgeFromRaw(raw) {
  const tableIndex = new Map();
  for (const [tableName, tableData] of Object.entries(raw)) {
    const lowerName = tableName.toLowerCase();
    tableIndex.set(lowerName, { table_name: tableName, ...tableData });
    tableIndex.get(lowerName)._lowerName = lowerName;
  }
  return { tables: raw, tableIndex };
}

async function loadSchemaKnowledgeAsync() {
  if (_schemaKnowledge) return _schemaKnowledge;
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    if (!fs.existsSync(SCHEMA_KNOWLEDGE_PATH)) {
      logger.warn('Schema knowledge JSON not found', { path: SCHEMA_KNOWLEDGE_PATH });
      _schemaKnowledge = { tables: {}, tableIndex: new Map() };
      return _schemaKnowledge;
    }
    const raw = JSON.parse(await fs.promises.readFile(SCHEMA_KNOWLEDGE_PATH, 'utf-8'));
    _schemaKnowledge = buildSchemaKnowledgeFromRaw(raw);
    return _schemaKnowledge;
  })();
  return _loadPromise;
}

function loadSchemaKnowledge() {
  if (_schemaKnowledge) return _schemaKnowledge;
  return { tables: {}, tableIndex: new Map() };
}

/**
 * Lookup by table name(s) with fuzzy fallback.
 *
 * @param {string[]} tableNames
 * @returns {Array<{ table_name, description, columns }>}
 */
function getSchemaByTableNames(tableNames) {
  if (!tableNames || tableNames.length === 0) return [];

  const results = [];

  for (const name of tableNames) {
    const resolved = fuzzyResolveTable(name);
    if (resolved) {
      results.push(formatTableOutput(resolved.entry));
    }
  }

  return results;
}

/**
 * Fuzzy resolve: when an exact lowercase match fails, find the best
 * matching table by substring containment. Handles LLM-generated names
 * like "vw_EBI_QUOTA" resolving to "vw_TF_EBI_QUOTA".
 *
 * @param {string} name
 * @returns {{ entry: object, resolvedName: string }|null}
 */
function fuzzyResolveTable(name) {
  const knowledge = loadSchemaKnowledge();
  const lower = name.toLowerCase();

  const exact = knowledge.tableIndex.get(lower);
  if (exact) return { entry: exact, resolvedName: exact.table_name };

  const stripped = lower
    .replace(/^vw_tf_/i, '')
    .replace(/^vw_td_/i, '')
    .replace(/^tf_/i, '')
    .replace(/^td_/i, '')
    .replace(/^vw_/i, '');

  let bestMatch = null;
  let bestLen = 0;

  for (const [tableLower, entry] of knowledge.tableIndex) {
    if (tableLower.includes(lower) || lower.includes(tableLower)) {
      if (tableLower.length > bestLen) {
        bestMatch = entry;
        bestLen = tableLower.length;
      }
      continue;
    }
    const tableStripped = tableLower
      .replace(/^vw_tf_/i, '')
      .replace(/^vw_td_/i, '')
      .replace(/^tf_/i, '')
      .replace(/^td_/i, '')
      .replace(/^vw_/i, '');
    if (tableStripped === stripped && tableLower.length > bestLen) {
      bestMatch = entry;
      bestLen = tableLower.length;
    }
  }

  if (!bestMatch && stripped.length >= 4) {
    let bestContainLen = 0;
    for (const [tableLower, entry] of knowledge.tableIndex) {
      const tableStripped = tableLower
        .replace(/^vw_tf_/i, '')
        .replace(/^vw_td_/i, '')
        .replace(/^tf_/i, '')
        .replace(/^td_/i, '')
        .replace(/^vw_/i, '');
      if (tableStripped.length < 4) continue;
      if (tableStripped.includes(stripped) || stripped.includes(tableStripped)) {
        const matchLen = Math.min(stripped.length, tableStripped.length);
        if (matchLen > bestContainLen) {
          bestMatch = entry;
          bestContainLen = matchLen;
        }
      }
    }
  }

  return bestMatch ? { entry: bestMatch, resolvedName: bestMatch.table_name } : null;
}

/**
 * Get formatted column metadata for a table.
 * Returns the same format as the old INFORMATION_SCHEMA-based tool.
 * Falls back to fuzzy name matching when exact lookup fails.
 *
 * @param {string} tableName
 * @returns {string|null}
 */
function getColumnMetadataForTable(tableName) {
  const resolved = fuzzyResolveTable(tableName);
  if (!resolved) return null;

  const { entry } = resolved;
  const lines = Object.entries(entry.columns).map(([colName, col]) => {
    const type = col.type || 'UNKNOWN';
    if (col.nullable != null) {
      return `${colName} (${type}, nullable: ${col.nullable ? 'yes' : 'no'})`;
    }
    return `${colName} (${type})`;
  });

  return lines.join('\n');
}

/**
 * Get all table names in the knowledge base.
 * @returns {string[]}
 */
function getAllTableNames() {
  const knowledge = loadSchemaKnowledge();
  return [...knowledge.tableIndex.values()].map((t) => t.table_name);
}

function formatTableOutput(entry) {
  const fkColumns = Object.entries(entry.columns)
    .filter(([, col]) => col && col.fk === true)
    .map(([name]) => name);

  const importantCols = Object.entries(entry.columns)
    .map(([name, col]) => {
      const flags = [];
      if (col && col.pk === true) flags.push('PK');
      if (col && col.fk === true) flags.push('FK');
      const flagStr = flags.length > 0 ? `, ${flags.join(', ')}` : '';
      return `${name} (${(col && col.type) || 'UNKNOWN'}${flagStr})`;
    });

  return {
    table_name: entry.table_name,
    description: entry.description,
    key_columns: fkColumns.join(', '),
    important_columns: importantCols.join(' | '),
    columns: entry.columns,
  };
}

function reloadSchemaKnowledge() {
  _schemaKnowledge = null;
  _loadPromise = null;
  return loadSchemaKnowledge();
}

async function reloadSchemaKnowledgeAsync() {
  _schemaKnowledge = null;
  _loadPromise = null;
  return loadSchemaKnowledgeAsync();
}

function getSchemaKnowledgeStats() {
  const knowledge = loadSchemaKnowledge();
  return {
    totalTables: knowledge.tableIndex.size,
  };
}

module.exports = {
  getSchemaByTableNames,
  getColumnMetadataForTable,
  getAllTableNames,
  getSchemaKnowledgeStats,
  reloadSchemaKnowledge,
  reloadSchemaKnowledgeAsync,
  fuzzyResolveTable,
  loadSchemaKnowledgeAsync,
};
