# Auto Agents — Pipeline Internals Reference

> Complete input/output specification for every node and tool in the LangGraph workflow.
> Generated 2026-03-16 for analysis and debugging.

---

## Table of Contents

1. [Workflow Overview](#1-workflow-overview)
   - [LLM Model Assignment](#1b-llm-model-assignment)
2. [State Schema](#2-state-schema)
3. [Graph Nodes (Agents)](#3-graph-nodes)
   - [classify](#31-classify)
   - [decompose](#32-decompose)
   - [alignSubQueries](#33-alignsubqueries)
   - [parallelSubQueryPipeline](#34-parallelsubquerypipeline)
   - [subQueryMatch](#35-subquerymatch)
   - [researchAgent](#36-researchagent)
   - [sqlWriterAgent](#37-sqlwriteragent)
   - [injectRls](#38-injectrls)
   - [validate](#39-validate)
   - [correct](#310-correct)
   - [execute](#311-execute)
   - [checkResults](#312-checkresults)
   - [diagnoseEmptyResults](#313-diagnoseemptyresults)
   - [accumulateResult](#314-accumulateresult)
   - [reflect](#315-reflect)
   - [present](#316-present)
   - [dashboardAgent](#317-dashboardagent)
4. [Tools — Research Agent](#4-tools--research-agent)
5. [Tools — SQL Writer Agent](#5-tools--sql-writer-agent)
6. [Tools — SQL Agent (Legacy)](#6-tools--sql-agent-legacy)
7. [Routing Logic](#7-routing-logic)
8. [Key Data Flows](#8-key-data-flows)

---

## 1. Workflow Overview

```
┌─────────┐
│  START   │
└────┬─────┘
     ▼
┌─────────┐   exact      ┌───────────┐
│ classify ├─────────────►│ injectRls  │──► execute ──► ...
└────┬─────┘              └────────────┘
     │ partial/followup   ┌────────────────┐
     ├───────────────────►│ sqlWriterAgent  │──► injectRls ──► ...
     │                    └────────────────┘
     │ SQL_QUERY          ┌────────────────┐    ┌────────────────┐
     ├───────────────────►│ researchAgent   │──►│ sqlWriterAgent  │──► ...
     │                    └────────────────┘    └────────────────┘
     │ needsDecomposition ┌───────────┐  ┌───────────────┐  ┌──────────────────────────┐
     ├───────────────────►│ decompose  │─►│ alignSubQueries│─►│ parallelSubQueryPipeline │──► checkResults
     │                    └───────────┘  └───────────────┘  └──────────────────────────┘
     │ DASHBOARD          ┌────────────────┐
     ├───────────────────►│ dashboardAgent  │──► END
     │                    └────────────────┘
     │ GENERAL_CHAT / CLARIFICATION
     └───────────────────► END (reply in generalChatReply)

Correction Loop:
  validate ──(invalid)──► correct ──► injectRls ──► validate  (up to MAX_CORRECTION_ROUNDS=3)

Empty Results Loop:
  checkResults ──(0 rows)──► diagnoseEmptyResults ──(rewrite)──► validate  (up to MAX_RESULT_RETRIES=2)
```

---

## 1b. LLM Model Assignment

Two model profiles are configured via Azure AI Foundry:

| Profile | Default Model | Env Vars | Cost (per 1M tokens) |
|---------|--------------|----------|---------------------|
| **Opus** | `claude-opus-4-6` | `AZURE_ANTHROPIC_ENDPOINT`, `AZURE_ANTHROPIC_API_KEY`, `AZURE_ANTHROPIC_MODEL_NAME` | $15 input / $75 output |
| **Haiku** | `claude-haiku-4-5` | `AZURE_ANTHROPIC_HAIKU_ENDPOINT`, `AZURE_ANTHROPIC_HAIKU_API_KEY`, `AZURE_ANTHROPIC_HAIKU_MODEL_NAME` | Lower cost, faster |

### Profile Resolution Logic (`server/config/llm.js`)

```
1. If explicit profile passed (e.g., profile: 'haiku') → use it
2. If nodeKey ∈ { 'researchAgent', 'sqlAgent' }       → haiku (auto-fast)
3. Otherwise                                            → opus (default)
```

### Per-Node Model Assignments

| Node | Profile | Model | Mode | Why |
|------|---------|-------|------|-----|
| **classify** (Step 2 LLM) | Opus | `claude-opus-4-6` | Structured output | Accuracy-critical: determines entire pipeline route |
| **classify** (entity extraction) | Opus | `claude-opus-4-6` | Structured output | Blueprint entity parsing needs schema awareness |
| **decompose** | Opus | `claude-opus-4-6` | Structured output | Complex question decomposition needs reasoning |
| **alignSubQueries** (LLM fallback) | Opus | `claude-opus-4-6` | Structured output | Template matching precision |
| **subQueryMatch** (LLM fallback) | Opus | `claude-opus-4-6` | Structured output | Template matching precision |
| **researchAgent** (standard mode) | Haiku | `claude-haiku-4-5` | ReAct agent (streaming) | Auto-fast via `FAST_NODE_KEYS`; tool-calling is cost-heavy |
| **researchAgent** (fast mode, phase 1) | Haiku | `claude-haiku-4-5` | ReAct agent (streaming) | Explicit `profile: 'haiku'`; discovery only |
| **researchAgent** (fast mode, phase 2) | Opus | `claude-opus-4-6` | Structured output | Explicit `profile: 'opus'`; brief synthesis needs quality |
| **sqlWriterAgent** | Haiku | `claude-haiku-4-5` | ReAct agent (invoke/stream) | Explicit `profile: 'haiku'`; SQL generation from brief |
| **validate** (semantic pass) | Opus | `claude-opus-4-6` | Structured output | Logic review needs deep reasoning |
| **correct** | Opus | `claude-opus-4-6` | Direct invoke | Error correction needs precision (explicit Opus when fast mode) |
| **reflect** | Opus | `claude-opus-4-6` | Structured output | SQL quality review needs thoroughness |
| **present** (insights) | Opus | `claude-opus-4-6` | Streaming | User-facing text quality matters |
| **present** (chart recommendation) | Opus | `claude-opus-4-6` | Structured output | Chart spec accuracy |
| **dashboardAgent** | Opus | `claude-opus-4-6` | Structured output | Complex dashboard spec generation |
| **sqlAgent** (legacy) | Haiku | `claude-haiku-4-5` | ReAct agent (streaming) | Auto-fast via `FAST_NODE_KEYS` |

### Override Behavior

The `useFastModel` state flag (set per request) can override defaults:

| `useFastModel` | Effect on researchAgent | Effect on correct | Effect on sqlAgent |
|----------------|------------------------|-------------------|--------------------|
| `null` (default) | Haiku (auto-fast) | Opus (default) | Haiku (auto-fast) |
| `true` | Two-phase: Haiku discovery + Opus synthesis | Forces Opus (upgrade for correction quality) | Haiku |
| `false` | Forces Opus (override auto-fast) | Opus (default) | Forces Opus |

### Typical LLM Call Count Per Query Type

| Query Type | LLM Calls | Models Used |
|------------|-----------|-------------|
| **Exact match** | 0 | None (all deterministic) |
| **Follow-up** | 1–2 | Haiku (writer) + Opus (present) |
| **Standard single** | 3–5 | Haiku (research) + Haiku (writer) + Opus (validate semantic) + Opus (present) |
| **Blueprint (3 sub-queries)** | 8–15 | Opus (entity extract) + 3× [Haiku (research) + Haiku (writer)] + Opus (validate) + Opus (present) |
| **With correction** | +1–2 | Opus (correct) per round |

---

## 2. State Schema

Defined in `server/graph/state.js`. Every node reads from and writes to this shared state.

| Channel | Type | Default | Category | Description |
|---------|------|---------|----------|-------------|
| `question` | string | `''` | Input | User's natural language question |
| `conversationHistory` | array | `[]` | Input | Prior messages `[{role, content, sql?, resultSummary?}]` |
| `sessionId` | string | `''` | Input | Session identifier for memory |
| `isFollowUp` | boolean | `false` | Input | Explicit follow-up flag from UI |
| `presentMode` | string | `'full'` | Input | `full`, `insights`, `chart`, `minimal` |
| `rlsEnabled` | boolean | `true` | Input | RLS injection toggle |
| `impersonateContext` | object\|null | `null` | Input | `{type, flmId?, slmName?, tlmName?}` |
| `validationEnabled` | boolean | `true` | Input | Validation toggle |
| `enabledTools` | object\|null | `null` | Input | `{research: string[], sqlWriter: string[]}` |
| `useFastModel` | boolean\|null | `null` | Input | `true`=Haiku, `false`=Opus, `null`=default |
| `intent` | string | `''` | Classify | `SQL_QUERY`, `DASHBOARD`, `GENERAL_CHAT`, `CLARIFICATION` |
| `complexity` | string | `''` | Classify | `SIMPLE`, `MODERATE`, `COMPLEX` |
| `entities` | object\|null | `null` | Classify | `{metrics[], dimensions[], filters[], operations[]}` |
| `questionCategory` | string | `''` | Classify | `WHAT_HAPPENED`, `WHY`, `WHAT_TO_DO` |
| `questionSubCategory` | string | `''` | Classify | Domain-specific sub-category |
| `templateSql` | string | `''` | Classify | Gold template SQL (exact/partial/followup) |
| `matchType` | string | `''` | Classify | `exact`, `partial`, `followup`, `blueprint`, `dashboard_refine` |
| `needsDecomposition` | boolean | `false` | Classify | Route to decompose node |
| `blueprintId` | string | `''` | Blueprint | Analysis blueprint ID |
| `blueprintMeta` | object\|null | `null` | Blueprint | `{id, name, slashCommand, subQueries[], userParams, presentationHint, suggestedFollowUps[]}` |
| `clarificationQuestions` | array | `[]` | Classify | Questions for user if intent=CLARIFICATION |
| `generalChatReply` | string | `''` | Classify | Reply for GENERAL_CHAT |
| `orchestrationReasoning` | string | `''` | Classify | Explanation of routing decision |
| `queryPlan` | array | `[]` | Decompose | `[{id, subQuestion, purpose, templateId?}]` |
| `currentQueryIndex` | number | `0` | Loop | Index into queryPlan |
| `subQueryMatchFound` | boolean | `false` | Match | Template matched for current sub-query |
| `queries` | array (append) | `[]` | Multi-query | Accumulated sub-query results |
| `researchBrief` | object\|null | `null` | Research | Structured brief (see §3.6) |
| `researchToolCalls` | array | `[]` | Research | Tool calls made by research agent |
| `sql` | string | `''` | Writer | Generated T-SQL |
| `reasoning` | string | `''` | Writer | Explanation of SQL approach |
| `agentToolCalls` | array | `[]` | Writer | All tool calls (research + writer) |
| `reflectionConfidence` | number | `0` | Reflect | 0–1 confidence score |
| `reflectionIssues` | array | `[]` | Reflect | Problems found in SQL |
| `reflectionFeedback` | string | `''` | Reflect | Formatted feedback for retry |
| `reflectionCorrectedSql` | string\|null | `null` | Reflect | Suggested corrected SQL |
| `validationReport` | object\|null | `null` | Validate | `{overall_valid, passes: {rls, syntax, schema, semantic}}` |
| `errorType` | string | `''` | Validate | `RLS_ERROR`, `SYNTAX_ERROR`, `SCHEMA_ERROR`, `SEMANTIC_ERROR`, `EXECUTION_ERROR` |
| `validationMeta` | object\|null | `null` | Validate | Semantic issue buckets |
| `execution` | object\|null | `null` | Execute | `{success, rowCount, columns[], rows[], error?}` |
| `resultsSuspicious` | boolean | `false` | Check | Flag for anomalous results |
| `diagnostics` | object\|null | `null` | Diagnose | `{action, tableCounts, predicates, rewriteStrategy}` |
| `insights` | string | `''` | Present | LLM-generated insights (markdown) |
| `chart` | object\|null | `null` | Present | `{reasoning, charts: [{chartType, title, xAxis, yAxis, series?}]}` |
| `suggestedFollowUps` | array | `[]` | Present | Follow-up questions |
| `dashboardSpec` | object\|null | `null` | Dashboard | Full dashboard spec with tiles and slicers |
| `dashboardHasDataRequest` | boolean | `false` | Dashboard | Dashboard needs to fetch data first |
| `previousDashboardSpec` | object\|null | `null` | Dashboard | Prior spec for refinement |
| `attempts` | object | `{agent:0, correction:0, reflection:0, resultCheck:0}` | Control | Loop counters |
| `trace` | array (append) | `[]` | Control | Accumulated trace entries per node |
| `warnings` | array (append) | `[]` | Control | Accumulated warnings |

---

## 3. Graph Nodes

### 3.1 classify

**File:** `server/graph/nodes/classify.js`
**LLM:** Opus (structured output) — only for Step 2; Steps 0–1 are deterministic

| | State Keys |
|---|---|
| **Reads** | `question`, `previousDashboardSpec`, `conversationHistory`, `sessionId`, `isFollowUp` |
| **Writes** | `intent`, `complexity`, `entities`, `questionCategory`, `questionSubCategory`, `templateSql`, `matchType`, `needsDecomposition`, `blueprintId`, `blueprintMeta`, `clarificationQuestions`, `generalChatReply`, `orchestrationReasoning`, `dashboardHasDataRequest`, `researchBrief` (followup only), `trace` |

**Steps (in order, first match wins):**

| Step | Condition | matchType | Skips | Latency |
|------|-----------|-----------|-------|---------|
| 0a | `previousDashboardSpec` exists | `dashboard_refine` | Everything → dashboardAgent | <5ms |
| 0c | Question starts with blueprint slash command | `blueprint` | LLM classify → decompose | <50ms (entity LLM) |
| 0b | Question matches `/dashboard` pattern | — | Classify → dashboardAgent | <1ms |
| 1 | Token-overlap ≥ 0.8 against gold variants | `exact` | Research + Writer → injectRls | <1ms |
| 1b | `isFollowUp=true` + prior SQL in history | `followup` | Research → sqlWriterAgent | <1ms |
| 2 | LLM classification (all remaining) | `partial` or `''` | Varies | 1–3s |

**Entity extraction (blueprint path):** When a blueprint has user params (e.g., `/pipeline-hygiene for EMEA Q2`), a lightweight LLM call extracts `{metrics, dimensions, filters, operations}` with schema context for accurate mapping.

---

### 3.2 decompose

**File:** `server/graph/nodes/decompose.js`
**LLM:** Opus (structured output) — only for standard path; blueprint path is deterministic

| | State Keys |
|---|---|
| **Reads** | `question`, `blueprintId`, `blueprintMeta`, `questionCategory`, `questionSubCategory` |
| **Writes** | `queryPlan`, `currentQueryIndex` (=0), `trace` |

**Output format — `queryPlan`:**
```json
[
  { "id": "q1", "subQuestion": "Show S3 and S4 deals...", "purpose": "Late-stage pipeline", "templateId": "exact__s3_s4_pipeline" },
  { "id": "q2", "subQuestion": "Show deals over 1M...", "purpose": "Large deal focus" },
  { "id": "q3", "subQuestion": "Show stalled deals...", "purpose": "Stalled pipeline", "templateId": "exact__stalled_deals" }
]
```

---

### 3.3 alignSubQueries

**File:** `server/graph/nodes/alignSubQueriesToTemplates.js`
**LLM:** Opus (only for LLM fallback match when programmatic match fails)

| | State Keys |
|---|---|
| **Reads** | `queryPlan`, `blueprintMeta.userParams` |
| **Writes** | `queryPlan` (updated in-place with canonical questions + templateIds), `currentQueryIndex` (=0), `trace` |

**Per sub-query logic:**
1. If `templateId` exists → resolve from gold examples, rewrite to canonical + append userParams
2. Else → programmatic token-overlap match
3. Else → LLM fallback match
4. If matched → set `templateId`, rewrite `subQuestion`

---

### 3.4 parallelSubQueryPipeline

**File:** `server/graph/nodes/parallelSubQueryPipeline.js`
**LLM:** Haiku (research + writer), Opus (correction)

| | State Keys |
|---|---|
| **Reads** | `queryPlan`, full state for baseState (entities, blueprintMeta, sessionId, etc.) |
| **Writes** | `queries` (all results), `currentQueryIndex` (=plan.length), `sql`, `reasoning`, `execution` (primary result), `researchBrief` (null), `trace` |

**Per sub-query pipeline (3 paths):**

| Path | Condition | Steps |
|------|-----------|-------|
| **1 — Exact** | Template match + no user params | Set `sql` from template → injectRls → validate → execute |
| **2 — Partial** | Template match + user params | Set `templateSql`, `matchType='partial'` → research → writer (sees template + brief) → injectRls → validate → execute |
| **3 — Full** | No template | research → writer → injectRls → validate → execute |

**Correction loop:** Failed sub-queries get up to `PARALLEL_CORRECTION_ROUNDS` (2) retry rounds: correct → injectRls → validate → execute. Each round feeds the new error back.

**Return:** `execution` is set to the first successful sub-query's execution (for chart/table rendering).

---

### 3.5 subQueryMatch

**File:** `server/graph/nodes/subQueryMatch.js`
**LLM:** Opus (LLM fallback only)

| | State Keys |
|---|---|
| **Reads** | `question`, `queryPlan`, `currentQueryIndex` |
| **Writes** | `templateSql`, `subQueryMatchFound`, `trace` |

Used only in the sequential (non-parallel) multi-query loop.

---

### 3.6 researchAgent

**File:** `server/graph/nodes/researchAgent.js`
**LLM:** Haiku (phase 1 discovery) + Opus (phase 2 synthesis) in fast mode; Opus in standard mode

| | State Keys |
|---|---|
| **Reads** | `question`, `entities`, `queryPlan`, `currentQueryIndex`, `conversationHistory`, `complexity`, `useFastModel`, `enabledTools.research`, `questionCategory`, `reflectionFeedback`, `validationReport`, `sessionId` |
| **Writes** | `researchBrief`, `researchToolCalls`, `attempts.agent`, `trace` |

**Output format — `researchBrief`:**
```json
{
  "tables": [
    { "name": "vw_TF_EBI_P2S", "relevantColumns": ["OPP_ID", "ARR"], "description": "Pipeline fact table", "columnMetadata": "OPP_ID (nvarchar) | ARR (float) | ..." }
  ],
  "joins": [
    { "from": "vw_TF_EBI_P2S.REGION_ID", "to": "vw_td_ebi_region_rpt.REGION_ID", "type": "INNER" }
  ],
  "businessRules": ["ROLE_TYPE_DISPLAY = 'AE' when using region_rpt"],
  "examplePatterns": ["Q: pipeline by region → SELECT r.GLOBAL_REGION, SUM(p.ARR)..."],
  "filterValues": [{ "column": "GLOBAL_REGION", "values": ["AMERICAS", "EMEA", "APAC", "WW"] }],
  "fiscalPeriod": "FY2026 Q2",
  "reasoning": "Using P2S joined with region_rpt for pipeline breakdown..."
}
```

**Tools available (6):** `discover_context`, `query_distinct_values`, `inspect_table_columns`, `check_null_ratio`, `search_session_memory`, `submit_research` (or `finish_discovery` in phase 1)

**Research strategy** varies by `questionCategory`:
- `WHAT_HAPPENED` — current-state tables, snapshot data, standard aggregations
- `WHY` — comparison data, breakdown dimensions, diagnostic columns
- `WHAT_TO_DO` — progression candidates, account prioritization, actionable segmentation

---

### 3.7 sqlWriterAgent

**File:** `server/graph/nodes/sqlWriterAgent.js`
**LLM:** Haiku (ReAct agent)

| | State Keys |
|---|---|
| **Reads** | `question`, `templateSql`, `researchBrief`, `matchType`, `complexity`, `conversationHistory`, `entities`, `reflectionFeedback`, `reflectionCorrectedSql`, `queryPlan`, `currentQueryIndex`, `queries`, `sessionId`, `enabledTools.sqlWriter` |
| **Writes** | `sql`, `reasoning`, `agentToolCalls`, `trace` |

**Prompt strategy (3 branches):**

| Branch | Condition | Prompt Content |
|--------|-----------|----------------|
| **Follow-up** | `matchType='followup'` | Prior SQL + follow-up question + prior entities + column reference |
| **Template** | `templateSql` exists AND no `researchBrief` | Template SQL + column reference + adaptation instructions |
| **Research** | `researchBrief` exists (default) | Research brief (tables, joins, rules) + optional template SQL reference + mandatory SQL rules |

**Tools available (1):** `submit_sql`

**Fallback:** If writer produces no SQL and `matchType='partial'` + `templateSql` exists → uses template SQL directly.

---

### 3.8 injectRls

**File:** `server/graph/nodes/injectRls.js`
**LLM:** None

| | State Keys |
|---|---|
| **Reads** | `sql`, `impersonateContext`, `rlsEnabled` |
| **Writes** | `sql` (with RLS filters injected), `trace` |

Injects `WHERE REGION_ID IN (SELECT ...)` filters based on the impersonation context (FLM/SLM/TLM). Skipped if `rlsEnabled=false` or no `impersonateContext`.

---

### 3.9 validate

**File:** `server/graph/nodes/validate.js`
**LLM:** Opus (semantic validation only)

| | State Keys |
|---|---|
| **Reads** | `sql`, `question`, `entities`, `queryPlan`, `currentQueryIndex`, `impersonateContext`, `agentToolCalls` |
| **Writes** | `validationReport`, `errorType`, `warnings`, `validationMeta`, `trace` |

**Validation passes (in order):**

| Pass | Method | Checks |
|------|--------|--------|
| **RLS** | Rule-based | Security filters present for all RLS tables |
| **Syntax** | Database dry-run | SQL Server parses without execution (skipped if agent already dry-ran same SQL) |
| **Schema** | Rule-based | All table and column names exist in schema |
| **Semantic** | LLM | Logic correctness, entity coverage, join validity |

**Output format — `validationReport`:**
```json
{
  "overall_valid": false,
  "passes": {
    "rls": { "passed": true, "issues": [] },
    "syntax": { "passed": false, "issues": [{ "type": "SYNTAX_ERROR", "severity": "error", "description": "..." }] },
    "schema": { "passed": true, "issues": [] },
    "semantic": { "passed": true, "issues": [] }
  }
}
```

---

### 3.10 correct

**File:** `server/graph/nodes/correct.js`
**LLM:** Opus

| | State Keys |
|---|---|
| **Reads** | `sql`, `question`, `validationReport`, `errorType`, `researchBrief`, `reflectionFeedback`, `trace`, `attempts.correction`, `queryPlan`, `currentQueryIndex` |
| **Writes** | `sql` (corrected), `attempts.correction` (incremented), `trace` |

**Error-specific guidance injected into prompt:**

| Error Pattern | Guidance |
|---------------|----------|
| `Invalid column name 'X'` | Column suggestions from schema + "MUST replace with actual column" |
| `Invalid object name 'X'` | Table suggestions via fuzzy match + column metadata for replacements |
| `Incorrect syntax near` | Balance parentheses, check commas, validate CTE structure |
| `Conversion failed nvarchar→int` | Use `TRY_CAST`/`TRY_CONVERT` for ALL mixed-type columns |

---

### 3.11 execute

**File:** `server/graph/nodes/execute.js`
**LLM:** None

| | State Keys |
|---|---|
| **Reads** | `sql`, `question`, `sessionId`, `entities`, `researchBrief`, `questionCategory` |
| **Writes** | `execution`, `errorType` (if failed), `validationReport` (synthetic, if failed), `trace` |

**Output format — `execution`:**
```json
{
  "success": true,
  "rowCount": 42,
  "columns": ["GLOBAL_REGION", "PIPELINE_AMT", "DEAL_COUNT"],
  "rows": [{"GLOBAL_REGION": "EMEA", "PIPELINE_AMT": 15000000, "DEAL_COUNT": 23}, ...],
  "error": null
}
```

On success, adds query to session memory. On failure, constructs synthetic `validationReport` with execution error for the correction loop.

---

### 3.12 checkResults

**File:** `server/graph/nodes/checkResults.js`
**LLM:** None

| | State Keys |
|---|---|
| **Reads** | `execution`, `queries`, `queryPlan`, `currentQueryIndex` |
| **Writes** | `warnings`, `resultsSuspicious`, `attempts.resultCheck`, `trace` |

**Checks:** Empty results (0 rows), row limit hit (1000), high NULL ratios. Sets `resultsSuspicious=true` if 0 rows.

---

### 3.13 diagnoseEmptyResults

**File:** `server/graph/nodes/diagnoseEmptyResults.js`
**LLM:** None

| | State Keys |
|---|---|
| **Reads** | `sql`, `execution`, `attempts.resultCheck` |
| **Writes** | `diagnostics`, `sql` (rewritten if applicable), `warnings`, `trace` |

**Auto-rewrite strategies:**
- `QTR_BKT_IND = 0` → `QTR_BKT_IND IN (0, 1)` (widens quarter filter)
- Other predicate relaxation based on table row counts

**Output format — `diagnostics`:**
```json
{ "action": "retry_with_rewrite", "tableCounts": {"vw_TF_EBI_P2S": 5000000}, "predicates": [...], "rewriteStrategy": "widen_qtr_bkt" }
```

---

### 3.14 accumulateResult

**File:** `server/graph/nodes/accumulateResult.js`
**LLM:** None

| | State Keys |
|---|---|
| **Reads** | `sql`, `reasoning`, `execution`, `question`, `queryPlan`, `currentQueryIndex`, `attempts` |
| **Writes** | `queries` (appends snapshot), `currentQueryIndex` (+1), `sql` (reset `''`), `reasoning` (reset), `execution` (reset null), `researchBrief` (reset null), `attempts` (reset correction/reflection/resultCheck to 0), `trace` |

Snapshots the current sub-query result, increments index, resets working state for the next iteration.

---

### 3.15 reflect

**File:** `server/graph/nodes/reflect.js`
**LLM:** Opus (structured output)

| | State Keys |
|---|---|
| **Reads** | `sql`, `question`, `entities` |
| **Writes** | `reflectionConfidence`, `reflectionIssues`, `reflectionFeedback`, `reflectionCorrectedSql`, `attempts.reflection`, `trace` |

Reviews SQL against question/entities. Returns confidence 0–1. If below threshold (0.6), provides corrected SQL suggestion.

---

### 3.16 present

**File:** `server/graph/nodes/present.js`
**LLM:** Opus (insights generation + chart recommendation)

| | State Keys |
|---|---|
| **Reads** | `execution`, `question`, `questionCategory`, `questionSubCategory`, `entities`, `queries`, `conversationHistory`, `presentMode`, `blueprintMeta` |
| **Writes** | `insights`, `chart`, `suggestedFollowUps`, `partialResultsSummary`, `queries`, `trace` |

**Output format — `chart`:**
```json
{
  "reasoning": "Stacked bar shows pipeline by region and stage",
  "charts": [
    {
      "chartType": "stacked_bar",
      "title": "Pipeline by Region",
      "xAxis": { "key": "GLOBAL_REGION", "label": "Region" },
      "yAxis": [{ "key": "PIPELINE_AMT", "label": "Pipeline ($)" }],
      "series": [{ "key": "SALES_STAGE" }]
    }
  ]
}
```

---

### 3.17 dashboardAgent

**File:** `server/graph/nodes/dashboardAgent.js`
**LLM:** Opus (structured output)

| | State Keys |
|---|---|
| **Reads** | `previousDashboardSpec`, `dashboardRefinement`, `queries`, `execution`, `conversationHistory`, `questionCategory` |
| **Writes** | `dashboardSpec`, `trace` |

**Output format — `dashboardSpec`:**
```json
{
  "title": "Pipeline Hygiene Dashboard",
  "description": "Overview of pipeline health metrics",
  "slicers": [{ "id": "region", "dimension": "GLOBAL_REGION", "values": ["AMERICAS","EMEA","APAC","WW"], "defaultValue": "ALL" }],
  "tiles": [{
    "id": "tile1", "type": "chart", "title": "Pipeline by Stage",
    "sourceIndex": 0,
    "config": { "chartType": "stacked_bar", "xAxis": {...}, "yAxis": [...] },
    "layout": { "x": 0, "y": 0, "w": 6, "h": 4 },
    "filterDimensions": ["GLOBAL_REGION"]
  }]
}
```

---

## 4. Tools — Research Agent

These tools are available to the research ReAct agent (`researchAgent` node).

### 4.1 discover_context

> **The primary research tool.** Call once per research step.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | User question or search terms |
| `entities` | object | No | `{metrics[], dimensions[], filters[], operations[]}` |

**Returns:** Multi-section formatted string:
```
=== TABLES ===
**vw_TF_EBI_P2S** — Pipeline fact table
  Description: ...  Key Columns: ...  Important Columns: ...

=== EXAMPLE SQL PATTERNS ===
Q: "pipeline by region" → SELECT r.GLOBAL_REGION, SUM(p.ARR)...

=== BUSINESS RULES ===
- [FILTER] ROLE_TYPE_DISPLAY = 'AE' when using region_rpt

=== KPI DEFINITIONS ===
- Pipeline Coverage: quota / pipeline ratio...

=== VALID JOINS ===
vw_TF_EBI_P2S ↔ vw_td_ebi_region_rpt ON REGION_ID

=== COLUMN DETAILS (top 5 tables) ===
**vw_TF_EBI_P2S**
OPP_ID (nvarchar) | ARR (float) | SALES_STAGE_NAME (nvarchar) | ...

=== CURRENT FISCAL PERIOD ===
Fiscal Year: 2026  Fiscal Quarter: 2026-Q2  Fiscal Month: March
```

---

### 4.2 query_distinct_values

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `columns` | `[{table, column}]` | Yes (min 1) | Table/column pairs to check |
| `limit` | number | No (default 5) | Max distinct values per column (1–100) |

**Returns:** `{ "vw_TF_EBI_P2S.SALES_STAGE_NAME": ["S1-Prospect","S2-Qualify","S3-Develop","S4-Prove","S5-Close"] }`

---

### 4.3 inspect_table_columns

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tables` | string[] | Yes (1–5) | Table names to inspect |

**Returns:** `{ "vw_TF_EBI_P2S": "OPP_ID (nvarchar, not null) | ARR (float, null) | ..." }`

---

### 4.4 check_null_ratio

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `table` | string | Yes | Table name |
| `column` | string | Yes | Column name |

**Returns:** `"Column ARR in table vw_TF_EBI_P2S: approx 2.30% NULL (230 nulls out of 10000 rows in sample)."`

---

### 4.5 search_session_memory

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search term |

**Returns:** Matching queries and corrections from session history.

---

### 4.6 submit_research

> **Terminal tool.** Ends the research phase.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tables` | `[{name, relevantColumns[], description}]` | Yes | Discovered tables |
| `joins` | `[{from, to, type}]` | Yes | Join relationships |
| `businessRules` | string[] | Yes | Applicable rules |
| `examplePatterns` | string[] | Yes | SQL patterns to follow |
| `filterValues` | `[{column, values[]}]` | Yes | Verified distinct values |
| `fiscalPeriod` | string\|null | Yes | Current fiscal period |
| `reasoning` | string | Yes | Research summary |

**Returns:** JSON string of enriched brief (tables validated against schema, columns verified, hallucinated names removed).

---

### 4.7 finish_discovery

> **Phase 1 terminal tool** (fast mode only). Ends discovery without producing a brief.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `summary` | string | No | Brief summary of findings |

**Returns:** `"Discovery complete. Context has been gathered for brief synthesis."`

---

## 5. Tools — SQL Writer Agent

### 5.1 submit_sql

> **The only tool available to the SQL writer.**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sql` | string | Yes | Complete T-SQL query |
| `reasoning` | string | Yes | Chain-of-thought explanation |

**Returns:** `{ "sql": "SELECT ...", "reasoning": "Used P2S joined with..." }`

---

## 6. Tools — SQL Agent (Legacy)

The `sqlAgent` node (`server/graph/nodes/sqlAgent.js`) is a legacy combined research+write agent with 13 tools. It is not used in the current workflow (replaced by separate research + writer agents) but remains in the codebase.

| # | Tool | Description |
|---|------|-------------|
| 1 | `search_schema` | Semantic schema search with LLM relevance ranking |
| 2 | `search_examples` | Find similar question→SQL gold examples |
| 3 | `search_business_rules` | Lookup business rules by keyword |
| 4 | `get_join_rules` | Valid join definitions between specific tables |
| 5 | `query_distinct_values` | Fetch distinct column values (for filter verification) |
| 6 | `verify_join` | Test if a JOIN produces rows (SELECT TOP 1) |
| 7 | `get_column_metadata` | Column names, types, nullability for a table |
| 8 | `sample_table_data` | 5 sample rows from a table |
| 9 | `dry_run_sql` | Syntax check without execution |
| 10 | `check_null_ratio` | NULL percentage for a column |
| 11 | `get_current_fiscal_period` | Current FY/quarter/month from DB |
| 12 | `search_session_memory` | Prior queries in this session |
| 13 | `submit_sql` | Submit final SQL (terminal) |

Additional utility tools (not attached to any agent, used internally):
- `estimate_query_cost` — Preview execution plan
- `check_table_size` — Row count and size
- `get_cost_summary` — LLM token usage snapshot
- `get_elapsed_time` — Seconds since request start
- `optimize_slow_query` — Optimization suggestions

---

## 7. Routing Logic

All routing functions are in `server/graph/workflow.js`.

### routeAfterClassify

```
previousDashboardSpec?  ──► dashboardAgent
matchType=exact         ──► injectRls        (skip research + writer)
matchType=partial       ──► sqlWriterAgent    (skip research)
matchType=followup      ──► sqlWriterAgent    (skip research)
intent=DASHBOARD
  + dashboardHasDataRequest + needsDecomposition  ──► decompose
  + dashboardHasDataRequest                       ──► researchAgent
  + no data request                               ──► dashboardAgent
intent=SQL_QUERY
  + needsDecomposition  ──► decompose
  + otherwise           ──► researchAgent
otherwise               ──► __end__
```

### routeAfterAlign

```
plan.length > 1  ──► parallelSubQueryPipeline
plan.length = 1  ──► subQueryMatch
```

### routeAfterValidate

```
overall_valid=true                           ──► execute
correction attempts ≥ MAX_CORRECTION_ROUNDS
  + SEMANTIC_ERROR + more sub-queries        ──► accumulateResult (skip)
  + SEMANTIC_ERROR + earlier queries exist    ──► present (partial)
  + SEMANTIC_ERROR + nothing                 ──► __end__
  + other errors                             ──► execute (run anyway)
otherwise                                    ──► correct
```

### routeAfterExecute

```
execution failed + corrections exhausted  ──► checkResults
execution failed + retries left           ──► correct
execution succeeded                       ──► checkResults
```

### routeAfterCheckResults

```
more sub-queries remaining         ──► accumulateResult
0 rows + resultsSuspicious         ──► diagnoseEmptyResults
success + rows > 0 + DASHBOARD     ──► dashboardAgent
success + rows > 0                 ──► present
prior queries exist                ──► present (partial results)
otherwise                          ──► __end__
```

---

## 8. Key Data Flows

### Flow A: Single Query (Standard)

```
User: "What is pipeline by region?"

classify
  IN:  question="What is pipeline by region?"
  OUT: intent=SQL_QUERY, matchType='', entities={dimensions:['region'], metrics:['pipeline']}, questionCategory=WHAT_HAPPENED

researchAgent
  IN:  question, entities, questionCategory
  OUT: researchBrief={tables:[P2S, region_rpt], joins:[...], filterValues:[{GLOBAL_REGION: [AMERICAS,EMEA,...]}], fiscalPeriod="2026-Q2"}

sqlWriterAgent
  IN:  question, researchBrief, entities
  OUT: sql="SELECT r.GLOBAL_REGION, SUM(p.ARR)...", reasoning="Used P2S joined with region_rpt..."

injectRls
  IN:  sql, impersonateContext
  OUT: sql (with WHERE REGION_ID IN (...) injected)

validate
  IN:  sql, question, entities
  OUT: validationReport={overall_valid: true}

execute
  IN:  sql
  OUT: execution={success:true, rowCount:4, columns:[GLOBAL_REGION, PIPELINE_AMT], rows:[...]}

checkResults
  IN:  execution
  OUT: resultsSuspicious=false

present
  IN:  execution, question, questionCategory, entities
  OUT: insights="## Pipeline by Region\nEMEA leads with $15M...", chart={charts:[{chartType:'bar',...}]}, suggestedFollowUps=[...]
```

### Flow B: Blueprint Multi-Query

```
User: "/pipeline-hygiene for EMEA Q2"

classify
  IN:  question="/pipeline-hygiene for EMEA Q2"
  OUT: matchType='blueprint', blueprintId='pipeline_hygiene', blueprintMeta={...userParams:'for EMEA Q2'},
       entities={filters:['EMEA','Q2']}, needsDecomposition=true

decompose (deterministic)
  IN:  blueprintMeta
  OUT: queryPlan=[{id:'q1', subQuestion:'Show S3 and S4 deals...', templateId:'exact__s3_s4'}, ...]

alignSubQueries
  IN:  queryPlan, blueprintMeta.userParams='for EMEA Q2'
  OUT: queryPlan (canonical questions + " for EMEA Q2" appended)

parallelSubQueryPipeline (all 3 in parallel)
  IN:  queryPlan (3 sub-queries)
  Per sub-query: templateMatch → research → writer (sees template + brief + entities) → RLS → validate → execute
  Correction: up to 2 rounds for failures
  OUT: queries=[{q1: 1000 rows}, {q2: 112 rows}, {q3: 85 rows}], execution={first successful}

checkResults → present
  OUT: insights (synthesized from all 3), chart, suggestedFollowUps
```

### Flow C: Exact Match (Fastest)

```
User: "Show me pipeline by sales stage"  (matches gold example exactly)

classify
  OUT: matchType='exact', templateSql="SELECT p.SALES_STAGE_NAME, SUM(p.ARR)...", sql="SELECT..."

injectRls → execute → checkResults → present
(Research + Writer + Validation all skipped)
```

### Flow D: Correction Loop

```
validate
  OUT: validationReport={overall_valid:false, passes:{schema:{passed:false, issues:[{description:"Invalid column name 'SEGMENT'"}]}}}
       errorType='SCHEMA_ERROR'

correct (round 1)
  IN:  sql, validationReport, errorType, researchBrief (column metadata)
  Guidance: "Column SEGMENT does not exist. Suggested: MARKET_SEGMENT (from vw_TF_EBI_P2S)"
  OUT: sql (corrected with MARKET_SEGMENT)

injectRls → validate
  OUT: validationReport={overall_valid:true}  ──► execute
```
