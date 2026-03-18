# Pipeline Simplification Design

**Date:** 2026-03-18
**Branch:** perf/pipeline-latency-optimization
**Status:** Draft — v2 (addresses spec review feedback)

## Problem Statement

The current research-to-SQL pipeline uses a multi-step agentic architecture with significant overhead:
- Research agent runs a ReAct loop (Opus, up to 16 iterations) calling multiple tools
- SQL writer agent (Haiku) consumes a lossy intermediate "research brief" to generate SQL
- Multiple code paths for different match types (exact, partial, follow-up, normal)
- Distinct values stored in a separate knowledge file from schema
- Edge-case tools (inspect_table_columns, check_null_ratio, search_session_memory) add complexity for marginal value

This results in 4-6 LLM calls per query, ~5-8s latency for the research+write phase, and a codebase with 10+ tool files and 3 distinct routing paths.

## Design Goals

1. Reduce LLM calls from 4-6 to 2 (table selection + SQL generation)
2. Eliminate the ReAct agent loop and all research/SQL tools
3. Unify routing into fewer code paths
4. Merge knowledge files for simpler maintenance
5. Preserve LLM table selection (the most valuable intelligence step)
6. Maintain correction loop and multi-query decomposition capabilities

## New Architecture

### Pipeline Flow

```
Classify
  |-- Template match (gold example found) --> contextFetch --> generateSql (Opus + template SQL)
  |-- Follow-up (continuing conversation) --> contextFetch --> generateSql (Opus + conversation history)
  |-- Research (no match, not follow-up)  --> contextFetch --> generateSql (Opus + context only)
  |-- Dashboard + data request            --> [decompose] --> contextFetch --> generateSql --> ... --> dashboardAgent
  |-- Dashboard (no data request)         --> dashboardAgent (unchanged)
  |-- Clarification / Chat                --> __end__ (unchanged)
                                                |
                                           InjectRLS --> Validate --> Execute --> CheckResults --> Present
                                                ^              |         |
                                                |   correct <--+---------+
                                                |      |
                                                |      v
                                                +-- generateSql (Opus re-invoked with errors + guidance)
```

### Routing (simplified from 6 branches to 4)

| Route | When | Extra Context for Opus |
|-------|------|----------------------|
| **Template** | Classify finds a matching gold example | Template SQL as reference to adapt |
| **Follow-up** | User is continuing a conversation | Conversation history (prior queries, SQLs, results) — no template |
| **Research** | No template match, not a follow-up | Pre-fetched context only |
| **Dashboard data** | Dashboard intent with data request | Same as research/template, routes to dashboardAgent after execution |

**Key changes:**
- No more "exact match" fast path. All gold example matches are templates for Opus to adapt.
- Partial match and exact match merge into a single "template" route.
- Dashboard path B (data fetch) uses the same contextFetch --> generateSql pipeline.
- Follow-up no longer skips validation (since there's no separate validated-SQL cache).

### routeAfterClassify (new)

```javascript
function routeAfterClassify(state) {
  if (state.matchType === 'dashboard_refine') return 'dashboardAgent';

  // All SQL generation routes go through contextFetch --> generateSql
  if (state.intent === 'DASHBOARD') {
    if (state.dashboardHasDataRequest) {
      return state.needsDecomposition ? 'decompose' : 'contextFetch';
    }
    return 'dashboardAgent';
  }
  if (state.intent === 'SQL_QUERY') {
    return state.needsDecomposition ? 'decompose' : 'contextFetch';
  }
  return '__end__';
}
```

Replaces the current 6-branch routing (exact → injectRls, partial → sqlWriter, followup → sqlWriter, dashboard variants, SQL_QUERY variants) with 4 branches.

### routeAfterInjectRls (simplified)

```javascript
function routeAfterInjectRls(state) {
  if (state.validationEnabled === false) return 'execute';
  return 'validate';  // Always validate — no more skip for exact/followup
}
```

---

## Node 1: contextFetch (Programmatic, No LLM Except Table Selection)

Assembles all context the Opus call will need. Runs parallel fetches where possible.

```javascript
async function contextFetchNode(state) {
  const question = getCurrentQuestion(state); // handles multi-query sub-questions
  const entities = state.entities;

  // 1. Parallel: LLM table selection + keyword searches + fiscal period
  const enrichedQuery = buildEnrichedQuery(question, entities);
  const [tableSelection, examples, rules, kpis, fiscalPeriod] = await Promise.all([
    selectTablesAndColumnsByLLM(question, entities),   // ~1-2s (only LLM call)
    searchExamples(enrichedQuery, 5),                   // ~1ms (in-memory)
    searchRules(enrichedQuery, 8),                      // ~1ms (in-memory)
    searchKpis(enrichedQuery, 5),                       // ~1ms (in-memory)
    fetchFiscalPeriod(),                                // ~200ms (DB query)
  ]);

  // 2. Sequential: depends on selected tables
  const { tableNames } = tableSelection;
  const joinRules = getJoinRulesForTables(tableNames);
  const schema = getSchemaByTableNames(tableNames);     // includes distinct values now
  const columnMetadata = {};
  for (const t of tableNames.slice(0, 12)) {
    columnMetadata[t] = getColumnMetadataForTable(t);
  }

  // 3. Return raw context bundle
  return {
    contextBundle: { tableNames, schema, columnMetadata, joinRules,
                     examples, rules, kpis, fiscalPeriod }
  };
}
```

**Design decisions:**
- LLM table selection stays — it handles ambiguous queries well (e.g., "how am I doing?" maps to quota + pipeline tables)
- Returns raw data objects, not formatted text — generateSql formats them into the prompt
- Column metadata for top 12 tables (same limit as current discover_context)
- Distinct values come from schema — `getSchemaByTableNames()` returns them since they are merged into schema-knowledge.json
- Entity enrichment carried over from current `discoverContext.js` (`buildEnrichedQuery`)

**State fields written:**
- `contextBundle` — raw context for generateSql
- `trace[]` — appended with node timing, table count

### Prefetch for Multi-Query

When the decompose node produces multiple sub-queries, contextFetch is invoked per sub-query. To avoid serial LLM table selection calls:

1. `parallelSubQueryPipeline` fires background `contextFetchNode()` calls for sub-queries 1..N while sub-query 0 runs through the full pipeline.
2. Results stored in a `Map<subQueryIndex, contextBundle>`.
3. When sub-query N reaches `contextFetch`, check the prefetch map first (with 2s timeout). If hit, return cached bundle; else run fresh.
4. The LLM table selection call inside `contextFetch` is the expensive part (~1-2s) — prefetching it saves that per sub-query.

This mirrors the existing prefetch pattern in `researchAgent.js` (lines 477-503) but operates on `contextBundle` instead of `discover_context` text.

---

## Node 2: generateSql (Single Opus Call, No Tools)

Receives full context bundle + route-specific context. Outputs SQL + reasoning.

```javascript
async function generateSqlNode(state) {
  // 1. Build system prompt from contextBundle + route-specific context
  const systemPrompt = buildSystemPrompt({
    contextBundle: state.contextBundle,
    matchType: state.matchType,              // "template" | "followup" | "" (research)
    templateSql: state.templateSql,          // only for template route
    conversationHistory: state.conversationHistory,
    entities: state.entities,
    question: state.question,
    // Correction fields (populated by correct node on retries)
    correctionGuidance: state.correctionGuidance,
    priorSql: state.sql,
    validationReport: state.validationReport,
  });

  // 2. Single Opus call — structured output
  const response = await opus.invoke([
    { role: "system", content: systemPrompt },
    { role: "user", content: getCurrentQuestion(state) }
  ]);

  // 3. Extract SQL + reasoning
  const { sql, reasoning } = parseResponse(response);

  // 4. Post-validation (repurposed from submitResearch)
  const validated = validateSqlReferences(sql, state.contextBundle.schema);

  return {
    sql: validated.sql,
    reasoning,
    correctionGuidance: null,  // Clear after use
    trace: [{ node: 'generateSql', duration, ... }]
  };
}
```

### System Prompt Structure

```
You are a precise T-SQL writer for Microsoft SQL Server.

=== SCHEMA (tables, columns, types, distinct values) ===
[from contextBundle.schema — includes distinct values per column]

=== COLUMN METADATA (use ONLY these column names — anything else causes errors) ===
[exact column reference per table, up to 12 tables]

=== JOIN PATHS ===
[from contextBundle.joinRules]

=== BUSINESS RULES ===
[from contextBundle.rules]

=== EXAMPLE SQL PATTERNS ===
[from contextBundle.examples — max 5]

=== KPI DEFINITIONS ===
[from contextBundle.kpis — max 5]

=== CURRENT FISCAL PERIOD ===
[from contextBundle.fiscalPeriod]

=== DETECTED ENTITIES ===
[from state.entities — metrics, dimensions, filters, operations]

[ROUTE-SPECIFIC SECTION — one of:]

  === REFERENCE TEMPLATE SQL ===          (template route)
  [templateSql from gold example match]
  Adapt this SQL to match the user's specific request.

  === CONVERSATION HISTORY ===            (follow-up route)
  [last 5 turns max, each with: question, SQL, result summary]
  Use prior queries as context. Do not reuse prior SQL blindly — build fresh.

  [nothing extra]                         (research route)

[CORRECTION SECTION — only on retries, populated by correct node:]

  === PREVIOUS SQL (failed) ===
  [state.sql]
  === VALIDATION ERRORS ===
  [state.validationReport formatted issues]
  === ERROR-SPECIFIC GUIDANCE ===
  [from state.correctionGuidance — column suggestions, table suggestions, etc.]
  Fix ALL listed issues.

=== MANDATORY SQL RULES ===
- Table aliases for every column reference
- NULLIF() for all divisions
- No SQL comments
- No SUSER_SNAME() / FLM_LDAP (RLS auto-injected)
- JOIN vw_EBI_CALDATE for FISCAL_YR_AND_QTR_DESC labels
- TOP 100 default

Output your SQL and reasoning.
```

### Prompt Size Mitigation

Estimated worst-case token count for 12 tables:
- Schema + distinct values: ~6,000 tokens (12 tables x 500 tokens, cap distinct_values at 10 per column)
- Column metadata: ~3,600 tokens (12 tables x 300 tokens)
- Join rules: ~1,000 tokens
- Business rules: ~1,500 tokens (8 rules)
- Example patterns: ~2,000 tokens (5 examples)
- KPI definitions: ~1,500 tokens (5 KPIs)
- Route-specific: ~2,000 tokens (template SQL or conversation history)
- Correction section: ~3,000 tokens (on retries only)
- **Total: ~17,600 tokens (normal) / ~20,600 tokens (correction retry)**

This is well within Opus context limits. Mitigations if needed:
- Cap distinct_values at 10 per column (vs current 15)
- Limit column metadata to top 8 tables (vs 12)
- Truncate conversation history to last 3 turns (vs 5)

### Output Extraction (with fallback)

1. **Primary:** Structured output via `withStructuredOutput()` — schema: `{ sql: z.string(), reasoning: z.string() }`
2. **Fallback:** Parse ```sql code fence + reasoning text from free-form response

### Post-Validation (repurposed from submitResearch)

The `validateSqlReferences()` function reuses existing logic:
- Fuzzy-resolve table names (catches typos like `vw_EBI_P2S` → `vw_TF_EBI_P2S`)
- Verify all column names exist in schema
- Log warnings but don't block — downstream validate node catches hard errors

---

## Correction Flow (Revised)

**Current:** `validate` / `execute` → `correct` (standalone LLM call) → `injectRls` → validate again

**New:** `validate` / `execute` → `correct` (error analyzer, no LLM) → `generateSql` (Opus re-invoked) → `injectRls` → validate again

The `correct` node is **repurposed as a lightweight error analyzer** (no LLM call). It:

1. Analyzes error type (SYNTAX_ERROR, SCHEMA_ERROR, EXECUTION_ERROR, SEMANTIC_ERROR)
2. Generates error-specific guidance using existing logic from `correct.js`:
   - `suggestColumnsForInvalidName()` — finds similar column names for hallucinated ones
   - `suggestTablesForInvalidName()` — finds similar table names
   - Type conversion guidance (TRY_CAST/TRY_CONVERT hints)
   - Syntax error guidance (parenthesis balancing, comma checks)
   - Prior correction attempts tracking (from trace)
3. Writes `correctionGuidance` string to state
4. Routes to `generateSql` (which detects the correction fields and appends them to the prompt)

This preserves the sophisticated error analysis from `correct.js` while using Opus (not a separate LLM) for the actual SQL fix.

### New Workflow Edges for Correction

```javascript
// Old:
.addEdge('correct', 'injectRls')

// New:
.addEdge('correct', 'generateSql')
.addEdge('generateSql', 'injectRls')  // (already exists from normal flow)
```

### State Fields for Correction

```javascript
// Added to state:
correctionGuidance: Annotation({ reducer: (a, b) => b ?? a, default: () => null })
// Set by correct node, consumed and cleared by generateSql
```

---

## Multi-Query Decomposition (Updated)

The decompose → sub-query pipeline uses the new nodes.

### Current Flow
```
decompose → alignSubQueries → parallelSubQueryPipeline
                                  (internally: researchAgent → sqlWriterAgent → injectRls → validate → execute per sub-query)
                              → checkResults → accumulateResult → subQueryMatch → ...
```

### New Flow
```
decompose → alignSubQueries → parallelSubQueryPipeline
                                  (internally: contextFetch → generateSql → injectRls → validate → execute per sub-query)
                              → checkResults → accumulateResult → subQueryMatch → ...
```

**Changes:**
- `parallelSubQueryPipeline` calls `contextFetch → generateSql` instead of `researchAgent → sqlWriterAgent`
- `subQueryMatch` routes to `contextFetch` (with template) instead of `sqlWriterAgent`
- `routeAfterSubQueryMatch` simplified: template found → `contextFetch` (with templateSql), no match → `contextFetch` (research route)
- Prefetch fires `contextFetchNode()` in background for upcoming sub-queries (see prefetch section above)

### Files Affected
- `server/graph/nodes/parallelSubQueryPipeline.js` — replace internal research+writer calls with contextFetch+generateSql
- `server/graph/nodes/subQueryMatch.js` — route to contextFetch instead of sqlWriterAgent/researchAgent
- `server/graph/nodes/accumulateResult.js` — replace `researchBrief` references with `contextBundle`

---

## State Channel Migration: researchBrief → contextBundle

The `researchBrief` state channel is removed. All consumers migrate to `contextBundle`.

| Consumer | Current Usage | Migration |
|----------|--------------|-----------|
| `sqlWriterAgent.js` | Reads `researchBrief` to build prompt | **Deleted** — `generateSql` reads `contextBundle` directly |
| `correct.js` | Reads `researchBrief.tables` for column metadata | Reads `contextBundle.columnMetadata` instead |
| `classify.js` (follow-up) | Checks if `researchBrief` exists | Not needed — follow-up uses conversation history |
| `parallelSubQueryPipeline.js` | Stores per-sub-query `researchBrief` | Stores per-sub-query `contextBundle` |
| `accumulateResult.js` | Accumulates `researchBrief` from sub-queries | Accumulates `contextBundle` from sub-queries |

### New State Channels

```javascript
// Add:
contextBundle: Annotation({ reducer: (a, b) => b ?? a, default: () => null })
correctionGuidance: Annotation({ reducer: (a, b) => b ?? a, default: () => null })

// Remove:
researchBrief      // replaced by contextBundle
researchToolCalls  // no more tools
agentToolCalls     // no more tools
```

---

## Knowledge File Merge: Distinct Values into Schema

### New schema-knowledge.json Structure

```json
{
  "vw_TF_EBI_P2S": {
    "description": "Pipeline fact table...",
    "key_columns": "OPPORTUNITY_ID, SNAPSHOT_DATE_ID",
    "important_columns": "OPPTY, SALES_STAGE_ID, REGION_ID",
    "columns": {
      "SALES_STAGE_ID": {
        "type": "BIGINT",
        "description": "sales stage identifier",
        "pk": false,
        "fk": true,
        "distinct_values": ["S3", "S4", "S5", "S6", "S7"]
      },
      "PAY_MEASURE_ID": {
        "type": "INT",
        "description": "payment measure type",
        "pk": false,
        "fk": false,
        "distinct_values": [0, 1]
      },
      "OPPORTUNITY_ID": {
        "type": "BIGINT",
        "description": "unique opportunity identifier",
        "pk": true,
        "fk": false
      }
    }
  }
}
```

- Only columns that were in `distinct-values.json` get a `distinct_values` field
- High-cardinality columns (e.g., OPPORTUNITY_ID) have no `distinct_values`

### Harvest Script Changes

**Execution order:** `harvest:schema` first (structural), then `harvest:values` (injects distinct_values).

- `npm run harvest:values`:
  1. Reads `schema-knowledge.json`
  2. For each harvested column, sets `columns[col].distinct_values = [...]`
  3. Writes back to `schema-knowledge.json`
  4. Atomic write: write to temp file, then rename (prevents corruption)

- `npm run harvest:schema`:
  1. Writes structural fields (description, key_columns, columns with type/pk/fk)
  2. **Preserves** existing `distinct_values` fields during merge (reads current file first, merges structural updates, writes back)

- `distinct-values.json` deleted from repo after successful merge

### Fetcher Changes

`distinctValuesFetcher.js` updated:
- `loadDistinctValuesAsync()` reads from `schema-knowledge.json`, extracts `distinct_values` fields
- Same public API: `getDistinctValues(table, column)`, `getAvailableColumns(table)`
- No consumer code changes needed

---

## Files: Create / Modify / Delete

### Create
| File | Purpose |
|------|---------|
| `server/graph/nodes/contextFetch.js` | Programmatic context assembly node |
| `server/graph/nodes/generateSql.js` | Single Opus LLM call node |

### Modify
| File | Change |
|------|--------|
| `server/context/knowledge/schema-knowledge.json` | Add `distinct_values` per column |
| `server/vectordb/distinctValuesFetcher.js` | Read from schema-knowledge.json |
| `server/graph/workflow.js` | Replace nodes, simplify routing functions, update edges |
| `server/graph/nodes/classify.js` | Remove exact match path, emit template/followup/research matchTypes |
| `server/graph/nodes/correct.js` | Remove LLM call, become error analyzer only, route to generateSql |
| `server/graph/state.js` | Add `contextBundle` + `correctionGuidance`, remove `researchBrief` + `researchToolCalls` + `agentToolCalls` |
| `server/scripts/harvestDistinctValues.js` | Write into schema-knowledge.json (merge strategy) |
| `server/graph/nodes/parallelSubQueryPipeline.js` | Use contextFetch + generateSql instead of research + writer |
| `server/graph/nodes/subQueryMatch.js` | Route to contextFetch instead of sqlWriter/researchAgent |
| `server/graph/nodes/accumulateResult.js` | Replace `researchBrief` references with `contextBundle` |

### Delete
| File | Reason |
|------|--------|
| `server/context/knowledge/distinct-values.json` | Merged into schema-knowledge.json |
| `server/tools/discoverContext.js` | Logic moved to contextFetch node |
| `server/tools/submitResearch.js` | Validation logic moved to generateSql (post-validation) |
| `server/tools/submitSql.js` | No more tool-based submission |
| `server/tools/inspectTableColumns.js` | Dropped |
| `server/tools/checkNullRatio.js` | Dropped |
| `server/tools/searchSessionMemory.js` | Dropped |
| `server/tools/queryDistinctValues.js` | Already unused, delete file |
| `server/tools/researchTools.js` | No more research tool array |
| `server/tools/sqlTools.js` | No more SQL writer tools |
| `server/graph/nodes/researchAgent.js` | Replaced by contextFetch |
| `server/graph/nodes/sqlWriterAgent.js` | Replaced by generateSql |
| `server/prompts/researchAgent.js` | Prompt built in generateSql |
| `server/prompts/sqlAgent.js` | Prompt built in generateSql |

---

## What We Gain

| Metric | Before | After |
|--------|--------|-------|
| LLM calls per query (research + write) | 4-6 (ReAct loop + Haiku) | 2 (table selection + Opus) |
| Latency (research + write) | ~5-8s | ~4-6s |
| Code paths for SQL queries | 4 (exact/partial/followup/normal) | 1 (contextFetch → generateSql, context varies) |
| Tool files (research + write) | 10 | 0 |
| Knowledge files | 2 (schema + distinct values) | 1 (merged schema) |
| Agent complexity | ReAct loop, memoization, single-call enforcement, prefetch | Single LLM call, no tools |
| Correction flow | Separate LLM call (correct node) | Same Opus call with error guidance appended |

## What We Lose (Acceptable)

- No more exact-match <1ms path — all queries go through Opus (~3-5s). Trade-off: Opus can adapt templates to slight variations.
- No more `check_null_ratio` — rarely used, marginal value.
- No more `search_session_memory` — conversation history injected directly into prompt.
- No more `inspect_table_columns` — contextFetch provides metadata for top 12 tables.
- No intermediate research brief artifact — replaced by Opus reasoning in output.
- Follow-up queries no longer skip validation — acceptable since Opus may adapt prior SQL.

## Unchanged Components

- Decompose node (multi-query breakdown)
- InjectRLS, Validate, Execute, CheckResults, Present nodes
- DashboardAgent node and dashboard refinement routing
- DiagnoseEmptyResults node
- All knowledge fetchers (schema, rules, joins, KPIs, examples) — API unchanged
- Clarification / General Chat routing
- Classification LLM call (intent + entity detection)
