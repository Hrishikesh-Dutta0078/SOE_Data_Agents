/**
 * Rules Fetcher — programmatic, deterministic business rule retrieval.
 *
 * Parses business-context.md at first load into an in-memory array of
 * categorized rules with keyword indexes for fast search. No ChromaDB
 * or embedding calls.
 *
 * Usage:
 *   const { searchRules } = require('./vectordb/rulesFetcher');
 *   const rules = searchRules('pipeline coverage quota', 5);
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const BUSINESS_RULES_FILE = path.join(
  __dirname,
  '..',
  'context',
  'knowledge',
  'business-context.md'
);

const CATEGORY_MAP = {
  terminology: /terminolog|key term/i,
  account_hierarchy: /account hierarch/i,
  scoring: /scoring|profil|icp|ucp|aes/i,
  products: /product|solution|opg/i,
  sales_org: /sales org|structure|region/i,
  opportunity: /opportunit|deal/i,
  time_dimensions: /time dim|fiscal|calendar/i,
  user_context: /current user|user context/i,
  ambiguity: /ambigu|watch for|clarif/i,
  sql_rules: /sql generat|sql rule|query rule|mandatory filter/i,
};

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
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function detectCategory(heading) {
  for (const [cat, regex] of Object.entries(CATEGORY_MAP)) {
    if (regex.test(heading)) return cat;
  }
  return 'general';
}

let _store = null;
let _loadPromise = null;

function buildRulesStoreFromText(text) {
  const sections = text.split(/^## /gm).filter((s) => s.trim().length > 0);
  const rules = [];
  const keywordIndex = new Map();
  for (const section of sections) {
    const lines = section.trim().split('\n');
    const heading = lines[0].trim();
    if (heading.startsWith('#') || heading.toLowerCase().includes('business context')) continue;
    const body = lines.slice(1).join('\n').trim();
    if (body.length === 0) continue;
    const category = detectCategory(heading);
    const ruleText = `${heading}: ${body}`;
    const keywords = [...new Set(tokenize(ruleText))];
    const ruleIdx = rules.length;
    rules.push({ category, text: ruleText, heading, keywords });
    for (const kw of keywords) {
      if (!keywordIndex.has(kw)) keywordIndex.set(kw, new Set());
      keywordIndex.get(kw).add(ruleIdx);
    }
  }
  return { rules, keywordIndex };
}

async function loadRulesAsync() {
  if (_store) return _store;
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    if (!fs.existsSync(BUSINESS_RULES_FILE)) {
      logger.warn('Business rules markdown not found', { path: BUSINESS_RULES_FILE });
      _store = { rules: [], keywordIndex: new Map() };
      return _store;
    }
    const text = await fs.promises.readFile(BUSINESS_RULES_FILE, 'utf-8');
    _store = buildRulesStoreFromText(text);
    return _store;
  })();
  return _loadPromise;
}

function loadBusinessRules() {
  if (_store) return _store;
  return { rules: [], keywordIndex: new Map() };
}

/**
 * Search business rules by keyword matching.
 *
 * @param {string} query
 * @param {number} [k=8]
 * @returns {Array<{ category: string, text: string }>}
 */
function searchRules(query, k = 8) {
  const store = loadBusinessRules();
  if (!store.rules || store.rules.length === 0) return [];
  if (store.rules.length === 0) return [];

  const queryTokens = tokenize(query || '');

  if (queryTokens.length === 0) {
    return store.rules.slice(0, k).map((r) => ({ category: r.category, text: r.text }));
  }

  const scores = new Map();

  for (const token of queryTokens) {
    const matchingRules = store.keywordIndex.get(token);
    if (matchingRules) {
      for (const idx of matchingRules) {
        scores.set(idx, (scores.get(idx) || 0) + 1);
      }
    }
  }

  const sorted = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k);

  const results = sorted
    .map(([idx]) => store.rules[idx])
    .filter(Boolean)
    .map((r) => ({ category: r.category, text: r.text }));

  return results;
}

function reloadBusinessRules() {
  _store = null;
  _loadPromise = null;
  return loadBusinessRules();
}

module.exports = { searchRules, reloadBusinessRules, loadRulesAsync };
