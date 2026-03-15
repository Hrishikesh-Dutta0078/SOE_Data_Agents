/**
 * Log user login event (Okta callback). Includes username, userldap, UTC/local time, status.
 */

const logger = require('../utils/logger');
const { getAllowedUsers, extractLdap } = require('./requireAuth');

/**
 * Log a user login event. Call after setting req.session.okta_user in the callback.
 * @param {object} sessionUser - req.session.okta_user (Okta userinfo)
 */
function logUserLogin(sessionUser) {
  if (!sessionUser || typeof sessionUser !== 'object') return;

  const userName = sessionUser.name ?? '';
  const userEmail = sessionUser.email ?? '';
  const userLdap = extractLdap(userEmail);
  const allowed = getAllowedUsers();
  const status = allowed.length > 0 && !allowed.includes(userLdap)
    ? 'Failed - Unauthorized'
    : 'Success';

  const utcNow = new Date();
  const localStr = utcNow.toLocaleString('en-GB', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  const utcStr = utcNow.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const payload = {
    event_description: 'User login event',
    username: userName,
    userldap: userLdap,
    utc_time: utcStr,
    local_time: localStr,
    status,
  };

  logger.info('User login event', payload);
}

module.exports = { logUserLogin };
