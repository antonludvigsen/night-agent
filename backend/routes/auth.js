// Staff login (phase 2, hardened in phase 3).
const express = require('express');
const router = express.Router();

// POST /api/auth/login   200, 400, 401, 429
router.post('/login', (req, res) => res.status(501).json({ error: 'Not implemented' }));

// POST /api/auth/logout  204
router.post('/logout', (req, res) => res.status(501).json({ error: 'Not implemented' }));

// GET /api/auth/me       200, 401
router.get('/me', (req, res) => res.status(501).json({ error: 'Not implemented' }));

module.exports = router;
