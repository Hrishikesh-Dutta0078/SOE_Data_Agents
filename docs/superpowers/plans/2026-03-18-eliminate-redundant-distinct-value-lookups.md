# Eliminate Redundant Distinct Value Lookups — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate 2-3 wasted LLM roundtrips (~20-40s) by embedding distinct values directly in the `discover_context` response, so the research agent rarely needs to call `query_distinct_values` separately.

**Architecture:** The distinct values store is already loaded in-memory from `distinct-values.json` — lookups cost <1ms. The `discover_context` tool already knows which tables/columns are relevant (from `selectTablesAndColumnsByLLM`). We add a `=== DISTINCT VALUES ===` section to its output containing top distinct values for the LLM-selected columns. The research agent prompt is updated to tell the LLM that filter values are pre-included, reducing `query_distinct_values` to an edge-case fallback tool.

**Tech Stack:** Node.js CommonJS, existing `distinctValuesFetcher` module, `node:test` for testing.

**Root Cause:** Each `query_distinct_values` call in the ReAct loop costs ~8-15s of LLM inference roundtrip time, not data time (the underlying lookup is an in-memory Map). The LLM ignores the batching instruction and makes 3 separate calls, wasting ~20-40s. Embedding the data in `discover_context` eliminates these roundtrips entirely.

---

## File Structure

### Modified Files
| File | Change |
|------|--------|
| `server/tools/discoverContext.js` | Add `=== DISTINCT VALUES ===` section using in-memory distinct values for LLM-selected columns |
| `server/graph/nodes/researchAgent.js` | Update system prompt to tell agent distinct values are pre-included; demote `query_distinct_values` to edge-case fallback |
| `server/tests/runtimeRobustness.test.js` | Add test verifying `discover_context` output includes distinct values section |

---

### Task 1: Add distinct values section to discover_context

**Files:**
- Modify: `server/tools/discoverContext.js:1-179`
- Reference: `server/vectordb/distinctValuesFetcher.js` (sync `getDistinctValues` function)

- [ ] **Step 1: Write the failing test**

Add to `server/tests/runtimeRobustness.test.js`:

```js
test('discover_context output includes distinct values section for selected columns', async () => {
  // We test the discoverContext tool's func directly.
  // Since it depends on LLM schema selection + vectordb, we test the
  // helper that appends distinct values to sections.
  const { appendDistinctValuesSection } = require('../tools/discoverContext').__testables;

  const columnsByTable = {
    'vw_TF_EBI_P2S': ['SALES_STAGE_DESC', 'OPP_SOURCE_TYPE', 'ARR'],
    'vw_TF_EBI_QUOTA': ['FISCAL_YR'],
  };
  const sections = [];
  appendDistinctValuesSection(sections, columnsByTable);

  const output = sections.join('\n');
  assert.ok(output.includes('=== DISTINCT VALUES'), 'Should contain distinct values header');
  // ARR is numeric/high-cardinality — may not have entries in the store.
  // But SALES_STAGE_DESC and FISCAL_YR should have entries if the store is loaded.
  // The function should not crash regardless of store state.
  assert.ok(typeof output === 'string');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && node --test tests/runtimeRobustness.test.js --test-name-pattern "distinct values section"`
Expected: FAIL — `__testables` not exported / `appendDistinctValuesSection` not defined.

- [ ] **Step 3: Implement appendDistinctValuesSection in discoverContext.js**

In `server/tools/discoverContext.js`, add the import at the top (after existing requires):

```js
const { getDistinctValues } = require('../vectordb/distinctValuesFetcher');
```

Add the helper function before the `discoverContextTool` definition:

```js
const DISTINCT_VALUES_LIMIT = 15;

function appendDistinctValuesSection(sections, columnsByTable) {
  const dvLines = [];
  for (const [tableName, columns] of Object.entries(columnsByTable)) {
    for (const col of columns) {
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
```

Add the `__testables` export at the bottom, following the existing codebase pattern (see `getCurrentFiscalPeriod.js`):

```js
module.exports = discoverContextTool;
module.exports.__testables = { appendDistinctValuesSection };
```

- [ ] **Step 4: Update the tool description to mention distinct values**

In `discoverContextTool`'s `description` string (line ~46-48), add "pre-fetched distinct values" so the LLM sees it in the tool definition:

```js
  description:
    'Discover all relevant context for a query in one call: schema tables, example SQL patterns, ' +
    'business rules, join rules, column metadata for top tables, the current fiscal period, ' +
    'and pre-fetched distinct values for selected columns. ' +
    'Pass the user question and optionally the detected entities to boost search accuracy.',
```

- [ ] **Step 5: Wire appendDistinctValuesSection into the tool's func**

In the `func` of `discoverContextTool`, right before the final `return sections.join('\n')` (line ~175), add:

```js
    appendDistinctValuesSection(sections, columnsByTable);
```

This uses `columnsByTable` which is already in scope from the `selectTablesAndColumnsByLLM` result on line 71.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd server && node --test tests/runtimeRobustness.test.js --test-name-pattern "distinct values section"`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add server/tools/discoverContext.js server/tests/runtimeRobustness.test.js
git commit -m "perf: embed distinct values in discover_context to eliminate LLM roundtrips"
```

---

### Task 2: Update research agent prompt to demote query_distinct_values

**Files:**
- Modify: `server/graph/nodes/researchAgent.js:291-319` (system prompt)

- [ ] **Step 1: Update the system prompt in buildResearchSystemPrompt**

In `server/graph/nodes/researchAgent.js`, replace the RESEARCH WORKFLOW section (lines ~296-303) of `buildResearchSystemPrompt`:

```js
RESEARCH WORKFLOW:
1. Call discover_context exactly ONCE with the user's question and detected entities. This returns tables, example SQL patterns, business rules, join rules, column details, the current fiscal period, AND pre-fetched distinct values for selected columns — all in one call. Do NOT call discover_context multiple times.
2. Review the discover_context results:
   a. The DISTINCT VALUES section already contains filter values for the most relevant columns. Use these directly — do NOT call query_distinct_values for columns already listed there.
   b. ONLY call query_distinct_values if you need values for a column NOT included in the distinct values section. If you do, batch ALL needed columns into a single call.
   c. If you need column details for a table not in the COLUMN DETAILS section, call inspect_table_columns.
3. Call submit_research with your complete findings.

CRITICAL: discover_context now includes distinct values. In most cases you should NOT need to call query_distinct_values at all. Go directly from discover_context to submit_research.
```

- [ ] **Step 2: Run existing tests to ensure nothing breaks**

Run: `cd server && node --test tests/runtimeRobustness.test.js`
Expected: All tests PASS (prompt changes don't affect existing test logic).

- [ ] **Step 3: Commit**

```bash
git add server/graph/nodes/researchAgent.js
git commit -m "perf: update research prompt — distinct values pre-included, skip redundant tool calls"
```

---

### Task 3: Verify end-to-end with manual test

This is not an automated test — it's a manual verification step.

- [ ] **Step 1: Start the dev server**

Run: `cd server && npm run dev`

- [ ] **Step 2: Send a test query and observe the Agent Activity trace**

Send a question that would normally trigger multiple `query_distinct_values` calls (e.g., a question involving stage names, segments, or source types). Observe:
- `discover_context` output now includes a `=== DISTINCT VALUES ===` section
- The research agent goes directly from `discover_context` to `submit_research` (or at most 1 `query_distinct_values` call for an edge-case column)
- Total research time should drop by ~20-40s

- [ ] **Step 3: Check server logs for tool call count**

Look for log line: `Research done (Xms) { tools: "N [...]" }`
Expected: tool count should be 2-3 (discover_context + submit_research, maybe 1 query_distinct_values) instead of 4-5.

---

## Summary of Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| `query_distinct_values` calls per query | 2-3 | 0-1 |
| LLM roundtrips in research phase | 5-6 | 3-4 |
| Research phase duration | ~110-120s | ~70-90s |
| Data fetching cost of change | N/A | ~0ms (in-memory Map lookups) |
