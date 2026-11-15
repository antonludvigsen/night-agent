// Rate limiting with express-rate-limit (Exercise 7, 5-express-rate-limit).
// Counted per client IP. Behind Nginx, app.set('trust proxy', 1) makes req.ip the client's address.
// The counters live in memory in each pm2 instance; with two instances an attacker can in the
// worst case get twice the limit. A shared store (e.g. Redis) would fix that.
const { rateLimit } = require('express-rate-limit');

const common = { standardHeaders: 'draft-8', legacyHeaders: false };

// Password guessing: 5 failed attempts per 15 minutes. Successful logins are not counted.
const loginLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts, try again later' },
});

// Webhooks: Twilio sends from many addresses, so the limit per IP is generous.
// It stops a single client from flooding the queue with jobs (and thereby paid AI calls).
const webhookLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: 60,
  message: { error: 'Too many requests' },
});

// Dashboard API: the pages poll every 5 seconds, so the limit leaves room for several open tabs.
const apiLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  message: { error: 'Too many requests' },
});

module.exports = { loginLimiter, webhookLimiter, apiLimiter };
