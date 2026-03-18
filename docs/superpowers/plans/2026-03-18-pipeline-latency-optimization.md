# Pipeline Latency Optimization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce perceived query latency by ~50% and LLM cost by ~40-50% through schema pre-filtering, data-first streaming, research agent merge, model downgrades, and pipeline consistency fixes.

**Architecture:** Server-side changes to the LangGraph pipeline nodes, LLM configuration, SSE streaming route, and knowledge layer. Client-side changes to handle a new `data_ready` SSE event for early table rendering. All changes are isolated and independently reversible.

**Tech Stack:** Node.js (CommonJS), LangGraph, Express SSE, React 19, Vite

**Spec:** `docs/superpowers/specs/2026-03-18-pipeline-latency-optimization-design.md`

---

## Task 1: Constants Tuning (Enhancements #3, #8, #10)

The simplest changes — modify numeric constants. No behavioral logic changes.

**Files:**
- Modify: `server/config/constants.js`
- Modify: `server/graph/nodes/checkResults.js`

- [ ] **Step 1: Update constants**

In `server/config/constants.js`, change three values:

```js
// Line 36: DB_POOL_MIN: 0 → 2
DB_POOL_MIN: 2,

// Line 46: MAX_CORRECTION_ROUNDS: 3 → 2
MAX_CORRECTION_ROUNDS: 2,

// Line 52: QUERY_RESULT_ROW_LIMIT: 1000 → 100
QUERY_RESULT_ROW_LIMIT: 100,
```

- [ ] **Step 2: Update row limit warning in checkResults**

In `server/graph/nodes/checkResults.js`, update the warning at line 42-44 to clarify the display limit:

```js
// Before:
if (exec.rowCount >= QUERY_RESULT_ROW_LIMIT) {
  warnings.push(`Query hit the ${QUERY_RESULT_ROW_LIMIT}-row limit — results may be truncated`);
}

// After:
if (exec.rowCount >= QUERY_RESULT_ROW_LIMIT) {
  warnings.push(`Results capped at ${QUERY_RESULT_ROW_LIMIT} rows for display. Use the dashboard view for full data exploration.`);
}
```

- [ ] **Step 3: Run tests**

Run: `cd server && node --test`
Expected: All existing tests pass (constants are used at runtime, not in test fixtures).

- [ ] **Step 4: Commit**

```bash
git add server/config/constants.js server/graph/nodes/checkResults.js
git commit -m "perf: tune constants — row limit 100, pool min 2, max corrections 2"
```

---

## Task 2: Model Profile Routing (Enhancements #4 partial, #5, #6)

Update `server/config/llm.js` to route correct/chart to Sonnet and prepare for the research agent merge. This task only changes model routing — the actual research agent refactor is in Task 5.

**Files:**
- Modify: `server/config/llm.js`

- [ ] **Step 1: Update FAST_NODE_KEYS and add SONNET_NODE_KEYS**

In `server/config/llm.js`, replace lines 84-93:

```js
// Before:
const FAST_NODE_KEYS = new Set([
  'researchAgent', 'researchAgent_phase1',
  'sqlAgent', 'sqlWriterAgent',
]);

function resolveProfileName(opts) {
  if (opts.profile && MODEL_PROFILES[opts.profile]) return opts.profile;
  if (opts.nodeKey && FAST_NODE_KEYS.has(opts.nodeKey)) return 'haiku';
  return 'opus';
}

// After:
const FAST_NODE_KEYS = new Set([
  'sqlAgent', 'sqlWriterAgent',
]);

const SONNET_NODE_KEYS = new Set([
  'correct', 'presentChart',
]);

function resolveProfileName(opts) {
  if (opts.profile && MODEL_PROFILES[opts.profile]) return opts.profile;
  if (opts.nodeKey && FAST_NODE_KEYS.has(opts.nodeKey)) return 'haiku';
  if (opts.nodeKey && SONNET_NODE_KEYS.has(opts.nodeKey)) return 'sonnet';
  return 'opus';
}
```

This does three things:
- Removes `'researchAgent'` and `'researchAgent_phase1'` from `FAST_NODE_KEYS` (so the merged research agent defaults to Opus)
- Routes `'correct'` to Sonnet
- Routes `'presentChart'` to Sonnet

**Note:** `server/graph/nodes/correct.js` and `server/graph/nodes/present.js` do NOT need changes. They already pass their `nodeKey` to `getModel()`, so the routing change in `resolveProfileName()` takes effect automatically. The spec lists these files with "or" — we're using the `llm.js` approach.

**Prerequisite:** Sonnet env vars must be configured: `AZURE_ANTHROPIC_SONNET_ENDPOINT`, `AZURE_ANTHROPIC_SONNET_API_KEY`, `AZURE_ANTHROPIC_SONNET_MODEL_NAME`.

- [ ] **Step 2: Run tests**

Run: `cd server && node --test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add server/config/llm.js
git commit -m "perf: route correct+chart to Sonnet, remove researchAgent from Haiku keys"
```

---

## Task 3: Schema Pre-Filter (Enhancement #1)

Create the keyword-based schema searcher and wire it into the LLM schema selector.

**Files:**
- Create: `server/vectordb/schemaSearcher.js`
- Modify: `server/vectordb/llmSchemaSelector.js`
- Modify: `server/index.js`

- [ ] **Step 1: Create `server/vectordb/schemaSearcher.js`**

Build a keyword index over `schema-knowledge.json` following the exact pattern of `examplesFetcher.js`:

```js
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
```

- [ ] **Step 2: Modify `server/vectordb/llmSchemaSelector.js`**

Add schema pre-filtering and markdown caching:

1. Add import at line 11: `const { searchTables } = require('./schemaSearcher');`
2. Add module-level cache variable: `let _fullSchemaMarkdownCache = null;`
3. Modify the beginning of `selectTablesAndColumnsByLLM()` (lines 130-138) — replace the `schemaToMarkdown(rawSchema)` call and `buildSelectionPrompt` call with the pre-filter logic. Keep everything after `buildSelectionPrompt` unchanged (model creation, invoke, validateAndResolve):

```js
// At top of file, add import:
const { searchTables } = require('./schemaSearcher');

// Add module-level markdown cache (before selectTablesAndColumnsByLLM):
let _fullSchemaMarkdownCache = null;

// Modified selectTablesAndColumnsByLLM — only the schema selection part changes:
async function selectTablesAndColumnsByLLM(query, entities = null) {
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

  // ... rest of function unchanged (model.invoke, validateAndResolve, etc.)
```

Keep everything after the `buildSelectionPrompt` call exactly as-is (the `model` creation, `invoke`, `validateAndResolve` calls).

- [ ] **Step 3: Add schemaSearcher to startup loaders in `server/index.js`**

At the top of `server/index.js`, add the import alongside the existing fetcher imports:

```js
const { loadSchemaSearcherAsync } = require('./vectordb/schemaSearcher');
```

Then add to the loaders array (around line 157):

```js
['schemaSearcher', loadSchemaSearcherAsync],
```

- [ ] **Step 4: Run tests**

Run: `cd server && node --test`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/vectordb/schemaSearcher.js server/vectordb/llmSchemaSelector.js server/index.js
git commit -m "perf: add keyword schema pre-filter for discover_context (~75% token reduction)"
```

---

## Task 4: Restructure `discover_context` (Enhancement #9)

Restructure the `discover_context` tool to start the LLM call before running the sync knowledge searches.

**Files:**
- Modify: `server/tools/discoverContext.js`

- [ ] **Step 1: Restructure the `func` body**

In `server/tools/discoverContext.js`, replace lines 58-90 (the `func` body) with:

```js
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
```

The rest of the function (sections building from line 100 onward) stays unchanged.

- [ ] **Step 2: Run tests**

Run: `cd server && node --test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add server/tools/discoverContext.js
git commit -m "refactor: restructure discover_context to start LLM call before sync searches"
```

---

## Task 5: Merge Research Agent Phases (Enhancement #4)

The largest change — merge Phase 1 (Haiku discovery) and Phase 2 (Opus synthesis) into a single Opus agent pass. Also remove `finishDiscovery.js` and update the DevPanel + route keys.

**Files:**
- Modify: `server/graph/nodes/researchAgent.js`
- Modify: `server/routes/textToSql.js`
- Modify: `client/src/components/DevPanel.jsx`
- Remove: `server/tools/finishDiscovery.js`

- [ ] **Step 1: Update `VALID_NODE_KEYS` in `server/routes/textToSql.js`**

At line 44-49, replace `researchAgent_phase1` and `researchAgent_phase2` with `researchAgent`:

```js
// Before:
const VALID_NODE_KEYS = new Set([
  'classify', 'decompose', 'researchAgent_phase1', 'researchAgent_phase2',
  'sqlWriterAgent', 'subQueryMatch', 'correct',
  'semanticValidatorFast', 'semanticValidatorOpus',
  'presentInsights', 'presentChart', 'dashboardAgent',
]);

// After:
const VALID_NODE_KEYS = new Set([
  'classify', 'decompose', 'researchAgent',
  'sqlWriterAgent', 'subQueryMatch', 'correct',
  'semanticValidatorFast', 'semanticValidatorOpus',
  'presentInsights', 'presentChart', 'dashboardAgent',
]);
```

- [ ] **Step 2: Refactor `researchAgentNode()` in `server/graph/nodes/researchAgent.js`**

This is the core change. In the `researchAgentNode` function (starts at line 509):

1. Replace the Phase 1 model setup (lines 560-566) to use Opus via `'researchAgent'` nodeKey:
```js
const model = getModel({
  temperature: 0,
  maxTokens: 4096,
  nodeKey: 'researchAgent',
  profile: state.nodeModelOverrides?.researchAgent,
});
llmMeta = getModelMeta(model);
```

2. Use `RESEARCH_TOOLS` instead of `DISCOVERY_TOOLS` (line 567-568):
```js
const tools = createMemoizedTools(cacheStats, toolTimings, enabledNames, state.sessionId ?? null, qIdx, {
  toolsOverride: RESEARCH_TOOLS,
});
```

3. Use `buildResearchSystemPrompt(state)` instead of `buildResearchSystemPromptPhase1(state)` (line 571).

4. Remove the entire Phase 2 block (lines 634-662) — the `if (result?.messages?.length > 0 ...)` block that creates `opusModel`, `structuredModel`, calls `formatPhase1MessagesForPrompt`, and sets `_phase2Brief`.

5. Update the brief extraction (around line 696) — since there's no `_phase2Brief`, rely on `parseResearchBrief(result)`:
```js
let brief = parseResearchBrief(result);
```

6. Update `briefSource` (line 699) — remove the `_phase2Brief` ternary:
```js
// Before:
let briefSource = result?._phase2Brief ? 'phase2_opus' : 'submit_research';
// After:
let briefSource = 'submit_research';
```

7. Remove `phase1Mode` parameter from `createMemoizedTools` call and its usage inside the function (lines 240-242 for `finishDiscovery` injection, lines 281-283 for conditional message text).

- [ ] **Step 3: Remove dead code from `researchAgent.js`**

Remove these in order (IMPORTANT: remove the import BEFORE deleting the file in Step 4):
- `const finishDiscovery = require('../../tools/finishDiscovery');` import (line 24)
- `DISCOVERY_TOOLS` array (lines 38-45)
- `buildResearchSystemPromptPhase1()` function
- `phase1CalledFinishDiscovery()` function
- `formatPhase1MessagesForPrompt()` function

- [ ] **Step 4: Delete `server/tools/finishDiscovery.js`**

```bash
git rm server/tools/finishDiscovery.js
```

- [ ] **Step 5: Update DevPanel nodeKey labels and presets**

In `client/src/components/DevPanel.jsx`:
1. Find the `NODE_CONFIG` object (around lines 12-13) and replace `researchAgent_phase1` / `researchAgent_phase2` entries with a single `researchAgent` entry.
2. Find the `BUILTIN_PRESETS` object (around lines 38-44) and update the `'Balanced'` preset — replace `researchAgent_phase1: 'haiku', researchAgent_phase2: 'sonnet'` with `researchAgent: 'opus'`.

- [ ] **Step 6: Run tests**

Run: `cd server && node --test`
Expected: All tests pass. If any tests reference `researchAgent_phase1`/`phase2`, update them.

- [ ] **Step 7: Commit**

```bash
git add server/graph/nodes/researchAgent.js server/routes/textToSql.js client/src/components/DevPanel.jsx
git rm server/tools/finishDiscovery.js
git commit -m "perf: merge research Phase 1+2 into single Opus agent pass (saves 2-5s)"
```

---

## Task 6: Skip Research for Template+Params in Parallel Pipeline (Enhancement #12)

**Files:**
- Modify: `server/graph/nodes/parallelSubQueryPipeline.js`

- [ ] **Step 1: Update the template+params path**

In `server/graph/nodes/parallelSubQueryPipeline.js`, replace lines 89-105:

```js
// Before:
  } else if (match && hasUserParams) {
    state = {
      ...state,
      templateSql: match.sql,
      subQueryMatchFound: true,
      matchType: 'partial',
    };
    logger.info(`[ParallelPipeline] [${index + 1}/${total}] Template hit for "${subQuestion.substring(0, 60)}" → ${match.id} (routing through writer for user params)`);

    emitProgress('research');
    const researchUpdate = await researchAgentNode(state);
    state = { ...state, ...researchUpdate };

    emitProgress('sql');
    const writerUpdate = await sqlWriterAgentNode(state);
    state = { ...state, ...writerUpdate };

// After:
  } else if (match && hasUserParams) {
    state = {
      ...state,
      templateSql: match.sql,
      subQueryMatchFound: true,
      matchType: 'partial',
    };
    logger.info(`[ParallelPipeline] [${index + 1}/${total}] Template hit for "${subQuestion.substring(0, 60)}" → ${match.id} (skipping research, routing to writer for user params)`);

    // Skip research — template provides table/column/join context.
    // Writer adapts template SQL with user param filters.
    emitProgress('sql');
    const writerUpdate = await sqlWriterAgentNode(state);
    state = { ...state, ...writerUpdate };
```

- [ ] **Step 2: Run tests**

Run: `cd server && node --test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add server/graph/nodes/parallelSubQueryPipeline.js
git commit -m "perf: skip research for template+params in parallel pipeline (matches main workflow)"
```

---

## Task 7: Zero-Row User Feedback (Enhancement #14)

**Files:**
- Modify: `server/graph/state.js`
- Modify: `server/graph/nodes/checkResults.js`

- [ ] **Step 1: Add `zeroRowGuidance` to LangGraph state**

In `server/graph/state.js`, add after the `diagnostics` channel (around line 75):

```js
  zeroRowGuidance: Annotation({ reducer: (_, b) => b, default: () => null }),
```

- [ ] **Step 2: Add suggestion generator to `checkResults.js`**

In `server/graph/nodes/checkResults.js`, add a helper function before `checkResultsNode`:

```js
function generateZeroRowSuggestion(state) {
  const question = state.question || '';
  const entities = state.entities || {};
  const category = state.questionCategory || '';

  if (entities.filters?.length > 0) {
    const stripped = question.replace(/\b(for|in|with)\s+\S+(\s+\S+)?$/i, '').trim();
    return `Try without filters: "${stripped}"`;
  }
  if (category === 'WHAT_HAPPENED') {
    return 'Try a broader time range: "last 4 quarters" or "year to date"';
  }
  return `Try being more specific: "${question} for current quarter"`;
}
```

- [ ] **Step 3: Generate `zeroRowGuidance` in `checkResultsNode`**

In the `checkResultsNode` function, after the `exec.rowCount === 0` block (around line 40), add:

```js
  let zeroRowGuidance = null;
  if (exec.rowCount === 0) {
    zeroRowGuidance = {
      message: 'Your query returned no results. The filters may be too narrow for the available data.',
      suggestion: generateZeroRowSuggestion(state),
    };
  }
```

Then include `zeroRowGuidance` in the return object (around line 63):

```js
  return {
    warnings,
    resultsSuspicious,
    zeroRowGuidance,
    attempts: { ...state.attempts, resultCheck: (state.attempts?.resultCheck || 0) + 1 },
    trace: [{ ... }],
  };
```

- [ ] **Step 4: Run tests**

Run: `cd server && node --test`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/graph/state.js server/graph/nodes/checkResults.js
git commit -m "feat: generate zero-row guidance in checkResults with query suggestion"
```

---

## Task 8: Data-First SSE Streaming — Server (Enhancement #2)

Wire up the `data_ready` SSE event and strip rows from the `done` event. Server-side only — client changes are in Task 9.

**Files:**
- Modify: `server/routes/textToSql.js`

- [ ] **Step 1: Emit `data_ready` event on execute/checkResults completion**

In `server/routes/textToSql.js`, inside the `node_complete` handler for the streaming route (the `for await` loop that processes graph updates), add a `data_ready` emission when the `execute` or `checkResults` node completes with data.

Find the section where `node_complete` events are emitted (around line 807-815) and add before the generic `node_complete` emit:

```js
      // Emit data_ready for early table rendering (only on checkResults to avoid double-emit;
      // checkResults runs right after execute and has zeroRowGuidance available)
      if (nodeName === 'checkResults') {
        const exec = lastState.execution;
        if (exec?.success && exec?.rowCount > 0) {
          const CLIENT_ROW_LIMIT = 100;
          const dataReadyEvent = {
            type: 'data_ready',
            execution: {
              success: true,
              columns: exec.columns || [],
              rows: (exec.rows || []).slice(0, CLIENT_ROW_LIMIT),
              rowCount: exec.rowCount,
              truncated: exec.rowCount > CLIENT_ROW_LIMIT,
            },
            sql: lastState.sql || '',
            zeroRowGuidance: null,
            elapsed: Date.now() - requestStart,
          };
          res.write(`event: data_ready\ndata: ${JSON.stringify(dataReadyEvent)}\n\n`);
        } else if (exec?.success && exec?.rowCount === 0) {
          const dataReadyEvent = {
            type: 'data_ready',
            execution: { success: true, columns: exec.columns || [], rows: [], rowCount: 0, truncated: false },
            sql: lastState.sql || '',
            zeroRowGuidance: lastState.zeroRowGuidance || null,
            elapsed: Date.now() - requestStart,
          };
          res.write(`event: data_ready\ndata: ${JSON.stringify(dataReadyEvent)}\n\n`);
        }
      }
```

- [ ] **Step 2: Create helper to strip rows from execution objects**

Add a helper function near the top of the file (after the imports):

```js
function stripExecutionRows(exec) {
  if (!exec) return null;
  return { ...exec, rows: [] };
}
```

- [ ] **Step 3: Strip rows from SSE `done` event in `buildFinalResponse`**

This function is used by BOTH the batch and SSE endpoints. To only strip rows for SSE, add an `options` parameter:

Modify the `buildFinalResponse` signature (line 413):

```js
function buildFinalResponse(state, usage, runtimeMetrics = null, usageByNodeAndModel = null, { stripRows = false } = {}) {
```

Inside the function, conditionally strip rows:

```js
    execution: stripRows ? stripExecutionRows(state.execution) : state.execution,
```

And for multi-query:

```js
    queries: queries.map((q) => ({
      id: q.id,
      subQuestion: q.subQuestion,
      purpose: q.purpose,
      sql: q.sql,
      reasoning: q.reasoning,
      execution: stripRows ? stripExecutionRows(q.execution) : q.execution,
    })),
```

Add `zeroRowGuidance` to the payload:

```js
    zeroRowGuidance: state.zeroRowGuidance || null,
```

- [ ] **Step 4: Pass `stripRows: true` for SSE endpoint only**

In the SSE streaming route (around line 854-856), pass the option:

```js
const finalPayload = buildFinalResponse(lastState, usageWithTiming, runtimeMetrics, usageByNodeAndModel, { stripRows: true });
```

The batch `/analyze` endpoint call (around line 524) stays unchanged — it still passes rows.

- [ ] **Step 5: Run tests**

Run: `cd server && node --test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/routes/textToSql.js
git commit -m "perf: emit data_ready SSE event, strip rows from SSE done payload"
```

---

## Task 9: Data-First SSE Streaming — Client (Enhancement #2 continued)

**Files:**
- Modify: `client/src/components/ChatPanel.jsx`
- Modify: `client/src/components/ResultsPanel.jsx`

- [ ] **Step 1: Handle `data_ready` event in ChatPanel**

In `client/src/components/ChatPanel.jsx`, find the SSE event listener setup (the `streamOnEvent` callback handling `eventType` checks for `insight_token`, `node_complete`, etc.) and add a handler for `data_ready`. Note: use `eventType` (the SSE event name) not `eventData.type`:

```js
      } else if (eventType === 'data_ready') {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (!last || last.role !== 'assistant') return prev;
          return [...prev.slice(0, -1), {
            ...last,
            dataReady: eventData.execution,
            sql: eventData.sql ? { generated: eventData.sql } : last.sql,
            zeroRowGuidance: eventData.zeroRowGuidance,
          }];
        });
      }
```

- [ ] **Step 2: Pass `dataReady` to ResultsPanel**

In the JSX where `ResultsPanel` is rendered (around line 655-668), first update the render guard to include `msg.dataReady`:

```jsx
{(msg.insights || msg.chart || msg.dataReady || (msg.execution?.success && msg.execution.rows?.length > 0) || (msg.queries?.length > 0)) && (
```

Then add the `dataReady` and `zeroRowGuidance` props to `ResultsPanel`:

```jsx
<ResultsPanel
  execution={msg.execution || msg.dataReady}
  dataReady={msg.dataReady}
  insights={msg.insights}
  chart={msg.chart}
  // ... other existing props
  zeroRowGuidance={msg.zeroRowGuidance}
/>
```

- [ ] **Step 3: Update ResultsPanel to render from `dataReady`**

In `client/src/components/ResultsPanel.jsx`, add the `dataReady` and `zeroRowGuidance` props to the component signature and render guidance:

Add to the component body, near existing `retrySuggestions` rendering:

```jsx
{zeroRowGuidance && (
  <div className="mt-3 p-3 rounded-xl bg-amber-50/50 border border-amber-100">
    <div className="text-[11px] font-semibold text-amber-700 mb-2">{zeroRowGuidance.message}</div>
    {zeroRowGuidance.suggestion && (
      <button onClick={() => onRetrySuggestion?.(zeroRowGuidance.suggestion)}
        className="text-left text-[12px] text-amber-800 hover:text-amber-950 px-2 py-1 rounded-lg hover:bg-amber-100/50 cursor-pointer transition-colors bg-transparent border-none">
        {zeroRowGuidance.suggestion}
      </button>
    )}
  </div>
)}
```

- [ ] **Step 4: Verify client builds**

Run: `cd client && npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/ChatPanel.jsx client/src/components/ResultsPanel.jsx
git commit -m "feat: handle data_ready SSE event for instant table rendering + zero-row guidance"
```

---

## Task 10: Verification — Multi-Query Path (Enhancements #11, #13)

No code changes — this is a verification task to confirm all optimizations propagate correctly to the multi-query path.

**Files:**
- Read: `server/graph/nodes/parallelSubQueryPipeline.js`
- Read: `server/graph/nodes/researchAgent.js`

- [ ] **Step 1: Verify schema pre-filter works with prefetch**

Read `researchAgent.js` prefetch block (around line 519-544). Confirm that `discoverContext.func()` calls use the updated `selectTablesAndColumnsByLLM()` which now calls `searchTables()` internally. Since `searchTables` uses module-level cached state (no request-scoped data), concurrent prefetch calls are safe.

- [ ] **Step 2: Verify single Opus agent works in parallel pipeline**

Read `parallelSubQueryPipeline.js` `runOneSubQuery()`. Confirm it calls `researchAgentNode(state)` which now uses the merged single-phase agent. Verify that `nodeModelOverrides` propagate through `buildStateSlice()` (line 37).

- [ ] **Step 3: Verify correction round limits align**

Confirm `MAX_CORRECTION_ROUNDS = 2` (set in Task 1) and `PARALLEL_CORRECTION_ROUNDS = 2` (already was 2 in constants.js). Both paths now use the same limit.

- [ ] **Step 4: Commit verification note**

```bash
git commit --allow-empty -m "verify: multi-query path inherits all optimizations (schema filter, Opus agent, corrections)"
```

---

## Task 11: Final Integration Test

- [ ] **Step 1: Run full test suite**

```bash
cd server && node --test
```

Expected: All tests pass.

- [ ] **Step 2: Run client build**

```bash
cd client && npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Manual smoke test (if server is accessible)**

Start the server and verify:
1. A simple query returns `data_ready` event before `done`
2. The `done` event has empty `execution.rows`
3. A query that returns 0 rows shows the zero-row guidance message
4. DevPanel shows `researchAgent` (not phase1/phase2)
5. Chart and correct nodes use Sonnet (check trace in DevPanel)

- [ ] **Step 4: Final commit**

```bash
git commit --allow-empty -m "verify: all pipeline latency optimizations integrated and tested"
```
