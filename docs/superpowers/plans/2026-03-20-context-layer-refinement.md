# Context Layer Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate redundancy across `server/context/` files, establish a single source of truth for business constants, and optimize prompt injection for Opus 4.6 SQL generation accuracy.

**Architecture:** Layered context with `definitions.json` as canonical constants (Layer 0), trimmed schema (Layer 1), consolidated business rules (Layer 2), deduplicated gold examples (Layer 3), and enriched join knowledge (Layer 4). Fetchers resolve references; prompts receive crisp, non-redundant context.

**Tech Stack:** Node.js CommonJS, JSON, Markdown, node:test runner

**Spec:** `docs/superpowers/specs/2026-03-20-context-layer-refinement-design.md`

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `server/context/definitions.json` | Canonical constants: thresholds, mandatory filters, stage mappings, abbreviations |
| `server/vectordb/definitionsFetcher.js` | Loader + accessors for definitions.json |
| `server/context/knowledge/business-rules.md` | Consolidated business rules (replaces business-context.md + strategic-framework.md) |
| `tests/definitionsFetcher.test.js` | Unit tests for definitionsFetcher |

### Modified files
| File | What changes |
|------|-------------|
| `server/index.js:152-168` | Add `loadDefinitionsAsync` to startup loaders |
| `server/vectordb/rulesFetcher.js:17-23` | Change file path from `business-context.md` to `business-rules.md` |
| `server/vectordb/kpiFetcher.js:49-81,164-198` | Remove abbreviations loading + delete dead `expandAbbreviations()` |
| `server/vectordb/joinRuleFetcher.js:42-61,134-216` | Read new `tables`/`primaryKey` schema, enrich formatted output |
| `server/vectordb/examplesFetcher.js:47-69,81` | Skip `_filterReference` block when building store |
| `server/vectordb/distinctValuesFetcher.js:31-46` | No code change needed — existing `if (colData.distinct_values && Array.isArray(...))` check naturally skips columns whose distinct_values were removed by the schema trim script |
| `server/graph/nodes/contextFetch.js:107-180` | Add mandatoryFilters to contextBundle |
| `server/graph/nodes/generateSql.js:203-431` | Add MANDATORY FILTERS prompt section, reorder sections |
| `server/prompts/present.js:13,38,52` | Replace hardcoded thresholds with definitionsFetcher values |
| `server/routes/voice.js:100-152` | Update file paths + abbreviation source |
| `server/context/knowledge/schema-knowledge.json` | Remove text-column distinct values + obvious descriptions |
| `server/context/goldExamples.json` | Add `_filterReference`, remove `notes` field only (keep `questionCategory`/`questionSubCategory` — used by classify.js exact-match path) |
| `server/graph/nodes/classify.js:104-106` | Update `loadGoldIndex()` to handle goldExamples.json object wrapper |
| `server/context/knowledge/join-knowledge.json` | Restructure: `tables` array, `primaryKey`, `cardinality`, `joinType`, `alternateKeys` |
| `server/context/knowledge/kpi-glossary.json` | Remove top-level `abbreviations` key |

### Deleted files
| File | Reason |
|------|--------|
| `server/context/knowledge/business-context.md` | Replaced by `business-rules.md` + `definitions.json` |
| `server/context/knowledge/strategic-framework.md` | Dead file (never loaded), content absorbed |

---

### Task 1: Create `definitions.json` — Canonical Constants

**Files:**
- Create: `server/context/definitions.json`

- [ ] **Step 1: Create definitions.json with all canonical constants**

Write the file with thresholds, salesStageMapping, activePipelineStages, mandatoryFilters, abbreviations, and creationTargetWeights extracted from `business-context.md` lines 13, 18-32, 88-112, 168-192, 194-205 and `kpi-glossary.json` lines 2-31.

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
    { "id": "role_type", "sql": "r.ROLE_TYPE_DISPLAY = 'AE'", "appliesTo": ["vw_td_ebi_region_rpt"], "always": true },
    { "id": "bu_group", "sql": "rc.ROLE_COVERAGE_BU_GROUP = 'DMX'", "appliesTo": ["vw_TD_EBI_ROLE_Coverage"], "always": true },
    { "id": "sales_team_bu", "sql": "r.SALES_TEAM_BU IN ('#NA','DX','DX/DME','WW')", "appliesTo": ["vw_td_ebi_region_rpt"], "always": true },
    { "id": "pay_measure", "sql": "PAY_MEASURE_ID = 0", "appliesTo": ["vw_TF_EBI_P2S", "vw_TF_EBI_QUOTA"], "always": true },
    { "id": "exclude_advertising", "sql": "o.MOPG1 <> 'ADVERTISING'", "appliesTo": ["vw_EBI_OPG"], "always": true },
    { "id": "exclude_ppbu", "sql": "o.DMX_SOLUTION_GROUP <> 'PPBU'", "appliesTo": ["vw_EBI_OPG"], "always": true },
    { "id": "exclude_dme_region", "sql": "(r.SALES_REGION NOT LIKE '%DME%' OR r.SALES_REGION IS NULL)", "appliesTo": ["vw_td_ebi_region_rpt"], "always": true },
    { "id": "exclude_teams", "sql": "r.SALES_TEAM NOT IN ('AMER IND PS DX','AMER LATAM PS','AMER ENT PS DX','AMER PUB SEC SPECIALIST')", "appliesTo": ["vw_td_ebi_region_rpt"], "always": true },
    { "id": "snapshot_week", "sql": "c.WEEK_SORT_ORDER_REVERSE = 0", "appliesTo": ["vw_EBI_CALDATE"], "always": true, "note": "Join pipeline/quota facts to vw_EBI_CALDATE on SNAPSHOT_DATE_ID = DATE_KEY" },
    { "id": "global_region", "sql": "r.GLOBAL_REGION IN ('AMERICAS','EMEA','APAC','WW')", "appliesTo": ["vw_td_ebi_region_rpt"], "always": false, "note": "Only when filtering by GLOBAL_REGION" },
    { "id": "rpt_hierarchy", "sql": "IS_CY_RPT_HIER = 1", "appliesTo": ["vw_td_ebi_region_rpt"], "always": false, "note": "When reporting hierarchy column is in scope" },
    { "id": "dummy_terr", "sql": "r.TERR_ID NOT LIKE '%_%Dummy%'", "appliesTo": ["vw_td_ebi_region_rpt"], "always": false, "note": "For quota queries" }
  ],
  "abbreviations": {
    "W": "Won", "F": "Forecast", "UC": "Upside Committed",
    "CQ": "Current Quarter", "PQ": "Previous Quarter", "FQ": "Future Quarter",
    "QTD": "Quarter to Date", "YTD": "Year to Date", "H1": "First Half (Q1+Q2)",
    "LTG": "Left to Go", "Covx": "Coverage", "BOQ": "Beginning of Quarter",
    "DSNSM": "Days Since Next Step Modified", "SD": "Stage Duration",
    "RBOB": "Renewal Base of Business", "GNARR": "Gross New ARR",
    "ARRAVG": "ARR Average", "R4Q": "Rolling 4 Quarters",
    "IC": "In Contract", "OOC": "Out of Contract",
    "FLM": "First Level Manager", "SLM": "Second Level Manager",
    "TLM": "Third Level Manager", "AE": "Account Executive",
    "QRF": "Quarterly Revenue Forecast",
    "S3": "Sales Stage 3", "S4": "Sales Stage 4", "S5": "Sales Stage 5",
    "S3+": "Sales Stage 3 and above", "S5+": "Sales Stage 5 and above",
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

- [ ] **Step 2: Commit**

```bash
git add server/context/definitions.json
git commit -m "feat: add definitions.json — canonical constants for context layer"
```

---

### Task 2: Create `definitionsFetcher.js` + Tests

**Files:**
- Create: `server/vectordb/definitionsFetcher.js`
- Create: `tests/definitionsFetcher.test.js`

- [ ] **Step 1: Write the test file**

```javascript
// tests/definitionsFetcher.test.js
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

describe('definitionsFetcher', () => {
  let fetcher;

  beforeEach(() => {
    // Force fresh require to clear cache
    delete require.cache[require.resolve('../server/vectordb/definitionsFetcher')];
    fetcher = require('../server/vectordb/definitionsFetcher');
  });

  describe('loadDefinitions', () => {
    it('returns definitions object after async load', async () => {
      const defs = await fetcher.loadDefinitionsAsync();
      assert.ok(defs);
      assert.ok(defs.thresholds);
      assert.ok(defs.mandatoryFilters);
      assert.ok(defs.abbreviations);
      assert.ok(defs.salesStageMapping);
    });
  });

  describe('getMandatoryFiltersForTables', () => {
    it('returns filters matching provided table names', async () => {
      await fetcher.loadDefinitionsAsync();
      const filters = fetcher.getMandatoryFiltersForTables(['vw_td_ebi_region_rpt']);
      assert.ok(filters.length > 0);
      const ids = filters.map(f => f.id);
      assert.ok(ids.includes('role_type'));
      assert.ok(ids.includes('sales_team_bu'));
      assert.ok(ids.includes('exclude_dme_region'));
      assert.ok(ids.includes('exclude_teams'));
    });

    it('returns pay_measure for fact tables', async () => {
      await fetcher.loadDefinitionsAsync();
      const filters = fetcher.getMandatoryFiltersForTables(['vw_TF_EBI_P2S']);
      const ids = filters.map(f => f.id);
      assert.ok(ids.includes('pay_measure'));
    });

    it('returns only always=true filters by default', async () => {
      await fetcher.loadDefinitionsAsync();
      const filters = fetcher.getMandatoryFiltersForTables(['vw_td_ebi_region_rpt']);
      const alwaysFilters = filters.filter(f => f.always);
      assert.equal(filters.length, alwaysFilters.length);
    });

    it('includes conditional filters when includeConditional=true', async () => {
      await fetcher.loadDefinitionsAsync();
      const filters = fetcher.getMandatoryFiltersForTables(
        ['vw_td_ebi_region_rpt'], { includeConditional: true }
      );
      const ids = filters.map(f => f.id);
      assert.ok(ids.includes('global_region'));
      assert.ok(ids.includes('dummy_terr'));
    });

    it('returns empty array for empty table list', async () => {
      await fetcher.loadDefinitionsAsync();
      const filters = fetcher.getMandatoryFiltersForTables([]);
      assert.equal(filters.length, 0);
    });
  });

  describe('getThreshold', () => {
    it('returns coverage thresholds', async () => {
      await fetcher.loadDefinitionsAsync();
      const t = fetcher.getThreshold('coverage');
      assert.equal(t.green, 2.5);
      assert.equal(t.yellow, 2.0);
      assert.equal(t.label, 'Coverage_Quality');
    });

    it('returns dsScore thresholds', async () => {
      await fetcher.loadDefinitionsAsync();
      const t = fetcher.getThreshold('dsScore');
      assert.equal(t.high, 65);
      assert.equal(t.medium, 40);
    });

    it('returns empty object for unknown type', async () => {
      await fetcher.loadDefinitionsAsync();
      const t = fetcher.getThreshold('nonexistent');
      assert.deepEqual(t, {});
    });
  });

  describe('getAbbreviations', () => {
    it('returns abbreviation map', async () => {
      await fetcher.loadDefinitionsAsync();
      const abbr = fetcher.getAbbreviations();
      assert.equal(abbr.W, 'Won');
      assert.equal(abbr.GNARR, 'Gross New ARR');
      assert.equal(abbr['SS5+'], 'Sales Stage 5 and above');
    });
  });

  describe('getSalesStageMapping', () => {
    it('returns id-to-name mapping', async () => {
      await fetcher.loadDefinitionsAsync();
      const mapping = fetcher.getSalesStageMapping();
      assert.equal(mapping['5'], 'S4');
      assert.equal(mapping['6'], 'S3');
      assert.equal(mapping['1'], 'Closed - Booked');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && node --test ../tests/definitionsFetcher.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write definitionsFetcher.js**

```javascript
// server/vectordb/definitionsFetcher.js
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const DEFINITIONS_FILE = path.join(
  __dirname, '..', 'context', 'definitions.json'
);

let _definitions = null;
let _loadPromise = null;

async function loadDefinitionsAsync() {
  if (_definitions) return _definitions;
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    if (!fs.existsSync(DEFINITIONS_FILE)) {
      logger.warn('Definitions JSON not found', { path: DEFINITIONS_FILE });
      _definitions = { thresholds: {}, mandatoryFilters: [], abbreviations: {}, salesStageMapping: {}, creationTargetWeights: {} };
      return _definitions;
    }
    const raw = await fs.promises.readFile(DEFINITIONS_FILE, 'utf-8');
    _definitions = JSON.parse(raw);
    return _definitions;
  })();
  return _loadPromise;
}

function loadDefinitions() {
  if (_definitions) return _definitions;
  return { thresholds: {}, mandatoryFilters: [], abbreviations: {}, salesStageMapping: {}, creationTargetWeights: {} };
}

/**
 * Return mandatory filters whose appliesTo intersects the given table names.
 * By default, only returns always=true filters.
 * Pass { includeConditional: true } to include always=false filters too.
 */
function getMandatoryFiltersForTables(tableNames, opts = {}) {
  if (!tableNames || tableNames.length === 0) return [];
  const defs = loadDefinitions();
  const filters = defs.mandatoryFilters || [];
  const tableSet = new Set(tableNames.map(t => t.toLowerCase()));

  return filters.filter(f => {
    if (!opts.includeConditional && !f.always) return false;
    return (f.appliesTo || []).some(t => tableSet.has(t.toLowerCase()));
  });
}

function getThreshold(type) {
  const defs = loadDefinitions();
  return (defs.thresholds && defs.thresholds[type]) || {};
}

function getSalesStageMapping() {
  const defs = loadDefinitions();
  return defs.salesStageMapping || {};
}

function getAbbreviations() {
  const defs = loadDefinitions();
  return defs.abbreviations || {};
}

function getCreationTargetWeights() {
  const defs = loadDefinitions();
  return defs.creationTargetWeights || {};
}

function reloadDefinitions() {
  _definitions = null;
  _loadPromise = null;
  return loadDefinitions();
}

module.exports = {
  loadDefinitionsAsync,
  loadDefinitions,
  getMandatoryFiltersForTables,
  getThreshold,
  getSalesStageMapping,
  getAbbreviations,
  getCreationTargetWeights,
  reloadDefinitions,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && node --test ../tests/definitionsFetcher.test.js`
Expected: All tests PASS

- [ ] **Step 5: Wire into server startup — edit `server/index.js`**

Add to the imports section (around line 62-68):
```javascript
const { loadDefinitionsAsync } = require('./vectordb/definitionsFetcher');
```

Add to the loaders array (around line 152-158):
```javascript
['definitions', loadDefinitionsAsync],
```

- [ ] **Step 6: Commit**

```bash
git add server/vectordb/definitionsFetcher.js tests/definitionsFetcher.test.js server/index.js
git commit -m "feat: add definitionsFetcher with tests, wire into startup"
```

---

### Task 3: Create `business-rules.md` + Update `rulesFetcher.js`

**Files:**
- Create: `server/context/knowledge/business-rules.md`
- Modify: `server/vectordb/rulesFetcher.js:17-23`

- [ ] **Step 1: Create business-rules.md**

Consolidate content from `business-context.md` (238 lines) + useful unique content from `strategic-framework.md` (142 lines). Structure by pipeline stage. Remove content now in `definitions.json` (threshold values, stage mapping table, mandatory filter SQL, abbreviation table, creation target weights). Keep as numbered imperatives where possible.

Source sections to merge:
- `business-context.md` lines 5-166 → Section 2 (Schema Interpretation)
- `business-context.md` lines 207-238 → Section 3 (SQL Generation Rules) as numbered imperatives
- `strategic-framework.md` lines 5-61 → Section 1 (Classification Rules) — question taxonomy and follow-up progression
- `strategic-framework.md` lines 83-142 → Section 4 (Presentation Rules) — signals, interventions, follow-ups
- Remove: lines 13 (coverage thresholds), 18-32 (mandatory filters as SQL), 88-112 (stage mapping table), 168-192 (abbreviation table), 194-205 (KPI calculation rules with threshold numbers) — all now in `definitions.json`

The final file should be ~160-180 lines with 4 sections: Classification Rules, Schema Interpretation, SQL Generation Rules, Presentation Rules.

- [ ] **Step 2: Update rulesFetcher.js file path**

In `server/vectordb/rulesFetcher.js`, change the `BUSINESS_RULES_FILE` constant (lines 17-23):

```javascript
// OLD:
const BUSINESS_RULES_FILE = path.join(__dirname, '..', 'context', 'knowledge', 'business-context.md');

// NEW:
const BUSINESS_RULES_FILE = path.join(__dirname, '..', 'context', 'knowledge', 'business-rules.md');
```

- [ ] **Step 3: Verify rulesFetcher still loads and parses correctly**

Run: `cd server && node -e "const {loadRulesAsync,searchRules}=require('./vectordb/rulesFetcher'); loadRulesAsync().then(()=>{ const r=searchRules('pipeline coverage quota',5); console.log('Found',r.length,'rules'); console.log(r.map(x=>x.category)); })"`

Expected: Found 5 rules, with categories like `sql_rules`, `terminology`, etc.

- [ ] **Step 4: Run existing tests**

Run: `cd server && node --test`
Expected: All tests pass (rulesFetcher consumers now read from business-rules.md)

- [ ] **Step 5: Commit**

```bash
git add server/context/knowledge/business-rules.md server/vectordb/rulesFetcher.js
git commit -m "feat: consolidate business-context.md + strategic-framework.md into business-rules.md"
```

---

### Task 4: Update `voice.js` for New File Paths

**Files:**
- Modify: `server/routes/voice.js:100-152`

- [ ] **Step 1: Update business-context.md reference to business-rules.md**

At line ~138, change:
```javascript
// OLD:
const businessContext = fs.readFileSync(path.join(knowledgeDir, 'business-context.md'), 'utf8');

// NEW:
const businessContext = fs.readFileSync(path.join(knowledgeDir, 'business-rules.md'), 'utf8');
```

- [ ] **Step 2: Update abbreviations source**

At lines ~117-122, change the abbreviation loading from kpi-glossary.json to definitions.json:

```javascript
// OLD:
const glossary = JSON.parse(fs.readFileSync(path.join(knowledgeDir, 'kpi-glossary.json'), 'utf8'));
if (glossary.abbreviations && typeof glossary.abbreviations === 'object') {
  for (const [abbr, fullName] of Object.entries(glossary.abbreviations)) {
    phrases.add(abbr); phrases.add(fullName);
  }
}

// NEW:
const definitions = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'context', 'definitions.json'), 'utf8'));
if (definitions.abbreviations && typeof definitions.abbreviations === 'object') {
  for (const [abbr, fullName] of Object.entries(definitions.abbreviations)) {
    phrases.add(abbr); phrases.add(fullName);
  }
}
```

- [ ] **Step 3: Verify voice route loads without errors**

Run: `cd server && node -e "require('./routes/voice'); console.log('voice.js loaded OK')"`
Expected: `voice.js loaded OK` (no file-not-found errors)

- [ ] **Step 4: Commit**

```bash
git add server/routes/voice.js
git commit -m "fix: update voice.js to use business-rules.md and definitions.json"
```

---

### Task 5: Trim `schema-knowledge.json`

**Files:**
- Modify: `server/context/knowledge/schema-knowledge.json`

This is a scripted transformation — too large to edit manually.

- [ ] **Step 1: Write a one-time trim script**

Create `scripts/trim-schema-knowledge.js`:

```javascript
#!/usr/bin/env node
/**
 * One-time script to trim schema-knowledge.json:
 * 1. Remove distinct_values for text/narrative columns (long string values)
 * 2. Remove obvious descriptions that just restate the column name
 * 3. Remove pk:false/fk:false (keep only when true)
 */
const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, '..', 'server', 'context', 'knowledge', 'schema-knowledge.json');

const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));

// Columns whose distinct values are long text — no filtering value
const TEXT_COLUMN_PATTERNS = [
  /NOTES$/i, /DESCRIPTION$/i, /COMMENT$/i, /NARRATIVE$/i,
  /REASON$/i, /TEXT$/i, /DETAIL$/i, /SUMMARY$/i,
  /FORECAST_NOTES/i, /DEAL_REVIEW/i, /GEO_FORECAST/i,
  /NEXT_STEP$/i, /NEXT_STEPS$/i, /ACTION$/i,
];

// Obvious descriptions: column name words == description words
function isObviousDescription(colName, desc) {
  if (!desc || desc.length === 0) return true;
  const colWords = new Set(colName.toLowerCase().replace(/_/g, ' ').split(/\s+/));
  const descWords = new Set(desc.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 1));
  if (descWords.size === 0) return true;
  // If every description word appears in the column name, it's obvious
  const overlap = [...descWords].filter(w => colWords.has(w));
  return overlap.length >= descWords.size * 0.8;
}

function isTextColumn(colName) {
  return TEXT_COLUMN_PATTERNS.some(p => p.test(colName));
}

function hasLongDistinctValues(values) {
  if (!Array.isArray(values) || values.length === 0) return false;
  const avgLen = values.reduce((sum, v) => sum + String(v).length, 0) / values.length;
  return avgLen > 80; // Average distinct value > 80 chars = likely narrative text
}

let removedDistinct = 0;
let removedDesc = 0;
let removedPkFk = 0;

for (const [tableName, tableData] of Object.entries(schema)) {
  if (!tableData.columns) continue;
  for (const [colName, colData] of Object.entries(tableData.columns)) {
    // 1. Remove distinct_values for text columns or columns with long values
    if (colData.distinct_values) {
      if (isTextColumn(colName) || hasLongDistinctValues(colData.distinct_values)) {
        delete colData.distinct_values;
        removedDistinct++;
      }
    }

    // 2. Remove obvious descriptions
    if (colData.description && isObviousDescription(colName, colData.description)) {
      delete colData.description;
      removedDesc++;
    }

    // 3. Remove pk:false and fk:false (keep only when true)
    if (colData.pk === false) { delete colData.pk; removedPkFk++; }
    if (colData.fk === false) { delete colData.fk; removedPkFk++; }
  }
}

fs.writeFileSync(SCHEMA_PATH, JSON.stringify(schema, null, 2) + '\n');

console.log(`Trimmed schema-knowledge.json:`);
console.log(`  Removed distinct_values: ${removedDistinct} columns`);
console.log(`  Removed obvious descriptions: ${removedDesc} columns`);
console.log(`  Removed pk:false/fk:false: ${removedPkFk} entries`);
```

- [ ] **Step 2: Run the trim script**

Run: `node scripts/trim-schema-knowledge.js`
Expected: Summary showing removed items. File size should drop from ~351KB to ~210-240KB.

- [ ] **Step 3: Verify schema still loads correctly**

Run: `cd server && node -e "const {loadSchemaKnowledgeAsync}=require('./vectordb/schemaFetcher'); loadSchemaKnowledgeAsync().then(s=>console.log('Tables loaded:',Object.keys(s).length))"`
Expected: Same table count as before (schema structure unchanged, just trimmed metadata)

- [ ] **Step 4: Verify distinct values still load for enum columns**

Run: `cd server && node -e "const {loadDistinctValuesAsync,getDistinctValues}=require('./vectordb/distinctValuesFetcher'); loadDistinctValuesAsync().then(()=>{ const v=getDistinctValues('vw_td_ebi_region_rpt','GLOBAL_REGION'); console.log('GLOBAL_REGION values:',v); })"`
Expected: Shows distinct values like `['AMERICAS','EMEA','APAC',...]` — enum columns retained

- [ ] **Step 5: Run all tests**

Run: `cd server && node --test`
Expected: All tests pass

- [ ] **Step 6: Commit (delete the one-time script, keep the trimmed schema)**

```bash
rm scripts/trim-schema-knowledge.js
git add server/context/knowledge/schema-knowledge.json
git commit -m "perf: trim schema-knowledge.json — remove text-column distinct values and obvious descriptions"
```

---

### Task 6: Refactor `goldExamples.json` + Fix Direct Readers

**Files:**
- Modify: `server/context/goldExamples.json`
- Modify: `server/vectordb/examplesFetcher.js:81`
- Modify: `server/graph/nodes/classify.js:104-106`

**CRITICAL**: `classify.js` and `subQueryMatch.js` (which imports from classify.js) read goldExamples.json directly as a plain array. When we wrap the array in an object, both will break unless we update `loadGoldIndex()` in classify.js.

Also: `classify.js` line 150 reads `questionCategory` and `questionSubCategory` from gold examples for the exact-match routing path (lines 377-378). These fields MUST be preserved — they are NOT unused.

- [ ] **Step 1: Write a one-time refactor script for goldExamples.json**

Create `scripts/refactor-gold-examples.js`:

```javascript
#!/usr/bin/env node
/**
 * One-time script to refactor goldExamples.json:
 * 1. Wrap examples array in object with _filterReference block
 * 2. Remove 'notes' field only
 * 3. KEEP questionCategory and questionSubCategory (used by classify.js exact-match path)
 */
const fs = require('fs');
const path = require('path');

const EXAMPLES_PATH = path.join(__dirname, '..', 'server', 'context', 'goldExamples.json');

const raw = JSON.parse(fs.readFileSync(EXAMPLES_PATH, 'utf-8'));

// Current file is a plain array — wrap it
const examples = Array.isArray(raw) ? raw : (raw.examples || []);

// Strip only 'notes' field (questionCategory and questionSubCategory are used by classify.js)
for (const ex of examples) {
  delete ex.notes;
}

const output = {
  _filterReference: {
    _comment: "Canonical mandatory filters. Not resolved at runtime — used by validation to verify all examples include correct filters.",
    quotaFilters: "q.PAY_MEASURE_ID = 0 AND r.TERR_ID NOT LIKE '%_%Dummy%' AND r.ROLE_TYPE_DISPLAY = 'AE' AND rc.ROLE_COVERAGE_BU_GROUP = 'DMX' AND r.SALES_TEAM_BU IN ('#NA','DX','DX/DME','WW') AND (r.SALES_REGION NOT LIKE '%DME%' OR r.SALES_REGION IS NULL) AND r.SALES_TEAM NOT IN ('AMER IND PS DX','AMER LATAM PS','AMER ENT PS DX','AMER PUB SEC SPECIALIST') AND o.MOPG1 <> 'ADVERTISING' AND o.DMX_SOLUTION_GROUP <> 'PPBU'",
    pipeFilters: "p.PAY_MEASURE_ID = 0 AND r.ROLE_TYPE_DISPLAY = 'AE' AND rc.ROLE_COVERAGE_BU_GROUP = 'DMX' AND r.SALES_TEAM_BU IN ('#NA','DX','DX/DME','WW') AND (r.SALES_REGION NOT LIKE '%DME%' OR r.SALES_REGION IS NULL) AND r.SALES_TEAM NOT IN ('AMER IND PS DX','AMER LATAM PS','AMER ENT PS DX','AMER PUB SEC SPECIALIST') AND o.MOPG1 <> 'ADVERTISING' AND o.DMX_SOLUTION_GROUP <> 'PPBU'",
    snapshotSubquery: "p.SNAPSHOT_DATE_ID = (SELECT MAX(p2.SNAPSHOT_DATE_ID) FROM vw_TF_EBI_P2S p2 JOIN vw_EBI_CALDATE c2 ON p2.SNAPSHOT_DATE_ID = c2.DATE_KEY WHERE c2.WEEK_SORT_ORDER_REVERSE = 0)"
  },
  examples
};

fs.writeFileSync(EXAMPLES_PATH, JSON.stringify(output, null, 2) + '\n');
console.log(`Refactored goldExamples.json: ${examples.length} examples, added _filterReference`);
```

- [ ] **Step 2: Run the script**

Run: `mkdir -p scripts && node scripts/refactor-gold-examples.js`
Expected: `Refactored goldExamples.json: 20 examples, added _filterReference`

- [ ] **Step 3: Update examplesFetcher.js to handle new structure**

In `server/vectordb/examplesFetcher.js`, update `loadExamplesAsync` (line 81) to extract `examples` array from the new wrapper object:

```javascript
// OLD (line 81):
const raw = JSON.parse(await fs.promises.readFile(EXAMPLES_FILE, 'utf-8'));
_store = buildExamplesStoreFromRaw(raw);

// NEW:
const parsed = JSON.parse(await fs.promises.readFile(EXAMPLES_FILE, 'utf-8'));
const raw = Array.isArray(parsed) ? parsed : (parsed.examples || []);
_store = buildExamplesStoreFromRaw(raw);
```

- [ ] **Step 4: Fix classify.js `loadGoldIndex()` to handle new format**

In `server/graph/nodes/classify.js`, find `loadGoldIndex()` (around line 104-106). The current code does:
```javascript
const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
for (const ex of raw) { ... }
```

Change to:
```javascript
const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
const raw = Array.isArray(parsed) ? parsed : (parsed.examples || []);
for (const ex of raw) { ... }
```

This fixes both `classify.js` and `subQueryMatch.js` (which imports `loadGoldIndex` from classify.js).

- [ ] **Step 5: Verify examples load via both paths**

Verify examplesFetcher:
```bash
cd server && node -e "const {loadExamplesAsync,searchExamples}=require('./vectordb/examplesFetcher'); loadExamplesAsync().then(()=>{ const r=searchExamples('pipeline coverage',3); console.log('examplesFetcher:',r.length,'examples'); })"
```

Verify classify.js direct load:
```bash
cd server && node -e "const parsed=JSON.parse(require('fs').readFileSync('context/goldExamples.json','utf-8')); const raw=Array.isArray(parsed)?parsed:parsed.examples; console.log('Direct:',raw.length,'examples, has sql:',!!raw[0].sql, 'has category:',!!raw[0].questionCategory)"
```

Expected: Both show correct example count. Direct load confirms `sql` AND `questionCategory` are present.

- [ ] **Step 6: Run all tests**

Run: `cd server && node --test`
Expected: All tests pass

- [ ] **Step 7: Commit (delete the one-time script)**

```bash
rm scripts/refactor-gold-examples.js
git add server/context/goldExamples.json server/vectordb/examplesFetcher.js server/graph/nodes/classify.js
git commit -m "refactor: wrap goldExamples.json with _filterReference, fix classify.js direct reader"
```

---

### Task 7: Enrich `join-knowledge.json` + Update `joinRuleFetcher.js`

**Files:**
- Modify: `server/context/knowledge/join-knowledge.json`
- Modify: `server/vectordb/joinRuleFetcher.js:42-61,134-216`

- [ ] **Step 1: Write a one-time enrichment script for join-knowledge.json**

Create `scripts/enrich-join-knowledge.js`. This script:
1. Converts `left_table`/`right_table` → `tables` array (sorted alphabetically)
2. Picks the first `columns` entry as `primaryKey`, rest as `alternateKeys`
3. Adds default `cardinality: "1:N"` and `joinType: "INNER"` (can be manually refined later)
4. Same treatment for `multihopJoins` → `indirectJoins` (rename key, add `tables` array)

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const JOIN_PATH = path.join(__dirname, '..', 'server', 'context', 'knowledge', 'join-knowledge.json');
const raw = JSON.parse(fs.readFileSync(JOIN_PATH, 'utf-8'));

const directJoins = (raw.directJoins || []).map(rule => {
  const tables = [rule.left_table, rule.right_table].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  const cols = rule.columns || [];
  const primaryKey = cols[0] || null;
  const alternateKeys = cols.slice(1).map(sql => ({ sql, useWhen: '' }));

  return {
    tables,
    primaryKey,
    cardinality: '1:N',
    joinType: 'INNER',
    ...(alternateKeys.length > 0 ? { alternateKeys } : {}),
  };
});

const indirectJoins = (raw.multihopJoins || []).map(rule => {
  const tables = [rule.left_table, rule.right_table].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  return {
    tables,
    bridge: rule.bridge_table,
    steps: rule.steps || [],
    cardinality: '1:N:1',
  };
});

const output = { directJoins, indirectJoins };
fs.writeFileSync(JOIN_PATH, JSON.stringify(output, null, 2) + '\n');
console.log(`Enriched join-knowledge.json: ${directJoins.length} direct, ${indirectJoins.length} indirect`);
```

- [ ] **Step 2: Run the enrichment script**

Run: `node scripts/enrich-join-knowledge.js`
Expected: Enriched join-knowledge.json with counts

- [ ] **Step 3: Update joinRuleFetcher.js to read new schema**

Update `buildJoinKnowledgeFromRaw()` (lines 42-61) to handle both `tables` array and `left_table`/`right_table`:

```javascript
function buildJoinKnowledgeFromRaw(raw) {
  const directIndex = new Map();
  for (const rule of raw.directJoins || []) {
    // Support both old (left_table/right_table) and new (tables array) formats
    const tableA = rule.tables ? rule.tables[0] : rule.left_table;
    const tableB = rule.tables ? rule.tables[1] : rule.right_table;
    const key = makePairKey(tableA, tableB);
    if (!directIndex.has(key)) directIndex.set(key, []);
    directIndex.get(key).push(rule);
  }
  const multihopIndex = new Map();
  for (const rule of raw.indirectJoins || raw.multihopJoins || []) {
    const tableA = rule.tables ? rule.tables[0] : rule.left_table;
    const tableB = rule.tables ? rule.tables[1] : rule.right_table;
    const key = makePairKey(tableA, tableB);
    if (!multihopIndex.has(key)) multihopIndex.set(key, []);
    multihopIndex.get(key).push(rule);
  }
  return {
    directJoins: raw.directJoins || [],
    multihopJoins: raw.indirectJoins || raw.multihopJoins || [],
    directIndex,
    multihopIndex,
  };
}
```

- [ ] **Step 4: Update `getJoinRulesForTables()` result shape (lines 134-193)**

Update the direct join result builder to use the new fields:

```javascript
// Inside the direct join branch (around line 153):
const tableA = rule.tables ? rule.tables[0] : rule.left_table;
const tableB = rule.tables ? rule.tables[1] : rule.right_table;

// Build join_columns from new or old format
let joinColumnsStr;
if (rule.primaryKey) {
  const parts = [rule.primaryKey];
  if (rule.alternateKeys) parts.push(...rule.alternateKeys.map(a => a.sql));
  joinColumnsStr = parts.join(' | ');
} else {
  joinColumnsStr = (rule.columns || []).join(' | ');
}

results.push({
  left_table: tableA,
  right_table: tableB,
  bridge_table: null,
  category: 'join',
  type: 'join_rule',
  join_columns: joinColumnsStr,
  primaryKey: rule.primaryKey || null,
  cardinality: rule.cardinality || null,
  joinType: rule.joinType || null,
  alternateKeys: rule.alternateKeys || null,
  text: `${tableA} joins to ${tableB}. Join columns: ${joinColumnsStr}`,
});
```

- [ ] **Step 5: Update `formatJoinRulesText()` to show primaryKey prominently (lines 205-216)**

```javascript
function formatJoinRulesText(joinRules) {
  if (!joinRules || joinRules.length === 0) return '';

  const joinLines = joinRules.map((j) => {
    if (j.category === 'multihop_join') {
      return `${j.left_table} \u2192 ${j.bridge_table} \u2192 ${j.right_table} (multi-hop)\n  ${j.text}`;
    }
    let line = `${j.left_table} \u2194 ${j.right_table}`;
    if (j.cardinality) line += ` (${j.cardinality}, ${j.joinType || 'INNER'} JOIN)`;
    if (j.primaryKey) {
      line += `\n  Primary: ${j.primaryKey}`;
      if (j.alternateKeys && j.alternateKeys.length > 0) {
        for (const alt of j.alternateKeys) {
          line += `\n    Alt: ${alt.sql}${alt.useWhen ? ' — Use when: ' + alt.useWhen : ''}`;
        }
      }
    } else {
      line += `\n  Columns: ${j.join_columns || j.text}`;
    }
    return line;
  });

  return `=== VALID JOINS ===\n\n${joinLines.join('\n\n')}`;
}
```

- [ ] **Step 6: Verify joins still load and format correctly**

Run: `cd server && node -e "const {loadJoinKnowledgeAsync,getJoinRulesForTables,formatJoinRulesText}=require('./vectordb/joinRuleFetcher'); loadJoinKnowledgeAsync().then(()=>{ const r=getJoinRulesForTables(['vw_TF_EBI_P2S','vw_td_ebi_region_rpt','vw_EBI_OPG']); console.log(formatJoinRulesText(r)); })"`
Expected: Formatted join rules with `Primary:` lines and `(1:N, INNER JOIN)` annotations

- [ ] **Step 7: Run all tests**

Run: `cd server && node --test`
Expected: All tests pass

- [ ] **Step 8: Commit (delete the one-time script)**

```bash
rm scripts/enrich-join-knowledge.js
git add server/context/knowledge/join-knowledge.json server/vectordb/joinRuleFetcher.js
git commit -m "feat: enrich join-knowledge.json with primaryKey, cardinality, joinType"
```

---

### Task 8: Clean Up `kpi-glossary.json` + `kpiFetcher.js`

**Files:**
- Modify: `server/context/knowledge/kpi-glossary.json`
- Modify: `server/vectordb/kpiFetcher.js:49-81,164-198`

- [ ] **Step 1: Remove abbreviations from kpi-glossary.json**

Read the file. Remove the top-level `"abbreviations"` key (lines 2-31). Keep only the `"kpis"` array. The result should be:

```json
{
  "kpis": [
    ...existing kpi entries unchanged...
  ]
}
```

- [ ] **Step 2: Update kpiFetcher.js — remove abbreviation loading**

In `buildKpiStoreFromData()` (line 49-81), remove the abbreviations extraction:

```javascript
// OLD (lines 51-53):
const abbreviations = data.abbreviations && typeof data.abbreviations === 'object'
  ? data.abbreviations
  : {};

// NEW:
// abbreviations now live in definitions.json
```

Update the return statement (line 80):
```javascript
// OLD:
return { kpis, keywordIndex, abbreviations };

// NEW:
return { kpis, keywordIndex };
```

Update `loadKpiGlossary()` fallback (line 109):
```javascript
// OLD:
return { kpis: [], keywordIndex: new Map(), abbreviations: {} };

// NEW:
return { kpis: [], keywordIndex: new Map() };
```

Also update `loadKpiGlossaryAsync()` fallback (lines 89, 98):
```javascript
// OLD:
_store = { kpis: [], keywordIndex: new Map(), abbreviations: {} };

// NEW:
_store = { kpis: [], keywordIndex: new Map() };
```

- [ ] **Step 3: Remove dead `expandAbbreviations()` function**

Delete the entire `expandAbbreviations` function (lines 164-186) and the `escapeRegex` helper (lines 188-190).

Update module.exports (line 198):
```javascript
// OLD:
module.exports = { searchKpis, expandAbbreviations, reloadKpiGlossary, loadKpiGlossaryAsync };

// NEW:
module.exports = { searchKpis, reloadKpiGlossary, loadKpiGlossaryAsync };
```

- [ ] **Step 4: Verify KPI search still works**

Run: `cd server && node -e "const {loadKpiGlossaryAsync,searchKpis}=require('./vectordb/kpiFetcher'); loadKpiGlossaryAsync().then(()=>{ const r=searchKpis('gnarr coverage',3); console.log('Found',r.length,'KPIs'); r.forEach(k=>console.log('-',k.name)); })"`
Expected: Found 3 KPIs with coverage/gnarr-related names

- [ ] **Step 5: Run all tests**

Run: `cd server && node --test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add server/context/knowledge/kpi-glossary.json server/vectordb/kpiFetcher.js
git commit -m "refactor: remove abbreviations from kpi-glossary (moved to definitions.json), delete dead expandAbbreviations"
```

---

### Task 9: Add MANDATORY FILTERS to `generateSql.js` Prompt

**Files:**
- Modify: `server/graph/nodes/contextFetch.js:107-180`
- Modify: `server/graph/nodes/generateSql.js:203-431`

- [ ] **Step 1: Add mandatoryFilters to contextBundle in contextFetch.js**

At the top of `contextFetch.js`, add the import:
```javascript
const { getMandatoryFiltersForTables } = require('../../vectordb/definitionsFetcher');
```

In the context bundle assembly (after tableNames are determined, around line 168-180), add:
```javascript
const mandatoryFilters = getMandatoryFiltersForTables(tableNames);
```

And include in the returned bundle:
```javascript
contextBundle: {
  tableNames, columnsByTable, schema, columnMetadata,
  joinRules, joinText, examples, rules, kpis,
  fiscalPeriod, distinctValues, mandatoryFilters
}
```

- [ ] **Step 2: Add formatMandatoryFilters function in generateSql.js**

Add near the other format functions (around line 125):

```javascript
function formatMandatoryFilters(filters) {
  if (!filters || filters.length === 0) return '';
  const lines = filters.map(f => {
    let line = `- ${f.sql}`;
    const tables = (f.appliesTo || []).join(', ');
    if (tables) line += `  [${tables}]`;
    if (f.note) line += `  — ${f.note}`;
    return line;
  });
  return `=== MANDATORY FILTERS ===\nApply ALL filters below that match tables in your query:\n\n${lines.join('\n')}`;
}
```

- [ ] **Step 3: Inject MANDATORY FILTERS as first section in buildSystemPrompt()**

In `buildSystemPrompt()` (around line 275), add the mandatory filters section BEFORE schema:

```javascript
const mandatoryFiltersBlock = formatMandatoryFilters(contextBundle.mandatoryFilters);
```

Then insert it into the prompt assembly (before the schema section, around line 276):
```javascript
if (mandatoryFiltersBlock) sections.push(mandatoryFiltersBlock);
```

(Exact insertion point depends on how `sections` array is built — read the actual code structure.)

- [ ] **Step 4: Verify the prompt now includes MANDATORY FILTERS**

Run a quick test by calling the format function directly:
```bash
cd server && node -e "
const {loadDefinitionsAsync,getMandatoryFiltersForTables}=require('./vectordb/definitionsFetcher');
loadDefinitionsAsync().then(()=>{
  const f=getMandatoryFiltersForTables(['vw_TF_EBI_P2S','vw_td_ebi_region_rpt','vw_EBI_OPG','vw_TD_EBI_ROLE_Coverage']);
  console.log('Filters for these tables:');
  f.forEach(x=>console.log('-',x.id,':',x.sql));
});
"
```
Expected: Shows role_type, sales_team_bu, exclude_dme_region, exclude_teams, pay_measure, exclude_advertising, exclude_ppbu filters

- [ ] **Step 5: Run all tests**

Run: `cd server && node --test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add server/graph/nodes/contextFetch.js server/graph/nodes/generateSql.js
git commit -m "feat: inject MANDATORY FILTERS into SQL generation prompt from definitions.json"
```

---

### Task 10: Replace Hardcoded Thresholds in `present.js`

**Files:**
- Modify: `server/prompts/present.js:13,38,52`

- [ ] **Step 1: Add definitionsFetcher import at top of present.js**

```javascript
const { getThreshold } = require('../vectordb/definitionsFetcher');
```

- [ ] **Step 2: Create a helper to build the threshold string**

```javascript
function coverageThresholdText() {
  const t = getThreshold('coverage');
  if (!t.green) return 'Coverage: Green >= 2.5x, Yellow >= 2.0x, Red < 2.0x'; // fallback
  return `Coverage: Green >= ${t.green}x, Yellow >= ${t.yellow}x, Red < ${t.yellow}x`;
}
```

- [ ] **Step 3: Replace the 3 hardcoded threshold strings**

Find and replace each occurrence of `Coverage: Green >= 2.5x, Yellow >= 2.0x, Red < 2.0x` (and the variant without `Coverage:` prefix) with `${coverageThresholdText()}` in the template literals at lines ~13, ~38, ~52.

If these are in template literals, use string interpolation. If they're in plain strings, use concatenation.

- [ ] **Step 4: Verify present.js loads without errors**

Run: `cd server && node -e "require('./prompts/present'); console.log('present.js loaded OK')"`
Expected: `present.js loaded OK`

- [ ] **Step 5: Commit**

```bash
git add server/prompts/present.js
git commit -m "refactor: replace hardcoded coverage thresholds in present.js with definitionsFetcher"
```

---

### Task 11: Delete Old Files

**Files:**
- Delete: `server/context/knowledge/business-context.md`
- Delete: `server/context/knowledge/strategic-framework.md`

- [ ] **Step 1: Verify no remaining references to old files**

Search the codebase for any remaining references:

```bash
cd server && grep -r "business-context.md" --include="*.js" .
cd server && grep -r "strategic-framework.md" --include="*.js" .
```

Expected: No results (rulesFetcher.js now points to business-rules.md, voice.js updated in Task 4)

- [ ] **Step 2: Delete the files**

```bash
git rm server/context/knowledge/business-context.md
git rm server/context/knowledge/strategic-framework.md
```

- [ ] **Step 3: Run all tests to confirm nothing breaks**

Run: `cd server && node --test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: delete business-context.md and strategic-framework.md (content absorbed)"
```

---

### Task 12: Add `validate:examples` Script

**Files:**
- Create: `scripts/validate-examples.js`
- Modify: `server/package.json` (add npm script)

- [ ] **Step 1: Create the validation script**

Create `scripts/validate-examples.js`:

```javascript
#!/usr/bin/env node
/**
 * Validates that gold example SQL contains the correct mandatory filters.
 * Uses _filterReference from goldExamples.json to check.
 * Run: npm run validate:examples
 */
const fs = require('fs');
const path = require('path');

const EXAMPLES_PATH = path.join(__dirname, '..', 'server', 'context', 'goldExamples.json');
const parsed = JSON.parse(fs.readFileSync(EXAMPLES_PATH, 'utf-8'));
const ref = parsed._filterReference;
const examples = parsed.examples || [];

if (!ref) { console.error('No _filterReference found'); process.exit(1); }

// Key filter fragments that should appear in every quota/pipe query
const quotaChecks = ['PAY_MEASURE_ID = 0', "ROLE_TYPE_DISPLAY = 'AE'", "ROLE_COVERAGE_BU_GROUP = 'DMX'", "MOPG1 <> 'ADVERTISING'", "DMX_SOLUTION_GROUP <> 'PPBU'"];
const pipeChecks = [...quotaChecks, "SALES_STAGE"];

let issues = 0;
for (const ex of examples) {
  const sql = (ex.sql || '').toUpperCase();
  const tables = (ex.tables_used || []).map(t => t.toLowerCase());

  const hasQuota = tables.some(t => t.includes('quota'));
  const hasPipe = tables.some(t => t.includes('p2s'));

  const checks = hasQuota ? quotaChecks : (hasPipe ? pipeChecks : []);
  for (const check of checks) {
    if (!sql.includes(check.toUpperCase())) {
      console.warn(`[WARN] ${ex.id}: missing filter fragment "${check}"`);
      issues++;
    }
  }
}

if (issues === 0) {
  console.log(`All ${examples.length} examples pass mandatory filter validation.`);
} else {
  console.warn(`\n${issues} issue(s) found across ${examples.length} examples.`);
}
```

- [ ] **Step 2: Add npm script to server/package.json**

Add to the `"scripts"` section:
```json
"validate:examples": "node ../scripts/validate-examples.js"
```

- [ ] **Step 3: Run the validation**

Run: `cd server && npm run validate:examples`
Expected: All examples pass (or known issues flagged for manual review)

- [ ] **Step 4: Commit**

```bash
git add scripts/validate-examples.js server/package.json
git commit -m "feat: add validate:examples script for gold example filter verification"
```

---

### Task 13: Final Verification + Cleanup

**Files:**
- Verify: all modified files
- Clean up: any temporary scripts

- [ ] **Step 1: Run full test suite**

Run: `cd server && node --test`
Expected: All tests pass, no regressions

- [ ] **Step 2: Verify server starts cleanly**

Run: `cd server && node -e "
const loaders = [
  require('./vectordb/definitionsFetcher').loadDefinitionsAsync,
  require('./vectordb/schemaFetcher').loadSchemaKnowledgeAsync,
  require('./vectordb/examplesFetcher').loadExamplesAsync,
  require('./vectordb/rulesFetcher').loadRulesAsync,
  require('./vectordb/joinRuleFetcher').loadJoinKnowledgeAsync,
  require('./vectordb/kpiFetcher').loadKpiGlossaryAsync,
];
Promise.allSettled(loaders.map(fn => fn())).then(results => {
  results.forEach((r, i) => console.log(i, r.status));
  console.log('All loaders completed');
});
"`
Expected: All 6 loaders show `fulfilled`

- [ ] **Step 3: Verify file sizes improved**

Run: `wc -l server/context/knowledge/* server/context/*.json server/context/definitions.json`
Expected: Total lines significantly less than the original ~14,275

- [ ] **Step 4: Verify no orphaned scripts**

Run: `ls scripts/`
Expected: No leftover `trim-schema-knowledge.js`, `refactor-gold-examples.js`, or `enrich-join-knowledge.js`

- [ ] **Step 5: Final commit with any cleanup**

Only if there are any remaining uncommitted changes:
```bash
git add -A && git commit -m "chore: final cleanup for context layer refinement"
```

---

## Spec Deviations (Intentional)

| Spec item | Plan approach | Reason |
|-----------|--------------|--------|
| `schemaFetcher.js` modifications (`formatColumnForPrompt`, `schemaToMarkdown`) | Physical data removal via trim script (Task 5) | Those functions don't exist in the codebase. Physically removing text-column distinct values from schema-knowledge.json achieves the same result without runtime filtering. |
| `distinctValuesFetcher.js` code change | No code change | The existing `if (colData.distinct_values && Array.isArray(...))` check in `buildStoreFromSchema` naturally skips columns whose distinct_values were physically removed by the trim script. |
| `expandAbbreviations()` in definitionsFetcher exports | Not added | Function is dead code (zero callers). Removed from kpiFetcher in Task 8 rather than migrated. |
| `dashboardGoldExamples.json` minor trim | Deferred | Marked `[MINOR]` in spec. The 3 dashboard examples are small (183 lines total) and the insight text duplication has negligible token impact. Can be done as a follow-up. |
