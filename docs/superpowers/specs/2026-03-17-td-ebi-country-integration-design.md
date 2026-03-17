# Design Spec: TD_EBI_COUNTRY Table Integration

**Date:** 2026-03-17
**Status:** Approved
**Approach:** Direct Base Table Registration (Approach A)

## Overview

Integrate `TAP_PROD.dbo.TD_EBI_COUNTRY` as a fully connected geographic hierarchy dimension into the Text-to-SQL knowledge layer. This enables users to ask country-related questions and have any fact table with `COUNTRY_ID` or `ACCOUNT_COUNTRY_ID` resolve country details automatically.

## Table Profile

- **Type:** Geographic hierarchy dimension (lookup)
- **Row count:** ~250 (country list, static)
- **Primary key:** `COUNTRY_ID` (INT, IDENTITY)
- **Hierarchy:** GEO > SALES_REGION > MARKET_AREA > SUB_MARKET_AREA > COUNTRY
- **Soft-delete:** `IS_ACTIVE` (BIT) — always filter `IS_ACTIVE = 1`

### Columns (15 total)

| Column | Type | Notes |
|--------|------|-------|
| COUNTRY_ID | INT (PK, IDENTITY) | Surrogate key, joins to fact tables |
| COUNTRY_CODE | VARCHAR(10) | ISO-style 2-letter code (US, AD, AE) |
| COUNTRY_NAME | NVARCHAR(100) | Full country name |
| GEO_CODE | INT | Geographic region code (1=AMERICAS, 2=EMEA, etc.) |
| GEO | VARCHAR(100) | Top-level geography (AMERICAS, EMEA, APAC) |
| SALES_REGION_CODE | VARCHAR(10) | Sales region code (WEU, UKI, RLAN) |
| SALES_REGION | VARCHAR(100) | Sales region name |
| MARKET_AREA_CODE | VARCHAR(10) | Market area code |
| MARKET_AREA | VARCHAR(100) | Market area name |
| SUB_MARKET_AREA_CODE | VARCHAR(10) | Sub-market area code |
| SUB_MARKET_AREA | VARCHAR(100) | Sub-market area name (most granular grouping) |
| DIMENSION_TYPE | VARCHAR(50) | Always 'COUNTRY' |
| CREATED_DATE | DATETIME | Audit: row creation |
| UPDATED_DATE | DATETIME | Audit: last update |
| IS_ACTIVE | BIT | Soft-delete flag |

## Join Relationships

Three existing fact tables have foreign keys to this dimension:

| Fact Table | FK Column | Join Condition | Type |
|------------|-----------|---------------|------|
| vw_TF_EBI_P2S | ACCOUNT_COUNTRY_ID | `p.ACCOUNT_COUNTRY_ID = c.COUNTRY_ID` | LEFT JOIN |
| TF_EBI_MARKETING_TREND | ACCOUNT_COUNTRY_ID | `m.ACCOUNT_COUNTRY_ID = c.COUNTRY_ID` | LEFT JOIN |
| TF_EBI_TPT_INFO | COUNTRY_ID | `t.COUNTRY_ID = c.COUNTRY_ID` | LEFT JOIN |

Note: `ACCOUNT_COUNTRY_ID` in fact tables maps to `COUNTRY_ID` in TD_EBI_COUNTRY (column name mismatch documented in business context).

## Files to Modify

### 1. `server/context/knowledge/table-descriptions.md` — Add Table Section

```markdown
## TD_EBI_COUNTRY

Geographic hierarchy dimension table mapping countries to sales organization structure.
Provides country-to-region rollup: Country > Sub Market Area > Market Area > Sales Region > GEO.
Use this table to resolve country names and geographic hierarchies from COUNTRY_ID or ACCOUNT_COUNTRY_ID
foreign keys in fact tables.

Key columns used in joins: COUNTRY_ID, COUNTRY_CODE

Important columns:
- COUNTRY_ID (INT, PK) — unique country identifier, joins to vw_TF_EBI_P2S.ACCOUNT_COUNTRY_ID, TF_EBI_MARKETING_TREND.ACCOUNT_COUNTRY_ID, TF_EBI_TPT_INFO.COUNTRY_ID
- COUNTRY_CODE (VARCHAR) — ISO-style two-letter country code (e.g., US, AD, AE)
- COUNTRY_NAME (NVARCHAR) — full country name (e.g., United Arab Emirates, Andorra)
- GEO_CODE (INT) — geographic region code (1=AMERICAS, 2=EMEA, etc.)
- GEO (VARCHAR) — top-level geography name (AMERICAS, EMEA, APAC)
- SALES_REGION_CODE (VARCHAR) — sales region code (e.g., WEU, UKI, RLAN)
- SALES_REGION (VARCHAR) — sales region name (e.g., Western Europe, UKI, Latin America)
- MARKET_AREA_CODE (VARCHAR) — market area code
- MARKET_AREA (VARCHAR) — market area name (e.g., Middle East, Iberica, Mediterranean)
- SUB_MARKET_AREA_CODE (VARCHAR) — sub-market area code
- SUB_MARKET_AREA (VARCHAR) — sub-market area name (most granular geographic grouping)
- DIMENSION_TYPE (VARCHAR) — always 'COUNTRY'
- IS_ACTIVE (BIT) — soft-delete flag; always filter IS_ACTIVE = 1
```

### 2. `server/context/knowledge/table-descriptions.md` — Update TF_EBI_TPT_INFO Entry

Update the existing `COUNTRY_ID` column description in the TF_EBI_TPT_INFO section to mark it as a foreign key:

```
- COUNTRY_ID (INT, FK) — country identifier, joins to TD_EBI_COUNTRY.COUNTRY_ID
```

### 3. `schema-knowledge.json` — Auto-generated

Run `npm run harvest:schema` after updating table-descriptions.md. This parses the markdown and generates the JSON schema registry. The TF_EBI_TPT_INFO.COUNTRY_ID column will be regenerated with `"fk": true`.

### 4. `server/context/knowledge/join-knowledge.json` — Add 3 Direct Joins + 3 Multihop Joins

**Add to `directJoins` array** (matching existing format: `left_table`, `right_table`, `columns`):

```json
{
  "left_table": "vw_TF_EBI_P2S",
  "right_table": "TD_EBI_COUNTRY",
  "columns": [
    "vw_TF_EBI_P2S.ACCOUNT_COUNTRY_ID = TD_EBI_COUNTRY.COUNTRY_ID"
  ]
},
{
  "left_table": "TF_EBI_MARKETING_TREND",
  "right_table": "TD_EBI_COUNTRY",
  "columns": [
    "TF_EBI_MARKETING_TREND.ACCOUNT_COUNTRY_ID = TD_EBI_COUNTRY.COUNTRY_ID"
  ]
},
{
  "left_table": "TF_EBI_TPT_INFO",
  "right_table": "TD_EBI_COUNTRY",
  "columns": [
    "TF_EBI_TPT_INFO.COUNTRY_ID = TD_EBI_COUNTRY.COUNTRY_ID"
  ]
}
```

**Add to `multihopJoins` array** (indirect join paths via bridge tables):

```json
{
  "left_table": "vw_td_ebi_region_rpt",
  "right_table": "TD_EBI_COUNTRY",
  "bridge_table": "vw_TF_EBI_P2S",
  "steps": [
    "vw_td_ebi_region_rpt.REGION_ID = vw_TF_EBI_P2S.REGION_ID",
    "vw_TF_EBI_P2S.ACCOUNT_COUNTRY_ID = TD_EBI_COUNTRY.COUNTRY_ID"
  ]
},
{
  "left_table": "vw_TD_EBI_ACCOUNT",
  "right_table": "TD_EBI_COUNTRY",
  "bridge_table": "vw_TF_EBI_P2S",
  "steps": [
    "vw_TD_EBI_ACCOUNT.ACCOUNT_ID = vw_TF_EBI_P2S.ACCOUNT_ID",
    "vw_TF_EBI_P2S.ACCOUNT_COUNTRY_ID = TD_EBI_COUNTRY.COUNTRY_ID"
  ]
},
{
  "left_table": "vw_TD_EBI_OPP",
  "right_table": "TD_EBI_COUNTRY",
  "bridge_table": "vw_TF_EBI_P2S",
  "steps": [
    "vw_TD_EBI_OPP.OPP_ID = vw_TF_EBI_P2S.OPP_ID",
    "vw_TF_EBI_P2S.ACCOUNT_COUNTRY_ID = TD_EBI_COUNTRY.COUNTRY_ID"
  ]
}
```

### 5. `distinct-values.json` — Auto-generated

Run `npm run harvest:values` after schema-knowledge.json is updated. Requires DB connectivity (harvests `SELECT DISTINCT TOP 50` per column).

### 6. `server/context/knowledge/business-context.md` — Add Country Rules

```markdown
### Country Dimension (TD_EBI_COUNTRY)
- **Always filter** `IS_ACTIVE = 1` when querying TD_EBI_COUNTRY to exclude deactivated records.
- **Geographic Hierarchy** (top to bottom): GEO > SALES_REGION > MARKET_AREA > SUB_MARKET_AREA > COUNTRY
- **GEO values**: AMERICAS (1), EMEA (2), APAC (3), and NOT ASSIGNED (0)
- When users say "country", resolve via TD_EBI_COUNTRY.COUNTRY_NAME
- When users say "market area" or "sub market area", resolve via TD_EBI_COUNTRY (not vw_td_ebi_region_rpt which has overlapping but rep-assignment-scoped values)
- **Join key mapping**: ACCOUNT_COUNTRY_ID in fact tables = COUNTRY_ID in TD_EBI_COUNTRY
```

### 7. `server/context/goldExamples.json` — Add 2 Template Queries

**Example 1: Pipeline by country** (includes all mandatory global filters matching existing gold examples):

```json
{
  "id": "exact__pipeline_by_country",
  "question": "Show pipeline by country",
  "questionCategory": "WHAT_HAPPENED",
  "questionSubCategory": "pipeline_level_mix",
  "sql": "SELECT c.COUNTRY_NAME, c.GEO, c.SALES_REGION, c.MARKET_AREA, SUM(p.Oppty) AS Pipe\nFROM vw_TF_EBI_P2S p\nJOIN vw_td_ebi_region_rpt r ON p.AE_REGION_ID = r.REGION_ID\nJOIN vw_ebi_sales_stage s ON p.SALES_STAGE_ID = s.SALES_STAGE_ID\nJOIN vw_EBI_OPG o ON p.OPG_ID = o.OPG_KEY\nJOIN vw_TD_EBI_ROLE_Coverage rc ON p.ROLE_COVERAGE_ID = rc.ROLE_COVERAGE_ID\nLEFT JOIN TD_EBI_COUNTRY c ON p.ACCOUNT_COUNTRY_ID = c.COUNTRY_ID\nWHERE c.IS_ACTIVE = 1\n  AND s.SALES_STAGE IN ('S7','S6','S5','S4','S3')\n  AND p.SNAPSHOT_DATE_ID = (SELECT MAX(p2.SNAPSHOT_DATE_ID) FROM vw_TF_EBI_P2S p2 JOIN vw_EBI_CALDATE c2 ON p2.SNAPSHOT_DATE_ID = c2.DATE_KEY WHERE c2.WEEK_SORT_ORDER_REVERSE = 0)\n  AND p.PAY_MEASURE_ID = 0\n  AND r.ROLE_TYPE_DISPLAY = 'AE'\n  AND rc.ROLE_COVERAGE_BU_GROUP = 'DMX'\n  AND r.SALES_TEAM_BU IN ('#NA','DX','DX/DME','WW')\n  AND (r.SALES_REGION NOT LIKE '%DME%' OR r.SALES_REGION IS NULL)\n  AND r.SALES_TEAM NOT IN ('AMER IND PS DX','AMER LATAM PS','AMER ENT PS DX','AMER PUB SEC SPECIALIST')\n  AND o.MOPG1 <> 'ADVERTISING'\n  AND o.DMX_SOLUTION_GROUP <> 'PPBU'\nGROUP BY c.COUNTRY_NAME, c.GEO, c.SALES_REGION, c.MARKET_AREA\nORDER BY Pipe DESC",
  "tables_used": ["vw_TF_EBI_P2S", "TD_EBI_COUNTRY", "vw_td_ebi_region_rpt", "vw_ebi_sales_stage", "vw_EBI_OPG", "vw_TD_EBI_ROLE_Coverage"],
  "variants": [
    "Show me pipeline by country",
    "Pipeline broken down by country",
    "What is my pipeline per country?",
    "Country-wise pipeline",
    "Pipeline by geography"
  ]
}
```

**Example 2: Country list** (standalone lookup, no geo-specific hardcoding — uses partial match so classify node routes geo-specific variants to SQL writer):

```json
{
  "id": "exact__list_countries",
  "question": "List all countries",
  "questionCategory": "WHAT_HAPPENED",
  "questionSubCategory": "geography_lookup",
  "sql": "SELECT COUNTRY_NAME, GEO, SALES_REGION, MARKET_AREA, SUB_MARKET_AREA\nFROM TD_EBI_COUNTRY\nWHERE IS_ACTIVE = 1\nORDER BY GEO, SALES_REGION, MARKET_AREA, COUNTRY_NAME",
  "tables_used": ["TD_EBI_COUNTRY"],
  "variants": [
    "Show all countries",
    "List countries in the system",
    "What countries do we have?",
    "Show me the country list",
    "Country dimension data"
  ]
}
```

Note: Geo-specific questions like "Which countries are in EMEA?" should route through the SQL writer (partial match) so the LLM can inject the correct GEO filter dynamically, rather than hardcoding `GEO = 'EMEA'` in a template.

## Execution Order

```
1. Edit table-descriptions.md        -> Add TD_EBI_COUNTRY section + update TF_EBI_TPT_INFO FK
2. Run npm run harvest:schema        -> Regenerates schema-knowledge.json
3. Edit join-knowledge.json          -> Add 3 direct joins + 3 multihop joins
4. Run npm run harvest:values        -> Populates distinct-values.json (requires DB)
5. Edit business-context.md          -> Add country filtering rules & hierarchy docs
6. Edit goldExamples.json            -> Add 2 template queries
7. Restart server                    -> All knowledge files reloaded at startup
```

## What Does NOT Change

- **No code changes** — schema fetcher, research tools, validation, LLM selector all work dynamically from knowledge files
- **No changes to kpi-glossary.json** — country is a dimension, not a metric source
- **No changes to analysis-blueprints.json** — existing blueprints discover country joins via research agent

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| `harvest:values` requires DB connectivity | Run when DB is accessible; table works without distinct values (just less LLM hint data) |
| Column name mismatch (`ACCOUNT_COUNTRY_ID` vs `COUNTRY_ID`) | Documented in business-context.md and join-knowledge.json |
| Overlap with vw_td_ebi_region_rpt geography columns | Documented disambiguation rule: TD_EBI_COUNTRY for canonical geo hierarchy, region_rpt for rep assignments |
| Gold example SQL must include all mandatory global filters | Pipeline example includes all filters: PAY_MEASURE_ID, SALES_STAGE, snapshot week, ROLE_TYPE_DISPLAY, ROLE_COVERAGE_BU_GROUP, SALES_TEAM_BU, SALES_REGION DME exclusion, SALES_TEAM exclusion, MOPG1/PPBU exclusion |
| Table name casing across files | Use `TF_EBI_MARKETING_TREND` (uppercase) in join-knowledge.json to match existing convention; `TF_EBI_Marketing_Trend` in schema-knowledge.json matches its existing entry |
