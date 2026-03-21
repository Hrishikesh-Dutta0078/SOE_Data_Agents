const test = require('node:test');
const assert = require('node:assert/strict');

test('profileDataNode: Path B profiles from queries', async () => {
  const { profileDataNode } = require('../graph/nodes/profileData');
  const state = {
    sessionId: 'test-session',
    dashboardHasDataRequest: true,
    queries: [{
      subQuestion: 'Pipeline by region',
      sql: 'SELECT Region, Amount FROM deals',
      execution: {
        success: true,
        rows: [{ Region: 'AMERICAS', Amount: 1000 }, { Region: 'EMEA', Amount: 2000 }],
        columns: ['Region', 'Amount'],
        rowCount: 2,
      },
    }],
    execution: null,
    conversationHistory: [],
    dataProfiles: null,
  };
  const result = await profileDataNode(state);
  assert.ok(result.dataProfiles);
  assert.equal(result.dataProfiles.length, 1);
  assert.ok(result.dataProfiles[0].columns.length === 2);
  assert.ok(result.profileCacheKey);
});

test('profileDataNode: skips when dataProfiles already set', async () => {
  const { profileDataNode } = require('../graph/nodes/profileData');
  const state = {
    sessionId: 'test',
    dataProfiles: [{ existing: true }],
    queries: [],
    execution: null,
    conversationHistory: [],
    dashboardHasDataRequest: false,
  };
  const result = await profileDataNode(state);
  assert.deepEqual(result.dataProfiles, [{ existing: true }]);
});
