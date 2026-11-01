// Approved hotel knowledge the AI answers from (phase 2).
const express = require('express');
const router = express.Router();
const notImplemented = (req, res) => res.status(501).json({ error: 'Not implemented' });

router.get('/', notImplemented);      // GET /api/hotel-info
router.put('/:key', notImplemented);  // PUT /api/hotel-info/:key

module.exports = router;
