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

  describe('CATEGORY_INSIGHT_GUIDANCE call-to-action', () => {
    it('WHAT_TO_DO guidance includes call-to-action instruction', () => {
      const guidance = presentPrompts.CATEGORY_INSIGHT_GUIDANCE;
      assert.ok(guidance.WHAT_TO_DO.includes('Call-to-Action'));
      assert.ok(guidance.WHAT_TO_DO.includes('2-3 specific'));
      assert.ok(guidance.WHAT_TO_DO.includes('data-backed'));
    });

    it('WHY guidance includes lighter action instruction', () => {
      const guidance = presentPrompts.CATEGORY_INSIGHT_GUIDANCE;
      assert.ok(guidance.WHY.includes('1-2 specific actions'));
    });

    it('WHAT_HAPPENED guidance does NOT include call-to-action', () => {
      const guidance = presentPrompts.CATEGORY_INSIGHT_GUIDANCE;
      assert.ok(!guidance.WHAT_HAPPENED.includes('Call-to-Action'));
    });
  });

  describe('buildInsightInputs thresholdContext', () => {
    it('single-query inputs include thresholdContext', () => {
      const state = {
        question: 'How is coverage?',
        questionCategory: 'WHAT_HAPPENED',
        questionSubCategory: 'overview',
        execution: {
          columns: ['Coverage'],
          rows: [{ Coverage: 2.5 }],
          rowCount: 1,
        },
      };
      const result = presentPrompts.buildInsightInputs(state, [{ Coverage: 2.5 }]);
      assert.ok(result.thresholdContext, 'should have thresholdContext');
      assert.ok(result.thresholdContext.includes('Coverage:'));
    });
  });

  describe('buildMultiQueryInsightInputs thresholdContext', () => {
    it('multi-query inputs include thresholdContext', () => {
      const state = {
        question: 'How is my pipeline?',
        questionCategory: 'WHAT_HAPPENED',
        questionSubCategory: 'overview',
      };
      const allQueries = [{
        id: 'q1',
        subQuestion: 'Coverage?',
        purpose: 'check coverage',
        execution: {
          success: true,
          columns: ['Coverage'],
          rows: [{ Coverage: 2.5 }],
          rowCount: 1,
        },
      }];
      const result = presentPrompts.buildMultiQueryInsightInputs(state, allQueries);
      assert.ok(result.thresholdContext, 'should have thresholdContext');
      assert.ok(result.thresholdContext.includes('Coverage:'));
    });
  });

  describe('postProcessInsights', () => {
    let presentNode;

    beforeEach(() => {
      delete require.cache[require.resolve('../server/graph/nodes/present')];
      presentNode = require('../server/graph/nodes/present');
    });

    describe('dollar normalization', () => {
      it('converts $38,000,000 to $38M', () => {
        const result = presentNode.__testables.postProcessInsights('Revenue is $38,000,000 total');
        assert.ok(result.includes('$38M'), `Expected $38M, got: ${result}`);
      });

      it('converts $38000000 to $38M', () => {
        const result = presentNode.__testables.postProcessInsights('Revenue is $38000000 total');
        assert.ok(result.includes('$38M'), `Expected $38M, got: ${result}`);
      });

      it('converts $3,200,000 to $3.2M', () => {
        const result = presentNode.__testables.postProcessInsights('Gap is $3,200,000');
        assert.ok(result.includes('$3.2M'), `Expected $3.2M, got: ${result}`);
      });

      it('converts $150,000 to $150K', () => {
        const result = presentNode.__testables.postProcessInsights('Deal is $150,000');
        assert.ok(result.includes('$150K'), `Expected $150K, got: ${result}`);
      });

      it('leaves already-formatted $38M untouched', () => {
        const input = 'Revenue is $38M total';
        const result = presentNode.__testables.postProcessInsights(input);
        assert.equal(result, input);
      });

      it('leaves already-formatted $3.2K untouched', () => {
        const input = 'Deal is $3.2K';
        const result = presentNode.__testables.postProcessInsights(input);
        assert.equal(result, input);
      });

      it('leaves small amounts under $1,000 untouched', () => {
        const input = 'Value is $500';
        const result = presentNode.__testables.postProcessInsights(input);
        assert.equal(result, input);
      });
    });

    describe('status emoji normalization', () => {
      it('adds checkmark emoji to On Track in table rows', () => {
        const input = '| Coverage | 3.2x | On Track |';
        const result = presentNode.__testables.postProcessInsights(input);
        assert.ok(result.includes('✅ On Track'), `Expected emoji, got: ${result}`);
      });

      it('adds warning emoji to At Risk in table rows', () => {
        const input = '| W+F+UC | $87M | At Risk |';
        const result = presentNode.__testables.postProcessInsights(input);
        assert.ok(result.includes('⚠️ At Risk'), `Expected emoji, got: ${result}`);
      });

      it('adds red circle emoji to Behind in table rows', () => {
        const input = '| Creation | $62M | Behind |';
        const result = presentNode.__testables.postProcessInsights(input);
        assert.ok(result.includes('🔴 Behind'), `Expected emoji, got: ${result}`);
      });

      it('does not add emoji to status text outside tables', () => {
        const input = 'Coverage is On Track based on the data.';
        const result = presentNode.__testables.postProcessInsights(input);
        assert.ok(!result.includes('✅'), `Should not add emoji outside table: ${result}`);
      });

      it('does not double-add emoji if already present', () => {
        const input = '| Coverage | 3.2x | ✅ On Track |';
        const result = presentNode.__testables.postProcessInsights(input);
        const matches = result.match(/✅/g);
        assert.equal(matches.length, 1, `Should have exactly one checkmark: ${result}`);
      });
    });

    describe('passthrough', () => {
      it('returns empty string for empty input', () => {
        assert.equal(presentNode.__testables.postProcessInsights(''), '');
      });

      it('returns null/undefined as-is', () => {
        assert.equal(presentNode.__testables.postProcessInsights(null), null);
      });
    });
  });
});
