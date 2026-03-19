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
