// Twilio webhooks (Exercise 9). Plan section 5 and 6.1.
const express = require('express');
// const twilioSignature = require('../middleware/twilioSignature'); // phase 1, enforced in phase 3

const router = express.Router();

// POST /webhooks/twilio/inbound
// 1. Verify X-Twilio-Signature  2. Channel from From ('whatsapp:' prefix)
// 3. Find/create conversation, insert message (UNIQUE message_sid = idempotency)
// 4. Create pending job  5. Reply 200 with empty TwiML immediately. No AI call here.
router.post('/inbound', (req, res) => {
  // TODO phase 1
  res.type('text/xml').send('<Response></Response>');
});

// POST /webhooks/twilio/status
// Update messages.delivery_status from MessageSid and MessageStatus.
router.post('/status', (req, res) => {
  // TODO phase 1
  res.sendStatus(200);
});

module.exports = router;
