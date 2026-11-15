// Twilio webhooks (Exercise 9). Plan section 5 and 6.1.
const express = require('express');
const { getDb, withTransaction } = require('../data/database');
const { encrypt, lookupHash } = require('../services/crypto');
const { channelOf, numberOf } = require('../services/twilio');
const twilioSignature = require('../middleware/twilioSignature');

const router = express.Router();

router.use(twilioSignature);

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
const sendEmptyTwiml = (res) => res.type('text/xml').send(EMPTY_TWIML);

// POST /webhooks/twilio/inbound
// Stores the message and creates a job, then answers Twilio immediately with empty TwiML.
// The AI call is not made here: the worker picks up the job (plan 6.2).
router.post('/inbound', async (req, res) => {
  const { From, To, Body = '', MessageSid } = req.body || {};
  if (!From || !To || !MessageSid) {
    return res.status(400).json({ error: 'From, To and MessageSid are required' });
  }

  const channel = channelOf(From);
  const guestNumber = numberOf(From);
  const hotelNumber = numberOf(To);

  const db = await getDb();
  const column = channel === 'whatsapp' ? 'whatsapp_number' : 'sms_number';
  const hotel = await db.get(`SELECT id FROM hotels WHERE ${column} = ?`, hotelNumber);
  if (!hotel) {
    console.warn(`Inbound ${channel} message to a number that belongs to no hotel`);
    return sendEmptyTwiml(res);
  }

  // Idempotency: Twilio repeats a webhook it got no answer to. Same MessageSid = same message.
  const existing = await db.get(
    'SELECT id FROM messages WHERE hotel_id = ? AND message_sid = ?', hotel.id, MessageSid
  );
  if (existing) {
    console.log(`Duplicate webhook for ${MessageSid}, no new job`);
    return sendEmptyTwiml(res);
  }

  // Number and text are encrypted before anything is written to the database.
  const numberHash = lookupHash(guestNumber);
  const numberEnc = encrypt(guestNumber);
  const bodyEnc = encrypt(Body);

  try {
    await withTransaction(async (tx) => {
      let conversation = await tx.get(
        `SELECT id, status FROM conversations
         WHERE hotel_id = ? AND channel = ? AND guest_number_hash = ? AND status != 'closed'
         ORDER BY id DESC LIMIT 1`,
        hotel.id, channel, numberHash
      );
      if (!conversation) {
        const created = await tx.run(
          'INSERT INTO conversations (hotel_id, channel, guest_number_enc, guest_number_hash) VALUES (?, ?, ?, ?)',
          hotel.id, channel, numberEnc, numberHash
        );
        conversation = { id: created.lastID, status: 'ai' };
      } else {
        await tx.run("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?", conversation.id);
      }

      const message = await tx.run(
        `INSERT INTO messages (hotel_id, conversation_id, direction, author, body_enc, message_sid, delivery_status)
         VALUES (?, ?, 'in', 'guest', ?, ?, 'received')`,
        hotel.id, conversation.id, bodyEnc, MessageSid
      );

      // Only conversations handled by the AI get a job. If staff has taken over,
      // the message is stored and shown in the dashboard.
      if (conversation.status === 'ai') {
        await tx.run('INSERT INTO jobs (message_id) VALUES (?)', message.lastID);
      }
    });
  } catch (err) {
    // Two identical webhooks arriving at the same time: UNIQUE (hotel_id, message_sid) stops the second.
    if (err.code === 'SQLITE_CONSTRAINT') {
      console.log(`Duplicate webhook for ${MessageSid} (constraint), no new job`);
      return sendEmptyTwiml(res);
    }
    throw err;
  }

  sendEmptyTwiml(res);
});

// POST /webhooks/twilio/status
// Twilio reports the delivery status of an outbound message (queued, sent, delivered, failed ...).
router.post('/status', async (req, res) => {
  const { MessageSid, MessageStatus } = req.body || {};
  if (!MessageSid || !MessageStatus) {
    return res.status(400).json({ error: 'MessageSid and MessageStatus are required' });
  }
  const db = await getDb();
  // Status callbacks can arrive out of order; a final status is never overwritten.
  await db.run(
    `UPDATE messages SET delivery_status = ?
     WHERE message_sid = ? AND COALESCE(delivery_status, '') NOT IN ('delivered', 'read', 'failed', 'undelivered')`,
    MessageStatus, MessageSid
  );
  res.sendStatus(200);
});

module.exports = router;
