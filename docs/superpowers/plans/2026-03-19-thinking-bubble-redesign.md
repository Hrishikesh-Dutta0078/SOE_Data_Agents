# ThinkingBubble Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `ProgressTimeline` with a new `ThinkingBubble` component that shows a step-synced progress bar, 6-position dot track, and streaming reasoning text in a collapsible chat bubble.

**Architecture:** Single new `ThinkingBubble.jsx` component with internal sub-components (ProgressBar, StepDotTrack, ReasoningWindow). ChatPanel passes existing SSE-driven state as props — no server changes needed. The component derives dot positions from a static node-to-dot mapping table.

**Tech Stack:** React 19, inline styles (matches existing ProgressTimeline pattern), lucide-react icons

**Spec:** `docs/superpowers/specs/2026-03-19-thinking-bubble-redesign-design.md`

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `client/src/index.css` | Remove 3 old animations, add 2 new + scrollbar-hide utility |
| Create | `client/src/components/ThinkingBubble.jsx` | New component: progress bar, dot track, reasoning window, collapse |
| Modify | `client/src/components/ChatPanel.jsx` | Swap import, add `isComplete` state, simplify event handlers, swap rendering |
| Delete | `client/src/components/ProgressTimeline.jsx` | Replaced by ThinkingBubble |

**Note:** No client test framework exists (no vitest/jest). Verification is via build check + manual browser testing.

---

## Task 1: Update CSS animations in index.css

**Files:**
- Modify: `client/src/index.css:259-271` (remove), append new block at end

- [ ] **Step 1: Remove old ProgressTimeline animations**

Delete these three `@keyframes` blocks (~lines 259-271):

```css
/* DELETE — pulse-step-dot (lines 259-262) */
@keyframes pulse-step-dot {
  0%, 100% { box-shadow: 0 0 0 4px rgba(99,102,241,0.2); }
  50% { box-shadow: 0 0 0 8px rgba(99,102,241,0.08); }
}

/* DELETE — spin-progress (lines 264-266) */
@keyframes spin-progress {
  to { transform: rotate(360deg); }
}

/* DELETE — tool-badge-pulse (lines 268-271) */
@keyframes tool-badge-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
```

Keep all other animations (`subtle-pulse`, `thinking-shimmer-bar`, `thinking-breathe`, `bounce-dot`, `thinking-entry-in`, `ripple-ring`).

- [ ] **Step 2: Add ThinkingBubble animations and scrollbar-hide utility**

Append at the end of `index.css`:

```css
/* ThinkingBubble */
@keyframes thinking-bubble-pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(99,102,241,0.2); }
  50% { box-shadow: 0 0 0 8px rgba(99,102,241,0.08); }
}

@keyframes thinking-bubble-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.thinking-bubble-scroll::-webkit-scrollbar { display: none; }
.thinking-bubble-scroll { scrollbar-width: none; }
```

- [ ] **Step 3: Commit**

```bash
git add client/src/index.css
git commit -m "style: swap ProgressTimeline animations for ThinkingBubble animations"
```

---

## Task 2: Create ThinkingBubble.jsx

**Files:**
- Create: `client/src/components/ThinkingBubble.jsx`

- [ ] **Step 1: Create the file with complete component code**

Write `client/src/components/ThinkingBubble.jsx`:

```jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Check } from 'lucide-react';

// ─── Node-to-dot mapping (spec table) ───────────────────────────
const DOT_CONFIG = [
  { label: 'Classify', short: 'Cls', nodes: ['classify', 'decompose', 'alignSubQueries'] },
  { label: 'Research', short: 'Res', nodes: ['contextFetch'] },
  { label: 'SQL Write', short: 'SQL', nodes: ['generateSql'] },
  { label: 'Validate', short: 'Val', nodes: ['injectRls', 'validate', 'correct'] },
  { label: 'Execute',  short: 'Exe', nodes: ['execute', 'checkResults', 'diagnoseEmptyResults'] },
  { label: 'Present',  short: 'Pre', nodes: ['present', 'dashboardAgent'] },
];
const TOTAL_DOTS = DOT_CONFIG.length;

/** Derive done/active/pending status for each dot position. */
function deriveDotStatuses(steps, isComplete) {
  const done = new Set(steps.filter(s => s.status === 'completed').map(s => s.node));
  const statuses = DOT_CONFIG.map(dot => ({
    ...dot,
    done: dot.nodes.some(n => done.has(n)),
  }));
  // Active = first dot after the highest completed dot
  let highest = -1;
  for (let i = statuses.length - 1; i >= 0; i--) {
    if (statuses[i].done) { highest = i; break; }
  }
  const activeIdx = isComplete ? -1 : Math.min(highest + 1, TOTAL_DOTS - 1);
  return statuses.map((d, i) => ({
    ...d,
    status: d.done ? 'done' : i === activeIdx ? 'active' : 'pending',
  }));
}

/** Count how many dot positions have at least one completed node. */
function countCompletedDots(steps) {
  const done = new Set(steps.filter(s => s.status === 'completed').map(s => s.node));
  return DOT_CONFIG.filter(dot => dot.nodes.some(n => done.has(n))).length;
}

// ─── ProgressBar ────────────────────────────────────────────────
function ProgressBar({ completed, total, isComplete }) {
  const pct = (completed / total) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(99,102,241,0.12)' }}>
        <div style={{
          height: '100%', borderRadius: 2, width: `${pct}%`,
          background: isComplete
            ? 'linear-gradient(90deg, #10B981, #34D399)'
            : 'linear-gradient(90deg, #6366F1, #818CF8)',
          transition: 'width 0.5s ease',
        }} />
      </div>
      <span style={{
        fontSize: 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
        color: isComplete ? '#10B981' : '#6366F1', minWidth: 36, textAlign: 'right',
      }}>
        {completed} of {total}
      </span>
    </div>
  );
}

// ─── StepDotTrack ───────────────────────────────────────────────
function connectorColor(left, right) {
  if (left.done && right.done) return '#10B981';
  if (left.done && right.status === 'active') return 'linear-gradient(90deg, #10B981, #6366F1)';
  return 'rgba(156,163,175,0.3)';
}

function StepDotTrack({ dotStatuses }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 10 }}>
      {dotStatuses.map((dot, i) => (
        <div key={dot.label} style={{ display: 'contents' }}>
          {/* Connector line — marginTop centers it with 8px dots */}
          {i > 0 && (
            <div style={{
              width: 20, height: 1.5, flexShrink: 0, marginTop: 4,
              background: connectorColor(dotStatuses[i - 1], dot),
              transition: 'background 0.4s ease',
            }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 32 }}>
            <div style={{
              width: dot.status === 'active' ? 10 : 8,
              height: dot.status === 'active' ? 10 : 8,
              borderRadius: '50%',
              background: dot.done ? '#10B981' : dot.status === 'active' ? '#6366F1' : 'rgba(156,163,175,0.35)',
              boxShadow: dot.status === 'active' ? '0 0 0 4px rgba(99,102,241,0.2)' : 'none',
              animation: dot.status === 'active' ? 'thinking-bubble-pulse 2s ease-in-out infinite' : 'none',
              transition: 'all 0.4s ease',
            }} />
            <span style={{
              fontSize: 9, fontWeight: 500, marginTop: 3,
              color: dot.done ? '#10B981' : dot.status === 'active' ? '#6366F1' : 'rgba(156,163,175,0.6)',
              transition: 'color 0.4s ease',
            }}>
              {dot.short}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ReasoningWindow ────────────────────────────────────────────
function ReasoningWindow({ entries, isComplete }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [entries.length]);

  return (
    <div style={{ position: 'relative', height: 100, overflow: 'hidden', marginTop: 4 }}>
      {/* Top-fade gradient */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 36,
        background: isComplete
          ? 'linear-gradient(to bottom, #ECFDF5 0%, transparent 100%)'
          : 'linear-gradient(to bottom, #EEF2FF 0%, transparent 100%)',
        zIndex: 1, pointerEvents: 'none',
      }} />
      {/* Scrollable entries */}
      <div ref={scrollRef} className="thinking-bubble-scroll" style={{
        height: '100%', overflowY: 'auto', padding: '8px 0 4px 12px',
      }}>
        {entries.map((entry, i) => (
          <div key={i} style={{
            display: 'flex', gap: 8, padding: '2px 0',
            fontSize: 12, color: 'rgba(55,48,107,0.75)',
            fontFamily: 'ui-monospace, monospace', lineHeight: 1.5,
          }}>
            <span style={{ color: 'rgba(99,102,241,0.3)', userSelect: 'none' }}>|</span>
            <span>
              {entry.message}
              {i === entries.length - 1 && !isComplete && (
                <span style={{ animation: 'thinking-bubble-blink 1s step-end infinite' }}>_</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ThinkingBubble (main) ──────────────────────────────────────
export default function ThinkingBubble({
  steps = [],
  thinkingEntries = [],
  startTime,
  activeTools = [],
  isComplete = false,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Tick elapsed every 200ms while running
  useEffect(() => {
    if (!startTime || isComplete) return;
    const id = setInterval(() => setElapsed((Date.now() - startTime) / 1000), 200);
    return () => clearInterval(id);
  }, [startTime, isComplete]);

  // Freeze elapsed on completion
  useEffect(() => {
    if (isComplete && startTime) setElapsed((Date.now() - startTime) / 1000);
  }, [isComplete, startTime]);

  // Auto-collapse 800ms after completion
  useEffect(() => {
    if (isComplete) {
      const t = setTimeout(() => setCollapsed(true), 800);
      return () => clearTimeout(t);
    }
  }, [isComplete]);

  const dotStatuses = useMemo(() => deriveDotStatuses(steps, isComplete), [steps, isComplete]);
  const completedCount = useMemo(() => countCompletedDots(steps), [steps]);
  const latestEntry = thinkingEntries[thinkingEntries.length - 1] ?? null;

  const bubbleBg = isComplete
    ? 'linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 40%, #F5FFF9 100%)'
    : 'linear-gradient(135deg, #EEF2FF 0%, #E8E0FF 40%, #F0EEFF 100%)';

  return (
    <div style={{
      background: bubbleBg,
      borderRadius: '16px 16px 16px 4px',
      boxShadow: '0 1px 8px rgba(100,80,160,0.07)',
      padding: '12px 16px',
      maxWidth: 520,
      transition: 'background 0.5s ease',
    }}>
      <ProgressBar
        completed={isComplete ? TOTAL_DOTS : completedCount}
        total={TOTAL_DOTS}
        isComplete={isComplete}
      />

      {!collapsed && <StepDotTrack dotStatuses={dotStatuses} />}

      {/* Collapsible header */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', userSelect: 'none', padding: '2px 0',
        }}
      >
        {isComplete
          ? <Check size={14} style={{ color: '#10B981' }} />
          : <span style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: '#6366F1',
              animation: 'thinking-bubble-pulse 2s ease-in-out infinite',
            }} />
        }
        <span style={{
          fontSize: 13, fontWeight: 600,
          color: isComplete ? '#10B981' : '#4338CA',
        }}>
          {isComplete ? 'Completed' : 'Thinking'}
        </span>
        <span style={{
          fontSize: 11, color: 'rgba(100,80,160,0.5)',
          fontVariantNumeric: 'tabular-nums', marginLeft: 'auto',
        }}>
          {elapsed.toFixed(1)}s
        </span>
        <ChevronDown size={14} style={{
          color: 'rgba(100,80,160,0.4)',
          transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s ease',
        }} />
      </div>

      {/* Collapsed: one-line summary */}
      {collapsed && latestEntry && (
        <div style={{
          fontSize: 11, color: 'rgba(55,48,107,0.5)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginTop: 2, paddingLeft: 22,
        }}>
          {latestEntry.message}
        </div>
      )}

      {/* Expanded: streaming reasoning (hidden when no entries yet) */}
      {!collapsed && thinkingEntries.length > 0 && (
        <ReasoningWindow entries={thinkingEntries} isComplete={isComplete} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd client && npx vite build --mode development 2>&1 | tail -5
```

Expected: Build succeeds (ThinkingBubble is not imported yet, but syntax must be valid JSX).

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ThinkingBubble.jsx
git commit -m "feat: add ThinkingBubble component with progress bar, dot track, reasoning window"
```

---

## Task 3: Wire ThinkingBubble into ChatPanel.jsx

**Files:**
- Modify: `client/src/components/ChatPanel.jsx`

Reference line numbers from the current file (verify before editing — lines may shift after earlier edits):

| Section | Approx. Lines | What to change |
|---------|---------------|----------------|
| Import | 7 | Swap ProgressTimeline -> ThinkingBubble |
| State | after ~112 | Add `isComplete` state |
| `runStream` init | ~438 | Remove `_pending`, add `setIsComplete(false)` |
| `node_complete` handler | ~345-360 | Simplify: append completed node directly |
| `done` handler | ~425-433 | Add `setIsComplete(true)` |
| `finally` block | after done handler in runStream | Delay `setProgress(null)` by 800ms |
| Rendering | ~948-985 | Swap component + change condition |

- [ ] **Step 1: Swap import (line 7)**

Change:
```js
import ProgressTimeline from './ProgressTimeline';
```
To:
```js
import ThinkingBubble from './ThinkingBubble';
```

- [ ] **Step 2: Add `isComplete` state**

After the existing state declarations (~line 112), add:
```js
const [isComplete, setIsComplete] = useState(false);
```

- [ ] **Step 3: Simplify `runStream` progress initialization (~line 438)**

Change:
```js
setProgress({ steps: [{ node: '_pending', status: 'active' }], usage: {}, startTime });
```
To:
```js
setProgress({ steps: [], usage: {}, startTime });
setIsComplete(false);
```

- [ ] **Step 4: Simplify `node_complete` handler (~lines 345-360)**

Replace the entire `case 'node_complete'` body. The old code maps through steps to mark `_pending` as completed then pushes a new `_pending`. Replace with:

```js
case 'node_complete': {
  setActiveTools([]);
  nodeDurationsRef.current[eventData.node] = eventData.duration;
  setProgress(prev => ({
    ...prev,
    steps: [
      ...prev.steps,
      {
        node: eventData.node,
        status: 'completed',
        duration: eventData.duration,
        summary: eventData.summary,
        model: eventData.model,
      },
    ],
    usage: { ...prev.usage, ...eventData.usage },
  }));
  break;
}
```

Key change: no more `_pending` entries. Steps array only contains completed nodes. ThinkingBubble derives the active dot from the mapping table.

- [ ] **Step 5: Set `isComplete` in `done` handler (~lines 425-433)**

Add `setIsComplete(true);` inside the `case 'done':` block, after the existing `onMetricsUpdate` call:

```js
case 'done':
  onMetricsUpdate?.({
    usageByNodeAndModel: eventData.usageByNodeAndModel,
    nodeDurations: nodeDurationsRef.current,
  });
  nodeDurationsRef.current = {};
  setIsComplete(true);
  break;
```

- [ ] **Step 6: Delay progress clearing in the `finally` block of `runStream`**

Find where `setProgress(null)` is called in the `finally` block. Wrap it in a timeout so the green completion state is visible before unmount:

Change:
```js
setProgress(null);
```
To:
```js
setTimeout(() => {
  setProgress(null);
  setIsComplete(false);
}, 800);
```

Keep `setLoading(false)` immediate (outside the timeout) — loading controls input availability, which should unlock immediately.

- [ ] **Step 7: Swap rendering block (~lines 948-985)**

Two changes in the rendering block:

**a) Change the outer condition** from:
```jsx
{loading && progress && (
```
To:
```jsx
{progress && (
```

This keeps ThinkingBubble visible during the 800ms delay after `setLoading(false)`.

**b) Replace the ProgressTimeline component** (~lines 959-965):

```jsx
{/* OLD — delete this */}
<ProgressTimeline
  steps={progress.steps}
  usage={progress.usage}
  startTime={progress.startTime}
  activeTools={activeTools}
  collapsed={false}
/>
```

```jsx
{/* NEW — replace with this */}
<ThinkingBubble
  steps={progress.steps}
  thinkingEntries={thinkingEntries}
  startTime={progress.startTime}
  activeTools={activeTools}
  isComplete={isComplete}
/>
```

Leave the `querySummary`, `partialQueries`, and `streamingInsights` sections below unchanged — they render below the ThinkingBubble exactly as they did below ProgressTimeline.

- [ ] **Step 8: Apply same delay to `handleClarificationSubmit` finally block (~lines 591-600)**

`handleClarificationSubmit` has its own `runStream` call with a separate `finally` block that also clears progress. Apply the same 800ms delay pattern. Find the `finally` block in `handleClarificationSubmit` and change:

```js
setProgress(null);
```
To:
```js
setTimeout(() => {
  setProgress(null);
  setIsComplete(false);
}, 800);
```

Also add `setIsComplete(true);` in the `done` handler within `handleClarificationSubmit`'s `streamOnEvent` if it has its own (verify — it may reuse the same handler).

- [ ] **Step 9: Build verify**

```bash
cd client && npx vite build 2>&1 | tail -5
```

Expected: Build succeeds with no errors.

- [ ] **Step 10: Commit**

```bash
git add client/src/components/ChatPanel.jsx
git commit -m "feat: wire ThinkingBubble into ChatPanel, remove _pending step logic"
```

---

## Task 4: Delete ProgressTimeline and verify

**Files:**
- Delete: `client/src/components/ProgressTimeline.jsx`

- [ ] **Step 1: Verify no remaining imports**

```bash
grep -r "ProgressTimeline" client/src/
```

Expected: No matches (import was swapped in Task 3).

- [ ] **Step 2: Delete ProgressTimeline.jsx**

```bash
rm client/src/components/ProgressTimeline.jsx
```

- [ ] **Step 3: Build verify**

```bash
cd client && npx vite build 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 4: Visual verification**

```bash
cd client && npm run dev
```

Open browser to `http://localhost:5174`. Submit a test query and verify:

- [ ] Indigo progress bar fills left-to-right, "N of 6" label increments
- [ ] Step dots advance: green (done), pulsing indigo (active), gray (pending)
- [ ] Connectors between dots change color: green (both done), gradient (transitioning), gray (pending)
- [ ] Reasoning text streams in the fixed 100px window
- [ ] Top-fade gradient dissolves older lines as they scroll up
- [ ] Blinking cursor on the latest line
- [ ] Clicking header row toggles collapse/expand
- [ ] Collapsed state shows progress bar + "Thinking" + elapsed + one-line summary
- [ ] On completion: bubble turns green, checkmark icon, "Completed", auto-collapses after ~800ms
- [ ] Expanding after completion shows full reasoning log
- [ ] `querySummary`, `partialQueries`, `streamingInsights` still render below the bubble
- [ ] Exact-match queries work (dots jump — Research/SQL Write stay gray)
- [ ] Decomposed multi-part queries work (dot track doesn't regress)

- [ ] **Step 5: Commit**

```bash
git rm client/src/components/ProgressTimeline.jsx
git commit -m "chore: delete ProgressTimeline (replaced by ThinkingBubble)"
```
