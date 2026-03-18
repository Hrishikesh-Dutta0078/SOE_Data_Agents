# Pipeline Simplification Design

**Date:** 2026-03-18
**Branch:** perf/pipeline-latency-optimization
**Status:** Draft

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
  |-- Dashboard / Clarification / Chat    --> unchanged
                                                |
                                           InjectRLS --> Validate --> Execute --> CheckResults --> Present
                                                ^              |
                                                +-- correct <--+ (up to 3 retries, same Opus call + errors)
```

### Routing (3 routes, all go through same contextFetch --> generateSql path)

| Route | When | Extra Context for Opus |
|-------|------|----------------------|
| **Template** | Classify finds a matching gold example | Template SQL as reference to adapt |
| **Follow-up** | User is continuing a conversation | Conversation history (prior queries, SQLs, results) — no template |
| **Research** | No template match, not a follow-up | Pre-fetched context only |

**Key change:** There is no more "exact match" fast path. All gold example matches are treated as templates for Opus to adapt. This makes the system more flexible (Opus can adjust even "exact" matches to slight query variations).

### Node 1: contextFetch (Programmatic, No LLM Except Table Selection)

Assembles all context the Opus call will need. Runs parallel fetches where possible.

```javascript
contextFetch(state) {
  // 1. Parallel: LLM table selection + keyword searches + fiscal period
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
  const columnMetadata = tableNames.slice(0, 12)
    .map(t => getColumnMetadataForTable(t));

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
- Prefetch for multi-query: same pattern as today, fire-and-forget contextFetch for sub-queries 1..N in background
- Column metadata for top 12 tables (same limit as current discover_context)
- Distinct values come from schema — getSchemaByTableNames() returns them since they are merged into schema-knowledge.json

**State fields written:**
- `contextBundle` — raw context for generateSql
- `trace[]` — appended with node timing, table count

### Node 2: generateSql (Single Opus Call, No Tools)

Receives full context bundle + route-specific context. Outputs SQL + reasoning.

```javascript
generateSql(state) {
  // 1. Build system prompt from contextBundle + route-specific context
  const systemPrompt = buildSystemPrompt({
    contextBundle: state.contextBundle,
    route: state.matchType,              // "template" | "followup" | "research"
    templateSql: state.templateSql,      // only for template route
    conversationHistory: state.conversationHistory,  // only for follow-up route
    entities: state.entities,
    question: state.question,
    validationErrors: state.validationReport,  // only on correction retries
    priorSql: state.sql,                       // only on correction retries
  });

  // 2. Single Opus call
  const response = await opus.invoke([
    { role: "system", content: systemPrompt },
    { role: "user", content: state.question }
  ]);

  // 3. Extract SQL + reasoning
  const { sql, reasoning } = parseResponse(response);

  // 4. Post-validation (repurposed from submitResearch)
  const validated = validateSqlReferences(sql, state.contextBundle.schema);

  return { sql: validated.sql, reasoning, trace: [...] };
}
```

**System prompt structure:**

```
You are a precise T-SQL writer for Microsoft SQL Server.

=== SCHEMA (tables, columns, types, distinct values) ===
[from contextBundle.schema — includes distinct values per column]

=== COLUMN METADATA ===
[exact column reference per table — prevents hallucination]

=== JOIN PATHS ===
[from contextBundle.joinRules]

=== BUSINESS RULES ===
[from contextBundle.rules]

=== EXAMPLE SQL PATTERNS ===
[from contextBundle.examples]

=== KPI DEFINITIONS ===
[from contextBundle.kpis]

=== CURRENT FISCAL PERIOD ===
[from contextBundle.fiscalPeriod]

=== DETECTED ENTITIES ===
[from state.entities — metrics, dimensions, filters, operations]

[ROUTE-SPECIFIC SECTION — one of:]

  === REFERENCE TEMPLATE SQL ===          (template route)
  [templateSql from gold example match]
  Adapt this SQL to match the user's specific request.

  === CONVERSATION HISTORY ===            (follow-up route)
  [prior question/SQL/result pairs]
  Use prior queries as context to build the new query.

  [nothing extra]                         (research route)

[CORRECTION SECTION — only on retries:]

  === PREVIOUS SQL (failed) ===
  [state.sql]
  === VALIDATION ERRORS ===
  [state.validationReport]
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

**Output extraction (with fallback):**
1. Primary: Structured output via function calling — `{ sql, reasoning }`
2. Fallback: Parse ```sql code fence + reasoning text from free-form response

**Post-validation (repurposed from submitResearch):**
- Fuzzy-resolve table names (catches typos like vw_EBI_P2S --> vw_TF_EBI_P2S)
- Verify all column names exist in schema
- Log warnings but don't block — downstream validate node catches hard errors

**Correction flow:**
On validation failure, the graph routes back to generateSql (not contextFetch — context hasn't changed). The node detects state.validationReport and appends the correction section. Same Opus call, richer context. Up to 3 retries (unchanged).

### Knowledge File Merge: Distinct Values into Schema

**New schema-knowledge.json structure:**

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

- Only columns that were in distinct-values.json get `distinct_values` field
- High-cardinality columns (e.g., OPPORTUNITY_ID) have no distinct_values

**Harvest script changes:**
- `npm run harvest:values` reads schema-knowledge.json, injects `distinct_values` per column, writes back
- `npm run harvest:schema` unchanged — writes structural fields only, preserves `distinct_values`
- `distinct-values.json` deleted from repo

**Fetcher changes:**
- `distinctValuesFetcher.js` reads from schema-knowledge.json instead
- Same API: `getDistinctValues(table, column)`, `getAvailableColumns(table)`
- No consumer code changes needed

## Files: Create / Modify / Delete

### Create
| File | Purpose |
|------|---------|
| `server/graph/nodes/contextFetch.js` | Programmatic context assembly node |
| `server/graph/nodes/generateSql.js` | Single Opus LLM call node |

### Modify
| File | Change |
|------|--------|
| `server/context/knowledge/schema-knowledge.json` | Add distinct_values per column |
| `server/vectordb/distinctValuesFetcher.js` | Read from schema-knowledge.json |
| `server/graph/workflow.js` | Replace nodes + simplify routing |
| `server/graph/nodes/classify.js` | Remove exact match path, simplify to template/followup/research |
| `server/graph/nodes/correct.js` | Correction feeds back to generateSql |
| `server/graph/state.js` | Add contextBundle channel, remove researchBrief |
| `server/scripts/harvestDistinctValues.js` | Write into schema-knowledge.json |

### Delete
| File | Reason |
|------|--------|
| `server/context/knowledge/distinct-values.json` | Merged into schema-knowledge.json |
| `server/tools/discoverContext.js` | Logic moved to contextFetch node |
| `server/tools/submitResearch.js` | Validation logic moved to generateSql |
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

## What We Gain

| Metric | Before | After |
|--------|--------|-------|
| LLM calls per query (research + write) | 4-6 (ReAct loop + Haiku) | 2 (table selection + Opus) |
| Latency (research + write) | ~5-8s | ~4-6s |
| Code paths for SQL queries | 3 (exact/partial+followup/normal) | 1 (contextFetch --> generateSql) |
| Tool files (research + write) | 10 | 0 |
| Knowledge files | 2 (schema + distinct values) | 1 (merged schema) |
| Agent complexity | ReAct loop, memoization, single-call enforcement, prefetch coordination | Single LLM call, no tools |

## What We Lose (Acceptable)

- No more exact-match <1ms path — all queries go through Opus (~3-5s). Trade-off: Opus can adapt templates to slight variations, more flexible.
- No more check_null_ratio — rarely used, marginal value.
- No more search_session_memory — conversation history injected directly into prompt.
- No more inspect_table_columns — contextFetch provides metadata for top 12 tables.
- No intermediate research brief artifact — replaced by Opus reasoning in output.

## Unchanged Components

- Decompose node (multi-query breakdown)
- InjectRLS, Validate, Execute, CheckResults, Present nodes
- All knowledge fetchers (schema, rules, joins, KPIs, examples)
- Prefetch system for multi-query (adapted for contextFetch)
- Dashboard agent and routing
- Clarification / General Chat routing
- Classification LLM call (intent + entity detection)
