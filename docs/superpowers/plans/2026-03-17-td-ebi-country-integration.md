# TD_EBI_COUNTRY Integration — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate TD_EBI_COUNTRY as a fully connected geographic hierarchy dimension into the Text-to-SQL knowledge layer.

**Architecture:** Data-only changes to 4 JSON/MD knowledge files. No code changes needed — the schema fetcher, research tools, validation, and LLM selector all work dynamically from these files. The server picks up changes on restart.

**Tech Stack:** JSON, Markdown (knowledge files), Node.js (harvest script)

**Spec:** `docs/superpowers/specs/2026-03-17-td-ebi-country-integration-design.md`

**Important note:** `table-descriptions.md` does not exist in the repo — `schema-knowledge.json` was previously generated but the source was deleted. We will edit `schema-knowledge.json` directly instead of using `npm run harvest:schema`.

---

### Task 1: Add TD_EBI_COUNTRY to schema-knowledge.json

**Files:**
- Modify: `server/context/knowledge/schema-knowledge.json:4297` (append new table entry after last table `TD_EBI_REPORT_DX_ACCOUNT_PROFILE_OPG`)

- [ ] **Step 1: Add TD_EBI_COUNTRY entry to schema-knowledge.json**

Open `server/context/knowledge/schema-knowledge.json`. The file is a single JSON object where keys are table names. The last table entry (`TD_EBI_REPORT_DX_ACCOUNT_PROFILE_OPG`) ends around line 4370. Add a comma after its closing `}` and insert the new entry before the final `}`:

```json
  "TD_EBI_COUNTRY": {
    "description": "Geographic hierarchy dimension table mapping countries to sales organization structure. Provides country-to-region rollup: Country > Sub Market Area > Market Area > Sales Region > GEO. Use this table to resolve country names and geographic hierarchies from COUNTRY_ID or ACCOUNT_COUNTRY_ID foreign keys in fact tables.",
    "columns": {
      "COUNTRY_ID": {
        "type": "INT",
        "nullable": false,
        "description": "unique country identifier, joins to vw_TF_EBI_P2S.ACCOUNT_COUNTRY_ID, TF_EBI_MARKETING_TREND.ACCOUNT_COUNTRY_ID, TF_EBI_TPT_INFO.COUNTRY_ID",
        "pk": true,
        "fk": false
      },
      "COUNTRY_CODE": {
        "type": "VARCHAR",
        "nullable": true,
        "description": "ISO-style two-letter country code (e.g., US, AD, AE)",
        "pk": false,
        "fk": false
      },
      "COUNTRY_NAME": {
        "type": "NVARCHAR",
        "nullable": true,
        "description": "full country name (e.g., United Arab Emirates, Andorra)",
        "pk": false,
        "fk": false
      },
      "GEO_CODE": {
        "type": "INT",
        "nullable": true,
        "description": "geographic region code (1=AMERICAS, 2=EMEA, etc.)",
        "pk": false,
        "fk": false
      },
      "GEO": {
        "type": "VARCHAR",
        "nullable": true,
        "description": "top-level geography name (AMERICAS, EMEA, APAC)",
        "pk": false,
        "fk": false
      },
      "SALES_REGION_CODE": {
        "type": "VARCHAR",
        "nullable": true,
        "description": "sales region code (e.g., WEU, UKI, RLAN)",
        "pk": false,
        "fk": false
      },
      "SALES_REGION": {
        "type": "VARCHAR",
        "nullable": true,
        "description": "sales region name (e.g., Western Europe, UKI, Latin America)",
        "pk": false,
        "fk": false
      },
      "MARKET_AREA_CODE": {
        "type": "VARCHAR",
        "nullable": true,
        "description": "market area code",
        "pk": false,
        "fk": false
      },
      "MARKET_AREA": {
        "type": "VARCHAR",
        "nullable": true,
        "description": "market area name (e.g., Middle East, Iberica, Mediterranean)",
        "pk": false,
        "fk": false
      },
      "SUB_MARKET_AREA_CODE": {
        "type": "VARCHAR",
        "nullable": true,
        "description": "sub-market area code",
        "pk": false,
        "fk": false
      },
      "SUB_MARKET_AREA": {
        "type": "VARCHAR",
        "nullable": true,
        "description": "sub-market area name (most granular geographic grouping)",
        "pk": false,
        "fk": false
      },
      "DIMENSION_TYPE": {
        "type": "VARCHAR",
        "nullable": true,
        "description": "always 'COUNTRY'",
        "pk": false,
        "fk": false
      },
      "IS_ACTIVE": {
        "type": "BIT",
        "nullable": true,
        "description": "soft-delete flag; always filter IS_ACTIVE = 1",
        "pk": false,
        "fk": false
      }
    },
    "keywords": ["country", "country_code", "country_name", "geo", "geo_code", "geographic", "hierarchy", "market_area", "market_area_code", "sales_region", "sales_region_code", "sub_market_area", "sub_market_area_code", "td_ebi_country"]
  }
```

Note: `CREATED_DATE` and `UPDATED_DATE` are omitted — they are audit columns not useful for querying. This matches how other tables omit internal/audit columns.

- [ ] **Step 2: Update TF_EBI_TPT_INFO.COUNTRY_ID to fk:true**

In the same file, find `TF_EBI_TPT_INFO` (line 3546), then its `COUNTRY_ID` column (line 3567). Change `"fk": false` to `"fk": true` at line 3571:

```
Before: "fk": false
After:  "fk": true
```

Also update the description from `"country identifier"` to `"country identifier, joins to TD_EBI_COUNTRY.COUNTRY_ID"`.

- [ ] **Step 3: Validate JSON is valid**

Run: `cd server && node -e "JSON.parse(require('fs').readFileSync('context/knowledge/schema-knowledge.json','utf8')); console.log('Valid JSON')"`

Expected: `Valid JSON`

- [ ] **Step 4: Commit**

```bash
git add server/context/knowledge/schema-knowledge.json
git commit -m "feat(knowledge): add TD_EBI_COUNTRY to schema-knowledge.json"
```

---

### Task 2: Add join paths to join-knowledge.json

**Files:**
- Modify: `server/context/knowledge/join-knowledge.json`
  - `directJoins` array: append 3 entries after line 653 (last direct join entry)
  - `multihopJoins` array: append 3 entries after line 952 (last multihop entry)

- [ ] **Step 1: Add 3 direct join entries**

Find the `directJoins` array. The last entry ends at line 653 with `}`. Add a comma after that `}` and insert these 3 entries before the closing `]`:

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

- [ ] **Step 2: Add 3 multihop join entries**

Find the `multihopJoins` array. The last entry ends at line 952 with `}`. Add a comma after that `}` and insert these 3 entries before the closing `]`:

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

- [ ] **Step 3: Validate JSON is valid**

Run: `cd server && node -e "JSON.parse(require('fs').readFileSync('context/knowledge/join-knowledge.json','utf8')); console.log('Valid JSON')"`

Expected: `Valid JSON`

- [ ] **Step 4: Commit**

```bash
git add server/context/knowledge/join-knowledge.json
git commit -m "feat(knowledge): add TD_EBI_COUNTRY join paths (3 direct + 3 multihop)"
```

---

### Task 3: Add country rules to business-context.md

**Files:**
- Modify: `server/context/knowledge/business-context.md:229` (append at end of file)

- [ ] **Step 1: Append country dimension rules**

Add the following block at the end of `business-context.md` (after line 229):

```markdown

### Country Dimension (TD_EBI_COUNTRY)
- **Always filter** `IS_ACTIVE = 1` when querying TD_EBI_COUNTRY to exclude deactivated records.
- **Geographic Hierarchy** (top to bottom): GEO > SALES_REGION > MARKET_AREA > SUB_MARKET_AREA > COUNTRY
- **GEO values**: AMERICAS (1), EMEA (2), APAC (3), and NOT ASSIGNED (0)
- When users say "country", resolve via TD_EBI_COUNTRY.COUNTRY_NAME
- When users say "market area" or "sub market area", resolve via TD_EBI_COUNTRY (not vw_td_ebi_region_rpt which has overlapping but rep-assignment-scoped values)
- **Join key mapping**: ACCOUNT_COUNTRY_ID in fact tables = COUNTRY_ID in TD_EBI_COUNTRY
```

- [ ] **Step 2: Commit**

```bash
git add server/context/knowledge/business-context.md
git commit -m "feat(knowledge): add TD_EBI_COUNTRY business rules and geographic hierarchy"
```

---

### Task 4: Add gold examples to goldExamples.json

**Files:**
- Modify: `server/context/goldExamples.json:290` (the last example object ends at line 290, before the closing `]` on line 291)

- [ ] **Step 1: Add 2 template queries**

Find the closing `}` of the last example (line 290). Add a comma after it, then insert these two entries before the closing `]` on line 291:

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
  },
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

- [ ] **Step 2: Validate JSON is valid**

Run: `cd server && node -e "JSON.parse(require('fs').readFileSync('context/goldExamples.json','utf8')); console.log('Valid JSON')"`

Expected: `Valid JSON`

- [ ] **Step 3: Commit**

```bash
git add server/context/goldExamples.json
git commit -m "feat(knowledge): add gold examples for pipeline-by-country and country-list queries"
```

---

### Task 5: Harvest distinct values (requires DB connectivity)

**Files:**
- Auto-generated: `server/context/knowledge/distinct-values.json`

- [ ] **Step 1: Run distinct values harvester**

Run: `cd server && npm run harvest:values`

This queries `SELECT DISTINCT TOP 50` for each column in schema-knowledge.json (including the new TD_EBI_COUNTRY columns). Requires database connectivity.

Expected: Script outputs progress per table/column, then writes to `distinct-values.json`.

**If DB is not accessible:** Skip this step. The table is fully functional without distinct values — the LLM just gets less hint data for autocompletion. Re-run when DB is accessible.

- [ ] **Step 2: Commit (if values were harvested)**

```bash
git add server/context/knowledge/distinct-values.json
git commit -m "feat(knowledge): harvest distinct values including TD_EBI_COUNTRY"
```

---

### Task 6: Verify integration

- [ ] **Step 1: Verify schema-knowledge.json has 22 tables**

Run: `cd server && node -e "const s = JSON.parse(require('fs').readFileSync('context/knowledge/schema-knowledge.json','utf8')); console.log('Tables:', Object.keys(s).length); console.log('Has TD_EBI_COUNTRY:', 'TD_EBI_COUNTRY' in s); console.log('TD_EBI_COUNTRY columns:', Object.keys(s.TD_EBI_COUNTRY?.columns || {}).length)"`

Expected:
```
Tables: 22
Has TD_EBI_COUNTRY: true
TD_EBI_COUNTRY columns: 13
```

- [ ] **Step 2: Verify join-knowledge.json has TD_EBI_COUNTRY entries**

Run: `cd server && node -e "const j = JSON.parse(require('fs').readFileSync('context/knowledge/join-knowledge.json','utf8')); const direct = j.directJoins.filter(e => e.left_table === 'TD_EBI_COUNTRY' || e.right_table === 'TD_EBI_COUNTRY'); const multi = j.multihopJoins.filter(e => e.left_table === 'TD_EBI_COUNTRY' || e.right_table === 'TD_EBI_COUNTRY'); console.log('Direct joins:', direct.length); console.log('Multihop joins:', multi.length)"`

Expected:
```
Direct joins: 3
Multihop joins: 3
```

- [ ] **Step 3: Verify goldExamples.json has country examples**

Run: `cd server && node -e "const g = JSON.parse(require('fs').readFileSync('context/goldExamples.json','utf8')); const country = g.filter(e => e.id.includes('country') || e.id.includes('countries')); console.log('Country examples:', country.length); country.forEach(e => console.log(' -', e.id))"`

Expected:
```
Country examples: 2
 - exact__pipeline_by_country
 - exact__list_countries
```

- [ ] **Step 4: Verify TF_EBI_TPT_INFO.COUNTRY_ID is now fk:true**

Run: `cd server && node -e "const s = JSON.parse(require('fs').readFileSync('context/knowledge/schema-knowledge.json','utf8')); console.log('COUNTRY_ID fk:', s.TF_EBI_TPT_INFO.columns.COUNTRY_ID.fk)"`

Expected: `COUNTRY_ID fk: true`

- [ ] **Step 5: Restart server and verify startup loads new table**

Run: `cd server && npm run dev`

Watch the console for the knowledge preload logs. The schema loader should report 22 tables.

Expected: Server starts without errors, knowledge files load successfully.
