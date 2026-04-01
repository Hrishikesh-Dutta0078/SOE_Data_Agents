# Token Usage DevPanel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display per-phase token counts (input + output) for Schema Research and SQL Generation in the DevPanel.

**Architecture:** Fix two server-side data attribution issues (missing `nodeKey`, stale breakdown keys), then add a Token Usage section to the existing `DevPanel.jsx` component. Data already flows through the SSE `done` event and `lastRunMetrics` prop — no new plumbing needed.

**Tech Stack:** Node.js (CommonJS), React 19, inline styles (existing DevPanel pattern)

**Spec:** `docs/superpowers/specs/2026-04-01-token-usage-devpanel-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `server/vectordb/llmSchemaSelector.js` | Modify | Add `nodeKey: 'contextFetch'` to `getModel` call |
| `server/utils/usageMetrics.js` | Modify | Update `buildUsageBreakdown` node/model keys |
| `client/src/components/DevPanel.jsx` | Modify | Add Token Usage section |
| `client/src/components/ChatPanel.jsx` | Modify | Add `haiku`/`gpt` to `MODEL_BADGE` |

---

### Task 1: Fix contextFetch token attribution

**Files:**
- Modify: `server/vectordb/llmSchemaSelector.js:164-167`

- [ ] **Step 1: Read the current `getModel` call**

Open `server/vectordb/llmSchemaSelector.js` and locate the `getModel` call around line 164:

```javascript
const model = getModel({
  maxTokens: 2048,
  temperature: 0,
}).withStructuredOutput(SchemaSelectionSchema);
```

- [ ] **Step 2: Add `nodeKey: 'contextFetch'`**

Change it to:

```javascript
const model = getModel({
  maxTokens: 2048,
  temperature: 0,
  nodeKey: 'contextFetch',
}).withStructuredOutput(SchemaSelectionSchema);
```

This causes `recordUsageWithContext` in `server/config/llm.js` to bucket these tokens under the `contextFetch` key. Without a `nodeKey`, the callback's early return (`if (!nodeKey || !profile) return`) silently drops the per-node recording.

- [ ] **Step 3: Commit**

```bash
git add server/vectordb/llmSchemaSelector.js
git commit -m "fix: attribute schema selection LLM tokens to contextFetch nodeKey"
```

---

### Task 2: Update buildUsageBreakdown keys

**Files:**
- Modify: `server/utils/usageMetrics.js:52-54`

- [ ] **Step 1: Read the current `buildUsageBreakdown` function**

Open `server/utils/usageMetrics.js` and find `buildUsageBreakdown` at line 52:

```javascript
function buildUsageBreakdown(rawByNodeAndModel = {}) {
  const nodes = ['researchAgent', 'sqlWriterAgent'];
  const models = ['opus', 'haiku'];
```

These are stale keys from the old pipeline. The live graph uses `contextFetch` and `generateSql`.

- [ ] **Step 2: Replace node and model keys**

Change lines 53-54 to:

```javascript
function buildUsageBreakdown(rawByNodeAndModel = {}) {
  const nodes = ['contextFetch', 'generateSql'];
  const models = ['opus', 'sonnet', 'haiku', 'gpt'];
```

The rest of the function iterates these arrays and builds the output — no other changes needed.

- [ ] **Step 3: Update the JSDoc comment**

Change the comment on line 51 from:

```javascript
/** Normalize per-node, per-model usage for the client. Ensures researchAgent and sqlWriterAgent have opus/haiku keys. */
```

to:

```javascript
/** Normalize per-node, per-model usage for the client. Ensures contextFetch and generateSql have all model profile keys. */
```

- [ ] **Step 4: Verify existing tests still pass**

```bash
cd server
node --test
```

Expected: All existing tests pass (this change only affects the breakdown structure, not core logic).

- [ ] **Step 5: Commit**

```bash
git add server/utils/usageMetrics.js
git commit -m "fix: update buildUsageBreakdown to use current graph nodeKeys and all model profiles"
```

---

### Task 3: Add missing MODEL_BADGE entries

**Files:**
- Modify: `client/src/components/ChatPanel.jsx:46-49`

- [ ] **Step 1: Read the current MODEL_BADGE**

Open `client/src/components/ChatPanel.jsx` and find `MODEL_BADGE` at line 46:

```javascript
const MODEL_BADGE = {
  opus:   { color: '#7C3AED', bg: 'rgba(139,92,246,0.1)' },
  sonnet: { color: '#4F46E5', bg: 'rgba(99,102,241,0.1)' },
};
```

Missing: `haiku` and `gpt`.

- [ ] **Step 2: Add haiku and gpt entries**

```javascript
const MODEL_BADGE = {
  opus:   { color: '#7C3AED', bg: 'rgba(139,92,246,0.1)' },
  sonnet: { color: '#4F46E5', bg: 'rgba(99,102,241,0.1)' },
  haiku:  { color: '#059669', bg: 'rgba(16,185,129,0.12)' },
  gpt:    { color: '#2563EB', bg: 'rgba(37,99,235,0.1)' },
};
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ChatPanel.jsx
git commit -m "feat: add haiku and gpt model badges for token breakdown display"
```

---

### Task 4: Add Token Usage section to DevPanel

**Files:**
- Modify: `client/src/components/DevPanel.jsx`

- [ ] **Step 1: Read the full DevPanel component**

Open `client/src/components/DevPanel.jsx`. Understand the structure:
- Lines 3-6: `MODEL_OPTIONS` array (value, label, color)
- Line 15: Component receives `{ globalModel, setGlobalModel, lastRunMetrics }`
- Lines 22-26: `totalSeconds` computed from `lastRunMetrics.nodeDurations`
- Lines 115-166: Active Model toggle section
- Lines 168-201: Last Query metrics box (pushed to bottom with `marginTop: 'auto'`)

- [ ] **Step 2: Add a `formatTokenCount` helper and `PHASE_CONFIG` constant**

Add these above the component function (after `MODEL_OPTIONS`, around line 7):

```javascript
const PHASE_CONFIG = [
  { key: 'contextFetch', label: 'Schema Research' },
  { key: 'generateSql', label: 'SQL Generation' },
];

const MODEL_COLORS = {
  opus:   { label: 'Opus 4.6',   color: '#7C3AED' },
  sonnet: { label: 'Sonnet 4.6', color: '#4F46E5' },
  haiku:  { label: 'Haiku 4.5',  color: '#059669' },
  gpt:    { label: 'GPT 5.4',    color: '#2563EB' },
};

function formatTokenCount(n) {
  if (n == null || !Number.isFinite(n) || n <= 0) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}
```

- [ ] **Step 3: Extract `usageByNodeAndModel` from `lastRunMetrics`**

Inside the component, after the existing `totalSeconds` memo (line 26), add:

```javascript
const tokensByPhase = useMemo(() => {
  const raw = lastRunMetrics?.usageByNodeAndModel;
  if (!raw) return null;
  return PHASE_CONFIG.map(({ key, label }) => {
    const byModel = raw[key] || {};
    const entries = Object.entries(byModel)
      .filter(([, u]) => u && u.totalTokens > 0)
      .map(([model, u]) => ({ model, inputTokens: u.inputTokens || 0, outputTokens: u.outputTokens || 0 }));
    return { key, label, entries };
  });
}, [lastRunMetrics]);
```

- [ ] **Step 4: Add the Token Usage section JSX**

Insert a new section between the Active Model toggle (`</div>` at line 166) and the Last Query metrics box (`<div style={{ marginTop: 'auto' ...` at line 169). The new section:

```jsx
{/* Token Usage */}
{tokensByPhase && (
  <div>
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.8px',
      color: 'var(--color-text-faint)',
      marginBottom: 12,
    }}>
      Token Usage
    </div>
    <div style={{
      padding: 16,
      background: 'rgba(255,255,255,0.3)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border-light)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {tokensByPhase.map(({ key, label, entries }) => (
        <div key={key}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
            {label}
          </div>
          {entries.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>—</div>
          ) : (
            entries.map(({ model, inputTokens, outputTokens }) => {
              const mc = MODEL_COLORS[model];
              return (
                <div key={model} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--color-text-muted)' }}>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 999,
                    color: mc?.color || '#6B7280',
                    background: mc ? `${mc.color}15` : 'rgba(107,114,128,0.1)',
                  }}>
                    {mc?.label || model}
                  </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    In: {formatTokenCount(inputTokens)}
                  </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    Out: {formatTokenCount(outputTokens)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 5: Verify the build compiles**

```bash
cd client
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 6: Manual verification**

1. Start the server: `cd server && npm run dev`
2. Start the client: `cd client && npm run dev`
3. Open the app, ask a SQL question (e.g., "What are the top 5 customers by revenue?")
4. Open the DevPanel (gear icon on the right edge)
5. Verify the Token Usage section appears between "Active Model" and "Last Query"
6. Verify it shows "Schema Research" and "SQL Generation" rows
7. Verify each row shows a model badge and `In: Xk  Out: Y` values
8. Verify asking another question updates the values

- [ ] **Step 7: Commit**

```bash
git add client/src/components/DevPanel.jsx
git commit -m "feat: add per-phase token usage display to DevPanel"
```

---

## Final Commit Summary

After all tasks complete, the commit log should read:

```
feat: add per-phase token usage display to DevPanel
feat: add haiku and gpt model badges for token breakdown display
fix: update buildUsageBreakdown to use current graph nodeKeys and all model profiles
fix: attribute schema selection LLM tokens to contextFetch nodeKey
```
