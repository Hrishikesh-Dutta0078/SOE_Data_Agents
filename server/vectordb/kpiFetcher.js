/**
 * KPI Fetcher — programmatic lookup of business KPI definitions from the glossary.
 *
 * Loads kpi-glossary.json at first load and builds a keyword index over
 * KPI names, aliases, definitions, and formula terms. No embeddings.
 *
 * Usage:
 *   const { searchKpis } = require('./vectordb/kpiFetcher');
 *   const kpis = searchKpis('gnarr participation coverage', 5);
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const KPI_GLOSSARY_FILE = path.join(
  __dirname,
  '..',
  'context',
  'knowledge',
  'kpi-glossary.json'
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
  'get', 'give', 'how', 'much', 'many', 'e', 'g',
]);

function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_+]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w));
}

let _store = null;
let _loadPromise = null;

function buildKpiStoreFromData(data) {
  const kpis = Array.isArray(data.kpis) ? data.kpis : [];
  const keywordIndex = new Map();
  for (let idx = 0; idx < kpis.length; idx++) {
    const kpi = kpis[idx];
    const parts = [
      kpi.name || '',
      (kpi.aliases || []).join(' '),
      kpi.definition || '',
      kpi.formula || '',
      kpi.section || '',
      (kpi.personas || []).join(' '),
      (kpi.timeVariants || []).join(' '),
      (kpi.relatedColumns || []).join(' '),
      (kpi.relatedTables || []).join(' '),
    ];
    if (kpi.components && typeof kpi.components === 'object') {
      for (const [key, val] of Object.entries(kpi.components)) {
        parts.push(key, val);
      }
    }
    const text = parts.join(' ').toLowerCase();
    const keywords = [...new Set(tokenize(text))];
    for (const kw of keywords) {
      if (!keywordIndex.has(kw)) keywordIndex.set(kw, new Set());
      keywordIndex.get(kw).add(idx);
    }
  }
  return { kpis, keywordIndex };
}

async function loadKpiGlossaryAsync() {
  if (_store) return _store;
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    if (!fs.existsSync(KPI_GLOSSARY_FILE)) {
      logger.warn('KPI glossary not found', { path: KPI_GLOSSARY_FILE });
      _store = { kpis: [], keywordIndex: new Map() };
      return _store;
    }
    let data;
    try {
      const raw = await fs.promises.readFile(KPI_GLOSSARY_FILE, 'utf-8');
      data = JSON.parse(raw);
    } catch (err) {
      logger.warn('Failed to parse KPI glossary', { path: KPI_GLOSSARY_FILE, error: err.message });
      _store = { kpis: [], keywordIndex: new Map() };
      return _store;
    }
    _store = buildKpiStoreFromData(data);
    return _store;
  })();
  return _loadPromise;
}

function loadKpiGlossary() {
  if (_store) return _store;
  return { kpis: [], keywordIndex: new Map() };
}

/**
 * Search KPIs by keyword matching.
 *
 * @param {string} query - User question or search terms
 * @param {number} [k=5] - Max number of KPIs to return
 * @returns {Array<{ id: string, name: string, definition: string, formula: string, components: object, relatedTables: string[], relatedColumns: string[] }>}
 */
function searchKpis(query, k = 5) {
  const store = loadKpiGlossary();
  if (store.kpis.length === 0) return [];

  const queryTokens = tokenize(query || '');

  if (queryTokens.length === 0) {
    return store.kpis.slice(0, k).map((kpi) => formatKpiForOutput(kpi));
  }

  const scores = new Map();

  for (const token of queryTokens) {
    const matchingIndices = store.keywordIndex.get(token);
    if (matchingIndices) {
      for (const idx of matchingIndices) {
        scores.set(idx, (scores.get(idx) || 0) + 1);
      }
    }
  }

  const sorted = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k);

  return sorted
    .map(([idx]) => store.kpis[idx])
    .filter(Boolean)
    .map((kpi) => formatKpiForOutput(kpi));
}

function formatKpiForOutput(kpi) {
  const out = {
    id: kpi.id,
    name: kpi.name,
    definition: kpi.definition,
    formula: kpi.formula,
    components: kpi.components || {},
    relatedTables: kpi.relatedTables || [],
    relatedColumns: kpi.relatedColumns || [],
    personas: kpi.personas || [],
    timeVariants: kpi.timeVariants || [],
  };
  if (kpi.confidence) out.confidence = kpi.confidence;
  if (kpi.pbix_only) out.pbix_only = true;
  if (kpi.notes) out.notes = kpi.notes;
  return out;
}

function reloadKpiGlossary() {
  _store = null;
  _loadPromise = null;
  return loadKpiGlossary();
}

module.exports = { searchKpis, reloadKpiGlossary, loadKpiGlossaryAsync };
