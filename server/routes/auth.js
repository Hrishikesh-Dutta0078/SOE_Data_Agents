/**
 * Okta OAuth routes: /login, /implicit/callback, /logout, /api/auth/me
 */

const express = require('express');
const crypto = require('crypto');
const { URLSearchParams } = require('url');
const router = express.Router();
const { generatePkcePair } = require('../auth/pkce');
const { logUserLogin } = require('../auth/logUserLogin');

const OKTA_ISSUER_URL = process.env.OKTA_ISSUER_URL || '';
const OKTA_CLIENT_ID = process.env.OKTA_CLIENT_ID || '';
const OKTA_REDIRECT_URI = process.env.OKTA_REDIRECT_URI || '';
const OKTA_CALLBACK_PATH = process.env.OKTA_CALLBACK_PATH || '/implicit/callback';

/** GET /login — start Okta OAuth flow (PKCE + state, redirect to authorize) */
router.get('/login', (req, res) => {
  const { code_verifier, code_challenge } = generatePkcePair();
  const state = crypto.randomBytes(16).toString('base64url');

  req.session.code_verifier = code_verifier;
  req.session.oauth_state = state;

  const params = new URLSearchParams({
    client_id: OKTA_CLIENT_ID,
    redirect_uri: OKTA_REDIRECT_URI,
    scope: 'openid profile email',
    response_type: 'code',
    code_challenge,
    code_challenge_method: 'S256',
    state,
  });
  const authUrl = `${OKTA_ISSUER_URL}/v1/authorize?${params.toString()}`;
  res.redirect(authUrl);
});

/** GET /implicit/callback — handle Okta redirect, exchange code for tokens, fetch userinfo */
router.get(OKTA_CALLBACK_PATH.startsWith('/') ? OKTA_CALLBACK_PATH : `/${OKTA_CALLBACK_PATH}`, async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;

  const storedState = req.session.oauth_state;
  delete req.session.oauth_state;
  if (state !== storedState) {
    return res.status(400).send('Invalid state parameter');
  }

  const codeVerifier = req.session.code_verifier;
  delete req.session.code_verifier;
  if (!code || !codeVerifier) {
    return res.status(400).send('Authorization failed');
  }

  const tokenUrl = `${OKTA_ISSUER_URL}/v1/token`;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: OKTA_CLIENT_ID,
    code,
    redirect_uri: OKTA_REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  let tokenRes;
  try {
    tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch (err) {
    return res.status(500).send('Token request failed');
  }

  const tokenData = await tokenRes.json();
  if (tokenRes.status !== 200 || !tokenData.id_token) {
    return res.status(400).send('Token exchange failed');
  }

  req.session.id_token = tokenData.id_token;
  if (tokenData.access_token) {
    req.session.access_token = tokenData.access_token;
  }

  const userinfoUrl = `${OKTA_ISSUER_URL}/v1/userinfo`;
  let userInfo;
  try {
    const userRes = await fetch(userinfoUrl, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    userInfo = await userRes.json();
  } catch (_) {
    return res.status(500).send('Userinfo request failed');
  }

  req.session.okta_user = userInfo;
  logUserLogin(userInfo);
  res.redirect('/');
});

/** GET /logout — destroy session, redirect */
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

/** GET /api/auth/me — return current user or 401 (no requireAuthorization so client can detect not-logged-in) */
router.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.okta_user) {
    return res.json(req.session.okta_user);
  }
  res.status(401).json({ error: 'Not authenticated' });
});

module.exports = router;
