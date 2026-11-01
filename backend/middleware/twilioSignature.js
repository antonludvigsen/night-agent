// Verifies X-Twilio-Signature (Twilio webhook security docs). Phase 1, enforced in phase 3.
// URL must be PUBLIC_BASE_URL + req.originalUrl, otherwise validation fails behind Nginx.
// const twilio = require('twilio');
// const config = require('../config');

module.exports = function twilioSignature(req, res, next) {
  // TODO: twilio.validateRequest(config.twilio.authToken, signature, url, req.body)
  // Invalid signature -> 403
  next();
};
