/**
 * Authorization middleware: require Okta session and check user LDAP against
 * allowed-users file. LDAP is derived from Okta userinfo (email = part before @).
 */

const path = require('path');
const fs = require('fs');

const ALLOWED_USERS_PATH = path.join(__dirname, '..', 'config', 'allowedUsers.json');

let cachedAllowed = null;
let cachedMtime = 0;

/**
 * Return array of allowed LDAP usernames from server/config/allowedUsers.json.
 * Uses in-memory cache; re-reads when file mtime changes.
 * @returns {string[]}
 */
function getAllowedUsers() {
  try {
    const stat = fs.statSync(ALLOWED_USERS_PATH);
    if (stat.mtimeMs !== cachedMtime) {
      cachedMtime = stat.mtimeMs;
      const raw = fs.readFileSync(ALLOWED_USERS_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      cachedAllowed = Array.isArray(parsed)
        ? parsed.map((s) => String(s).trim()).filter(Boolean)
        : [];
    }
    return cachedAllowed || [];
  } catch (_) {
    cachedAllowed = [];
    cachedMtime = 0;
    return [];
  }
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
 * Middleware: require session with okta_user and (if allowed list non-empty)
 * user's LDAP in allowed-users file. Otherwise redirect to /login or 401/403.
 */
function requireAuthorization(req, res, next) {
  if (!req.session || !req.session.okta_user) {
    const wantsJson = req.get('Accept') && req.get('Accept').includes('application/json');
    if (wantsJson) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    return res.redirect(302, '/login');
  }

  const userLdap = extractLdap(req.session.okta_user.email || '');
  const allowed = getAllowedUsers();

  if (allowed.length > 0 && !allowed.includes(userLdap)) {
    const wantsJson = req.get('Accept') && req.get('Accept').includes('application/json');
    if (wantsJson) {
      return res.status(403).json({ error: 'You are not authorized to access this application.' });
    }
    return res.status(403).send('You are not authorized to access this application.');
  }

  next();
}

module.exports = {
  getAllowedUsers,
  extractLdap,
  requireAuthorization,
};
