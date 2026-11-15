// Verifies X-Twilio-Signature (Twilio webhook security docs): Twilio signs the full URL
// and the POST parameters with HMAC-SHA1 using the account's auth token.
// The URL must be exactly the one Twilio called, so it is built from PUBLIC_BASE_URL
// and not from the request Express sees behind Nginx.
// Enforced in production. In development (localhost, curl) requests are let through.
const twilio = require('twilio');
const config = require('../config');

module.exports = function twilioSignature(req, res, next) {
  if (config.env !== 'production') return next();

  const signature = req.get('X-Twilio-Signature') || '';
  const url = config.publicBaseUrl + req.originalUrl;
  const valid = twilio.validateRequest(config.twilio.authToken, signature, url, req.body || {});
  if (!valid) {
    console.warn(`Rejected webhook with invalid Twilio signature: ${req.method} ${req.originalUrl}`);
    return res.status(403).type('text/plain').send('Invalid signature');
  }
  next();
};
