const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

describe('statusAssessment', () => {
  let statusAssessment;

  beforeEach(async () => {
    delete require.cache[require.resolve('../server/vectordb/definitionsFetcher')];
    const fetcher = require('../server/vectordb/definitionsFetcher');
    await fetcher.loadDefinitionsAsync();

    delete require.cache[require.resolve('../server/utils/statusAssessment')];
    statusAssessment = require('../server/utils/statusAssessment');
  });

  it('maps explicit quality columns to deterministic statuses', () => {
    const execution = {
      columns: ['REP_NAME', 'Pipe', 'Quota', 'Coverage_Ratio', 'Coverage_Quality'],
      rowCount: 3,
      rows: [
        { REP_NAME: 'North', Pipe: 3200000, Quota: 1000000, Coverage_Ratio: 3.2, Coverage_Quality: 'Green' },
        { REP_NAME: 'West', Pipe: 2200000, Quota: 1000000, Coverage_Ratio: 2.2, Coverage_Quality: 'Yellow' },
        { REP_NAME: 'East', Pipe: 1700000, Quota: 1000000, Coverage_Ratio: 1.7, Coverage_Quality: 'Red' },
      ],
    };

    const result = statusAssessment.buildDeterministicStatusAssessment(execution);

    assert.equal(result.supported, true);
    assert.equal(result.basis.type, 'quality_column');
    assert.deepEqual(
      result.execution.rows.map((row) => row.Computed_Status),
      ['On Track', 'At Risk', 'Behind'],
    );
    assert.ok(result.tableMarkdown.includes('| Status |'));
  });

  it('computes coverage status from ratio columns', () => {
    const execution = {
      columns: ['REP_NAME', 'Coverage_Ratio'],
      rowCount: 3,
      rows: [
        { REP_NAME: 'North', Coverage_Ratio: 2.6 },
        { REP_NAME: 'West', Coverage_Ratio: 2.2 },
        { REP_NAME: 'East', Coverage_Ratio: 1.8 },
      ],
    };

    const result = statusAssessment.buildDeterministicStatusAssessment(execution);

    assert.equal(result.supported, true);
    assert.equal(result.basis.type, 'ratio_column');
    assert.equal(result.basis.thresholdType, 'coverage');
    assert.deepEqual(
      result.execution.rows.map((row) => row.Computed_Status),
      ['On Track', 'At Risk', 'Behind'],
    );
  });

  it('computes creation status from actual versus target columns', () => {
    const execution = {
      columns: ['REP_NAME', 'GrossCreationPipe', 'GrossCreationTarget'],
      rowCount: 3,
      rows: [
        { REP_NAME: 'North', GrossCreationPipe: 2600000, GrossCreationTarget: 1000000 },
        { REP_NAME: 'West', GrossCreationPipe: 2200000, GrossCreationTarget: 1000000 },
        { REP_NAME: 'East', GrossCreationPipe: 1800000, GrossCreationTarget: 1000000 },
      ],
    };

    const result = statusAssessment.buildDeterministicStatusAssessment(execution);

    assert.equal(result.supported, true);
    assert.equal(result.basis.type, 'actual_target_pair');
    assert.equal(result.basis.thresholdType, 'creation');
    assert.deepEqual(
      result.execution.rows.map((row) => row.Computed_Status),
      ['On Track', 'At Risk', 'Behind'],
    );
  });

  it('returns unsupported when the dataset has no deterministic status basis', () => {
    const execution = {
      columns: ['Deal', 'Rep', 'Stage'],
      rowCount: 2,
      rows: [
        { Deal: 'A', Rep: 'Alice', Stage: 'S4' },
        { Deal: 'B', Rep: 'Bob', Stage: 'S5' },
      ],
    };

    const result = statusAssessment.buildDeterministicStatusAssessment(execution);

    assert.equal(result.supported, false);
    assert.equal(result.tableMarkdown, null);
    assert.ok(!('Computed_Status' in result.execution.rows[0]));
  });
});
