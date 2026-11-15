// Dashboard API for conversations. All routes require a valid login token, and every
// query is limited to the user's own hotel (hotel_id comes from the token, never from the client).
const express = require('express');
const { getDb } = require('../data/database');
const { encrypt, decrypt } = require('../services/crypto');
const twilio = require('../services/twilio');
const { requireUser } = require('../middleware/requireUser');
const validate = require('../middleware/validate');

const router = express.Router();
router.use(requireUser);


// The phone number is shown masked in the dashboard, e.g. "+45 •• •• 39 31".
function maskNumber(number) {
  if (number.length < 7) return '••••';
  return `${number.slice(0, 3)} •• •• ${number.slice(-4, -2)} ${number.slice(-2)}`;
}

// Loads one conversation that belongs to the user's hotel, or answers 404.
// The id is already validated as a positive integer.
async function loadConversation(req, res) {
  const db = await getDb();
  const conversation = await db.get(
    'SELECT * FROM conversations WHERE id = ? AND hotel_id = ?', req.params.id, req.user.hotel_id
  );
  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return null;
  }
  return conversation;
}

function present(conversation) {
  return {
    id: conversation.id,
    channel: conversation.channel,
    status: conversation.status,
    guest_number: maskNumber(decrypt(conversation.guest_number_enc)),
    assigned_to: conversation.assigned_to,
    updated_at: conversation.updated_at,
  };
}

// GET /api/conversations?status=ai|needs_human|closed   200, 400, 401
router.get('/', validate.listConversations, async (req, res) => {
  const { status } = req.query;

  const db = await getDb();
  const rows = status
    ? await db.all('SELECT * FROM conversations WHERE hotel_id = ? AND status = ? ORDER BY updated_at DESC, id DESC', req.user.hotel_id, status)
    : await db.all('SELECT * FROM conversations WHERE hotel_id = ? ORDER BY updated_at DESC, id DESC', req.user.hotel_id);

  const conversations = [];
  for (const row of rows) {
    const last = await db.get(
      'SELECT author, body_enc, created_at FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 1', row.id
    );
    conversations.push({
      ...present(row),
      last_message: last ? { author: last.author, body: decrypt(last.body_enc).slice(0, 120), created_at: last.created_at } : null,
    });
  }
  res.json(conversations);
});

// GET /api/conversations/:id   200, 401, 404
router.get('/:id', validate.oneConversation, async (req, res) => {
  const conversation = await loadConversation(req, res);
  if (!conversation) return;

  const db = await getDb();
  const rows = await db.all(
    'SELECT id, direction, author, body_enc, delivery_status, created_at FROM messages WHERE conversation_id = ? ORDER BY id',
    conversation.id
  );
  // Text is decrypted on read and only sent to a logged-in user of the same hotel.
  const messages = rows.map(({ body_enc, ...message }) => ({ ...message, body: decrypt(body_enc) }));
  res.json({ ...present(conversation), messages });
});

// PATCH /api/conversations/:id   { status }   200, 400, 401, 404
// needs_human = staff takes over, ai = hand back to the AI, closed = close.
router.patch('/:id', validate.patchConversation, async (req, res) => {
  const conversation = await loadConversation(req, res);
  if (!conversation) return;

  const { status } = req.body;
  if (conversation.status === 'closed') {
    return res.status(400).json({ error: 'A closed conversation cannot be reopened' });
  }

  const assignedTo = status === 'ai' ? null : status === 'needs_human' ? req.user.id : conversation.assigned_to;
  const db = await getDb();
  await db.run(
    "UPDATE conversations SET status = ?, assigned_to = ?, updated_at = datetime('now') WHERE id = ? AND hotel_id = ?",
    status, assignedTo, conversation.id, req.user.hotel_id
  );
  res.json(present({ ...conversation, status, assigned_to: assignedTo }));
});

// POST /api/conversations/:id/messages   { body }   201, 400, 401, 404, 502
// Staff reply to the guest via Twilio on the conversation's channel.
router.post('/:id/messages', validate.replyToConversation, async (req, res) => {
  const conversation = await loadConversation(req, res);
  if (!conversation) return;

  const { body } = req.body; // trimmed by the validator
  if (conversation.status === 'closed') {
    return res.status(400).json({ error: 'The conversation is closed' });
  }

  let sent;
  try {
    sent = await twilio.sendMessage({
      channel: conversation.channel,
      to: decrypt(conversation.guest_number_enc),
      body,
    });
  } catch (err) {
    console.error(`Staff reply in conversation ${conversation.id} could not be sent: ${err.message}`);
    return res.status(502).json({ error: 'The message could not be sent via Twilio' });
  }

  const db = await getDb();
  const created = await db.run(
    `INSERT INTO messages (hotel_id, conversation_id, direction, author, body_enc, message_sid, delivery_status)
     VALUES (?, ?, 'out', 'staff', ?, ?, ?)`,
    req.user.hotel_id, conversation.id, encrypt(body), sent.sid, sent.status
  );
  // Replying means staff has taken over: the AI no longer answers in this conversation.
  await db.run(
    "UPDATE conversations SET status = 'needs_human', assigned_to = ?, updated_at = datetime('now') WHERE id = ?",
    req.user.id, conversation.id
  );
  res.status(201).json({ id: created.lastID, direction: 'out', author: 'staff', body, delivery_status: sent.status });
});

// DELETE /api/conversations/:id   204, 401, 404
// Data minimisation: messages and jobs are deleted with the conversation (ON DELETE CASCADE).
router.delete('/:id', validate.oneConversation, async (req, res) => {
  const conversation = await loadConversation(req, res);
  if (!conversation) return;

  const db = await getDb();
  await db.run('DELETE FROM conversations WHERE id = ? AND hotel_id = ?', conversation.id, req.user.hotel_id);
  res.sendStatus(204);
});

module.exports = router;
