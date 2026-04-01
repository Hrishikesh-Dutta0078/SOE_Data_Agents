# Answer Format Rules — Design Spec

**Date:** 2026-04-01
**Source:** Pipeline_Agent_Instructions_Updated.xlsx — "Answer Format Rules" sheet
**Approach:** Enhanced Prompt + Lightweight Post-Processing (Approach C)

## Goal

Implement the 5 answer format rules from the Excel instructions into the present node's insight generation. The LLM output should follow a natural, manager-like narrative format with optional tables and status indicators, replacing the current bullet-only format as the default.

## Rules Being Implemented

| # | Rule | Summary |
|---|------|---------|
| 1 | Narrative Summary | 2 paragraphs <=60 words total. Para 1: strengths. Para 2: gaps. Bold metric names only. |
| 2 | Multi-KPI Table | Table format (not bullets) when multiple KPIs/dimensions. Status column with emoji indicators. Summary always before table. |
| 3 | Status Key | Consistent: On Track (at/above target), At Risk (10-20% below), Behind (>20% below). |
| 4 | Call-to-Action | Only for improvement/diagnostic questions. 2-3 specific, data-backed actions. |
| 5 | Guardrails | Never skip summary. Bold only metrics. $ in millions. No robotic openers. |

## Design Decisions

1. **Dual format — LLM chooses:** The prompt provides two format templates (Narrative+Table and Bullet). The LLM decides which fits the data shape. Narrative+Table is the default for multi-KPI/multi-dimension results; Bullet is a fallback for simple single-value lookups.
2. **Threshold injection from definitions.json:** A new `buildThresholdContext()` function reads all KPI thresholds via the existing `getThreshold()` API and injects them as structured text into the prompt. No changes to `definitionsFetcher.js`.
3. **Call-to-action for WHAT_TO_DO and WHY:** Full call-to-action (2-3 actions) for `WHAT_TO_DO` category. Lighter version (1-2 actions if data supports it) for `WHY` category. No call-to-action for `WHAT_HAPPENED` or default.
4. **Post-processing for mechanical guardrails:** Dollar normalization and status emoji normalization applied programmatically. Format choice and tone left to prompt compliance.
5. **Multi-query parity:** Both `buildInsightInputs()` and `buildMultiQueryInsightInputs()` receive the same `{thresholdContext}` variable. Post-processing runs on the raw output regardless of which path produced it.

## Changes

### 1. Prompt Rewrite — `server/prompts/present.js`

#### 1a. New `buildThresholdContext()` function

Reads thresholds from `definitions.json` via existing `getThreshold()` for each known type (`coverage`, `creation`, `dsScore`, `propensity`) and formats into a text block:

```
KPI Thresholds for Status Assessment:
- Coverage: On Track >= 2.5x, At Risk >= 2.0x, Behind < 2.0x
- Creation Coverage: On Track >= 2.5x, At Risk >= 2.0x, Behind < 2.0x
- Deal Sensei Score: High >= 65, Medium >= 40, Low < 40
- Propensity to Buy: High >= 0.8
```

Returns empty string if no thresholds are loaded (graceful degradation).

#### 1b. Rewrite `INSIGHT_SYSTEM` prompt

Replace the current `FORMAT` section with dual format templates:

**Format A — Narrative + Table** (default for multi-KPI, multi-dimension, or comparison results):
- 2-paragraph summary (<=60 words total, <=30 words each)
- Para 1: Strengths — "Your [Metric] is at..." or "You are at..."
- Para 2: Gaps — "your numbers show [Metric]..."
- Bold **metric names only** — plain text for everything else
- If multiple KPIs or dimensions: markdown table with Status column
- Summary always BEFORE any table

**Format B — Bullet** (for single-value lookups or simple answers):
- 3-5 crisp bullets, 1 sentence each with specific numbers
- Lead with the most important finding

**Shared rules (both formats):**
- Never skip the narrative/opening summary
- Bold only metric names
- Show $ in millions (e.g., $38M)
- Never open with robotic phrases like "Here are your metrics:"
- Natural, analytical, manager-like tone
- Word limit: narrative summary <=60 words. No hard cap on total response length (tables and call-to-action sections are exempt). This replaces the current 300-word hard limit which is too restrictive for the new format.

**Status key (for tables):**
- `✅ On Track` = at or above target
- `⚠️ At Risk` = 10-20% below target
- `🔴 Behind` = >20% below target

**New template variable:** `{thresholdContext}` — injected after `{categoryGuidance}`.

#### 1c. Update category guidance with call-to-action

**`WHAT_TO_DO` guidance** — append:
> "End with a **Call-to-Action** section: 2-3 specific, data-backed actions grounded in actual metric gaps. Never give generic advice. Format as numbered list."

**`WHY` guidance** — append:
> "If the data reveals clear improvement opportunities, end with 1-2 specific actions the user could take."

No changes to `WHAT_HAPPENED` or `DEFAULT_INSIGHT_GUIDANCE`.

#### 1d. Update `buildInsightInputs()` and `buildMultiQueryInsightInputs()`

Add `thresholdContext: buildThresholdContext()` to the returned input objects for both functions.

### 2. Post-Processing — `server/graph/nodes/present.js`

#### 2a. New `postProcessInsights(text)` function

Lightweight fixes for mechanical guardrails:

**Dollar normalization:**
- Regex catches raw dollar amounts (e.g., `$38,000,000`, `$38000000`) and converts to millions/thousands format (`$38M`, `$3.2K`)
- Leaves already-formatted values (`$38M`, `$3.2K`) untouched
- Handles comma-separated numbers and decimal points

**Status emoji normalization:**
- Scans markdown table rows (lines containing `|`) for status text
- Ensures consistent emoji prefixes: `✅ On Track`, `⚠️ At Risk`, `🔴 Behind`
- Only operates on table rows to avoid touching narrative text

#### 2b. Integration into present node flow

Insert `postProcessInsights()` call between raw LLM output and `parseFollowUps()`:

```javascript
// Before (current):
const { cleanedInsights, followUps } = parseFollowUps(insightsRaw);

// After (new):
const processed = postProcessInsights(insightsRaw);
const { cleanedInsights, followUps } = parseFollowUps(processed);
```

### 3. Files NOT Changed

- `server/vectordb/definitionsFetcher.js` — existing `getThreshold()` is sufficient
- `server/config/constants.js` — no new constants needed
- `server/graph/nodes/present.js` routing/logic — only the post-processing addition
- Client code — no rendering changes needed (client already renders markdown)
- Other graph nodes — no changes

## Examples

### Narrative + Table output (multi-KPI question)

```
Your **Pipeline Coverage** is at 3.2x, ahead of target, and **W+F+UC $** is tracking at 87% of quota.

Your numbers show **Gross Creation $** is lagging at 62% — **Pipeline Creation** needs immediate focus.

| KPI | Actual | Target | vs Target | Status |
|-----|--------|--------|-----------|--------|
| Pipeline Coverage | 3.2x | 2.5x | +28% | ✅ On Track |
| W+F+UC $ | $87M | $100M | -13% | ⚠️ At Risk |
| Gross Creation $ | $62M | $100M | -38% | 🔴 Behind |
```

### Bullet output (simple lookup)

```
- Your **Pipeline Coverage** is 3.2x for Q2, above the 2.5x green threshold.
```

### Call-to-Action (WHAT_TO_DO category)

```
Your **Pipeline Coverage** is tracking well at 3.2x, and **SS5+ $** shows healthy progression momentum.

Your numbers show **Pipeline Creation** is the area to focus on — **Gross Creation $** is $38M behind target.

**Call-to-Action:**
1. Prioritize outreach where SS5+ coverage is lowest — EMEA is at 1.1x vs 2.5x target.
2. Review stalled deals — **W+F+UC Stalled %** is elevated at 34%.
3. Pull in pushed deals from Q+1 — $12M in pushed pipeline has DS Score >= 65.
```

## Testing

Manual validation via the chat interface:
1. Ask a multi-KPI question (e.g., "How is my pipeline looking?") — expect narrative + table with status indicators
2. Ask a simple lookup (e.g., "What is my coverage?") — expect bullet or short narrative
3. Ask a WHAT_TO_DO question (e.g., "How should I improve my pipeline?") — expect call-to-action section
4. Ask a WHY question (e.g., "Why is creation lagging?") — expect light action nudge
5. Verify $ values appear as millions, status emoji are consistent, no robotic openers
