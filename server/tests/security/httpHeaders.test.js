/**
 * HTTP Security Headers Tests — CWE-693
 * Tests helmet configuration, CORS, session cookies, and rate limiting.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const INDEX_PATH = path.join(__dirname, '..', '..', 'index.js');

test('helmet is configured with Content-Security-Policy', () => {
  const source = fs.readFileSync(INDEX_PATH, 'utf8');
  assert.ok(source.includes('contentSecurityPolicy'), 'CSP should be configured in helmet');
  assert.ok(source.includes("defaultSrc"), 'CSP should define defaultSrc');
  assert.ok(source.includes("scriptSrc"), 'CSP should define scriptSrc');
  assert.ok(source.includes("frameAncestors"), 'CSP should define frameAncestors');
});

test('helmet is not using bare defaults (has explicit config)', () => {
  const source = fs.readFileSync(INDEX_PATH, 'utf8');
  // Should NOT just be app.use(helmet()) with no config
  assert.ok(!source.includes('app.use(helmet());'), 'Helmet should have explicit configuration, not bare defaults');
});

test('session cookie has httpOnly flag', () => {
  const source = fs.readFileSync(INDEX_PATH, 'utf8');
  assert.ok(source.includes('httpOnly: true'), 'Session cookie should be httpOnly');
});

test('session cookie has sameSite flag', () => {
  const source = fs.readFileSync(INDEX_PATH, 'utf8');
  assert.ok(source.includes("sameSite: 'lax'"), 'Session cookie should have sameSite=lax');
});

test('session cookie has secure flag conditional on HTTPS', () => {
  const source = fs.readFileSync(INDEX_PATH, 'utf8');
  assert.ok(source.includes('secure:'), 'Session cookie should have secure flag');
});

test('CORS is configured with origin whitelist', () => {
  const source = fs.readFileSync(INDEX_PATH, 'utf8');
  assert.ok(source.includes('ALLOWED_ORIGINS'), 'CORS should use ALLOWED_ORIGINS env var');
  assert.ok(source.includes('credentials: true'), 'CORS should enable credentials');
});

test('JSON body parser has size limit', () => {
  const source = fs.readFileSync(INDEX_PATH, 'utf8');
  assert.ok(source.includes("limit: '5mb'"), 'JSON parser should have 5mb limit');
});

test('rate limiting middleware is configured', () => {
  const source = fs.readFileSync(INDEX_PATH, 'utf8');
  assert.ok(source.includes('rateLimiter'), 'Rate limiting should be imported');
  assert.ok(source.includes('analysisLimiter'), 'Analysis rate limiter should be applied');
  // loginLimiter is applied in routes/auth.js, not index.js
  const authSource = fs.readFileSync(path.join(__dirname, '..', '..', 'routes', 'auth.js'), 'utf8');
  assert.ok(authSource.includes('loginLimiter'), 'Login rate limiter should be applied in auth routes');
});

test('rate limiter module exports expected limiters', () => {
  const { analysisLimiter, impersonateLimiter, loginLimiter } = require('../../middleware/rateLimiter');
  assert.ok(typeof analysisLimiter === 'function', 'analysisLimiter should be a function');
  assert.ok(typeof impersonateLimiter === 'function', 'impersonateLimiter should be a function');
  assert.ok(typeof loginLimiter === 'function', 'loginLimiter should be a function');
});

test('SESSION_SECRET enforcement in production', () => {
  const source = fs.readFileSync(INDEX_PATH, 'utf8');
  assert.ok(
    source.includes("process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET"),
    'Should enforce SESSION_SECRET in production'
  );
});
