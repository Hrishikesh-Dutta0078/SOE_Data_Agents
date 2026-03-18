# Pipeline Latency Optimization — Design Spec

**Date:** 2026-03-18
**Branch:** `perf/pipeline-latency-optimization`
**Scope:** End-to-end latency reduction for the LangGraph Text-to-SQL pipeline

---

## Context

The Auto Agents pipeline (classify → research → write SQL → execute → present) takes 14–40s for a typical single query with no template match. The main bottlenecks are:

- **Research agent** (5–15s): Two-phase Haiku+Opus split, full schema sent to LLM
- **Present node** (3–8s): Users wait for insights before seeing any data
- **Row payload** (1000 rows serialized as JSON in SSE `done` event)
- **Correction loops** (5–12s per round)

Validation is turned off in production — the pipeline relies on the LLM for correct SQL and the correction layer for recovery.

### Current Hot Path (single query, no template)

```
classify (~1s) → researchAgent (~5-15s) → sqlWriterAgent (~3-8s) → injectRls (<50ms)
→ execute (0.2-2s) → checkResults (<10ms) → present (~3-8s) → done
```

### Target

- Perceived time-to-result: **under 10s** for typical queries (data visible)
- Real pipeline time: **20–30% reduction**
- LLM cost: **~40-50% reduction**

---

## Enhancement #1: Schema Pre-Filter for `discover_context`

### Problem

`selectTablesAndColumnsByLLM()` in `server/vectordb/llmSchemaSelector.js` converts the full `schema-knowledge.json` (21 tables, 725 columns, 47KB markdown, ~12-14K tokens) into markdown and sends it to Opus on every `discover_context` call. The LLM reads the entire schema just to pick 3-5 relevant tables.

### Solution

Build a keyword index over `schema-knowledge.json` (same pattern as `examplesFetcher.js` and `kpiFetcher.js`). At query time, narrow to 5-8 candidate tables by keyword overlap before sending to the LLM.

### Design

**New file: `server/vectordb/schemaSearcher.js`**

- At load time, build a keyword index from each table's name, description, column names, and column descriptions using the existing `tokenize()` + inverted index pattern.
- Export `searchTables(query, entities, k=8)` → returns top-K table names ranked by keyword overlap score.
- Lazy-loaded with `_loadPromise` pattern (consistent with other fetchers). Will be eager-loaded at startup per Enhancement #7.

**Modified file: `server/vectordb/llmSchemaSelector.js`**

- `selectTablesAndColumnsByLLM()` calls `searchTables()` first to get candidate table names.
- `schemaToMarkdown()` receives only the candidate tables' schema (not the full `rawSchema`).
- Cache the full `schemaToMarkdown()` output at module level (computed once, schema doesn't change at runtime). Used as fallback when keyword search returns < 2 tables.

**Safety fallback:** If keyword search returns fewer than 3 tables, fall back to the full cached schema markdown. This guards against both empty results and wrong results (e.g., ambiguous terms like "pipeline" matching ETL tables instead of sales pipeline). A threshold of 3 ensures the LLM always has enough candidates for meaningful column selection.

### Impact

- Input tokens: ~12-14K → ~3-4K (~75% reduction)
- LLM call latency: ~1-2s faster (less context to process)
- Cost savings: ~$0.14 per `discover_context` call

### Files

| File | Action |
|------|--------|
| `server/vectordb/schemaSearcher.js` | **Create** — keyword index + `searchTables()` |
| `server/vectordb/llmSchemaSelector.js` | **Modify** — use pre-filtered schema, cache full markdown |

---

## Enhancement #2: Data-First SSE Streaming

### Problem

Users wait for the entire present node (3-8s of insight generation + chart recommendation) before seeing any query results. The `done` SSE event carries `execution.rows` (up to 1000 rows, 500KB-1MB JSON) causing serialization overhead and network transfer delay.

For multi-query, `queries[].execution` carries rows for all sub-queries (potentially 1000 × 4 = 4000 rows).

### Solution

Emit a new `data_ready` SSE event immediately after `execute`/`checkResults` with truncated rows. Strip rows from the `done` event entirely. Insights continue streaming via existing `insight_token` events.

### Design

**New SSE event: `data_ready`**

Emitted in the `node_complete` handler in `server/routes/textToSql.js` when the execute or checkResults node completes with data:

```js
{
  type: 'data_ready',
  execution: {
    success: true,
    columns: [...],
    rows: rows.slice(0, 100),    // max 100 rows for client rendering
    rowCount: originalRowCount,   // actual count from DB
    truncated: originalRowCount > 100
  },
  sql: state.sql,
  elapsed: Date.now() - requestStart
}
```

For multi-query, emit one `data_ready` per sub-query as each completes (via existing `subquery_result` event, with rows truncated).

**Modified `buildFinalResponse()`:**

Strip `execution.rows` from the `done` payload:

```js
execution: state.execution ? {
  ...state.execution,
  rows: [],           // no rows in done event
  rowCount: state.execution.rowCount,
  columns: state.execution.columns,
} : null,
```

Same treatment for `queries[].execution` in the multi-query path — strip rows from each sub-query's execution in the `queries` array mapping:

```js
queries: queries.map((q) => ({
  ...q,
  execution: q.execution ? { ...q.execution, rows: [] } : null,
})),
```

**Backward compatibility:** The batch `/analyze` endpoint (non-SSE) has no `data_ready` event, so it must continue to include rows in its response. Only strip rows from the SSE `done` event, not from the batch endpoint's `res.json()` response.

**Client changes:**

- Handle `data_ready` event in `ChatPanel` — render the data table immediately.
- Insight text continues to arrive via `insight_token` events (already rendered progressively).
- Chart spec arrives in the `done` event (rendered when available).
- Handle edge case: `data_ready` fires but present node later fails — client should gracefully render data-only results without insights.

### Impact

- Perceived time-to-result: **3-8s faster** (users see data while insights generate)
- SSE `done` payload: drops from 500KB-1MB to <10KB
- JSON serialization: ~50-100ms saved

### Files

| File | Action |
|------|--------|
| `server/routes/textToSql.js` | **Modify** — emit `data_ready`, strip rows from `done` |
| `client/src/components/ChatPanel.jsx` | **Modify** — handle `data_ready` event |
| `client/src/components/ResultsPanel.jsx` | **Modify** — render table from `data_ready`, defer chart |

---

## Enhancement #3: Row Limit 1000 → 100

### Problem

`QUERY_RESULT_ROW_LIMIT = 1000` causes SQL Server to return up to 1000 rows. The insight LLM only samples 50 rows (`INSIGHT_SAMPLE_ROWS`), the chart LLM only samples 20 (`CHART_SAMPLE_ROWS`). The remaining 900+ rows are fetched, transferred, and serialized for no purpose.

### Solution

Set `QUERY_RESULT_ROW_LIMIT = 100` in `server/config/constants.js`.

### Rationale

- LLM insight quality is based on 50 sampled rows — unaffected by this change.
- Client table display (after Enhancement #2) shows max 100 rows anyway.
- For dashboard data with pagination, the `/dashboard-data` endpoint already has its own pagination logic independent of this limit.
- If a future need arises for more rows, the constant is trivially adjustable.

### Note

`checkResults.js` warns when `rowCount >= QUERY_RESULT_ROW_LIMIT`. With this change, users will see "Query hit the 100-row limit" more often. Consider updating the warning message to clarify this is a display limit: "Results capped at 100 rows for display. Use the dashboard view for full data exploration."

### Files

| File | Action |
|------|--------|
| `server/config/constants.js` | **Modify** — `QUERY_RESULT_ROW_LIMIT: 100` |

---

## Enhancement #4: Merge Research Phase 1 + Phase 2 Into Single Opus Pass

### Problem

The research agent currently runs two sequential phases:

1. **Phase 1 (Haiku):** ReAct agent calls discovery tools (`discover_context`, `query_distinct_values`, `inspect_table_columns`, `finish_discovery`). Takes 3-8s.
2. **Phase 2 (Opus):** Re-reads all Phase 1 messages (10-30K chars), produces a structured `ResearchBrief` via `withStructuredOutput()`. Takes 2-5s.

Phase 2 is pure overhead — it re-processes the entire Phase 1 conversation just to reformat tool results into JSON. Information is lost due to truncation (8K char limit per tool result in `formatPhase1MessagesForPrompt`).

### Solution

Eliminate the two-phase split. Run a single Opus ReAct agent that calls the discovery tools AND produces the structured brief directly via `submit_research`.

### Design

**Modified `researchAgentNode()` in `server/graph/nodes/researchAgent.js`:**

- Use `RESEARCH_TOOLS` (includes `submit_research`) instead of `DISCOVERY_TOOLS` (includes `finish_discovery`).
- Use `buildResearchSystemPrompt()` (original, instructs agent to call `submit_research`) instead of `buildResearchSystemPromptPhase1()`.
- Use a single Opus model (via `getModel({ nodeKey: 'researchAgent' })`).
- Remove the Phase 2 block: `formatPhase1MessagesForPrompt`, Opus synthesis call, `_phase2Brief`.
- Remove Phase 1 scaffolding that becomes dead code: `buildResearchSystemPromptPhase1()`, `DISCOVERY_TOOLS` array, `phase1CalledFinishDiscovery()`, `phase1Mode` logic in `createMemoizedTools`.
- Keep the fallback brief builder (`buildFallbackBriefFromDiscoverContext`) for timeout/error cases.

**CRITICAL: Update `server/config/llm.js`** — `'researchAgent'` is currently in `FAST_NODE_KEYS` (line 84-87), which would resolve it to Haiku instead of Opus. Remove `'researchAgent'` and `'researchAgent_phase1'` from `FAST_NODE_KEYS` so the merged agent defaults to Opus.

**Update `server/routes/textToSql.js`** — the `VALID_NODE_KEYS` set (line 44-49) contains `'researchAgent_phase1'` and `'researchAgent_phase2'`. Replace both with `'researchAgent'` so the DevPanel override works with the merged node.

**Remove `server/tools/finishDiscovery.js`** — no longer needed.

**`nodeModelOverrides` key:** Changes from `researchAgent_phase1` / `researchAgent_phase2` → single `researchAgent`. DevPanel UI updated accordingly.

**Prefetch system preserved:** The `discover_context` prefetch for sub-queries 2-N is independent of the Phase 1/2 split and continues to work unchanged.

### Trade-offs

- **Latency:** Saves 2-5s (eliminates Phase 2 entirely). Opus tool-calling turns are slightly slower than Haiku, but the net savings from eliminating Phase 2 re-reading are larger.
- **Cost:** Roughly neutral. Opus tool-calling costs more per turn than Haiku, but we eliminate the expensive Phase 2 input (10-30K tokens). Combined with Enhancement #1 (smaller schema in `discover_context`), net cost should decrease.
- **Quality:** Strictly better. Opus makes smarter tool-calling decisions. No information loss from Phase 1→2 handoff truncation.

### Files

| File | Action |
|------|--------|
| `server/graph/nodes/researchAgent.js` | **Modify** — remove Phase 1/2 split, single Opus agent |
| `server/config/llm.js` | **Modify** — remove `researchAgent` and `researchAgent_phase1` from `FAST_NODE_KEYS` |
| `server/routes/textToSql.js` | **Modify** — update `VALID_NODE_KEYS` (replace phase1/phase2 with single `researchAgent`) |
| `server/tools/finishDiscovery.js` | **Remove** |
| `client/src/components/DevPanel.jsx` | **Modify** — update nodeKey from phase1/phase2 → single `researchAgent` |

---

## Enhancement #5: Correct Node → Sonnet

### Problem

The correction node uses Opus (`nodeKey: 'correct'`) for SQL fixes. SQL corrections are mechanical — fix column names, balance parentheses, adjust WHERE clauses based on error messages. This doesn't require Opus-level reasoning.

### Prerequisites

Enhancements #5 and #6 require Sonnet Azure endpoint env vars to be configured: `AZURE_ANTHROPIC_SONNET_ENDPOINT`, `AZURE_ANTHROPIC_SONNET_API_KEY`, `AZURE_ANTHROPIC_SONNET_MODEL_NAME`. The `sonnet` profile exists in `MODEL_PROFILES` (constants.js) but is not documented in CLAUDE.md. Update `.env` documentation to reflect the three-profile setup (opus/sonnet/haiku).

### Solution

Change the default model profile for the `correct` nodeKey to Sonnet. Create a new `SONNET_NODE_KEYS` set in `server/config/llm.js` (analogous to `FAST_NODE_KEYS` for Haiku) and add `'correct'` to it. Update `resolveProfileName()` to check this set.

Still overridable via `nodeModelOverrides.correct` from the DevPanel.

### Files

| File | Action |
|------|--------|
| `server/config/llm.js` or `server/graph/nodes/correct.js` | **Modify** — default to Sonnet |

---

## Enhancement #6: Present Chart → Sonnet

### Problem

The chart recommendation call uses Opus (`nodeKey: 'presentChart'`). Chart spec generation is a simple schema-filling task — pick a chart type, assign axes from column names. Doesn't need Opus quality.

### Solution

Same approach as Enhancement #5 — default the `presentChart` nodeKey to Sonnet.

Still overridable via `nodeModelOverrides.presentChart`.

### Files

| File | Action |
|------|--------|
| `server/config/llm.js` or `server/graph/nodes/present.js` | **Modify** — default to Sonnet |

---

## Enhancement #7: Add Schema Searcher to Startup Eager-Load

### Current State

Eager loading is **already implemented** in `server/index.js` (lines 151-166). All existing fetchers (schema, examples, rules, KPIs, distinct values, join rules) are loaded via `Promise.allSettled` at startup.

### Solution

Add the new `schemaSearcher` from Enhancement #1 to the existing loader array in `server/index.js`:

```js
const loaders = [
  ['distinctValues', loadDistinctValuesAsync],
  ['schema', loadSchemaKnowledgeAsync],
  ['examples', loadExamplesAsync],
  ['rules', loadRulesAsync],
  ['joinKnowledge', loadJoinKnowledgeAsync],
  ['kpiGlossary', loadKpiGlossaryAsync],
  ['schemaSearcher', loadSchemaSearcherAsync],  // NEW from Enhancement #1
];
```

### Files

| File | Action |
|------|--------|
| `server/index.js` | **Modify** — add `schemaSearcher` to existing loader array |

---

## Enhancement #8: Pre-Warm DB Connection Pool

### Problem

`DB_POOL_MIN = 0` means the connection pool starts empty. First query triggers connection establishment (~200-500ms).

### Solution

Set `DB_POOL_MIN = 2` in `server/config/constants.js`. The `mssql` pool will create 2 connections at initialization, ready for immediate use.

### Files

| File | Action |
|------|--------|
| `server/config/constants.js` | **Modify** — `DB_POOL_MIN: 2` |

---

## Enhancement #9: Parallelize Knowledge Searches in `discover_context`

### Problem

In `server/tools/discoverContext.js`, `searchExamples()`, `searchRules()`, and `searchKpis()` run sequentially after `selectTablesAndColumnsByLLM()` returns (lines 62-65). These are pure in-memory keyword searches (<5ms each) with no dependency on the LLM result.

### Solution

Run `searchExamples`, `searchRules`, `searchKpis` in parallel with the LLM call using `Promise.all`. Only `getJoinRulesForTables` and `getSchemaByTableNames` depend on the LLM-selected table names and must wait.

### Design

```js
const fiscalPromise = fetchFiscalPeriod();
const llmPromise = selectTablesAndColumnsByLLM(query, entities);

// These don't depend on LLM result — run in parallel
const [examples, rules, kpis] = await Promise.all([
  searchExamples(enrichedQuery, 5),
  searchRules(enrichedQuery, 8),
  searchKpis(enrichedQuery, 5),
]);

// These need table names from LLM
const { tableNames, columnsByTable } = await llmPromise;
const joinRules = getJoinRulesForTables(tableNames);
// ... rest of function
const fiscalPeriod = await fiscalPromise;
```

**Note:** `searchExamples/Rules/Kpis` are synchronous functions (return immediately from in-memory index). The real optimization here is starting the LLM promise before running the sync calls, so the LLM call is in flight while the sync work happens. The latency saving is negligible (<5ms) since the sync calls are near-instant. This is primarily a **code clarity improvement** — making the independence of these calls explicit and future-proofing for any async changes.

### Files

| File | Action |
|------|--------|
| `server/tools/discoverContext.js` | **Modify** — restructure to parallel execution |

---

## Enhancement #10: Reduce `MAX_CORRECTION_ROUNDS` 3 → 2

### Problem

The third correction round rarely succeeds. Each round costs 5-12s (correct LLM call + injectRls + execute). The parallel pipeline already uses `PARALLEL_CORRECTION_ROUNDS = 2`.

### Solution

Set `MAX_CORRECTION_ROUNDS = 2` in `server/config/constants.js`. Aligns both single-query and multi-query paths.

### Files

| File | Action |
|------|--------|
| `server/config/constants.js` | **Modify** — `MAX_CORRECTION_ROUNDS: 2` |

---

## Enhancement #11: Multi-Query Path Inherits All Optimizations

### Verification

The parallel sub-query pipeline (`server/graph/nodes/parallelSubQueryPipeline.js`) calls `researchAgentNode()` and `sqlWriterAgentNode()` directly. All optimizations to these nodes (#1, #4, #9) apply automatically to every sub-query that goes through the research path.

The `discover_context` prefetch system (researchAgent.js lines 519-544) pre-calls `discover_context` for sub-queries 2-N while sub-query 1 runs. These prefetches will also use the new keyword pre-filter from Enhancement #1, making them faster and cheaper.

**No additional code changes needed** — but verification during implementation is required to confirm:
- Schema pre-filter works correctly under concurrent prefetch calls
- Single Opus agent (Enhancement #4) works in the parallel pipeline context
- `nodeModelOverrides` propagate correctly via `buildStateSlice()`

---

## Enhancement #12: Skip Research for Template+Params in Parallel Pipeline

### Problem

In `parallelSubQueryPipeline.js` (lines 89-105), when a sub-query has a template match but the blueprint has user params (e.g., "for EMEA"), the pipeline runs the full `researchAgentNode()` before `sqlWriterAgentNode()`. This is inconsistent with the main workflow where `matchType='partial'` skips research and routes directly to `sqlWriterAgent` (workflow.js line 42-44).

The template SQL already contains the table structure, columns, joins, and aggregation pattern. The SQL writer only needs to add WHERE clauses for the user params.

### Solution

For template match with user params, skip `researchAgentNode()` and go directly to `sqlWriterAgentNode()`:

```js
} else if (match && hasUserParams) {
    state = {
      ...state,
      templateSql: match.sql,
      subQueryMatchFound: true,
      matchType: 'partial',
    };
    // Skip research — template provides all context. Writer adapts with user params.
    emitProgress('sql');
    const writerUpdate = await sqlWriterAgentNode(state);
    state = { ...state, ...writerUpdate };
}
```

### Impact

For a 4 sub-query blueprint where all sub-queries have template matches, this saves **4 x (5-13s) = 20-52s** of unnecessary research.

### Files

| File | Action |
|------|--------|
| `server/graph/nodes/parallelSubQueryPipeline.js` | **Modify** — skip research for template+params path |

---

## Enhancement #13: Parallel Pipeline Correction Consistency

### Verification

With Enhancement #10 setting `MAX_CORRECTION_ROUNDS = 2`, both the main workflow and parallel pipeline use the same correction limit.

**Accepted differences** (no changes needed):

- **No `diagnoseEmptyResults` per sub-query:** Empty-result diagnosis targets single-query patterns (QTR_BKT_IND widening). For multi-query, partial results are handled gracefully by the present node.
- **No `checkResults` per sub-query:** The null ratio check per sub-query would add latency for marginal value. The aggregate `checkResults` after all sub-queries complete catches important cases.

These differences are documented here for future reference but do not require code changes.

---

## Enhancement #14: Zero-Row User Feedback

### Problem

When a query returns 0 rows and no sub-queries succeeded:
- The present node is skipped entirely (present.js lines 222-230) — no insights, no `retrySuggestions`
- `diagnoseEmptyResults` may route to `__end__` (workflow.js lines 175-179) — no user feedback
- The user sees an empty response with no explanation or guidance

### Solution

Generate zero-row guidance earlier in the pipeline (in `checkResults` node or SSE route) so it's available even when present is skipped. Include a clear message and one concrete query suggestion.

### Design

**CRITICAL: Add `zeroRowGuidance` to LangGraph state definition.**

In `server/graph/state.js`, add a new state channel. Without this, `checkResults` can set the value but LangGraph will silently drop it during state merge — downstream nodes and the final state would never see it:

```js
zeroRowGuidance: Annotation({ reducer: (_, b) => b, default: () => null }),
```

**Modified `checkResultsNode()` in `server/graph/nodes/checkResults.js`:**

When `rowCount === 0`, generate a `zeroRowGuidance` object in the return value:

```js
zeroRowGuidance: {
  message: "Your query returned no results. The filters may be too narrow for the available data.",
  suggestion: generateSuggestion(state),  // one concrete adjusted query
}
```

Suggestion generation logic (reused from existing present.js retry suggestions):
- If filters detected in entities → suggest removing the most restrictive filter
- If time-based question category → suggest broadening time range
- Fallback → suggest rephrasing with "for current quarter"

**In `data_ready` SSE event (Enhancement #2):**

When `rowCount === 0`, include `zeroRowGuidance` in the event payload.

**In `done` SSE event:**

Also include `zeroRowGuidance` in `buildFinalResponse()` so the client has it regardless of which event it processes.

**Client rendering:**

Display the guidance message + clickable suggestion using the same UI pattern as existing `retrySuggestions` in ResultsPanel.jsx. Client must also handle the case where `data_ready` fires with 0 rows and then `done` arrives without insights (present node was skipped).

### Files

| File | Action |
|------|--------|
| `server/graph/state.js` | **Modify** — add `zeroRowGuidance` channel |
| `server/graph/nodes/checkResults.js` | **Modify** — generate `zeroRowGuidance` |
| `server/routes/textToSql.js` | **Modify** — include in `data_ready` and `done` events |
| `client/src/components/ResultsPanel.jsx` | **Modify** — render zero-row guidance |

---

## Summary of All Changes

### New Files
| File | Purpose |
|------|---------|
| `server/vectordb/schemaSearcher.js` | Keyword index over schema for table pre-filtering |

### Removed Files
| File | Reason |
|------|--------|
| `server/tools/finishDiscovery.js` | Replaced by `submit_research` in merged single-phase agent |

### Modified Files
| File | Enhancements |
|------|-------------|
| `server/config/constants.js` | #3 (row limit), #8 (pool min), #10 (correction rounds) |
| `server/config/llm.js` | #4 (remove researchAgent from FAST_NODE_KEYS), #5 (correct→Sonnet), #6 (chart→Sonnet) |
| `server/graph/state.js` | #14 (add `zeroRowGuidance` state channel) |
| `server/vectordb/llmSchemaSelector.js` | #1 (schema pre-filter, cache markdown) |
| `server/tools/discoverContext.js` | #9 (restructure for clarity) |
| `server/graph/nodes/researchAgent.js` | #4 (merge Phase 1+2) |
| `server/graph/nodes/checkResults.js` | #14 (zero-row guidance) |
| `server/graph/nodes/present.js` | #6 (chart→Sonnet) |
| `server/graph/nodes/correct.js` | #5 (correct→Sonnet) |
| `server/graph/nodes/parallelSubQueryPipeline.js` | #12 (skip research for template+params) |
| `server/routes/textToSql.js` | #2 (data_ready event, strip rows from SSE done), #4 (update VALID_NODE_KEYS), #14 (zero-row guidance) |
| `server/index.js` | #7 (add schemaSearcher to existing loader array) |
| `client/src/components/ChatPanel.jsx` | #2 (handle data_ready event) |
| `client/src/components/ResultsPanel.jsx` | #2 (render from data_ready), #14 (zero-row guidance) |
| `client/src/components/DevPanel.jsx` | #4 (update nodeKey labels) |

### Expected Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Perceived time-to-data (single query) | 14-40s | 6-15s | **~50% faster** |
| Real pipeline time (single query) | 14-40s | 8-25s | **~30% faster** |
| Research agent duration | 5-15s | 4-10s | ~30% faster |
| Blueprint sub-query (template+params) | 8-20s | 3-8s | **~60% faster** |
| LLM cost per query | ~$0.90 | ~$0.45 | **~50% cheaper** |
| SSE `done` payload size | 500KB-1MB | <10KB | **~99% smaller** |
| Cold start penalty | 400-1000ms | ~0ms | Eliminated |
