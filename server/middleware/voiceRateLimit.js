const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const voiceRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.session?.id || ipKeyGenerator(req.ip),
  message: { error: 'Too many voice requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { voiceRateLimiter };
