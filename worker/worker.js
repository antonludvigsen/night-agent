// Worker (plan section 6.2). Runs as a separate process, independent of the web instances.
// Loop: claim one pending job, load history and hotel knowledge, call the AI,
// send the reply via Twilio on the same channel, or hand the conversation to staff.
const config = require('../backend/config');
const { getDb } = require('../backend/data/database');
const { encrypt, decrypt } = require('../backend/services/crypto');
const ai = require('../backend/services/ai');
const twilio = require('../backend/services/twilio');

const POLL_INTERVAL_MS = 1000;
const HISTORY_LIMIT = 10;
const FALLBACK_TEXT =
  'Tak for din besked. En medarbejder vender tilbage hurtigst muligt. / ' +
  'Thank you for your message. A member of staff will get back to you as soon as possible.';

// Claims one job in a single statement (pending -> processing), so two workers
// can never take the same job.
async function claimJob(db) {
  return db.get(
    `UPDATE jobs SET status = 'processing', attempts = attempts + 1
     WHERE id = (SELECT id FROM jobs WHERE status = 'pending' ORDER BY created_at, id LIMIT 1)
     RETURNING id, message_id`
  );
}

async function sendAndStore(db, conversation, guestNumber, author, text) {
  const sent = await twilio.sendMessage({ channel: conversation.channel, to: guestNumber, body: text });
  // The reply is encrypted before it is stored, like the guest's message.
  await db.run(
    `INSERT INTO messages (hotel_id, conversation_id, direction, author, body_enc, message_sid, delivery_status)
     VALUES (?, ?, 'out', ?, ?, ?, ?)`,
    conversation.hotel_id, conversation.id, author, encrypt(text), sent.sid, sent.status
  );
  await db.run("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?", conversation.id);
  return sent;
}

async function handOverToStaff(db, conversation, guestNumber, reason) {
  await db.run("UPDATE conversations SET status = 'needs_human', updated_at = datetime('now') WHERE id = ?", conversation.id);
  await sendAndStore(db, conversation, guestNumber, 'ai', FALLBACK_TEXT);
  // TODO phase 2: mail.notifyStaff({ conversationId, reason }) with a link only, no guest data.
  console.log(`Conversation ${conversation.id} needs a human: ${reason}`);
}

async function processJob(db, job) {
  const message = await db.get('SELECT id, conversation_id FROM messages WHERE id = ?', job.message_id);
  const conversation = await db.get(
    `SELECT c.id, c.hotel_id, c.channel, c.status, c.guest_number_enc, h.name AS hotel_name
     FROM conversations c JOIN hotels h ON h.id = c.hotel_id WHERE c.id = ?`,
    message.conversation_id
  );

  // Staff took over or closed the conversation while the job was waiting: the AI stays silent.
  if (conversation.status !== 'ai') return 'skipped (conversation not handled by AI)';

  const rows = await db.all(
    'SELECT author, body_enc FROM messages WHERE conversation_id = ? AND id <= ? ORDER BY id DESC LIMIT ?',
    conversation.id, message.id, HISTORY_LIMIT
  );
  // Number and text are only decrypted in memory, right before the AI call and the reply.
  const history = rows.reverse().map((row) => ({ author: row.author, body: decrypt(row.body_enc) }));
  const guestNumber = decrypt(conversation.guest_number_enc);
  const hotelInfo = await db.all('SELECT key, text FROM hotel_info WHERE hotel_id = ? ORDER BY key', conversation.hotel_id);

  let reply;
  try {
    reply = await ai.generateReply({ hotelName: conversation.hotel_name, hotelInfo, history });
  } catch (err) {
    await handOverToStaff(db, conversation, guestNumber, `AI call failed: ${err.message}`);
    return `fallback sent (AI failed: ${err.message})`;
  }

  if (reply.needs_human) {
    await handOverToStaff(db, conversation, guestNumber, reply.reason || 'AI asked for a human');
    return 'fallback sent (needs human)';
  }

  await sendAndStore(db, conversation, guestNumber, 'ai', reply.answer);
  return 'AI reply sent';
}

async function processNextJob() {
  const db = await getDb();
  const job = await claimJob(db);
  if (!job) return false;

  const started = Date.now();
  try {
    const outcome = await processJob(db, job);
    await db.run("UPDATE jobs SET status = 'done', last_error = NULL WHERE id = ?", job.id);
    console.log(`Job ${job.id}: ${outcome} in ${Date.now() - started} ms`);
  } catch (err) {
    // Not retried automatically: the reply may already have been sent, and a retry could send it twice.
    await db.run("UPDATE jobs SET status = 'failed', last_error = ? WHERE id = ?", String(err.message).slice(0, 500), job.id);
    console.error(`Job ${job.id} failed:`, err.message);
  }
  return true;
}

async function loop() {
  try {
    const didWork = await processNextJob();
    setTimeout(loop, didWork ? 0 : POLL_INTERVAL_MS);
  } catch (err) {
    console.error('Worker error:', err);
    setTimeout(loop, POLL_INTERVAL_MS);
  }
}

if (require.main === module) {
  console.log(`Night Agent worker (pid ${process.pid}) started, model ${config.ai.model}`);
  loop();
}

module.exports = { processNextJob };
