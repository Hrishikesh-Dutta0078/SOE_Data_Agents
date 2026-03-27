# KPI Glossary DB Formula Backfill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 298 EXTERNALMEASURE entries and 119 empty-relatedColumns entries in `kpi-glossary.json` so the LLM has DB `table.column` references for SQL generation.

**Architecture:** Enhance the existing `scripts/refactor-kpi-glossary.js` with a 4-pass pipeline: (1) Excel merge, (2) regex extraction, (3) pattern inference, (4) pbix_only marking. The script reads the glossary JSON + Excel mapping log, applies transformations in priority order, and writes both files back.

**Tech Stack:** Node.js (CommonJS), `xlsx` package (already a dependency), `fs`/`path` stdlib.

---

### Task 1: Add Excel Merge Pass

**Files:**
- Modify: `scripts/refactor-kpi-glossary.js`

This pass reads `docs/kpi-glossary-mapping-log.xlsx` and backfills `formula` + `relatedColumns` for KPIs where the Excel has valid DB data that the existing `FORMULA_OVERRIDES` don't already cover.

- [ ] **Step 1: Add Excel reading function after the existing constants**

Add this function after line 170 (after `COL_MAP` closing brace), before `FORMULA_OVERRIDES`:

```javascript
// ─── Pass 1: Excel Merge ────────────────────────────────────────────
function loadExcelMappings() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.log('  Excel mapping log not found, skipping Pass 1');
    return new Map();
  }
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);
  const map = new Map();
  for (const row of rows) {
    const id = row.KPI_ID;
    if (!id) continue;
    const dbFormula = (row.DB_Formula || '').trim();
    const relCols = (row.Related_Columns_DB || '').trim();
    // Skip rows where DB_Formula is empty or is just the EXTERNALMEASURE repeated
    if (!dbFormula || dbFormula.includes('EXTERNALMEASURE')) continue;
    map.set(id, {
      formula: dbFormula,
      relatedColumns: relCols
        ? relCols.split(/,\s*/).filter(c => c.length > 0)
        : [],
    });
  }
  console.log(`  Pass 1: loaded ${map.size} DB mappings from Excel`);
  return map;
}
```

- [ ] **Step 2: Run the script to verify it loads without errors**

Run: `cd "C:\Users\hrishikeshd\Desktop\Auto_Agents_Claude" && node scripts/refactor-kpi-glossary.js`
Expected: Script runs and prints existing summary (no Pass 1 output yet since we haven't wired it into main)

- [ ] **Step 3: Commit**

```bash
git add scripts/refactor-kpi-glossary.js
git commit -m "feat(kpi): add Excel merge function for Pass 1 of DB backfill"
```

---

### Task 2: Add Regex Extraction Pass

**Files:**
- Modify: `scripts/refactor-kpi-glossary.js`

This pass extracts `table.column` references from formula text for entries that have DB-style formulas but empty `relatedColumns`.

- [ ] **Step 1: Add regex extraction function after `loadExcelMappings`**

```javascript
// ─── Pass 2: Regex Extract relatedColumns from formula text ─────────
const TABLE_COL_REGEX = /\b(vw_\w+|TF_\w+|TD_\w+|VW_\w+)\.\w+/gi;

function extractRelatedColumnsFromFormula(formula) {
  if (!formula || typeof formula !== 'string') return [];
  const matches = formula.match(TABLE_COL_REGEX);
  if (!matches) return [];
  const seen = new Set();
  const result = [];
  for (const m of matches) {
    const normalized = m; // preserve original casing
    if (!seen.has(normalized.toLowerCase())) {
      seen.add(normalized.toLowerCase());
      result.push(normalized);
    }
  }
  return result;
}

function deriveRelatedTables(relatedColumns) {
  const seen = new Set();
  const tables = [];
  for (const col of relatedColumns) {
    const dot = col.indexOf('.');
    if (dot > 0) {
      const table = col.substring(0, dot);
      if (!seen.has(table.toLowerCase())) {
        seen.add(table.toLowerCase());
        tables.push(table);
      }
    }
  }
  return tables;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/refactor-kpi-glossary.js
git commit -m "feat(kpi): add regex extraction and table derivation for Pass 2"
```

---

### Task 3: Add Pattern Inference Rules (Pass 3)

**Files:**
- Modify: `scripts/refactor-kpi-glossary.js`

The largest task. Defines an ordered array of `{ pattern, formula, relatedColumns }` rules that match KPI names. First match wins. PBIX-only patterns return a special marker.

- [ ] **Step 1: Add the PBIX_ONLY constant and inference rules array**

Add after the `deriveRelatedTables` function:

```javascript
// ─── Pass 3: Pattern-Based Inference ────────────────────────────────
const PBIX_ONLY_FORMULA = 'Power BI calculated measure — not directly queryable via SQL';

// Each rule: { test: (name, section) => bool, formula: string, relatedColumns: string[], pbixOnly?: true }
// Rules are evaluated top-to-bottom; first match wins.
const INFERENCE_RULES = [
  // ── PBIX-only patterns (must come first to prevent false positives) ──
  { test: n => /\bGEO RANK\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bOVERALLSCORE\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bCREDIT\b/i.test(n) && !/GROSS|NET|PIPE/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bDEFAULT (COMMIT|TARGET)\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bSNAPSHOT DATE\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bMULTI SOLUTION\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bPROJECTED CLOSE RATIO\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bLINEARITY TARGET TREND\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bPARTNER\b.*%/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bProduct Consumption\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bPrimary Product Consumption\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bTENURE\b.*\bGAP\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bCURRENT ROLE TENURE\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bLEAD\b.*\b(AMOUNT|VALUE)\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\b(ACCOUNT|SBR) ACTIVITY\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bCOMPETITOR FILL RATE\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bCOMPLETED (IPOV|MUTUAL)\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bTIER \d\b.*\bCOMPLETED\b.*\bAP\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bTIER \d\b.*\bASSESSED\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bTIER \d\b.*\bCOMPLETED\b.*[#%]/i.test(n) && !/GNARR|WON|GROSS|ACCTS/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bTIER \d\b.*\bOWNER\b.*%/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bNOT TIERED\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bPRNT COMPLETE\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bENABLEMENT\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bEOQ SNAPSHOT DATE\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },
  { test: n => /\bPQ EOQ SNAPSHOT DATE\b/i.test(n), formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true },

  // ── Tier-specific DB-mappable patterns ──
  {
    test: n => /\bTIER (\d)\b.*\bGNARR\b.*\$/i.test(n),
    formula: n => { const t = n.match(/TIER (\d)/i)[1]; return `SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.PARENT_TIER = 'Tier ${t}'`; },
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.PARENT_TIER'],
  },
  {
    test: n => /\bTIER (\d)\b.*\b(WITH|WITHOUT) GNARR\b.*#/i.test(n),
    formula: n => {
      const t = n.match(/TIER (\d)/i)[1];
      const has = /WITHOUT/i.test(n) ? 'IS NULL' : 'IS NOT NULL';
      return `COUNT(DISTINCT vw_TF_EBI_P2S.ACCOUNT_PARENT_ID) WHERE vw_TF_EBI_P2S.PARENT_TIER = 'Tier ${t}' AND vw_TF_EBI_P2S.OPPTY ${has}`;
    },
    relatedColumns: ['vw_TF_EBI_P2S.ACCOUNT_PARENT_ID', 'vw_TF_EBI_P2S.PARENT_TIER', 'vw_TF_EBI_P2S.OPPTY'],
  },
  {
    test: n => /\bTIER (\d)\b.*\bACCTS\b.*#/i.test(n),
    formula: n => { const t = n.match(/TIER (\d)/i)[1]; return `COUNT(DISTINCT vw_TF_EBI_P2S.ACCOUNT_PARENT_ID) WHERE vw_TF_EBI_P2S.PARENT_TIER = 'Tier ${t}'`; },
    relatedColumns: ['vw_TF_EBI_P2S.ACCOUNT_PARENT_ID', 'vw_TF_EBI_P2S.PARENT_TIER'],
  },
  {
    test: n => /\bTIER (\d)\b.*\bWON\b.*\$/i.test(n),
    formula: n => { const t = n.match(/TIER (\d)/i)[1]; return `SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.PARENT_TIER = 'Tier ${t}' AND vw_TF_EBI_P2S.ADJ_COMMITMENT = 'Won'`; },
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.PARENT_TIER', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'],
  },
  {
    test: n => /\bTIER (\d)\b.*\bGROSS CREATED\b.*\$/i.test(n),
    formula: n => { const t = n.match(/TIER (\d)/i)[1]; return `SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.PARENT_TIER = 'Tier ${t}' AND vw_EBI_Caldate.QUALIFICATION_QTR_BKT = 0`; },
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.PARENT_TIER', 'vw_EBI_Caldate.QUALIFICATION_QTR_BKT'],
  },

  // ── W+F+UC (must be before generic WON/FORECAST/UPSIDE) ──
  {
    test: n => /\bW\+F\+UC\b.*\$/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT IN ('Won','Forecast','Upside - Committed')",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'],
  },
  {
    test: n => /\bW\+F\+UC\b.*%/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN ('Won','Forecast','Upside - Committed')) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0)",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'],
  },

  // ── Pipeline Walk ──
  {
    test: n => /\bWALK VALUE\b/i.test(n) || /\bWALK\b.*\$/i.test(n),
    formula: 'SUM(vw_TF_EBI_PIPE_WALK.GROSSASV)',
    relatedColumns: ['vw_TF_EBI_PIPE_WALK.GROSSASV'],
  },
  {
    test: n => /\bWALK\b.*\bCLOSE RATIO\b/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT = 'Won' AND IS_EOQ = 'TRUE') / NULLIF(SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1 AND IS_BOQ = 'TRUE'), 0)",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_TF_EBI_P2S.IS_EOQ', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_TF_EBI_P2S.IS_BOQ'],
  },
  {
    test: n => /\bWalk Oppty\b/i.test(n),
    formula: 'COUNT(DISTINCT vw_TF_EBI_PIPE_WALK.OPP_ID)',
    relatedColumns: ['vw_TF_EBI_PIPE_WALK.OPP_ID'],
  },

  // ── Progression / Stage ──
  {
    test: n => /\bSS4 PROGRESSION\b/i.test(n),
    formula: "SUM(vw_TF_EBI_PIPE_WALK.STAGEPROGRESSIONASV) WHERE vw_TF_EBI_PIPE_WALK.PREV_SALES_STAGE_DERIVED IN ('S3','In Qtr') AND vw_TF_EBI_PIPE_WALK.CURR_SALES_STAGE IN ('S4','S5','S6','S7','Booked')",
    relatedColumns: ['vw_TF_EBI_PIPE_WALK.STAGEPROGRESSIONASV', 'vw_TF_EBI_PIPE_WALK.PREV_SALES_STAGE_DERIVED', 'vw_TF_EBI_PIPE_WALK.CURR_SALES_STAGE'],
  },
  {
    test: n => /\bTRUE PROGRESSION\b/i.test(n),
    formula: "SUM(vw_TF_EBI_PIPE_WALK.STAGEPROGRESSIONASV) WHERE vw_TF_EBI_PIPE_WALK.PREV_SALES_STAGE_DERIVED IN ('S3','S4') AND vw_TF_EBI_PIPE_WALK.CURR_SALES_STAGE IN ('S5','S6','S7','Booked')",
    relatedColumns: ['vw_TF_EBI_PIPE_WALK.STAGEPROGRESSIONASV', 'vw_TF_EBI_PIPE_WALK.PREV_SALES_STAGE_DERIVED', 'vw_TF_EBI_PIPE_WALK.CURR_SALES_STAGE'],
  },

  // ── Won / Lost / Closed ──
  {
    test: n => /\bWON\b.*\$/i.test(n) && !/TIER|W\+F\+UC|TREND|PRNT/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT = 'Won'",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'],
  },
  {
    test: n => /\bWON\b.*#/i.test(n),
    formula: "COUNT(DISTINCT vw_TF_EBI_P2S.OPP_ID) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT = 'Won'",
    relatedColumns: ['vw_TF_EBI_P2S.OPP_ID', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'],
  },
  {
    test: n => /\bWON \$ TREND\b/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT = 'Won' by vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE'],
  },
  {
    test: n => /\bLOST\b.*\$/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT = 'Lost'",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'],
  },
  {
    test: n => /\bLOST\b.*#/i.test(n),
    formula: "COUNT(DISTINCT vw_TF_EBI_P2S.OPP_ID) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT = 'Lost'",
    relatedColumns: ['vw_TF_EBI_P2S.OPP_ID', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'],
  },
  {
    test: n => /\bCLOSED\b.*#/i.test(n),
    formula: "COUNT(DISTINCT vw_TF_EBI_P2S.OPP_ID) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT IN ('Won','Lost')",
    relatedColumns: ['vw_TF_EBI_P2S.OPP_ID', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'],
  },

  // ── Coverage ──
  {
    test: n => /\bCOVERAGE\b.*\bBOQ\b.*\bMATURE\b/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1 AND IS_BOQ = 'TRUE' AND vw_EBI_SALES_STAGE.SalesStageGrp_Sort = 2) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0)",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_TF_EBI_P2S.IS_BOQ', 'vw_EBI_SALES_STAGE.SalesStageGrp_Sort', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'],
  },
  {
    test: n => /\bCOVERAGE\b.*\bBOQ\b.*\bPIPE\b/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1 AND IS_BOQ = 'TRUE') / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0)",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_TF_EBI_P2S.IS_BOQ', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'],
  },
  {
    test: n => /\bCOVERAGE\b.*\bMATURE\b.*\bPIPE\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1 AND vw_EBI_SALES_STAGE.SalesStageGrp_Sort = 2) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0)',
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_EBI_SALES_STAGE.SalesStageGrp_Sort', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'],
  },
  {
    test: n => /\bCOVERAGE\b.*\bPIPE\b.*\bTARGET\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_QUOTA.QUOTA_REQ) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0)',
    relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_REQ', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'],
  },
  {
    test: n => /\b(COVERAGE|COV)\b.*X/i.test(n),
    formula: 'SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0)',
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'],
  },
  {
    test: n => /\bS5\+\b.*\bCOVERAGE\b.*\bLEFT TO GO\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1 AND vw_EBI_SALES_STAGE.SalesStageGrp_Sort = 2) / NULLIF(GREATEST(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL) - SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT = \'Won\'), 0), 0)',
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_EBI_SALES_STAGE.SalesStageGrp_Sort', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'],
  },

  // ── Targets ──
  {
    test: n => /\bPIPE TARGET\b.*\bSS4\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_QUOTA.QUOTA_REQ_SS5)',
    relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_REQ_SS5'],
  },
  {
    test: n => /\bPIPE TARGET\b.*\bSURVIVAL\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_QUOTA.QUOTA_REQ) survival-rate-adjusted',
    relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_REQ'],
  },
  {
    test: n => /\bPIPE TARGET\b.*\bTO GO\b/i.test(n),
    formula: "GREATEST(SUM(vw_TF_EBI_QUOTA.QUOTA_REQ) - SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1), 0)",
    relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_REQ', 'vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE'],
  },
  {
    test: n => /\bPIPE TARGET\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_QUOTA.QUOTA_REQ)',
    relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_REQ'],
  },
  {
    test: n => /\bBOOKINGS TARGET\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL)',
    relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_ACTUAL'],
  },
  {
    test: n => /\bGENERATION TARGET\b/i.test(n),
    formula: 'SUM(TF_EBI_GENERATION_TARGET.GENERATION_TARGET)',
    relatedColumns: ['TF_EBI_GENERATION_TARGET.GENERATION_TARGET'],
  },
  {
    test: n => /\bCQ LEFT TO GO\b/i.test(n),
    formula: "GREATEST(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL) - SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT = 'Won'), 0) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0",
    relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_ACTUAL', 'vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_EBI_Caldate.QTR_BKT_IND'],
  },
  {
    test: n => /\bCQ RUNNING TARGET\b/i.test(n),
    formula: 'SUM(vw_EBI_PACING_TARGET.PACING_LINEARITY) * SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL) WHERE vw_EBI_Caldate.QTR_BKT_IND = 0',
    relatedColumns: ['vw_EBI_PACING_TARGET.PACING_LINEARITY', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL', 'vw_EBI_Caldate.QTR_BKT_IND'],
  },
  {
    test: n => /\bOPP\b.*\bTARGET\b.*\$/i.test(n),
    formula: 'SUM(vw_TF_EBI_QUOTA.QUOTA_REQ)',
    relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_REQ'],
  },

  // ── Gross Creation ──
  {
    test: n => /\bGROSS CREAT(ED|ION)\b.*\$/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_EBI_Caldate.QUALIFICATION_QTR_BKT = 0 AND vw_EBI_SALES_STAGE.SALES_STAGE NOT IN ('S1','S2')",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_EBI_Caldate.QUALIFICATION_QTR_BKT', 'vw_EBI_SALES_STAGE.SALES_STAGE'],
  },
  {
    test: n => /\bGROSS CREAT(ED|ION)\b.*%/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE QUALIFICATION_QTR_BKT = 0 AND SALES_STAGE NOT IN ('S1','S2')) / NULLIF(TF_EBI_GENERATION_TARGET.GENERATION_TARGET, 0)",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_EBI_Caldate.QUALIFICATION_QTR_BKT', 'vw_EBI_SALES_STAGE.SALES_STAGE', 'TF_EBI_GENERATION_TARGET.GENERATION_TARGET'],
  },
  {
    test: n => /\bFULL QUARTER\b.*\bCREATION\b/i.test(n),
    formula: 'TF_EBI_GENERATION_TARGET.GENERATION_TARGET for the specified quarter',
    relatedColumns: ['TF_EBI_GENERATION_TARGET.GENERATION_TARGET', 'TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC'],
  },
  {
    test: n => /\bGPC\b.*Q\d/i.test(n),
    formula: 'TF_EBI_GENERATION_TARGET.GENERATION_TARGET for the specified quarter',
    relatedColumns: ['TF_EBI_GENERATION_TARGET.GENERATION_TARGET', 'TF_EBI_GENERATION_TARGET.CLOSED_QTR_DESC'],
  },

  // ── Net creation / Growth pipe ──
  {
    test: n => /\bNET\b.*\bCREATION\b/i.test(n) || /\bNET PIPE CREATION\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1) - SUM(vw_TF_EBI_P2S.OPPTY WHERE IS_BOQ = \'TRUE\' AND IN_PIPELINE = 1)',
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_TF_EBI_P2S.IS_BOQ'],
  },
  {
    test: n => /\bGROWTH PIPE\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1) - SUM(vw_TF_EBI_P2S.OPPTY WHERE IS_BOQ = \'TRUE\' AND IN_PIPELINE = 1)',
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_TF_EBI_P2S.IS_BOQ'],
  },
  {
    test: n => /\bNET\b.*\bCHANGE\b/i.test(n) || /\bNET MOVEMENT\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1) - SUM(vw_TF_EBI_P2S.OPPTY WHERE IS_BOQ = \'TRUE\' AND IN_PIPELINE = 1)',
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_TF_EBI_P2S.IS_BOQ'],
  },
  {
    test: n => /\bNET PUSHED\b/i.test(n),
    formula: "SUM(vw_TF_EBI_PIPE_WALK.GROSSASV) WHERE vw_TF_EBI_PIPE_WALK.WALK_GROUP = 'Pushed'",
    relatedColumns: ['vw_TF_EBI_PIPE_WALK.GROSSASV', 'vw_TF_EBI_PIPE_WALK.WALK_GROUP'],
  },

  // ── Pipeline / Oppty ──
  {
    test: n => /\bOPEN\b.*\bSTALLED\b.*\bPIPE\b/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE STALLED_BUT_INACTIVE = 'Stalled & Inactive' AND IN_PIPELINE = 1) / NULLIF(SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1), 0)",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.STALLED_BUT_INACTIVE', 'vw_TF_EBI_P2S.IN_PIPELINE'],
  },
  {
    test: n => /\bSTALLED\b.*\bINACTIVE\b/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.STALLED_BUT_INACTIVE = 'Stalled & Inactive'",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.STALLED_BUT_INACTIVE'],
  },
  {
    test: n => /\bIDLE OPPTY\b/i.test(n),
    formula: "COUNT(DISTINCT vw_TF_EBI_P2S.OPP_ID) WHERE vw_TF_EBI_P2S.DAYS_SINCE_NEXT_STEPS_MODIFIED_BAND = '30+ days' AND vw_TF_EBI_P2S.ADJ_COMMITMENT_GROUP = 'Open'",
    relatedColumns: ['vw_TF_EBI_P2S.OPP_ID', 'vw_TF_EBI_P2S.DAYS_SINCE_NEXT_STEPS_MODIFIED_BAND', 'vw_TF_EBI_P2S.ADJ_COMMITMENT_GROUP'],
  },
  {
    test: n => /\bOPEN OPPTY\b.*\bW\/W\b/i.test(n),
    formula: 'Current week vs prior week delta of pipeline oppty count/amount using vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE',
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.OPP_ID', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE'],
  },
  {
    test: n => /\bOPPTY\b.*\bW\/W\b/i.test(n),
    formula: 'Current week vs prior week delta using vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE',
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE'],
  },
  {
    test: n => /\bOPEN OPPTY\b.*\$/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT_GROUP = 'Open'",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT_GROUP'],
  },
  {
    test: n => /\bOPP\b.*#|OPP #/i.test(n),
    formula: 'COUNT(DISTINCT vw_TF_EBI_P2S.OPP_ID) WHERE vw_TF_EBI_P2S.IN_PIPELINE = 1',
    relatedColumns: ['vw_TF_EBI_P2S.OPP_ID', 'vw_TF_EBI_P2S.IN_PIPELINE'],
  },
  {
    test: n => /\bOPPTY\b.*\$/i.test(n),
    formula: 'SUM(vw_TF_EBI_P2S.OPPTY)',
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY'],
  },

  // ── Stage percentages ──
  {
    test: n => /\bS3\b.*%/i.test(n) && !/COV|>180/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE vw_EBI_SALES_STAGE.SalesStageGrp = 'S3') / NULLIF(SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1), 0)",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_EBI_SALES_STAGE.SalesStageGrp'],
  },
  {
    test: n => /\bS3>180D\b/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE vw_EBI_SALES_STAGE.SalesStageGrp = 'S3' AND vw_TF_EBI_P2S.STAGE_AGE > 180) / NULLIF(SUM(vw_TF_EBI_P2S.OPPTY WHERE vw_EBI_SALES_STAGE.SalesStageGrp = 'S3'), 0)",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.STAGE_AGE', 'vw_EBI_SALES_STAGE.SalesStageGrp'],
  },
  {
    test: n => /\bS4\b.*%/i.test(n) && !/COV|>180/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE vw_EBI_SALES_STAGE.SalesStageGrp = 'S4') / NULLIF(SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1), 0)",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_EBI_SALES_STAGE.SalesStageGrp'],
  },
  {
    test: n => /\bS4>180D\b/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE vw_EBI_SALES_STAGE.SalesStageGrp = 'S4' AND vw_TF_EBI_P2S.STAGE_AGE > 180) / NULLIF(SUM(vw_TF_EBI_P2S.OPPTY WHERE vw_EBI_SALES_STAGE.SalesStageGrp = 'S4'), 0)",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.STAGE_AGE', 'vw_EBI_SALES_STAGE.SalesStageGrp'],
  },
  {
    test: n => /\bS5\+\b.*%/i.test(n),
    formula: 'SUM(vw_TF_EBI_P2S.OPPTY WHERE vw_EBI_SALES_STAGE.SalesStageGrp_Sort = 2) / NULLIF(SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1), 0)',
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_EBI_SALES_STAGE.SalesStageGrp_Sort'],
  },
  {
    test: n => /\bS1\/S2\b.*#/i.test(n),
    formula: "COUNT(DISTINCT vw_TF_EBI_P2S.OPP_ID) WHERE vw_EBI_SALES_STAGE.SalesStageGrp = 'S1-S2'",
    relatedColumns: ['vw_TF_EBI_P2S.OPP_ID', 'vw_EBI_SALES_STAGE.SalesStageGrp'],
  },

  // ── Attainment / Pacing ──
  {
    test: n => /\bATTAINMENT\b/i.test(n) && !/RETENTION|RBOB|GROWTH|PIPELINE/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN ('Won','Forecast','Upside - Committed')) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0)",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'],
  },
  {
    test: n => /\bPIPELINE ATTAINMENT\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_REQ), 0)',
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_TF_EBI_QUOTA.QUOTA_REQ'],
  },
  {
    test: n => /\bRETENTION ATTAINMENT\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_Retention.ARR_Impact) / NULLIF(SUM(vw_TF_EBI_RENEWALS_TARGET.ATTRITION), 0)',
    relatedColumns: ['vw_TF_EBI_Retention.ARR_Impact', 'vw_TF_EBI_RENEWALS_TARGET.ATTRITION'],
  },
  {
    test: n => /\bPACING\b.*\$/i.test(n),
    formula: 'SUM(vw_EBI_PACING_TARGET.PACING_LINEARITY) * SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL)',
    relatedColumns: ['vw_EBI_PACING_TARGET.PACING_LINEARITY', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'],
  },

  // ── Forecast / Manager ──
  {
    test: n => /\bMANAGER FORECAST\b/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN ('Won','Forecast','Upside - Committed')) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0)",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'],
  },
  {
    test: n => /\bBOOKING VALUE\b/i.test(n) || /\bTM1\b.*\bBookings\b/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT = 'Won'",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'],
  },
  {
    test: n => /\bDEAL WIN RATE\b/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT = 'Won') / NULLIF(SUM(OPPTY WHERE ADJ_COMMITMENT = 'Won') + SUM(OPPTY WHERE ADJ_COMMITMENT = 'Lost'), 0)",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'],
  },
  {
    test: n => /\bAVG DEAL DURATION\b/i.test(n),
    formula: 'AVG(vw_TF_EBI_P2S.DEAL_AGE)',
    relatedColumns: ['vw_TF_EBI_P2S.DEAL_AGE'],
  },
  {
    test: n => /\bAVG DEAL SIZE\b/i.test(n),
    formula: 'AVG(vw_TF_EBI_P2S.OPPTY)',
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY'],
  },

  // ── Participation (REP / FLM / SLM / Team) ──
  {
    test: n => /\bREP PARTICIPATION\b/i.test(n),
    formula: "COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP WHERE attainment >= threshold AND IS_TRUE_REP = 1) / NULLIF(COUNT(DISTINCT REP_LDAP WHERE IS_TRUE_REP = 1), 0)",
    relatedColumns: ['vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP', 'vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP', 'vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'],
  },
  {
    test: n => /\bFLM PARTICIPATION\b/i.test(n),
    formula: "COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP WHERE attainment >= threshold AND IS_TRUE_FLM = 1) / NULLIF(COUNT(DISTINCT FLM_LDAP WHERE IS_TRUE_FLM = 1), 0)",
    relatedColumns: ['vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP', 'vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM', 'vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'],
  },
  {
    test: n => /\bSLM\b.*\bCOUNT\b/i.test(n) || /\bSLM\b.*%/i.test(n),
    formula: "COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.SLM_LDAP WHERE attainment >= threshold) / total",
    relatedColumns: ['vw_TD_EBI_REGION_RPT_MASKED.SLM_LDAP', 'vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'],
  },
  {
    test: n => /\bTEAM PARTICIPATION\b/i.test(n),
    formula: "COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP WHERE >50% AEs at threshold) / NULLIF(COUNT(DISTINCT FLM_LDAP WHERE IS_TRUE_FLM = 1), 0)",
    relatedColumns: ['vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP', 'vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM', 'vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP', 'vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL'],
  },
  {
    test: n => /\bREP PARTICIPATION TOTAL\b/i.test(n),
    formula: "COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP) WHERE IS_TRUE_REP = 1",
    relatedColumns: ['vw_TD_EBI_REGION_RPT_MASKED.REP_LDAP', 'vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_REP'],
  },
  {
    test: n => /\bTEAM PARTICIPATION TOTAL\b/i.test(n),
    formula: "COUNT(DISTINCT vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP) WHERE IS_TRUE_FLM = 1",
    relatedColumns: ['vw_TD_EBI_REGION_RPT_MASKED.FLM_LDAP', 'vw_TD_EBI_REGION_RPT_MASKED.IS_TRUE_FLM'],
  },

  // ── ARR / RBOB / Retention ──
  {
    test: n => /\bBOQ ARR\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_Retention.BOQ_ARR)',
    relatedColumns: ['vw_TF_EBI_Retention.BOQ_ARR'],
  },
  {
    test: n => /\bEOQ ARR\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_Retention.EOQ_ARR)',
    relatedColumns: ['vw_TF_EBI_Retention.EOQ_ARR'],
  },
  {
    test: n => /\bARR\b.*\$/i.test(n) && !/BOQ|EOQ|OPG|TWELVE/i.test(n),
    formula: 'SUM(vw_TF_EBI_Retention.BOQ_ARR)',
    relatedColumns: ['vw_TF_EBI_Retention.BOQ_ARR'],
  },
  {
    test: n => /\bOPG\b.*\bARR\b/i.test(n) || /\bTWELVE MONTH\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_ACC_OPG_ARR.ARR_AMOUNT)',
    relatedColumns: ['vw_TF_EBI_ACC_OPG_ARR.ARR_AMOUNT'],
  },
  {
    test: n => /\bRBOB\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_Retention.RBOB)',
    relatedColumns: ['vw_TF_EBI_Retention.RBOB'],
  },
  {
    test: n => /\bRISK\b.*\bUPSIDE\b.*\$/i.test(n),
    formula: 'SUM(vw_TF_EBI_Retention.RISK_UPSIDE_AMOUNT)',
    relatedColumns: ['vw_TF_EBI_Retention.RISK_UPSIDE_AMOUNT'],
  },
  {
    test: n => /\bRENEWAL\b.*#/i.test(n),
    formula: 'COUNT(DISTINCT vw_TF_EBI_Retention.Retention_MetaData_ID)',
    relatedColumns: ['vw_TF_EBI_Retention.Retention_MetaData_ID'],
  },
  {
    test: n => /\bRENEWALS?\b.*\bATTRITION\b.*\$/i.test(n) || /\bTOTAL ATTRITION\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_RENEWALS_TARGET.ATTRITION)',
    relatedColumns: ['vw_TF_EBI_RENEWALS_TARGET.ATTRITION'],
  },
  {
    test: n => /\bATTRITION\b/i.test(n) && !/TOTAL|RENEWALS|PLAN|PCT/i.test(n),
    formula: 'SUM(vw_TF_EBI_Retention.ARR_Impact)',
    relatedColumns: ['vw_TF_EBI_Retention.ARR_Impact'],
  },

  // ── Upside ──
  {
    test: n => /\bUPSIDE TARGETED\b/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT = 'Upside - Committed'",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'],
  },
  {
    test: n => /\bUPSIDE FORECAST PIPE\b/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT IN ('Forecast','Upside - Committed') AND IN_PIPELINE = 1",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_TF_EBI_P2S.IN_PIPELINE'],
  },
  {
    test: n => /\bUPSIDE\b.*\$/i.test(n) && !/RISK|FORECAST|TARGETED/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT = 'Upside - Committed'",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'],
  },
  {
    test: n => /\bUPSELL\b/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.UPSELL_TYPE = 'Renewal Upsell'",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.UPSELL_TYPE'],
  },

  // ── Gaps ──
  {
    test: n => /\bGAP\b.*\$/i.test(n) && /\bGROSS\b/i.test(n),
    formula: "TF_EBI_GENERATION_TARGET.GENERATION_TARGET - SUM(vw_TF_EBI_P2S.OPPTY WHERE SALES_STAGE NOT IN ('S1','S2'))",
    relatedColumns: ['TF_EBI_GENERATION_TARGET.GENERATION_TARGET', 'vw_TF_EBI_P2S.OPPTY', 'vw_EBI_SALES_STAGE.SALES_STAGE'],
  },
  {
    test: n => /\bGAP\b.*\$/i.test(n) && /\bPIPE\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_QUOTA.QUOTA_REQ) - SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1)',
    relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_REQ', 'vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE'],
  },
  {
    test: n => /\bGAP\b.*\$/i.test(n) && /\bGROWTH\b/i.test(n),
    formula: 'Net creation target - actual growth pipe',
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_TF_EBI_P2S.IS_BOQ', 'TF_EBI_GENERATION_TARGET.GENERATION_TARGET'],
  },
  {
    test: n => /\bGAP TO GO\b/i.test(n),
    formula: "SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL) - SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN ('Won','Forecast','Upside - Committed'))",
    relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_ACTUAL', 'vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'],
  },
  {
    test: n => /\bGAP\b.*\$/i.test(n),
    formula: "SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL) - SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN ('Won','Forecast','Upside - Committed'))",
    relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_ACTUAL', 'vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'],
  },

  // ── Prior year ──
  {
    test: n => /\bPY\b.*\$/i.test(n) && /\bQUOTA\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL) for prior year',
    relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_ACTUAL', 'vw_EBI_Caldate.FISCAL_YR'],
  },
  {
    test: n => /\bPY\b.*\$/i.test(n) && /\bWON\b/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT = 'Won') for prior year",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_EBI_Caldate.FISCAL_YR'],
  },
  {
    test: n => /\bPY\b.*%/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN ('Won','Forecast','Upside - Committed')) / NULLIF(SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL), 0) for prior year",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL', 'vw_EBI_Caldate.FISCAL_YR'],
  },

  // ── Misc ──
  {
    test: n => /\bTRAILING BOOKED\b/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.ADJ_COMMITMENT = 'Won' (rolling window)",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT'],
  },
  {
    test: n => /\bPREV WEEK PIPE\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_P2S.OPPTY) WHERE IN_PIPELINE = 1 AND vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE = -1',
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE'],
  },
  {
    test: n => /\bMATURE PIPE NET CHANGE\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_P2S.OPPTY WHERE IN_PIPELINE = 1 AND vw_EBI_SALES_STAGE.SalesStageGrp_Sort = 2) - BOQ equivalent',
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.IN_PIPELINE', 'vw_EBI_SALES_STAGE.SalesStageGrp_Sort', 'vw_TF_EBI_P2S.IS_BOQ'],
  },
  {
    test: n => /\bACTIVE & UPDATED\b/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY) WHERE vw_TF_EBI_P2S.STALLED_BUT_INACTIVE = 'Active'",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.STALLED_BUT_INACTIVE'],
  },
  {
    test: n => /\bNET ASV\b/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN ('Won','Forecast','Upside - Committed')) - ABS(SUM(vw_TF_EBI_Retention.ARR_Impact))",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_TF_EBI_Retention.ARR_Impact'],
  },
  {
    test: n => /\bLTG\b.*#/i.test(n),
    formula: "COUNT(DISTINCT vw_TF_EBI_Retention.Retention_MetaData_ID) WHERE vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY = 'Left To Go'",
    relatedColumns: ['vw_TF_EBI_Retention.Retention_MetaData_ID', 'vw_TD_EBI_Retention_MetaData.OUTLOOK_CATEGORY'],
  },
  {
    test: n => /\bIN QTR GC TARGET\b/i.test(n),
    formula: 'TF_EBI_GENERATION_TARGET.GENERATION_TARGET for current qualification quarter',
    relatedColumns: ['TF_EBI_GENERATION_TARGET.GENERATION_TARGET'],
  },
  {
    test: n => /\bBOQ WALK VALUE\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_PIPE_WALK.BOQ_GROSSASV)',
    relatedColumns: ['vw_TF_EBI_PIPE_WALK.BOQ_GROSSASV'],
  },
  {
    test: n => /\bCURR WALK VALUE\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_PIPE_WALK.GROSSASV) at current snapshot',
    relatedColumns: ['vw_TF_EBI_PIPE_WALK.GROSSASV'],
  },
  {
    test: n => /\bPREV WALK VALUE\b/i.test(n),
    formula: 'SUM(vw_TF_EBI_PIPE_WALK.GROSSASV) at prior week snapshot',
    relatedColumns: ['vw_TF_EBI_PIPE_WALK.GROSSASV', 'vw_EBI_Caldate.WEEK_SORT_ORDER_REVERSE'],
  },

  // ── CY Projection ──
  {
    test: n => /\bCY\b.*\bPROJECTION\b/i.test(n) || /\bCY\b.*\bPLAN\b/i.test(n),
    formula: "SUM(vw_TF_EBI_P2S.OPPTY WHERE ADJ_COMMITMENT IN ('Won','Forecast','Upside - Committed')) across PQ+CQ+FQ / SUM(vw_TF_EBI_QUOTA.QUOTA_ACTUAL)",
    relatedColumns: ['vw_TF_EBI_P2S.OPPTY', 'vw_TF_EBI_P2S.ADJ_COMMITMENT', 'vw_TF_EBI_QUOTA.QUOTA_ACTUAL', 'vw_EBI_Caldate.QTR_BKT_IND'],
  },
  {
    test: n => /\bTOTAL CREDIT TARGET\b/i.test(n),
    formula: PBIX_ONLY_FORMULA, relatedColumns: [], pbixOnly: true,
  },
];

function inferFromPattern(kpiName) {
  for (const rule of INFERENCE_RULES) {
    if (rule.test(kpiName)) {
      const formula = typeof rule.formula === 'function' ? rule.formula(kpiName) : rule.formula;
      return {
        formula,
        relatedColumns: [...rule.relatedColumns],
        pbixOnly: rule.pbixOnly || false,
      };
    }
  }
  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/refactor-kpi-glossary.js
git commit -m "feat(kpi): add pattern inference rules for Pass 3 (EXTERNALMEASURE mapping)"
```

---

### Task 4: Rewrite main() with 4-Pass Pipeline

**Files:**
- Modify: `scripts/refactor-kpi-glossary.js`

Replace the existing `main()` function (lines 462-548) with the full 4-pass orchestration.

- [ ] **Step 1: Replace the `main()` function**

Delete everything from line 462 (`function main()`) through line 548 (`main();`) and replace with:

```javascript
// ─── MAIN — 4-Pass Pipeline ────────────────────────────────────────
function main() {
  const raw = fs.readFileSync(GLOSSARY_PATH, 'utf-8');
  const glossary = JSON.parse(raw);
  const kpis = glossary.kpis;
  console.log(`Read ${kpis.length} KPIs from ${GLOSSARY_PATH}\n`);

  // Track stats
  const stats = { excelMerged: 0, regexExtracted: 0, inferred: 0, pbixOnly: 0, mapped: 0, approximated: 0 };

  // ── Pass 1: Excel Merge ───────────────────────────────────────────
  console.log('Pass 1: Excel Merge...');
  const excelMap = loadExcelMappings();

  for (const kpi of kpis) {
    // Preserve original formula as formulaPbix (only if not already set)
    if (!kpi.formulaPbix) {
      kpi.formulaPbix = kpi.formula;
    }

    // Priority 1: FORMULA_OVERRIDES (hand-verified, highest quality)
    if (FORMULA_OVERRIDES[kpi.id]) {
      kpi.formula = FORMULA_OVERRIDES[kpi.id];
    }
    // Priority 2: Excel DB_Formula (if current formula is still EXTERNALMEASURE)
    else if (kpi.formula && kpi.formula.includes('EXTERNALMEASURE') && excelMap.has(kpi.id)) {
      const excel = excelMap.get(kpi.id);
      kpi.formula = excel.formula;
      if (excel.relatedColumns.length > 0) {
        kpi.relatedColumns = excel.relatedColumns;
      }
      stats.excelMerged++;
    }

    // Map relatedColumns through COL_MAP + RELATED_COLS_OVERRIDES
    kpi.relatedColumns = mapRelatedColumns(kpi);

    // Add notes if applicable
    if (NOTES[kpi.id]) {
      kpi.notes = NOTES[kpi.id];
    }
  }
  console.log(`  Excel merged: ${stats.excelMerged}\n`);

  // ── Pass 2: Regex Extract relatedColumns ──────────────────────────
  console.log('Pass 2: Regex Extract relatedColumns...');
  for (const kpi of kpis) {
    if ((!kpi.relatedColumns || kpi.relatedColumns.length === 0) &&
        kpi.formula && !kpi.formula.includes('EXTERNALMEASURE')) {
      const extracted = extractRelatedColumnsFromFormula(kpi.formula);
      if (extracted.length > 0) {
        kpi.relatedColumns = extracted;
        stats.regexExtracted++;
      }
    }
  }
  console.log(`  Regex extracted: ${stats.regexExtracted}\n`);

  // ── Pass 3: Pattern-Based Inference ───────────────────────────────
  console.log('Pass 3: Pattern-Based Inference...');
  for (const kpi of kpis) {
    if (kpi.formula && kpi.formula.includes('EXTERNALMEASURE')) {
      const result = inferFromPattern(kpi.name);
      if (result) {
        kpi.formula = result.formula;
        kpi.relatedColumns = result.relatedColumns;
        if (result.pbixOnly) {
          kpi.pbix_only = true;
          kpi.confidence = 'pbix_only';
          stats.pbixOnly++;
        } else {
          kpi.confidence = 'inferred';
          stats.inferred++;
        }
      }
    }
  }
  console.log(`  Inferred: ${stats.inferred}`);
  console.log(`  PBIX-only (pattern): ${stats.pbixOnly}\n`);

  // ── Pass 4: Mark Remaining Unmappable ─────────────────────────────
  console.log('Pass 4: Mark Remaining Unmappable...');
  let pass4count = 0;
  for (const kpi of kpis) {
    if (kpi.formula && kpi.formula.includes('EXTERNALMEASURE')) {
      kpi.formula = PBIX_ONLY_FORMULA;
      kpi.pbix_only = true;
      kpi.confidence = 'pbix_only';
      kpi.relatedColumns = [];
      pass4count++;
    }
  }
  stats.pbixOnly += pass4count;
  console.log(`  Remaining marked pbix_only: ${pass4count}\n`);

  // ── Finalize: Set confidence + relatedTables on all entries ───────
  console.log('Finalizing...');
  for (const kpi of kpis) {
    // Set confidence if not already set
    if (!kpi.confidence) {
      if (APPROXIMATED_IDS.has(kpi.id)) {
        kpi.confidence = 'approximated';
        stats.approximated++;
      } else {
        kpi.confidence = 'mapped';
        stats.mapped++;
      }
    }

    // Derive relatedTables from relatedColumns
    kpi.relatedTables = deriveRelatedTables(kpi.relatedColumns || []);

    // Ensure pbix_only is not set for non-pbix entries
    if (!kpi.pbix_only) {
      delete kpi.pbix_only;
    }
  }

  // ── Write updated JSON ────────────────────────────────────────────
  const output = JSON.stringify(glossary, null, 2);
  fs.writeFileSync(GLOSSARY_PATH, output, 'utf-8');
  console.log(`Wrote updated glossary to ${GLOSSARY_PATH}`);

  // ── Write Excel log ───────────────────────────────────────────────
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }

  const logRows = kpis.map(kpi => ({
    KPI_ID: kpi.id,
    KPI_Name: kpi.name,
    Section: kpi.section,
    PBIX_Formula: kpi.formulaPbix || '',
    DB_Formula: kpi.formula,
    Related_Columns_DB: (kpi.relatedColumns || []).join(', '),
    Related_Tables: (kpi.relatedTables || []).join(', '),
    Status: kpi.confidence || 'mapped',
    PBIX_Only: kpi.pbix_only ? 'YES' : '',
    Discrepancy_Notes: kpi.notes || '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(logRows);
  ws['!cols'] = [
    { wch: 35 },  // KPI_ID
    { wch: 45 },  // KPI_Name
    { wch: 28 },  // Section
    { wch: 80 },  // PBIX_Formula
    { wch: 100 }, // DB_Formula
    { wch: 80 },  // Related_Columns_DB
    { wch: 50 },  // Related_Tables
    { wch: 15 },  // Status
    { wch: 10 },  // PBIX_Only
    { wch: 80 },  // Discrepancy_Notes
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'KPI Mapping Log');
  XLSX.writeFile(wb, EXCEL_PATH);
  console.log(`Wrote Excel log to ${EXCEL_PATH}`);

  // ── Summary ───────────────────────────────────────────────────────
  const total = kpis.length;
  const byConfidence = {};
  for (const kpi of kpis) {
    byConfidence[kpi.confidence] = (byConfidence[kpi.confidence] || 0) + 1;
  }
  const withRelCols = kpis.filter(k => k.relatedColumns && k.relatedColumns.length > 0).length;
  const extRemaining = kpis.filter(k => k.formula && k.formula.includes('EXTERNALMEASURE')).length;

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Summary: ${total} KPIs total`);
  for (const [conf, count] of Object.entries(byConfidence).sort()) {
    console.log(`  ${conf.padEnd(15)} ${count}`);
  }
  console.log(`  with relatedColumns: ${withRelCols}`);
  console.log(`  EXTERNALMEASURE remaining: ${extRemaining}`);
  console.log(`${'='.repeat(50)}`);
}

main();
```

- [ ] **Step 2: Run the script and verify output**

Run: `cd "C:\Users\hrishikeshd\Desktop\Auto_Agents_Claude" && node scripts/refactor-kpi-glossary.js`
Expected: Summary shows 0 EXTERNALMEASURE remaining, counts distributed across mapped/inferred/approximated/pbix_only

- [ ] **Step 3: Verify the glossary JSON has no EXTERNALMEASURE formulas left**

Run: `node -e "const d=require('./server/context/knowledge/kpi-glossary.json'); const ext=d.kpis.filter(k=>k.formula&&k.formula.includes('EXTERNALMEASURE')); console.log('EXTERNALMEASURE remaining:', ext.length); const noRelCols=d.kpis.filter(k=>!k.relatedColumns||k.relatedColumns.length===0); console.log('Empty relatedColumns:', noRelCols.length, '(should be ~pbix_only count)');"`
Expected: `EXTERNALMEASURE remaining: 0`, empty relatedColumns count matches pbix_only count

- [ ] **Step 4: Spot-check a few inferred entries**

Run: `node -e "const d=require('./server/context/knowledge/kpi-glossary.json'); const samples=['won_dollar_default','arr_dollar','coverage_boq_mature_pipe_bookings_target_x','tier_2_sub_gnarr_dollar','account_activity_count']; for(const id of samples){const k=d.kpis.find(k=>k.id===id); if(k)console.log(JSON.stringify({id:k.id,formula:k.formula,relatedColumns:k.relatedColumns,confidence:k.confidence,pbix_only:k.pbix_only},null,2));else console.log(id+': NOT FOUND');}"`
Expected: Each shows appropriate formula, relatedColumns, and confidence level

- [ ] **Step 5: Commit**

```bash
git add scripts/refactor-kpi-glossary.js server/context/knowledge/kpi-glossary.json docs/kpi-glossary-mapping-log.xlsx
git commit -m "feat(kpi): complete 4-pass DB formula backfill — 0 EXTERNALMEASURE remaining

Pass 1: Excel merge for entries with existing DB mappings
Pass 2: Regex extraction of table.column from formula text
Pass 3: Pattern inference for 298 EXTERNALMEASURE entries
Pass 4: Mark remaining as pbix_only

Adds confidence, relatedTables, pbix_only fields to all 940 KPIs."
```

---

### Task 5: Verify kpiFetcher Compatibility

**Files:**
- Read-only: `server/vectordb/kpiFetcher.js`

- [ ] **Step 1: Verify kpiFetcher handles new fields without errors**

Run: `node -e "const {buildKpiStoreFromData} = (() => { const m = require('./server/vectordb/kpiFetcher.js'); return m; })(); console.log('kpiFetcher loaded OK');" 2>&1 || echo "Check kpiFetcher"`

The kpiFetcher already reads `relatedTables` (line 62) and `relatedColumns` (line 61) in its keyword index builder. New fields (`confidence`, `pbix_only`) are ignored by it — they just add indexable keywords which is fine.

- [ ] **Step 2: Verify search returns new fields**

Run: `node -e "(async()=>{const {loadKpiGlossaryAsync,searchKpis}=require('./server/vectordb/kpiFetcher.js'); await loadKpiGlossaryAsync(); const r=searchKpis('gross creation',2); console.log(JSON.stringify(r,null,2));})()" `
Expected: Results include formula with DB table.column references, populated relatedColumns and relatedTables

No code changes needed to kpiFetcher — just verification.

---

### Task 6: Add formatKpiForOutput pbix_only + confidence (Optional Enhancement)

**Files:**
- Modify: `server/vectordb/kpiFetcher.js:146-158`

Surface the new `confidence` and `pbix_only` fields in search results so the LLM prompt sees them.

- [ ] **Step 1: Update formatKpiForOutput to include new fields**

In `server/vectordb/kpiFetcher.js`, modify `formatKpiForOutput`:

```javascript
function formatKpiForOutput(kpi) {
  const out = {
    id: kpi.id,
    name: kpi.name,
    definition: kpi.definition,
    formula: kpi.formula,
    components: kpi.components || {},
    relatedTables: kpi.relatedTables || [],
    relatedColumns: kpi.relatedColumns || [],
    personas: kpi.personas || [],
    timeVariants: kpi.timeVariants || [],
  };
  if (kpi.confidence) out.confidence = kpi.confidence;
  if (kpi.pbix_only) out.pbix_only = true;
  if (kpi.notes) out.notes = kpi.notes;
  return out;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/vectordb/kpiFetcher.js
git commit -m "feat(kpi): surface confidence/pbix_only in kpiFetcher search results"
```
