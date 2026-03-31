'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const {
  generateId,
  generateAliases,
  generateSection,
  generateDefinition,
} = require('../metadataGenerator');

describe('metadataGenerator', () => {
  describe('generateId', () => {
    test('converts PIPE $ to pipe_dollar', () => {
      assert.equal(generateId('PIPE $'), 'pipe_dollar');
    });

    test('converts W+F+UC % to w_f_uc_pct', () => {
      assert.equal(generateId('W+F+UC %'), 'w_f_uc_pct');
    });

    test('converts OPP # to opp_count', () => {
      assert.equal(generateId('OPP #'), 'opp_count');
    });

    test('converts CY PROJECTION % to cy_projection_pct', () => {
      assert.equal(generateId('CY PROJECTION %'), 'cy_projection_pct');
    });

    test('converts ACTIVE & UPDATED % to active_and_updated_pct', () => {
      assert.equal(generateId('ACTIVE & UPDATED %'), 'active_and_updated_pct');
    });

    test('handles complex name with multiple special characters', () => {
      assert.equal(generateId('ARR/OPP $ +/-'), 'arr_opp_dollar');
    });

    test('converts -VE suffix to ve', () => {
      assert.equal(generateId('DELTA -VE'), 'delta_ve');
    });

    test('collapses multiple underscores', () => {
      assert.equal(generateId('A___B   C'), 'a_b_c');
    });

    test('removes leading and trailing underscores', () => {
      assert.equal(generateId('___TEST___'), 'test');
    });

    test('handles parentheses and slashes', () => {
      assert.equal(generateId('(W+F+UC)/QUOTA %'), 'w_f_uc_quota_pct');
    });
  });

  describe('generateAliases', () => {
    test('generates base lowercase alias', () => {
      const aliases = generateAliases('SIMPLE NAME');
      assert.ok(aliases.includes('simple name'));
    });

    test('expands $ to dollars', () => {
      const aliases = generateAliases('PIPE $');
      assert.ok(aliases.includes('pipe dollars'));
    });

    test('expands % to percent', () => {
      const aliases = generateAliases('W+F+UC %');
      assert.ok(aliases.includes('w f uc percent'));
    });

    test('adds pct variant for % measures', () => {
      const aliases = generateAliases('W+F+UC %');
      assert.ok(aliases.includes('w f uc pct'));
    });

    test('expands YTD abbreviation', () => {
      const aliases = generateAliases('BOOKINGS YTD');
      assert.ok(aliases.includes('bookings year to date'));
    });

    test('expands QTD abbreviation', () => {
      const aliases = generateAliases('PIPE QTD');
      assert.ok(aliases.includes('pipe quarter to date'));
    });

    test('expands W+F+UC abbreviation', () => {
      const aliases = generateAliases('W+F+UC %');
      assert.ok(aliases.includes('won forecast upside committed percent'));
    });

    test('expands multiple abbreviations', () => {
      const aliases = generateAliases('CY QTD BOOKINGS');
      assert.ok(aliases.some(a => a.includes('current year')));
      assert.ok(aliases.some(a => a.includes('quarter to date')));
    });

    test('removes alias matching original name', () => {
      const aliases = generateAliases('test name');
      assert.ok(!aliases.includes('test name'));
    });

    test('filters out aliases shorter than 3 chars', () => {
      const aliases = generateAliases('A B');
      assert.ok(aliases.every(a => a.length >= 3));
    });

    test('handles # expansion to count', () => {
      const aliases = generateAliases('OPP #');
      assert.ok(aliases.includes('opp count'));
    });

    test('handles complex measure with multiple special chars', () => {
      const aliases = generateAliases('ARR $ YTD');
      // Should have the fully expanded version (both ARR and YTD expanded)
      assert.ok(aliases.includes('annual recurring revenue dollars year to date'));
    });

    test('expands ARR abbreviation', () => {
      const aliases = generateAliases('ARR TOTAL');
      assert.ok(aliases.includes('annual recurring revenue total'));
    });
  });

  describe('generateSection', () => {
    test('maps _Pipeline Measures to Pipeline', () => {
      assert.equal(generateSection('_Pipeline Measures'), 'Pipeline');
    });

    test('maps _Performance Measures to Performance & Participation', () => {
      assert.equal(generateSection('_Performance Measures'), 'Performance & Participation');
    });

    test('maps _TPT Measures to Territory Planning (TPT)', () => {
      assert.equal(generateSection('_TPT Measures'), 'Territory Planning (TPT)');
    });

    test('maps _Retention Measures to Retention', () => {
      assert.equal(generateSection('_Retention Measures'), 'Retention');
    });

    test('maps unknown table to Other', () => {
      assert.equal(generateSection('Unknown Table'), 'Other');
    });

    test('maps _OCC Measures to SLM Performance', () => {
      assert.equal(generateSection('_OCC Measures'), 'SLM Performance');
    });

    test('maps _Enablement Measures to Enablement', () => {
      assert.equal(generateSection('_Enablement Measures'), 'Enablement');
    });
  });

  describe('generateDefinition', () => {
    test('generates definition for SUM aggregation', () => {
      const def = generateDefinition('TOTAL REVENUE', 'SELECT SUM(revenue) FROM sales');
      assert.ok(def.includes('TOTAL REVENUE'));
      assert.ok(def.includes('sum metric'));
    });

    test('generates definition for COUNT aggregation', () => {
      const def = generateDefinition('OPP COUNT', 'SELECT COUNT(opp_id) FROM opps');
      assert.ok(def.includes('OPP COUNT'));
      assert.ok(def.includes('count metric'));
    });

    test('generates definition for AVG aggregation', () => {
      const def = generateDefinition('AVG DEAL SIZE', 'SELECT AVG(deal_size) FROM deals');
      assert.ok(def.includes('AVG DEAL SIZE'));
      assert.ok(def.includes('average metric'));
    });

    test('generates definition for ratio (NULLIF)', () => {
      const def = generateDefinition('CONVERSION %', 'SELECT SUM(won) * 1.0 / NULLIF(SUM(total), 0) FROM opps');
      assert.ok(def.includes('CONVERSION percentage'));
      assert.ok(def.includes('ratio metric'));
    });

    test('generates definition for CASE conditional', () => {
      const def = generateDefinition('STATUS FLAG', 'SELECT CASE WHEN status = 1 THEN 1 ELSE 0 END FROM table');
      assert.ok(def.includes('STATUS FLAG'));
      assert.ok(def.includes('conditional metric'));
    });

    test('generates definition for RANK', () => {
      const def = generateDefinition('SALES RANK', 'SELECT RANK() OVER (ORDER BY sales DESC) FROM reps');
      assert.ok(def.includes('SALES RANK'));
      assert.ok(def.includes('ranked metric'));
    });

    test('replaces $ with dollar amount in readable name', () => {
      const def = generateDefinition('PIPE $', 'SELECT SUM(amount) FROM pipeline');
      assert.ok(def.includes('PIPE dollar amount'));
    });

    test('replaces % with percentage in readable name', () => {
      const def = generateDefinition('WIN %', 'SELECT AVG(win_rate) FROM sales');
      assert.ok(def.includes('WIN percentage'));
    });

    test('replaces # with count in readable name', () => {
      const def = generateDefinition('OPP #', 'SELECT COUNT(*) FROM opps');
      assert.ok(def.includes('OPP count'));
    });

    test('handles MAX aggregation', () => {
      const def = generateDefinition('MAX DEAL', 'SELECT MAX(deal_size) FROM deals');
      assert.ok(def.includes('maximum metric'));
    });

    test('handles MIN aggregation', () => {
      const def = generateDefinition('MIN DEAL', 'SELECT MIN(deal_size) FROM deals');
      assert.ok(def.includes('minimum metric'));
    });

    test('defaults to calculated for complex SQL', () => {
      const def = generateDefinition('COMPLEX METRIC', 'SELECT (a + b) * c FROM table');
      assert.ok(def.includes('calculated metric'));
    });
  });
});
