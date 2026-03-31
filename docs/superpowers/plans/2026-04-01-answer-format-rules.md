# Answer Format Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 5 answer format rules from Pipeline_Agent_Instructions_Updated.xlsx into the present node — narrative+table dual format, threshold injection, call-to-action routing, and post-processing guardrails.

**Architecture:** Prompt rewrite in `server/prompts/present.js` with a new `buildThresholdContext()` function, updated `INSIGHT_SYSTEM` template, and updated category guidance. Lightweight `postProcessInsights()` function in `server/graph/nodes/present.js` for dollar and status emoji normalization.

**Tech Stack:** Node.js (CommonJS), LangChain prompt templates, definitions.json thresholds

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `server/prompts/present.js` | Modify | New `buildThresholdContext()`, rewrite `INSIGHT_SYSTEM`, update category guidance, add `thresholdContext` to both input builders |
| `server/graph/nodes/present.js` | Modify | New `postProcessInsights()`, integrate into flow before `parseFollowUps()` |
| `tests/presentFormat.test.js` | Create | Unit tests for `postProcessInsights`, `buildThresholdContext`, and prompt input builders |

---

### Task 1: Add `buildThresholdContext()` and write tests

**Files:**
- Modify: `server/prompts/present.js:9-10` (add import), append new function before `module.exports`
- Create: `tests/presentFormat.test.js`

- [ ] **Step 1: Write the failing test for `buildThresholdContext`**

Create `tests/presentFormat.test.js`:

```javascript
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

describe('presentFormat', () => {
  let presentPrompts;

  beforeEach(() => {
    delete require.cache[require.resolve('../server/prompts/present')];
    presentPrompts = require('../server/prompts/present');
  });

  describe('buildThresholdContext', () => {
    it('returns a formatted threshold text block', () => {
      const result = presentPrompts.buildThresholdContext();
      assert.ok(result.includes('KPI Thresholds for Status Assessment:'));
      assert.ok(result.includes('Coverage:'));
      assert.ok(result.includes('2.5'));
      assert.ok(result.includes('Deal Sensei Score:'));
      assert.ok(result.includes('65'));
    });

    it('includes all four threshold types', () => {
      const result = presentPrompts.buildThresholdContext();
      assert.ok(result.includes('Coverage:'));
      assert.ok(result.includes('Creation Coverage:'));
      assert.ok(result.includes('Deal Sensei Score:'));
      assert.ok(result.includes('Propensity to Buy:'));
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && node --test ../tests/presentFormat.test.js`
Expected: FAIL — `presentPrompts.buildThresholdContext is not a function`

- [ ] **Step 3: Implement `buildThresholdContext` in `server/prompts/present.js`**

Add the import at the top of the file (after the existing `getThreshold` import on line 9):

```javascript
// No new import needed — getThreshold is already imported on line 9
```

Add the function before `module.exports` (before line 207):

```javascript
function buildThresholdContext() {
  const lines = ['KPI Thresholds for Status Assessment:'];

  const cov = getThreshold('coverage');
  if (cov.green) {
    lines.push(`- Coverage: On Track >= ${cov.green}x, At Risk >= ${cov.yellow}x, Behind < ${cov.yellow}x`);
  }

  const creation = getThreshold('creation');
  if (creation.green) {
    lines.push(`- Creation Coverage: On Track >= ${creation.green}x, At Risk >= ${creation.yellow}x, Behind < ${creation.yellow}x`);
  }

  const ds = getThreshold('dsScore');
  if (ds.high) {
    lines.push(`- Deal Sensei Score: High >= ${ds.high}, Medium >= ${ds.medium}, Low < ${ds.medium}`);
  }

  const prop = getThreshold('propensity');
  if (prop.high) {
    lines.push(`- Propensity to Buy: High >= ${prop.high}`);
  }

  return lines.length > 1 ? lines.join('\n') : '';
}
```

Add `buildThresholdContext` to `module.exports`:

```javascript
module.exports = {
  insightPrompt,
  chartPrompt,
  buildInsightInputs,
  buildChartInputs,
  computeColumnStats,
  buildThresholdContext,
  CATEGORY_INSIGHT_GUIDANCE,
  DEFAULT_INSIGHT_GUIDANCE,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && node --test ../tests/presentFormat.test.js`
Expected: PASS — both `buildThresholdContext` tests green

- [ ] **Step 5: Commit**

```bash
git add server/prompts/present.js tests/presentFormat.test.js
git commit -m "feat(present): add buildThresholdContext for KPI threshold injection"
```

---

### Task 2: Rewrite `INSIGHT_SYSTEM` prompt with dual format templates

**Files:**
- Modify: `server/prompts/present.js:48-62` (replace `INSIGHT_SYSTEM` format section)

- [ ] **Step 1: Write the failing test for new prompt content**

Append to `tests/presentFormat.test.js` inside the outer `describe`:

```javascript
  describe('INSIGHT_SYSTEM prompt template', () => {
    it('contains dual format instructions', async () => {
      const inputs = {
        partialResultsNote: '',
        question: 'How is my pipeline?',
        questionCategory: 'WHAT_HAPPENED',
        questionSubCategory: 'overview',
        categoryGuidance: 'Test guidance',
        thresholdContext: 'Test thresholds',
        columns: 'Coverage, Target',
        rowCount: '5',
        columnStats: 'Coverage (numeric): min=1.5, max=3.2',
        sampleCount: '5',
        sampleData: '[]',
      };
      const messages = await presentPrompts.insightPrompt.formatMessages(inputs);
      const systemMsg = messages[0].content;
      assert.ok(systemMsg.includes('Format A'), 'should contain Format A');
      assert.ok(systemMsg.includes('Format B'), 'should contain Format B');
      assert.ok(systemMsg.includes('Narrative + Table'), 'should mention Narrative + Table');
      assert.ok(systemMsg.includes('Bullet'), 'should mention Bullet format');
      assert.ok(systemMsg.includes('Status Key'), 'should include status key');
      assert.ok(systemMsg.includes('On Track'), 'should define On Track');
      assert.ok(systemMsg.includes('At Risk'), 'should define At Risk');
      assert.ok(systemMsg.includes('Behind'), 'should define Behind');
    });

    it('injects thresholdContext into formatted messages', async () => {
      const inputs = {
        partialResultsNote: '',
        question: 'test',
        questionCategory: 'GENERAL',
        questionSubCategory: 'general',
        categoryGuidance: 'Test guidance',
        thresholdContext: 'Coverage: On Track >= 2.5x',
        columns: 'A',
        rowCount: '1',
        columnStats: '',
        sampleCount: '1',
        sampleData: '[]',
      };
      const messages = await presentPrompts.insightPrompt.formatMessages(inputs);
      const systemMsg = messages[0].content;
      assert.ok(systemMsg.includes('Coverage: On Track >= 2.5x'));
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && node --test ../tests/presentFormat.test.js`
Expected: FAIL — template variable `{thresholdContext}` not found, format text not present

- [ ] **Step 3: Replace `INSIGHT_SYSTEM` in `server/prompts/present.js`**

Replace lines 48-62 with:

```javascript
const INSIGHT_SYSTEM = `You are a senior sales analytics advisor. Given query results, produce concise insights.

{categoryGuidance}

{thresholdContext}

RESPONSE FORMAT — Choose the format that best fits the data:

**Format A — Narrative + Table** (use when results contain multiple KPIs, dimensions, or comparisons):
- Write a 2-paragraph summary (60 words max total, ~30 words each).
  - Para 1 (Strengths): Open with "Your [Metric] is at..." or "You are at..." — highlight what is on track.
  - Para 2 (Gaps): Open with "your numbers show [Metric]..." — highlight shortfalls.
- Bold **metric names only** — plain text for everything else.
- After the summary, present a markdown table with columns relevant to the data. Always include a Status column:
  - ✅ On Track — at or above target
  - ⚠️ At Risk — 10–20% below target
  - 🔴 Behind — more than 20% below target
- The summary MUST appear BEFORE any table.

**Format B — Bullet** (use for single-value lookups or simple answers where a narrative does not fit):
- 3–5 crisp bullets, each 1 sentence with specific numbers.
- Lead with the most important finding.
- Compare against benchmarks when applicable (${coverageThresholdText()}).

RULES (apply to both formats):
- Never skip the opening summary/narrative.
- Bold only metric names — never bold other text.
- Show dollar values in millions (e.g., $38M) or thousands (e.g., $3.2K). Never show raw numbers like $38,000,000.
- Never open with robotic phrases like "Here are your metrics:" — use a natural, analytical, manager-like tone.
- Narrative word limit is 60 words. Tables, call-to-action, and follow-up sections are exempt from the word limit.

## Suggested Follow-Up Questions
- 2-3 questions progressing What -> Why -> Fix`;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && node --test ../tests/presentFormat.test.js`
Expected: PASS — all tests green

- [ ] **Step 5: Commit**

```bash
git add server/prompts/present.js tests/presentFormat.test.js
git commit -m "feat(present): rewrite INSIGHT_SYSTEM with dual format templates and threshold injection"
```

---

### Task 3: Update category guidance with call-to-action instructions

**Files:**
- Modify: `server/prompts/present.js:17-41` (update `CATEGORY_INSIGHT_GUIDANCE`)

- [ ] **Step 1: Write the failing test for call-to-action in category guidance**

Append to `tests/presentFormat.test.js` inside the outer `describe`:

```javascript
  describe('CATEGORY_INSIGHT_GUIDANCE call-to-action', () => {
    it('WHAT_TO_DO guidance includes call-to-action instruction', () => {
      const guidance = presentPrompts.CATEGORY_INSIGHT_GUIDANCE;
      assert.ok(guidance.WHAT_TO_DO.includes('Call-to-Action'));
      assert.ok(guidance.WHAT_TO_DO.includes('2-3 specific'));
      assert.ok(guidance.WHAT_TO_DO.includes('data-backed'));
    });

    it('WHY guidance includes lighter action instruction', () => {
      const guidance = presentPrompts.CATEGORY_INSIGHT_GUIDANCE;
      assert.ok(guidance.WHY.includes('1-2 specific actions'));
    });

    it('WHAT_HAPPENED guidance does NOT include call-to-action', () => {
      const guidance = presentPrompts.CATEGORY_INSIGHT_GUIDANCE;
      assert.ok(!guidance.WHAT_HAPPENED.includes('Call-to-Action'));
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && node --test ../tests/presentFormat.test.js`
Expected: FAIL — `WHAT_TO_DO` does not include 'Call-to-Action'

- [ ] **Step 3: Update `CATEGORY_INSIGHT_GUIDANCE` in `server/prompts/present.js`**

Append to the end of the `WHAT_TO_DO` string (before the closing backtick), after the existing last line about validation questions:

```javascript
- End with 2-3 validation questions — e.g., "Track resolution rate over next 4 weeks" or "What is the creation trend after implementing these plays?"

**Call-to-Action:** End your response with a Call-to-Action section: 2-3 specific, data-backed actions grounded in actual metric gaps. Never give generic advice. Format as a numbered list.`,
```

Append to the end of the `WHY` string (before the closing backtick), after the existing last line about follow-up questions:

```javascript
- End with 2-3 specific follow-up questions that ask "What to do" — e.g., "For each stall reason, what's the standard intervention?" or "Which deals to prioritize for progression?"
- If the data reveals clear improvement opportunities, end with 1-2 specific actions the user could take.`,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && node --test ../tests/presentFormat.test.js`
Expected: PASS — all tests green

- [ ] **Step 5: Commit**

```bash
git add server/prompts/present.js tests/presentFormat.test.js
git commit -m "feat(present): add call-to-action instructions to WHAT_TO_DO and WHY guidance"
```

---

### Task 4: Inject `thresholdContext` into both input builders

**Files:**
- Modify: `server/prompts/present.js:177-201` (both `buildInsightInputs` and `buildMultiQueryInsightInputs`)

- [ ] **Step 1: Write the failing test for threshold injection in input builders**

Append to `tests/presentFormat.test.js` inside the outer `describe`:

```javascript
  describe('buildInsightInputs thresholdContext', () => {
    it('single-query inputs include thresholdContext', () => {
      const state = {
        question: 'How is coverage?',
        questionCategory: 'WHAT_HAPPENED',
        questionSubCategory: 'overview',
        execution: {
          columns: ['Coverage'],
          rows: [{ Coverage: 2.5 }],
          rowCount: 1,
        },
      };
      const result = presentPrompts.buildInsightInputs(state, [{ Coverage: 2.5 }]);
      assert.ok(result.thresholdContext, 'should have thresholdContext');
      assert.ok(result.thresholdContext.includes('Coverage:'));
    });
  });

  describe('buildMultiQueryInsightInputs thresholdContext', () => {
    it('multi-query inputs include thresholdContext', () => {
      const state = {
        question: 'How is my pipeline?',
        questionCategory: 'WHAT_HAPPENED',
        questionSubCategory: 'overview',
      };
      const allQueries = [{
        id: 'q1',
        subQuestion: 'Coverage?',
        purpose: 'check coverage',
        execution: {
          success: true,
          columns: ['Coverage'],
          rows: [{ Coverage: 2.5 }],
          rowCount: 1,
        },
      }];
      const result = presentPrompts.buildMultiQueryInsightInputs(state, allQueries);
      assert.ok(result.thresholdContext, 'should have thresholdContext');
      assert.ok(result.thresholdContext.includes('Coverage:'));
    });
  });
```

Note: `buildMultiQueryInsightInputs` is not currently exported. We need to add it to exports along with `buildInsightInputs` (which is already exported).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && node --test ../tests/presentFormat.test.js`
Expected: FAIL — `result.thresholdContext` is undefined

- [ ] **Step 3: Add `thresholdContext` to both input builders**

In `buildInsightInputs` (around line 177), add to the returned object:

```javascript
function buildInsightInputs(state, sample) {
  const exec = state.execution;
  const category = state.questionCategory || '';
  const guidance = CATEGORY_INSIGHT_GUIDANCE[category] || DEFAULT_INSIGHT_GUIDANCE;

  return {
    partialResultsNote: '',
    question: state.question,
    questionCategory: category || 'GENERAL',
    questionSubCategory: state.questionSubCategory || 'general',
    categoryGuidance: guidance,
    thresholdContext: buildThresholdContext(),
    columns: (exec?.columns || []).join(', '),
    rowCount: String(exec?.rowCount ?? 0),
    columnStats: computeColumnStats(exec?.rows, exec?.columns),
    sampleCount: String(sample?.length ?? 0),
    sampleData: JSON.stringify(sample || [], null, 2),
  };
}
```

In `buildMultiQueryInsightInputs` (around line 170), add to the returned object:

```javascript
  return {
    partialResultsNote: partialResultsNote || '',
    question: state.question,
    questionCategory: category || 'GENERAL',
    questionSubCategory: state.questionSubCategory || 'general',
    categoryGuidance: guidance,
    thresholdContext: buildThresholdContext(),
    columns: 'See sub-query results below',
    rowCount: String(allQueries.reduce((sum, q) => sum + (q.execution?.rowCount || 0), 0)),
    columnStats: allColumnStats.length > 0 ? allColumnStats.join('\n\n') : 'No data available.',
    sampleCount: 'multiple',
    sampleData: dataSection,
  };
```

Also add `buildMultiQueryInsightInputs` to `module.exports` so tests can access it:

```javascript
module.exports = {
  insightPrompt,
  chartPrompt,
  buildInsightInputs,
  buildChartInputs,
  buildMultiQueryInsightInputs,
  computeColumnStats,
  buildThresholdContext,
  CATEGORY_INSIGHT_GUIDANCE,
  DEFAULT_INSIGHT_GUIDANCE,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && node --test ../tests/presentFormat.test.js`
Expected: PASS — all tests green

- [ ] **Step 5: Commit**

```bash
git add server/prompts/present.js tests/presentFormat.test.js
git commit -m "feat(present): inject thresholdContext into single and multi-query insight inputs"
```

---

### Task 5: Add `postProcessInsights()` with tests

**Files:**
- Modify: `server/graph/nodes/present.js` (add function, integrate)
- Modify: `tests/presentFormat.test.js` (add post-processing tests)

- [ ] **Step 1: Write the failing tests for `postProcessInsights`**

Append to `tests/presentFormat.test.js` inside the outer `describe`:

```javascript
  describe('postProcessInsights', () => {
    let presentNode;

    beforeEach(() => {
      delete require.cache[require.resolve('../server/graph/nodes/present')];
      presentNode = require('../server/graph/nodes/present');
    });

    describe('dollar normalization', () => {
      it('converts $38,000,000 to $38M', () => {
        const result = presentNode.__testables.postProcessInsights('Revenue is $38,000,000 total');
        assert.ok(result.includes('$38M'), `Expected $38M, got: ${result}`);
      });

      it('converts $38000000 to $38M', () => {
        const result = presentNode.__testables.postProcessInsights('Revenue is $38000000 total');
        assert.ok(result.includes('$38M'), `Expected $38M, got: ${result}`);
      });

      it('converts $3,200,000 to $3.2M', () => {
        const result = presentNode.__testables.postProcessInsights('Gap is $3,200,000');
        assert.ok(result.includes('$3.2M'), `Expected $3.2M, got: ${result}`);
      });

      it('converts $150,000 to $150K', () => {
        const result = presentNode.__testables.postProcessInsights('Deal is $150,000');
        assert.ok(result.includes('$150K'), `Expected $150K, got: ${result}`);
      });

      it('leaves already-formatted $38M untouched', () => {
        const input = 'Revenue is $38M total';
        const result = presentNode.__testables.postProcessInsights(input);
        assert.equal(result, input);
      });

      it('leaves already-formatted $3.2K untouched', () => {
        const input = 'Deal is $3.2K';
        const result = presentNode.__testables.postProcessInsights(input);
        assert.equal(result, input);
      });

      it('leaves small amounts under $1,000 untouched', () => {
        const input = 'Value is $500';
        const result = presentNode.__testables.postProcessInsights(input);
        assert.equal(result, input);
      });
    });

    describe('status emoji normalization', () => {
      it('adds checkmark emoji to On Track in table rows', () => {
        const input = '| Coverage | 3.2x | On Track |';
        const result = presentNode.__testables.postProcessInsights(input);
        assert.ok(result.includes('✅ On Track'), `Expected emoji, got: ${result}`);
      });

      it('adds warning emoji to At Risk in table rows', () => {
        const input = '| W+F+UC | $87M | At Risk |';
        const result = presentNode.__testables.postProcessInsights(input);
        assert.ok(result.includes('⚠️ At Risk'), `Expected emoji, got: ${result}`);
      });

      it('adds red circle emoji to Behind in table rows', () => {
        const input = '| Creation | $62M | Behind |';
        const result = presentNode.__testables.postProcessInsights(input);
        assert.ok(result.includes('🔴 Behind'), `Expected emoji, got: ${result}`);
      });

      it('does not add emoji to status text outside tables', () => {
        const input = 'Coverage is On Track based on the data.';
        const result = presentNode.__testables.postProcessInsights(input);
        assert.ok(!result.includes('✅'), `Should not add emoji outside table: ${result}`);
      });

      it('does not double-add emoji if already present', () => {
        const input = '| Coverage | 3.2x | ✅ On Track |';
        const result = presentNode.__testables.postProcessInsights(input);
        const matches = result.match(/✅/g);
        assert.equal(matches.length, 1, `Should have exactly one checkmark: ${result}`);
      });
    });

    describe('passthrough', () => {
      it('returns empty string for empty input', () => {
        assert.equal(presentNode.__testables.postProcessInsights(''), '');
      });

      it('returns null/undefined as-is', () => {
        assert.equal(presentNode.__testables.postProcessInsights(null), null);
      });
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && node --test ../tests/presentFormat.test.js`
Expected: FAIL — `presentNode.__testables` is undefined or `postProcessInsights` is not a function

- [ ] **Step 3: Implement `postProcessInsights` in `server/graph/nodes/present.js`**

Add the function after the `parseFollowUps` function (after line 113), before `normalizeAxis`:

```javascript
/**
 * Post-process LLM insight output to enforce mechanical formatting guardrails.
 * - Converts raw dollar amounts to millions/thousands shorthand
 * - Normalizes status emoji in markdown table rows
 */
function postProcessInsights(text) {
  if (!text) return text;

  // Dollar normalization: convert raw amounts >= $1,000 to shorthand
  let result = text.replace(/\$\s?([\d,]+(?:\.\d+)?)/g, (match, numStr) => {
    const num = parseFloat(numStr.replace(/,/g, ''));
    if (isNaN(num) || num < 1000) return match;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(num % 1e9 === 0 ? 0 : 1)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(num % 1e6 === 0 ? 0 : 1)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(num % 1e3 === 0 ? 0 : 1)}K`;
    return match;
  });

  // Status emoji normalization: only in markdown table rows (lines with |)
  result = result.split('\n').map((line) => {
    if (!line.includes('|')) return line;
    // Skip header separator rows (|---|---|)
    if (/^\|[\s-|]+$/.test(line)) return line;
    // Add emoji if status text exists without emoji prefix
    line = line.replace(/(?<![✅⚠️🔴]\s?)On Track/g, '✅ On Track');
    line = line.replace(/(?<![✅⚠️🔴]\s?)At Risk/g, '⚠️ At Risk');
    line = line.replace(/(?<![✅⚠️🔴]\s?)Behind/g, '🔴 Behind');
    return line;
  }).join('\n');

  return result;
}
```

- [ ] **Step 4: Export via `__testables` and integrate into flow**

Add to the existing `module.exports` at the bottom of `present.js`:

```javascript
module.exports = { presentNode, presentEvents: _presentEvents, __testables: { postProcessInsights } };
```

Then update line 313 (the `parseFollowUps` call) to run post-processing first. Replace:

```javascript
  const { cleanedInsights, followUps } = parseFollowUps(insightsRaw);
```

With:

```javascript
  const processed = postProcessInsights(insightsRaw);
  const { cleanedInsights, followUps } = parseFollowUps(processed);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && node --test ../tests/presentFormat.test.js`
Expected: PASS — all tests green (including all previous tasks' tests)

- [ ] **Step 6: Commit**

```bash
git add server/graph/nodes/present.js tests/presentFormat.test.js
git commit -m "feat(present): add postProcessInsights for dollar and status emoji normalization"
```

---

### Task 6: Run full test suite and verify no regressions

**Files:** None modified — verification only.

- [ ] **Step 1: Run the new test file**

Run: `cd server && node --test ../tests/presentFormat.test.js`
Expected: All tests PASS

- [ ] **Step 2: Run the full test suite**

Run: `cd server && node --test`
Expected: All existing tests still pass, no regressions

- [ ] **Step 3: Verify prompt renders correctly with a dry run**

Run a quick sanity check that the prompt template still renders without errors:

```bash
node -e "
const { insightPrompt, buildInsightInputs } = require('./server/prompts/present');
const state = {
  question: 'How is my pipeline?',
  questionCategory: 'WHAT_HAPPENED',
  questionSubCategory: 'overview',
  execution: { columns: ['Coverage', 'Target'], rows: [{ Coverage: 2.5, Target: 2.5 }], rowCount: 1 },
};
const inputs = buildInsightInputs(state, [{ Coverage: 2.5, Target: 2.5 }]);
insightPrompt.formatMessages(inputs).then(msgs => {
  console.log('System prompt length:', msgs[0].content.length);
  console.log('Has thresholdContext:', msgs[0].content.includes('KPI Thresholds'));
  console.log('Has Format A:', msgs[0].content.includes('Format A'));
  console.log('Has Format B:', msgs[0].content.includes('Format B'));
  console.log('Has status key:', msgs[0].content.includes('On Track'));
  console.log('\\nFirst 500 chars of system prompt:');
  console.log(msgs[0].content.substring(0, 500));
});
"
```

Expected: All `true`, system prompt renders cleanly with thresholds, dual format, and status key visible.

- [ ] **Step 4: Commit (if any fixups were needed)**

Only if fixes were applied. Otherwise skip.
