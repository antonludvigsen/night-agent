// Dashboard API for conversations (phase 2). All routes require requireUser.
const express = require('express');
const router = express.Router();
const notImplemented = (req, res) => res.status(501).json({ error: 'Not implemented' });

router.get('/', notImplemented);                 // ?status=ai|needs_human|closed
router.get('/:id', notImplemented);              // one conversation with messages
router.patch('/:id', notImplemented);            // take over, hand back to AI, close
router.post('/:id/messages', notImplemented);    // staff reply via Twilio (201, 502)
router.delete('/:id', notImplemented);           // data minimisation (204)

module.exports = router;
