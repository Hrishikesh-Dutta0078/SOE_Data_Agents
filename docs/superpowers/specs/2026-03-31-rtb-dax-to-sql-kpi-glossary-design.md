# RTB DAX-to-SQL KPI Glossary Translation

**Date:** 2026-03-31
**Status:** Approved
**Branch:** feature/pbix-kpi-integration

## Goal

Create a standalone JSON file (`server/context/knowledge/kpi-glossary-rtb.json`) containing all data-producing measures from `RTB Dataverse Technical Document 3.xlsx`, with each DAX formula translated to executable T-SQL. The file follows the same schema as the existing `kpi-glossary.json`.

## Acceptance Criteria

- All 307 data measures from the Excel Measures sheet are present in the output JSON (313 total minus 6 presentational exclusions).
- Each entry's `formula` field contains executable T-SQL (SELECT/SUM/CASE statements runnable against MSSQL views).
- Referenced measures are fully inlined — no unresolved `[MeasureName]` references in the SQL.
- All PBIX table names are resolved to SQL Server view names via the Table Source mapping.
- A console summary report shows translation coverage and flags.

## Scope

**In scope:**
- 307 numeric/date measures that produce data aggregations
- Automated Node.js translation script (`scripts/translateDaxToSql.js`)
- Output JSON file with full glossary metadata
- Console validation report

**Out of scope:**
- Modifying or merging into the existing `kpi-glossary.json`
- Runtime integration with the LangGraph pipeline (separate task)
- Manual correction of flagged measures (post-generation refinement)

## Exclusions (6 Presentational Measures)

| Measure | Reason |
|---|---|
| DEFAULT COMMIT TYPE | String constant `"GEO_ADJ_COMMIT"` |
| DEFAULT TARGET TYPE | String constant `"Plan"` |
| Last Data Refresh | Display formatting of a date |
| Dynamic Drillthrough page | OCC navigation lookup from unmapped table |
| Action Path | OCC navigation lookup from unmapped table |
| Cohort | OCC lookup from unmapped `OCC_Performance Cohort_Band` table |

## Output JSON Schema

**File:** `server/context/knowledge/kpi-glossary-rtb.json`

```json
{
  "kpis": [
    {
      "id": "pipe_dollar",
      "name": "PIPE $",
      "aliases": ["pipeline dollars", "total pipe"],
      "personas": ["AE", "Manager", "VP"],
      "section": "Pipeline",
      "definition": "Total pipeline dollar amount...",
      "formula": "SELECT SUM(p.OPPTY) FROM vw_TF_EBI_P2S p JOIN vw_EBI_Caldate c ON ... WHERE ...",
      "components": {},
      "timeVariants": [],
      "relatedColumns": ["vw_TF_EBI_P2S.OPPTY"],
      "relatedTables": ["vw_TF_EBI_P2S"],
      "formulaPbix": "<original DAX expression>",
      "confidence": "mapped",
      "tableName": "_Pipeline Measures",
      "dataType": "Currency",
      "isHidden": false
    }
  ]
}
```

Fields matching existing glossary: `id`, `name`, `aliases`, `personas`, `section`, `definition`, `formula`, `components`, `timeVariants`, `relatedColumns`, `relatedTables`, `formulaPbix`, `confidence`.

Additional fields from Excel: `tableName` (PBIX measure table), `dataType`, `isHidden`.

## Translation Script Architecture

**File:** `scripts/translateDaxToSql.js`

### Pipeline Stages

```
1. Parse Excel
   - Read Measures sheet (313 rows)
   - Read Table Source sheet (PBIX table → SQL view mapping)
   - Read Columns sheet (column metadata)
   - Read Dependency View (measure→column/table dependencies)
         ↓
2. Build lookup maps
   - tableMap: 'Pipeline' → 'vw_TF_EBI_P2S', etc. (from Table Source)
   - columnMap: {table, column} → SQL view.column (from Columns sheet)
         ↓
3. Build measure dependency graph
   - Parse each DAX expression for measure references ([MeasureName])
   - Distinguish column refs ('Table'[Column]) from measure refs ([MeasureName])
   - Topological sort: base measures first, composite measures last
   - Detect and break circular dependencies
         ↓
4. Translate DAX→T-SQL (bottom-up through dependency order)
   - Apply pattern rules per DAX construct (see Translation Rules)
   - Inline resolved SQL of referenced measures as subqueries
   - Track touched tables/columns → relatedColumns, relatedTables
         ↓
5. Generate JSON metadata
   - id: snake_case from measure name
   - section: from tableName mapping
   - aliases: from name expansion rules
   - definition: auto-generated from SQL logic
   - confidence: mapped / inferred / pbix_only
         ↓
6. Write output + summary report
   - server/context/knowledge/kpi-glossary-rtb.json
   - Console: translated count, flagged count, unresolved refs
```

## DAX→T-SQL Translation Rules

### Core Pattern Map

| DAX Pattern | T-SQL Translation | Frequency |
|---|---|---|
| `CALCULATE([Measure], filters...)` | Inline measure SQL + `WHERE` clauses from filters | 215/313 |
| `'Table'[Column] = value` | `view.COLUMN = value` (via table map) | 178/313 |
| `'Table'[Col] IN {"A","B"}` | `view.COL IN ('A','B')` | 178/313 |
| `VAR x = ... RETURN expr` | CTE: `WITH x AS (...) SELECT expr` | 151/313 |
| `DIVIDE(a, b)` | `(a) / NULLIF((b), 0)` | 73/313 |
| `SUM('Table'[Col])` | `SUM(view.COL)` | 73/313 |
| `SWITCH(TRUE(), cond1, val1, ...)` | `CASE WHEN cond1 THEN val1 ... END` | 52/313 |
| `FILTER('Table', cond)` | Subquery or `WHERE` clause | 54/313 |
| `COUNTROWS(FILTER(...))` | `SELECT COUNT(*) FROM view WHERE ...` | 25/313 |
| `SELECTEDVALUE('T'[C])` | Filter context: `/* filter: view.COL */` + `WHERE` | 64/313 |
| `MAX/MIN('Table'[Col])` | `MAX/MIN(view.COL)` | 39/35 |
| `DISTINCTCOUNT('T'[C])` | `COUNT(DISTINCT view.COL)` | 41/313 |
| `ISBLANK(x)` / `BLANK()` | `x IS NULL` / `NULL` | 25/41 |
| `NOT condition` | `NOT (condition)` | 29/313 |
| `ROUND(x, n)` | `ROUND(x, n)` | 9/313 |
| `ALL('Table')` | Remove filters on that table (context modifier — omit WHERE for that table) | 84/313 |
| `SUMX('Table', expr)` | `SELECT SUM(expr) FROM view` | 11/313 |
| `RANKX(table, expr)` | `RANK() OVER (ORDER BY expr)` | 4/313 |
| `MAXX(table, expr)` / `TOPN` | `SELECT TOP 1 ... ORDER BY` | 3/313 |
| `COALESCE(a, b)` | `COALESCE(a, b)` | 3/313 |

### Table Name Resolution

Every `'TableName'` in DAX is resolved via the Table Source sheet:

| PBIX Table | SQL View |
|---|---|
| Pipeline | vw_TF_EBI_P2S |
| Region Hierarchy | vw_TD_EBI_REGION_RPT |
| Sales Stage | vw_EBI_SALES_STAGE |
| Snapshot Quarter | vw_EBI_Caldate |
| Close Quarter | vw_EBI_Caldate |
| Quota | vw_TF_EBI_QUOTA |
| Retention | vw_TF_EBI_Retention |
| Renewals Target | vw_TF_EBI_RENEWALS_TARGET |
| Pipe Walk | vw_TF_EBI_PIPE_WALK |
| TPT | vw_TF_EBI_TPT_INFO |
| Account ARR | vw_TF_EBI_ACC_OPG_ARR |
| Enablement | vw_EBI_EMP_ENABLEMENT |
| Generation Target Multipliers | TF_EBI_GENERATION_TARGET |
| Pacing Targets | vw_EBI_PACING_TARGET |
| TM1 Bookings | vw_TF_EBI_BOOKINGS |
| Product Consumption | vw_TF_EBI_PRODUCT_USAGE |
| SBR Activities | vw_TF_EBI_SBR_ACTIVITIES |
| Account Activities | vw_TF_EBI_REP_ACTIVITY |
| Deal Type | vw_EBI_DEAL_TYPE |
| Commit Type | vw_EBI_COMMIT_ROLE_MAPPING |
| FY Calendar | vw_EBI_Caldate |
| Target Type | vw_TD_EBI_TARGET_TYPE |

### JOIN Resolution

JOIN conditions are derived from the **Data Model Design** sheet's Relationships section, which defines:
- `FromTable` / `FromColumn` → `ToTable` / `ToColumn` (e.g., `Pipeline.SNAPSHOT_DATE_ID` → `Snapshot Quarter.DATE_KEY`)
- Cardinality: Many-to-One
- CrossFilteringBehavior: OneDirection

When a DAX `CALCULATE` references filters from a related table (e.g., `'Sales Stage'[SALES_STAGE_GROUP]` while aggregating `Pipeline` data), the script uses the relationship map to emit the correct `JOIN`:
```sql
JOIN vw_EBI_SALES_STAGE ss ON p.SALES_STAGE_ID = ss.SALES_STAGE_ID
```

The relationship map is built from Data Model Design rows and stored as `joinMap[fromTable][toTable] = {fromCol, toCol}`.

### Measure Inlining

When measure A references `[PIPE $]`, and `PIPE $` resolves to:
```sql
SELECT SUM(p.OPPTY) FROM vw_TF_EBI_P2S p
  JOIN vw_EBI_Caldate c ON p.SNAPSHOT_DATE_ID = c.DATE_KEY
  WHERE c.SNAPSHOT_WEEK_BKT = '0'
    AND p.SALES_STAGE_ID IN (1,2,3,4,5,6)
```

That SQL is substituted as a subquery in measure A's formula.

### SELECTEDVALUE Handling

`SELECTEDVALUE('Region Hierarchy'[SALES_REGION])` represents filter context (which rep/region is selected). Translated as a `WHERE` filter with a parameterized comment:
```sql
WHERE rh.SALES_REGION = /* @param: SALES_REGION */
```

### Confidence Assignment

- `"mapped"` — all DAX constructs cleanly translated, all tables/columns resolved
- `"inferred"` — mostly translated but contains SELECTEDVALUE context params, SUMX iterators, or partial inlining
- `"pbix_only"` — complex composite scores (e.g., OVERALL SCORE measures) where full inlining produces unwieldy SQL

## Metadata Generation

### Section Mapping

| PBIX Measure Table | Glossary Section |
|---|---|
| _Pipeline Measures | Pipeline |
| _Performance Measures | Performance & Participation |
| _TPT Measures | Territory Planning (TPT) |
| _Generation Target Measures | Pipeline Creation |
| _Target Measures | Forecast & Bookings |
| _Retention Measures | Retention |
| _Walk Measures | Pipe Walk |
| _Coverage Measures | Pipeline Coverage |
| _OCC Measures | SLM Performance |
| _Retention Target Measures | Retention |
| Region Hierarchy | Performance & Participation |
| _Enablement Measures | Enablement |
| _Account ARR Measures | ARR & Revenue |
| _SBR Measures | SBR / Account Activity |
| _Account Activity Measures | SBR / Account Activity |
| _Product Consumption | Product Consumption |
| _TM1 Booking Measures | Forecast & Bookings |
| Snapshot Quarter | Pipeline |

### Alias Generation Rules

- `$` → add alias with "dollars" (e.g., `PIPE $` → `["pipe dollars", "pipeline amount"]`)
- `%` → add alias with "percent" / "pct"
- `#` → add alias with "count"
- Expand abbreviations: `QTD` → "quarter to date", `YTD` → "year to date", `WTD` → "week to date", `CQ` → "current quarter", `PQ` → "previous quarter", `BOQ` → "beginning of quarter", `CY` → "current year"
- `W+F+UC` → "won forecast upside committed"

### Personas

Default all entries to `["AE", "Manager", "VP"]`.

## Validation & Review Flagging

### Automated Validation (during generation)

- **Table resolution:** Every `'TableName'` in DAX must resolve via table map. Unresolved → `"inferred"` + warning.
- **Column resolution:** Every `[ColumnName]` with table context must exist in Columns sheet. Missing → warning.
- **Circular dependency:** Detect A → B → A cycles; break by keeping one as named reference.
- **SQL syntax sanity:** Balanced parentheses, no dangling `WHERE AND`, no empty `CASE` blocks.

### Console Summary Report

```
=== Translation Summary ===
Total measures in Excel:     313
Excluded (presentational):     6
Translated:                  307
  - mapped (clean):          ~220
  - inferred (partial):      ~70
  - pbix_only (flagged):     ~17
Unresolved table refs:         X
Unresolved column refs:        X
Circular dependencies:         X
```

### Manual Review Guidance

The script logs every `inferred` and `pbix_only` measure with specific reason (e.g., "SUMX iterator not fully inlined", "references unmapped table"). These can be manually refined post-generation.
