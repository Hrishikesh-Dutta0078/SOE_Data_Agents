# KPI Excel Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a standalone comparison script that generates a three-tab Excel workbook comparing out-of-sync KPI Excel data against current JSON with visual diff.

**Architecture:** Single script (`scripts/compareKpiExcel.js`) with 4 main functions: load Before data from Excel, load After data from JSON, detect differences, write 3-tab comparison Excel. Read-only on source files.

**Tech Stack:** Node.js, `xlsx` package (already in dependencies), `fs` and `path` built-ins

---

## File Structure

**Create:**
- `scripts/compareKpiExcel.js` — Standalone comparison script with all logic

**Read (inputs):**
- `docs/kpi-glossary-mapping-log.xlsx` — Before data (940 rows, 470 with DAX)
- `server/context/knowledge/kpi-glossary.json` — After data (940 KPIs, fully converted)

**Write (output):**
- `docs/kpi-glossary-comparison.xlsx` — Three-tab comparison workbook

---

## Task 1: Script skeleton and file validation

**Files:**
- Create: `scripts/compareKpiExcel.js`

- [ ] **Step 1: Create script file with imports and path constants**

```javascript
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// File paths
const EXCEL_PATH = path.resolve(__dirname, '../docs/kpi-glossary-mapping-log.xlsx');
const JSON_PATH = path.resolve(__dirname, '../server/context/knowledge/kpi-glossary.json');
const OUTPUT_PATH = path.resolve(__dirname, '../docs/kpi-glossary-comparison.xlsx');

```

- [ ] **Step 2: Add file validation function**

```javascript
function validateInputFiles() {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`Excel file not found: ${EXCEL_PATH}`);
  }
  if (!fs.existsSync(JSON_PATH)) {
    throw new Error(`JSON file not found: ${JSON_PATH}`);
  }
}
```

- [ ] **Step 3: Add main function skeleton**

```javascript
async function main() {
  try {
    validateInputFiles();
    console.log('✓ Input files validated\n');

    // Functions will be added in subsequent tasks
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
```

- [ ] **Step 4: Test file validation**

Run: `node scripts/compareKpiExcel.js`

Expected output:
```
✓ Input files validated
```

- [ ] **Step 5: Commit**

```bash
git add scripts/compareKpiExcel.js
git commit -m "feat(kpi): add skeleton for Excel comparison script with file validation"
```

---

## Task 2: Load Before data from Excel

**Files:**
- Modify: `scripts/compareKpiExcel.js`

- [ ] **Step 1: Add loadBeforeData function**

```javascript
function loadBeforeData() {
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  return data;
}
```

- [ ] **Step 2: Integrate into main function**

Update the main function to add:

```javascript
async function main() {
  try {
    validateInputFiles();
    console.log('✓ Input files validated\n');

    console.log('Loading Before data from docs/kpi-glossary-mapping-log.xlsx...');
    const before = loadBeforeData();
    console.log(`  ✓ Loaded ${before.length} rows\n`);

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
```

- [ ] **Step 3: Test Before data loading**

Run: `node scripts/compareKpiExcel.js`

Expected output:
```
✓ Input files validated

Loading Before data from docs/kpi-glossary-mapping-log.xlsx...
  ✓ Loaded 940 rows
```

- [ ] **Step 4: Commit**

```bash
git add scripts/compareKpiExcel.js
git commit -m "feat(kpi): add loadBeforeData to read existing Excel"
```

---

## Task 3: Load After data from JSON

**Files:**
- Modify: `scripts/compareKpiExcel.js`

- [ ] **Step 1: Add loadAfterData function**

```javascript
function loadAfterData() {
  const rawData = fs.readFileSync(JSON_PATH, 'utf-8');
  const glossary = JSON.parse(rawData);
  const kpis = glossary.kpis;

  // Transform to Excel row format
  const data = kpis.map(kpi => ({
    KPI_ID: kpi.id,
    KPI_Name: kpi.name,
    Section: kpi.section,
    PBIX_Formula: kpi.formulaPbix || '',
    DB_Formula: kpi.formula,
    Related_Columns_DB: (kpi.relatedColumns || []).join(', '),
    Related_Tables: (kpi.relatedTables || []).join(', '),
    Status: kpi.confidence || 'mapped',
    PBIX_Only: kpi.pbix_only ? 'YES' : '',
    Discrepancy_Notes: kpi.notes || ''
  }));

  return data;
}
```

- [ ] **Step 2: Integrate into main function**

Update the main function to add:

```javascript
    console.log('Loading After data from server/context/knowledge/kpi-glossary.json...');
    const after = loadAfterData();
    console.log(`  ✓ Loaded ${after.length} KPIs\n`);
```

(Add this after the `before` loading section)

- [ ] **Step 3: Test After data loading**

Run: `node scripts/compareKpiExcel.js`

Expected output:
```
✓ Input files validated

Loading Before data from docs/kpi-glossary-mapping-log.xlsx...
  ✓ Loaded 940 rows

Loading After data from server/context/knowledge/kpi-glossary.json...
  ✓ Loaded 940 KPIs
```

- [ ] **Step 4: Commit**

```bash
git add scripts/compareKpiExcel.js
git commit -m "feat(kpi): add loadAfterData to transform JSON to Excel format"
```

---

## Task 4: DAX detection and change type classification

**Files:**
- Modify: `scripts/compareKpiExcel.js`

- [ ] **Step 1: Add isDaxFormula helper**

```javascript
function isDaxFormula(formula) {
  if (!formula) return false;
  return /CALCULATE|VAR |FILTER\(|REMOVEFILTERS|DIVIDE\(|IFERROR\(/i.test(formula);
}
```

- [ ] **Step 2: Add getChangeType helper**

```javascript
function getChangeType(before, after, changed) {
  if (!changed) return 'No Change';

  const beforeIsDax = isDaxFormula(before);
  const afterIsDax = isDaxFormula(after);

  if (beforeIsDax && !afterIsDax) return 'DAX→MSSQL';
  if (!beforeIsDax && !afterIsDax) return 'MSSQL→MSSQL';
  return 'Other';
}
```

- [ ] **Step 3: Test DAX detection manually**

Add temporary test code at the end of main function:

```javascript
    // Temporary test
    console.log('Testing DAX detection...');
    console.log('  CALCULATE test:', isDaxFormula('CALCULATE([ARR IMPACT])'));
    console.log('  MSSQL test:', isDaxFormula('SUM(vw_TF_EBI_P2S.OPPTY)'));
    console.log('  Change type (DAX→MSSQL):', getChangeType('VAR x = 1', 'SUM(col)', true));
```

Run: `node scripts/compareKpiExcel.js`

Expected output:
```
Testing DAX detection...
  CALCULATE test: true
  MSSQL test: false
  Change type (DAX→MSSQL): DAX→MSSQL
```

- [ ] **Step 4: Remove temporary test code**

Delete the temporary test code added in Step 3.

- [ ] **Step 5: Commit**

```bash
git add scripts/compareKpiExcel.js
git commit -m "feat(kpi): add DAX detection and change type classification"
```

---

## Task 5: Detect differences between Before and After

**Files:**
- Modify: `scripts/compareKpiExcel.js`

- [ ] **Step 1: Add detectDifferences function**

```javascript
function detectDifferences(before, after) {
  // Create lookup maps by KPI_ID
  const beforeMap = new Map(before.map(row => [row.KPI_ID, row]));
  const afterMap = new Map(after.map(row => [row.KPI_ID, row]));

  const diffs = [];

  // Check all KPIs from Before
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
      Change_Type: afterRow ? getChangeType(dbFormulaBefore, dbFormulaAfter, changed) : 'Missing in After'
    });
  }

  // Check for KPIs only in After
  for (const kpiId of afterMap.keys()) {
    if (!beforeMap.has(kpiId)) {
      const afterRow = afterMap.get(kpiId);
      diffs.push({
        KPI_ID: kpiId,
        KPI_Name: afterRow.KPI_Name,
        Section: afterRow.Section,
        DB_Formula_Before: '',
        DB_Formula_After: afterRow.DB_Formula || '',
        Changed: 'YES',
        Change_Type: 'Missing in Before'
      });
    }
  }

  // Sort: Changed first, then by Section, then by KPI_Name
  diffs.sort((a, b) => {
    if (a.Changed !== b.Changed) return b.Changed.localeCompare(a.Changed);
    if (a.Section !== b.Section) return a.Section.localeCompare(b.Section);
    return a.KPI_Name.localeCompare(b.KPI_Name);
  });

  return diffs;
}
```

- [ ] **Step 2: Integrate into main function**

Update the main function to add:

```javascript
    console.log('Detecting differences...');
    const diffs = detectDifferences(before, after);
    const changedCount = diffs.filter(d => d.Changed === 'YES').length;
    const daxToMssqlCount = diffs.filter(d => d.Change_Type === 'DAX→MSSQL').length;
    const mssqlToMssqlCount = diffs.filter(d => d.Change_Type === 'MSSQL→MSSQL').length;
    const unchangedCount = diffs.filter(d => d.Changed === '').length;
    console.log(`  ✓ Found ${daxToMssqlCount} changed formulas (DAX→MSSQL)`);
    console.log(`  ✓ Found ${mssqlToMssqlCount} MSSQL refinements`);
    console.log(`  ✓ Found ${unchangedCount} unchanged formulas\n`);
```

(Add this after the `after` loading section)

- [ ] **Step 3: Test difference detection**

Run: `node scripts/compareKpiExcel.js`

Expected output:
```
Detecting differences...
  ✓ Found 470 changed formulas (DAX→MSSQL)
  ✓ Found 0 MSSQL refinements
  ✓ Found 470 unchanged formulas
```

- [ ] **Step 4: Commit**

```bash
git add scripts/compareKpiExcel.js
git commit -m "feat(kpi): add detectDifferences to compare Before and After datasets"
```

---

## Task 6: Write comparison Excel with three tabs

**Files:**
- Modify: `scripts/compareKpiExcel.js`

- [ ] **Step 1: Add writeComparisonExcel function**

```javascript
function writeComparisonExcel(before, after, diffs) {
  const workbook = XLSX.utils.book_new();

  // Tab 1: Before
  const beforeSheet = XLSX.utils.json_to_sheet(before);
  beforeSheet['!cols'] = [
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
  XLSX.utils.book_append_sheet(workbook, beforeSheet, 'Before');

  // Tab 2: After
  const afterSheet = XLSX.utils.json_to_sheet(after);
  afterSheet['!cols'] = [
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
  XLSX.utils.book_append_sheet(workbook, afterSheet, 'After');

  // Tab 3: Differences
  const diffsSheet = XLSX.utils.json_to_sheet(diffs);
  diffsSheet['!cols'] = [
    { wch: 35 },  // KPI_ID
    { wch: 45 },  // KPI_Name
    { wch: 28 },  // Section
    { wch: 100 }, // DB_Formula_Before
    { wch: 100 }, // DB_Formula_After
    { wch: 10 },  // Changed
    { wch: 20 },  // Change_Type
  ];
  XLSX.utils.book_append_sheet(workbook, diffsSheet, 'Differences');

  // Write to file
  XLSX.writeFile(workbook, OUTPUT_PATH);
}
```

- [ ] **Step 2: Integrate into main function**

Update the main function to add:

```javascript
    console.log('Writing comparison Excel...');
    writeComparisonExcel(before, after, diffs);
    console.log(`  ✓ Tab 1: Before (${before.length} rows)`);
    console.log(`  ✓ Tab 2: After (${after.length} rows)`);
    console.log(`  ✓ Tab 3: Differences (${diffs.length} rows, ${changedCount} changed)\n`);
    console.log(`✓ Comparison written to ${OUTPUT_PATH}`);
```

(Add this after the difference detection section)

- [ ] **Step 3: Test Excel generation**

Run: `node scripts/compareKpiExcel.js`

Expected output:
```
✓ Input files validated

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

✓ Comparison written to C:\Users\hrishikeshd\Desktop\Auto_Agents_Claude\docs\kpi-glossary-comparison.xlsx
```

- [ ] **Step 4: Verify output file exists**

Run: `ls -lh docs/kpi-glossary-comparison.xlsx`

Expected: File exists with size ~850K (similar to original Excel)

- [ ] **Step 5: Commit**

```bash
git add scripts/compareKpiExcel.js
git commit -m "feat(kpi): add writeComparisonExcel to generate 3-tab comparison workbook"
```

---

## Task 7: Manual verification of comparison Excel

**Files:**
- Review: `docs/kpi-glossary-comparison.xlsx` (generated output)

- [ ] **Step 1: Open the comparison Excel file**

Open `docs/kpi-glossary-comparison.xlsx` in Excel or another spreadsheet application.

- [ ] **Step 2: Verify "Before" tab structure**

Check:
- ✅ Tab name is "Before"
- ✅ 940 rows of data (plus header row)
- ✅ 10 columns: KPI_ID, KPI_Name, Section, PBIX_Formula, DB_Formula, Related_Columns_DB, Related_Tables, Status, PBIX_Only, Discrepancy_Notes
- ✅ Column widths look reasonable (formulas are readable)

- [ ] **Step 3: Verify "Before" tab has DAX formulas**

Spot-check 5 rows with DAX patterns in DB_Formula column:
- Look for rows containing `CALCULATE`, `VAR`, `FILTER`, `DIVIDE`, etc. in DB_Formula
- Expected: ~470 rows should have DAX formulas in DB_Formula

Sample check command (in Node.js console):

```bash
node -e "const XLSX = require('xlsx'); const wb = XLSX.readFile('docs/kpi-glossary-comparison.xlsx'); const ws = wb.Sheets['Before']; const data = XLSX.utils.sheet_to_json(ws); const daxCount = data.filter(r => /CALCULATE|VAR |FILTER\(/.test(r.DB_Formula || '')).length; console.log('DAX formulas in Before tab:', daxCount);"
```

Expected: `DAX formulas in Before tab: 470`

- [ ] **Step 4: Verify "After" tab structure**

Check:
- ✅ Tab name is "After"
- ✅ 940 rows of data (plus header row)
- ✅ Same 10 columns as "Before" tab
- ✅ Column widths look reasonable

- [ ] **Step 5: Verify "After" tab has MSSQL formulas**

Spot-check 5 rows to confirm DB_Formula has MSSQL format:
- Look for patterns like `SUM(vw_TF_EBI_P2S.OPPTY)`, `table.column` references
- No DAX keywords (`CALCULATE`, `VAR`, etc.)

Sample check command:

```bash
node -e "const XLSX = require('xlsx'); const wb = XLSX.readFile('docs/kpi-glossary-comparison.xlsx'); const ws = wb.Sheets['After']; const data = XLSX.utils.sheet_to_json(ws); const daxCount = data.filter(r => /CALCULATE|VAR |FILTER\(/.test(r.DB_Formula || '')).length; console.log('DAX formulas in After tab:', daxCount);"
```

Expected: `DAX formulas in After tab: 0`

- [ ] **Step 6: Verify "Differences" tab structure**

Check:
- ✅ Tab name is "Differences"
- ✅ 940 rows of data (plus header row)
- ✅ 7 columns: KPI_ID, KPI_Name, Section, DB_Formula_Before, DB_Formula_After, Changed, Change_Type
- ✅ Column widths allow reading both formulas side-by-side

- [ ] **Step 7: Verify "Differences" tab has changed rows at top**

Check:
- ✅ First ~470 rows have `Changed = "YES"`
- ✅ Most of these show `Change_Type = "DAX→MSSQL"`
- ✅ Remaining ~470 rows have `Changed = ""` and `Change_Type = "No Change"`

Sample check command:

```bash
node -e "const XLSX = require('xlsx'); const wb = XLSX.readFile('docs/kpi-glossary-comparison.xlsx'); const ws = wb.Sheets['Differences']; const data = XLSX.utils.sheet_to_json(ws); console.log('Changed rows:', data.filter(r => r.Changed === 'YES').length); console.log('DAX→MSSQL:', data.filter(r => r.Change_Type === 'DAX→MSSQL').length); console.log('No Change:', data.filter(r => r.Change_Type === 'No Change').length);"
```

Expected:
```
Changed rows: 470
DAX→MSSQL: 470
No Change: 470
```

- [ ] **Step 8: Spot-check 5 changed rows for correctness**

Manually pick 5 rows with `Changed = "YES"` and verify:
- ✅ DB_Formula_Before contains DAX keywords
- ✅ DB_Formula_After contains MSSQL format (table.column references)
- ✅ The conversion makes sense (e.g., `CALCULATE([ARR IMPACT])` → `SUM(vw_TF_EBI_Retention.ARR_Impact)`)

- [ ] **Step 9: Test script can overwrite existing output**

Run: `node scripts/compareKpiExcel.js` (second time)

Expected: No errors, file is overwritten successfully

- [ ] **Step 10: Document verification results**

Create a brief summary:

```bash
echo "Manual verification completed on $(date)" >> docs/kpi-glossary-comparison-verification.txt
echo "✓ Before tab: 940 rows, 470 with DAX" >> docs/kpi-glossary-comparison-verification.txt
echo "✓ After tab: 940 rows, 0 with DAX" >> docs/kpi-glossary-comparison-verification.txt
echo "✓ Differences tab: 470 changed (DAX→MSSQL), 470 unchanged" >> docs/kpi-glossary-comparison-verification.txt
git add docs/kpi-glossary-comparison-verification.txt
```

- [ ] **Step 11: Commit verification results**

```bash
git commit -m "docs(kpi): verify Excel comparison output correctness"
```

---

## Task 8: Test error handling

**Files:**
- Test: `scripts/compareKpiExcel.js`

- [ ] **Step 1: Test missing Excel file handling**

Temporarily rename the Excel file:

```bash
mv docs/kpi-glossary-mapping-log.xlsx docs/kpi-glossary-mapping-log.xlsx.bak
node scripts/compareKpiExcel.js
```

Expected output:
```
Error: Excel file not found: C:\Users\hrishikeshd\Desktop\Auto_Agents_Claude\docs\kpi-glossary-mapping-log.xlsx
```

Restore the file:

```bash
mv docs/kpi-glossary-mapping-log.xlsx.bak docs/kpi-glossary-mapping-log.xlsx
```

- [ ] **Step 2: Test missing JSON file handling**

Temporarily rename the JSON file:

```bash
mv server/context/knowledge/kpi-glossary.json server/context/knowledge/kpi-glossary.json.bak
node scripts/compareKpiExcel.js
```

Expected output:
```
Error: JSON file not found: C:\Users\hrishikeshd\Desktop\Auto_Agents_Claude\server\context\knowledge\kpi-glossary.json
```

Restore the file:

```bash
mv server/context/knowledge/kpi-glossary.json.bak server/context/knowledge/kpi-glossary.json
```

- [ ] **Step 3: Verify script completes successfully**

Run: `node scripts/compareKpiExcel.js`

Expected: Completes with no errors and generates comparison Excel

---

## Success Criteria Checklist

Verify all success criteria from the spec are met:

- [ ] ✅ Script runs without errors
- [ ] ✅ Output Excel has three tabs: "Before", "After", "Differences"
- [ ] ✅ "Before" tab matches original Excel data (940 rows, 470 with DAX)
- [ ] ✅ "After" tab has all MSSQL formulas (940 rows, 0 with DAX)
- [ ] ✅ "Differences" tab correctly identifies ~470 changed formulas
- [ ] ✅ Changed rows appear at the top of the "Differences" tab
- [ ] ✅ No modification to source files (JSON or original Excel)

---

## Self-Review Results

**Spec Coverage:**
- ✅ Problem Statement → All tasks address the Excel/JSON sync gap
- ✅ Solution Overview → Task 1-6 implement the standalone script
- ✅ Architecture → Task structure follows 4 main functions design
- ✅ Differences Detection Algorithm → Task 4-5 implement detection logic
- ✅ Excel Output Format → Task 6 implements 3-tab output
- ✅ Error Handling → Task 1 (file validation), Task 8 (error testing)
- ✅ Testing Approach → Task 7 (manual verification), Task 8 (edge cases)
- ✅ Success Criteria → Final checklist covers all criteria

**Placeholder Scan:**
- ✅ No TBD/TODO markers
- ✅ All code blocks are complete
- ✅ All test commands include expected output
- ✅ All file paths are exact (no "path/to/file" placeholders)

**Type Consistency:**
- ✅ `before`/`after`/`diffs` variable names consistent across tasks
- ✅ Row object properties match between loadBeforeData/loadAfterData
- ✅ Diff object properties match spec definition
- ✅ Function names match between definition and usage

**No Gaps Found:** All spec requirements are covered by plan tasks.
