# Chat UI Redesign — Narrative Flow

**Date:** 2026-03-19
**Status:** Approved
**Mockups:** `ui-mockup-response-card.html`, `ui-mockup-sidebar.html`, `ui-mockup-input-bar.html`, `ui-mockup-full-layout.html`

## Goal

Full UI redesign of the Auto Agents chat interface. Polish the existing glassmorphism aesthetic while overhauling how information is organized. Executive-first: insights lead, technical details are progressive disclosure.

## Design Decisions

### 1. Response Card — Narrative Flow

The core change. Replaces the current stacked layout (badges → entity card → tabs → insights) with a streamlined narrative card.

**Structure (top to bottom):**
1. **Header row** — confidence dot + "High confidence" text (left), row count (right). Replaces the loud colored classification badges.
2. **Headline insight** — bold 17px title extracted from the first LLM takeaway. Instant scanability.
3. **Narrative body** — 13.5px summary paragraph flowing naturally from the headline.
4. **Inline mini-chart** — small contextual bar chart with color-coded bars (green/yellow/red by threshold) and a dashed benchmark line. Embedded in the card, no tab switch needed.
5. **Additional insights** — blockquote-style with left border accent. Purple border = info, red border = risk callout.
6. **Follow Up button** — accent-colored pill button. Behavior: same as the current "Follow Up" button — sets a follow-up flag on the next message so the pipeline treats it as a continuation of the previous query context.
7. **Progressive disclosure pills** — "View table", "Full chart" (accent), "SQL", "Entities", "Copy" (muted). Technical details one click away, not in your face.

**What's removed from default view:**
- Classification badges (SQL_QUERY, MODERATE) — moved behind "Entities" pill
- Detected Entities card — moved behind "Entities" pill
- Tabbed Insights/Charts/Table — replaced by inline narrative + pills

### 2. Progress Timeline — Horizontal Track with Collapse

Replaces the current vertical `ProgressTimeline` component.

**Behavior:**
- Horizontal step track: Classify → Research → SQL Writer → Validate → Execute → Present
- Completed steps show green dots with checkmarks + duration
- Active step has pulsing indigo dot + spinner + tool badge (e.g., `submit_sql`)
- Total elapsed time in the header
- **On completion:** progress bar smoothly collapses (max-height + opacity transition), then response content expands downward from the same container

**Animation sequence:**
1. Progress bar is visible during processing, sits at top of the response wrapper
2. Pipeline steps advance left-to-right with animated transitions
3. When all steps complete, progress bar collapses with `0.6s` ease transition
4. After `300ms`, response content expands with `0.8s` cubic-bezier transition
5. Each child section (header, headline, narrative, chart, insights, pills) reveals with staggered `reveal-section` animation (0.15s apart)

**Implementation:** The progress bar and response card share one `.response-wrapper` container. The progress bar is a `<div>` at the top with `max-height` transition; the response content is below it with its own `max-height` transition. This ensures they are the same width.

### 3. Sidebar — Refined

Keeps the same structure, adds polish:

- **Date-grouped history** — "Today", "Yesterday", "Last Week" section headers replace the flat list
- **Relative timestamps** — "2m", "1h", "18h", "5d" right-aligned on each item
- **Tighter spacing** — slightly reduced padding to fit more items
- **Hover states** — subtle accent tint on hover; active item uses accent background + bold
- **Impersonate section** — unchanged, minor spacing tweaks

### 4. Input Bar — Simplified

- Single glass pill container with input field + mic button + send button
- No suggestion chips above the input (removed per user request)
- Placeholder: "Ask a new question..."
- Send button: gradient indigo with subtle hover lift
- Mic button: muted background, becomes more visible on hover

### 5. Empty State / Welcome Screen

The current `SuggestedQuestions.jsx` renders a welcome screen with logo, heading, typewriter facts, and initial suggestion chips when there are no messages. **This welcome screen is preserved as-is** — only the suggestion chips above the input bar (when messages exist) are removed.

## Components Affected

| Component | Change |
|-----------|--------|
| `ChatPanel.jsx` | Major — response rendering, progress integration, message layout |
| `ProgressTimeline.jsx` | Major — rewrite from vertical to horizontal, add collapse behavior |
| `ResultsPanel.jsx` | Major — replace tabs with inline narrative + progressive disclosure pills |
| `App.jsx` | Minor — sidebar date grouping, relative timestamps |
| `ThinkingPanel.jsx` | Removed — the new horizontal progress bar replaces its functionality. Detailed agent activity logs (tool calls, parallel discovery) are intentionally dropped from the default view; they remain accessible via the DevPanel for power users. |
| `index.css` | Moderate — new animation keyframes, updated tokens |
| `SuggestedQuestions.jsx` | No changes needed — component already only renders on empty state (welcome screen). |

## CSS Design Tokens (New/Changed)

```css
/* Animation keyframes to add */
@keyframes reveal-section { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse-dot { 0%,100% { box-shadow: 0 0 0 4px rgba(99,102,241,0.2); } 50% { box-shadow: 0 0 0 8px rgba(99,102,241,0.08); } }

/* Response wrapper */
--response-expand-duration: 0.8s;
--progress-collapse-duration: 0.6s;
--reveal-stagger: 0.15s;
```

## Preserved Features

All existing `ResultsPanel.jsx` features carry forward in the new layout — they are re-arranged, not removed:
- Partial streaming results during multi-query execution
- Zero-row guidance and retry suggestions
- Feedback thumbs-up/down
- Excel/CSV export (accessible via "View table" pill expansion)
- Model profile badges (Opus/Haiku) and token usage per step — moved to DevPanel only, not shown in the horizontal progress bar

## Out of Scope

- Dashboard/tile rendering (DashboardGrid, DashboardOverlay) — unchanged
- DevPanel — unchanged
- Voice input behavior — unchanged (just visual refinement of mic button)
- Backend/API changes — none
- Mobile responsive — follow-up work
