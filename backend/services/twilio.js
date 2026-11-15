// Outbound messages via the Twilio Messaging API (Exercise 9, lib/twilio.js).
const twilio = require('twilio');
const config = require('../config');

let client;
function getClient() {
  if (!client) client = twilio(config.twilio.accountSid, config.twilio.authToken);
  return client;
}

// Twilio marks WhatsApp addresses with the prefix "whatsapp:" on both From and To.
function channelOf(address) {
  return String(address).startsWith('whatsapp:') ? 'whatsapp' : 'sms';
}

function numberOf(address) {
  return String(address).replace(/^whatsapp:/, '');
}

// sendMessage({ channel: 'sms' | 'whatsapp', to: '+45...', body }) -> { sid, status }
// Twilio reports the delivery status asynchronously to the statusCallback webhook.
async function sendMessage({ channel, to, body }) {
  const whatsapp = channel === 'whatsapp';
  const params = {
    body,
    from: whatsapp ? config.twilio.whatsappFrom : config.twilio.smsFrom,
    to: whatsapp ? `whatsapp:${to}` : to,
  };
  if (config.publicBaseUrl && config.publicBaseUrl.startsWith('https://')) {
    params.statusCallback = `${config.publicBaseUrl}/webhooks/twilio/status`;
  }
  const message = await getClient().messages.create(params);
  return { sid: message.sid, status: message.status };
}

module.exports = { sendMessage, channelOf, numberOf };
