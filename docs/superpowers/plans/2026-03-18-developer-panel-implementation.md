# Developer Panel — Per-Node LLM Model Selection — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a slide-in Developer Panel with per-node Opus/Sonnet/Haiku model selection, replacing the binary `useFastModel` toggle.

**Architecture:** Extend existing prop-threading pattern (App → ChatPanel → API → WorkflowState → nodes). Add `sonnet` as third model profile. Replace `useFastModel` boolean with `nodeModelOverrides` map. New `DevPanel.jsx` component at viewport level.

**Tech Stack:** React 19, Tailwind CSS v4, Express.js, LangGraph, CommonJS (server), ESM (client)

**Spec:** `docs/superpowers/specs/2026-03-18-developer-panel-model-selection-design.md`
**Mockup:** `ui-mockup-devpanel.html` (project root)

---

## File Structure

### New files:
- `client/src/components/DevPanel.jsx` — slide-in developer panel component

### Modified files (server):
- `server/config/constants.js` — add `sonnet` profile + `COST_RATES`
- `server/config/llm.js` — update `FAST_NODE_KEYS`
- `server/graph/state.js` — replace `useFastModel` with `nodeModelOverrides`
- `server/routes/textToSql.js` — replace `useFastModel` with `nodeModelOverrides` + validation
- `server/graph/nodes/researchAgent.js` — split nodeKeys, remove `useFastModel` branching
- `server/graph/nodes/classify.js` — add profile override
- `server/graph/nodes/decompose.js` — add profile override
- `server/graph/nodes/sqlWriterAgent.js` — replace hardcoded `profile: 'haiku'`
- `server/graph/nodes/correct.js` — replace `useFastModel` conditional
- `server/graph/nodes/present.js` — add profile overrides
- `server/graph/nodes/subQueryMatch.js` — add profile override
- `server/graph/nodes/dashboardAgent.js` — add profile override
- `server/graph/nodes/parallelSubQueryPipeline.js` — propagate `nodeModelOverrides`
- `server/graph/nodes/validate.js` — pass `nodeModelOverrides` to validator
- `server/validation/validator.js` — thread `nodeModelOverrides` to semantic validator
- `server/validation/semanticValidator.js` — accept `nodeModelOverrides`, pass to `runSemanticPass`
- `server/.env` — add Sonnet env vars
- `server/.env.example` — add Sonnet + missing Haiku env vars

### Modified files (client):
- `client/src/App.jsx` — replace `useFastModel` state, render DevPanel, remove sidebar toggle
- `client/src/components/ChatPanel.jsx` — replace `useFastModel` prop, expose metrics
- `client/src/utils/api.js` — replace `useFastModel` in payloads

---

## Task 1: Server Config — Sonnet Profile, FAST_NODE_KEYS, Cost Rates

**Files:**
- Modify: `server/config/constants.js:5-20` (MODEL_PROFILES), `:73-76` (cost constants)
- Modify: `server/config/llm.js:84` (FAST_NODE_KEYS)
- Modify: `server/.env`
- Modify: `server/.env.example`

- [ ] **Step 1: Add `sonnet` profile to MODEL_PROFILES**

In `server/config/constants.js`, add between `opus` and `haiku` (after line 12):

```js
sonnet: Object.freeze({
  provider: 'anthropic',
  modelNameEnv: 'AZURE_ANTHROPIC_SONNET_MODEL_NAME',
  defaultModelName: 'claude-sonnet-4-6',
  endpointEnv: 'AZURE_ANTHROPIC_SONNET_ENDPOINT',
  apiKeyEnv: 'AZURE_ANTHROPIC_SONNET_API_KEY',
}),
```

- [ ] **Step 2: Add per-profile COST_RATES**

In `server/config/constants.js`, replace the single cost constants (lines 73-76) with:

```js
// --- Cost Tracking (estimated USD per 1M tokens — per profile) ---
COST_RATES: Object.freeze({
  opus:   Object.freeze({ input: 15,   cachedInput: 1.875, output: 75 }),
  sonnet: Object.freeze({ input: 3,    cachedInput: 0.375, output: 15 }),
  haiku:  Object.freeze({ input: 0.80, cachedInput: 0.10,  output: 4 }),
}),

// Keep legacy flat rates for backward compat with any existing references
COST_PER_1M_INPUT_TOKENS: 15,
COST_PER_1M_CACHED_INPUT_TOKENS: 1.875,
COST_PER_1M_OUTPUT_TOKENS: 75,
```

Export `COST_RATES` in the module.exports (it's already auto-exported since it's in the object).

- [ ] **Step 3: Update FAST_NODE_KEYS in llm.js**

In `server/config/llm.js` line 84, replace:

```js
const FAST_NODE_KEYS = new Set(['researchAgent', 'sqlAgent']);
```

with:

```js
const FAST_NODE_KEYS = new Set([
  'researchAgent', 'researchAgent_phase1',
  'sqlAgent', 'sqlWriterAgent',
]);
```

- [ ] **Step 4: Add Sonnet env vars to .env**

Append to `server/.env` after the Haiku section:

```
# ==================================================================
# Claude Sonnet (balanced model) via Azure AI Foundry
# ==================================================================
AZURE_ANTHROPIC_SONNET_API_KEY=<same-key-as-opus>
AZURE_ANTHROPIC_SONNET_ENDPOINT=<same-endpoint-as-opus>
AZURE_ANTHROPIC_SONNET_MODEL_NAME=claude-sonnet-4-6
```

- [ ] **Step 5: Update .env.example with all three profiles**

Add Haiku and Sonnet sections to `server/.env.example` after the Opus section:

```
# ==================================================================
# Claude Haiku (fast model) via Azure AI Foundry
# ==================================================================
AZURE_ANTHROPIC_HAIKU_API_KEY=YOUR_HAIKU_KEY
AZURE_ANTHROPIC_HAIKU_ENDPOINT=https://<your-foundry-resource>.services.ai.azure.com/anthropic/
AZURE_ANTHROPIC_HAIKU_MODEL_NAME=claude-haiku-4-5

# ==================================================================
# Claude Sonnet (balanced model) via Azure AI Foundry
# ==================================================================
AZURE_ANTHROPIC_SONNET_API_KEY=YOUR_SONNET_KEY
AZURE_ANTHROPIC_SONNET_ENDPOINT=https://<your-foundry-resource>.services.ai.azure.com/anthropic/
AZURE_ANTHROPIC_SONNET_MODEL_NAME=claude-sonnet-4-6
```

- [ ] **Step 6: Verify server starts**

Run: `cd server && node -e "const c = require('./config/constants'); console.log(Object.keys(c.MODEL_PROFILES)); console.log(c.COST_RATES)"`

Expected: `['opus', 'sonnet', 'haiku']` and the cost rates object.

- [ ] **Step 7: Commit**

```bash
git add server/config/constants.js server/config/llm.js server/.env.example
git commit -m "feat(config): add Sonnet model profile, per-profile cost rates, update FAST_NODE_KEYS"
```

Note: Do NOT git add `server/.env` — it contains secrets.

---

## Task 2: State — Replace `useFastModel` with `nodeModelOverrides`

**Files:**
- Modify: `server/graph/state.js:92-93`

- [ ] **Step 1: Replace useFastModel annotation**

In `server/graph/state.js`, replace line 92-93:

```js
  // --- Model toggle (testing): true = use fast model (Haiku) for tool-calling nodes, false = use Opus, null = nodeKey-based default
  useFastModel: Annotation({ reducer: (_, b) => b, default: () => null }),
```

with:

```js
  // --- Per-node model override: { [nodeKey]: 'haiku'|'sonnet'|'opus' } or null for defaults
  nodeModelOverrides: Annotation({ reducer: (_, b) => b, default: () => null }),
```

- [ ] **Step 2: Commit**

```bash
git add server/graph/state.js
git commit -m "feat(state): replace useFastModel with nodeModelOverrides map"
```

---

## Task 3: Route Handler — Replace `useFastModel`, Add Validation

**Files:**
- Modify: `server/routes/textToSql.js:461,491,528,565`

- [ ] **Step 1: Add normalizeNodeModelOverrides helper**

At the top of `server/routes/textToSql.js`, near the existing `normalizeEnabledTools` function, add:

```js
const VALID_NODE_KEYS = new Set([
  'classify', 'decompose', 'researchAgent_phase1', 'researchAgent_phase2',
  'sqlWriterAgent', 'subQueryMatch', 'correct',
  'semanticValidatorFast', 'semanticValidatorOpus',
  'presentInsights', 'presentChart', 'dashboardAgent',
]);
const VALID_PROFILES = new Set(Object.keys(require('../config/constants').MODEL_PROFILES));

function normalizeNodeModelOverrides(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const result = {};
  for (const [key, profile] of Object.entries(value)) {
    if (VALID_NODE_KEYS.has(key) && VALID_PROFILES.has(profile)) {
      result[key] = profile;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}
```

- [ ] **Step 2: Update non-stream endpoint (POST /analyze)**

In `server/routes/textToSql.js`, in the `/analyze` destructuring (line 461), replace `useFastModel,` with `nodeModelOverrides,`.

In the workflow invoke call (line 491), replace `useFastModel: useFastModel ?? null,` with:

```js
nodeModelOverrides: normalizeNodeModelOverrides(nodeModelOverrides),
```

- [ ] **Step 3: Update stream endpoint (POST /analyze-stream)**

In the `/analyze-stream` destructuring (line 528), replace `useFastModel,` with `nodeModelOverrides,`.

In the inputs object (line 565), replace `useFastModel: useFastModel ?? null,` with:

```js
nodeModelOverrides: normalizeNodeModelOverrides(nodeModelOverrides),
```

- [ ] **Step 4: Commit**

```bash
git add server/routes/textToSql.js
git commit -m "feat(routes): replace useFastModel with nodeModelOverrides + input validation"
```

---

## Task 4: Simple Node Overrides — classify, decompose, subQueryMatch, dashboardAgent, present

These nodes just need `profile: state.nodeModelOverrides?.X` added to their existing `getModel` calls.

**Files:**
- Modify: `server/graph/nodes/classify.js:250-255,455-460`
- Modify: `server/graph/nodes/decompose.js:140-145`
- Modify: `server/graph/nodes/subQueryMatch.js:93-98`
- Modify: `server/graph/nodes/dashboardAgent.js:108-112`
- Modify: `server/graph/nodes/present.js:258-262,284-288`

- [ ] **Step 1: classify.js — add profile override to both getModel calls**

At line ~250, add `profile: state.nodeModelOverrides?.classify,` to the entityModel getModel call:

```js
const entityModel = getModel({
  temperature: 0,
  maxTokens: 300,
  cache: true,
  nodeKey: 'classify',
  profile: state.nodeModelOverrides?.classify,
}).withStructuredOutput(DetectedEntities);
```

At line ~455, add the same to the main classification call:

```js
const baseModel = getModel({
  temperature: CLASSIFY_TEMPERATURE,
  maxTokens: CLASSIFY_MAX_TOKENS,
  cache: true,
  nodeKey: 'classify',
  profile: state.nodeModelOverrides?.classify,
});
```

- [ ] **Step 2: decompose.js — add profile override**

At line ~140:

```js
const baseModel = getModel({
  temperature: DECOMPOSE_TEMPERATURE,
  maxTokens: DECOMPOSE_MAX_TOKENS,
  cache: true,
  nodeKey: 'decompose',
  profile: state.nodeModelOverrides?.decompose,
});
```

- [ ] **Step 3: subQueryMatch.js — add profile override**

At line ~93:

```js
const model = getModel({
  temperature: SUB_QUERY_LLM_MATCH_TEMPERATURE,
  maxTokens: SUB_QUERY_LLM_MATCH_MAX_TOKENS,
  cache: true,
  nodeKey: 'subQueryMatch',
  profile: state.nodeModelOverrides?.subQueryMatch,
}).withStructuredOutput(SubQueryMatchSchema);
```

- [ ] **Step 4: dashboardAgent.js — add profile override**

At line ~108:

```js
const baseModel = getModel({
  temperature: DASHBOARD_TEMPERATURE,
  maxTokens: DASHBOARD_MAX_TOKENS,
  nodeKey: 'dashboardAgent',
  profile: state.nodeModelOverrides?.dashboardAgent,
});
```

- [ ] **Step 5: present.js — add profile overrides to both calls**

At line ~258 (presentInsights):

```js
const model = getModel({
  maxTokens: isMultiQuery ? INSIGHT_MAX_TOKENS * 2 : INSIGHT_MAX_TOKENS,
  temperature: INSIGHT_TEMPERATURE,
  nodeKey: 'presentInsights',
  profile: state.nodeModelOverrides?.presentInsights,
});
```

At line ~284 (presentChart):

```js
const baseModel = getModel({
  maxTokens: CHART_MAX_TOKENS,
  temperature: CHART_TEMPERATURE,
  nodeKey: 'presentChart',
  profile: state.nodeModelOverrides?.presentChart,
});
```

- [ ] **Step 6: Commit**

```bash
git add server/graph/nodes/classify.js server/graph/nodes/decompose.js server/graph/nodes/subQueryMatch.js server/graph/nodes/dashboardAgent.js server/graph/nodes/present.js
git commit -m "feat(nodes): add nodeModelOverrides profile to classify, decompose, subQueryMatch, dashboardAgent, present"
```

---

## Task 5: Complex Node Overrides — sqlWriterAgent, correct

These nodes have hardcoded profiles or `useFastModel` conditionals that need replacing.

**Files:**
- Modify: `server/graph/nodes/sqlWriterAgent.js:482-487`
- Modify: `server/graph/nodes/correct.js:434-439`

- [ ] **Step 1: sqlWriterAgent.js — replace hardcoded `profile: 'haiku'`**

At line ~482, replace:

```js
const model = getModel({
  temperature: 0,
  maxTokens: 4096,
  nodeKey: 'sqlWriterAgent',
  profile: 'haiku',
});
```

with:

```js
const model = getModel({
  temperature: 0,
  maxTokens: 4096,
  nodeKey: 'sqlWriterAgent',
  profile: state.nodeModelOverrides?.sqlWriterAgent,
});
```

(When override is `undefined`, `FAST_NODE_KEYS` now includes `'sqlWriterAgent'` so it defaults to haiku.)

- [ ] **Step 2: correct.js — replace useFastModel conditional**

At line ~434, replace:

```js
const model = getModel({
  maxTokens: CORRECT_MAX_TOKENS,
  temperature: CORRECT_TEMPERATURE,
  nodeKey: 'correct',
  profile: state.useFastModel === true ? 'opus' : undefined,
});
```

with:

```js
const model = getModel({
  maxTokens: CORRECT_MAX_TOKENS,
  temperature: CORRECT_TEMPERATURE,
  nodeKey: 'correct',
  profile: state.nodeModelOverrides?.correct,
});
```

- [ ] **Step 3: Commit**

```bash
git add server/graph/nodes/sqlWriterAgent.js server/graph/nodes/correct.js
git commit -m "feat(nodes): replace hardcoded profiles and useFastModel conditional in sqlWriterAgent, correct"
```

---

## Task 6: Research Agent — Split NodeKeys, Remove useFastModel Branching

This is the most complex change. The `researchAgent.js` has two code paths gated by `useFastModel`. We remove the gate and always use the two-phase path, with split nodeKeys.

**Files:**
- Modify: `server/graph/nodes/researchAgent.js:547,560-567,639-644,670-746`

- [ ] **Step 1: Remove useFastModel flag read**

At line 547, remove:

```js
const useFastModel = state.useFastModel === true;
```

- [ ] **Step 2: Update Phase 1 getModel call**

At line ~562-567, change from:

```js
const phase1Model = getModel({
  temperature: 0,
  maxTokens: 4096,
  nodeKey: 'researchAgent',
  profile: 'haiku',
});
```

to:

```js
const phase1Model = getModel({
  temperature: 0,
  maxTokens: 4096,
  nodeKey: 'researchAgent_phase1',
  profile: state.nodeModelOverrides?.researchAgent_phase1,
});
```

- [ ] **Step 3: Update Phase 2 getModel call**

At line ~639-644, change from:

```js
const opusModel = getModel({
  temperature: 0,
  maxTokens: 4096,
  nodeKey: 'researchAgent',
  profile: 'opus',
});
```

to:

```js
const opusModel = getModel({
  temperature: 0,
  maxTokens: 4096,
  nodeKey: 'researchAgent_phase2',
  profile: state.nodeModelOverrides?.researchAgent_phase2,
});
```

- [ ] **Step 4: Remove the else branch (single-model path)**

Remove the `if (useFastModel) {` guard (line ~560) and its closing `}`.

Remove the entire `else { ... }` block (lines ~670-746) — the single-model flow that was used when `useFastModel` was false/null.

The two-phase flow becomes the only code path. Make sure the code that was inside `if (useFastModel) { ... }` is now at the same indentation level as surrounding code (un-indent by one level).

- [ ] **Step 5: Verify no remaining useFastModel references**

Run: `grep -n "useFastModel" server/graph/nodes/researchAgent.js`

Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add server/graph/nodes/researchAgent.js
git commit -m "feat(researchAgent): split nodeKeys to phase1/phase2, always use two-phase flow, remove useFastModel"
```

---

## Task 7: Validation Threading — semanticValidator + validator.js + validate node

Thread `nodeModelOverrides` through the validation call chain: validate node → validator.js → semanticValidator.js.

**Files:**
- Modify: `server/graph/nodes/validate.js:97-106`
- Modify: `server/validation/validator.js:31-38,112-117`
- Modify: `server/validation/semanticValidator.js:77-83,102-107`

- [ ] **Step 1: semanticValidator.js — accept nodeModelOverrides in runSemanticPass**

At line ~77, add `profile` parameter:

```js
async function runSemanticPass({ userPrompt, nodeKey, profile }) {
  const baseModel = getModel({
    temperature: SEMANTIC_VALIDATOR_TEMPERATURE,
    maxTokens: SEMANTIC_VALIDATOR_MAX_TOKENS,
    cache: true,
    nodeKey,
    profile,
  });
```

- [ ] **Step 2: semanticValidator.js — accept nodeModelOverrides in validateSemantics**

At line ~102, add the parameter:

```js
async function validateSemantics({
  sql,
  question,
  detectedEntities,
  multiQueryContext,
  nodeModelOverrides,
}) {
```

Then find the two calls to `runSemanticPass` inside `validateSemantics` (around lines 134 and 149) and add the profile parameter:

For the fast pass (nodeKey `'semanticValidatorFast'`):
```js
const fastPass = await runSemanticPass({
  userPrompt,
  nodeKey: 'semanticValidatorFast',
  profile: nodeModelOverrides?.semanticValidatorFast,
});
```

For the thorough pass (nodeKey `'semanticValidatorOpus'`):
```js
const opusPass = await runSemanticPass({
  userPrompt,
  nodeKey: 'semanticValidatorOpus',
  profile: nodeModelOverrides?.semanticValidatorOpus,
});
```

- [ ] **Step 3: validator.js — thread nodeModelOverrides**

At line ~31, add `nodeModelOverrides` to the function signature:

```js
async function validate({
  sql,
  rlsContext,
  question,
  detectedEntities,
  skipSyntax,
  multiQueryContext,
  onProgress,
  nodeModelOverrides,
}) {
```

At line ~112, pass it to `validateSemantics`:

```js
const semanticResult = await validateSemantics({
  sql,
  question,
  detectedEntities,
  multiQueryContext,
  nodeModelOverrides,
});
```

- [ ] **Step 4: validate.js (node) — pass nodeModelOverrides to validate()**

At line ~97, add `nodeModelOverrides` to the validate call:

```js
const report = await validate({
  sql: state.sql,
  rlsContext,
  question: activeQuestion,
  detectedEntities: isMultiQuery ? null : state.entities,
  skipSyntax: true,
  multiQueryContext: isMultiQuery
    ? `This SQL addresses sub-question ${qIdx + 1} of ${plan.length}: "${activeQuestion}" (purpose: ${plan[qIdx]?.purpose || 'N/A'}). It does NOT need to answer the full original question — only this specific sub-question.`
    : null,
  nodeModelOverrides: state.nodeModelOverrides,
});
```

- [ ] **Step 5: Commit**

```bash
git add server/validation/semanticValidator.js server/validation/validator.js server/graph/nodes/validate.js
git commit -m "feat(validation): thread nodeModelOverrides through semantic validation chain"
```

---

## Task 8: Parallel Pipeline Propagation

**Files:**
- Modify: `server/graph/nodes/parallelSubQueryPipeline.js:37,326`

- [ ] **Step 1: Replace useFastModel propagation at line 37**

Change `useFastModel: baseState.useFastModel,` to `nodeModelOverrides: baseState.nodeModelOverrides,`

- [ ] **Step 2: Replace useFastModel propagation at line 326**

Change `useFastModel: state.useFastModel,` to `nodeModelOverrides: state.nodeModelOverrides,`

- [ ] **Step 3: Update runQ1.js test script**

In `server/scripts/runQ1.js` line 36, replace `useFastModel: null,` with `nodeModelOverrides: null,`.

- [ ] **Step 4: Verify no remaining useFastModel references**

Run: `grep -rn "useFastModel" server/ --include="*.js" | grep -v node_modules`

Expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add server/graph/nodes/parallelSubQueryPipeline.js server/scripts/runQ1.js
git commit -m "feat(parallelPipeline): propagate nodeModelOverrides instead of useFastModel"
```

---

## Task 9: Client API Layer — Replace `useFastModel`

**Files:**
- Modify: `client/src/utils/api.js:39,43,59,67`

- [ ] **Step 1: Update analyzeStream function**

In `client/src/utils/api.js`, in the stream function (line ~39), replace `useFastModel` in the destructuring and payload:

Change `useFastModel` to `nodeModelOverrides` in the options destructuring.

Replace `if (useFastModel !== undefined) payload.useFastModel = useFastModel;` with:

```js
if (nodeModelOverrides && Object.keys(nodeModelOverrides).length > 0) payload.nodeModelOverrides = nodeModelOverrides;
```

- [ ] **Step 2: Update analyze function (non-stream)**

Same pattern for the non-stream function (line ~59): replace `useFastModel` with `nodeModelOverrides` in destructuring and payload.

- [ ] **Step 3: Commit**

```bash
git add client/src/utils/api.js
git commit -m "feat(api): replace useFastModel with nodeModelOverrides in API payloads"
```

---

## Task 10: Client App.jsx — State Management + Sidebar Cleanup

**Files:**
- Modify: `client/src/App.jsx:54-69,235-250,256`

- [ ] **Step 1: Replace useFastModel state with nodeModelOverrides**

At line ~66-69, replace:

```js
const [useFastModel, setUseFastModel] = useState(() => {
  const stored = localStorage.getItem('autoagents_useFastModel');
  return stored !== 'false';
});
```

with:

```js
const [nodeModelOverrides, setNodeModelOverrides] = useState(() => {
  try {
    const stored = localStorage.getItem('autoagents_nodeModelOverrides');
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
});
const [savedPresets, setSavedPresets] = useState(() => {
  try {
    const stored = localStorage.getItem('autoagents_devPresets');
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
});
const [lastRunMetrics, setLastRunMetrics] = useState(null);
```

- [ ] **Step 2: Remove the "Fast Model (Haiku)" toggle from sidebar**

Remove the entire block at lines ~235-250 (the `<div className="flex items-center justify-between">` containing the Fast Model toggle).

- [ ] **Step 3: Update ChatPanel props**

At line ~256, replace `useFastModel={useFastModel}` with `nodeModelOverrides={nodeModelOverrides}` and add `onMetricsUpdate={setLastRunMetrics}`:

```jsx
<ChatPanel
  onMenuClick={() => setSidebarOpen((v) => !v)}
  impersonateContext={impersonateContext}
  validationEnabled={validationEnabled}
  sessionId={sessionId}
  onNewChat={handleNewChat}
  enabledTools={toolToggles.enabledTools}
  nodeModelOverrides={nodeModelOverrides}
  userName={userName}
  onMetricsUpdate={setLastRunMetrics}
/>
```

- [ ] **Step 4: Add DevPanel import and render outside glass-pane**

Add import at top:

```js
import DevPanel from './components/DevPanel';
```

Render after the closing `</div>` of `glass-shell` (after the glass-pane), before the final closing `</div>`:

```jsx
<DevPanel
  nodeModelOverrides={nodeModelOverrides}
  setNodeModelOverrides={(v) => {
    setNodeModelOverrides(v);
    localStorage.setItem('autoagents_nodeModelOverrides', JSON.stringify(v));
  }}
  savedPresets={savedPresets}
  setSavedPresets={(v) => {
    setSavedPresets(v);
    localStorage.setItem('autoagents_devPresets', JSON.stringify(v));
  }}
  lastRunMetrics={lastRunMetrics}
/>
```

- [ ] **Step 5: Commit**

```bash
git add client/src/App.jsx
git commit -m "feat(App): replace useFastModel with nodeModelOverrides, add DevPanel mount point"
```

---

## Task 11: DevPanel Component

**Files:**
- Create: `client/src/components/DevPanel.jsx`

- [ ] **Step 1: Create DevPanel.jsx**

Create `client/src/components/DevPanel.jsx`. Use `ui-mockup-devpanel.html` as the visual reference. The component receives these props:

```js
{ nodeModelOverrides, setNodeModelOverrides, savedPresets, setSavedPresets, lastRunMetrics }
```

Key implementation details:
- `position: fixed` panel at `z-index: 999`, trigger button at `z-index: 1000`
- Use existing CSS variables from `index.css` (e.g., `var(--glass-bg-heavy)`, `var(--color-accent)`)
- Scrim overlay at `z-index: 998`, click to dismiss
- 12 node rows grouped into Planning, Execution, Validation, Output
- Segmented controls: green for haiku (`--color-success`), indigo for sonnet (`--color-accent`), purple for opus (`#8B5CF6`)
- Built-in presets: All Haiku, All Sonnet, All Opus, Balanced, Reset Defaults
- Custom preset save/load/delete via `savedPresets` prop
- Footer shows last-query summary from `lastRunMetrics` (total latency, total tokens, estimated cost using `COST_RATES`)

Node config constant (define inside the component file):

```js
const NODE_CONFIG = [
  { group: 'Planning', nodes: [
    { key: 'classify', label: 'Classify' },
    { key: 'decompose', label: 'Decompose' },
  ]},
  { group: 'Execution', nodes: [
    { key: 'researchAgent_phase1', label: 'Research Phase 1', role: 'discovery' },
    { key: 'researchAgent_phase2', label: 'Research Phase 2', role: 'synthesis' },
    { key: 'sqlWriterAgent', label: 'SQL Writer', role: 'generation' },
    { key: 'subQueryMatch', label: 'Sub-Query Match' },
    { key: 'correct', label: 'Correct', role: 'error fixing' },
  ]},
  { group: 'Validation', nodes: [
    { key: 'semanticValidatorFast', label: 'Semantic Validator (fast)' },
    { key: 'semanticValidatorOpus', label: 'Semantic Validator (thorough)' },
  ]},
  { group: 'Output', nodes: [
    { key: 'presentInsights', label: 'Present Insights' },
    { key: 'presentChart', label: 'Present Chart' },
    { key: 'dashboardAgent', label: 'Dashboard Agent' },
  ]},
];
```

Built-in presets:

```js
const BUILTIN_PRESETS = {
  'All Haiku': Object.fromEntries(NODE_CONFIG.flatMap(g => g.nodes.map(n => [n.key, 'haiku']))),
  'All Sonnet': Object.fromEntries(NODE_CONFIG.flatMap(g => g.nodes.map(n => [n.key, 'sonnet']))),
  'All Opus': Object.fromEntries(NODE_CONFIG.flatMap(g => g.nodes.map(n => [n.key, 'opus']))),
  'Balanced': {
    classify: 'opus', decompose: 'opus',
    researchAgent_phase1: 'haiku', researchAgent_phase2: 'sonnet',
    sqlWriterAgent: 'sonnet', subQueryMatch: 'opus', correct: 'opus',
    semanticValidatorFast: 'sonnet', semanticValidatorOpus: 'sonnet',
    presentInsights: 'sonnet', presentChart: 'sonnet', dashboardAgent: 'sonnet',
  },
};
```

- [ ] **Step 2: Verify it renders**

Run: `cd client && npm run dev`

Open `http://localhost:5174`. The gear icon should be visible on the right edge. Clicking it should slide the panel open.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/DevPanel.jsx
git commit -m "feat(DevPanel): add developer panel component with per-node model selection"
```

---

## Task 12: ChatPanel Integration — Wire Metrics + nodeModelOverrides

**Files:**
- Modify: `client/src/components/ChatPanel.jsx:75,409,423,477,507`

- [ ] **Step 1: Update props**

At line ~75, replace `useFastModel = false` with `nodeModelOverrides = {}, onMetricsUpdate` in the destructuring:

```js
export default function ChatPanel({ onMenuClick, impersonateContext = null, validationEnabled = true, sessionId, onNewChat, enabledTools: enabledToolsProp = null, nodeModelOverrides = {}, userName = '', onMetricsUpdate }) {
```

- [ ] **Step 2: Update API call options**

At line ~409, in the opts object, replace `useFastModel` with `nodeModelOverrides`:

```js
const opts = {
  impersonateContext: impersonateContext ? { type: impersonateContext.type, id: impersonateContext.id } : null,
  validationEnabled,
  sessionId,
  isFollowUp,
  nodeModelOverrides,
  enabledTools: enabledToolsProp ?? null,
};
```

- [ ] **Step 3: Update useEffect dependencies**

At line ~423 and ~507, replace `useFastModel` with `nodeModelOverrides` in dependency arrays.

- [ ] **Step 4: Extract metrics from SSE done event**

Find where the `done` event is handled in the SSE stream callback (search for `type === 'done'` or `event === 'done'`). When the done event fires, extract `usageByNodeAndModel` and call `onMetricsUpdate`:

```js
if (onMetricsUpdate && parsed.usageByNodeAndModel) {
  onMetricsUpdate(parsed.usageByNodeAndModel);
}
```

Also at line ~477, replace `useFastModel,` with `nodeModelOverrides,` in the dashboard data request options.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/ChatPanel.jsx
git commit -m "feat(ChatPanel): wire nodeModelOverrides + metrics to DevPanel"
```

---

## Task 13: Final Verification

- [ ] **Step 1: Check no remaining useFastModel references in server**

Run: `grep -rn "useFastModel" server/ --include="*.js" | grep -v node_modules | grep -v scripts/`

Expected: no matches (except possibly `scripts/runQ1.js` which is a standalone test script).

- [ ] **Step 2: Check no remaining useFastModel references in client**

Run: `grep -rn "useFastModel" client/src/ --include="*.js" --include="*.jsx"`

Expected: no matches.

- [ ] **Step 3: Start server and client**

```bash
cd server && npm run dev &
cd client && npm run dev
```

- [ ] **Step 4: Manual smoke test**

1. Open `http://localhost:5174`
2. Verify the gear icon is visible on the right edge
3. Click it — panel slides open
4. Verify all 12 nodes are listed with segmented controls
5. Click "All Sonnet" preset — all controls switch to blue/Sonnet
6. Click "Save" — enter a name — preset appears in the bar
7. Close panel, submit a query
8. Open panel — verify last-run metrics appear (latency + tokens per node)
9. Change a node to Haiku, run another query — verify that node's metrics reflect the change

- [ ] **Step 5: Commit any fixes from smoke test**

```bash
git add -A
git commit -m "fix: address issues found during DevPanel smoke test"
```
