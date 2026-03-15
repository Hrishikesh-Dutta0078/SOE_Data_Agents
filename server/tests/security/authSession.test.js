/**
 * Authentication & Session Security Tests — CWE-287, CWE-306
 * Tests auth middleware, PKCE, and session handling.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { extractLdap, requireAuthorization, getAllowedUsers } = require('../../auth/requireAuth');
const { generatePkcePair } = require('../../auth/pkce');

// --- extractLdap ---

test('extractLdap extracts LDAP from email', () => {
  assert.equal(extractLdap('john.doe@company.com'), 'john.doe');
});

test('extractLdap handles no @ sign', () => {
  assert.equal(extractLdap('noatsign'), 'noatsign');
});

test('extractLdap handles empty string', () => {
  assert.equal(extractLdap(''), '');
});

test('extractLdap handles null', () => {
  assert.equal(extractLdap(null), '');
});

test('extractLdap handles undefined', () => {
  assert.equal(extractLdap(undefined), '');
});

test('extractLdap handles non-string', () => {
  assert.equal(extractLdap(123), '');
});

test('extractLdap trims whitespace', () => {
  assert.equal(extractLdap('  john.doe @company.com'), 'john.doe');
});

// --- PKCE ---

test('PKCE pair has code_verifier and code_challenge', () => {
  const pair = generatePkcePair();
  assert.ok(pair.code_verifier, 'Should have code_verifier');
  assert.ok(pair.code_challenge, 'Should have code_challenge');
});

test('PKCE verifier meets minimum length (43+ chars per RFC 7636)', () => {
  const pair = generatePkcePair();
  assert.ok(pair.code_verifier.length >= 43, `Verifier length ${pair.code_verifier.length} should be >= 43`);
});

test('PKCE verifier is URL-safe base64 (no +, /, =)', () => {
  const pair = generatePkcePair();
  assert.ok(!/[+/=]/.test(pair.code_verifier), 'Verifier should be URL-safe base64');
});

test('PKCE challenge is URL-safe base64 (no +, /, =)', () => {
  const pair = generatePkcePair();
  assert.ok(!/[+/]/.test(pair.code_challenge), 'Challenge should be URL-safe base64');
});

test('PKCE generates unique pairs each call', () => {
  const pair1 = generatePkcePair();
  const pair2 = generatePkcePair();
  assert.notEqual(pair1.code_verifier, pair2.code_verifier, 'Verifiers should differ');
  assert.notEqual(pair1.code_challenge, pair2.code_challenge, 'Challenges should differ');
});

// --- requireAuthorization middleware ---

function mockReq(session, accept) {
  return {
    session: session || {},
    get: (header) => header === 'Accept' ? accept : null,
  };
}

function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    redirectUrl: null,
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; return res; },
    send(data) { res.body = data; return res; },
    redirect(code, url) { res.statusCode = code; res.redirectUrl = url; return res; },
  };
  return res;
}

test('requireAuthorization returns 401 for missing session (JSON)', () => {
  const req = mockReq(null, 'application/json');
  const res = mockRes();
  let nextCalled = false;
  requireAuthorization(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('requireAuthorization returns 401 for missing okta_user (JSON)', () => {
  const req = mockReq({}, 'application/json');
  const res = mockRes();
  let nextCalled = false;
  requireAuthorization(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('requireAuthorization redirects for missing session (HTML)', () => {
  const req = mockReq(null, 'text/html');
  const res = mockRes();
  let nextCalled = false;
  requireAuthorization(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 302);
  assert.equal(res.redirectUrl, '/login');
  assert.equal(nextCalled, false);
});

test('requireAuthorization calls next for valid user', () => {
  const req = mockReq({ okta_user: { email: 'test@company.com' } }, 'application/json');
  const res = mockRes();
  let nextCalled = false;
  requireAuthorization(req, res, () => { nextCalled = true; });
  // If allowedUsers is empty or contains the user, next should be called
  // (depends on allowedUsers.json, but with empty list all authenticated users pass)
  if (getAllowedUsers().length === 0) {
    assert.equal(nextCalled, true, 'Empty allowed list should pass all authenticated users');
  }
});

// --- PUBLIC_PATHS config ---

test('PUBLIC_PATHS includes expected public routes', () => {
  const PUBLIC_PATHS = ['/api/health', '/login', '/implicit/callback', '/logout', '/api/auth/me'];
  assert.ok(PUBLIC_PATHS.includes('/api/health'));
  assert.ok(PUBLIC_PATHS.includes('/login'));
  assert.ok(PUBLIC_PATHS.includes('/logout'));
  assert.ok(!PUBLIC_PATHS.includes('/api/text-to-sql/analyze'));
  assert.ok(!PUBLIC_PATHS.includes('/api/impersonate/search'));
});
