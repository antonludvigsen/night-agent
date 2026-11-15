// Staff login with bcrypt and JWT in an HttpOnly cookie (Exercise 3 and 10). Plan 6.3 and 6.5.
const express = require('express');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { getDb } = require('../data/database');
const { hashPassword, verifyPassword, signToken } = require('../services/crypto');
const { requireUser, COOKIE_NAME } = require('../middleware/requireUser');

const router = express.Router();

const cookieOptions = {
  httpOnly: true,                // not readable from JavaScript in the browser
  sameSite: 'strict',            // not sent on requests from other sites (CSRF)
  secure: config.env === 'production' || Boolean(config.https.keyPath), // only over HTTPS
  maxAge: 8 * 60 * 60 * 1000,    // same lifetime as the token
  path: '/',
};

// Slows down password guessing (Exercise 7). Counted per instance, in memory.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, try again later' },
});

// A real hash to compare against when the email is unknown, so the response
// takes the same time whether the user exists or not.
const dummyHash = hashPassword('not-a-real-password');

// POST /api/auth/login   200, 400, 401, 429
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = await getDb();
  const user = await db.get(
    'SELECT id, email, password_hash, hotel_id FROM staff_users WHERE email = ?',
    email.trim().toLowerCase()
  );
  const match = await verifyPassword(password, user ? user.password_hash : await dummyHash);
  if (!user || !match) {
    return res.status(401).json({ error: 'Wrong email or password' });
  }

  // The token carries who the user is and which hotel they belong to. Never the password.
  const token = signToken({ sub: String(user.id), hotel_id: user.hotel_id, role: 'staff', email: user.email });
  res.cookie(COOKIE_NAME, token, cookieOptions);
  res.status(200).json({ email: user.email });
});

// POST /api/auth/logout  204
router.post('/logout', (req, res) => {
  const { maxAge, ...clearOptions } = cookieOptions;
  res.clearCookie(COOKIE_NAME, clearOptions);
  res.sendStatus(204);
});

// GET /api/auth/me       200, 401
router.get('/me', requireUser, async (req, res) => {
  const db = await getDb();
  const hotel = await db.get('SELECT name FROM hotels WHERE id = ?', req.user.hotel_id);
  res.json({ email: req.user.email, hotel_id: req.user.hotel_id, hotel_name: hotel ? hotel.name : null });
});

module.exports = router;
