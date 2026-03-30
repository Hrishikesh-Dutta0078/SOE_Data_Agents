'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { readExcel } = require('../excelReader');

const EXCEL_PATH = path.resolve(__dirname, '../../../RTB Dataverse Technical Document 3.xlsx');

describe('excelReader', () => {
  let data;

  it('reads the Excel without error', () => {
    data = readExcel(EXCEL_PATH);
    assert.ok(data);
  });

  it('extracts all 313 measures', () => {
    assert.equal(data.measures.length, 313);
  });

  it('parses measure fields correctly', () => {
    const pipe = data.measures.find(m => m.name === 'PIPE $');
    assert.ok(pipe, 'PIPE $ measure should exist');
    assert.equal(pipe.tableName, '_Pipeline Measures');
    assert.ok(pipe.expression.length > 10, 'expression should be non-trivial');
    assert.equal(typeof pipe.isHidden, 'boolean');
  });

  it('builds tableMap with key entries', () => {
    assert.equal(data.tableMap['Pipeline'], 'vw_TF_EBI_P2S');
    assert.equal(data.tableMap['Region Hierarchy'], 'vw_TD_EBI_REGION_RPT');
    assert.equal(data.tableMap['Snapshot Quarter'], 'vw_EBI_Caldate');
    assert.equal(data.tableMap['Sales Stage'], 'vw_EBI_SALES_STAGE');
  });

  it('builds columnsByTable with Pipeline columns', () => {
    const pipeCols = data.columnsByTable['Pipeline'];
    assert.ok(pipeCols, 'Pipeline columns should exist');
    assert.ok(pipeCols.has('OPPTY'), 'Pipeline should have OPPTY column');
    assert.ok(pipeCols.has('SALES_STAGE_ID'), 'Pipeline should have SALES_STAGE_ID');
  });

  it('builds joinMap with Pipeline→Snapshot Quarter relationship', () => {
    const pipeJoins = data.joinMap['Pipeline'];
    assert.ok(pipeJoins, 'Pipeline joins should exist');
    const sq = pipeJoins['Snapshot Quarter'];
    assert.ok(sq, 'Pipeline→Snapshot Quarter join should exist');
    assert.equal(sq.fromCol, 'SNAPSHOT_DATE_ID');
    assert.equal(sq.toCol, 'DATE_KEY');
  });

  it('normalizes newlines in expressions', () => {
    const m = data.measures.find(m => m.expression.includes('CALCULATE'));
    assert.ok(m, 'should find a CALCULATE measure');
    assert.ok(!m.expression.includes('\r\r\n'), 'should not have \\r\\r\\n');
  });
});
