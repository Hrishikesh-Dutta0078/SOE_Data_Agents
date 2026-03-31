'use strict';

const net = require('node:net');

/**
 * Express `req.ip` behind some proxies is `a.b.c.d:port`, which fails express-rate-limit's
 * validation (and net.isIP). Strip port / zone id so rate limiting keys stay valid.
 */
function getRateLimitClientIp(req) {
  const tryNormalize = (raw) => {
    if (typeof raw !== 'string' || raw.length === 0) {
      return null;
    }
    let ip = raw.split('%')[0].trim();
    const v4WithPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/;
    const m4 = ip.match(v4WithPort);
    if (m4) {
      ip = m4[1];
    }
    if (ip.startsWith('[')) {
      const end = ip.indexOf(']');
      if (end > 0) {
        ip = ip.slice(1, end);
      }
    }
    return net.isIP(ip) ? ip : null;
  };

  const fromReq = tryNormalize(req.ip);
  if (fromReq) {
    return fromReq;
  }

  const sock = req.socket && req.socket.remoteAddress;
  let fallback = typeof sock === 'string' ? sock.split('%')[0].trim() : '';
  if (fallback.startsWith('::ffff:')) {
    fallback = fallback.slice(7);
  }
  const fromSock = tryNormalize(fallback);
  if (fromSock) {
    return fromSock;
  }

  return '127.0.0.1';
}

module.exports = { getRateLimitClientIp };
