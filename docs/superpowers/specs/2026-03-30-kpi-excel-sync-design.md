# KPI Excel Sync Design

**Date:** 2026-03-30
**Status:** Approved
**Context:** PBIX-KPI Integration (branch: `feature/pbix-kpi-integration`)

## Problem Statement

The KPI glossary JSON (`server/context/knowledge/kpi-glossary.json`) has been fully converted to MSSQL format with all 940 KPIs now using table.column references in the `formula` field. However, the Excel mapping log (`docs/kpi-glossary-mapping-log.xlsx`) is out of sync: 470 rows (50%) still contain DAX formulas in the `DB_Formula` column instead of MSSQL formulas.

**Timestamps confirm the gap:**
- Excel file: Mar 27 22:50 (older)
- JSON file: Mar 28 00:27 (newer, fully converted)

## Solution Overview

Create a standalone comparison script (`scripts/compareKpiExcel.js`) that generates a three-tab Excel workbook comparing the out-of-sync Excel data against the current JSON, with a visual diff highlighting what changed.

**Key Design Principle:** Read-only on source files. The script doesn't modify the JSON or the original Excel — it creates a new comparison workbook.

**Output:** `docs/kpi-glossary-comparison.xlsx` (new file)

## Architecture

### High-Level Flow

```
Read existing Excel → Read current JSON → Generate comparison data → Write 3-tab Excel
     (Before)              (After)           (Detect diffs)        (Before/After/Diffs)
```

### Script Structure

**Script Name:** `scripts/compareKpiExcel.js`

**Main Functions:**

1. **`loadBeforeData()`**
   - Reads `docs/kpi-glossary-mapping-log.xlsx`
   - Converts to JSON array (940 rows)
   - Returns the "Before" dataset

2. **`loadAfterData()`**
   - Reads `server/context/knowledge/kpi-glossary.json`
   - Transforms to the same Excel row format used by `refactor-kpi-glossary.js`:
     ```js
     {
       KPI_ID: kpi.id,
       KPI_Name: kpi.name,
       Section: kpi.section,
       PBIX_Formula: kpi.formulaPbix || '',
       DB_Formula: kpi.formula,        // ← MSSQL format from JSON
       Related_Columns_DB: (kpi.relatedColumns || []).join(', '),
       Related_Tables: (kpi.relatedTables || []).join(', '),
       Status: kpi.confidence || 'mapped',
       PBIX_Only: kpi.pbix_only ? 'YES' : '',
       Discrepancy_Notes: kpi.notes || ''
     }
     ```
   - Returns the "After" dataset

3. **`detectDifferences(before, after)`**
   - Compares the two datasets row-by-row by `KPI_ID`
   - For each KPI, checks if `DB_Formula` changed
   - Returns an array of diff objects:
     ```js
     {
       KPI_ID,
       KPI_Name,
       Section,
       DB_Formula_Before,
       DB_Formula_After,
       Changed: 'YES' or '',
       Change_Type: 'DAX→MSSQL' | 'MSSQL→MSSQL' | 'No Change'
     }
     ```

4. **`writeComparisonExcel(before, after, diffs)`**
   - Creates a new workbook with three sheets
   - Applies column widths for readability
   - Writes to `docs/kpi-glossary-comparison.xlsx`

**Script Entry Point:**
```js
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

async function main() {
  console.log('Loading Before data from docs/kpi-glossary-mapping-log.xlsx...');
  const before = loadBeforeData();
  console.log(`  ✓ Loaded ${before.length} rows\n`);

  console.log('Loading After data from server/context/knowledge/kpi-glossary.json...');
  const after = loadAfterData();
  console.log(`  ✓ Loaded ${after.length} KPIs\n`);

  console.log('Detecting differences...');
  const diffs = detectDifferences(before, after);
  const changedCount = diffs.filter(d => d.Changed === 'YES').length;
  console.log(`  ✓ Found ${changedCount} changed formulas\n`);

  console.log('Writing comparison Excel...');
  writeComparisonExcel(before, after, diffs);
  console.log('✓ Comparison written to docs/kpi-glossary-comparison.xlsx');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
```

## Differences Detection Algorithm

### Core Logic

```js
function detectDifferences(before, after) {
  // Create lookup maps by KPI_ID
  const beforeMap = new Map(before.map(row => [row.KPI_ID, row]));
  const afterMap = new Map(after.map(row => [row.KPI_ID, row]));

  const diffs = [];

  for (const kpiId of beforeMap.keys()) {
    const beforeRow = beforeMap.get(kpiId);
    const afterRow = afterMap.get(kpiId);

    const dbFormulaBefore = beforeRow.DB_Formula || '';
    const dbFormulaAfter = afterRow?.DB_Formula || '';

    const changed = dbFormulaBefore !== dbFormulaAfter;

    diffs.push({
      KPI_ID: kpiId,
      KPI_Name: beforeRow.KPI_Name,
      Section: beforeRow.Section,
      DB_Formula_Before: dbFormulaBefore,
      DB_Formula_After: dbFormulaAfter,
      Changed: changed ? 'YES' : '',
      Change_Type: getChangeType(dbFormulaBefore, dbFormulaAfter, changed)
    });
  }

  // Sort: Changed first, then by Section, then by KPI_Name
  diffs.sort((a, b) => {
    if (a.Changed !== b.Changed) return b.Changed.localeCompare(a.Changed); // YES first
    if (a.Section !== b.Section) return a.Section.localeCompare(b.Section);
    return a.KPI_Name.localeCompare(b.KPI_Name);
  });

  return diffs;
}

function getChangeType(before, after, changed) {
  if (!changed) return 'No Change';

  const beforeIsDax = isDaxFormula(before);
  const afterIsDax = isDaxFormula(after);

  if (beforeIsDax && !afterIsDax) return 'DAX→MSSQL';
  if (!beforeIsDax && !afterIsDax) return 'MSSQL→MSSQL';
  return 'Other';
}

function isDaxFormula(formula) {
  return /CALCULATE|VAR |FILTER\(|REMOVEFILTERS|DIVIDE\(|IFERROR\(/i.test(formula);
}
```

### Change Type Classification

- **`DAX→MSSQL`** — Before has DAX keywords (`CALCULATE`, `VAR`, `FILTER`, etc.), After has MSSQL format
- **`MSSQL→MSSQL`** — Both are MSSQL, but formula logic changed (rare edge case)
- **`No Change`** — Formulas are identical

### Sort Order

The Differences tab is sorted to surface changes first:
1. `Changed === 'YES'` rows appear at the top
2. Within each group, sort by `Section`
3. Within each section, sort by `KPI_Name`

This puts all 470 changed formulas at the top for easy review.

## Excel Output Format

**Output File:** `docs/kpi-glossary-comparison.xlsx`

### Tab 1: "Before" (Original Excel Data)

- **Source:** `docs/kpi-glossary-mapping-log.xlsx`
- **Rows:** All 940 rows from the existing Excel file
- **Columns:** `KPI_ID`, `KPI_Name`, `Section`, `PBIX_Formula`, `DB_Formula`, `Related_Columns_DB`, `Related_Tables`, `Status`, `PBIX_Only`, `Discrepancy_Notes`
- **Column Widths:** 35, 45, 28, 80, 100, 80, 50, 15, 10, 80 (matches original)
- **Content:** Shows the state with 470 DAX formulas in `DB_Formula`

### Tab 2: "After" (Regenerated from JSON)

- **Source:** `server/context/knowledge/kpi-glossary.json`
- **Rows:** All 940 KPIs transformed to Excel row format
- **Columns:** Same as "Before" tab
- **Column Widths:** Same as "Before" tab
- **Content:** All `DB_Formula` values in MSSQL format (reflects fully converted state)

### Tab 3: "Differences"

- **Purpose:** Focused comparison view highlighting what changed
- **Rows:** All 940 KPIs with before/after comparison
- **Columns:**
  - `KPI_ID` (35 chars)
  - `KPI_Name` (45 chars)
  - `Section` (28 chars)
  - `DB_Formula_Before` (100 chars)
  - `DB_Formula_After` (100 chars)
  - `Changed` (10 chars) — "YES" or ""
  - `Change_Type` (20 chars) — "DAX→MSSQL" | "MSSQL→MSSQL" | "No Change"
- **Sort Order:** Changed rows first, then by Section, then by KPI_Name
- **Expected Results:** ~470 rows with `Changed = 'YES'` (DAX→MSSQL conversions)

**Visual Formatting:** All tabs use default Excel formatting. No conditional formatting or colors (keeps it simple and fast).

## Error Handling

### File Validation

- Check that `docs/kpi-glossary-mapping-log.xlsx` exists before reading
  - If missing: print clear error message and exit
- Check that `server/context/knowledge/kpi-glossary.json` exists before reading
  - If missing: print clear error message and exit

### Data Validation

- Verify both datasets have the same KPI_IDs (all 940 should match)
- If a KPI exists in Before but not After (or vice versa):
  - Include it in the Differences tab with a note in `Change_Type`: "Missing in Before" or "Missing in After"
- Handle missing/null `DB_Formula` values gracefully (treat as empty string)

### Output File Handling

- If `docs/kpi-glossary-comparison.xlsx` already exists, overwrite it
  - This is a comparison artifact, not primary data, so no backup needed

### Script Output

```bash
$ node scripts/compareKpiExcel.js

Loading Before data from docs/kpi-glossary-mapping-log.xlsx...
  ✓ Loaded 940 rows

Loading After data from server/context/knowledge/kpi-glossary.json...
  ✓ Loaded 940 KPIs

Detecting differences...
  ✓ Found 470 changed formulas (DAX→MSSQL)
  ✓ Found 0 MSSQL refinements
  ✓ Found 470 unchanged formulas

Writing comparison Excel...
  ✓ Tab 1: Before (940 rows)
  ✓ Tab 2: After (940 rows)
  ✓ Tab 3: Differences (940 rows, 470 changed)

✓ Comparison written to docs/kpi-glossary-comparison.xlsx
```

## Dependencies

- **`xlsx` package** — Already in `package.json`, used for Excel read/write
- **Node.js built-ins** — `fs`, `path` modules
- **No new dependencies required**

## Testing Approach

### Manual Verification

1. Run the script: `node scripts/compareKpiExcel.js`
2. Open `docs/kpi-glossary-comparison.xlsx`
3. Verify "Before" tab matches the original Excel (spot-check 5-10 rows)
4. Verify "After" tab has MSSQL formulas (spot-check 5-10 rows)
5. Verify "Differences" tab shows ~470 changed rows at the top
6. Spot-check 5-10 changed rows to confirm DAX→MSSQL conversion

### Edge Case Testing

- Run script twice to verify it overwrites the output file cleanly
- Verify script handles empty `DB_Formula` values (if any exist)
- Verify script exits gracefully if input files are missing

## Future Considerations

- After reviewing the comparison Excel, the next step is to regenerate the actual mapping log:
  ```bash
  node scripts/refactor-kpi-glossary.js
  ```
  This will overwrite `docs/kpi-glossary-mapping-log.xlsx` with the fully converted data.

- The comparison script is reusable for future syncs if the JSON and Excel diverge again.

## Success Criteria

- ✅ Script runs without errors
- ✅ Output Excel has three tabs: "Before", "After", "Differences"
- ✅ "Before" tab matches original Excel data (940 rows, 470 with DAX)
- ✅ "After" tab has all MSSQL formulas (940 rows, 0 with DAX)
- ✅ "Differences" tab correctly identifies ~470 changed formulas
- ✅ Changed rows appear at the top of the "Differences" tab
- ✅ No modification to source files (JSON or original Excel)
