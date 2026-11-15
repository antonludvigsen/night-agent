// Evidence for F13: forged webhook, tampered webhook and replay of a valid webhook.
// Sends four requests to the production webhook and prints the status codes.
// Needs TWILIO_AUTH_TOKEN from .env to sign the valid request, so it runs on the droplet:
//   npm run security:webhook-test -- +45XXXXXXXX
// The number must be your own phone: the valid request is a real guest message, so the
// AI answers it once by SMS. The replay must NOT give a second answer.
const crypto = require('crypto');
const twilio = require('../../backend/node_modules/twilio');
const config = require('../../backend/config');
const { getDb } = require('../../backend/data/database');

const guest = process.argv[2];
if (!/^\+[1-9][0-9]{6,14}$/.test(guest || '')) {
  console.error('Usage: npm run security:webhook-test -- +45XXXXXXXX (your own phone number)');
  process.exit(1);
}

const url = `${config.publicBaseUrl}/webhooks/twilio/inbound`;
const params = {
  From: guest,
  To: config.twilio.smsFrom,
  Body: 'Sikkerhedstest: hvornår lukker receptionen?',
  MessageSid: `SMtest${crypto.randomBytes(13).toString('hex')}`,
};
const validSignature = twilio.getExpectedTwilioSignature(config.twilio.authToken, url, params);

async function send(label, body, signature) {
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (signature) headers['X-Twilio-Signature'] = signature;
  const res = await fetch(url, { method: 'POST', headers, body: new URLSearchParams(body) });
  console.log(`${label.padEnd(44)} ${res.status}`);
  return res.status;
}

(async () => {
  console.log(`POST ${url}\nMessageSid ${params.MessageSid}\n`);
  await send('1. Without signature (forged)', params, null);
  await send('2. Wrong signature', params, 'AAAAAAAAAAAAAAAAAAAAAAAAAAA=');
  await send('3. Valid signature, Body changed in transit', { ...params, Body: 'Ændret tekst' }, validSignature);
  await send('4. Valid signature (real message)', params, validSignature);
  await send('5. Same valid request again (replay)', params, validSignature);

  const db = await getDb();
  const row = await db.get('SELECT COUNT(*) AS n FROM messages WHERE message_sid = ?', params.MessageSid);
  const jobs = await db.get(
    'SELECT COUNT(*) AS n FROM jobs WHERE message_id IN (SELECT id FROM messages WHERE message_sid = ?)', params.MessageSid
  );
  console.log(`\nMessages stored with this MessageSid: ${row.n} (expected 1)`);
  console.log(`Jobs created for it:                  ${jobs.n} (expected 1, so only one SMS reply)`);
  await db.close();
})();
