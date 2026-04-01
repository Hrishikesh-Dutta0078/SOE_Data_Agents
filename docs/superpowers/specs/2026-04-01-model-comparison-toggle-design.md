# Model Comparison Toggle Design

**Date:** 2026-04-01  
**Author:** Claude  
**Status:** Approved

## Overview

Replace the existing DevPanel's per-node model selection UI with a simple global toggle to compare Opus 4.6 vs GPT 5.4 end-to-end performance. Users can switch between models via a toggle and manually compare execution times.

## Goals

1. Add GPT-5.4 as a model option alongside the existing Claude models
2. Simplify DevPanel to a single global model toggle (remove per-node selection, presets, legends)
3. Display total pipeline execution time for manual comparison
4. Reuse existing `nodeModelOverrides` infrastructure

## Non-Goals

- Side-by-side simultaneous comparison
- Query history or automated performance tracking
- Per-node model selection (existing feature being removed for simplicity)

## Architecture

### Backend Changes

#### 1. Model Profile Configuration (`server/config/constants.js`)

Add a new `gpt` profile to `MODEL_PROFILES`:

```javascript
gpt: Object.freeze({
  provider: 'openai',
  modelNameEnv: 'AZURE_OPENAI_MODEL_NAME',
  defaultModelName: 'gpt-5.4',
  endpointEnv: 'AZURE_OPENAI_ENDPOINT',
  apiKeyEnv: 'AZURE_OPENAI_API_KEY',
}),
```

Add cost rates for GPT-5.4 to `COST_RATES`:

```javascript
gpt: Object.freeze({ input: 2.5, cachedInput: 1.25, output: 10 }),
```

**Why this works:** The existing profile system already has the infrastructure to support multiple models. Adding `provider: 'openai'` signals that this profile should use the Azure OpenAI SDK instead of Anthropic.

#### 2. LLM Configuration Routing (`server/config/llm.js`)

Modify `getModel()` to instantiate the correct SDK based on `runtime.provider`:

**Add import:**
```javascript
const { ChatOpenAI } = require('@langchain/openai');
```

**Replace model instantiation in `getModel()`:**
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

function extractInstanceName(endpoint) {
  // Extract instance name from Azure endpoint URL
  // "https://hrish-m9gvbn6u-eastus2.cognitiveservices.azure.com/" -> "hrish-m9gvbn6u-eastus2"
  const match = endpoint.match(/https?:\/\/([^.]+)/);
  return match ? match[1] : '';
}
```

**Why this works:** LangChain's `ChatOpenAI` and `ChatAnthropic` have similar interfaces. The existing callback system for token tracking works with both SDKs. We route based on the `provider` field in the profile.

#### 3. Route Handler (`server/routes/textToSql.js`)

Modify the `/analyze-stream` route to accept `globalModel` and expand it to all nodes:

```javascript
router.post('/analyze-stream', async (req, res) => {
  const {
    question,
    conversationHistory = [],
    previousEntities = null,
    resolvedQuestions = [],
    impersonateContext = null,
    validationEnabled = true,
    isFollowUp = false,
    previousDashboardSpec = null,
    dashboardDataSources = null,
    enabledTools = null,
    nodeModelOverrides = {},
    globalModel,  // NEW: 'opus' or 'gpt'
  } = req.body;

  // Expand globalModel to all nodes if provided
  let finalNodeModelOverrides = { ...nodeModelOverrides };
  if (globalModel && ['opus', 'gpt'].includes(globalModel)) {
    const allNodes = [
      'classify', 'decompose', 'generateSql', 'sqlAgent', 'sqlWriterAgent',
      'validate', 'correct', 'execute', 'checkResults', 'presentInsights',
      'presentChart', 'dashboardAgent', 'subQueryMatch',
    ];
    allNodes.forEach(nodeKey => {
      finalNodeModelOverrides[nodeKey] = globalModel;
    });
  }

  // Pass to graph invocation
  const result = await graph.invoke({
    // ... existing fields ...
    nodeModelOverrides: finalNodeModelOverrides,
  });
  
  // ... rest of handler ...
});
```

**Why this works:** The `nodeModelOverrides` mechanism already exists throughout the graph. We auto-populate it when `globalModel` is specified. All graph nodes already read from `state.nodeModelOverrides[nodeKey]` to determine which model profile to use.

### Frontend Changes

#### 1. DevPanel Component (`client/src/components/DevPanel.jsx`)

Replace the entire component with a minimal toggle UI. Key changes:

- Remove all per-node selection logic
- Remove presets system (All Haiku, All Sonnet, etc.)
- Remove legends and group headers
- Simplify to: toggle buttons + metrics card
- Display total time from `lastRunMetrics.nodeDurations`

**New component structure:**
```jsx
export default function DevPanel({ globalModel, setGlobalModel, lastRunMetrics })
```

**UI elements:**
1. Header: "Model Comparison" with description
2. Toggle section: Two large radio-style buttons (Opus 4.6 / GPT 5.4)
3. Metrics card: Shows last query execution time and which model was used

**Props:**
- `globalModel`: Current selection ('opus' or 'gpt')
- `setGlobalModel`: Callback to change selection
- `lastRunMetrics`: Metrics object from last query (unchanged)

#### 2. Parent Component Integration (`client/src/App.jsx`)

Replace `nodeModelOverrides` state with simpler `globalModel` state:

```javascript
// Old:
const [nodeModelOverrides, setNodeModelOverrides] = useState({});
const [savedPresets, setSavedPresets] = useState({});

// New:
const [globalModel, setGlobalModel] = useState('opus');

// DevPanel props:
<DevPanel 
  globalModel={globalModel}
  setGlobalModel={setGlobalModel}
  lastRunMetrics={lastRunMetrics}
/>

// API call:
await analyzeQuestionStream(
  question,
  conversationHistory,
  previousEntities,
  resolvedQuestions,
  onEvent,
  {
    // ... other options ...
    globalModel,  // Send 'opus' or 'gpt'
  }
);
```

#### 3. API Client (`client/src/utils/api.js`)

Update `analyzeQuestionStream` signature to accept `globalModel`:

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
    globalModel  // NEW
  } = {},
)
```

Add to request payload:
```javascript
if (globalModel) payload.globalModel = globalModel;
```

### Environment Variables

Add GPT-5.4 credentials to `server/.env`:

```bash
# Azure OpenAI (GPT-5.4)
AZURE_OPENAI_ENDPOINT=https://your-instance.openai.azure.com/
AZURE_OPENAI_API_KEY=your_openai_api_key
AZURE_OPENAI_MODEL_NAME=gpt-5.4
```

Update `.env.example` with placeholders.

## Data Flow

1. **User toggles model** in DevPanel → updates `globalModel` state to `'opus'` or `'gpt'`
2. **Frontend sends request** → `analyzeQuestionStream()` includes `globalModel` in request body
3. **Backend route handler** → expands `globalModel` to `nodeModelOverrides` for all pipeline nodes
4. **Graph nodes** → each node reads `state.nodeModelOverrides[nodeKey]` and passes as `profile` to `getModel()`
5. **LLM config** → `getModel()` resolves profile → checks `provider` → instantiates correct SDK (ChatAnthropic or ChatOpenAI)
6. **Pipeline executes** → metrics collected via callbacks (existing infrastructure)
7. **Frontend displays** → total time calculated from `lastRunMetrics.nodeDurations`

## Error Handling

- If GPT-5.4 credentials are missing or invalid, `getModel()` will throw on instantiation
- Handle gracefully in route handler with 500 error response
- Frontend displays error message, allows user to toggle back to Opus
- Existing error handling for token usage tracking applies to both SDKs

## Testing Strategy

1. **Manual verification:**
   - Toggle to Opus 4.6, run query, verify correct model used and time displayed
   - Toggle to GPT 5.4, run query, verify correct model used and time displayed
   - Compare times across multiple queries

2. **Code verification:**
   - Check that all nodes receive the correct profile
   - Verify ChatOpenAI is instantiated with correct Azure credentials
   - Confirm token usage callbacks work with OpenAI SDK

3. **Edge cases:**
   - Missing GPT credentials (should fail gracefully)
   - Toggle mid-query (should not affect in-flight requests)
   - Browser refresh (state should reset to default 'opus')

## Migration Notes

- Existing `nodeModelOverrides` localStorage data will be ignored (state simplified)
- Saved presets will be removed (no longer needed)
- Users will need to manually toggle between models instead of using presets

## Open Questions

None - design approved by user.

## Future Enhancements (Out of Scope)

- Side-by-side comparison mode
- Query history with performance tracking
- Automatic A/B testing across multiple queries
- Per-node model selection (if granular comparison needed later)
