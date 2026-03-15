/**
 * Distinct Values Fetcher — programmatic, deterministic distinct value retrieval.
 *
 * Loads pre-harvested distinct values from distinct-values.json into memory
 * and serves them via fast Map lookups. No SQL Server calls at runtime.
 *
 * If distinct-values.json does not exist yet, returns graceful "not available"
 * responses (the harvest script must be run first).
 *
 * Usage:
 *   const { getDistinctValues, getDistinctValuesAsync, getAvailableColumns } = require('./vectordb/distinctValuesFetcher');
 *   const values = getDistinctValues('vw_TF_EBI_P2S', 'SALES_STAGE_ID', 5);
 *   const valuesAsync = await getDistinctValuesAsync('vw_TF_EBI_P2S', 'SALES_STAGE_ID', 5);
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const DISTINCT_VALUES_PATH = path.join(
  __dirname,
  '..',
  'context',
  'knowledge',
  'distinct-values.json'
);

let _store = null;
let _loadPromise = null;

function buildStoreFromRaw(raw) {
  const tableIndex = new Map();
  for (const [tableName, columns] of Object.entries(raw)) {
    const colMap = new Map();
    for (const [colName, values] of Object.entries(columns)) {
      if (values && typeof values === 'object' && values.error) continue;
      if (Array.isArray(values)) {
        colMap.set(colName.toUpperCase(), values);
      }
    }
    if (colMap.size > 0) {
      tableIndex.set(tableName.toLowerCase(), { originalName: tableName, columns: colMap });
    }
  }
  return { tableIndex, available: true };
}

async function loadDistinctValuesAsync() {
  if (_store) return _store;
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    if (!fs.existsSync(DISTINCT_VALUES_PATH)) {
      logger.warn('Distinct values JSON not found — run harvestDistinctValues.js first', {
        path: DISTINCT_VALUES_PATH,
      });
      _store = { tableIndex: new Map(), available: false };
      return _store;
    }
    const raw = JSON.parse(await fs.promises.readFile(DISTINCT_VALUES_PATH, 'utf-8'));
    _store = buildStoreFromRaw(raw);
    return _store;
  })();

  return _loadPromise;
}

/**
 * Sync: returns cached store only. Does not load from disk. Call loadDistinctValuesAsync() at startup or before first use.
 */
function loadDistinctValues() {
  if (_store) return _store;
  return { tableIndex: new Map(), available: false };
}

/**
 * Get pre-computed distinct values for a table.column (sync; uses cache only).
 *
 * @param {string} table
 * @param {string} column
 * @param {number} [limit=5]
 * @returns {{ values: any[]|null, available: boolean, message: string|null }}
 */
function getDistinctValues(table, column, limit = 5) {
  const store = loadDistinctValues();

  if (!store.available) {
    return {
      values: null,
      available: false,
      message: 'Distinct values store not available. Run harvestDistinctValues.js to generate it.',
    };
  }

  const tableEntry = store.tableIndex.get(table.toLowerCase());
  if (!tableEntry) {
    const availableTables = [...store.tableIndex.values()]
      .map((t) => t.originalName)
      .slice(0, 20);
    return {
      values: null,
      available: false,
      message: `Table "${table}" not found in distinct values store. Available tables: ${availableTables.join(', ')}`,
    };
  }

  const values = tableEntry.columns.get(column.toUpperCase());
  if (!values) {
    const availableCols = [...tableEntry.columns.keys()].slice(0, 30);
    return {
      values: null,
      available: false,
      message: `Column "${column}" not found for table "${table}". Available columns: ${availableCols.join(', ')}`,
    };
  }

  const cappedLimit = Math.min(Math.max(1, limit || 5), values.length);
  return {
    values: values.slice(0, cappedLimit),
    available: true,
    message: null,
  };
}

/**
 * Async: ensures store is loaded then returns distinct values. Use from tools.
 *
 * @param {string} table
 * @param {string} column
 * @param {number} [limit=5]
 * @returns {Promise<{ values: any[]|null, available: boolean, message: string|null }>}
 */
async function getDistinctValuesAsync(table, column, limit = 5) {
  const store = await loadDistinctValuesAsync();
  if (!store.available) {
    return {
      values: null,
      available: false,
      message: 'Distinct values store not available. Run harvestDistinctValues.js to generate it.',
    };
  }
  const tableEntry = store.tableIndex.get(table.toLowerCase());
  if (!tableEntry) {
    const availableTables = [...store.tableIndex.values()]
      .map((t) => t.originalName)
      .slice(0, 20);
    return {
      values: null,
      available: false,
      message: `Table "${table}" not found in distinct values store. Available tables: ${availableTables.join(', ')}`,
    };
  }
  const values = tableEntry.columns.get(column.toUpperCase());
  if (!values) {
    const availableCols = [...tableEntry.columns.keys()].slice(0, 30);
    return {
      values: null,
      available: false,
      message: `Column "${column}" not found for table "${table}". Available columns: ${availableCols.join(', ')}`,
    };
  }
  const cappedLimit = Math.min(Math.max(1, limit || 5), values.length);
  return {
    values: values.slice(0, cappedLimit),
    available: true,
    message: null,
  };
}

/**
 * Get list of available columns for a table.
 * @param {string} table
 * @returns {string[]}
 */
function getAvailableColumns(table) {
  const store = loadDistinctValues();
  const entry = store.tableIndex.get(table.toLowerCase());
  return entry ? [...entry.columns.keys()] : [];
}

async function reloadDistinctValues() {
  _store = null;
  _loadPromise = null;
  return loadDistinctValuesAsync();
}

function getDistinctValuesStats() {
  const store = loadDistinctValues();
  if (!store.available) return { available: false, tables: 0, columns: 0 };
  const totalCols = [...store.tableIndex.values()].reduce((s, t) => s + t.columns.size, 0);
  return { available: true, tables: store.tableIndex.size, columns: totalCols };
}

module.exports = {
  getDistinctValues,
  getDistinctValuesAsync,
  getAvailableColumns,
  getDistinctValuesStats,
  reloadDistinctValues,
  loadDistinctValuesAsync,
};
