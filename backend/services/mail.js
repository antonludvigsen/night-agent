// Staff alerts via Nodemailer over SMTP (Exercise 4).
// The mail only contains a link to the conversation in the dashboard: no phone number,
// no message text and no reason from the AI (data minimisation, plan 6.4).
const nodemailer = require('nodemailer');
const config = require('../config');

let transporter;

function isConfigured() {
  return Boolean(config.smtp.user && config.smtp.pass && config.smtp.staffAlertEmail);
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465, // port 465 = TLS from the start
      requireTLS: true,                 // port 587 = STARTTLS; never send without TLS
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  return transporter;
}

// Returns true if the mail was handed to the SMTP server, false if mail is not configured.
async function notifyStaff({ conversationId }) {
  if (!isConfigured()) {
    console.log('Mail is not configured (SMTP_USER, SMTP_PASS, STAFF_ALERT_EMAIL); no alert sent');
    return false;
  }
  const link = `${config.publicBaseUrl}/conversation.html?id=${conversationId}`;
  const info = await getTransporter().sendMail({
    from: `Night Agent <${config.smtp.user}>`,
    to: config.smtp.staffAlertEmail,
    subject: 'Night Agent: en samtale kræver en medarbejder',
    text: `En gæst venter på svar fra en medarbejder.\n\nÅbn samtalen i dashboardet:\n${link}\n`,
  });
  console.log(`Staff alert sent for conversation ${conversationId}: ${info.messageId}`);
  return true;
}

module.exports = { notifyStaff, isConfigured };
