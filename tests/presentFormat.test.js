const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

describe('presentFormat', () => {
  let presentPrompts;

  beforeEach(async () => {
    delete require.cache[require.resolve('../server/prompts/present')];
    delete require.cache[require.resolve('../server/vectordb/definitionsFetcher')];

    // Load definitions first
    const fetcher = require('../server/vectordb/definitionsFetcher');
    await fetcher.loadDefinitionsAsync();

    presentPrompts = require('../server/prompts/present');
  });

  describe('buildThresholdContext', () => {
    it('returns a formatted threshold text block', () => {
      const result = presentPrompts.buildThresholdContext();
      assert.ok(result.includes('KPI Thresholds for Status Assessment:'));
      assert.ok(result.includes('Coverage:'));
      assert.ok(result.includes('2.5'));
      assert.ok(result.includes('Deal Sensei Score:'));
      assert.ok(result.includes('65'));
    });

    it('includes all four threshold types', () => {
      const result = presentPrompts.buildThresholdContext();
      assert.ok(result.includes('Coverage:'));
      assert.ok(result.includes('Creation Coverage:'));
      assert.ok(result.includes('Deal Sensei Score:'));
      assert.ok(result.includes('Propensity to Buy:'));
    });
  });
});
