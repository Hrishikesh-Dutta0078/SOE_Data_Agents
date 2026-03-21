const test = require('node:test');
const assert = require('node:assert/strict');

test('cache: set and get', () => {
  const cache = require('../services/dashboardCache');
  cache._reset();
  cache.set('sess1', 'hash1', { profile: { test: true }, tileData: null });
  const result = cache.get('sess1', 'hash1');
  assert.ok(result);
  assert.equal(result.profile.test, true);
});

test('cache: getByKey', () => {
  const cache = require('../services/dashboardCache');
  cache._reset();
  cache.set('sess1', 'hash1', { profile: { a: 1 }, tileData: null });
  const result = cache.getByKey('sess1:hash1');
  assert.ok(result);
  assert.equal(result.profile.a, 1);
});

test('cache: miss returns null', () => {
  const cache = require('../services/dashboardCache');
  cache._reset();
  const result = cache.get('sess1', 'nonexistent');
  assert.equal(result, null);
});

test('cache: LRU eviction at 20 entries', () => {
  const cache = require('../services/dashboardCache');
  cache._reset();
  for (let i = 0; i < 25; i++) {
    cache.set('sess1', `hash${i}`, { profile: { i }, tileData: null });
  }
  assert.equal(cache.get('sess1', 'hash0'), null);
  assert.equal(cache.get('sess1', 'hash4'), null);
  assert.ok(cache.get('sess1', 'hash5'));
  assert.ok(cache.get('sess1', 'hash24'));
});

test('cache: clearSession', () => {
  const cache = require('../services/dashboardCache');
  cache._reset();
  cache.set('sess1', 'h1', { profile: {}, tileData: null });
  cache.set('sess2', 'h2', { profile: {}, tileData: null });
  cache.clearSession('sess1');
  assert.equal(cache.get('sess1', 'h1'), null);
  assert.ok(cache.get('sess2', 'h2'));
});
