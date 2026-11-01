// Central configuration. Loads .env from the repo root (phase 1: npm install dotenv).
// Used by both the web app and the worker.
const path = require('path');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch {
  // dotenv not installed yet (phase 0)
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  env: process.env.NODE_ENV || 'development',
  publicBaseUrl: process.env.PUBLIC_BASE_URL,
  dbPath: process.env.DB_PATH || path.join(__dirname, 'data', 'night-agent.db'),
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    smsFrom: process.env.TWILIO_SMS_FROM,
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM,
  },
  ai: {
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL || 'claude-sonnet-5-5',
  },
  sessionSecret: process.env.SESSION_SECRET,
  dataEncryptionKey: process.env.DATA_ENCRYPTION_KEY,
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    staffAlertEmail: process.env.STAFF_ALERT_EMAIL,
  },
};
