/**
 * Examples Fetcher — programmatic, deterministic gold example retrieval.
 *
 * Loads goldExamples.json at first access and builds a keyword index from
 * each example's question, variants, and table names. Searches by keyword
 * overlap -- no embeddings or ChromaDB needed.
 *
 * Usage:
 *   const { searchExamples } = require('./vectordb/examplesFetcher');
 *   const examples = searchExamples('pipeline coverage full outer join quota', 5);
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const EXAMPLES_FILE = path.join(
  __dirname,
  '..',
  'context',
  'goldExamples.json'
);

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
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

let _store = null;
let _loadPromise = null;

function buildExamplesStoreFromRaw(raw) {
  const examples = [];
  const keywordIndex = new Map();
  for (const entry of raw) {
    const variantTexts = (entry.variants || []).join(' ');
    const tablesText = (entry.tables_used || []).join(' ');
    const allText = [entry.question, variantTexts, tablesText].join(' ');
    const keywords = [...new Set(tokenize(allText))];
    const exIdx = examples.length;
    examples.push({
      id: entry.id,
      question: entry.question,
      sql: entry.sql,
      tables_used: (entry.tables_used || []).join(', '),
      variants: entry.variants || [],
      keywords,
    });
    for (const kw of keywords) {
      if (!keywordIndex.has(kw)) keywordIndex.set(kw, new Set());
      keywordIndex.get(kw).add(exIdx);
    }
  }
  return { examples, keywordIndex };
}

async function loadExamplesAsync() {
  if (_store) return _store;
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    if (!fs.existsSync(EXAMPLES_FILE)) {
      logger.warn('Gold examples JSON not found', { path: EXAMPLES_FILE });
      _store = { examples: [], keywordIndex: new Map() };
      return _store;
    }
    const raw = JSON.parse(await fs.promises.readFile(EXAMPLES_FILE, 'utf-8'));
    _store = buildExamplesStoreFromRaw(raw);
    return _store;
  })();
  return _loadPromise;
}

function loadExamples() {
  if (_store) return _store;
  return { examples: [], keywordIndex: new Map() };
}

/**
 * Search gold examples by keyword matching against question + variants + table names.
 *
 * @param {string} query
 * @param {number} [k=5]
 * @returns {Array<{ question: string, sql: string, tables_used: string }>}
 */
function searchExamples(query, k = 5) {
  const store = loadExamples();
  if (store.examples.length === 0) return [];

  const queryTokens = tokenize(query || '');

  if (queryTokens.length === 0) {
    return store.examples.slice(0, k).map(formatExample);
  }

  const scores = new Map();

  for (const token of queryTokens) {
    const matching = store.keywordIndex.get(token);
    if (matching) {
      for (const idx of matching) {
        scores.set(idx, (scores.get(idx) || 0) + 1);
      }
    }
  }

  const sorted = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k);

  const results = sorted
    .map(([idx]) => store.examples[idx])
    .filter(Boolean)
    .map(formatExample);

  return results;
}

function formatExample(ex) {
  return {
    question: ex.question,
    sql: ex.sql,
    tables_used: ex.tables_used,
  };
}

function reloadExamples() {
  _store = null;
  _loadPromise = null;
  return loadExamples();
}

module.exports = { searchExamples, reloadExamples, loadExamplesAsync };
