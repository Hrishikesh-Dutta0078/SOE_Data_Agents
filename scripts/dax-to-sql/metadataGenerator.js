'use strict';

const { SECTION_MAP, ABBREVIATIONS } = require('./constants');

/**
 * Generate a snake_case KPI id from a measure name.
 *
 * Rules:
 * - $ → dollar, % → pct, # → count, & → and, + → _, / → _
 * - -VE → ve
 * - Strip remaining non-alphanumeric to _
 * - Collapse multiple _, lowercase
 *
 * @param {string} name - Measure name (e.g., 'PIPE $', 'W+F+UC %')
 * @returns {string} - snake_case id (e.g., 'pipe_dollar', 'w_f_uc_pct')
 */
function generateId(name) {
  let id = name;

  // Replace special characters with words
  id = id.replace(/\$/g, 'dollar');
  id = id.replace(/%/g, 'pct');
  id = id.replace(/#/g, 'count');
  id = id.replace(/&/g, 'and');

  // Replace +, / with _
  id = id.replace(/[+/]/g, '_');

  // Replace -VE with ve
  id = id.replace(/-VE/gi, 've');

  // Strip remaining non-alphanumeric to _
  id = id.replace(/[^a-zA-Z0-9_]/g, '_');

  // Collapse multiple underscores
  id = id.replace(/_+/g, '_');

  // Remove leading/trailing underscores
  id = id.replace(/^_+|_+$/g, '');

  // Lowercase
  return id.toLowerCase();
}

/**
 * Generate array of aliases for a measure name.
 *
 * Rules:
 * - Base: lowercase with special chars → spaces
 * - Replace $ → dollars, % → percent, # → count
 * - Expand abbreviations from ABBREVIATIONS constant
 * - Add pct variant for % measures
 * - Remove alias that exactly matches the name
 * - Filter out aliases shorter than 3 chars
 *
 * @param {string} name - Measure name
 * @returns {string[]} - Array of aliases
 */
function generateAliases(name) {
  const aliases = new Set();

  // Base: lowercase with special chars → spaces
  let base = name.toLowerCase();
  base = base.replace(/[^a-z0-9]/g, ' ');
  base = base.replace(/\s+/g, ' ').trim();

  if (base) {
    aliases.add(base);
  }

  // Replace special chars with words
  let withSpecialWords = name.toLowerCase();
  withSpecialWords = withSpecialWords.replace(/\$/g, ' dollars ');
  withSpecialWords = withSpecialWords.replace(/%/g, ' percent ');
  withSpecialWords = withSpecialWords.replace(/#/g, ' count ');
  withSpecialWords = withSpecialWords.replace(/[^a-z0-9]/g, ' ');
  withSpecialWords = withSpecialWords.replace(/\s+/g, ' ').trim();

  if (withSpecialWords) {
    aliases.add(withSpecialWords);
  }

  // Add pct variant for % measures
  if (name.includes('%')) {
    let pctVariant = name.toLowerCase();
    pctVariant = pctVariant.replace(/%/g, ' pct ');
    pctVariant = pctVariant.replace(/[^a-z0-9]/g, ' ');
    pctVariant = pctVariant.replace(/\s+/g, ' ').trim();

    if (pctVariant) {
      aliases.add(pctVariant);
    }
  }

  // Expand abbreviations
  const aliasArray = Array.from(aliases);
  for (const alias of aliasArray) {
    let expanded = alias;
    let hasExpansion = false;

    for (const [abbr, expansion] of Object.entries(ABBREVIATIONS)) {
      const abbrLower = abbr.toLowerCase();
      // Normalize the abbreviation to match how it appears in aliases (spaces instead of special chars)
      const abbrNormalized = abbrLower.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

      // Try exact match first for multi-word abbreviations
      if (expanded.includes(abbrNormalized)) {
        expanded = expanded.replace(new RegExp(abbrNormalized, 'g'), expansion);
        hasExpansion = true;
      } else {
        // Try word boundary match for single-word abbreviations
        const regex = new RegExp(`\\b${abbrNormalized}\\b`, 'g');
        if (expanded.match(regex)) {
          expanded = expanded.replace(regex, expansion);
          hasExpansion = true;
        }
      }
    }

    if (hasExpansion) {
      expanded = expanded.replace(/\s+/g, ' ').trim();
      if (expanded) {
        aliases.add(expanded);
      }
    }
  }

  // Remove alias that exactly matches the name
  aliases.delete(name);

  // Filter out aliases shorter than 3 chars
  return Array.from(aliases).filter(a => a.length >= 3);
}

/**
 * Map PBIX measure table to glossary section.
 *
 * @param {string} tableName - PBIX table name (e.g., '_Pipeline Measures')
 * @returns {string} - Section name (e.g., 'Pipeline') or 'Other'
 */
function generateSection(tableName) {
  return SECTION_MAP[tableName] || 'Other';
}

/**
 * Generate human-readable definition from measure name and SQL.
 *
 * Rules:
 * - Detect aggregation type from SQL (SUM, COUNT, AVG, MAX, MIN, NULLIF/ratio, CASE/conditional, RANK)
 * - Build: "READABLE_NAME — aggType metric"
 * - READABLE_NAME has $ → "dollar amount", % → "percentage", # → "count"
 *
 * @param {string} name - Measure name
 * @param {string} sql - SQL query
 * @returns {string} - Human-readable definition
 */
function generateDefinition(name, sql) {
  // Generate readable name
  let readableName = name;

  // Replace special characters with words
  readableName = readableName.replace(/\$/g, ' dollar amount ');
  readableName = readableName.replace(/%/g, ' percentage ');
  readableName = readableName.replace(/#/g, ' count ');

  // Clean up spaces
  readableName = readableName.replace(/\s+/g, ' ').trim();

  // Detect aggregation type from SQL
  const sqlUpper = sql.toUpperCase();
  let aggType = 'calculated';

  if (sqlUpper.includes('RANK(')) {
    aggType = 'ranked';
  } else if (sqlUpper.includes('CASE ') || sqlUpper.includes('CASE\n')) {
    aggType = 'conditional';
  } else if (sqlUpper.includes('NULLIF') && (sqlUpper.includes('* 1.0') || sqlUpper.includes('* 100'))) {
    aggType = 'ratio';
  } else if (sqlUpper.includes('COUNT(')) {
    aggType = 'count';
  } else if (sqlUpper.includes('SUM(')) {
    aggType = 'sum';
  } else if (sqlUpper.includes('AVG(')) {
    aggType = 'average';
  } else if (sqlUpper.includes('MAX(')) {
    aggType = 'maximum';
  } else if (sqlUpper.includes('MIN(')) {
    aggType = 'minimum';
  }

  return `${readableName} — ${aggType} metric`;
}

module.exports = {
  generateId,
  generateAliases,
  generateSection,
  generateDefinition,
};
