# Model Comparison Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace DevPanel's per-node model selection with a simple global toggle to compare Opus 4.6 vs GPT 5.4 end-to-end performance.

**Architecture:** Add GPT profile to backend model system, route to Azure OpenAI SDK when provider is 'openai', expand globalModel param to all nodes in route handler, simplify DevPanel UI to toggle + time display.

**Tech Stack:** Node.js, Express, LangChain (ChatAnthropic + ChatOpenAI), React, Vite

---

## File Structure

**Backend:**
- Modify: `server/config/constants.js` — Add GPT profile and cost rates
- Modify: `server/config/llm.js` — Add OpenAI SDK routing logic
- Modify: `server/routes/textToSql.js` — Add globalModel expansion
- Create: `server/tests/modelRouting.test.js` — Tests for model profile routing

**Frontend:**
- Modify: `client/src/components/DevPanel.jsx` — Complete rewrite to toggle UI
- Modify: `client/src/App.jsx` — Replace nodeModelOverrides state with globalModel
- Modify: `client/src/utils/api.js` — Add globalModel parameter

**Config:**
- Modify: `server/.env` — Add GPT credentials
- Modify: `server/.env.example` — Add GPT credential placeholders

---

## Task 1: Add GPT Profile to Constants

**Files:**
- Modify: `server/config/constants.js:5-27` (MODEL_PROFILES)
- Modify: `server/config/constants.js:85-90` (COST_RATES)
- Create: `server/tests/modelRouting.test.js`

- [ ] **Step 1: Write failing test for GPT profile existence**

Create `server/tests/modelRouting.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const { MODEL_PROFILES, COST_RATES } = require('../config/constants');

test('GPT profile exists in MODEL_PROFILES', () => {
  assert.ok(MODEL_PROFILES.gpt, 'GPT profile should exist');
  assert.equal(MODEL_PROFILES.gpt.provider, 'openai');
  assert.equal(MODEL_PROFILES.gpt.modelNameEnv, 'AZURE_OPENAI_MODEL_NAME');
  assert.equal(MODEL_PROFILES.gpt.defaultModelName, 'gpt-5.4');
  assert.equal(MODEL_PROFILES.gpt.endpointEnv, 'AZURE_OPENAI_ENDPOINT');
  assert.equal(MODEL_PROFILES.gpt.apiKeyEnv, 'AZURE_OPENAI_API_KEY');
});

test('GPT cost rates exist in COST_RATES', () => {
  assert.ok(COST_RATES.gpt, 'GPT cost rates should exist');
  assert.equal(typeof COST_RATES.gpt.input, 'number');
  assert.equal(typeof COST_RATES.gpt.cachedInput, 'number');
  assert.equal(typeof COST_RATES.gpt.output, 'number');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && node --test tests/modelRouting.test.js`  
Expected: FAIL with "Cannot read properties of undefined"

- [ ] **Step 3: Add GPT profile to MODEL_PROFILES**

In `server/config/constants.js`, after the `haiku` profile (line 26), add:

```javascript
  gpt: Object.freeze({
    provider: 'openai',
    modelNameEnv: 'AZURE_OPENAI_MODEL_NAME',
    defaultModelName: 'gpt-5.4',
    endpointEnv: 'AZURE_OPENAI_ENDPOINT',
    apiKeyEnv: 'AZURE_OPENAI_API_KEY',
  }),
```

- [ ] **Step 4: Add GPT cost rates to COST_RATES**

In `server/config/constants.js`, after the `haiku` rates (line 88), add:

```javascript
    gpt: Object.freeze({ input: 2.5, cachedInput: 1.25, output: 10 }),
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && node --test tests/modelRouting.test.js`  
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add server/config/constants.js server/tests/modelRouting.test.js
git commit -m "feat(config): add GPT-5.4 model profile and cost rates

Add GPT profile to MODEL_PROFILES with Azure OpenAI provider.
Add cost rates for GPT-5.4 token usage tracking.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Add OpenAI SDK Routing to LLM Config

**Files:**
- Modify: `server/config/llm.js:5` (add import)
- Modify: `server/config/llm.js:262-291` (getModel function)
- Modify: `server/tests/modelRouting.test.js` (add tests)

- [ ] **Step 1: Write failing test for extractInstanceName helper**

Add to `server/tests/modelRouting.test.js`:

```javascript
test('extractInstanceName extracts Azure instance from endpoint', () => {
  const llm = require('../config/llm');
  const extractInstanceName = llm.__testables?.extractInstanceName;
  
  assert.ok(extractInstanceName, 'extractInstanceName should be exported for testing');
  
  assert.equal(
    extractInstanceName('https://hrish-m9gvbn6u-eastus2.cognitiveservices.azure.com/'),
    'hrish-m9gvbn6u-eastus2'
  );
  
  assert.equal(
    extractInstanceName('https://my-instance.openai.azure.com/'),
    'my-instance'
  );
  
  assert.equal(
    extractInstanceName('invalid-url'),
    ''
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && node --test tests/modelRouting.test.js`  
Expected: FAIL with "Cannot read properties of undefined (reading 'extractInstanceName')"

- [ ] **Step 3: Add ChatOpenAI import**

In `server/config/llm.js`, add after line 5:

```javascript
const { ChatOpenAI } = require('@langchain/openai');
```

- [ ] **Step 4: Add extractInstanceName helper before getModel**

In `server/config/llm.js`, add before the `getModel` function (around line 260):

```javascript
function extractInstanceName(endpoint) {
  if (!endpoint || typeof endpoint !== 'string') return '';
  const match = endpoint.match(/https?:\/\/([^.]+)/);
  return match ? match[1] : '';
}
```

- [ ] **Step 5: Replace model instantiation in getModel**

In `server/config/llm.js`, replace the existing model instantiation (lines 262-291) with:

```javascript
function getModel(opts = {}) {
  const maxTokens = opts.maxTokens ?? LLM_DEFAULT_MAX_TOKENS;
  const requestedTemp = opts.temperature ?? LLM_DEFAULT_TEMPERATURE;
  const timeout = opts.timeout ?? 60000;
  const maxRetries = opts.maxRetries ?? 3;

  const runtime = resolveRuntimeConfig(opts);
  const modelMeta = buildModelMeta(opts, runtime);
  const callbacks = usageCallbacks(opts.nodeKey, modelMeta.profile);

  let model;
  
  if (runtime.provider === 'openai') {
    // Azure OpenAI path
    const modelOpts = {
      azureOpenAIApiKey: runtime.apiKey,
      azureOpenAIApiInstanceName: extractInstanceName(runtime.endpoint),
      azureOpenAIApiDeploymentName: runtime.modelName,
      azureOpenAIApiVersion: '2024-12-01-preview',
      temperature: requestedTemp,
      maxTokens,
      timeout,
      maxRetries,
      callbacks,
    };
    if (opts.cache) modelOpts.cache = _sharedCache;
    model = new ChatOpenAI(modelOpts);
  } else {
    // Anthropic path (existing code)
    const modelOpts = {
      anthropicApiKey: runtime.apiKey,
      anthropicApiUrl: runtime.endpoint,
      modelName: runtime.modelName,
      temperature: requestedTemp,
      maxTokens,
      clientOptions: { timeout, maxRetries },
      callbacks,
    };
    if (opts.cache) modelOpts.cache = _sharedCache;
    model = new ChatAnthropic(modelOpts);
    model.topP = undefined;
    model.topK = undefined;
  }
  
  return attachModelMeta(model, modelMeta);
}
```

- [ ] **Step 6: Export extractInstanceName for testing**

At the end of `server/config/llm.js` (around line 310), modify the exports:

```javascript
module.exports = {
  getModel,
  getModelMeta,
  resetUsage,
  getUsage,
  getUsageByNodeAndModel,
  recordUsage,
  pingLLM,
  __testables: { extractInstanceName },
};
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd server && node --test tests/modelRouting.test.js`  
Expected: PASS (3 tests)

- [ ] **Step 8: Commit**

```bash
git add server/config/llm.js server/tests/modelRouting.test.js
git commit -m "feat(llm): add Azure OpenAI routing for GPT models

Add ChatOpenAI SDK instantiation when provider is 'openai'.
Add extractInstanceName helper to parse Azure endpoint URLs.
Existing Anthropic path unchanged.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Add Global Model Expansion to Route Handler

**Files:**
- Modify: `server/routes/textToSql.js:46-52` (update VALID_NODE_KEYS)
- Modify: `server/routes/textToSql.js:668-728` (analyze-stream route)
- Modify: `server/tests/modelRouting.test.js` (add test)

- [ ] **Step 1: Write failing test for globalModel expansion**

Add to `server/tests/modelRouting.test.js`:

```javascript
test('expandGlobalModel creates nodeModelOverrides for all nodes', () => {
  const expandGlobalModel = require('../routes/textToSql').__testables?.expandGlobalModel;
  
  assert.ok(expandGlobalModel, 'expandGlobalModel should be exported for testing');
  
  const result = expandGlobalModel('gpt');
  
  assert.ok(result, 'Should return an object');
  assert.equal(result.classify, 'gpt');
  assert.equal(result.decompose, 'gpt');
  assert.equal(result.generateSql, 'gpt');
  assert.equal(result.sqlAgent, 'gpt');
  assert.equal(result.sqlWriterAgent, 'gpt');
  assert.equal(result.validate, 'gpt');
  assert.equal(result.correct, 'gpt');
  assert.equal(result.execute, 'gpt');
  assert.equal(result.checkResults, 'gpt');
  assert.equal(result.presentInsights, 'gpt');
  assert.equal(result.presentChart, 'gpt');
  assert.equal(result.dashboardAgent, 'gpt');
  assert.equal(result.subQueryMatch, 'gpt');
  
  const nullResult = expandGlobalModel(null);
  assert.equal(nullResult, null);
  
  const invalidResult = expandGlobalModel('invalid');
  assert.equal(invalidResult, null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && node --test tests/modelRouting.test.js`  
Expected: FAIL with "Cannot read properties of undefined (reading 'expandGlobalModel')"

- [ ] **Step 3: Update VALID_NODE_KEYS to include all pipeline nodes**

In `server/routes/textToSql.js`, replace lines 46-51:

```javascript
const VALID_NODE_KEYS = new Set([
  'classify', 'decompose', 'generateSql', 'sqlAgent', 'sqlWriterAgent',
  'researchAgent', 'subQueryMatch', 'correct', 'validate', 'execute',
  'checkResults', 'presentInsights', 'presentChart', 'dashboardAgent',
  'semanticValidatorFast', 'semanticValidatorOpus',
]);
```

- [ ] **Step 4: Add expandGlobalModel helper function**

In `server/routes/textToSql.js`, add before the route handlers (around line 64):

```javascript
function expandGlobalModel(globalModel) {
  if (!globalModel || typeof globalModel !== 'string') return null;
  if (!['opus', 'sonnet', 'haiku', 'gpt'].includes(globalModel)) return null;
  
  const allNodes = [
    'classify', 'decompose', 'generateSql', 'sqlAgent', 'sqlWriterAgent',
    'validate', 'correct', 'execute', 'checkResults', 'presentInsights',
    'presentChart', 'dashboardAgent', 'subQueryMatch',
  ];
  
  const overrides = {};
  allNodes.forEach(nodeKey => {
    overrides[nodeKey] = globalModel;
  });
  
  return overrides;
}
```

- [ ] **Step 5: Extract globalModel in analyze-stream route**

In `server/routes/textToSql.js`, line 682, add `globalModel` to destructuring:

```javascript
  const {
    question,
    conversationHistory,
    previousEntities,
    resolvedQuestions,
    presentMode,
    impersonateContext,
    validationEnabled,
    isFollowUp,
    previousDashboardSpec,
    dashboardDataSources,
    profileCacheKey,
    enabledTools,
    nodeModelOverrides,
    globalModel,  // NEW
  } = req.body;
```

- [ ] **Step 6: Add globalModel expansion logic before inputs**

In `server/routes/textToSql.js`, replace line 727 with:

```javascript
    enabledTools: normalizeEnabledTools(enabledTools),
    nodeModelOverrides: normalizeNodeModelOverrides(
      globalModel 
        ? { ...nodeModelOverrides, ...expandGlobalModel(globalModel) }
        : nodeModelOverrides
    ),
```

- [ ] **Step 7: Export expandGlobalModel for testing**

At the end of `server/routes/textToSql.js` (after the last router definition), add:

```javascript
module.exports = router;
module.exports.__testables = { expandGlobalModel };
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd server && node --test tests/modelRouting.test.js`  
Expected: PASS (4 tests)

- [ ] **Step 9: Commit**

```bash
git add server/routes/textToSql.js server/tests/modelRouting.test.js
git commit -m "feat(routes): add globalModel expansion to analyze-stream

Accept globalModel param and expand to all pipeline nodes.
globalModel overrides take precedence over nodeModelOverrides.
Add expandGlobalModel helper with test coverage.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Update API Client for Global Model

**Files:**
- Modify: `client/src/utils/api.js:53-68` (analyzeQuestionStream signature and payload)
- Modify: `client/src/utils/api.js:39-50` (analyzeQuestion signature and payload)

- [ ] **Step 1: Add globalModel to analyzeQuestionStream signature**

In `client/src/utils/api.js`, line 59, add `globalModel` to destructuring:

```javascript
export async function analyzeQuestionStream(
  question,
  conversationHistory = [],
  previousEntities = null,
  resolvedQuestions = [],
  onEvent,
  { 
    impersonateContext = null, 
    validationEnabled = true, 
    sessionId, 
    isFollowUp = false, 
    previousDashboardSpec = null, 
    dashboardDataSources = null, 
    enabledTools = null, 
    nodeModelOverrides,
    globalModel  // NEW
  } = {},
)
```

- [ ] **Step 2: Add globalModel to request payload**

In `client/src/utils/api.js`, after line 67, add:

```javascript
  if (nodeModelOverrides && Object.keys(nodeModelOverrides).length > 0) payload.nodeModelOverrides = nodeModelOverrides;
  if (globalModel) payload.globalModel = globalModel;  // NEW
  const headers = { 'Content-Type': 'application/json' };
```

- [ ] **Step 3: Add globalModel to analyzeQuestion signature**

In `client/src/utils/api.js`, line 39, add `globalModel` to destructuring:

```javascript
export function analyzeQuestion(
  question,
  conversationHistory = [],
  previousEntities = null,
  resolvedQuestions = [],
  { impersonateContext = null, validationEnabled = true, sessionId, isFollowUp = false, enabledTools = null, nodeModelOverrides, globalModel } = {},
)
```

- [ ] **Step 4: Add globalModel to analyzeQuestion payload**

In `client/src/utils/api.js`, after line 43, add:

```javascript
  payload.enabledTools = enabledTools ?? null;
  if (nodeModelOverrides && Object.keys(nodeModelOverrides).length > 0) payload.nodeModelOverrides = nodeModelOverrides;
  if (globalModel) payload.globalModel = globalModel;  // NEW
  const headers = {};
```

- [ ] **Step 5: Commit**

```bash
git add client/src/utils/api.js
git commit -m "feat(api): add globalModel parameter to API methods

Add globalModel to analyzeQuestionStream and analyzeQuestion.
Backend will expand to all pipeline nodes.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Rewrite DevPanel Component

**Files:**
- Modify: `client/src/components/DevPanel.jsx` (complete rewrite)

- [ ] **Step 1: Replace DevPanel with minimal toggle UI**

In `client/src/components/DevPanel.jsx`, replace entire file contents:

```jsx
import React, { useState, useCallback, useMemo } from 'react';

const MODEL_OPTIONS = [
  { value: 'opus', label: 'Opus 4.6', color: '#7C3AED' },
  { value: 'gpt', label: 'GPT 5.4', color: '#059669' },
];

const GearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

export default function DevPanel({ globalModel, setGlobalModel, lastRunMetrics }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(v => !v), []);

  const selectedModel = MODEL_OPTIONS.find(m => m.value === globalModel) || MODEL_OPTIONS[0];

  // Calculate total time from metrics
  const totalSeconds = useMemo(() => {
    if (!lastRunMetrics?.nodeDurations) return null;
    const totalMs = Object.values(lastRunMetrics.nodeDurations).reduce((sum, ms) => sum + (ms || 0), 0);
    return (totalMs / 1000).toFixed(2);
  }, [lastRunMetrics]);

  return (
    <>
      {/* Scrim overlay */}
      <div
        onClick={toggle}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 998,
          background: 'rgba(0,0,0,0.05)',
          backdropFilter: 'blur(1px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Trigger button */}
      <button
        onClick={toggle}
        style={{
          position: 'fixed',
          right: open ? 320 : 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1000,
          width: 32,
          height: 64,
          background: 'var(--glass-bg-heavy)',
          backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--color-border)',
          borderRight: 'none',
          borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all var(--transition-base)',
          boxShadow: '-2px 0 8px rgba(100,80,160,0.06)',
          color: 'var(--color-accent)',
          padding: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.width = '38px'; e.currentTarget.style.background = 'rgba(255,255,255,0.65)'; }}
        onMouseLeave={e => { e.currentTarget.style.width = '32px'; e.currentTarget.style.background = 'var(--glass-bg-heavy)'; }}
        aria-label="Toggle Model Comparison"
      >
        <GearIcon />
      </button>

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: open ? 0 : -320,
          bottom: 0,
          width: 320,
          zIndex: 999,
          background: 'var(--glass-bg-heavy)',
          backdropFilter: 'var(--glass-blur)',
          borderLeft: '1px solid var(--color-border)',
          boxShadow: '-4px 0 24px rgba(100,80,160,0.08)',
          transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          padding: 24,
          gap: 24,
        }}
      >
        {/* Header */}
        <div>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: 4,
          }}>
            Model Comparison
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--color-text-muted)',
          }}>
            Compare Opus 4.6 vs GPT 5.4 end-to-end performance
          </div>
        </div>

        {/* Toggle */}
        <div>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            color: 'var(--color-text-faint)',
            marginBottom: 12,
          }}>
            Active Model
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {MODEL_OPTIONS.map(model => (
              <button
                key={model.value}
                onClick={() => setGlobalModel(model.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                  fontWeight: 600,
                  background: globalModel === model.value 
                    ? `${model.color}15`
                    : 'rgba(255,255,255,0.45)',
                  border: `2px solid ${globalModel === model.value ? model.color : 'var(--color-border)'}`,
                  color: globalModel === model.value ? model.color : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  border: `2px solid ${model.color}`,
                  background: globalModel === model.value ? model.color : 'transparent',
                  flexShrink: 0,
                }} />
                {model.label}
              </button>
            ))}
          </div>
        </div>

        {/* Metrics */}
        <div style={{
          marginTop: 'auto',
          padding: 16,
          background: 'rgba(255,255,255,0.3)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border-light)',
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            color: 'var(--color-text-faint)',
            marginBottom: 8,
          }}>
            Last Query
          </div>
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {totalSeconds ? `${totalSeconds}s` : '—'}
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--color-text-muted)',
            marginTop: 4,
          }}>
            {totalSeconds ? `Using ${selectedModel.label}` : 'No query yet'}
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify component syntax**

Run: `cd client && npm run build`  
Expected: Build succeeds without errors

- [ ] **Step 3: Commit**

```bash
git add client/src/components/DevPanel.jsx
git commit -m "refactor(devpanel): simplify to global model toggle

Replace per-node selection with Opus/GPT toggle.
Remove presets, legends, and per-node metrics.
Display total query time and active model only.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Update App.jsx State Management

**Files:**
- Modify: `client/src/App.jsx:67-78` (replace state)
- Modify: `client/src/App.jsx:270` (ChatPanel props)
- Modify: `client/src/App.jsx:276-288` (DevPanel props)

- [ ] **Step 1: Replace nodeModelOverrides state with globalModel**

In `client/src/App.jsx`, replace lines 67-78:

```javascript
  const [globalModel, setGlobalModel] = useState('opus');
  const [lastRunMetrics, setLastRunMetrics] = useState(null);
  const toolToggles = useEnabledTools();
```

Remove the `savedPresets` state entirely (lines 73-78).

- [ ] **Step 2: Update ChatPanel to use globalModel**

In `client/src/App.jsx`, line 270, replace `nodeModelOverrides` prop:

```javascript
            <ChatPanel onMenuClick={() => setSidebarOpen((v) => !v)} impersonateContext={impersonateContext} validationEnabled={validationEnabled} sessionId={sessionId} onNewChat={handleNewChat} enabledTools={toolToggles.enabledTools} globalModel={globalModel} userName={userName} onMetricsUpdate={setLastRunMetrics} />
```

- [ ] **Step 3: Update DevPanel props**

In `client/src/App.jsx`, replace lines 276-288:

```javascript
      <DevPanel
        globalModel={globalModel}
        setGlobalModel={setGlobalModel}
        lastRunMetrics={lastRunMetrics}
      />
```

- [ ] **Step 4: Verify build**

Run: `cd client && npm run build`  
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add client/src/App.jsx
git commit -m "refactor(app): simplify state to globalModel

Replace nodeModelOverrides and savedPresets with single globalModel state.
Default to 'opus'. No localStorage persistence (resets on refresh).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Update ChatPanel to Pass Global Model

**Files:**
- Modify: `client/src/components/ChatPanel.jsx` (props and API call)

- [ ] **Step 1: Find ChatPanel component signature**

Run: `cd client/src/components && grep -n "export default function ChatPanel" ChatPanel.jsx`

- [ ] **Step 2: Update ChatPanel props to accept globalModel**

In `client/src/components/ChatPanel.jsx`, update the function signature to replace `nodeModelOverrides` with `globalModel`:

```javascript
export default function ChatPanel({ 
  onMenuClick, 
  impersonateContext, 
  validationEnabled, 
  sessionId, 
  onNewChat, 
  enabledTools, 
  globalModel,  // Changed from nodeModelOverrides
  userName, 
  onMetricsUpdate 
})
```

- [ ] **Step 3: Update analyzeQuestionStream call**

Find where `analyzeQuestionStream` is called in ChatPanel and update the options object to pass `globalModel` instead of `nodeModelOverrides`:

```javascript
await analyzeQuestionStream(
  question,
  conversationHistory,
  previousEntities,
  resolvedQuestions,
  handleStreamEvent,
  {
    impersonateContext,
    validationEnabled,
    sessionId,
    isFollowUp,
    previousDashboardSpec,
    dashboardDataSources,
    enabledTools,
    globalModel,  // Changed from nodeModelOverrides
  }
);
```

- [ ] **Step 4: Verify build**

Run: `cd client && npm run build`  
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add client/src/components/ChatPanel.jsx
git commit -m "refactor(chatpanel): use globalModel instead of nodeModelOverrides

Pass globalModel to API call. Backend expands to all nodes.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Add Environment Variables

**Files:**
- Modify: `server/.env`
- Modify: `server/.env.example`

- [ ] **Step 1: Add GPT credentials to .env**

In `server/.env`, add at the end:

```bash
# Azure OpenAI (GPT-5.4)
AZURE_OPENAI_ENDPOINT=https://your-instance.openai.azure.com/
AZURE_OPENAI_API_KEY=your_openai_api_key
AZURE_OPENAI_MODEL_NAME=gpt-5.4
```

- [ ] **Step 2: Add GPT credential placeholders to .env.example**

In `server/.env.example`, add at the end:

```bash
# Azure OpenAI (GPT-5.4)
AZURE_OPENAI_ENDPOINT=https://your-instance.openai.azure.com/
AZURE_OPENAI_API_KEY=your_openai_api_key
AZURE_OPENAI_MODEL_NAME=gpt-5.4
```

- [ ] **Step 3: Commit**

```bash
git add server/.env server/.env.example
git commit -m "chore(env): add Azure OpenAI GPT-5.4 credentials

Add AZURE_OPENAI_* environment variables for GPT comparison.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Manual Verification

**No files modified - manual testing only**

- [ ] **Step 1: Start backend server**

Run: `cd server && npm run dev`  
Expected: Server starts on port 5005, no errors

- [ ] **Step 2: Start frontend dev server**

Run: `cd client && npm run dev`  
Expected: Vite dev server starts on port 5174

- [ ] **Step 3: Open browser and toggle to Opus 4.6**

1. Navigate to `http://localhost:5174`
2. Click gear icon on right edge to open DevPanel
3. Verify "Opus 4.6" is selected by default
4. Ask a simple question: "What is our total pipeline?"
5. Verify query executes and time displays in DevPanel metrics card

- [ ] **Step 4: Toggle to GPT 5.4 and run query**

1. Click "GPT 5.4" button in DevPanel
2. Verify button highlights in green
3. Ask the same question: "What is our total pipeline?"
4. Verify query executes and time displays
5. Compare times between runs

- [ ] **Step 5: Check browser console for errors**

Expected: No errors in browser console

- [ ] **Step 6: Check server logs for model usage**

Expected: Server logs show correct model being used (Opus vs GPT)

- [ ] **Step 7: Test browser refresh**

1. Refresh browser
2. Verify DevPanel resets to "Opus 4.6" (default)
3. Verify no localStorage errors in console

---

## Self-Review Checklist

**Spec coverage:**
- ✓ Add GPT profile to constants — Task 1
- ✓ Route to OpenAI SDK based on provider — Task 2
- ✓ Expand globalModel in route handler — Task 3
- ✓ Update API client signature — Task 4
- ✓ Rewrite DevPanel to toggle UI — Task 5
- ✓ Update App.jsx state management — Task 6
- ✓ Update ChatPanel to pass globalModel — Task 7
- ✓ Add environment variables — Task 8
- ✓ Manual testing — Task 9

**Placeholder scan:**
- ✓ No TBD, TODO, or "fill in details"
- ✓ All code blocks contain complete, runnable code
- ✓ All test commands include exact expected output

**Type consistency:**
- ✓ `globalModel` is always a string ('opus' | 'gpt')
- ✓ `MODEL_OPTIONS` array structure matches component usage
- ✓ `lastRunMetrics.nodeDurations` object access is consistent
- ✓ API signatures match between api.js, ChatPanel, and route handler

**All requirements met:**
- ✓ GPT-5.4 added as model option
- ✓ DevPanel simplified to toggle + time display
- ✓ Total pipeline time displayed
- ✓ Existing nodeModelOverrides infrastructure reused
