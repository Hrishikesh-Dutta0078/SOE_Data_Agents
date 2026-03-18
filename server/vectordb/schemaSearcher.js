/**
 * Schema Searcher — keyword-based table pre-filtering for LLM schema selection.
 *
 * Builds an inverted index over table names, descriptions, column names,
 * and column descriptions from schema-knowledge.json. Used by llmSchemaSelector
 * to narrow the schema before sending to the LLM.
 */

const { loadSchemaKnowledgeAsync } = require('./schemaFetcher');
const logger = require('../utils/logger');

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'to', 'of', 'in',
  'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
  'and', 'but', 'or', 'not', 'so', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same',
  'than', 'too', 'very', 'just', 'that', 'this', 'these', 'those',
  'it', 'its', 'all', 'any', 'per', 'what', 'show', 'me', 'my',
  'get', 'give', 'how', 'much', 'many',
]);

function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

let _store = null;
let _loadPromise = null;

function buildSchemaIndex(rawSchema) {
  const tables = [];
  const keywordIndex = new Map();

  for (const [tableName, tableData] of Object.entries(rawSchema)) {
    const parts = [tableName];
    if (tableData.description) parts.push(tableData.description);
    const cols = tableData.columns || {};
    for (const [colName, col] of Object.entries(cols)) {
      parts.push(colName);
      if (col.description) parts.push(col.description);
    }
    const allText = parts.join(' ');
    const keywords = [...new Set(tokenize(allText))];
    const tIdx = tables.length;
    tables.push({ tableName, keywords });
    for (const kw of keywords) {
      if (!keywordIndex.has(kw)) keywordIndex.set(kw, new Set());
      keywordIndex.get(kw).add(tIdx);
    }
  }

  return { tables, keywordIndex };
}

async function loadSchemaSearcherAsync() {
  if (_store) return _store;
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    const knowledge = await loadSchemaKnowledgeAsync();
    const rawSchema = knowledge.tables || {};
    _store = buildSchemaIndex(rawSchema);
    logger.info('Schema searcher index built', { tables: _store.tables.length });
    return _store;
  })();
  return _loadPromise;
}

function loadSchemaSearcher() {
  if (_store) return _store;
  return { tables: [], keywordIndex: new Map() };
}

/**
 * Search for relevant tables by keyword overlap with query + entities.
 *
 * @param {string} query - User question
 * @param {{ metrics?: string[], dimensions?: string[], filters?: string[], operations?: string[] }|null} entities
 * @param {number} [k=8] - Max tables to return
 * @returns {string[]} - Table names ranked by relevance
 */
function searchTables(query, entities, k = 8) {
  const store = loadSchemaSearcher();
  if (store.tables.length === 0) return [];

  const parts = [query || ''];
  if (entities) {
    for (const key of ['metrics', 'dimensions', 'filters', 'operations']) {
      const terms = entities[key];
      if (Array.isArray(terms)) {
        for (const term of terms) {
          parts.push(term);
          parts.push(term); // double-weight entity terms
        }
      }
    }
  }
  const queryTokens = tokenize(parts.join(' '));
  if (queryTokens.length === 0) return store.tables.slice(0, k).map((t) => t.tableName);

  const scores = new Map();
  for (const token of queryTokens) {
    const matching = store.keywordIndex.get(token);
    if (matching) {
      for (const idx of matching) {
        scores.set(idx, (scores.get(idx) || 0) + 1);
      }
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([idx]) => store.tables[idx].tableName);
}

module.exports = { searchTables, loadSchemaSearcherAsync };
