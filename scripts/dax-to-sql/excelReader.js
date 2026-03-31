'use strict';

const XLSX = require('xlsx');
const { TABLE_MAP } = require('./constants');

/**
 * Reads the RTB Dataverse Technical Document Excel and returns
 * structured data: measures, table/column/join maps.
 */
function readExcel(filePath) {
  const wb = XLSX.readFile(filePath);

  const measures = readMeasures(wb);
  const tableMap = buildTableMap(wb);
  const columnsByTable = buildColumnMap(wb);
  const joinMap = buildJoinMap(wb);

  return { measures, tableMap, columnsByTable, joinMap };
}

function readMeasures(wb) {
  const ws = wb.Sheets['Measures'];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
  // Row 0 is the header row (Measure Name, Table Name, ...)
  return raw.slice(1).map(r => ({
    name: r['EVALUATE INFO.VIEW.MEASURES()'] || '',
    tableName: r.__EMPTY || '',
    dataType: r.__EMPTY_1 || '',
    expression: (r['EVALUATE INFO.VIEW.MEASURES()_1'] || '').replace(/\r\r\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n'),
    isHidden: r.__EMPTY_2 === true,
    displayFolder: r.__EMPTY_3 || '',
    formatString: r.__EMPTY_4 || '',
  }));
}

function buildTableMap(wb) {
  // Start with the hardcoded TABLE_MAP from constants (authoritative).
  // Supplement with any additional entries from the Table Source sheet.
  const ws = wb.Sheets['Table Source'];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
  const map = { ...TABLE_MAP };

  raw.forEach(r => {
    const pbix = r['[Table/Folder Name]'];
    const src = r['Source Table'];
    if (!pbix || !src) return;
    if (map[pbix] !== undefined) return; // constants.js takes precedence
    if (src === 'Measure Table' || src.includes('Manual Table') || src.includes('DAX Table') || src.includes('Calculated')) {
      map[pbix] = null;
      return;
    }
    const fyMatch = src.match(/^FY Calendar\((.+)\)$/);
    map[pbix] = fyMatch ? fyMatch[1] : src;
  });

  return map;
}

function buildColumnMap(wb) {
  const ws = wb.Sheets['Columns'];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
  const map = {}; // tableName → Set<columnName>
  raw.slice(1).forEach(r => {
    const table = r.__EMPTY || '';
    const col = r['EVALUATE INFO.VIEW.COLUMNS()'] || '';
    if (!table || !col) return;
    if (!map[table]) map[table] = new Set();
    map[table].add(col);
  });
  return map;
}

function buildJoinMap(wb) {
  const ws = wb.Sheets['Data Model Design'];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
  const map = {}; // fromTable → { toTable → { fromCol, toCol } }

  raw.slice(1).forEach(r => {
    const from = r.__EMPTY_5 || '';
    const fromCol = r.__EMPTY_6 || '';
    const to = r.__EMPTY_8 || '';
    const toCol = r.__EMPTY_9 || '';
    if (!from || !to || !fromCol || !toCol) return;

    // Forward direction
    if (!map[from]) map[from] = {};
    if (!map[from][to]) map[from][to] = { fromCol, toCol };

    // Reverse direction
    if (!map[to]) map[to] = {};
    if (!map[to][from]) map[to][from] = { fromCol: toCol, toCol: fromCol };
  });

  return map;
}

module.exports = { readExcel, readMeasures, buildTableMap, buildColumnMap, buildJoinMap };
