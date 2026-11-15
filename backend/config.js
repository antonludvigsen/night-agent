// Central configuration. Loads .env from the repo root.
// Used by both the web app and the worker.
const path = require('path');

const repoRoot = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(repoRoot, '.env'), quiet: true });

module.exports = {
  port: Number(process.env.PORT) || 3000,
  env: process.env.NODE_ENV || 'development',
  publicBaseUrl: process.env.PUBLIC_BASE_URL,
  // DB_PATH is resolved from the repo root, so web app and worker open the same file
  // no matter which directory they are started from.
  dbPath: path.resolve(repoRoot, process.env.DB_PATH || './backend/data/night-agent.db'),
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
  dataEncryptionKey: process.env.DATA_ENCRYPTION_KEY, // 32 bytes as hex (AES-256)
  lookupSalt: process.env.LOOKUP_SALT,                // 16 bytes as hex
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    staffAlertEmail: process.env.STAFF_ALERT_EMAIL,
  },
};
