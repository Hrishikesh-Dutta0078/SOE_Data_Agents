/**
 * Join Rule Fetcher — programmatic, deterministic join rule retrieval.
 *
 * Replaces embedding-based join retrieval with a direct lookup from
 * join-knowledge.json. Given a list of candidate table names (from schema
 * retrieval), generates all pairwise combinations and returns every
 * matching direct and multi-hop join rule.
 *
 * Advantages over vector DB approach:
 *   - Deterministic: no embedding similarity threshold to tune
 *   - Complete: every valid join for the candidate tables is returned
 *   - Fast: in-memory lookup, no DB or API calls
 *
 * Output shape is compatible with assembleContext() in contextRetriever.js:
 *   Direct:    { left_table, right_table, category: 'join', join_columns, text }
 *   Multi-hop: { left_table, right_table, bridge_table, category: 'multihop_join', text }
 *
 * Usage:
 *   const { getJoinRulesForTables } = require('./vectordb/joinRuleFetcher');
 *   const joins = getJoinRulesForTables(['vw_TF_EBI_P2S', 'vw_TD_EBI_OPP', 'vw_td_ebi_region_rpt']);
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const JOIN_KNOWLEDGE_PATH = path.join(
  __dirname,
  '..',
  'context',
  'knowledge',
  'join-knowledge.json'
);

// ---------------------------------------------------------------------------
// Lazy-loaded, cached join knowledge
// ---------------------------------------------------------------------------

let _joinKnowledge = null;
let _loadPromise = null;

function buildJoinKnowledgeFromRaw(raw) {
  const directIndex = new Map();
  for (const rule of raw.directJoins || []) {
    const key = makePairKey(rule.left_table, rule.right_table);
    if (!directIndex.has(key)) directIndex.set(key, []);
    directIndex.get(key).push(rule);
  }
  const multihopIndex = new Map();
  for (const rule of raw.multihopJoins || []) {
    const key = makePairKey(rule.left_table, rule.right_table);
    if (!multihopIndex.has(key)) multihopIndex.set(key, []);
    multihopIndex.get(key).push(rule);
  }
  return {
    directJoins: raw.directJoins || [],
    multihopJoins: raw.multihopJoins || [],
    directIndex,
    multihopIndex,
  };
}

async function loadJoinKnowledgeAsync() {
  if (_joinKnowledge) return _joinKnowledge;
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    if (!fs.existsSync(JOIN_KNOWLEDGE_PATH)) {
      logger.warn('Join knowledge JSON not found', { path: JOIN_KNOWLEDGE_PATH });
      _joinKnowledge = {
        directJoins: [],
        multihopJoins: [],
        directIndex: new Map(),
        multihopIndex: new Map(),
      };
      return _joinKnowledge;
    }
    const raw = JSON.parse(await fs.promises.readFile(JOIN_KNOWLEDGE_PATH, 'utf-8'));
    _joinKnowledge = buildJoinKnowledgeFromRaw(raw);
    return _joinKnowledge;
  })();
  return _loadPromise;
}

/**
 * Sync: returns cached join knowledge only. Call loadJoinKnowledgeAsync() at startup for eager load.
 */
function loadJoinKnowledge() {
  if (_joinKnowledge) return _joinKnowledge;
  return {
    directJoins: [],
    multihopJoins: [],
    directIndex: new Map(),
    multihopIndex: new Map(),
  };
}

/**
 * Create a canonical pair key from two table names.
 * Sorted alphabetically (lowercase) so (A, B) and (B, A) produce the same key.
 */
function makePairKey(tableA, tableB) {
  const a = tableA.toLowerCase().trim();
  const b = tableB.toLowerCase().trim();
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

// ---------------------------------------------------------------------------
// Core exported function
// ---------------------------------------------------------------------------

/**
 * Retrieve all join rules (direct + multi-hop) relevant to a set of
 * candidate tables.
 *
 * Generates all N*(N-1)/2 pairwise combinations of candidate tables and
 * looks up matching rules from the indexed JSON data. Results are
 * deduplicated and returned in a format compatible with assembleContext().
 *
 * For multi-hop joins, the bridge table does NOT need to be in the
 * candidate set — the rule is included as long as both endpoints match.
 * The SQL generator will know to add the bridge table from the rule text.
 *
 * @param {string[]} tableNames — candidate table names from schema retrieval
 * @returns {Array<{
 *   left_table: string,
 *   right_table: string,
 *   bridge_table: string|null,
 *   category: string,
 *   join_columns: string|null,
 *   text: string,
 *   type: string
 * }>}
 */
function getJoinRulesForTables(tableNames) {
  if (!tableNames || tableNames.length < 2) return [];

  const knowledge = loadJoinKnowledge();
  const results = [];
  const seenKeys = new Set();

  for (let i = 0; i < tableNames.length; i++) {
    for (let j = i + 1; j < tableNames.length; j++) {
      const key = makePairKey(tableNames[i], tableNames[j]);

      // --- Direct joins ---
      const directRules = knowledge.directIndex.get(key);
      if (directRules) {
        for (const rule of directRules) {
          const dedupeKey = `direct::${key}`;
          if (seenKeys.has(dedupeKey)) continue;
          seenKeys.add(dedupeKey);

          const joinColumnsStr = rule.columns.join(' | ');
          results.push({
            left_table: rule.left_table,
            right_table: rule.right_table,
            bridge_table: null,
            category: 'join',
            type: 'join_rule',
            join_columns: joinColumnsStr,
            text: `${rule.left_table} joins to ${rule.right_table}. Join columns: ${rule.columns.join('; ')}`,
          });
        }
      }

      // --- Multi-hop joins ---
      const multihopRules = knowledge.multihopIndex.get(key);
      if (multihopRules) {
        for (const rule of multihopRules) {
          const dedupeKey = `multihop::${key}::${rule.bridge_table.toLowerCase()}`;
          if (seenKeys.has(dedupeKey)) continue;
          seenKeys.add(dedupeKey);

          const stepsText = rule.steps
            .map((s, idx) => `${idx + 1}. ${s}`)
            .join('\n  ');

          results.push({
            left_table: rule.left_table,
            right_table: rule.right_table,
            bridge_table: rule.bridge_table,
            category: 'multihop_join',
            type: 'join_rule',
            join_columns: null,
            text: `${rule.left_table} cannot join directly to ${rule.right_table}. Use ${rule.bridge_table} as bridge:\n  ${stepsText}`,
          });
        }
      }
    }
  }

  return results;
}

/**
 * Format join rule objects into the === VALID JOINS === text block
 * expected by the SQL Generator system prompt.
 *
 * This is used by the route handler after the Table Selector determines
 * which tables are needed, so only targeted joins are injected.
 *
 * @param {Array} joinRules — array of join rule objects from getJoinRulesForTables()
 * @returns {string} — formatted text block (empty string if no rules)
 */
function formatJoinRulesText(joinRules) {
  if (!joinRules || joinRules.length === 0) return '';

  const joinLines = joinRules.map((j) => {
    if (j.category === 'multihop_join') {
      return `${j.left_table} \u2192 ${j.bridge_table} \u2192 ${j.right_table} (multi-hop)\n  ${j.text}`;
    }
    return `${j.left_table} \u2194 ${j.right_table}\n  Columns: ${j.join_columns || j.text}`;
  });

  return `=== VALID JOINS ===\n\n${joinLines.join('\n\n')}`;
}

/**
 * Return total join rule counts from the knowledge base.
 * Useful for refinement logging (targeted rules vs total available).
 */
function getJoinKnowledgeStats() {
  const knowledge = loadJoinKnowledge();
  return {
    totalDirect: knowledge.directJoins.length,
    totalMultihop: knowledge.multihopJoins.length,
    total: knowledge.directJoins.length + knowledge.multihopJoins.length,
  };
}

/**
 * Force-reload join knowledge from disk. Useful after re-running
 * the migration script without restarting the server.
 */
function reloadJoinKnowledge() {
  _joinKnowledge = null;
  _loadPromise = null;
  return loadJoinKnowledge();
}

module.exports = { getJoinRulesForTables, formatJoinRulesText, getJoinKnowledgeStats, reloadJoinKnowledge, loadJoinKnowledgeAsync };
