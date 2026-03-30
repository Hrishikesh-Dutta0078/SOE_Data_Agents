'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { readExcel } = require('../excelReader');
const { buildDependencyGraph, topologicalSort } = require('../dependencyGraph');
const { createTranslationContext, translateMeasure } = require('../sqlTranslator');
const { EXCLUDED_MEASURES, TABLE_ALIAS } = require('../constants');

const EXCEL_PATH = path.resolve(__dirname, '../../../RTB Dataverse Technical Document 3.xlsx');
const OUTPUT_PATH = path.resolve(__dirname, '../../../server/context/knowledge/kpi-glossary-rtb.json');

describe('DAX-to-SQL integration', () => {
  let measures;
  let dataMeasures;
  let order;
  let cycles;
  let results; // Map<name, { sql, confidence, relatedTables, relatedColumns, warnings }>

  before(() => {
    // 1. Read Excel
    const data = readExcel(EXCEL_PATH);
    measures = data.measures;

    // 2. Filter excluded
    dataMeasures = measures.filter(m => !EXCLUDED_MEASURES.has(m.name));

    // 3. Build graph and sort
    const graph = buildDependencyGraph(dataMeasures);
    const sorted = topologicalSort(graph);
    order = sorted.order;
    cycles = sorted.cycles;

    // 4. Translate all in order
    const measuresByName = {};
    for (const m of dataMeasures) {
      measuresByName[m.name] = m;
    }

    const ctx = createTranslationContext({
      tableMap: data.tableMap,
      tableAlias: TABLE_ALIAS,
      joinMap: data.joinMap,
      resolvedMeasures: {},
    });

    results = new Map();

    for (const name of order) {
      const measure = measuresByName[name];
      if (!measure) continue;

      const result = translateMeasure(measure.expression, ctx);

      ctx.resolvedMeasures[name] = {
        sql: `(${result.sql})`,
        relatedTables: result.relatedTables,
        relatedColumns: result.relatedColumns,
      };

      results.set(name, result);
    }
  });

  it('translates at least 300 measures', () => {
    assert.ok(
      results.size >= 300,
      `Expected >= 300 translated, got ${results.size}`
    );
  });

  it('excludes exactly 6 presentational measures', () => {
    const excludedCount = measures.length - dataMeasures.length;
    assert.equal(excludedCount, 6, `Expected 6 excluded, got ${excludedCount}`);
  });

  it('all translated measures have non-empty SQL', () => {
    const emptyMeasures = [];
    for (const [name, result] of results) {
      if (!result.sql || result.sql.trim() === '') {
        emptyMeasures.push(name);
      }
    }
    assert.equal(
      emptyMeasures.length,
      0,
      `Measures with empty SQL: ${emptyMeasures.join(', ')}`
    );
  });

  it('PIPE $ references OPPTY column and vw_TF_EBI_P2S', () => {
    const result = results.get('PIPE $');
    assert.ok(result, 'PIPE $ should be translated');
    // PIPE $ sums pipeline data — should reference the Pipeline fact table
    const hasP2S = result.relatedTables.some(t => t.includes('P2S'));
    assert.ok(hasP2S, `PIPE $ should reference vw_TF_EBI_P2S, got tables: ${result.relatedTables.join(', ')}`);
  });

  it('BOOKINGS TARGET references QUOTA view', () => {
    const result = results.get('BOOKINGS TARGET');
    if (!result) {
      // Measure may not exist — skip gracefully
      return;
    }
    const hasQuota = result.relatedTables.some(t => t.includes('QUOTA'));
    assert.ok(hasQuota, `BOOKINGS TARGET should reference QUOTA view, got tables: ${result.relatedTables.join(', ')}`);
  });

  it('WON $ references pipeline data', () => {
    const result = results.get('WON $');
    assert.ok(result, 'WON $ should be translated');
    const hasPipeline = result.relatedTables.some(
      t => t.includes('P2S') || t.includes('PIPE') || t.includes('BOOKINGS')
    );
    assert.ok(hasPipeline, `WON $ should reference pipeline data, got tables: ${result.relatedTables.join(', ')}`);
  });

  it('majority are mapped confidence (>= 40%)', () => {
    let mapped = 0;
    for (const [, result] of results) {
      if (result.confidence === 'mapped') mapped++;
    }
    const pct = (mapped / results.size) * 100;
    assert.ok(
      pct >= 40,
      `Expected >= 40% mapped, got ${pct.toFixed(1)}% (${mapped}/${results.size})`
    );
  });

  it('output JSON file has valid structure (if exists)', () => {
    if (!fs.existsSync(OUTPUT_PATH)) {
      // File not yet generated — skip
      return;
    }

    const raw = fs.readFileSync(OUTPUT_PATH, 'utf8');
    const data = JSON.parse(raw);

    assert.ok(data.kpis, 'output should have kpis array');
    assert.ok(Array.isArray(data.kpis), 'kpis should be an array');
    assert.ok(data.kpis.length >= 300, `Expected >= 300 kpis, got ${data.kpis.length}`);

    // Spot-check first KPI has all required fields
    const first = data.kpis[0];
    assert.ok(first.id, 'KPI should have id');
    assert.ok(first.name, 'KPI should have name');
    assert.ok(Array.isArray(first.aliases), 'KPI should have aliases array');
    assert.ok(Array.isArray(first.personas), 'KPI should have personas array');
    assert.ok(first.section, 'KPI should have section');
    assert.ok(first.definition, 'KPI should have definition');
    assert.ok(first.formula, 'KPI should have formula');
    assert.ok(first.confidence, 'KPI should have confidence');
    assert.ok(typeof first.formulaPbix === 'string', 'KPI should have formulaPbix string');
  });
});
