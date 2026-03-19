# Thinking Bubble Redesign — Design Spec

**Date:** 2026-03-19
**Status:** Approved

## Problem

The current "Analyzing your question..." progress UI uses `ProgressTimeline` which renders a dot-timeline with `_pending` placeholder nodes. It looks bulky, shows no reasoning text, and gives users no insight into what the AI is actually doing. The `ThinkingPanel` component exists but isn't rendered in the loading block.

## Solution

Replace `ProgressTimeline` with a new **ThinkingBubble** component that combines:

1. **Step-synced progress bar** — thin bar + "N of M" label at the top
2. **Step dot track** — small labeled dots showing pipeline stages (Classify, Research, SQL Write, Validate, Execute, Present)
3. **Streaming reasoning text** — real-time thinking lines in a fixed-height window with top-fade gradient
4. **Collapsible** — open by default, users can collapse to a single-line summary

## Visual Design

### Layout (top to bottom inside bubble)

```
┌──────────────────────────────────────────────┐
│ [===progress-bar===-------]  3 of 6          │  <- thin bar + label
│  ●───●───◉───○───○───○                       │  <- step dots (done/active/pending)
│  Cls  Res  SQL  Val  Exe  Pre                │  <- step labels
│                                              │
│  ● Thinking          4.6s           ▾        │  <- header (collapsible)
│  ┃                                           │
│  ┃ ░░ Classified as SQL_QUERY ░░░░░░░░░░░░░  │  <- faded (under gradient)
│  ┃ Found fact_sales, dim_customer            │
│  ┃ Verified join path: customer_key          │
│  ┃ Writing SQL with GROUP BY...█             │  <- cursor on latest line
│  ┃                                           │
└──────────────────────────────────────────────┘
```

### Reasoning Window

- **Fixed height: 100px** — does not grow or shrink with content
- **Bottom-anchored**: new lines push in from the bottom; content scrolls up
- **Top fade gradient**: CSS `::before` pseudo-element with gradient from bubble background color to transparent, ~36px tall. Older lines dissolve as they scroll up.
- **Blinking cursor** on the latest (bottom) line

### Step Dot Track

6 dot positions, each mapping to one or more server `node_complete` node names:

| Dot Label | Maps to `node_complete` names | Notes |
|-----------|-------------------------------|-------|
| Classify  | `classify` | Also covers `decompose`, `alignSubQueries` |
| Research  | `contextFetch` | The research/schema discovery phase |
| SQL Write | `generateSql` | SQL generation |
| Validate  | `injectRls`, `validate`, `correct` | Correction loops stay on this dot |
| Execute   | `execute`, `checkResults`, `diagnoseEmptyResults` | Empty-result retries stay here |
| Present   | `present` | Final step |

Unmapped nodes (`accumulateResult`, `parallelSubQueryPipeline`, `subQueryMatch`, `dashboardAgent`) do **not** advance the dot track — they are internal pipeline nodes. The progress bar and dot track only advance when a mapped node completes.

- **Done steps**: solid green dot (#10B981) + green label
- **Active step**: indigo dot (#6366F1) with pulse animation + outer glow shadow + indigo label
- **Pending steps**: faded gray dot + gray label
- **Connectors**: 1.5px lines between dots; green when both sides done, gradient when transitioning, gray when pending
- **Correction/retry loops**: progress stays on the current dot (Validate or Execute) — never regresses

### Progress Bar

- 3px tall, indigo gradient fill (`#6366F1` → `#818CF8`)
- Width = `(completedDotPositions / totalDotPositions) * 100%` where `totalDotPositions` = 6 (fixed)
- Label: "N of 6" in indigo, right-aligned
- Never jumps backward — correction loops do not decrement progress

### States

| State | Behavior |
|-------|----------|
| **Loading (open)** | Progress bar fills, dots advance, reasoning lines stream in, top-fade active |
| **Loading (collapsed)** | Progress bar + header only. Shows "Thinking" + elapsed + one-line summary of latest reasoning (truncated with ellipsis) |
| **Complete** | Bubble turns green gradient. Progress bar fills 100% green. Header shows checkmark + "Completed" + total duration. Auto-collapses. Expandable to review full reasoning log. |

### Styling

- **Bubble background**: `linear-gradient(135deg, #EEF2FF 0%, #E8E0FF 40%, #F0EEFF 100%)` — matches existing chat aesthetic
- **Complete background**: `linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 40%, #F5FFF9 100%)`
- **Border-radius**: `16px 16px 16px 4px` (chat bubble shape)
- **Shadow**: `0 1px 8px rgba(100,80,160,0.07)`
- **Entity highlighting**: deferred to a follow-up. For now, reasoning text renders as plain text. A future enhancement can detect table/column names via backtick-wrapped terms or schema lookup.

## Components

### New: `ThinkingBubble.jsx`

Replaces `ProgressTimeline` in the loading block of `ChatPanel.jsx`.

**Props:**
- `steps` — array of `{ node, status, duration }` from existing progress state
- `thinkingEntries` — array of `{ message, category, elapsed }` from SSE `thinking` events
- `startTime` — timestamp for elapsed calculation
- `activeTools` — currently running tools (for optional display)
- `isComplete` — boolean, set to `true` when `done` event fires

**Internal state (uncontrolled):**
- `collapsed` — boolean, defaults to `false` (open). User can toggle via chevron click. Auto-set to `true` when `isComplete` transitions to `true` (with 800ms delay so user sees the green state).
- Auto-scrolls reasoning to bottom on new entry

### Step count and progress

The dot track is always 6 positions. Progress = how many dot positions have been reached based on the node-to-dot mapping table above. This is derived from `steps[]` — not estimated.

- **Simple query**: traverses all 6 dots
- **Exact match**: skips Research + SQL Write + Validate, so dots 1, 5, 6 complete (progress jumps — this is fine)
- **Decomposed**: same 6 dots; parallel sub-pipelines are internal and don't affect the dot track

### Removed: `ProgressTimeline.jsx`

No longer imported or rendered. Can be deleted.

### Modified: `ChatPanel.jsx`

- Replace `<ProgressTimeline>` with `<ThinkingBubble>` in the `{loading && progress && (...)}` block (~line 948-985)
- Pass `thinkingEntries` (already in state) to the new component
- **Initial state**: keep `runStream` seeding `setProgress({ steps: [], ... startTime })` (empty steps, no `_pending`). ThinkingBubble renders all dots as "pending" with the first dot pulsing when `steps` is empty.
- **Remove `_pending`** from `streamOnEvent`'s `node_complete` handler (line 358). Instead, push the completed node directly: `steps.push({ node: eventData.node, status: 'completed', ... })`. ThinkingBubble derives the active dot from the mapping table.
- **`querySummary`, `partialQueries`, `streamingInsights`** continue to render **below** the ThinkingBubble in the same wrapper div, exactly as they do today below ProgressTimeline (lines 966-983). No change to their rendering.
- Add `isComplete` state, set to `true` in the `done` event handler. Delay clearing `progress` by 800ms so the green completion state is visible before unmount.

### Modified: `index.css`

- Remove unused animations: `pulse-step-dot`, `spin-progress`, `tool-badge-pulse`
- Keep: `subtle-pulse`, `blink` (cursor), existing bubble styles
- Add: top-fade gradient variable if needed

## Data Flow

```
SSE events → ChatPanel state → ThinkingBubble props
  - node_complete → steps[] updated (completed node appended, no _pending)
  - thinking → thinkingEntries[] appended
  - query_plan, query_progress, dashboard_progress → also appended to thinkingEntries[] (already handled by streamOnEvent)
  - tool_call/tool_result → activeTools[] (optional display)
  - done → sets isComplete=true, 800ms delay before clearing progress
```

No server changes needed. All existing SSE events provide the data. The `query_plan` event dynamically adds decompose info to `thinkingEntries` but does not change the dot track (decompose maps to the Classify dot position).

## Out of Scope

- ThinkingPanel (the separate agent activity component) — not modified, remains available for developer panel
- Dashboard progress / parallel discovery visualization — kept in ThinkingPanel, not migrated to ThinkingBubble
- Server-side changes — none needed
