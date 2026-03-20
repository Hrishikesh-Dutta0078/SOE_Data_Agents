# Natural Mode Multi-Query: Bypass Template Matching

**Date:** 2026-03-21
**Status:** Approved
**Scope:** Flow correction — restrict gold example template matching to blueprint mode only in multi-query decomposition

## Problem

In multi-query mode, the system forces template matching on all sub-queries regardless of whether the user entered a blueprint slash command or asked a natural question. The decompose node passes all gold examples to the LLM as "ALLOWED GOLD TEMPLATES" and instructs it to map each sub-query to a `templateId`. The `alignSubQueriesToTemplates` node then rewrites sub-queries to canonical phrasing and runs LLM fallback matching. This constrains the SQL writer unnecessarily when the user's natural question doesn't map cleanly to existing templates.

**Desired behavior:** In natural mode multi-query, the LLM should decompose freely without template pressure. Only near-exact programmatic matches (≥0.8 token overlap) should shortcut to template SQL. Blueprint mode remains unchanged.

## Design

### Approach: Conditional Routing (Approach A)

Use `state.blueprintId` as the mode signal. It's already the canonical indicator — truthy for blueprint mode, falsy for natural mode. No new state fields needed.

### Change 1: Decompose Node + Prompt

**Files:** `server/graph/nodes/decompose.js` (line 137), `server/prompts/decompose.js`

**1a.** Skip `buildPreferredPhrasings()` when not in blueprint mode:

```js
// Before
const preferredPhrasings = buildPreferredPhrasings(state);

// After
const preferredPhrasings = state.blueprintId ? buildPreferredPhrasings(state) : '';
```

**1b.** The decompose prompt (`server/prompts/decompose.js`) has template-mandate instructions throughout the system and user prompts. Passing empty `preferredPhrasings` while keeping these instructions creates a contradictory prompt. All template-mandate text must be conditionalized.

**Lines requiring conditionalization in `DECOMPOSE_SYSTEM`:**
- Line 9: `"Each sub-query MUST map to one of the verified gold SQL templates listed below."`
- Line 13: `"CRITICAL: Each sub-query MUST be answerable by one of the provided gold templates. Do NOT invent sub-questions that have no corresponding template."`
- Lines 14-15: `"For each sub-query, use the template's canonical question or one of its variants verbatim..."` and `"Set templateId to the matching template's id... omit that facet rather than creating an unmatched sub-query."`
- Lines 21-36 (strategy sections): Six phrases referencing templates: `"pick the matching template"` (×4), `"only if a template exists for it"` (×2), `"using only facets covered by available templates"` (×1)
- Lines 39-43 (output format): Example JSON includes `"templateId": "<gold template id>"` in both sample objects

**Line requiring conditionalization in `DECOMPOSE_USER`:**
- Line 55: Header `"=== ALLOWED GOLD TEMPLATES (each sub-query MUST map to one of these) ==="`

**Implementation approach:** Rather than scattering `{placeholder}` tokens throughout, use two variants of the system prompt:

- `DECOMPOSE_SYSTEM_BLUEPRINT` — current text unchanged
- `DECOMPOSE_SYSTEM_NATURAL` — rewritten without any template-mandate language:
  - RULES: "Break the question into 2-4 focused sub-queries. Each must be self-contained and answerable by a single SQL query. Order logically: baselines first, breakdowns second, diagnostics third. Set templateId to null for all sub-queries."
  - STRATEGIES: Same category-based decomposition strategies but without "pick the matching template" language — instead "identify the relevant analytical angle"
  - OUTPUT FORMAT: Same JSON structure but `templateId` shown as `null`

`buildDecomposeInputs` accepts a `blueprintId` parameter and selects the prompt variant. For natural mode, the `{preferredPhrasings}` section and its header are omitted entirely from the user message (not rendered as `(none)`).

The `decomposeNode` in `decompose.js` passes `state.blueprintId` to `buildDecomposeInputs` so it can determine the mode. Estimated scope: ~25-30 lines changed in `decompose.js` prompt file.

### Change 2: Workflow Routing

**File:** `server/graph/workflow.js`
**Lines:** 158-161 (`routeAfterDecompose`), 196 (static edge)

Replace the static `decompose → alignSubQueries` edge with conditional routing:

```js
function routeAfterDecompose(state) {
  if (state.blueprintId) {
    logger.info('Blueprint decompose complete, routing to template alignment', {
      subQueryCount: (state.queryPlan || []).length,
    });
    return 'alignSubQueries';
  }
  const plan = state.queryPlan || [];
  if (plan.length > 1) {
    logger.info('Natural multi-query: skipping alignment, routing to parallel pipeline', {
      subQueryCount: plan.length,
    });
    return 'parallelSubQueryPipeline';
  }
  logger.info('Natural single sub-query: skipping alignment, routing to subQueryMatch');
  return 'subQueryMatch';
}
```

Graph edge change:

```js
// Before
.addEdge('decompose', 'alignSubQueries')

// After
.addConditionalEdges('decompose', routeAfterDecompose, [
  'alignSubQueries', 'parallelSubQueryPipeline', 'subQueryMatch',
])
```

### Change 3: SubQueryMatch Node

**File:** `server/graph/nodes/subQueryMatch.js`
**Lines:** 30 (function signature), 71 (threshold), 112-137 (node logic)

**3a.** Add `threshold` parameter to `findSubQueryMatch`:

```js
// Before
function findSubQueryMatch(question) {
  // ...
  if (bestScore >= SUB_QUERY_MATCH_THRESHOLD && bestId) {

// After
function findSubQueryMatch(question, threshold = SUB_QUERY_MATCH_THRESHOLD) {
  // ...
  if (bestScore >= threshold && bestId) {
```

**3b.** Gate matching steps on `isBlueprint` in `subQueryMatchNode`:

```js
const isBlueprint = Boolean(state.blueprintId);

let match = null;
let matchSource = 'programmatic';

// Step 1: direct templateId resolve (blueprint only)
if (isBlueprint && planItem.templateId) {
  const { examplesMap } = loadGoldIndex();
  const example = examplesMap.get(planItem.templateId);
  if (example?.sql) {
    match = { id: planItem.templateId, sql: example.sql, score: null };
    matchSource = 'templateId';
  }
}

// Step 2: programmatic match — strict threshold (0.8) for natural, loose (0.4) for blueprint
if (!match) {
  match = findSubQueryMatch(
    subQuestion,
    isBlueprint ? SUB_QUERY_MATCH_THRESHOLD : NATURAL_SUB_QUERY_MATCH_THRESHOLD,
  );
  matchSource = 'programmatic';
}

// Step 3: LLM fallback (blueprint only)
if (!match && isBlueprint) {
  match = await findSubQueryMatchLLMFallback(subQuestion, state);
  matchSource = 'llm_fallback';
}
```

Note: `subQueryMatchNode` is only reached for single sub-query cases (via `routeAfterDecompose` or the `accumulateResult → subQueryMatch` loop). For multi-query, see Change 5.

### Change 5: Parallel Sub-Query Pipeline

**File:** `server/graph/nodes/parallelSubQueryPipeline.js`
**Lines:** 65-75 (`runOneSubQuery` inline matching)

**Critical:** `parallelSubQueryPipeline` does NOT call `subQueryMatchNode`. It has its own inline matching logic in `runOneSubQuery` that directly calls `findSubQueryMatch` (at 0.4 threshold) and `findSubQueryMatchLLMFallback`. This is the actual execution path for all multi-query flows. Without this change, the spec's goal is not achieved for multi-query.

Apply the same `isBlueprint` gating as Change 3:

```js
// In runOneSubQuery, replace lines 65-75:
const isBlueprint = Boolean(baseState.blueprintId);

let match = null;
// Step 1: direct templateId resolve (blueprint only)
if (isBlueprint && item.templateId) {
  const { examplesMap } = loadGoldIndex();
  const example = examplesMap.get(item.templateId);
  if (example?.sql) {
    match = { id: item.templateId, sql: example.sql, score: null };
    logger.info(`[ParallelPipeline] [${index + 1}/${total}] Direct templateId resolve: ${item.templateId}`);
  }
}
// Step 2: programmatic match — strict (0.8) for natural, loose (0.4) for blueprint
if (!match) {
  match = findSubQueryMatch(
    subQuestion,
    isBlueprint ? SUB_QUERY_MATCH_THRESHOLD : NATURAL_SUB_QUERY_MATCH_THRESHOLD,
  );
}
// Step 3: LLM fallback (blueprint only)
if (!match && isBlueprint) {
  match = await findSubQueryMatchLLMFallback(subQuestion, state);
}
```

Import `NATURAL_SUB_QUERY_MATCH_THRESHOLD` and `SUB_QUERY_MATCH_THRESHOLD` from constants at the top of the file.

**Note on `hasUserParams`:** The existing `hasUserParams` check (line 63: `!!(baseState.blueprintMeta?.userParams)`) is inherently `false` in natural mode since `blueprintMeta` is falsy. This means any match in natural mode is treated as a full `'template'` match (`matchType: 'template'`), which is correct — a near-exact programmatic hit should use template SQL directly. No changes needed to the `hasUserParams` branching.

### Change 4: New Constant

**File:** `server/config/constants.js`

```js
NATURAL_SUB_QUERY_MATCH_THRESHOLD: 0.8,
```

Dedicated constant for natural mode sub-query matching. Set to 0.8 (same as classify's exact-match threshold) to ensure only near-exact gold example matches get template shortcuts.

## Flow Comparison

```
BLUEPRINT MODE (unchanged):
  Classify → Decompose(+gold templates) → AlignSubQueries → ParallelPipeline
    └─ per sub-query: inline match(0.4 + LLM fallback) → ContextFetch → GenerateSql → ...

NATURAL MODE (new):
  Classify → Decompose(free, no templates) → ParallelPipeline
    └─ per sub-query: inline match(0.8 programmatic only) → ContextFetch → GenerateSql → ...

NATURAL MODE single sub-query (edge case — decompose produces 1 query):
  Classify → Decompose(free) → SubQueryMatch(0.8 programmatic only) → ContextFetch → GenerateSql → ...
```

## Files Changed

| File | Change | Scope |
|------|--------|-------|
| `server/graph/nodes/decompose.js` | Conditional `buildPreferredPhrasings`; pass `blueprintId` to prompt builder | ~2 lines |
| `server/prompts/decompose.js` | Two system prompt variants (blueprint/natural); conditional user message section | ~25-30 lines |
| `server/graph/workflow.js` | Conditional `routeAfterDecompose`; static edge → conditional edges | ~10 lines |
| `server/graph/nodes/subQueryMatch.js` | `threshold` param on `findSubQueryMatch`; gate steps on `isBlueprint` | ~10 lines |
| `server/graph/nodes/parallelSubQueryPipeline.js` | Gate inline matching on `isBlueprint`; use threshold param; skip LLM fallback for natural | ~10 lines |
| `server/config/constants.js` | Add `NATURAL_SUB_QUERY_MATCH_THRESHOLD` | 1 line |

## Files NOT Changed

- `classify.js` — single-query template matching and classification logic untouched
- `alignSubQueriesToTemplates.js` — no code changes; unreachable in natural mode
- `generateSql.js` — no changes; in natural mode without a template match, `matchType` won't be `'template'` or `'partial'`, so it follows the full research path naturally
- All blueprint-mode behavior — completely preserved

## Testing

New test file: `server/tests/naturalModeTemplateBypass.test.js`

Test cases:
- Natural multi-query: decompose prompt does NOT include template-mandate instructions
- Natural multi-query: decomposer does not produce `templateId`s
- Natural multi-query: `alignSubQueries` node is not visited (check trace)
- Natural multi-query: `parallelSubQueryPipeline` inline matching uses 0.8 threshold, no LLM fallback
- Natural multi-query with near-exact sub-query (≥0.8 overlap): template SQL is used as shortcut
- Natural multi-query with sub-query below 0.8 overlap: full research path taken
- Blueprint multi-query: all existing behavior preserved (0.4 threshold, LLM fallback, alignment)
- Natural single sub-query from decompose: routes to `subQueryMatch` (not `alignSubQueries`), uses 0.8 threshold
- `routeAfterDecompose` unit tests: returns correct node for blueprint, natural multi, natural single
