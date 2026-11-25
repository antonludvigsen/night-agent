// Protects the dashboard API and the dashboard pages (plan 6.5, Exercise 10 extra task).
// The login token (JWT, RS256) is read from the HttpOnly cookie and verified with the
// public key on every request. No session is stored on the server.
const { verifyToken } = require('../services/crypto');

const COOKIE_NAME = 'token';

// Returns the user from a valid token, or null. The reason is logged without the token itself.
function authenticate(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    return { id: Number(payload.sub), hotel_id: payload.hotel_id, role: payload.role, email: payload.email };
  } catch (err) {
    console.warn(`Rejected login token: ${err.name} (${err.message}) on ${req.method} ${req.originalUrl}`);
    return null;
  }
}

// API (JSON): 401. The frontend then sends the user to the login page.
function requireUser(req, res, next) {
  const user = authenticate(req);
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  req.user = user;
  next();
}

// Pages (HTML): redirect to the login page.
function requirePage(req, res, next) {
  const user = authenticate(req);
  if (!user) return res.redirect('/login.html');
  req.user = user;
  next();
}

module.exports = requireUser;
module.exports.requireUser = requireUser;
module.exports.requirePage = requirePage;
module.exports.COOKIE_NAME = COOKIE_NAME;
