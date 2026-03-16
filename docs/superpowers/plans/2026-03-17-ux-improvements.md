# UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make blueprint/multi-query results feel fast, help users understand what the system is doing, catch misinterpretations before execution, and add export capabilities — targeting non-technical sales leaders.

**Architecture:** Five independent feature chunks, each shippable on its own. Server changes emit new SSE events and compute metadata; client changes consume events and render new UI components. No database schema changes.

**Tech Stack:** Express.js SSE streaming, React 19, Tailwind CSS v4, recharts, html2canvas (new, for chart export), xlsx (new, for Excel export)

---

## Chunk 1: Progressive Sub-Query Streaming

**Problem:** Blueprint queries show nothing for 100+ seconds, then everything at once. Users think it's broken.

**Solution:** Stream each sub-query result to the client as it completes. The user sees the first table/chart within 20–30s while the remaining sub-queries finish in the background.

### Task 1.1: Emit `subquery_result` SSE events from parallel pipeline

**Files:**
- Modify: `server/graph/nodes/parallelSubQueryPipeline.js`
- Modify: `server/routes/textToSql.js`

- [ ] **Step 1: Add per-result event emission in parallel pipeline**

In `parallelSubQueryPipeline.js`, the parallel promises resolve individually but results are only returned in bulk at the end. Add an event emission when each sub-query completes:

```js
// In runOneSubQuery, just before the final return (around line 146):
_parallelPipelineEvents.emit('subquery_result', {
  sessionId: baseState.sessionId || '',
  index,
  total,
  result: {
    id,
    subQuestion,
    purpose,
    sql: state.sql || '',
    execution: state.execution || null,
  },
});
```

- [ ] **Step 2: Register the event listener in the SSE route**

In `server/routes/textToSql.js`, find the `parallelPipelineEvents` listener section (around line 691). Add a new listener:

```js
parallelPipelineEvents.on('subquery_result', (data) => {
  if (data.sessionId !== sessionId) return;
  sendEvent('subquery_result', {
    type: 'subquery_result',
    index: data.index,
    total: data.total,
    result: data.result,
    elapsed: elapsedSec(),
  });
});
```

- [ ] **Step 3: Verify by running a blueprint query and checking SSE output**

Run `/pipeline-hygiene` and confirm 3 `subquery_result` events appear in the SSE stream, each containing the sub-query's execution rows.

- [ ] **Step 4: Commit**

```bash
git add server/graph/nodes/parallelSubQueryPipeline.js server/routes/textToSql.js
git commit -m "feat(streaming): emit subquery_result SSE events as each sub-query completes"
```

### Task 1.2: Render progressive sub-query results in ChatPanel

**Files:**
- Modify: `client/src/components/ChatPanel.jsx`
- Modify: `client/src/components/ResultsPanel.jsx`

- [ ] **Step 1: Handle `subquery_result` events in ChatPanel's `streamOnEvent`**

Add a new case in the `streamOnEvent` function (around line 310):

```js
case 'subquery_result': {
  setPartialQueries(prev => {
    const next = [...prev];
    next[eventData.index] = eventData.result;
    return next;
  });
  break;
}
```

Add state: `const [partialQueries, setPartialQueries] = useState([]);`
Reset it when a new query starts (in the send handler).

- [ ] **Step 2: Show partial results while loading**

In the ChatPanel render, when `loading` is true and `partialQueries.length > 0`, render a partial `ResultsPanel`:

```jsx
{loading && partialQueries.length > 0 && (
  <ResultsPanel
    execution={null}
    insights={null}
    chart={null}
    queries={partialQueries.filter(Boolean)}
    isPartial={true}
  />
)}
```

- [ ] **Step 3: Add `isPartial` prop to ResultsPanel**

In `ResultsPanel.jsx`, accept `isPartial` prop. When true:
- Show only the `subqueries` tab (with results so far)
- Add a subtle pulsing indicator: "Analyzing sub-query {completed}/{total}..."
- Each completed sub-query section shows its data immediately

```jsx
export default function ResultsPanel({ execution, insights, chart, queries = [], isPartial = false }) {
```

In the tabs memo, when `isPartial`:
```js
if (isPartial && queries.length > 0) {
  t.push({ id: 'subqueries', label: `Results (${queries.filter(q => q.execution?.success).length}/${queries.length} complete)` });
  return t;
}
```

- [ ] **Step 4: Test progressive rendering**

Run `/pipeline-hygiene` in the UI. Verify:
- Sub-query results appear one-by-one as they complete
- The partial results panel shows a progress indicator
- When `done` fires, the full ResultsPanel replaces the partial one

- [ ] **Step 5: Commit**

```bash
git add client/src/components/ChatPanel.jsx client/src/components/ResultsPanel.jsx
git commit -m "feat(ui): render sub-query results progressively as they stream in"
```

### Task 1.3: Latency reduction — skip validation for template-adapted SQL

**Files:**
- Modify: `server/graph/nodes/parallelSubQueryPipeline.js`

- [ ] **Step 1: Skip validation for exact template matches**

In `runOneSubQuery`, Path 1 (exact match, no user params) already skips the writer. Also skip validation since the gold SQL is pre-verified:

```js
if (match && !hasUserParams) {
  // ... existing state setup ...
  // Skip validation for pre-verified gold SQL
  state.validationEnabled = false;
```

- [ ] **Step 2: Test that exact-match sub-queries skip validation**

Run a blueprint and check logs for Path 1 sub-queries — should see "Validation disabled" instead of validator output.

- [ ] **Step 3: Commit**

```bash
git add server/graph/nodes/parallelSubQueryPipeline.js
git commit -m "perf: skip validation for exact template matches in parallel pipeline"
```

---

## Chunk 2: Query Summary & Confidence Badge

**Problem:** Users don't know what the system is doing or how confident it is in the results.

**Solution:** (a) Show a plain-English summary of "what I'm about to look up" before executing. (b) Show a traffic-light confidence badge on results.

### Task 2.1: Generate and emit query summary after classify

**Files:**
- Modify: `server/routes/textToSql.js`

- [ ] **Step 1: Build a plain-English summary from classify output**

After the `classify` node completes in the SSE route, generate a human-readable summary. Add a helper function:

```js
function buildQuerySummary(state) {
  const parts = [];
  if (state.matchType === 'blueprint') {
    parts.push(`Running analysis: ${state.blueprintMeta?.name || state.blueprintId}`);
    if (state.blueprintMeta?.userParams) parts.push(`Filtered by: ${state.blueprintMeta.userParams}`);
    const planSize = state.queryPlan?.length || state.blueprintMeta?.subQueries?.length || 0;
    if (planSize > 0) parts.push(`This will run ${planSize} sub-queries in parallel`);
  } else if (state.matchType === 'exact') {
    parts.push('Found an exact match in verified templates — executing directly');
  } else if (state.matchType === 'followup') {
    parts.push('Adapting previous query for your follow-up');
  } else {
    parts.push(`Researching: "${state.question}"`);
    if (state.entities?.filters?.length > 0) parts.push(`Filters: ${state.entities.filters.join(', ')}`);
    if (state.entities?.dimensions?.length > 0) parts.push(`Grouped by: ${state.entities.dimensions.join(', ')}`);
    if (state.entities?.metrics?.length > 0) parts.push(`Metrics: ${state.entities.metrics.join(', ')}`);
  }
  return parts.join('. ') + '.';
}
```

- [ ] **Step 2: Emit `query_summary` SSE event**

In the `node_complete` handler for `classify`, emit:

```js
if (node === 'classify') {
  const summary = buildQuerySummary(currentState);
  sendEvent('query_summary', { type: 'query_summary', summary, matchType: currentState.matchType, elapsed: elapsedSec() });
}
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/textToSql.js
git commit -m "feat(streaming): emit query_summary SSE event after classify"
```

### Task 2.2: Show query summary card in ChatPanel

**Files:**
- Modify: `client/src/components/ChatPanel.jsx`

- [ ] **Step 1: Handle `query_summary` event**

In `streamOnEvent`:

```js
case 'query_summary': {
  setQuerySummary(eventData.summary);
  break;
}
```

Add state: `const [querySummary, setQuerySummary] = useState('');`

- [ ] **Step 2: Render summary card while loading**

Below the thinking panel, when loading and querySummary exists:

```jsx
{loading && querySummary && (
  <div className="mx-4 mb-2 px-4 py-2.5 rounded-xl text-[13px] text-indigo-800"
       style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)', border: '1px solid rgba(99,102,241,0.15)' }}>
    <span className="font-semibold text-indigo-600 mr-1.5">Plan:</span>
    {querySummary}
  </div>
)}
```

Reset `querySummary` to `''` when a new query starts.

- [ ] **Step 3: Test by running different query types**

- Blueprint: should show "Running analysis: Pipeline Hygiene. Filtered by: for EMEA Q2. This will run 3 sub-queries in parallel."
- Exact match: "Found an exact match in verified templates — executing directly."
- Standard: "Researching: 'pipeline by region'. Grouped by: region. Metrics: pipeline."

- [ ] **Step 4: Commit**

```bash
git add client/src/components/ChatPanel.jsx
git commit -m "feat(ui): show query summary card during loading"
```

### Task 2.3: Compute and display confidence badge

**Files:**
- Modify: `server/routes/textToSql.js` (in `buildFinalResponse`)
- Modify: `client/src/components/ResultsPanel.jsx`

- [ ] **Step 1: Compute confidence score in the final response builder**

In `buildFinalResponse` (or equivalent), add a `confidence` field:

```js
function computeConfidence(state) {
  let score = 0.5; // baseline
  if (state.matchType === 'exact') score += 0.4;
  else if (state.matchType === 'partial' || state.matchType === 'followup') score += 0.25;
  else if (state.matchType === 'blueprint') score += 0.2;

  if (state.validationReport?.overall_valid) score += 0.15;
  if (state.execution?.success && state.execution?.rowCount > 0) score += 0.1;
  if (state.execution?.rowCount === 0) score -= 0.2;
  if (state.attempts?.correction > 0) score -= 0.1 * state.attempts.correction;

  return Math.max(0, Math.min(1, score));
}
// level: 'high' (>=0.8), 'medium' (>=0.5), 'low' (<0.5)
```

Include in the `done` event: `confidence: { score, level }`.

- [ ] **Step 2: Show confidence badge in ResultsPanel**

Add a small badge next to the tab bar:

```jsx
{confidence && (
  <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${
    confidence.level === 'high' ? 'bg-emerald-50 text-emerald-700' :
    confidence.level === 'medium' ? 'bg-amber-50 text-amber-700' :
    'bg-red-50 text-red-700'
  }`}>
    {confidence.level === 'high' ? 'High confidence' :
     confidence.level === 'medium' ? 'Moderate confidence' :
     'Low confidence — verify results'}
  </span>
)}
```

Accept `confidence` as a new prop on ResultsPanel.

- [ ] **Step 3: Test confidence levels**

- Exact match → should show "High confidence" (green)
- Standard query with corrections → should show "Moderate confidence" (amber)
- Query with 0 rows → should show "Low confidence" (red)

- [ ] **Step 4: Commit**

```bash
git add server/routes/textToSql.js client/src/components/ResultsPanel.jsx
git commit -m "feat(trust): add confidence badge to results panel"
```

---

## Chunk 3: Smart Disambiguation & Guided Retry

**Problem:** Users say "EMEA" and the system picks the wrong column. When results are wrong, users don't know how to rephrase.

**Solution:** (a) Proactively ask clarifying questions for known ambiguous terms. (b) Show specific retry suggestions when results are empty or suspicious.

### Task 3.1: Enhance disambiguation for known ambiguous terms

**Files:**
- Modify: `server/prompts/classify.js`
- Modify: `server/graph/nodes/classify.js`

- [ ] **Step 1: Add disambiguation rules to the classify prompt**

In the classify prompt template (`server/prompts/classify.js`), add a disambiguation section:

```
DISAMBIGUATION RULES — When the user's question contains these ambiguous terms AND context is insufficient to resolve them, set intent to CLARIFICATION:
- "region" without qualifier → ask: global region (AMERICAS/EMEA/APAC/WW) vs sales region vs sub-region?
- "account" without "sub" or "parent" → ask: sub-account (deal level) vs parent account (company level)?
- "product" without qualifier → ask: OPG, solution group, or BU?
- "top accounts" without metric → ask: top by ARR, pipeline, or engagement score?
- "trend" without time range → ask: over what period? Weekly, monthly, or quarterly?

Do NOT ask for clarification if:
- The question is clearly scoped (e.g., "pipeline by global region" = GLOBAL_REGION)
- A blueprint slash command was used (blueprints define their own scope)
- This is a follow-up to a prior query (context carries forward)
```

- [ ] **Step 2: Ensure clarification questions have user-friendly options**

In the classify prompt, add an instruction:

```
When generating clarification_questions, make options human-readable (not column names):
- Bad: ["GLOBAL_REGION", "SUB_REGION", "SALES_REGION"]
- Good: ["Global region (AMERICAS, EMEA, APAC)", "Sales region (detailed breakdown)", "Sub-region"]
```

- [ ] **Step 3: Test disambiguation triggers**

Send "show me pipeline by region" → should trigger CLARIFICATION with a region disambiguation question.
Send "show me pipeline by global region" → should NOT trigger clarification.

- [ ] **Step 4: Commit**

```bash
git add server/prompts/classify.js server/graph/nodes/classify.js
git commit -m "feat(disambiguation): add rules for known ambiguous terms in classify prompt"
```

### Task 3.2: Render disambiguation UI in ChatPanel

**Files:**
- Modify: `client/src/components/ChatPanel.jsx`

- [ ] **Step 1: Handle CLARIFICATION intent in the response handler**

When the `done` event has `intent === 'CLARIFICATION'`, instead of rendering a normal result, show a clarification card with clickable options:

```jsx
// In the message rendering logic, when message.clarificationQuestions exists:
{msg.clarificationQuestions?.length > 0 && (
  <div className="space-y-3">
    {msg.clarificationQuestions.map(cq => (
      <div key={cq.id} className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFBEB 100%)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <div className="text-[13px] font-medium text-amber-900 mb-2">{cq.question}</div>
        <div className="flex flex-wrap gap-1.5">
          {cq.options.map(opt => (
            <button
              key={opt}
              className="px-3 py-1 text-[12px] font-medium rounded-lg bg-white text-amber-800 border border-amber-200 hover:bg-amber-50 cursor-pointer transition-colors"
              onClick={() => handleClarificationAnswer(cq.id, opt, msg)}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 2: Implement `handleClarificationAnswer`**

When a user clicks an option, re-submit the original question with the resolved clarification:

```js
function handleClarificationAnswer(questionId, answer, originalMsg) {
  const resolved = [{ id: questionId, answer }];
  const clarifiedQuestion = `${originalMsg.question} (${answer})`;
  handleSend(clarifiedQuestion, { resolvedQuestions: resolved });
}
```

- [ ] **Step 3: Test the full disambiguation flow**

Send "show me top accounts" → clarification card appears → click "Top by pipeline" → re-query runs with resolved context.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/ChatPanel.jsx
git commit -m "feat(ui): render disambiguation cards with clickable options"
```

### Task 3.3: Add guided retry suggestions for empty/suspicious results

**Files:**
- Modify: `server/graph/nodes/present.js`
- Modify: `client/src/components/ResultsPanel.jsx`

- [ ] **Step 1: Generate retry suggestions in the present node**

In `presentNode`, when results are empty or suspicious, generate 2–3 specific rephrasing suggestions:

```js
let retrySuggestions = [];
if (execution?.rowCount === 0 || resultsSuspicious) {
  retrySuggestions = [
    state.entities?.filters?.length > 0
      ? `Try without filters: "${state.question.replace(/\b(for|in|with)\s+\S+(\s+\S+)?$/i, '').trim()}"`
      : null,
    `Try being more specific: "${state.question} for current quarter"`,
    state.questionCategory === 'WHAT_HAPPENED'
      ? 'Try a broader time range: "last 4 quarters" or "year to date"'
      : null,
  ].filter(Boolean).slice(0, 3);
}
```

Include `retrySuggestions` in the present node's return and the `done` event.

- [ ] **Step 2: Render retry suggestion chips in ResultsPanel**

When `retrySuggestions` exist and results are empty:

```jsx
{retrySuggestions?.length > 0 && (
  <div className="mt-3 p-3 rounded-xl bg-amber-50/50 border border-amber-100">
    <div className="text-[11px] font-semibold text-amber-700 mb-2">Try rephrasing:</div>
    <div className="flex flex-col gap-1.5">
      {retrySuggestions.map((s, i) => (
        <button key={i} onClick={() => onRetrySuggestion?.(s)}
          className="text-left text-[12px] text-amber-800 hover:text-amber-950 px-2 py-1 rounded-lg hover:bg-amber-100/50 cursor-pointer transition-colors">
          {s}
        </button>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 3: Wire up `onRetrySuggestion` to ChatPanel's send function**

Pass the callback from ChatPanel through to ResultsPanel so clicking a suggestion auto-sends the rephrased query.

- [ ] **Step 4: Test empty result flow**

Run a query that returns 0 rows → verify retry suggestions appear with clickable rephrasings.

- [ ] **Step 5: Commit**

```bash
git add server/graph/nodes/present.js client/src/components/ResultsPanel.jsx client/src/components/ChatPanel.jsx
git commit -m "feat(ux): show guided retry suggestions for empty or suspicious results"
```

---

## Chunk 4: Export & Download

**Problem:** Users can't get data out of the system — no copy, no download, no Excel export.

**Solution:** Add copy button on insights, PNG download on charts, and Excel/CSV export on tables.

### Task 4.1: Add copy button to insights

**Files:**
- Modify: `client/src/components/ResultsPanel.jsx`

- [ ] **Step 1: Add copy button next to insights tab content**

```jsx
{currentTab === 'insights' && insights && (
  <div className="relative">
    <button
      onClick={() => { navigator.clipboard.writeText(insights); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="absolute top-0 right-0 p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
      title="Copy insights"
    >
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
    <div className="text-[13px] leading-relaxed text-stone-700 pr-8">
      <ReactMarkdown>{insights}</ReactMarkdown>
    </div>
  </div>
)}
```

Add state: `const [copied, setCopied] = useState(false);`
Add imports: `import { Copy, Check } from 'lucide-react';` (already available in deps).

- [ ] **Step 2: Test copy functionality**

Click copy → paste into text editor → verify markdown text is copied correctly.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ResultsPanel.jsx
git commit -m "feat(export): add copy button to insights panel"
```

### Task 4.2: Add chart download as PNG

**Files:**
- Modify: `client/src/components/ResultsPanel.jsx`
- Modify: `client/package.json` (add html2canvas)

- [ ] **Step 1: Install html2canvas**

```bash
cd client && npm install html2canvas
```

- [ ] **Step 2: Add download button to ChartsView**

Wrap charts in a ref container. Add a download button:

```jsx
function ChartsView({ chart, rows }) {
  const chartRef = useRef(null);

  const handleDownload = async () => {
    if (!chartRef.current) return;
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: '#ffffff', scale: 2 });
    const link = document.createElement('a');
    link.download = `chart-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // ... existing chartsToRender logic ...

  return (
    <div className="relative">
      <button onClick={handleDownload} className="absolute top-0 right-0 p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer z-10" title="Download chart">
        <Download size={14} />
      </button>
      <div ref={chartRef} className="w-full max-h-[1200px] overflow-y-auto">
        {chartsToRender.map((cfg, idx) => (
          <SingleChart key={idx} config={cfg} rows={rows} colorIndex={idx} />
        ))}
      </div>
    </div>
  );
}
```

Add import: `import { Download } from 'lucide-react';`

- [ ] **Step 3: Test chart download**

Click download → verify a PNG file is saved with the chart rendered at 2x resolution.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/ResultsPanel.jsx client/package.json client/package-lock.json
git commit -m "feat(export): add chart download as PNG"
```

### Task 4.3: Add table export to Excel/CSV

**Files:**
- Modify: `client/src/components/ResultsPanel.jsx`
- Modify: `client/package.json` (add xlsx)

- [ ] **Step 1: Install xlsx**

```bash
cd client && npm install xlsx
```

- [ ] **Step 2: Add export button to TableView**

```jsx
function TableView({ columns, rows }) {
  const handleExportExcel = async () => {
    const XLSX = (await import('xlsx')).default;
    const ws = XLSX.utils.json_to_sheet(rows, { header: columns });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, `results-${Date.now()}.xlsx`);
  };

  const handleExportCsv = () => {
    const header = columns.join(',');
    const csvRows = rows.map(row => columns.map(col => {
      const val = row[col];
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(','));
    const csv = [header, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.download = `results-${Date.now()}.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  if (!columns || columns.length === 0) {
    return <div className="p-6 text-center text-stone-400 text-[13px]">No data to display.</div>;
  }

  return (
    <>
      <div className="flex justify-end gap-1 mb-2">
        <button onClick={handleExportExcel} className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-stone-500 hover:text-stone-700 rounded-md hover:bg-stone-100 cursor-pointer transition-colors" title="Download as Excel">
          <Download size={12} /> Excel
        </button>
        <button onClick={handleExportCsv} className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-stone-500 hover:text-stone-700 rounded-md hover:bg-stone-100 cursor-pointer transition-colors" title="Download as CSV">
          <Download size={12} /> CSV
        </button>
      </div>
      {/* ... existing table rendering ... */}
    </>
  );
}
```

- [ ] **Step 3: Test Excel and CSV export**

Click Excel → verify .xlsx opens in Excel with correct columns and data.
Click CSV → verify .csv opens correctly with proper escaping.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/ResultsPanel.jsx client/package.json client/package-lock.json
git commit -m "feat(export): add table export to Excel and CSV"
```

---

## Chunk 5: Feedback & Suggested Questions

**Problem:** Users don't know what to ask, and the system doesn't learn from their feedback.

**Solution:** (a) Show suggested questions on empty chat. (b) Add thumbs up/down feedback buttons on results.

### Task 5.1: Add suggested questions carousel on empty state

**Files:**
- Create: `client/src/components/SuggestedQuestions.jsx`
- Modify: `client/src/components/ChatPanel.jsx`

- [ ] **Step 1: Create SuggestedQuestions component**

```jsx
import React from 'react';

const SUGGESTIONS = [
  { icon: '📊', text: 'Show me pipeline by region', category: 'Pipeline' },
  { icon: '🎯', text: 'What deals are likely to close this quarter?', category: 'Deals' },
  { icon: '📈', text: 'How is pipeline coverage trending?', category: 'Coverage' },
  { icon: '⚠️', text: 'Which deals have stalled?', category: 'Risk' },
  { icon: '👥', text: 'Who are my top performing reps?', category: 'Team' },
  { icon: '🔍', text: '/pipeline-hygiene', category: 'Blueprint' },
];

export default function SuggestedQuestions({ onSelect }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-lg font-semibold text-stone-700 mb-1">What would you like to know?</div>
      <div className="text-[13px] text-stone-400 mb-6">Ask a question about your sales data, or try one of these:</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.text}
            onClick={() => onSelect(s.text)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-[13px] text-stone-600 hover:text-stone-900 cursor-pointer transition-all hover:scale-[1.01]"
            style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(231,229,228,0.5)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
          >
            <span className="text-base">{s.icon}</span>
            <span>{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Show SuggestedQuestions in ChatPanel when chat is empty**

In ChatPanel, when `messages.length === 0`:

```jsx
{messages.length === 0 && !loading && (
  <SuggestedQuestions onSelect={(text) => { setInput(text); handleSend(text); }} />
)}
```

- [ ] **Step 3: Test empty state**

Open a new chat → suggested questions appear in a grid → click one → query runs.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/SuggestedQuestions.jsx client/src/components/ChatPanel.jsx
git commit -m "feat(ux): add suggested questions carousel on empty chat state"
```

### Task 5.2: Add thumbs up/down feedback on results

**Files:**
- Create: `server/routes/feedback.js`
- Modify: `server/routes/index.js` (or main router)
- Modify: `client/src/components/ResultsPanel.jsx`

- [ ] **Step 1: Create server feedback endpoint**

```js
// server/routes/feedback.js
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

const feedbackStore = []; // In-memory for now; replace with DB later

router.post('/', (req, res) => {
  const { sessionId, question, sql, rating, comment } = req.body;
  if (!rating || !['up', 'down'].includes(rating)) {
    return res.status(400).json({ error: 'rating must be "up" or "down"' });
  }
  const entry = { sessionId, question, sql, rating, comment: comment || '', timestamp: Date.now() };
  feedbackStore.push(entry);
  logger.info('User feedback recorded', { rating, question: (question || '').substring(0, 100) });
  res.json({ success: true });
});

router.get('/stats', (req, res) => {
  const up = feedbackStore.filter(f => f.rating === 'up').length;
  const down = feedbackStore.filter(f => f.rating === 'down').length;
  res.json({ total: feedbackStore.length, up, down });
});

module.exports = router;
```

- [ ] **Step 2: Mount the feedback route**

In the main Express app, mount: `app.use('/api/feedback', require('./routes/feedback'));`

- [ ] **Step 3: Add feedback buttons to ResultsPanel**

Below the tabs content, add a feedback row:

```jsx
const [feedback, setFeedback] = useState(null); // 'up' | 'down' | null

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

// In render, after the tabs content div:
<div className="flex items-center justify-end gap-1 px-4 pb-3 pt-1">
  <span className="text-[11px] text-stone-400 mr-1">Was this helpful?</span>
  <button onClick={() => handleFeedback('up')}
    className={`p-1 rounded-md cursor-pointer transition-colors ${feedback === 'up' ? 'text-emerald-500 bg-emerald-50' : 'text-stone-300 hover:text-emerald-500'}`}>
    <ThumbsUp size={13} />
  </button>
  <button onClick={() => handleFeedback('down')}
    className={`p-1 rounded-md cursor-pointer transition-colors ${feedback === 'down' ? 'text-red-500 bg-red-50' : 'text-stone-300 hover:text-red-500'}`}>
    <ThumbsDown size={13} />
  </button>
</div>
```

Add imports: `import { ThumbsUp, ThumbsDown } from 'lucide-react';`

- [ ] **Step 4: Test feedback flow**

Click thumbs up → button highlights green → server logs "User feedback recorded". Click thumbs down → same with red.

- [ ] **Step 5: Commit**

```bash
git add server/routes/feedback.js server/routes/index.js client/src/components/ResultsPanel.jsx
git commit -m "feat(feedback): add thumbs up/down on results with server storage"
```

---

## Verification Checklist

After all chunks are implemented:

- [ ] Run `cd server && node --test` — all existing tests pass
- [ ] Run `cd client && npm run build` — client builds without errors
- [ ] Manual test: exact match query → fast, high confidence, no disambiguation
- [ ] Manual test: ambiguous query ("pipeline by region") → disambiguation card appears
- [ ] Manual test: blueprint `/pipeline-hygiene for EMEA Q2` → progressive results stream in, summary card shows plan
- [ ] Manual test: empty result query → retry suggestions appear
- [ ] Manual test: copy insights, download chart PNG, export table to Excel
- [ ] Manual test: thumbs up/down → server logs feedback
- [ ] Manual test: empty chat state → suggested questions carousel shows
