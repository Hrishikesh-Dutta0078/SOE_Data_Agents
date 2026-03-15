const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const analysisLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req, res) => req.headers['x-session-id'] || ipKeyGenerator(req, res),
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const impersonateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { analysisLimiter, impersonateLimiter, loginLimiter };
