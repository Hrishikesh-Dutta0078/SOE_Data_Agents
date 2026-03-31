'use strict';

/**
 * translateDaxToSql.js — Main Orchestrator
 *
 * Reads the PBIX Excel, builds a dependency graph, translates DAX measures
 * to T-SQL in topological order, and writes kpi-glossary.json.
 *
 * Usage: node scripts/translateDaxToSql.js
 */

const path = require('path');
const fs = require('fs');
const { readExcel } = require('./dax-to-sql/excelReader');
const { buildDependencyGraph, topologicalSort } = require('./dax-to-sql/dependencyGraph');
const { createTranslationContext, translateMeasure } = require('./dax-to-sql/sqlTranslator');
const { generateId, generateAliases, generateSection, generateDefinition } = require('./dax-to-sql/metadataGenerator');
const { EXCLUDED_MEASURES, TABLE_ALIAS } = require('./dax-to-sql/constants');

const EXCEL_PATH = path.resolve(__dirname, '../RTB Dataverse Technical Document 3.xlsx');
const OUTPUT_PATH = path.resolve(__dirname, '../server/context/knowledge/kpi-glossary.json');

function main() {
  console.log('Reading Excel:', EXCEL_PATH);

  // 1. Read Excel
  const { measures, tableMap, columnsByTable, joinMap } = readExcel(EXCEL_PATH);
  console.log(`  Measures found: ${measures.length}`);

  // 2. Filter out excluded (presentational) measures
  const dataMeasures = measures.filter(m => !EXCLUDED_MEASURES.has(m.name));
  console.log(`  After excluding presentational: ${dataMeasures.length}`);

  // 3. Build dependency graph
  const graph = buildDependencyGraph(dataMeasures);

  // 4. Topological sort
  const { order, cycles } = topologicalSort(graph);
  console.log(`  Topological order: ${order.length} measures`);
  if (cycles.length > 0) {
    console.log(`  Circular dependencies detected: ${cycles.length}`);
  }

  // 5. Create translation context
  const ctx = createTranslationContext({
    tableMap,
    tableAlias: TABLE_ALIAS,
    joinMap,
    resolvedMeasures: {},
  });

  // Build a lookup map for measures by name
  const measuresByName = {};
  for (const m of dataMeasures) {
    measuresByName[m.name] = m;
  }

  // 6. Translate each measure in dependency order
  const stats = { mapped: 0, inferred: 0, pbix_only: 0 };
  const warningMeasures = [];
  const kpis = [];

  for (const name of order) {
    const measure = measuresByName[name];
    if (!measure) continue; // safety: skip if not found

    const result = translateMeasure(measure.expression, ctx);

    // Store resolved SQL for inlining by dependent measures
    ctx.resolvedMeasures[name] = {
      sql: `(${result.sql})`,
      relatedTables: result.relatedTables,
      relatedColumns: result.relatedColumns,
    };

    // Track stats
    stats[result.confidence] = (stats[result.confidence] || 0) + 1;

    if (result.warnings.length > 0) {
      warningMeasures.push({ name, warnings: result.warnings });
    }

    // 7. Build KPI entry with metadata
    const kpi = {
      id: generateId(name),
      name,
      aliases: generateAliases(name),
      personas: ['AE', 'Manager', 'VP'],
      section: generateSection(measure.tableName),
      definition: generateDefinition(name, result.sql),
      formula: result.sql,
      components: {},
      timeVariants: [],
      relatedColumns: result.relatedColumns,
      relatedTables: result.relatedTables,
      formulaPbix: measure.expression,
      confidence: result.confidence,
      tableName: measure.tableName,
      dataType: measure.dataType,
      isHidden: measure.isHidden,
    };

    kpis.push(kpi);
  }

  // 8. Write output JSON
  const output = { kpis };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\nOutput written to: ${OUTPUT_PATH}`);

  // 9. Console summary report
  console.log('\n=== Translation Summary ===');
  console.log(`Total measures in Excel:     ${measures.length}`);
  console.log(`Excluded (presentational):   ${measures.length - dataMeasures.length}`);
  console.log(`Translated:                  ${kpis.length}`);
  console.log(`  - mapped (clean):          ${stats.mapped || 0}`);
  console.log(`  - inferred (partial):      ${stats.inferred || 0}`);
  console.log(`  - pbix_only (flagged):     ${stats.pbix_only || 0}`);
  console.log(`Circular dependencies:       ${cycles.length}`);
  console.log(`Measures with warnings:      ${warningMeasures.length}`);

  // 10. Log first 30 warning details
  if (warningMeasures.length > 0) {
    console.log('\n--- Warning Details (first 30) ---');
    const toShow = warningMeasures.slice(0, 30);
    for (const { name, warnings } of toShow) {
      console.log(`  ${name}:`);
      for (const w of warnings) {
        console.log(`    - ${w}`);
      }
    }
    if (warningMeasures.length > 30) {
      console.log(`  ... and ${warningMeasures.length - 30} more`);
    }
  }

  return { kpis, stats, cycles, warningMeasures };
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { main, EXCEL_PATH, OUTPUT_PATH };
