# Developer Panel — Per-Node LLM Model Selection

**Date:** 2026-03-18
**Status:** Approved
**Purpose:** Add a developer panel UI with per-node Opus/Sonnet/Haiku model selection to analyze speed vs accuracy tradeoffs across the LangGraph pipeline.

---

## Overview

Currently the system has two model profiles (Opus and Haiku) with a single boolean toggle (`useFastModel`). This design adds:

1. A **Sonnet** model profile as a third option
2. A **Developer Panel** — a viewport-level slide-in panel with per-call-site model selectors
3. **Named presets** for quick configuration switching
4. **Per-node last-run metrics** (latency + token count) displayed alongside each selector

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Panel trigger | Fixed gear icon on right viewport edge | Always accessible, doesn't clutter sidebar |
| Control granularity | Per individual call site (12 controls) | Maximum precision for speed/accuracy analysis |
| Selector style | 3-button segmented control per row | Most legible for scanning model distribution at a glance |
| Persistence | localStorage + named presets | Enables repeatable A/B testing across sessions |
| Metrics | Per-node last-run stats (latency + tokens) | Most actionable for immediate tuning feedback |
| Architecture | Extend existing prop pattern (Approach A) | Follows existing `useFastModel` conventions, replaces it |

## Server Architecture

### 1. New Sonnet Profile — `server/config/constants.js`

Add `sonnet` to `MODEL_PROFILES`:

```js
sonnet: Object.freeze({
  provider: 'anthropic',
  modelNameEnv: 'AZURE_ANTHROPIC_SONNET_MODEL_NAME',
  defaultModelName: 'claude-sonnet-4-6',
  endpointEnv: 'AZURE_ANTHROPIC_SONNET_ENDPOINT',
  apiKeyEnv: 'AZURE_ANTHROPIC_SONNET_API_KEY',
}),
```

New env vars in `.env` / `.env.example` (also add the missing Haiku vars to `.env.example`):
- `AZURE_ANTHROPIC_SONNET_API_KEY`
- `AZURE_ANTHROPIC_SONNET_ENDPOINT`
- `AZURE_ANTHROPIC_SONNET_MODEL_NAME`
- `AZURE_ANTHROPIC_HAIKU_API_KEY` (missing from .env.example, already in .env)
- `AZURE_ANTHROPIC_HAIKU_ENDPOINT`
- `AZURE_ANTHROPIC_HAIKU_MODEL_NAME`

(Same endpoint/key as Opus for this Azure Foundry deployment, different model name.)

### 2. State Change — `server/graph/state.js`

Replace `useFastModel: boolean | null` with:

```js
nodeModelOverrides: Annotation({
  reducer: (_, b) => b,
  default: () => null,  // null = use defaults; otherwise { [nodeKey]: 'haiku'|'sonnet'|'opus' }
}),
```

### 3. Override Resolution — `server/config/llm.js`

**Changes required:**

1. **Update `FAST_NODE_KEYS`** to include the new split nodeKeys:
```js
const FAST_NODE_KEYS = new Set([
  'researchAgent', 'researchAgent_phase1',
  'sqlAgent', 'sqlWriterAgent',
]);
```
This ensures that when `nodeModelOverrides` is `null` (no panel config), the new split nodeKeys still default to haiku — preserving existing behavior.

2. **No changes to `getModel()` or `resolveProfileName()`** — the existing logic already works:
   - `opts.profile` is checked first (overrides from DevPanel)
   - `FAST_NODE_KEYS` checked second (defaults for fast nodes)
   - Falls through to opus (default for everything else)

Each node passes the override via the existing `profile` parameter:
```js
getModel({ nodeKey: 'researchAgent_phase1', profile: state.nodeModelOverrides?.researchAgent_phase1, ... })
```

When `profile` is `undefined` (no override), `resolveProfileName` falls through to `FAST_NODE_KEYS` or opus defaults.

### 4. Split Research NodeKeys & Remove `useFastModel` Branching

Current `researchAgent.js` has two code paths controlled by `if (useFastModel)`:
- **Fast path** (lines 560-668): two-phase approach — Phase 1 (haiku tool-calling) then Phase 2 (opus synthesis)
- **Default path** (lines 670-746): single model for the entire agent

With `useFastModel` removed, **always use the two-phase approach** (it's the superior architecture regardless of model choice). The model for each phase is now controlled by the DevPanel:

| Call | New nodeKey | Default (no override) | Override pattern |
|------|-------------|----------------------|------------------|
| Phase 1 (tool-calling loop) | `researchAgent_phase1` | haiku (via FAST_NODE_KEYS) | `state.nodeModelOverrides?.researchAgent_phase1 ?? undefined` |
| Phase 2 (synthesis) | `researchAgent_phase2` | opus (default fallthrough) | `state.nodeModelOverrides?.researchAgent_phase2 ?? undefined` |

The single-model `else` branch (lines 670-746) is **removed**. The two-phase flow becomes the only code path, with each phase's model independently selectable.

### 5. Controllable Nodes (12 total)

Grouped by pipeline stage:

**Planning:**
- `classify` — intent + entity classification (default: opus)
- `decompose` — query breakdown into sub-queries (default: opus)

**Execution:**
- `researchAgent_phase1` — tool-calling discovery (default: haiku via FAST_NODE_KEYS)
- `researchAgent_phase2` — synthesis brief (default: opus)
- `sqlWriterAgent` — SQL generation (default: haiku via FAST_NODE_KEYS)
- `subQueryMatch` — template matching (default: opus)
- `correct` — SQL error correction (default: opus). Note: current code forces opus when `useFastModel=true` as a quality safeguard. With the new system, the DevPanel override is absolute — if the user picks haiku for `correct`, it uses haiku. This is intentional: the panel is a developer tool for experimentation, not a production config.

**Validation:**
- `semanticValidatorFast` — fast semantic pass (default: opus)
- `semanticValidatorOpus` — thorough semantic pass (default: opus)

**Output:**
- `presentInsights` — insight generation (default: opus)
- `presentChart` — chart recommendation (default: opus)
- `dashboardAgent` — dashboard layout planning (default: opus)

**Excluded:** `llmSchemaSelector` — called from tool functions (`discoverContext.js`, `searchSchema.js`) which don't have access to workflow state. It always uses default profile. Controllable in a future iteration if needed via request-scoped context.

### 6. Route Handler — `server/routes/textToSql.js`

Replace `useFastModel` extraction with `nodeModelOverrides`:

```js
const { nodeModelOverrides } = req.body;
// Validate before passing into state:
const validated = normalizeNodeModelOverrides(nodeModelOverrides);
// Pass into workflow state:
{ nodeModelOverrides: validated }
```

**Input validation** — add `normalizeNodeModelOverrides(value)` (similar to existing `normalizeEnabledTools`):
- Reject if not a plain object or null
- Filter keys to known node names: `classify`, `decompose`, `researchAgent_phase1`, `researchAgent_phase2`, `sqlWriterAgent`, `subQueryMatch`, `correct`, `semanticValidatorFast`, `semanticValidatorOpus`, `presentInsights`, `presentChart`, `dashboardAgent`
- Filter values to valid profiles: `Object.keys(MODEL_PROFILES)` — `'opus'`, `'sonnet'`, `'haiku'`
- Unknown keys/values are silently dropped

### 7. Parallel Sub-Query Pipeline — `server/graph/nodes/parallelSubQueryPipeline.js`

Replace `useFastModel` propagation with `nodeModelOverrides`:

```js
// In buildStateSlice() (line 37) and parallelSubQueryPipelineNode (line 326):
nodeModelOverrides: state.nodeModelOverrides,  // was: useFastModel: state.useFastModel
```

### 8. Semantic Validator State Threading — `server/validation/semanticValidator.js`

`validateSemantics()` currently has no access to workflow state. Its signature is:
```js
async function validateSemantics({ sql, question, detectedEntities, multiQueryContext })
```

Add an optional `nodeModelOverrides` parameter:
```js
async function validateSemantics({ sql, question, detectedEntities, multiQueryContext, nodeModelOverrides })
```

The caller (`server/validation/validator.js`) passes `state.nodeModelOverrides` through. Inside `validateSemantics`, the fast-pass call uses:
```js
profile: nodeModelOverrides?.semanticValidatorFast
```
And the thorough-pass uses:
```js
profile: nodeModelOverrides?.semanticValidatorOpus
```

### 9. Metrics — No Server Change Needed

The `done` SSE event **already** includes `usageByNodeAndModel` (via `buildFinalResponse` in `textToSql.js` line 429). No server-side change needed for metrics delivery. The client reads the existing `usageByNodeAndModel` field.

### 10. Cost Tracking

Current cost constants (`COST_PER_1M_INPUT_TOKENS` etc.) are for Opus only. Add per-profile rates:

```js
COST_RATES: Object.freeze({
  opus:   { input: 15,   cachedInput: 1.875, output: 75 },
  sonnet: { input: 3,    cachedInput: 0.375, output: 15 },
  haiku:  { input: 0.80, cachedInput: 0.10,  output: 4 },
}),
```

The DevPanel footer computes estimated cost from `usageByNodeAndModel` using the profile-specific rates.

## Client Architecture

### 1. DevPanel Component — `client/src/components/DevPanel.jsx`

A new component rendered at the **App level, outside the glass-pane**. It is `position: fixed` to the viewport at `z-index: 999`, with a trigger button at `z-index: 1000`.

**Internal structure:**
- Header: title, subtitle, color legend (green=Haiku, blue=Sonnet, purple=Opus)
- Presets bar: built-in presets (All Haiku, All Sonnet, All Opus, Balanced) + custom save/load
- Scrollable node list: 12 rows grouped into 4 categories (Planning, Execution, Validation, Output)
- Footer: last-query totals (time, tokens, estimated cost) + Reset Defaults button

**Each node row contains:**
- Node name + role label (e.g., "discovery", "synthesis")
- Last-run metrics: latency (seconds) + token count; dimmed "--" if node wasn't triggered
- 3-button segmented control: `[Haiku] [Sonnet] [Opus]` with color-coded active states

**Visual design:**
- Uses existing design tokens: `glass-bg-heavy`, `glass-blur`, `color-border`, `color-accent`, etc.
- Glass morphism panel matching the existing app aesthetic (see mockup)
- Subtle scrim overlay when panel is open (click to dismiss)
- Slide-in animation: `right 0.3s cubic-bezier(0.16, 1, 0.3, 1)`

### 2. State Management — `client/src/App.jsx`

Replace `useFastModel` state with `nodeModelOverrides`:

```js
const [nodeModelOverrides, setNodeModelOverrides] = useState(() => {
  const stored = localStorage.getItem('autoagents_nodeModelOverrides');
  return stored ? JSON.parse(stored) : {};
});
```

Presets stored separately:

```js
const [savedPresets, setSavedPresets] = useState(() => {
  const stored = localStorage.getItem('autoagents_devPresets');
  return stored ? JSON.parse(stored) : {};
});
```

Remove existing `useFastModel` state, `setUseFastModel`, and the "Fast Model (Haiku)" toggle from the sidebar.

### 3. Data Flow

```
DevPanel (user clicks) -> setNodeModelOverrides -> localStorage
       |
App.jsx -> passes nodeModelOverrides as prop to ChatPanel
       |
ChatPanel -> includes in API call options
       |
api.js -> sends nodeModelOverrides in POST body
       |
textToSql.js route -> normalizeNodeModelOverrides -> passes into workflow state
       |
Each node -> reads state.nodeModelOverrides?.[nodeKey] -> passes as profile to getModel()
       |
getModel() -> resolveProfileName -> uses override or falls through to FAST_NODE_KEYS/opus defaults
       |
SSE done event -> returns usageByNodeAndModel (already exists)
       |
ChatPanel -> passes metrics up to DevPanel -> renders per-node stats
```

### 4. Metrics Display

Latency is computed client-side from `node_complete` SSE event timestamps. Token counts come from the `done` event's existing `usageByNodeAndModel` field. The DevPanel receives a `lastRunMetrics` prop:

```js
{
  classify: { latencyMs: 1200, tokens: 1840, profile: 'opus' },
  researchAgent_phase1: { latencyMs: 3400, tokens: 4320, profile: 'haiku' },
  // ...nodes that weren't triggered are absent
}
```

Nodes not present in the metrics object show dimmed "--" values.

## Files Changed

### Server (13 files modified, 0 new):
- `server/config/constants.js` — add `sonnet` to `MODEL_PROFILES`, add `COST_RATES`
- `server/config/llm.js` — update `FAST_NODE_KEYS` to include split nodeKeys
- `server/graph/state.js` — replace `useFastModel` with `nodeModelOverrides`
- `server/routes/textToSql.js` — replace `useFastModel` with `nodeModelOverrides`, add `normalizeNodeModelOverrides` validation
- `server/graph/nodes/researchAgent.js` — split nodeKeys to `_phase1`/`_phase2`, remove `useFastModel` branching (always two-phase), read from `state.nodeModelOverrides`
- `server/graph/nodes/classify.js` — add `profile: state.nodeModelOverrides?.classify`
- `server/graph/nodes/decompose.js` — add `profile: state.nodeModelOverrides?.decompose`
- `server/graph/nodes/sqlWriterAgent.js` — replace hardcoded `profile: 'haiku'` with `state.nodeModelOverrides?.sqlWriterAgent ?? undefined` (falls through to FAST_NODE_KEYS default)
- `server/graph/nodes/correct.js` — replace `useFastModel` conditional with `state.nodeModelOverrides?.correct`
- `server/graph/nodes/present.js` — add overrides for `presentInsights` and `presentChart`
- `server/graph/nodes/subQueryMatch.js` — add `profile: state.nodeModelOverrides?.subQueryMatch`
- `server/graph/nodes/dashboardAgent.js` — add `profile: state.nodeModelOverrides?.dashboardAgent`
- `server/graph/nodes/parallelSubQueryPipeline.js` — propagate `nodeModelOverrides` instead of `useFastModel`
- `server/validation/semanticValidator.js` — add `nodeModelOverrides` parameter, read overrides for fast/thorough passes
- `server/validation/validator.js` — pass `state.nodeModelOverrides` to `validateSemantics`

### Server (2 config files):
- `server/.env` — add `AZURE_ANTHROPIC_SONNET_*` vars
- `server/.env.example` — add `AZURE_ANTHROPIC_SONNET_*` and missing `AZURE_ANTHROPIC_HAIKU_*` vars

### Client (4 files modified, 1 new):
- `client/src/components/DevPanel.jsx` — **new** component
- `client/src/App.jsx` — replace `useFastModel` with `nodeModelOverrides`, render DevPanel outside glass-pane, remove sidebar fast-model toggle
- `client/src/components/ChatPanel.jsx` — replace `useFastModel` prop with `nodeModelOverrides`, pass metrics up
- `client/src/utils/api.js` — replace `useFastModel` field with `nodeModelOverrides` in payloads

## Backward Compatibility

- The `useFastModel` boolean is **removed entirely**. The DevPanel's preset buttons ("All Haiku" = equivalent to old `useFastModel: true`) replicate the old behavior.
- `nodeModelOverrides` defaults to `null`/`{}`, which preserves existing per-node defaults: haiku for research phase 1 / sqlWriter (via updated `FAST_NODE_KEYS`), opus for everything else.
- The `researchAgent` single-model code path is removed — the two-phase approach is always used, which was already the default (`useFastModel` defaulted to `true` in client).
- No API contract changes for external consumers since `useFastModel` was only used by the bundled client.

## Mockup

Interactive HTML mockup: `ui-mockup-devpanel.html` (project root). Uses exact design tokens from `client/src/index.css`. Viewport-level positioning (fixed, overlays everything).
