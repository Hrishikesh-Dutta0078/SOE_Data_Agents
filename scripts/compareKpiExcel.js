const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const EXCEL_PATH = path.resolve(__dirname, '../docs/kpi-glossary-mapping-log.xlsx');
const JSON_PATH = path.resolve(__dirname, '../server/context/knowledge/kpi-glossary.json');
const OUTPUT_PATH = path.resolve(__dirname, '../docs/kpi-glossary-comparison.xlsx');

function validateInputFiles() {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`Excel file not found: ${EXCEL_PATH}`);
  }
  if (!fs.existsSync(JSON_PATH)) {
    throw new Error(`JSON file not found: ${JSON_PATH}`);
  }
}

function loadBeforeData() {
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  return data;
}

function loadAfterData() {
  const rawData = fs.readFileSync(JSON_PATH, 'utf-8');
  const glossary = JSON.parse(rawData);
  const kpis = glossary.kpis;

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

function isDaxFormula(formula) {
  if (!formula) return false;
  return /CALCULATE|VAR |FILTER\(|REMOVEFILTERS|DIVIDE\(|IFERROR\(/i.test(formula);
}

function getChangeType(before, after, changed) {
  if (!changed) return 'No Change';
  const beforeIsDax = isDaxFormula(before);
  const afterIsDax = isDaxFormula(after);
  if (beforeIsDax && !afterIsDax) return 'DAX→MSSQL';
  if (!beforeIsDax && !afterIsDax) return 'MSSQL→MSSQL';
  return 'Other';
}

function detectDifferences(before, after) {
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
      Change_Type: afterRow ? getChangeType(dbFormulaBefore, dbFormulaAfter, changed) : 'Missing in After'
    });
  }

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

  diffs.sort((a, b) => {
    if (a.Changed !== b.Changed) return b.Changed.localeCompare(a.Changed);
    if (a.Section !== b.Section) return a.Section.localeCompare(b.Section);
    return a.KPI_Name.localeCompare(b.KPI_Name);
  });

  return diffs;
}

function writeComparisonExcel(before, after, diffs) {
  const workbook = XLSX.utils.book_new();

  // Tab 1: Before
  const beforeSheet = XLSX.utils.json_to_sheet(before);
  beforeSheet['!cols'] = [
    { wch: 35 }, { wch: 45 }, { wch: 28 }, { wch: 80 }, { wch: 100 },
    { wch: 80 }, { wch: 50 }, { wch: 15 }, { wch: 10 }, { wch: 80 },
  ];
  XLSX.utils.book_append_sheet(workbook, beforeSheet, 'Before');

  // Tab 2: After
  const afterSheet = XLSX.utils.json_to_sheet(after);
  afterSheet['!cols'] = [
    { wch: 35 }, { wch: 45 }, { wch: 28 }, { wch: 80 }, { wch: 100 },
    { wch: 80 }, { wch: 50 }, { wch: 15 }, { wch: 10 }, { wch: 80 },
  ];
  XLSX.utils.book_append_sheet(workbook, afterSheet, 'After');

  // Tab 3: Differences
  const diffsSheet = XLSX.utils.json_to_sheet(diffs);
  diffsSheet['!cols'] = [
    { wch: 35 }, { wch: 45 }, { wch: 28 }, { wch: 100 }, { wch: 100 },
    { wch: 10 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(workbook, diffsSheet, 'Differences');

  XLSX.writeFile(workbook, OUTPUT_PATH);
}

async function main() {
  validateInputFiles();
  console.log('✓ Input files validated\n');

  console.log('Loading Before data from docs/kpi-glossary-mapping-log.xlsx...');
  const before = loadBeforeData();
  console.log(`  ✓ Loaded ${before.length} rows\n`);

  console.log('Loading After data from server/context/knowledge/kpi-glossary.json...');
  const after = loadAfterData();
  console.log(`  ✓ Loaded ${after.length} KPIs\n`);

  console.log('Detecting differences...');
  const diffs = detectDifferences(before, after);
  const changedCount = diffs.filter(d => d.Changed === 'YES').length;
  const daxToMssqlCount = diffs.filter(d => d.Change_Type === 'DAX→MSSQL').length;
  const mssqlToMssqlCount = diffs.filter(d => d.Change_Type === 'MSSQL→MSSQL').length;
  const unchangedCount = diffs.filter(d => d.Changed === '').length;
  console.log(`  ✓ Found ${daxToMssqlCount} changed formulas (DAX→MSSQL)`);
  console.log(`  ✓ Found ${mssqlToMssqlCount} MSSQL refinements`);
  console.log(`  ✓ Found ${unchangedCount} unchanged formulas\n`);

  console.log('Writing comparison Excel...');
  writeComparisonExcel(before, after, diffs);
  console.log(`  ✓ Tab 1: Before (${before.length} rows)`);
  console.log(`  ✓ Tab 2: After (${after.length} rows)`);
  console.log(`  ✓ Tab 3: Differences (${diffs.length} rows, ${changedCount} changed)\n`);
  console.log(`✓ Comparison written to ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
