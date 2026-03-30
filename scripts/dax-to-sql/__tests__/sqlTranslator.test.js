// scripts/dax-to-sql/__tests__/sqlTranslator.test.js
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { translateMeasure, createTranslationContext } = require('../sqlTranslator');
const { TABLE_MAP, TABLE_ALIAS } = require('../constants');

function makeCtx(overrides = {}) {
  return createTranslationContext({
    tableMap: TABLE_MAP,
    tableAlias: TABLE_ALIAS,
    joinMap: {
      'Pipeline': {
        'Snapshot Quarter': { fromCol: 'SNAPSHOT_DATE_ID', toCol: 'DATE_KEY' },
        'Sales Stage': { fromCol: 'SALES_STAGE_ID', toCol: 'SALES_STAGE_ID' },
        'Close Quarter': { fromCol: 'OPP_CLOSE_DATE_ID', toCol: 'DATE_KEY' },
        'Region Hierarchy': { fromCol: 'Region ID', toCol: 'REGION_ID' },
      },
      'Retention': {
        'Region Hierarchy': { fromCol: 'REGION_ID', toCol: 'REGION_ID' },
        'Renewal Quarter': { fromCol: 'Renewal_Date_ID', toCol: 'DATE_KEY' },
      },
      'Quota': {
        'Region Hierarchy': { fromCol: 'REGION_ID', toCol: 'REGION_ID' },
        'Close Quarter': { fromCol: 'QUOTA_FISCAL_QUARTER_ID', toCol: 'DATE_KEY' },
      },
    },
    resolvedMeasures: {},
    ...overrides,
  });
}

describe('translateMeasure — simple aggregations', () => {
  it('translates SUM(Table[Column])', () => {
    const ctx = makeCtx();
    const result = translateMeasure("SUM('Pipeline'[OPPTY])", ctx);
    assert.ok(result.sql.includes('SUM('));
    assert.ok(result.sql.includes('OPPTY'));
    assert.ok(result.sql.includes('vw_TF_EBI_P2S'));
    assert.ok(result.relatedTables.includes('vw_TF_EBI_P2S'));
  });

  it('translates DISTINCTCOUNT', () => {
    const ctx = makeCtx();
    const result = translateMeasure("DISTINCTCOUNT('Pipeline'[OPP_ID])", ctx);
    assert.ok(result.sql.includes('COUNT(DISTINCT'));
    assert.ok(result.sql.includes('OPP_ID'));
  });

  it('translates DIVIDE with NULLIF', () => {
    const ctx = makeCtx({
      resolvedMeasures: {
        'PIPE $': { sql: "(SELECT SUM(p.OPPTY) FROM vw_TF_EBI_P2S p)", relatedTables: ['vw_TF_EBI_P2S'], relatedColumns: ['vw_TF_EBI_P2S.OPPTY'] },
        'BOOKINGS TARGET': { sql: "(SELECT SUM(q.QUOTA_ACTUAL) FROM vw_TF_EBI_QUOTA q)", relatedTables: ['vw_TF_EBI_QUOTA'], relatedColumns: ['vw_TF_EBI_QUOTA.QUOTA_ACTUAL'] },
      },
    });
    const result = translateMeasure('DIVIDE([PIPE $], [BOOKINGS TARGET])', ctx);
    assert.ok(result.sql.includes('NULLIF'));
    assert.ok(result.sql.includes('vw_TF_EBI_P2S'));
    assert.ok(result.sql.includes('vw_TF_EBI_QUOTA'));
  });

  it('translates ROUND', () => {
    const ctx = makeCtx({
      resolvedMeasures: {
        'A': { sql: '(SELECT 1.234)', relatedTables: [], relatedColumns: [] },
      },
    });
    const result = translateMeasure('ROUND([A], 0)', ctx);
    assert.ok(result.sql.includes('ROUND'));
  });
});

describe('translateMeasure — CALCULATE', () => {
  it('translates CALCULATE with equality filter', () => {
    const ctx = makeCtx();
    const result = translateMeasure(
      "CALCULATE(SUM('Pipeline'[OPPTY]), 'Snapshot Quarter'[SNAPSHOT_WEEK_BKT] = \"0\")",
      ctx
    );
    assert.ok(result.sql.includes('SUM('));
    assert.ok(result.sql.includes('OPPTY'));
    assert.ok(result.sql.includes("SNAPSHOT_WEEK_BKT"));
    assert.ok(result.sql.includes("'0'") || result.sql.includes("= '0'"));
  });

  it('translates CALCULATE with IN filter', () => {
    const ctx = makeCtx();
    const result = translateMeasure(
      "CALCULATE(SUM('Pipeline'[OPPTY]), 'Sales Stage'[SALES_STAGE_GROUP] IN {\"S3\",\"S4\",\"S5+\"})",
      ctx
    );
    assert.ok(result.sql.includes('IN ('));
    assert.ok(result.sql.includes("'S3'"));
  });
});

describe('translateMeasure — SWITCH', () => {
  it('translates SWITCH(TRUE(), ...) to CASE WHEN', () => {
    const ctx = makeCtx({
      resolvedMeasures: {
        'A': { sql: '(SELECT 0.5)', relatedTables: [], relatedColumns: [] },
      },
    });
    const result = translateMeasure('SWITCH(TRUE(), [A] < 0.01, 0, [A] >= 0.01, [A], [A])', ctx);
    assert.ok(result.sql.includes('CASE'));
    assert.ok(result.sql.includes('WHEN'));
  });
});

describe('translateMeasure — IF', () => {
  it('translates IF to CASE WHEN', () => {
    const ctx = makeCtx({
      resolvedMeasures: {
        'X': { sql: '(SELECT 1)', relatedTables: [], relatedColumns: [] },
      },
    });
    const result = translateMeasure('IF([X] > 0, [X], 0)', ctx);
    assert.ok(result.sql.includes('CASE'));
    assert.ok(result.sql.includes('WHEN'));
  });
});

describe('translateMeasure — COUNTROWS + FILTER', () => {
  it('translates COUNTROWS(FILTER(table, cond))', () => {
    const ctx = makeCtx();
    const result = translateMeasure(
      "COUNTROWS(FILTER('Region Hierarchy', 'Region Hierarchy'[REP_IN_PLACE] = \"In Place\"))",
      ctx
    );
    assert.ok(result.sql.includes('COUNT'));
    assert.ok(result.sql.includes('vw_TD_EBI_REGION_RPT'));
    assert.ok(result.sql.includes("'In Place'") || result.sql.includes("In Place"));
  });
});

describe('translateMeasure — SELECTEDVALUE', () => {
  it('translates SELECTEDVALUE as parameterized filter', () => {
    const ctx = makeCtx();
    const result = translateMeasure("SELECTEDVALUE('Region Hierarchy'[SALES_REGION])", ctx);
    assert.ok(result.sql.includes('@param') || result.sql.includes('/* filter'));
  });
});

describe('confidence assignment', () => {
  it('assigns mapped for clean translations', () => {
    const ctx = makeCtx();
    const result = translateMeasure("SUM('Pipeline'[OPPTY])", ctx);
    assert.equal(result.confidence, 'mapped');
  });

  it('assigns inferred for SELECTEDVALUE usage', () => {
    const ctx = makeCtx();
    const result = translateMeasure("SELECTEDVALUE('Region Hierarchy'[SALES_REGION])", ctx);
    assert.equal(result.confidence, 'inferred');
  });
});
