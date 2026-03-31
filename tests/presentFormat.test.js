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

  describe('INSIGHT_SYSTEM prompt template', () => {
    it('contains dual format instructions', async () => {
      const inputs = {
        partialResultsNote: '',
        question: 'How is my pipeline?',
        questionCategory: 'WHAT_HAPPENED',
        questionSubCategory: 'overview',
        categoryGuidance: 'Test guidance',
        thresholdContext: 'Test thresholds',
        columns: 'Coverage, Target',
        rowCount: '5',
        columnStats: 'Coverage (numeric): min=1.5, max=3.2',
        sampleCount: '5',
        sampleData: '[]',
      };
      const messages = await presentPrompts.insightPrompt.formatMessages(inputs);
      const systemMsg = messages[0].content;
      assert.ok(systemMsg.includes('Format A'), 'should contain Format A');
      assert.ok(systemMsg.includes('Format B'), 'should contain Format B');
      assert.ok(systemMsg.includes('Narrative + Table'), 'should mention Narrative + Table');
      assert.ok(systemMsg.includes('Bullet'), 'should mention Bullet format');
      assert.ok(systemMsg.includes('Status Key'), 'should include status key');
      assert.ok(systemMsg.includes('On Track'), 'should define On Track');
      assert.ok(systemMsg.includes('At Risk'), 'should define At Risk');
      assert.ok(systemMsg.includes('Behind'), 'should define Behind');
    });

    it('injects thresholdContext into formatted messages', async () => {
      const inputs = {
        partialResultsNote: '',
        question: 'test',
        questionCategory: 'GENERAL',
        questionSubCategory: 'general',
        categoryGuidance: 'Test guidance',
        thresholdContext: 'Coverage: On Track >= 2.5x',
        columns: 'A',
        rowCount: '1',
        columnStats: '',
        sampleCount: '1',
        sampleData: '[]',
      };
      const messages = await presentPrompts.insightPrompt.formatMessages(inputs);
      const systemMsg = messages[0].content;
      assert.ok(systemMsg.includes('Coverage: On Track >= 2.5x'));
    });
  });
});
