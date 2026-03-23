# Chat UI Redesign — Narrative Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the chat UI to be executive-first — insights lead, technical details on demand — while polishing the existing glassmorphism aesthetic.

**Architecture:** Replace the current stacked badges→entities→tabs→insights layout with a Narrative Flow response card where the headline insight leads, an inline mini-chart is embedded, and table/SQL/entities are behind progressive disclosure pills. The vertical progress timeline becomes a horizontal track that collapses when complete, expanding the response card below it with staggered animations.

**Tech Stack:** React 19, Tailwind CSS v4, Vite, recharts, lucide-react

**Spec:** `docs/superpowers/specs/2026-03-19-chat-ui-redesign-design.md`
**Mockups:** `ui-mockup-response-card.html` (primary — full interactive demo with animation)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `client/src/index.css` | Modify | Add new animation keyframes + CSS tokens |
| `client/src/components/ProgressTimeline.jsx` | Rewrite | Horizontal track with collapse behavior |
| `client/src/components/NarrativeCard.jsx` | Create | New response card: headline, narrative, mini-chart, insight blocks, pills |
| `client/src/components/ChatPanel.jsx` | Modify | Wire NarrativeCard + new ProgressTimeline, remove ThinkingPanel |
| `client/src/components/ResultsPanel.jsx` | Modify | Add `initialTab` prop to support rendering chart-only from NarrativeCard |
| `client/src/App.jsx` | Modify | Sidebar date groups + relative timestamps |

**Unchanged:** `SuggestedQuestions.jsx`, `DashboardOverlay.jsx`, `DashboardGrid.jsx`, `SlicerBar.jsx`, `VoiceInput.jsx`, `BlueprintPicker.jsx`, `DevPanel.jsx`, `AgentTracePanel.jsx`

---

### Task 1: Add CSS Animation Keyframes and Tokens

**Files:**
- Modify: `client/src/index.css` (append after line 301)

- [ ] **Step 1: Add new keyframes and CSS custom properties**

Append the following after the existing animations section (after the `@keyframes thinking-entry-in` block around line 301):

```css
/* ===== Narrative Flow Animations ===== */
@keyframes reveal-section {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

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

- [ ] **Step 2: Verify CSS loads without errors**

Run: `cd client && npm run dev`
Open browser, confirm no CSS parse errors in console.

- [ ] **Step 3: Commit**

```bash
git add client/src/index.css
git commit -m "style: add animation keyframes for narrative flow redesign"
```

---

### Task 2: Rewrite ProgressTimeline — Horizontal Track with Collapse

**Files:**
- Modify: `client/src/components/ProgressTimeline.jsx` (full rewrite, currently 145 lines)

**Reference:** `ui-mockup-response-card.html` lines 316-379 (progress bar HTML) and the JS animation logic.

- [ ] **Step 1: Read the current file**

Read `client/src/components/ProgressTimeline.jsx` to understand the current props interface: `{ steps, usage, startTime, activeTools }`.

- [ ] **Step 2: Rewrite ProgressTimeline as horizontal track**

Replace the entire file content. The new component must:
- Keep the same props interface: `{ steps, usage, startTime, activeTools }`
- Add a new prop: `collapsed` (boolean) — controlled by parent
- Render a horizontal step track instead of vertical
- Show elapsed time in header
- Show active tool badge + spinner for the current step
- Apply `.collapsed` CSS class when `collapsed` prop is true (max-height: 0, opacity: 0, padding: 0)

```jsx
import React, { useState, useEffect } from 'react';

const NODE_META = {
  classify:             { label: 'Classify' },
  decompose:            { label: 'Decompose' },
  researchAgent:        { label: 'Research' },
  sqlWriterAgent:       { label: 'SQL Writer' },
  generateSql:          { label: 'SQL Writer' },
  injectRls:            { label: 'Inject RLS' },
  validate:             { label: 'Validate' },
  correct:              { label: 'Correct' },
  execute:              { label: 'Execute' },
  checkResults:         { label: 'Check Results' },
  accumulateResult:     { label: 'Next Query' },
  diagnoseEmptyResults: { label: 'Diagnose' },
  present:              { label: 'Present' },
  contextFetch:         { label: 'Context' },
};

const TOOL_LABELS = {
  discover_context: 'Discovery',
  query_distinct_values: 'Values',
  check_null_ratio: 'Nulls',
  search_session_memory: 'Memory',
  submit_research: 'Submit',
  submit_sql: 'Submit SQL',
};

function formatDuration(ms) {
  if (ms == null) return '';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function StepDot({ status }) {
  if (status === 'completed') {
    return (
      <div className="w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
        <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  if (status === 'active') {
    return (
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ background: '#6366F1', animation: 'pulse-step-dot 1.5s ease infinite' }}
      />
    );
  }
  return <div className="w-3 h-3 rounded-full shrink-0" style={{ background: 'rgba(200,195,220,0.4)' }} />;
}

export default function ProgressTimeline({ steps, usage, startTime, activeTools = [], collapsed = false }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (collapsed) return;
    const interval = setInterval(() => setElapsed(Date.now() - startTime), 200);
    return () => clearInterval(interval);
  }, [startTime, collapsed]);

  const allDone = steps.length > 0 && steps.every(s => s.status === 'completed');
  const totalDuration = usage?.duration || elapsed;
  const activeStep = steps.find(s => s.status === 'active');
  const runningTools = activeTools.filter(t => t.status === 'running');

  return (
    <div
      className="overflow-hidden"
      style={{
        maxHeight: collapsed ? 0 : 200,
        padding: collapsed ? '0 20px' : '14px 20px',
        opacity: collapsed ? 0 : 1,
        borderBottom: collapsed ? 'none' : '1px solid rgba(200,195,220,0.15)',
        transition: 'max-height 0.6s cubic-bezier(0.16, 1, 0.3, 1), padding 0.5s ease, opacity 0.4s ease, border-bottom-color 0.3s ease',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {allDone ? `Completed in ${formatDuration(totalDuration)}` : 'Analyzing your question...'}
        </div>
        <div className="text-[11px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
          {formatDuration(totalDuration)}
        </div>
      </div>

      {/* Horizontal step track */}
      <div className="flex items-center mb-3">
        {steps.map((step, i) => {
          const meta = NODE_META[step.node] || { label: step.node };
          const isLast = i === steps.length - 1;
          return (
            <React.Fragment key={`${step.node}-${i}`}>
              <div className="flex flex-col items-center">
                <StepDot status={step.status} />
                <div
                  className="text-[8px] mt-1 whitespace-nowrap font-medium"
                  style={{
                    color: step.status === 'completed' ? '#059669'
                      : step.status === 'active' ? '#6366F1'
                      : 'var(--color-text-muted)',
                    fontWeight: step.status === 'active' ? 600 : 500,
                  }}
                >
                  {meta.label}
                </div>
                {step.status === 'completed' && step.duration != null && (
                  <div className="text-[7px] mt-0.5 tabular-nums" style={{ color: 'var(--color-text-faint)' }}>
                    {formatDuration(step.duration)}
                  </div>
                )}
              </div>
              {!isLast && (
                <div
                  className="flex-1 h-0.5 min-w-4"
                  style={{
                    background:
                      step.status === 'completed' && steps[i + 1]?.status === 'completed' ? '#10B981'
                      : step.status === 'completed' && steps[i + 1]?.status === 'active' ? 'linear-gradient(90deg, #10B981, #6366F1)'
                      : 'rgba(200,195,220,0.3)',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Active step detail */}
      {activeStep && !allDone && (
        <div className="flex items-center gap-2 rounded-[9px] px-3 py-2" style={{ background: 'rgba(99,102,241,0.04)' }}>
          <div
            className="w-4 h-4 rounded-full border-2 shrink-0"
            style={{
              borderColor: 'rgba(99,102,241,0.15)',
              borderTopColor: '#6366F1',
              animation: 'spin-progress 0.8s linear infinite',
            }}
          />
          <div className="text-[11px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {NODE_META[activeStep.node]?.label || activeStep.node}...
          </div>
          {runningTools.length > 0 && (
            <div className="ml-auto flex gap-1">
              {runningTools.map(t => (
                <span
                  key={t.name}
                  className="text-[9px] font-medium px-2 py-0.5 rounded"
                  style={{
                    background: 'rgba(99,102,241,0.1)',
                    color: '#6366F1',
                    animation: 'tool-badge-pulse 1.2s ease infinite',
                  }}
                >
                  {TOOL_LABELS[t.name] || t.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify the component renders**

Run `cd client && npm run dev`, trigger a query, confirm the horizontal progress bar appears.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/ProgressTimeline.jsx
git commit -m "feat: rewrite ProgressTimeline as horizontal track with collapse"
```

---

### Task 3: Create NarrativeCard Component

**Files:**
- Create: `client/src/components/NarrativeCard.jsx`

This is the core new component that replaces the current badge → entity card → tab rendering in ChatPanel. It receives the same data but presents it in narrative flow.

- [ ] **Step 1: Create NarrativeCard.jsx**

```jsx
import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import ResultsPanel from './ResultsPanel';

/**
 * NarrativeCard — Executive-first response card.
 * Headline insight leads, mini-chart inline, details behind pills.
 *
 * Props:
 *   execution   — { success, rowCount, rows, columns, error }
 *   insights    — markdown string from LLM
 *   chart       — { charts: [], reasoning }
 *   confidence  — { level, reason }
 *   sql         — generated SQL string
 *   entities    — { intent, complexity, metrics, dimensions, ... }
 *   onFollowUp  — callback to enter follow-up mode
 *   queries     — sub-query array for multi-query
 *   isPartial   — boolean, still streaming
 *   retrySuggestions — array of alternative phrasings
 *   onRetrySuggestion — callback
 *   zeroRowGuidance — { message, suggestion }
 *   sessionId   — for feedback
 *   question    — original question text
 *   children    — slot for expanded content (table, full chart)
 */

const CONFIDENCE_STYLES = {
  high:   { color: '#059669', dot: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  medium: { color: '#D97706', dot: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  low:    { color: '#DC2626', dot: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
};

const CONFIDENCE_TEXT = {
  high: 'High confidence',
  medium: 'Moderate confidence',
  low: 'Low confidence',
};

function extractHeadlineAndBody(insights) {
  if (!insights) return { headline: null, body: null, extras: [] };
  // Split on "Key Takeaways" header or "## " headers
  const lines = insights.split('\n');
  const contentLines = [];
  let inHeader = true;
  for (const line of lines) {
    if (inHeader && (line.startsWith('# ') || line.startsWith('## ') || line.trim() === '')) {
      continue;
    }
    inHeader = false;
    contentLines.push(line);
  }

  const text = contentLines.join('\n').trim();
  // First bold text becomes headline
  const boldMatch = text.match(/\*\*(.+?)\*\*/);
  const headline = boldMatch ? boldMatch[1].replace(/:$/, '') : null;

  // Split remaining into first paragraph (narrative) and rest (extra insights)
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  const body = paragraphs[0] || null;
  const extras = paragraphs.slice(1);

  return { headline, body, extras };
}

function MiniChart({ chart, rows }) {
  if (!chart?.charts?.length || !rows?.length) return null;
  const config = chart.charts[0];
  if (!config?.xAxis?.key || !config?.yAxis?.length) return null;

  const xKey = config.xAxis?.key || config.x;
  const yKey = config.yAxis?.[0]?.key || config.y?.[0];
  const sorted = [...rows].sort((a, b) => (Number(b[yKey]) || 0) - (Number(a[yKey]) || 0)).slice(0, 8);
  const maxVal = Math.max(...sorted.map(r => Math.abs(Number(r[yKey]) || 0)), 1);

  // Color bars by relative position in the dataset (top third green, middle yellow, bottom red)
  const vals = sorted.map(r => Math.abs(Number(r[yKey]) || 0));
  const third = Math.ceil(sorted.length / 3);
  function barColor(idx) {
    if (idx < third) return 'rgba(16,185,129,0.55)';
    if (idx < third * 2) return 'rgba(245,158,11,0.55)';
    return 'rgba(239,68,68,0.55)';
  }

  return (
    <div className="rounded-[11px] p-3.5 mb-4" style={{ background: 'rgba(99,102,241,0.035)' }}>
      <div className="text-[11px] font-medium mb-2.5" style={{ color: 'var(--color-text-muted)' }}>
        {config.title || `${yKey} by ${xKey}`}
      </div>
      <div className="flex items-end gap-2.5" style={{ height: 72 }}>
        {sorted.map((row, i) => {
          const val = Number(row[yKey]) || 0;
          const pct = Math.max((Math.abs(val) / maxVal) * 100, 4);
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full text-center">
              <div
                className="w-full max-w-[44px] rounded-t"
                style={{
                  height: `${pct}%`,
                  background: `linear-gradient(180deg, ${barColor(i)}, ${barColor(i).replace('0.55', '0.25')})`,
                  marginBottom: 4,
                }}
              />
              <div className="text-[10px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(2) : val}
              </div>
              <div className="text-[9px] mt-0.5 truncate max-w-full" style={{ color: 'var(--color-text-muted)' }}>
                {String(row[xKey]).length > 10 ? String(row[xKey]).slice(0, 9) + '...' : row[xKey]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InsightBlock({ text, isRisk }) {
  return (
    <div
      className="text-[13px] leading-relaxed mb-2.5 py-1.5 px-3"
      style={{
        color: 'var(--color-text-secondary)',
        borderLeft: `2.5px solid ${isRisk ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.2)'}`,
        borderRadius: '0 7px 7px 0',
        background: isRisk ? 'rgba(239,68,68,0.015)' : 'rgba(99,102,241,0.02)',
      }}
    >
      <ReactMarkdown
        components={{
          p: ({ children }) => <p>{children}</p>,
          strong: ({ children }) => <strong style={{ color: 'var(--color-text-primary)' }}>{children}</strong>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export default function NarrativeCard({
  execution,
  insights,
  chart,
  confidence,
  sql,
  entities,
  onFollowUp,
  queries,
  isPartial,
  retrySuggestions,
  onRetrySuggestion,
  zeroRowGuidance,
  sessionId,
  question,
  animate = false,
}) {
  const [expandedPill, setExpandedPill] = useState(null); // 'table' | 'chart' | 'sql' | 'entities' | null
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const { headline, body, extras } = useMemo(() => extractHeadlineAndBody(insights), [insights]);
  const confStyle = CONFIDENCE_STYLES[confidence?.level] || CONFIDENCE_STYLES.high;
  const confText = CONFIDENCE_TEXT[confidence?.level] || '';
  const rowCount = execution?.rowCount ?? execution?.rows?.length ?? 0;

  const handleCopyInsights = () => {
    if (insights) {
      navigator.clipboard.writeText(insights);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFeedback = async (rating) => {
    setFeedback(rating);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, question, sql, rating }),
      });
    } catch { /* silent */ }
  };

  const togglePill = (pill) => setExpandedPill(prev => prev === pill ? null : pill);

  // Staggered reveal class
  const revealStyle = (idx) => animate ? {
    opacity: 0, transform: 'translateY(12px)',
    animation: `reveal-section 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 + idx * 0.15}s forwards`,
  } : {};

  return (
    <div className="p-5">
      {/* Confidence + row count header */}
      <div className="flex justify-between items-center mb-3" style={revealStyle(0)}>
        {confText && (
          <div className="flex items-center gap-1.5">
            <div className="w-[7px] h-[7px] rounded-full" style={{ background: confStyle.dot, boxShadow: `0 0 0 3px ${confStyle.bg}` }} />
            <span className="text-[11px] font-medium" style={{ color: confStyle.color }}>{confText}</span>
          </div>
        )}
        {rowCount > 0 && (
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{rowCount} rows</span>
        )}
      </div>

      {/* Headline */}
      {headline && (
        <div className="text-[17px] font-bold leading-snug mb-2" style={{ ...revealStyle(1), color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
          {headline}
        </div>
      )}

      {/* Narrative body */}
      {body && (
        <div className="text-[13.5px] leading-relaxed mb-4" style={{ ...revealStyle(2), color: '#44403C' }}>
          <ReactMarkdown
            components={{
              p: ({ children }) => <p>{children}</p>,
              strong: ({ children }) => <strong style={{ color: 'var(--color-text-primary)' }}>{children}</strong>,
            }}
          >
            {body}
          </ReactMarkdown>
        </div>
      )}

      {/* Mini chart */}
      <div style={revealStyle(3)}>
        <MiniChart chart={chart} rows={execution?.rows} />
      </div>

      {/* Extra insight blocks */}
      <div style={revealStyle(4)}>
        {extras.map((text, i) => {
          const isRisk = /risk|critical|gap|zero|shortfall/i.test(text);
          return <InsightBlock key={i} text={text} isRisk={isRisk} />;
        })}
      </div>

      {/* Zero-row guidance */}
      {zeroRowGuidance && (
        <div className="text-[13px] leading-relaxed mb-3 p-3 rounded-lg" style={{ ...revealStyle(4), background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', color: '#92400E' }}>
          <strong>{zeroRowGuidance.message}</strong>
          {zeroRowGuidance.suggestion && <p className="mt-1 text-[12px]">{zeroRowGuidance.suggestion}</p>}
        </div>
      )}

      {/* Retry suggestions */}
      {retrySuggestions?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3" style={revealStyle(4)}>
          {retrySuggestions.map((s, i) => (
            <button key={i} onClick={() => onRetrySuggestion?.(s)} className="text-[11px] px-3 py-1.5 rounded-lg border cursor-pointer font-medium" style={{ color: '#6366F1', background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.1)' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Follow-up button */}
      {onFollowUp && !isPartial && (
        <div style={revealStyle(5)}>
          <button
            onClick={onFollowUp}
            className="text-[12px] font-medium px-3.5 py-1.5 rounded-[9px] border cursor-pointer mb-3.5"
            style={{ color: '#6366F1', background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.12)' }}
          >
            Follow Up
          </button>
        </div>
      )}

      {/* Feedback */}
      {!isPartial && execution?.success && (
        <div className="flex gap-2 mb-3" style={revealStyle(5)}>
          <button onClick={() => handleFeedback('up')} className="text-[11px] px-2 py-1 rounded-md border" style={{ color: feedback === 'up' ? '#059669' : 'var(--color-text-muted)', background: feedback === 'up' ? 'rgba(16,185,129,0.08)' : 'transparent', borderColor: feedback === 'up' ? 'rgba(16,185,129,0.2)' : 'rgba(0,0,0,0.06)' }}>
            👍
          </button>
          <button onClick={() => handleFeedback('down')} className="text-[11px] px-2 py-1 rounded-md border" style={{ color: feedback === 'down' ? '#DC2626' : 'var(--color-text-muted)', background: feedback === 'down' ? 'rgba(239,68,68,0.08)' : 'transparent', borderColor: feedback === 'down' ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.06)' }}>
            👎
          </button>
        </div>
      )}

      {/* Progressive disclosure pills */}
      <div className="flex gap-1.5 flex-wrap pt-3" style={{ ...revealStyle(6), borderTop: '1px solid rgba(0,0,0,0.04)' }}>
        {execution?.rows?.length > 0 && (
          <button onClick={() => togglePill('table')} className="text-[11px] font-medium px-3 py-1.5 rounded-lg border flex items-center gap-1 cursor-pointer" style={{ color: '#6366F1', background: expandedPill === 'table' ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.1)' }}>
            {expandedPill === 'table' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            View table
          </button>
        )}
        {chart?.charts?.length > 0 && (
          <button onClick={() => togglePill('chart')} className="text-[11px] font-medium px-3 py-1.5 rounded-lg border flex items-center gap-1 cursor-pointer" style={{ color: '#6366F1', background: expandedPill === 'chart' ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.1)' }}>
            {expandedPill === 'chart' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Full chart
          </button>
        )}
        {sql && (
          <button onClick={() => togglePill('sql')} className="text-[11px] px-3 py-1.5 rounded-lg border cursor-pointer" style={{ color: 'var(--color-text-muted)', background: expandedPill === 'sql' ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.02)', borderColor: 'rgba(0,0,0,0.04)' }}>
            SQL
          </button>
        )}
        {entities && (
          <button onClick={() => togglePill('entities')} className="text-[11px] px-3 py-1.5 rounded-lg border cursor-pointer" style={{ color: 'var(--color-text-muted)', background: expandedPill === 'entities' ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.02)', borderColor: 'rgba(0,0,0,0.04)' }}>
            Entities
          </button>
        )}
        <button onClick={handleCopyInsights} className="text-[11px] px-3 py-1.5 rounded-lg border cursor-pointer flex items-center gap-1 ml-auto" style={{ color: 'var(--color-text-muted)', background: 'rgba(0,0,0,0.02)', borderColor: 'rgba(0,0,0,0.04)' }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Expanded pill content */}
      {expandedPill === 'table' && execution?.rows?.length > 0 && (
        <div className="mt-3 rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(200,195,220,0.25)', animation: 'reveal-section 0.3s ease forwards' }}>
          {/* Export buttons */}
          <div className="flex gap-2 px-3 py-2" style={{ borderBottom: '1px solid rgba(200,195,220,0.15)' }}>
            <button
              onClick={() => {
                const cols = execution.columns || Object.keys(execution.rows[0] || {});
                const csv = [cols.join(','), ...execution.rows.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'export.csv'; a.click();
              }}
              className="text-[10px] font-medium px-2.5 py-1 rounded-md border cursor-pointer"
              style={{ color: '#6366F1', background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.1)' }}
            >
              Export CSV
            </button>
            <span className="text-[10px] ml-auto" style={{ color: 'var(--color-text-muted)', alignSelf: 'center' }}>
              {execution.rows.length} rows
            </span>
          </div>
          <div className="overflow-x-auto" style={{ maxHeight: 320 }}>
            <table className="w-full text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                  {(execution.columns || Object.keys(execution.rows[0] || {})).map(col => (
                    <th key={col} className="text-left px-3 py-2 font-semibold sticky top-0" style={{ background: 'rgba(250,250,249,0.95)', borderBottom: '1px solid rgba(200,195,220,0.2)' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {execution.rows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(200,195,220,0.1)' }}>
                    {(execution.columns || Object.keys(row)).map(col => (
                      <td key={col} className="px-3 py-1.5">{row[col] ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {expandedPill === 'sql' && sql && (
        <div className="mt-3 rounded-xl overflow-hidden" style={{ background: '#1a1a2e', animation: 'reveal-section 0.3s ease forwards' }}>
          <pre className="p-4 overflow-x-auto text-[12px] leading-relaxed" style={{ color: '#e2e8f0' }}>
            <code>{sql}</code>
          </pre>
        </div>
      )}

      {expandedPill === 'entities' && entities && (
        <div className="mt-3 rounded-xl p-3 border" style={{ borderColor: 'rgba(200,195,220,0.2)', background: 'rgba(0,0,0,0.01)', animation: 'reveal-section 0.3s ease forwards' }}>
          {entities.intent && (
            <div className="flex gap-2 mb-2">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>{entities.intent}</span>
              {entities.complexity && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>{entities.complexity}</span>}
            </div>
          )}
          {entities.metrics?.length > 0 && (
            <div className="text-[11px] mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="font-semibold">metrics:</span>{' '}
              {entities.metrics.map((m, i) => (
                <span key={i} className="inline-block px-1.5 py-0.5 rounded mr-1 mb-0.5" style={{ background: 'rgba(0,0,0,0.04)', fontSize: 10 }}>{m}</span>
              ))}
            </div>
          )}
          {entities.dimensions?.length > 0 && (
            <div className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="font-semibold">dimensions:</span>{' '}
              {entities.dimensions.map((d, i) => (
                <span key={i} className="inline-block px-1.5 py-0.5 rounded mr-1 mb-0.5" style={{ background: 'rgba(0,0,0,0.04)', fontSize: 10 }}>{d}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {expandedPill === 'chart' && chart?.charts?.length > 0 && (
        <div className="mt-3" style={{ animation: 'reveal-section 0.3s ease forwards' }}>
          {/* Render full interactive charts directly using ResultsPanel's ChartsView.
              NOTE: ResultsPanel.jsx must be modified to export ChartsView as a named export,
              OR render ResultsPanel here with initialTab="chart" (requires adding initialTab prop).
              The implementer should add `initialTab` prop support to ResultsPanel:
              change `const [activeTab, setActiveTab] = useState('insights');`
              to `const [activeTab, setActiveTab] = useState(initialTab || 'insights');`
              and add `initialTab` to the destructured props. */}
          <ResultsPanel
            execution={execution}
            insights=""
            chart={chart}
            queries={[]}
            isPartial={false}
            confidence={confidence}
            sessionId={sessionId}
            question={question}
            sql={sql}
            initialTab="chart"
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify component loads**

Temporarily import NarrativeCard in ChatPanel and render it with hardcoded props to confirm it mounts without errors. Remove after verifying.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/NarrativeCard.jsx
git commit -m "feat: add NarrativeCard component for narrative flow response"
```

---

### Task 4: Wire NarrativeCard into ChatPanel + Integrate New ProgressTimeline

**Files:**
- Modify: `client/src/components/ChatPanel.jsx` (lines 1-10 imports, lines 640-827 SQL rendering, lines 1101-1149 loading/progress, lines 88-100 state)

This is the integration task. Replace the current SQL message rendering with NarrativeCard inside a response-wrapper that also contains the new ProgressTimeline.

- [ ] **Step 1: Read ChatPanel.jsx fully**

Read the full file to understand the current state before making changes.

- [ ] **Step 2: Update imports**

At the top of `ChatPanel.jsx`, add the NarrativeCard and ProgressTimeline imports (ProgressTimeline is already imported but verify it's there):
```jsx
import NarrativeCard from './NarrativeCard';
import ProgressTimeline from './ProgressTimeline';
```

Remove the ThinkingPanel import:
```jsx
// DELETE this line:
import ThinkingPanel from './ThinkingPanel';
```

Keep `import ResultsPanel from './ResultsPanel';` — it's still used by NarrativeCard's "Full chart" pill.

- [ ] **Step 3: Add `progressCollapsed` state**

After the existing state declarations (around line 100), add:
```jsx
const [progressCollapsed, setProgressCollapsed] = useState(false);
```

- [ ] **Step 4: Add collapse trigger when streaming completes**

In the `streamOnEvent` function, find the `done` event handler (around line 424). Before the existing logic, add:
```jsx
// Collapse progress bar after a brief pause
setTimeout(() => setProgressCollapsed(true), 500);
```

Reset `progressCollapsed` when a new query starts. In `runStream()` (around line 435), add at the start:
```jsx
setProgressCollapsed(false);
```

- [ ] **Step 5: Replace the loading/progress section**

Find the loading section (around lines 1101-1149). Replace the ThinkingPanel + progress rendering with:

```jsx
{loading && progress && (
  <div
    className="max-w-[88%]"
    style={{
      background: 'rgba(255,255,255,0.55)',
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.5)',
      boxShadow: '0 2px 12px rgba(100,80,160,0.04)',
      overflow: 'hidden',
    }}
  >
    <ProgressTimeline
      steps={progress.steps}
      usage={progress.usage}
      startTime={progress.startTime}
      activeTools={activeTools}
      collapsed={progressCollapsed}
    />
    {/* Preserve streaming content below the progress bar */}
    <div className="px-5 pb-4">
      {querySummary && (
        <div className="text-[12px] mb-2 italic" style={{ color: 'var(--color-text-muted)' }}>{querySummary}</div>
      )}
      {partialQueries.filter(Boolean).map((pq, i) => (
        <div key={i} className="text-[12px] mb-2 p-2 rounded-lg" style={{ background: 'rgba(99,102,241,0.04)', color: 'var(--color-text-secondary)' }}>
          <span className="font-semibold text-[11px] mr-1.5" style={{ color: '#6366F1' }}>Q{i + 1}</span>
          {pq.subQuestion || `Sub-query ${i + 1} complete`}
          {pq.execution?.rowCount != null && <span className="ml-1.5 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>({pq.execution.rowCount} rows)</span>}
        </div>
      ))}
      {streamingInsights && (
        <div className="text-[13px] leading-relaxed mt-2" style={{ color: '#44403C' }}>
          <ReactMarkdown>{streamingInsights}</ReactMarkdown>
        </div>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 6: Replace SQL message rendering with NarrativeCard in response-wrapper**

Find the SQL message rendering section (around lines 640-827). Replace the entire block (badges, entities, ResultsPanel, SQL toggle, usage, follow-ups) with a response-wrapper that contains:
1. A completed ProgressTimeline (collapsed) at top
2. NarrativeCard below

The new rendering for `type === 'sql'` messages should be:

```jsx
<div
  style={{
    background: 'rgba(255,255,255,0.55)',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.5)',
    boxShadow: '0 2px 12px rgba(100,80,160,0.04)',
    overflow: 'hidden',
    maxWidth: '88%',
  }}
>
  <NarrativeCard
    execution={msg.execution}
    insights={msg.insights}
    chart={msg.chart}
    confidence={msg.confidence}
    sql={msg.content}
    entities={{
      intent: msg.orchestration?.intent,
      complexity: msg.orchestration?.complexity,
      metrics: msg.entities?.metrics,
      dimensions: msg.entities?.dimensions,
    }}
    onFollowUp={() => setFollowUpMode(true)}
    queries={msg.queries}
    isPartial={false}
    retrySuggestions={msg.retrySuggestions}
    onRetrySuggestion={(s) => handleSend(s)}
    zeroRowGuidance={msg.zeroRowGuidance}
    sessionId={sessionId}
    question={messages[messages.indexOf(msg) - 1]?.content}
    animate={messages.indexOf(msg) === messages.length - 1}
  />
</div>
```

Keep the follow-up input section (lines 1154-1197) unchanged — it works independently.

- [ ] **Step 7: Verify the full flow**

Run `cd client && npm run dev`, submit a query, and verify:
1. Horizontal progress bar shows during processing
2. Progress bar collapses when complete
3. NarrativeCard renders with headline, narrative, mini-chart, insight blocks
4. Pills expand/collapse (table, SQL, entities)
5. Follow-up button works
6. Copy button works

- [ ] **Step 8: Commit**

```bash
git add client/src/components/ChatPanel.jsx
git commit -m "feat: integrate NarrativeCard and horizontal progress into ChatPanel"
```

---

### Task 5: Add `initialTab` Prop to ResultsPanel

**Files:**
- Modify: `client/src/components/ResultsPanel.jsx` (line 437-438)

- [ ] **Step 1: Read ResultsPanel.jsx props destructuring**

Read the file around lines 437-440 where props are destructured and `activeTab` state is initialized.

- [ ] **Step 2: Add `initialTab` prop**

In the props destructuring (around line 437), add `initialTab = 'insights'`:
```jsx
export default function ResultsPanel({ execution, insights, chart, queries = [], isPartial = false, confidence, retrySuggestions, onRetrySuggestion, sessionId, question, sql, zeroRowGuidance, initialTab = 'insights' }) {
```

Change the `activeTab` state initialization (around line 438):
```jsx
const [activeTab, setActiveTab] = useState(initialTab);
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ResultsPanel.jsx
git commit -m "feat: add initialTab prop to ResultsPanel for NarrativeCard chart expansion"
```

---

### Task 6: Refine Sidebar — Date Groups and Relative Timestamps

**Files:**
- Modify: `client/src/App.jsx` (lines 180-196, sidebar chat history section)

- [ ] **Step 1: Read App.jsx**

Read the sidebar section (lines 180-196) to understand the hardcoded chat list.

- [ ] **Step 2: Add date grouping and relative timestamps**

Replace the chat history rendering (lines 180-196) with date-grouped items and relative timestamps. The current list is hardcoded, so we group them statically:

```jsx
<div className="flex-1 min-h-0 flex flex-col" style={{ animation: 'slide-in-left 0.5s 0.4s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
  <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Chat History</div>
  <div className="flex-1 overflow-y-auto flex flex-col gap-0">
    {[
      { group: 'Today', items: [
        { title: 'Pipeline by region analysis', time: '2m', active: true },
        { title: 'Top deals closing this quarter', time: '1h' },
        { title: 'Revenue trend YoY', time: '3h' },
      ]},
      { group: 'Yesterday', items: [
        { title: 'Rep performance breakdown', time: '18h' },
        { title: 'EMEA pipeline hygiene', time: '22h' },
      ]},
      { group: 'Last Week', items: [
        { title: 'Stalled deals last 90 days', time: '5d' },
      ]},
    ].map(({ group, items }) => (
      <div key={group}>
        <div className="text-[9px] font-semibold uppercase tracking-wider px-2.5 pt-3 pb-1.5" style={{ color: 'var(--color-text-faint)' }}>{group}</div>
        {items.map(({ title, time, active }) => (
          <div
            key={title}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-[13px] cursor-pointer transition-all duration-150 ${active ? 'font-medium' : ''}`}
            style={{
              color: active ? 'var(--color-accent-hover)' : 'var(--color-text-secondary)',
              background: active ? 'var(--color-accent-light)' : 'transparent',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-faint)' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span className="truncate flex-1">{title}</span>
            <span className="text-[9px] shrink-0" style={{ color: 'var(--color-text-faint)' }}>{time}</span>
          </div>
        ))}
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 3: Verify sidebar renders**

Run `cd client && npm run dev`, confirm date groups and timestamps appear correctly.

- [ ] **Step 4: Commit**

```bash
git add client/src/App.jsx
git commit -m "style: sidebar date groups and relative timestamps"
```

---

### Task 7: Clean Up — Remove ThinkingPanel Import and Unused Code

**Files:**
- Modify: `client/src/components/ChatPanel.jsx` (remove dead references)

- [ ] **Step 1: Search for remaining ThinkingPanel references**

Grep for `ThinkingPanel` and `thinkingEntries` in ChatPanel.jsx. Remove:
- The import line (already removed in Task 4 Step 2)
- Any `<ThinkingPanel ... />` JSX that wasn't caught in Task 4
- Keep the `thinkingEntries` state and `setThinkingEntries` calls — these are populated by SSE events and may be used by DevPanel or other consumers

- [ ] **Step 2: Remove unused ResultsPanel rendering in SQL messages**

If any old `<ResultsPanel ... />` rendering remains inside the SQL message block (the old tabbed view), remove it. The NarrativeCard now handles this.

- [ ] **Step 3: Verify no console errors or missing references**

Run `cd client && npm run dev`, open browser console, navigate the full flow. Confirm no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/ChatPanel.jsx
git commit -m "chore: remove ThinkingPanel references and dead code from ChatPanel"
```

---

### Task 8: Full Integration Test

**Files:** None (manual verification)

- [ ] **Step 1: Test the complete flow**

Run `cd client && npm run dev` and `cd server && npm run dev` (both must be running).

Verify each of these scenarios:

1. **Empty state** — welcome screen with suggestions appears correctly
2. **Submit a query** — horizontal progress bar shows, steps advance, tool badges appear
3. **Progress collapse** — when pipeline completes, progress bar smoothly collapses
4. **NarrativeCard appears** — headline insight, narrative body, mini-chart render
5. **Insight blocks** — additional insights show as blockquotes with colored borders
6. **Pills work** — "View table" expands table, "SQL" shows SQL, "Entities" shows entities card
7. **Copy button** — copies insights to clipboard
8. **Follow-up** — Follow Up button enters follow-up mode, sends with isFollowUp flag
9. **Feedback** — thumbs up/down buttons work
10. **Sidebar** — date groups, relative timestamps, active item highlighted
11. **Prior messages** — older messages in chat history render correctly
12. **Dashboard queries** — dashboard intent still routes to DashboardOverlay (unchanged)
13. **Clarification flow** — clarification messages still render interactive Q&A

- [ ] **Step 2: Fix any issues found**

Address any visual or functional issues discovered during testing.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete chat UI redesign — narrative flow with horizontal progress"
```
