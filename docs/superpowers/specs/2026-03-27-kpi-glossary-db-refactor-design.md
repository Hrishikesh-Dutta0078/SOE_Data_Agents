# KPI Glossary DB Formula Backfill — Design Spec

**Date:** 2026-03-27
**Branch:** feature/pbix-kpi-integration
**Status:** Approved

## Problem

298 of 940 KPIs in `server/context/knowledge/kpi-glossary.json` have Power BI `EXTERNALMEASURE(...)` formulas instead of DB `table.column` references. An additional 119 entries have DB-style formulas but empty `relatedColumns` arrays. The LLM cannot generate SQL queries from either category.

### Current State

| Category | Count | Issue |
|---|---|---|
| EXTERNALMEASURE formula, empty relatedColumns | 298 | Completely unusable for SQL generation |
| DB-style formula, empty relatedColumns | 119 | Formula text exists but structured columns missing |
| DB-style formula, populated relatedColumns | 523 | Already working |

### Data Sources Available

- **Excel mapping log** (`docs/kpi-glossary-mapping-log.xlsx`): 940 rows, 523 with non-empty `Related_Columns_DB`. Status: 164 mapped, 4 approximated, 772 new. Some "new" rows have inline `/* DB: table.column */` annotations.
- **Existing script** (`scripts/refactor-kpi-glossary.js`): ~170 hand-verified `FORMULA_OVERRIDES` + `COL_MAP` for token substitution.
- **Schema knowledge** (`server/context/knowledge/schema-knowledge.json`): 22 tables, 1027 columns.

## Solution

Enhance `scripts/refactor-kpi-glossary.js` with a 4-pass pipeline.

### Pass 1 — Excel Merge

Read `docs/kpi-glossary-mapping-log.xlsx`. For each KPI matched by `KPI_ID`:
- If Excel `DB_Formula` is non-empty AND differs from the EXTERNALMEASURE formula → overwrite `formula`
- If Excel `Related_Columns_DB` is non-empty → parse comma-separated values into `relatedColumns` array
- Skip rows where `DB_Formula` is just the raw DAX repeated

Priority: existing `FORMULA_OVERRIDES` in the script take precedence over Excel values (they're hand-verified).

### Pass 2 — Regex Extract relatedColumns

For entries that now have DB-style formulas but still `relatedColumns: []`:
- Regex pattern: `/\b(vw_\w+|TF_\w+|TD_\w+|VW_\w+)\.\w+/gi`
- Extract all `table.column` references from formula text
- Deduplicate, preserving order of first occurrence

### Pass 3 — Pattern-Based Inference

For remaining EXTERNALMEASURE entries, infer DB formulas from KPI name + section using pattern rules. Rules are evaluated top-to-bottom; first match wins.

**Core inference patterns:**

| Pattern (KPI name) | Inferred Formula | relatedColumns |
|---|---|---|
| `*WON*$*` / `*WON #*` | `SUM/COUNT(vw_TF_EBI_P2S.OPPTY) WHERE ADJ_COMMITMENT = 'Won'` | `[P2S.OPPTY, P2S.ADJ_COMMITMENT]` |
| `*LOST*$*` / `*LOST #*` | `SUM/COUNT(P2S.OPPTY) WHERE ADJ_COMMITMENT = 'Lost'` | `[P2S.OPPTY, P2S.ADJ_COMMITMENT]` |
| `*OPPTY*$*` / `*OPEN OPPTY*` | `SUM(P2S.OPPTY) WHERE IN_PIPELINE = 1` | `[P2S.OPPTY, P2S.IN_PIPELINE]` |
| `*GROSS CREATED*` / `*GROSS CREATION*` | `SUM(P2S.OPPTY) WHERE QUALIFICATION_QTR_BKT = 0...` | `[P2S.OPPTY, CALDATE.QUALIFICATION_QTR_BKT]` |
| `*COVERAGE*X*` / `*COV*X*` | `SUM(P2S.OPPTY) / NULLIF(SUM(QUOTA.QUOTA_ACTUAL),0)` | `[P2S.OPPTY, QUOTA.QUOTA_ACTUAL]` |
| `*PIPE TARGET*` | `SUM(QUOTA.QUOTA_REQ)` | `[QUOTA.QUOTA_REQ]` |
| `*BOOKINGS TARGET*` | `SUM(QUOTA.QUOTA_ACTUAL)` | `[QUOTA.QUOTA_ACTUAL]` |
| `*ATTAINMENT*%*` | `SUM(P2S.OPPTY WHERE Won+F+UC) / NULLIF(QUOTA,0)` | `[P2S.OPPTY, QUOTA.QUOTA_ACTUAL]` |
| `*WALK VALUE*` | `SUM(PIPE_WALK.GROSSASV)` | `[PIPE_WALK.GROSSASV]` |
| `*PACING*$*` | `SUM(PACING_TARGET.PACING_LINEARITY) * QUOTA` | `[PACING_TARGET.PACING_LINEARITY, QUOTA.QUOTA_ACTUAL]` |
| `*BOQ ARR*` / `*ARR $*` | `SUM(Retention.BOQ_ARR)` | `[Retention.BOQ_ARR]` |
| `*EOQ ARR*` | `SUM(Retention.EOQ_ARR)` | `[Retention.EOQ_ARR]` |
| `*TIER [1-3]*GNARR*` | `SUM(P2S.OPPTY) WHERE PARENT_TIER = 'Tier N'` | `[P2S.OPPTY, P2S.PARENT_TIER]` |
| `*TIER [1-3]*ACCTS*#*` | `COUNT(DISTINCT ACCOUNT_PARENT_ID) WHERE PARENT_TIER...` | `[P2S.ACCOUNT_PARENT_ID, P2S.PARENT_TIER]` |
| `*GENERATION TARGET*` | `SUM(GENERATION_TARGET.GENERATION_TARGET)` | `[GENERATION_TARGET.GENERATION_TARGET]` |
| `*PARTICIPATION*` | `COUNT(DISTINCT REP/FLM_LDAP) / total` | `[REGION_RPT columns, P2S.OPPTY, QUOTA.QUOTA_ACTUAL]` |
| `*STALLED*` | `SUM(P2S.OPPTY WHERE STALLED_BUT_INACTIVE = 'Stalled & Inactive')` | `[P2S.OPPTY, P2S.STALLED_BUT_INACTIVE]` |
| `*PROGRESSION*` | `SUM(PIPE_WALK.STAGEPROGRESSIONASV)` | `[PIPE_WALK.STAGEPROGRESSIONASV]` |
| `*RBOB*` | `SUM(Retention.RBOB)` | `[Retention.RBOB]` |
| `*W+F+UC*` | `SUM(P2S.OPPTY WHERE ADJ_COMMITMENT IN (Won,F,UC))` | `[P2S.OPPTY, P2S.ADJ_COMMITMENT]` |
| `*UPSIDE*$*` | `SUM(P2S.OPPTY WHERE ADJ_COMMITMENT = 'Upside - Committed')` | `[P2S.OPPTY, P2S.ADJ_COMMITMENT]` |
| `*RENEWAL*` | `SUM(Retention.RBOB/ARR_Impact)` | `[Retention columns]` |
| `*ATTRITION*` | `SUM(RENEWALS_TARGET.ATTRITION) or SUM(Retention.ARR_Impact)` | context-dependent |
| `*GAP*$*` | `TARGET - ACTUAL` patterns | `[QUOTA.QUOTA_ACTUAL, P2S.OPPTY]` |
| `*PY*$*` / `*PY*%*` | Prior year metrics with QTR_BKT_IND offset | `[P2S.OPPTY, QUOTA.QUOTA_ACTUAL]` |

**PBIX-only patterns (mark `pbix_only: true`):**

GEO RANK, OVERALLSCORE, CREDIT, DEFAULT COMMIT/TARGET, SNAPSHOT DATE, MULTI SOLUTION, PROJECTED CLOSE RATIO, LINEARITY TARGET TREND, PARTNER %, Product Consumption %, TENURE GAP, LEAD AMOUNT/VALUE, ACCOUNT ACTIVITY, SBR ACTIVITY, COMPETITOR FILL RATE, COMPLETED IPOV/MUTUAL, TIER *COMPLETED*AP*, TIER *ASSESSED*, NOT TIERED, PRNT COMPLETE, OWNER %, ENABLEMENT measures.

### Pass 4 — Mark Unmappable

Any entry still having EXTERNALMEASURE after passes 1-3:
- Set `"pbix_only": true`
- Set formula to `"Power BI calculated measure — not directly queryable via SQL"`
- Keep `formulaPbix` with the original
- `relatedColumns: []`, `relatedTables: []`

## Schema Changes to KPI Entry

```json
{
  "id": "...",
  "formula": "SUM(vw_TF_EBI_P2S.OPPTY) WHERE ...",
  "formulaPbix": "EXTERNALMEASURE(...)",
  "relatedColumns": ["vw_TF_EBI_P2S.OPPTY", "..."],
  "relatedTables": ["vw_TF_EBI_P2S"],
  "confidence": "mapped|inferred|approximated|pbix_only",
  "pbix_only": false,
  "notes": "..."
}
```

- `confidence` — provenance. `mapped` = Excel/FORMULA_OVERRIDES, `inferred` = pattern-matched, `approximated` = DB proxy, `pbix_only` = no DB equivalent
- `pbix_only` — boolean, only `true` for unmappable entries
- `relatedTables` — derived from `relatedColumns` by extracting table names

## Execution

```bash
node scripts/refactor-kpi-glossary.js
```

## Output

1. `server/context/knowledge/kpi-glossary.json` — updated in place
2. `docs/kpi-glossary-mapping-log.xlsx` — regenerated with updated statuses

### Expected Outcome

| Status | Estimated Count |
|---|---|
| mapped (Excel + FORMULA_OVERRIDES) | ~640 |
| inferred (pattern-matched) | ~150-180 |
| approximated | ~16 |
| pbix_only | ~100-120 |

## Consumer Impact

- `server/vectordb/kpiFetcher.js` — no changes needed; returns full KPI objects
- `server/prompts/` — SQL agent prompt should note: "If a KPI has `pbix_only: true`, tell the user it's a Power BI-only measure not available via SQL"
- No other consumer changes required
