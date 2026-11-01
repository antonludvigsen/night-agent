// Outbound messages via Twilio Messaging API (Exercise 9).
// sendMessage({ channel: 'sms' | 'whatsapp', to, body }) -> { sid }
// Uses statusCallback = PUBLIC_BASE_URL + '/webhooks/twilio/status'.
module.exports = {
  async sendMessage({ channel, to, body }) {
    throw new Error('Not implemented (phase 1)');
  },
};
