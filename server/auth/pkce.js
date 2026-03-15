/**
 * PKCE (Proof Key for Code Exchange) for OAuth 2.0 Authorization Code flow.
 * Generates code_verifier and code_challenge (S256).
 */

const crypto = require('crypto');

/**
 * Generate a PKCE pair: code_verifier (64-byte random, URL-safe base64) and
 * code_challenge (SHA-256 hash of verifier, base64url encoded, padding stripped).
 * @returns {{ code_verifier: string, code_challenge: string }}
 */
function generatePkcePair() {
  const codeVerifier = crypto.randomBytes(64).toString('base64url');
  const digest = crypto.createHash('sha256').update(codeVerifier).digest();
  const codeChallenge = digest.toString('base64url').replace(/=+$/, '');
  return { code_verifier: codeVerifier, code_challenge: codeChallenge };
}

module.exports = { generatePkcePair };
