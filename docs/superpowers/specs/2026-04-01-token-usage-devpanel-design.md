# Token Usage Logging in DevPanel — Design Spec

**Date:** 2026-04-01
**Status:** Draft
**Scope:** Server-side token attribution fix + DevPanel UI addition

## Goal

Show per-phase token counts (input + output) for the two main LLM phases — Schema Research and SQL Generation — in the DevPanel, so developers can monitor cost at a glance.

## Context

The system tracks token usage per LLM call via LangChain callbacks in `server/config/llm.js`. Two issues prevent this data from reaching the UI:

1. The schema-selection LLM call (`server/vectordb/llmSchemaSelector.js`) omits `nodeKey`, so its tokens are not attributed to any per-node bucket.
2. `buildUsageBreakdown` (`server/utils/usageMetrics.js`) hardcodes stale keys (`researchAgent`, `sqlWriterAgent`) that no longer match the live graph nodes (`contextFetch`, `generateSql`), returning zeros.

The DevPanel already receives `lastRunMetrics` (including `usageByNodeAndModel`) from the `done` SSE event but only displays timing data today.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Which phases | Schema Research (`contextFetch`) + SQL Generation (`generateSql`) only | User wants the two main cost drivers, not all nodes |
| Audience | Developers only | Cost monitoring, not end-user transparency |
| Placement | DevPanel inline section | Already a dev-only panel; no gating needed |
| Detail level | Input tokens + output tokens per phase | Sufficient for cost estimation without clutter |
| Cost display | Tokens only, no USD | Developer can estimate from token counts |
| Approach | Inline section between model toggle and timing box | Minimal code, always visible, consistent styling |

## Server Changes

### 1. Attribute contextFetch LLM tokens

**File:** `server/vectordb/llmSchemaSelector.js`

Add `nodeKey: 'contextFetch'` to the `getModel` call in `selectTablesAndColumnsByLLM`. This causes the LangChain `handleLLMEnd` callback to call `recordUsageWithContext` with the `contextFetch` key, bucketing the tokens in `_usageByNodeAndModel`.

### 2. Update breakdown keys

**File:** `server/utils/usageMetrics.js`

In `buildUsageBreakdown`, replace:
- `nodes`: `['researchAgent', 'sqlWriterAgent']` → `['contextFetch', 'generateSql']`
- `models`: `['opus', 'haiku']` → `['opus', 'sonnet', 'haiku', 'gpt']`

Output shape unchanged: `{ [nodeKey]: { [model]: { inputTokens, outputTokens, totalTokens } } }`.

## Client Changes

### 3. DevPanel — Token Usage section

**File:** `client/src/components/DevPanel.jsx`

Add a "Token Usage" section between the Active Model toggle and the Last Query timing box.

**Layout:**

```
TOKEN USAGE
┌─────────────────────────────────┐
│ Schema Research                 │
│ [Opus]  In: 2.4k   Out: 312    │
│                                 │
│ SQL Generation                  │
│ [Opus]  In: 3.1k   Out: 856    │
└─────────────────────────────────┘
```

**Styling:**
- Section label: 10px/700 uppercase, `color: var(--color-text-faint)`, `letter-spacing: 0.8px` (matches existing "ACTIVE MODEL" and "LAST QUERY" labels)
- Container: `background: rgba(255,255,255,0.3)`, `border: 1px solid var(--color-border-light)`, `border-radius: var(--radius-md)`, `padding: 16px`
- Phase label: 12px/600, `color: var(--color-text-secondary)`
- Model badge: Small colored pill using `MODEL_OPTIONS` colors (purple for Opus, green for GPT-5.4)
- Token values: 11px, `font-variant-numeric: tabular-nums`, `color: var(--color-text-muted)`. Format: "In: 2.4k  Out: 312"
- Empty state: "—" when no query has been run

**Token formatting:** Compact display — values under 1000 show as-is (e.g., "312"), values 1k-999k show as "2.4k", values 1M+ show as "1.2M".

**Data source:** `lastRunMetrics.usageByNodeAndModel` — already passed from `ChatPanel`'s `onMetricsUpdate` on the `done` event. DevPanel reads `usageByNodeAndModel` from its existing `lastRunMetrics` prop (no new prop needed).

**Logic:** Iterate over `['contextFetch', 'generateSql']` keys. For each, find the model entry with non-zero `totalTokens` and display its `inputTokens` and `outputTokens`. If multiple models have data for the same phase (unlikely but possible with overrides), show all. If a phase has zero tokens across all models (e.g., `contextFetch` skipped due to exact template match), show "—" for that row rather than hiding it entirely — this makes it clear the phase was skipped.

### 4. MODEL_BADGE additions (ChatPanel.jsx)

Add `haiku` and `gpt` entries to `MODEL_BADGE` for completeness (fixes the dashboard token display too):

```javascript
haiku: { color: '#059669', bg: 'rgba(16,185,129,0.12)' },
gpt:   { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
```

## Data Flow

```
llmSchemaSelector.js                    generateSql.js
  getModel({ nodeKey: 'contextFetch' })    getModel({ nodeKey: 'generateSql' })
         ↓                                        ↓
  handleLLMEnd callback                    handleLLMEnd callback
         ↓                                        ↓
  recordUsageWithContext(contextFetch)      recordUsageWithContext(generateSql)
         ↓                                        ↓
              _usageByNodeAndModel (llm.js)
                        ↓
              buildUsageBreakdown (usageMetrics.js)
                        ↓
              done SSE event: { usageByNodeAndModel: { contextFetch: {...}, generateSql: {...} } }
                        ↓
              ChatPanel onMetricsUpdate → lastRunMetrics prop
                        ↓
              DevPanel reads usageByNodeAndModel → renders Token Usage section
```

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| `server/vectordb/llmSchemaSelector.js` | Add `nodeKey: 'contextFetch'` | ~1 |
| `server/utils/usageMetrics.js` | Update node/model keys | ~2 |
| `client/src/components/DevPanel.jsx` | Add Token Usage section | ~50 |
| `client/src/components/ChatPanel.jsx` | Add haiku/gpt to MODEL_BADGE | ~2 |

## What This Does NOT Change

- No graph state or workflow topology changes
- No new SSE event types
- No new API fields or endpoints
- No changes to ThinkingBubble, NarrativeCard, or answer cards
- Other LLM nodes (classify, correct, present, semanticValidator) are not surfaced
