const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const express = require('express');
const session = require('express-session');

const voiceRouter = require('../routes/voice');
const { voiceRateLimiter } = require('../middleware/voiceRateLimit');

/* ── Helper: lightweight Express app for testing ────────────────── */

function createTestApp(opts = {}) {
  const app = express();

  // Session middleware is optional; the rate-limit test skips it so the
  // limiter falls back to ipKeyGenerator (all requests share one IP key).
  if (opts.withSession !== false) {
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false },
      })
    );
  }

  if (opts.withRateLimit) {
    app.use('/api/voice', voiceRateLimiter, voiceRouter);
  } else {
    app.use('/api/voice', voiceRouter);
  }

  return app;
}

/**
 * Helper that makes an HTTP GET request and returns { statusCode, body }.
 */
function get(server, urlPath) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const req = http.get(
      { hostname: '127.0.0.1', port: addr.port, path: urlPath },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ statusCode: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
  });
}

/* ── 1. Phrases endpoint ────────────────────────────────────────── */

describe('GET /api/voice/phrases', () => {
  let server;

  before((_, done) => {
    const app = createTestApp();
    server = app.listen(0, '127.0.0.1', done);
  });

  after((_, done) => {
    server.close(done);
  });

  it('returns an array of phrases', async () => {
    const { statusCode, body } = await get(server, '/api/voice/phrases');
    assert.equal(statusCode, 200);
    assert.ok(Array.isArray(body.phrases), 'phrases should be an array');
  });

  it('phrases array is not empty', async () => {
    const { body } = await get(server, '/api/voice/phrases');
    assert.ok(body.phrases.length > 0, 'phrases should not be empty');
  });

  it('phrases array is <= 500 items', async () => {
    const { body } = await get(server, '/api/voice/phrases');
    assert.ok(body.phrases.length <= 500, `expected <= 500, got ${body.phrases.length}`);
  });

  it('contains table names (start with vw_)', async () => {
    const { body } = await get(server, '/api/voice/phrases');
    const hasViewPrefix = body.phrases.some((p) => /^vw_/i.test(p));
    assert.ok(hasViewPrefix, 'at least one phrase should start with vw_');
  });

  it('contains SQL keywords (e.g., GROUP BY) or list is at capacity', async () => {
    const { body } = await get(server, '/api/voice/phrases');
    const SQL_KEYWORDS = [
      'GROUP BY', 'WHERE', 'JOIN', 'HAVING', 'ORDER BY',
      'SUM', 'COUNT', 'AVG', 'DISTINCT', 'LIKE',
      'BETWEEN', 'LEFT JOIN', 'INNER JOIN',
    ];
    const hasSqlKeyword = body.phrases.some((p) => SQL_KEYWORDS.includes(p));
    // SQL keywords are appended last; when the 500-item limit is reached
    // with higher-priority domain terms they may be displaced — that is
    // valid behaviour, so we also accept a full list.
    const atCapacity = body.phrases.length === 500;
    assert.ok(
      hasSqlKeyword || atCapacity,
      'phrases should include SQL keywords or be at the 500-item capacity'
    );
  });

  it('contains KPI abbreviations (e.g., QTD or YTD)', async () => {
    const { body } = await get(server, '/api/voice/phrases');
    const hasKpi = body.phrases.some((p) => p === 'QTD' || p === 'YTD');
    assert.ok(hasKpi, 'phrases should include QTD or YTD');
  });
});

/* ── 2. Token endpoint ──────────────────────────────────────────── */

describe('GET /api/voice/token', () => {
  let server;
  let savedKey;
  let savedRegion;

  before((_, done) => {
    // Save current env vars and ensure they are unset for the test
    savedKey = process.env.AZURE_SPEECH_KEY;
    savedRegion = process.env.AZURE_SPEECH_REGION;
    delete process.env.AZURE_SPEECH_KEY;
    delete process.env.AZURE_SPEECH_REGION;

    const app = createTestApp();
    server = app.listen(0, '127.0.0.1', done);
  });

  after((_, done) => {
    // Restore original env vars
    if (savedKey !== undefined) process.env.AZURE_SPEECH_KEY = savedKey;
    if (savedRegion !== undefined) process.env.AZURE_SPEECH_REGION = savedRegion;
    server.close(done);
  });

  it('returns 503 when AZURE_SPEECH_KEY and AZURE_SPEECH_REGION are not set', async () => {
    const { statusCode, body } = await get(server, '/api/voice/token');
    assert.equal(statusCode, 503);
    assert.ok(body.error, 'response should contain an error field');
  });
});

/* ── 3. Rate limiting ───────────────────────────────────────────── */

describe('Voice rate limiting', () => {
  let server;

  before((_, done) => {
    // Skip session so the rate limiter falls back to ipKeyGenerator;
    // all requests from 127.0.0.1 then share a single rate-limit bucket.
    const app = createTestApp({ withRateLimit: true, withSession: false });
    server = app.listen(0, '127.0.0.1', done);
  });

  after((_, done) => {
    server.close(done);
  });

  it('returns 429 after exceeding the rate limit (11 rapid requests)', async () => {
    const requests = [];
    for (let i = 0; i < 11; i++) {
      requests.push(get(server, '/api/voice/phrases'));
    }

    const results = await Promise.all(requests);
    const has429 = results.some((r) => r.statusCode === 429);
    assert.ok(has429, 'at least one request should receive a 429 status code');
  });
});
