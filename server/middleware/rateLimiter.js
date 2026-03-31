const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { getRateLimitClientIp } = require('../utils/rateLimitClientIp');

function clientIpKey(req) {
  return ipKeyGenerator(getRateLimitClientIp(req));
}

const analysisLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.headers['x-session-id'] || clientIpKey(req),
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const impersonateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => clientIpKey(req),
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => clientIpKey(req),
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { analysisLimiter, impersonateLimiter, loginLimiter };
