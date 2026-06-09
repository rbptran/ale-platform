const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many auth requests — please wait a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Rate limit exceeded — please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const tutorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'AI tutor rate limit hit — please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter, tutorLimiter };
