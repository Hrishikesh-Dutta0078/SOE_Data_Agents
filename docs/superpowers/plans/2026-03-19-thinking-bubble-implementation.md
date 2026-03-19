# ThinkingBubble UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bulky `ProgressTimeline` component with a new `ThinkingBubble` that streams real-time reasoning text in a fixed-height window with top-fade, synced to pipeline step dots and a progress bar.

**Architecture:** A new `client/src/components/ThinkingBubble.jsx` receives `steps[]`, `thinkingEntries[]`, `startTime`, and `isComplete` as props. It derives dot-track position from a node-to-dot mapping table, manages its own collapsed state, and auto-collapses with an 800ms delay on completion. `ChatPanel.jsx` is updated to use it, remove `_pending` logic, and add `isComplete` state.

**Tech Stack:** React 19, Tailwind CSS v4, existing SSE event infrastructure (no server changes)

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `client/src/components/ThinkingBubble.jsx` | **Create** | New component — full thinking UI |
| `client/src/components/ChatPanel.jsx` | **Modify** | Swap import, remove `_pending`, add `isComplete` state, 800ms delay |
| `client/src/components/ProgressTimeline.jsx` | **Delete** | No longer used |
| `client/src/index.css` | **Modify** | Remove 3 unused animations, add cursor-blink if missing |

---

## Task 1: Create `ThinkingBubble.jsx`

**Files:**
- Create: `client/src/components/ThinkingBubble.jsx`

### Node-to-dot mapping (bake this into the component)

```js
// Maps server node_complete names to dot-track index (0-5)
const NODE_TO_DOT = {
  classify:             0,
  decompose:            0,
  alignSubQueries:      0,
  contextFetch:         1,
  generateSql:          2,
  injectRls:            3,
  validate:             3,
  correct:              3,
  execute:              4,
  checkResults:         4,
  diagnoseEmptyResults: 4,
  present:              5,
  // unmapped: accumulateResult, parallelSubQueryPipeline, subQueryMatch, dashboardAgent
};

const DOT_LABELS = ['Classify', 'Research', 'SQL Write', 'Validate', 'Execute', 'Present'];
const TOTAL_DOTS = 6;
```

### Progress derivation from `steps[]`

```js
// steps = [{ node, status, duration }, ...]
// A dot is "done" if any step with that dot index has status === 'completed'
// A dot is "active" if it is the highest dot index seen so far and not yet done
function deriveProgress(steps) {
  const reached = new Set();
  for (const s of steps) {
    const idx = NODE_TO_DOT[s.node];
    if (idx != null) reached.add(idx);
  }
  // highest reached index is "active", everything before is "done"
  const maxReached = reached.size > 0 ? Math.max(...reached) : -1;
  return DOT_LABELS.map((label, i) => ({
    label,
    status: i < maxReached ? 'done' : i === maxReached ? 'active' : 'pending',
  }));
}
```

- [ ] **Step 1: Create the component file**

```jsx
// client/src/components/ThinkingBubble.jsx
import React, { useRef, useEffect, useState } from 'react';

const NODE_TO_DOT = {
  classify: 0, decompose: 0, alignSubQueries: 0,
  contextFetch: 1,
  generateSql: 2,
  injectRls: 3, validate: 3, correct: 3,
  execute: 4, checkResults: 4, diagnoseEmptyResults: 4,
  present: 5,
};
const DOT_LABELS = ['Classify', 'Research', 'SQL Write', 'Validate', 'Execute', 'Present'];
const TOTAL_DOTS = 6;

function deriveProgress(steps) {
  const reached = new Set();
  for (const s of steps) {
    const idx = NODE_TO_DOT[s.node];
    if (idx != null) reached.add(idx);
  }
  const maxReached = reached.size > 0 ? Math.max(...reached) : -1;
  return DOT_LABELS.map((label, i) => ({
    label,
    status: i < maxReached ? 'done' : i === maxReached ? 'active' : 'pending',
  }));
}

function formatElapsed(ms) {
  if (!ms) return '0s';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export default function ThinkingBubble({ steps = [], thinkingEntries = [], startTime, isComplete = false, activeTools = [] }) {
  const [collapsed, setCollapsed] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const streamRef = useRef(null);

  // Elapsed timer
  useEffect(() => {
    if (isComplete) return;
    const id = setInterval(() => setElapsed(Date.now() - startTime), 200);
    return () => clearInterval(id);
  }, [startTime, isComplete]);

  // Auto-collapse 800ms after completion
  useEffect(() => {
    if (!isComplete) return;
    const id = setTimeout(() => setCollapsed(true), 800);
    return () => clearTimeout(id);
  }, [isComplete]);

  // Auto-scroll reasoning to bottom on new entries
  useEffect(() => {
    if (streamRef.current && !collapsed) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [thinkingEntries, collapsed]);

  const dots = deriveProgress(steps);
  const completedDots = dots.filter(d => d.status === 'done').length;
  // active dot counts as half-complete for smoother bar feel
  const activeDot = dots.find(d => d.status === 'active');
  const progressPct = Math.min(
    100,
    ((completedDots + (activeDot ? 0.5 : 0)) / TOTAL_DOTS) * 100
  );
  const progressLabel = isComplete ? 'Done' : `${completedDots} of ${TOTAL_DOTS}`;

  const latestEntry = thinkingEntries[thinkingEntries.length - 1];
  const totalElapsed = isComplete ? elapsed : elapsed;

  const bubbleBg = isComplete
    ? 'linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 40%, #F5FFF9 100%)'
    : 'linear-gradient(135deg, #EEF2FF 0%, #E8E0FF 40%, #F0EEFF 100%)';

  const barColor = isComplete
    ? '#10B981'
    : 'linear-gradient(90deg, #6366F1, #818CF8)';

  return (
    <div style={{
      background: bubbleBg,
      borderRadius: '16px 16px 16px 4px',
      boxShadow: '0 1px 8px rgba(100,80,160,0.07)',
      overflow: 'hidden',
      transition: 'background 0.5s ease',
    }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px 0 18px' }}>
        <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(99,102,241,0.1)', overflow: 'hidden' }}>
          <div style={{
            width: `${progressPct}%`,
            height: '100%',
            borderRadius: 2,
            background: barColor,
            transition: 'width 0.6s ease',
          }} />
        </div>
        <span style={{
          fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
          color: isComplete ? '#10B981' : '#6366F1',
        }}>
          {progressLabel}
        </span>
      </div>

      {/* Step dot track */}
      <div style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 18px 0 18px' }}>
        {dots.map((dot, i) => (
          <React.Fragment key={dot.label}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: dot.status === 'done' ? '#10B981' : dot.status === 'active' ? '#6366F1' : 'rgba(200,195,220,0.3)',
                boxShadow: dot.status === 'active' ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
                animation: dot.status === 'active' ? 'subtle-pulse 1.5s ease-in-out infinite' : 'none',
                transition: 'background 0.3s ease',
              }} />
              <span style={{
                fontSize: 7, fontWeight: 600, whiteSpace: 'nowrap',
                color: dot.status === 'done' ? '#10B981' : dot.status === 'active' ? '#6366F1' : '#A8A29E',
              }}>
                {dot.label}
              </span>
            </div>
            {i < TOTAL_DOTS - 1 && (
              <div style={{
                flex: 1, height: 1.5, alignSelf: 'flex-start', marginTop: 3, margin: '3px 3px 0 3px',
                background: dot.status === 'done' && dots[i + 1]?.status !== 'pending'
                  ? '#10B981'
                  : dot.status === 'done' && dots[i + 1]?.status === 'active'
                  ? 'linear-gradient(90deg, #10B981, #6366F1)'
                  : dot.status === 'done'
                  ? '#10B981'
                  : 'rgba(200,195,220,0.25)',
                transition: 'background 0.3s ease',
              }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Collapsible header */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 18px 0 18px',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        {isComplete ? (
          <svg style={{ width: 14, height: 14, color: '#10B981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <div style={{
            width: 6, height: 6, borderRadius: '50%', background: '#6366F1',
            animation: 'subtle-pulse 1.5s ease-in-out infinite',
          }} />
        )}
        <span style={{ fontSize: 12, fontWeight: 600, color: isComplete ? '#10B981' : '#6366F1' }}>
          {isComplete ? 'Completed' : 'Thinking'}
        </span>
        <span style={{ fontSize: 11, color: '#A8A29E', fontVariantNumeric: 'tabular-nums' }}>
          {formatElapsed(totalElapsed)}
        </span>
        {collapsed && latestEntry && (
          <span style={{
            marginLeft: 'auto', fontSize: 11, color: '#78716C', fontWeight: 500,
            maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {latestEntry.message}
          </span>
        )}
        <svg
          style={{
            marginLeft: collapsed ? 4 : 'auto', width: 14, height: 14, color: '#A8A29E', flexShrink: 0,
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Reasoning stream — fixed height, top-fade */}
      {!collapsed && (
        <div style={{ position: 'relative', margin: '8px 18px 14px 22px', height: 100, overflow: 'hidden' }}>
          {/* Top fade gradient */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 36, zIndex: 1, pointerEvents: 'none',
            background: isComplete
              ? 'linear-gradient(to bottom, rgba(236,253,245,1) 0%, rgba(236,253,245,0.7) 40%, rgba(236,253,245,0) 100%)'
              : 'linear-gradient(to bottom, rgba(235,231,255,1) 0%, rgba(235,231,255,0.7) 40%, rgba(235,231,255,0) 100%)',
          }} />
          {/* Scrollable content anchored to bottom */}
          <div
            ref={streamRef}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              maxHeight: '100%', overflowY: 'auto',
              borderLeft: '2px solid rgba(99,102,241,0.15)', paddingLeft: 12,
            }}
          >
            {thinkingEntries.length === 0 ? (
              <div style={{ fontSize: 13, color: '#A8A29E', lineHeight: 1.65 }}>Starting...</div>
            ) : (
              thinkingEntries.map((entry, i) => {
                const isLast = i === thinkingEntries.length - 1;
                return (
                  <div key={i} style={{ fontSize: 13, color: '#57534E', lineHeight: 1.65, marginBottom: 3 }}>
                    {entry.message}
                    {isLast && !isComplete && (
                      <span style={{
                        display: 'inline-block', width: 2, height: 14,
                        background: '#6366F1', marginLeft: 2, verticalAlign: 'text-bottom',
                        animation: 'cursor-blink 0.8s steps(2) infinite',
                      }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
      {/* Bottom padding when collapsed */}
      {collapsed && <div style={{ height: 12 }} />}
    </div>
  );
}
```

- [ ] **Step 2: Verify the file was created correctly**

Check: `client/src/components/ThinkingBubble.jsx` exists and has no syntax errors.

Run: `cd client && node --input-type=module <<< "import('./src/components/ThinkingBubble.jsx').catch(e => console.error(e.message))" 2>&1 | head -5`

Expected: no output (or a module not found for React — that's fine, it means the file parsed OK in Node context)

---

## Task 2: Update `ChatPanel.jsx`

**Files:**
- Modify: `client/src/components/ChatPanel.jsx`

### 2a — Swap import

- [ ] **Step 1: Replace ProgressTimeline import with ThinkingBubble**

In `client/src/components/ChatPanel.jsx` line 7, change:
```js
import ProgressTimeline from './ProgressTimeline';
```
to:
```js
import ThinkingBubble from './ThinkingBubble';
```

### 2b — Add `isComplete` state and ref

- [ ] **Step 2: Add `isComplete` state and ref near the other state declarations (~line 113)**

After:
```js
const [confidence, setConfidence] = useState(null);
```
Add:
```js
const [isQueryComplete, setIsQueryComplete] = useState(false);
const isQueryCompleteRef = useRef(false);
```

The ref is needed so the `finally` block in `handleSend` can read the completion status without stale closure issues.

### 2c — Reset `isComplete` on new query

- [ ] **Step 3: Reset `isQueryComplete` in `runStream` alongside other resets (~line 441-445)**

In the `runStream` body, find:
```js
setConfidence(null);
```
Add after it:
```js
setIsQueryComplete(false);
isQueryCompleteRef.current = false;
```

### 2d — Seed `progress` with empty steps (remove `_pending`)

- [ ] **Step 4: Remove `_pending` from the initial progress seed (~line 438)**

Change:
```js
setProgress({ steps: [{ node: '_pending', status: 'active' }], usage: {}, startTime });
```
to:
```js
setProgress({ steps: [], usage: {}, startTime });
```

### 2e — Remove `_pending` push from `node_complete` handler

- [ ] **Step 5: Update the `node_complete` branch in `streamOnEvent` (~lines 351-360)**

Find:
```js
const steps = prev.steps
  .map((s) =>
    s.status === 'active'
      ? { ...s, node: eventData.node, status: 'completed', duration: eventData.duration, summary: eventData.summary, model: eventData.model }
      : s
  );
steps.push({ node: '_pending', status: 'active' });
return { ...prev, steps, usage: eventData.usage || prev.usage };
```

Replace with:
```js
const steps = [
  ...prev.steps,
  { node: eventData.node, status: 'completed', duration: eventData.duration, summary: eventData.summary, model: eventData.model },
];
return { ...prev, steps, usage: eventData.usage || prev.usage };
```

### 2f — Set `isComplete` with 800ms delay on `done` event

- [ ] **Step 6: Add `isQueryComplete` trigger in the `done` handler (~line 425-433)**

Find:
```js
} else if (eventType === 'done') {
  if (onMetricsUpdate) {
    onMetricsUpdate({
      usageByNodeAndModel: eventData.usageByNodeAndModel || null,
      nodeDurations: { ...nodeDurationsRef.current },
    });
  }
  nodeDurationsRef.current = {};
}
```

Replace with:
```js
} else if (eventType === 'done') {
  if (onMetricsUpdate) {
    onMetricsUpdate({
      usageByNodeAndModel: eventData.usageByNodeAndModel || null,
      nodeDurations: { ...nodeDurationsRef.current },
    });
  }
  nodeDurationsRef.current = {};
  setIsQueryComplete(true);
  isQueryCompleteRef.current = true;
}
```

### 2f.2 — Delay `setProgress(null)` in `handleSend` finally block

The `finally` block of `handleSend` (line 491-494) immediately clears progress. We need an 800ms delay when the query completed successfully, so the green ThinkingBubble state is visible before unmount.

- [ ] **Step 6b: Update the `handleSend` finally block (~line 491-494)**

Find:
```js
    } finally {
      setProgress(null);
      setLoading(false);
    }
```

Replace with:
```js
    } finally {
      if (isQueryCompleteRef.current) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      setProgress(null);
      setLoading(false);
    }
```

This uses the ref (not state) so there's no stale closure issue inside the async function.

---

### 2g — Swap the render block

- [ ] **Step 7: Replace `<ProgressTimeline ...>` with `<ThinkingBubble ...>` (~lines 959-965)**

Find (lines 959-965):
```jsx
<ProgressTimeline
  steps={progress.steps}
  usage={progress.usage}
  startTime={progress.startTime}
  activeTools={activeTools}
  collapsed={false}
/>
```

Replace with:
```jsx
<ThinkingBubble
  steps={progress.steps}
  thinkingEntries={thinkingEntries}
  startTime={progress.startTime}
  isComplete={isQueryComplete}
  activeTools={activeTools}
/>
```

- [ ] **Step 8: Verify the outer wrapper div still matches**

The outer `div` at line 949-957 that wraps the timeline should still be there — it provides the card background and border. Keep it as-is. The `<div className="px-5 pb-4">` block below for `querySummary`/`partialQueries`/`streamingInsights` also stays unchanged.

---

## Task 3: Clean up CSS

**Files:**
- Modify: `client/src/index.css`

- [ ] **Step 1: Remove 3 unused animations (~lines 259-271)**

Remove these three `@keyframes` blocks (they are only used by ProgressTimeline which is being deleted):

```css
@keyframes pulse-step-dot {
  0%, 100% { box-shadow: 0 0 0 4px rgba(99,102,241,0.2); }
  50% { box-shadow: 0 0 0 8px rgba(99,102,241,0.08); }
}

@keyframes spin-progress {
  to { transform: rotate(360deg); }
}

@keyframes tool-badge-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
```

- [ ] **Step 2: Verify `cursor-blink` animation exists**

Check `client/src/index.css` for `cursor-blink`. It should already exist around line 226:
```css
@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

If it does not exist, add it in the Thinking panel animations section. If it exists, no change needed.

- [ ] **Step 3: Verify `subtle-pulse` animation exists**

Check `client/src/index.css` for `subtle-pulse`. It should exist around line 159. If it does, no change needed.

---

## Task 4: Delete `ProgressTimeline.jsx`

**Files:**
- Delete: `client/src/components/ProgressTimeline.jsx`

- [ ] **Step 1: Confirm no other imports**

Run: `grep -r "ProgressTimeline" client/src/ --include="*.jsx" --include="*.js"`

Expected: no output (import was removed in Task 2).

- [ ] **Step 2: Delete the file**

Run: `rm client/src/components/ProgressTimeline.jsx`

---

## Task 5: Smoke test in the browser

No automated tests exist for UI components in this project (the test suite is Node `--test` for server-side logic). Verify manually:

- [ ] **Step 1: Start the dev servers**

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

- [ ] **Step 2: Verify loading state**

Send a question in the chat UI. During processing:
- ThinkingBubble should appear with indigo bubble background
- Dot track: first dot (Classify) pulses, rest are gray
- Progress bar starts near 0
- Reasoning window shows "Starting..." then lines stream in
- As nodes complete, dots turn green, bar advances

- [ ] **Step 3: Verify step advancement**

Watch the dots advance through Research → SQL Write → Validate → Execute → Present as the pipeline progresses. Progress label should read "1 of 6", "2 of 6", etc.

- [ ] **Step 4: Verify completion state**

On completion:
- Bubble turns green gradient
- Progress bar fills 100% green, label reads "Done"
- Header shows checkmark + "Completed" + elapsed time
- After ~800ms, bubble auto-collapses

- [ ] **Step 5: Verify collapse/expand toggle**

Click the chevron to expand the completed bubble and see the full reasoning log.

- [ ] **Step 6: Verify reasoning window height is fixed**

The reasoning window should not grow taller as lines accumulate. Old lines should scroll up and disappear under the top-fade gradient.

---

## Task 6: Commit

- [ ] **Step 1: Stage and commit**

```bash
cd /path/to/repo
git add client/src/components/ThinkingBubble.jsx
git add client/src/components/ChatPanel.jsx
git add client/src/index.css
git rm client/src/components/ProgressTimeline.jsx
git commit -m "feat: replace ProgressTimeline with ThinkingBubble — streaming reasoning, step dots, fixed-height fade window"
```

---

## Notes for implementer

- The outer `div` wrapper in `ChatPanel.jsx` (lines 949-957, `rgba(255,255,255,0.55)` card) is **not** part of ThinkingBubble — it provides the card chrome. ThinkingBubble provides its own gradient bubble bg inside that card.
- The `querySummary`, `partialQueries`, `streamingInsights` block (lines 966-983) renders below ThinkingBubble unchanged.
- `ProgressTimeline` had a `collapsed` prop — it was always passed as `false` from ChatPanel. The new ThinkingBubble manages its own collapsed state internally.
- No server changes. No auth changes. No test file changes needed.
