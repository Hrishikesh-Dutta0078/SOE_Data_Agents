'use strict';

const MAX_PER_SESSION = 20;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const MAX_AGE_MS = 30 * 60 * 1000;

const _store = new Map();
const _sessionKeys = new Map();

function _cacheKey(sessionId, sqlHash) {
  return `${sessionId}:${sqlHash}`;
}

function set(sessionId, sqlHash, { profile, tileData }) {
  const key = _cacheKey(sessionId, sqlHash);
  _store.set(key, { profile, tileData, timestamp: Date.now() });

  if (!_sessionKeys.has(sessionId)) _sessionKeys.set(sessionId, []);
  const keys = _sessionKeys.get(sessionId);
  const idx = keys.indexOf(key);
  if (idx !== -1) keys.splice(idx, 1);
  keys.push(key);

  while (keys.length > MAX_PER_SESSION) {
    const evicted = keys.shift();
    _store.delete(evicted);
  }
}

function get(sessionId, sqlHash) {
  const key = _cacheKey(sessionId, sqlHash);
  return _store.get(key) || null;
}

function getByKey(cacheKey) {
  return _store.get(cacheKey) || null;
}

function invalidate(sessionId, sqlHash) {
  const key = _cacheKey(sessionId, sqlHash);
  _store.delete(key);
  const keys = _sessionKeys.get(sessionId);
  if (keys) {
    const idx = keys.indexOf(key);
    if (idx !== -1) keys.splice(idx, 1);
  }
}

function clearSession(sessionId) {
  const keys = _sessionKeys.get(sessionId) || [];
  for (const key of keys) _store.delete(key);
  _sessionKeys.delete(sessionId);
}

function _sweep() {
  const now = Date.now();
  for (const [key, entry] of _store) {
    if (now - entry.timestamp > MAX_AGE_MS) {
      _store.delete(key);
      for (const [, keys] of _sessionKeys) {
        const idx = keys.indexOf(key);
        if (idx !== -1) keys.splice(idx, 1);
      }
    }
  }
}

function _reset() {
  _store.clear();
  _sessionKeys.clear();
}

const _sweepTimer = setInterval(_sweep, SWEEP_INTERVAL_MS);
_sweepTimer.unref();

module.exports = { set, get, getByKey, invalidate, clearSession, _reset };
