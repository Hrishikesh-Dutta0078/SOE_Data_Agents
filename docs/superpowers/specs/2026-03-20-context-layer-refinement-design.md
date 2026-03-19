# Context Layer Refinement — Design Spec

**Date**: 2026-03-20
**Branch**: `refactor/context-refinement`
**Goal**: Eliminate redundancy, improve crispness, and boost SQL generation accuracy by restructuring `server/context/` into a layered architecture optimized for Opus 4.6 consumption.

---

## Problem Statement

The current context layer has ~14K lines across 8 files (~460KB) with significant redundancy:

- **Coverage thresholds** (Green >= 2.5x, Yellow >= 2.0x, Red < 2.0x) defined in 4 separate places
- **Mandatory WHERE filters** repeated verbatim in all 20 gold example SQL queries (~1,400 lines of pure duplication)
- **CTE templates** (quota, pipe, base) near-identical across 4-5 gold queries; similar pipe-only pattern in 6-7 more
- **Join rules lack guidance** — multiple possible join keys per table pair with no indication of which is primary, what cardinality is, or which join type to use
- **DS Score interpretation** duplicated across business-context.md and strategic-framework.md
- **`strategic-framework.md`** loaded nowhere in the codebase (142 lines of dead content)
- **Distinct values for text columns** (FORECAST_NOTES, DEAL_REVIEW_NOTES) injected as token-wasting noise

This causes: conflicting definitions confuse the LLM, wasted prompt tokens, and maintenance burden (update one threshold = edit 4 files).

## Design Principles (Opus 4.6 Optimized)

1. **Single canonical definition per concept** — no duplication across files
2. **Compact reference tables over prose** — the LLM processes structured data faster than narratives
3. **Distinct values only for filterable/enum columns** — not free-text fields
4. **SQL patterns shown once** — with clear "use when X" instructions
5. **Business rules as numbered imperatives** — not narrative paragraphs
6. **Explicit join guidance** — which key to use, which join type, what cardinality
7. **Fetchers resolve references** — data files can cross-reference; prompts receive fully-expanded context

## Architecture: Layered Context

```
server/context/
├── definitions.json              [NEW]     Layer 0: Canonical constants
├── goldExamples.json             [REFACTOR] Layer 3: Deduplicate mandatory filters, keep full SQL
├── dashboardGoldExamples.json    [MINOR]    Deduplicate repeated insight/threshold text in tile configs
├── knowledge/
│   ├── schema-knowledge.json     [TRIM]     Layer 1: Remove text-column distinct values + obvious descriptions
│   ├── business-rules.md         [NEW]      Layer 2: Merged business-context.md + strategic-framework.md
│   ├── join-knowledge.json       [ENRICH]   Layer 4: Add primaryKey, cardinality, joinType, alternateKeys guidance
│   ├── kpi-glossary.json         [DEDUP]    Layer 4: Remove abbreviations (moved to definitions.json)
│   ├── analysis-blueprints.json  [UNCHANGED]
│   ├── business-context.md       [DELETE]   Absorbed into business-rules.md + definitions.json
│   └── strategic-framework.md    [DELETE]   Absorbed into business-rules.md + definitions.json
```

---

## Layer 0: `definitions.json` — Canonical Constants

**Purpose**: Single source of truth for all values currently duplicated across files.

**Schema**:

```json
{
  "thresholds": {
    "coverage": { "green": 2.5, "yellow": 2.0, "label": "Coverage_Quality" },
    "creation": { "green": 2.5, "yellow": 2.0, "label": "Creation_Coverage_Quality" },
    "dsScore": { "high": 65, "medium": 40 },
    "propensity": { "high": 0.8 },
    "stalled": { "dsnsm": 30, "altDays": 90, "altDsnsm": 15 }
  },
  "salesStageMapping": {
    "-1": "N/A",
    "1": "Closed - Booked",
    "2": "S7",
    "3": "S6",
    "4": "S5",
    "5": "S4",
    "6": "S3",
    "7": "S2",
    "8": "S1",
    "9": "Closed Lost from Pipe",
    "10": "Closed CleanUp from Pipe",
    "11": "Closed Lost from Non Pipe",
    "12": "Closed CleanUp from Non Pipe"
  },
  "activePipelineStages": ["S3", "S4", "S5", "S6", "S7"],
  "activePipelineStageIds": [2, 3, 4, 5, 6],
  "mandatoryFilters": [
    {
      "id": "role_type",
      "sql": "r.ROLE_TYPE_DISPLAY = 'AE'",
      "appliesTo": ["vw_td_ebi_region_rpt"],
      "always": true
    },
    {
      "id": "bu_group",
      "sql": "rc.ROLE_COVERAGE_BU_GROUP = 'DMX'",
      "appliesTo": ["vw_TD_EBI_ROLE_Coverage"],
      "always": true
    },
    {
      "id": "sales_team_bu",
      "sql": "r.SALES_TEAM_BU IN ('#NA','DX','DX/DME','WW')",
      "appliesTo": ["vw_td_ebi_region_rpt"],
      "always": true
    },
    {
      "id": "pay_measure",
      "sql": "PAY_MEASURE_ID = 0",
      "appliesTo": ["vw_TF_EBI_P2S", "vw_TF_EBI_QUOTA"],
      "always": true
    },
    {
      "id": "exclude_advertising",
      "sql": "o.MOPG1 <> 'ADVERTISING'",
      "appliesTo": ["vw_EBI_OPG"],
      "always": true
    },
    {
      "id": "exclude_ppbu",
      "sql": "o.DMX_SOLUTION_GROUP <> 'PPBU'",
      "appliesTo": ["vw_EBI_OPG"],
      "always": true
    },
    {
      "id": "exclude_dme_region",
      "sql": "(r.SALES_REGION NOT LIKE '%DME%' OR r.SALES_REGION IS NULL)",
      "appliesTo": ["vw_td_ebi_region_rpt"],
      "always": true
    },
    {
      "id": "exclude_teams",
      "sql": "r.SALES_TEAM NOT IN ('AMER IND PS DX','AMER LATAM PS','AMER ENT PS DX','AMER PUB SEC SPECIALIST')",
      "appliesTo": ["vw_td_ebi_region_rpt"],
      "always": true
    },
    {
      "id": "snapshot_week",
      "sql": "c.WEEK_SORT_ORDER_REVERSE = 0",
      "appliesTo": ["vw_EBI_CALDATE"],
      "always": true,
      "note": "Join pipeline/quota facts to vw_EBI_CALDATE on SNAPSHOT_DATE_ID = DATE_KEY"
    },
    {
      "id": "global_region",
      "sql": "r.GLOBAL_REGION IN ('AMERICAS','EMEA','APAC','WW')",
      "appliesTo": ["vw_td_ebi_region_rpt"],
      "always": false,
      "note": "Only when filtering by GLOBAL_REGION"
    },
    {
      "id": "rpt_hierarchy",
      "sql": "IS_CY_RPT_HIER = 1",
      "appliesTo": ["vw_td_ebi_region_rpt"],
      "always": false,
      "note": "When reporting hierarchy column is in scope"
    },
    {
      "id": "dummy_terr",
      "sql": "r.TERR_ID NOT LIKE '%_%Dummy%'",
      "appliesTo": ["vw_td_ebi_region_rpt"],
      "always": false,
      "note": "For quota queries"
    }
  ],
  "abbreviations": {
    "W": "Won",
    "F": "Forecast",
    "UC": "Upside Committed",
    "CQ": "Current Quarter",
    "PQ": "Previous Quarter",
    "FQ": "Future Quarter",
    "QTD": "Quarter to Date",
    "YTD": "Year to Date",
    "H1": "First Half (Q1+Q2)",
    "LTG": "Left to Go",
    "Covx": "Coverage",
    "BOQ": "Beginning of Quarter",
    "DSNSM": "Days Since Next Step Modified",
    "SD": "Stage Duration",
    "RBOB": "Renewal Base of Business",
    "GNARR": "Gross New ARR",
    "ARRAVG": "ARR Average",
    "R4Q": "Rolling 4 Quarters",
    "IC": "In Contract",
    "OOC": "Out of Contract",
    "FLM": "First Level Manager",
    "SLM": "Second Level Manager",
    "TLM": "Third Level Manager",
    "AE": "Account Executive",
    "QRF": "Quarterly Revenue Forecast",
    "S3": "Sales Stage 3",
    "S4": "Sales Stage 4",
    "S5": "Sales Stage 5",
    "S3+": "Sales Stage 3 and above",
    "S5+": "Sales Stage 5 and above",
    "SS5+": "Sales Stage 5 and above"
  },
  "creationTargetWeights": {
    "0": "IN_QTR_GC_TARGET",
    "1": "PIPE_TARGET_SURVIVAL_RATE * 0.4",
    "2": "PIPE_TARGET_SURVIVAL_RATE * 0.4",
    "3": "PIPE_TARGET_SURVIVAL_RATE * 0.14",
    "4": "PIPE_TARGET_SURVIVAL_RATE * 0.05"
  }
}
```

**Consumers**: All fetchers load this at startup via a new `definitionsFetcher.js`. No raw injection into prompts — fetchers resolve references.

---

## Layer 1: `schema-knowledge.json` — Trimmed

### What to remove

1. **Distinct values for text/narrative columns** — columns whose distinct values are multi-sentence strings (FORECAST_NOTES, DEAL_REVIEW_NOTES, GEO_FORECAST_NOTES, NEXT_STEP, OPPORTUNITY_DESCRIPTION, etc.). These waste tokens and provide no filtering value.

2. **Obvious descriptions** — descriptions that merely restate the column name:
   - `"REGION_ID": { "description": "unique region identifier" }` -> remove description
   - `"SALES_TEAM": { "description": "named sales team" }` -> remove description
   - Keep descriptions only where they add non-obvious information (e.g., business logic, filter implications, gotchas)

3. **Redundant FK/PK metadata for non-join columns** — columns that are never used in joins don't need `"fk": false, "pk": false`. Default to false; only include when true.

### What to keep

- All table descriptions
- All column names and types
- Distinct values for **enum/filter columns** (SALES_STAGE, GLOBAL_REGION, BU, ROLE_TYPE_DISPLAY, MOPG1, DMX_SOLUTION_GROUP, WALK_CATEGORY, etc.)
- Non-obvious descriptions (business logic, gotchas, interpretation notes)
- PK/FK flags where true

### Implementation

Add a `"skipDistinct": true` flag to text columns during a one-time cleanup pass. The schemaFetcher already limits distinct values to 15 per column; the cleanup will remove pre-harvested values from text columns entirely.

**Estimated reduction**: ~30-40% of file size (from 350KB to ~210-240KB).

---

## Layer 2: `business-rules.md` — Consolidated

### Source material
- `business-context.md` (238 lines) — full content
- `strategic-framework.md` (142 lines) — useful content not already in business-context.md

### Structure

Organized by **pipeline stage** (when the rule is needed), not by topic:

```markdown
# Business Rules

## 1. Classification Rules
[Question taxonomy: WHAT_HAPPENED / WHY / WHAT_TO_DO with sub-categories]
[Follow-up progression: What -> Why -> Fix]

## 2. Schema Interpretation
[Key terminology — Pipeline, Quota, Coverage, Gap, Creation, Pipe Walk]
[Account hierarchy — parent vs sub, ACCOUNT_SUB_ID vs PARENT_ACCOUNT_ID]
[Sales org — GLOBAL_REGION, REGION, SUB_REGION, FLM/SLM/TLM]
[Products — OPG, MOPG1, BU, Solution Group]
[Scoring — ICP, UCP, AES, FIT_SCORE, propensity, intent]
[Time dimensions — fiscal year, snapshot, FISCAL_YR_AND_QTR_DESC format]
[Current user context — FLM, "my team" = AEs under this FLM]
[Common ambiguities — region, account, product, score]

## 3. SQL Generation Rules
[Numbered imperatives, not prose]
1. Apply mandatory filters from definitions.json for all tables in your query.
2. Filter stages by NAME via vw_ebi_sales_stage join, never by SALES_STAGE_ID directly.
3. For quota-vs-pipe analysis, use separate CTEs joined via FULL OUTER JOIN on TERR_ID, REP_NAME, Close_Qtr, BU, ROLE_COVERAGE_BU, ROLE_COVERAGE_BU_GROUP.
4. Use NULLIF(denominator, 0) for all ratio computations.
5. Use COUNT(DISTINCT OPP_ID) for opportunity counts (fact rows duplicate across snapshots).
6. FISCAL_YR_AND_QTR_DESC format is 'YYYY-QN'. Never use 'FY' prefix.
7. Derive current quarter from discover_context CURRENT FISCAL PERIOD. Never hardcode.
8. For "top N" queries, use SELECT TOP N ... ORDER BY metric DESC (T-SQL).
9. Always include vw_TD_EBI_ROLE_Coverage (on ROLE_COVERAGE_ID) in quota/pipeline queries.
10. For pipeline creation, use OPP_CREATE_DATE_ID with QTR_BKT_IND = 0 and close dates in QTR_BKT_IND IN (0,1,2,3,4).
11. Country queries: join on ACCOUNT_COUNTRY_ID = COUNTRY_ID, filter IS_ACTIVE = 1.
12. When user says "by region", default to GLOBAL_REGION.
13. Pipeline amount column is Oppty (FLOAT) in vw_TF_EBI_P2S, aggregated via SUM(Oppty).

## 4. Presentation Rules
[DS Score interpretation: >= 65 prioritize, 40-64 review risks, < 40 high risk]
[Stalled criteria: DSNSM > 30 OR (SD > 90 AND DSNSM > 15)]
[Leading signals: stage momentum, DS trends, missing plan elements, push count]
[Lagging signals: coverage gap, low SS5+, rolling 4Q decline]
[Week-in-quarter benchmarks: Week 4/7/10/13 checkpoints]
[Standard interventions by stall reason — table]
```

### What gets removed (absorbed into definitions.json)
- Coverage threshold values (Green/Yellow/Red numbers)
- Sales stage mapping table
- Mandatory filter SQL snippets
- KPI abbreviation table
- Creation target weights

### What gets removed (dead/redundant)
- All content from strategic-framework.md that duplicates business-context.md
- Prose re-explanations of filters already listed in the mandatory filters section
- strategic-framework.md file itself (deleted)

**Estimated result**: ~160-180 lines (down from 238 + 142 = 380 combined).

---

## Layer 3: `goldExamples.json` — Deduplicated Filters, Full SQL Retained

### Design rationale

The 20 gold examples have significant CTE variation — only 4-5 share the exact quota+pipe+base pattern, while 6-7 share a simpler pipe-only pattern, and ~9 have structurally unique SQL (creation targets, deal lists, stalled pipeline, pipe walk, etc.). A runtime template resolution engine would be over-engineered and fragile.

Instead, we take a **simpler, safer approach**: every example keeps its complete `sql` field (no runtime resolution), but the file gains a `_filterReference` block that serves as the canonical mandatory filter definition for **maintenance and validation**.

### New schema

```json
{
  "_filterReference": {
    "_comment": "Canonical mandatory filters. Not resolved at runtime — used by validation script to verify all examples include these filters where applicable.",
    "quotaFilters": "q.PAY_MEASURE_ID = 0 AND r.TERR_ID NOT LIKE '%_%Dummy%' AND r.ROLE_TYPE_DISPLAY = 'AE' AND rc.ROLE_COVERAGE_BU_GROUP = 'DMX' AND r.SALES_TEAM_BU IN ('#NA','DX','DX/DME','WW') AND (r.SALES_REGION NOT LIKE '%DME%' OR r.SALES_REGION IS NULL) AND r.SALES_TEAM NOT IN ('AMER IND PS DX','AMER LATAM PS','AMER ENT PS DX','AMER PUB SEC SPECIALIST') AND o.MOPG1 <> 'ADVERTISING' AND o.DMX_SOLUTION_GROUP <> 'PPBU'",
    "pipeFilters": "p.PAY_MEASURE_ID = 0 AND r.ROLE_TYPE_DISPLAY = 'AE' AND rc.ROLE_COVERAGE_BU_GROUP = 'DMX' AND r.SALES_TEAM_BU IN ('#NA','DX','DX/DME','WW') AND (r.SALES_REGION NOT LIKE '%DME%' OR r.SALES_REGION IS NULL) AND r.SALES_TEAM NOT IN ('AMER IND PS DX','AMER LATAM PS','AMER ENT PS DX','AMER PUB SEC SPECIALIST') AND o.MOPG1 <> 'ADVERTISING' AND o.DMX_SOLUTION_GROUP <> 'PPBU'",
    "snapshotSubquery": "p.SNAPSHOT_DATE_ID = (SELECT MAX(p2.SNAPSHOT_DATE_ID) FROM vw_TF_EBI_P2S p2 JOIN vw_EBI_CALDATE c2 ON p2.SNAPSHOT_DATE_ID = c2.DATE_KEY WHERE c2.WEEK_SORT_ORDER_REVERSE = 0)"
  },
  "examples": [
    {
      "id": "exact__pipe_coverage",
      "question": "How has my performance been?",
      "questionCategory": "WHAT_HAPPENED",
      "questionSubCategory": "coverage_creation",
      "sql": "<full SQL — unchanged from current file>",
      "tables_used": ["vw_TF_EBI_QUOTA", "vw_td_ebi_region_rpt", ...],
      "variants": ["Show my performance", "What's my pipe coverage?", ...]
    }
  ]
}
```

### What changes

1. **Add `_filterReference` block** at the top — documents the canonical filter patterns for quota and pipe queries. This is the single maintenance point: when a filter changes, update `_filterReference`, then update each example's SQL to match (or run the validation script to find mismatches).

2. **Remove `notes` field** from examples where present — content absorbed into business-rules.md or is obvious from the SQL.

3. **Keep `questionCategory` and `questionSubCategory`** on examples — classify.js's exact-match path (which skips the LLM call) reads these fields directly at lines 377-378 to set routing state. Removing them would silently degrade classification for all template-matched queries.

4. **Add validation script** (`npm run validate:examples`) — iterates all examples, checks that each SQL containing quota/pipe tables includes the corresponding mandatory filters from `_filterReference`. Reports mismatches. Run during CI or after editing examples.

### What stays per example
- `id`, `question`, `questionCategory`, `questionSubCategory`, `sql` (full, complete SQL), `tables_used`, `variants`

### What stays unchanged
- Every example retains its complete `sql` field — no runtime resolution, no template expansion
- `examplesFetcher.js` continues to return `{ id, question, sql, tables_used, variants }` — zero consumer impact
- `classify.js` and `subQueryMatch.js` (which read goldExamples.json directly, bypassing examplesFetcher) continue to work because `example.sql` is always present

### Consumer note: direct file readers

**Important**: `classify.js` (line 103) and `subQueryMatch.js` load `goldExamples.json` directly via `fs.readFileSync` and access `example.sql`. The new schema preserves the `sql` field on every example, so these consumers are unaffected. The `_filterReference` block is ignored by these consumers (they only iterate `examples`).

**Estimated reduction**: ~10-15% (from 44KB to ~38KB, mainly from removing `notes`, `questionCategory`, `questionSubCategory` fields and the validation script catching future drift). The primary benefit is **maintainability** (one place to verify filter correctness) rather than file size.

---

## Layer 4: Join Enrichment + KPI Cleanup

### `join-knowledge.json` changes — ENRICH (not dedup)

The current file has 81 unique join pairs with **no bi-directional duplicates** — the existing `joinRuleFetcher.js` already uses sorted pair keys internally. The change here is **enrichment**: adding metadata that helps Opus 4.6 choose the right join.

**Before** (current):
```json
{
  "directJoins": [
    {
      "left_table": "vw_td_ebi_region_rpt",
      "right_table": "vw_TF_EBI_P2S",
      "columns": [
        "vw_TF_EBI_P2S.REGION_ID = vw_td_ebi_region_rpt.REGION_ID",
        "vw_TF_EBI_P2S.ORIGINAL_REGION_ID = vw_td_ebi_region_rpt.REGION_ID",
        "vw_TF_EBI_P2S.AE_REGION_ID = vw_td_ebi_region_rpt.REGION_ID",
        "vw_td_ebi_region_rpt.ROLE_TYPE_ID = vw_TF_EBI_P2S.ROLE_TYPE_ID",
        "vw_td_ebi_region_rpt.REPORTING_HIERARCHY_ID = vw_TF_EBI_P2S.REPORTING_HIERARCHY_ID",
        "vw_td_ebi_region_rpt.GTM_MOTION_ID = vw_TF_EBI_P2S.GTM_MOTION_ID"
      ]
    }
  ]
}
```

Problem: 6 possible join keys, no indication of which to use. The LLM guesses.

**After**:
```json
{
  "directJoins": [
    {
      "tables": ["vw_td_ebi_region_rpt", "vw_TF_EBI_P2S"],
      "primaryKey": "vw_TF_EBI_P2S.REGION_ID = vw_td_ebi_region_rpt.REGION_ID",
      "cardinality": "1:N",
      "joinType": "INNER",
      "alternateKeys": [
        { "sql": "vw_TF_EBI_P2S.ORIGINAL_REGION_ID = vw_td_ebi_region_rpt.REGION_ID", "useWhen": "querying original territory assignment before re-org" },
        { "sql": "vw_TF_EBI_P2S.AE_REGION_ID = vw_td_ebi_region_rpt.REGION_ID", "useWhen": "querying AE-specific territory (rare)" }
      ]
    }
  ],
  "indirectJoins": [
    {
      "tables": ["vw_td_ebi_region_rpt", "vw_TD_EBI_OPP"],
      "bridge": "vw_TF_EBI_P2S",
      "steps": [
        "vw_td_ebi_region_rpt.REGION_ID = vw_TF_EBI_P2S.REGION_ID",
        "vw_TF_EBI_P2S.OPP_ID = vw_TD_EBI_OPP.OPP_ID"
      ],
      "cardinality": "1:N:1"
    }
  ]
}
```

**Changes**:
- `left_table` + `right_table` -> `tables` array (direction-agnostic, consistent with fetcher's sorted-pair indexing)
- Add `primaryKey` — the default join key the LLM should use
- Add `cardinality` (1:1, 1:N, N:N) — prevents explosive joins
- Add `joinType` (INNER, LEFT, FULL OUTER) — explicit guidance
- Add `alternateKeys` with `useWhen` — LLM only uses these when the question warrants it
- Non-primary keys moved from flat `columns` array to `alternateKeys` — reduces ambiguity

**joinRuleFetcher.js** changes:
- Read `tables` array instead of `left_table`/`right_table` (index by sorted pair — already done internally, now matches file structure)
- `formatJoinRulesText()`: show primaryKey prominently, alternates as indented "Use when:" footnotes
- Include cardinality in formatted output: `"(1:N, INNER JOIN)"`

### `kpi-glossary.json` changes

- Remove the `abbreviations` top-level key (moved to `definitions.json`)
- Keep `kpis` array unchanged (no redundancy within KPI entries themselves)
- `kpiFetcher.js`: remove local abbreviations loading, import from `definitionsFetcher.getAbbreviations()` instead
- **Dead code cleanup**: `expandAbbreviations()` is exported by kpiFetcher.js but never called anywhere in the codebase. Remove the function entirely rather than migrating it.

---

## Fetcher Changes

### New: `server/vectordb/definitionsFetcher.js`

```javascript
// Loads definitions.json once at startup
// Exports:
//   loadDefinitions() / loadDefinitionsAsync()
//   getMandatoryFiltersForTables(tableNames) -> filter objects whose appliesTo intersects tableNames
//   getThreshold(type) -> { green, yellow, label }
//   getSalesStageMapping() -> { id: name }
//   getAbbreviations() -> { abbr: full }
//   expandAbbreviations(text) -> text with abbreviations expanded
//   getCreationTargetWeights() -> { qtrBkt: formula }
```

### Modified: `server/vectordb/examplesFetcher.js`

- On load, read `examples` array from new goldExamples.json structure (skip `_filterReference` block)
- No runtime resolution needed — every example has a complete `sql` field
- `searchExamples()` and `getExampleById()` return examples as-is (zero behavior change)
- Keyword index built from: question + variants + tables_used (unchanged)

### Modified: `server/vectordb/rulesFetcher.js`

- Change file path from `business-context.md` to `business-rules.md`
- No other changes (heading-based parsing still works)

### Modified: `server/vectordb/schemaFetcher.js`

- In `formatColumnForPrompt()`: skip distinct_values for columns where the values array is empty or column has `"skipDistinct": true`
- In `schemaToMarkdown()`: omit descriptions that are empty/null

### Modified: `server/vectordb/joinRuleFetcher.js`

- Index by **sorted** `tables` pair (not left/right)
- `formatJoinRulesText()`: show primaryKey prominently, alternateKeys indented with "Use when:" prefix
- Include cardinality in output: `"(1:N, INNER JOIN)"`

### Modified: `server/vectordb/kpiFetcher.js`

- Remove local `abbreviations` loading; import from `definitionsFetcher`
- Remove dead `expandAbbreviations()` function (never called by any consumer)
- Update `loadKpiGlossary()` to read only the `kpis` array (abbreviations no longer in this file)

### Modified: `server/vectordb/distinctValuesFetcher.js`

- Skip columns with empty distinct_values arrays (post-trim)
- No other changes

---

## Prompt Injection Changes

### `server/graph/nodes/generateSql.js`

Current prompt sections:
1. ALLOWED TABLES
2. EXACT COLUMN REFERENCE
3. JOIN PATHS
4. BUSINESS RULES
5. EXAMPLE PATTERNS
6. KPI DEFINITIONS
7. VERIFIED FILTER VALUES

**New prompt sections** (reordered for LLM processing efficiency):

1. **MANDATORY FILTERS** (NEW) — auto-resolved from definitions.json based on tables in scope. Format:
   ```
   MANDATORY FILTERS (apply all that match your tables):
   - r.ROLE_TYPE_DISPLAY = 'AE' [vw_td_ebi_region_rpt]
   - rc.ROLE_COVERAGE_BU_GROUP = 'DMX' [vw_TD_EBI_ROLE_Coverage]
   - PAY_MEASURE_ID = 0 [vw_TF_EBI_P2S, vw_TF_EBI_QUOTA]
   ...
   ```
2. **SCHEMA REFERENCE** (was ALLOWED TABLES + EXACT COLUMN REFERENCE, merged)
3. **JOIN PATHS** (enhanced with primaryKey + cardinality)
4. **SQL RULES** (was BUSINESS RULES — now numbered imperatives only, no filter definitions)
5. **EXAMPLE PATTERNS** (resolved from templates, 2-3 examples max)
6. **KPI DEFINITIONS** (unchanged)
7. **FILTER VALUES** (was VERIFIED FILTER VALUES — enum columns only)

### `server/graph/nodes/contextFetch.js`

- Import `definitionsFetcher`
- After table selection, call `getMandatoryFiltersForTables(selectedTables)`
- Add `contextBundle.mandatoryFilters` to the bundle
- Rest of contextBundle construction unchanged

### `server/prompts/classify.js`

- No structural changes to the classify prompt
- Business rules section now pulls from business-rules.md (via rulesFetcher pointing to new file)
- Gold example injection unchanged (examplesFetcher returns resolved SQL)

### `server/prompts/present.js`

**Currently hardcodes** coverage thresholds (`Green >= 2.5x, Yellow >= 2.0x, Red < 2.0x`) in three separate prompt strings (lines ~13, ~38, ~52). This contradicts the single-source-of-truth goal.

- Import `definitionsFetcher`
- Replace hardcoded threshold strings with `definitionsFetcher.getThreshold('coverage')` values
- Template the threshold line dynamically: `` `Coverage: Green >= ${t.green}x, Yellow >= ${t.yellow}x, Red < ${t.yellow}x` ``

### `server/routes/voice.js`

**Currently reads 3 context files directly** via `fs.readFileSync` (with try/catch that silently swallows errors):
- `business-context.md` — for business term phrase lists
- `kpi-glossary.json` — for abbreviation phrase lists
- `schema-knowledge.json` — for table/column name phrase lists

Changes needed:
- Update file path from `business-context.md` to `business-rules.md`
- For abbreviations: import from `definitionsFetcher.getAbbreviations()` instead of reading kpi-glossary.json's `abbreviations` key (which will be removed)
- Schema-knowledge.json path is unchanged (no rename), but the trimmed content still provides table/column names

### `server/index.js` — Startup sequence

Add `loadDefinitionsAsync()` to the eager-load calls at startup (alongside existing `loadSchemaKnowledgeAsync`, `loadExamplesAsync`, `loadRulesAsync`, `loadJoinKnowledgeAsync`, `loadKpiGlossaryAsync`).

---

## File Deletion Plan

| File | Action | Reason |
|------|--------|--------|
| `server/context/knowledge/strategic-framework.md` | DELETE | Content absorbed into business-rules.md + definitions.json. Never imported by any code. |
| `server/context/knowledge/business-context.md` | DELETE | Replaced by business-rules.md (deduplicated, restructured). |

Both deletions happen **after** the new files are created and verified.

---

## Migration Safety

1. **Backward compatibility**: The examplesFetcher returns the same `{ id, question, sql, tables_used, variants }` shape to all consumers. Every gold example retains its complete `sql` field — no runtime resolution. Direct file readers (classify.js, subQueryMatch.js) are unaffected.

2. **Incremental rollout**: Changes can be applied layer by layer:
   - Layer 0 (definitions.json + definitionsFetcher) first — no impact until other layers reference it
   - Layer 1 (schema trim) independently
   - Layer 2 (business-rules.md + rulesFetcher path change + voice.js path update) together
   - Layer 3 (goldExamples cleanup) independently
   - Layer 4 (join enrichment + KPI cleanup) independently
   - Cross-cutting: present.js threshold injection + server/index.js startup after Layer 0

3. **Verification**: After each layer, run `npm test` to confirm no regressions. Key tests:
   - `tests/runtimeRobustness.test.js` — validates the pipeline runs end-to-end
   - Any tests that exercise examplesFetcher, rulesFetcher, schemaFetcher
   - Manual verification: start server, check voice route loads without errors

4. **Rollback**: Each layer is a separate commit. Revert any commit independently if issues arise.

5. **Direct file reader inventory** (consumers that bypass fetcher abstractions):
   - `classify.js` → reads goldExamples.json directly → safe (sql field preserved)
   - `subQueryMatch.js` → reads goldExamples.json via classify.js exports → safe (sql field preserved)
   - `voice.js` → reads business-context.md, kpi-glossary.json, schema-knowledge.json → **requires path + structure updates**
   - `dashboard.js` → reads dashboardGoldExamples.json → safe (minor trim only)
   - `classify.js` → reads analysis-blueprints.json → safe (unchanged)

---

## Expected Impact

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total context file size | ~460KB | ~310KB | -33% |
| goldExamples.json | 44KB | ~38KB | -14% (maintenance win, not size win) |
| business-context.md + strategic-framework.md | 33KB | ~20KB (as business-rules.md) | -39% |
| schema-knowledge.json | 351KB | ~220KB | -37% |
| join-knowledge.json | 35KB | ~38KB | +9% (enriched with metadata) |
| Prompt tokens per generateSql call | 6-12KB | 4-8KB | -33% |
| Places thresholds defined | 4 (+ present.js) | 1 | Single source of truth |
| Places mandatory filters defined | 20 queries + 1 rule list | 1 (definitions.json) | Single source of truth |
| Dead files | 1 (strategic-framework.md) | 0 | Cleaned up |
| Dead code | 1 fn (expandAbbreviations) | 0 | Cleaned up |
| Join key ambiguity | 6 keys, no guidance | Primary + labeled alternates | Clear guidance |

---

## Out of Scope

- Changing the vector DB / keyword-based retrieval approach (embedding-based retrieval is a separate effort)
- Modifying the LangGraph workflow topology
- Changing the gold example SQL content (which questions/SQL patterns exist) — only restructuring how they're stored and validated
- Adding new KPIs or business rules
- Modifying the dashboard agent or dashboardGoldExamples beyond minor insight text dedup
- Migrating classify.js / subQueryMatch.js from direct file reads to examplesFetcher (safe as-is since sql field is preserved; migration is a separate cleanup)
