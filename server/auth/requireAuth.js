/**
 * Authorization middleware: require Okta session (okta_user in session).
 * LDAP is derived from Okta userinfo email for logging (part before @).
 */

/**
 * When DISABLE_AUTH=true and NODE_ENV is not production, skip Okta and use a dev session user.
 * Never enable in production (server refuses to start).
 */
function isAuthDisabled() {
  return process.env.DISABLE_AUTH === 'true' && process.env.NODE_ENV !== 'production';
}

/**
 * Run after express-session: inject a fake Okta user so /api/auth/me and protected routes work.
 */
function devAuthBypassMiddleware(req, res, next) {
  if (!isAuthDisabled()) {
    return next();
  }
  if (!req.session) {
    return next();
  }
  if (!req.session.okta_user) {
    req.session.okta_user = {
      email: process.env.DEV_AUTH_EMAIL || 'dev@localhost',
      name: 'Dev user (DISABLE_AUTH)',
      sub: 'dev-disable-auth',
    };
  }
  next();
}

/**
 * Extract LDAP from Okta user email (part before @).
 * @param {string} email
 * @returns {string}
 */
function extractLdap(email) {
  if (typeof email !== 'string' || !email) return '';
  const at = email.indexOf('@');
  return at === -1 ? email.trim() : email.slice(0, at).trim();
}

/**
 * Middleware: require session with okta_user. Otherwise redirect to /login or 401.
 */
function requireAuthorization(req, res, next) {
  if (isAuthDisabled()) {
    return next();
  }

  if (!req.session || !req.session.okta_user) {
    const accept = req.get('Accept') || '';
    const contentType = req.get('Content-Type') || '';
    const path = typeof req.path === 'string' ? req.path : '';
    const isApiRequest =
      accept.includes('application/json') ||
      contentType.includes('application/json') ||
      req.xhr ||
      path.startsWith('/api/');
    if (isApiRequest) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    return res.redirect(302, '/login');
  }

  next();
}

module.exports = {
  extractLdap,
  requireAuthorization,
  isAuthDisabled,
  devAuthBypassMiddleware,
};
