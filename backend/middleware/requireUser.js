// Rejects requests without a valid staff session (phase 2).
module.exports = function requireUser(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ error: 'Not logged in' });
};
