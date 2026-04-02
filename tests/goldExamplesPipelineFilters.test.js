const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const GOLD_EXAMPLES_PATH = path.join(__dirname, '..', 'server', 'context', 'goldExamples.json');

function loadExamples() {
  return JSON.parse(fs.readFileSync(GOLD_EXAMPLES_PATH, 'utf-8'));
}

describe('goldExamples pipeline filters', () => {
  it('exact__pipeline includes IN_PIPELINE = 1', () => {
    const { examples } = loadExamples();
    const ex = examples.find((e) => e.id === 'exact__pipeline');
    assert.ok(ex, 'expected exact__pipeline gold example to exist');
    assert.match(ex.sql, /IN_PIPELINE\s*=\s*1/i);
  });

  it('exact__pipeline joins rh on p.REPORTING_HIERARCHY_ID (not r.)', () => {
    const { examples } = loadExamples();
    const ex = examples.find((e) => e.id === 'exact__pipeline');
    assert.ok(ex, 'expected exact__pipeline gold example to exist');
    assert.match(ex.sql, /p\.REPORTING_HIERARCHY_ID\s*=\s*rh\.REPORTING_HIERARCHY_ID/i);
    assert.ok(
      !ex.sql.match(/r\.REPORTING_HIERARCHY_ID\s*=\s*rh\.REPORTING_HIERARCHY_ID/i),
      'rh join must use fact table alias p, not region alias r'
    );
  });

  it('exact__pipeline includes rh.IS_CY_RPT_HIER = 1', () => {
    const { examples } = loadExamples();
    const ex = examples.find((e) => e.id === 'exact__pipeline');
    assert.match(ex.sql, /IS_CY_RPT_HIER\s*=\s*1/i);
  });

  it('exact__pipeline lists TD_EBI_REPORTING_HIERARCHY in tables_used', () => {
    const { examples } = loadExamples();
    const ex = examples.find((e) => e.id === 'exact__pipeline');
    assert.ok(
      ex.tables_used.some((t) => t.toUpperCase() === 'TD_EBI_REPORTING_HIERARCHY'),
      'tables_used must include TD_EBI_REPORTING_HIERARCHY'
    );
  });

  it('_filterReference.pipeFilters includes IN_PIPELINE = 1', () => {
    const data = loadExamples();
    assert.ok(data._filterReference.pipeFilters.includes('IN_PIPELINE = 1'));
  });

  it('_filterReference.pipeFilters includes IS_CY_RPT_HIER = 1', () => {
    const data = loadExamples();
    assert.ok(data._filterReference.pipeFilters.includes('IS_CY_RPT_HIER = 1'));
  });
});
