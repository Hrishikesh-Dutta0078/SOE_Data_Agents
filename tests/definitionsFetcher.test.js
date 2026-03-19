const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

describe('definitionsFetcher', () => {
  let fetcher;

  beforeEach(() => {
    delete require.cache[require.resolve('../server/vectordb/definitionsFetcher')];
    fetcher = require('../server/vectordb/definitionsFetcher');
  });

  describe('loadDefinitions', () => {
    it('returns definitions object after async load', async () => {
      const defs = await fetcher.loadDefinitionsAsync();
      assert.ok(defs);
      assert.ok(defs.thresholds);
      assert.ok(defs.mandatoryFilters);
      assert.ok(defs.abbreviations);
      assert.ok(defs.salesStageMapping);
    });
  });

  describe('getMandatoryFiltersForTables', () => {
    it('returns filters matching provided table names', async () => {
      await fetcher.loadDefinitionsAsync();
      const filters = fetcher.getMandatoryFiltersForTables(['vw_td_ebi_region_rpt']);
      assert.ok(filters.length > 0);
      const ids = filters.map(f => f.id);
      assert.ok(ids.includes('role_type'));
      assert.ok(ids.includes('sales_team_bu'));
      assert.ok(ids.includes('exclude_dme_region'));
      assert.ok(ids.includes('exclude_teams'));
    });

    it('returns pay_measure for fact tables', async () => {
      await fetcher.loadDefinitionsAsync();
      const filters = fetcher.getMandatoryFiltersForTables(['vw_TF_EBI_P2S']);
      const ids = filters.map(f => f.id);
      assert.ok(ids.includes('pay_measure'));
    });

    it('returns only always=true filters by default', async () => {
      await fetcher.loadDefinitionsAsync();
      const filters = fetcher.getMandatoryFiltersForTables(['vw_td_ebi_region_rpt']);
      const alwaysFilters = filters.filter(f => f.always);
      assert.equal(filters.length, alwaysFilters.length);
    });

    it('includes conditional filters when includeConditional=true', async () => {
      await fetcher.loadDefinitionsAsync();
      const filters = fetcher.getMandatoryFiltersForTables(
        ['vw_td_ebi_region_rpt'], { includeConditional: true }
      );
      const ids = filters.map(f => f.id);
      assert.ok(ids.includes('global_region'));
      assert.ok(ids.includes('dummy_terr'));
    });

    it('returns empty array for empty table list', async () => {
      await fetcher.loadDefinitionsAsync();
      const filters = fetcher.getMandatoryFiltersForTables([]);
      assert.equal(filters.length, 0);
    });
  });

  describe('getThreshold', () => {
    it('returns coverage thresholds', async () => {
      await fetcher.loadDefinitionsAsync();
      const t = fetcher.getThreshold('coverage');
      assert.equal(t.green, 2.5);
      assert.equal(t.yellow, 2.0);
      assert.equal(t.label, 'Coverage_Quality');
    });

    it('returns dsScore thresholds', async () => {
      await fetcher.loadDefinitionsAsync();
      const t = fetcher.getThreshold('dsScore');
      assert.equal(t.high, 65);
      assert.equal(t.medium, 40);
    });

    it('returns empty object for unknown type', async () => {
      await fetcher.loadDefinitionsAsync();
      const t = fetcher.getThreshold('nonexistent');
      assert.deepEqual(t, {});
    });
  });

  describe('getAbbreviations', () => {
    it('returns abbreviation map', async () => {
      await fetcher.loadDefinitionsAsync();
      const abbr = fetcher.getAbbreviations();
      assert.equal(abbr.W, 'Won');
      assert.equal(abbr.GNARR, 'Gross New ARR');
      assert.equal(abbr['SS5+'], 'Sales Stage 5 and above');
    });
  });

  describe('getSalesStageMapping', () => {
    it('returns id-to-name mapping', async () => {
      await fetcher.loadDefinitionsAsync();
      const mapping = fetcher.getSalesStageMapping();
      assert.equal(mapping['5'], 'S4');
      assert.equal(mapping['6'], 'S3');
      assert.equal(mapping['1'], 'Closed - Booked');
    });
  });
});
