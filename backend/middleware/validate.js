// Input validation with express-validator (Exercise 3, validateProfile.js).
// Every value from outside is checked before a route uses it. Invalid input gives 400.
const { body, param, query, validationResult } = require('express-validator');

const STATUSES = ['ai', 'needs_human', 'closed'];

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array().map((e) => e.msg).join(', ') });
  }
  next();
};

// Twilio webhooks. The signature is checked first; this guards against malformed values.
// Phone numbers: E.164, optionally with the "whatsapp:" prefix. SMS bodies are at most 1600 characters.
// Each rule first checks that the value is a string (not missing, not an array or object),
// and stops there with the same message if it is not.
const text = (chain, message) => chain.isString().withMessage(message).bail();

const phone = (field) => {
  const message = `${field} must be a phone number in E.164 format`;
  return text(body(field), message).matches(/^(whatsapp:)?\+[1-9][0-9]{6,14}$/).withMessage(message);
};
const messageSid = () => text(body('MessageSid'), 'MessageSid is invalid')
  .matches(/^[A-Za-z0-9]{1,64}$/).withMessage('MessageSid is invalid');

const inboundWebhook = [
  phone('From'),
  phone('To'),
  messageSid(),
  text(body('Body').optional(), 'Body must be text').isLength({ max: 1600 }).withMessage('Body is at most 1600 characters'),
  handleValidation,
];

const statusWebhook = [
  messageSid(),
  text(body('MessageStatus'), 'MessageStatus is invalid').matches(/^[a-z_]{1,30}$/).withMessage('MessageStatus is invalid'),
  handleValidation,
];

// Login
const login = [
  text(body('email'), 'email must be a valid email address')
    .trim().toLowerCase().isEmail().withMessage('email must be a valid email address')
    .isLength({ max: 254 }).withMessage('email must be a valid email address'),
  text(body('password'), 'password is required').isLength({ min: 1, max: 200 }).withMessage('password is required'),
  handleValidation,
];

// Dashboard API
const conversationId = param('id').isInt({ min: 1 }).toInt().withMessage('id must be a positive integer');

const listConversations = [
  query('status').optional({ values: 'falsy' }).isIn(STATUSES).withMessage(`status must be one of: ${STATUSES.join(', ')}`),
  handleValidation,
];
const oneConversation = [conversationId, handleValidation];
const patchConversation = [
  conversationId,
  text(body('status'), `status must be one of: ${STATUSES.join(', ')}`).isIn(STATUSES).withMessage(`status must be one of: ${STATUSES.join(', ')}`),
  handleValidation,
];
const replyToConversation = [
  conversationId,
  text(body('body'), 'body is required and at most 1000 characters')
    .trim().isLength({ min: 1, max: 1000 }).withMessage('body is required and at most 1000 characters'),
  handleValidation,
];
const putHotelInfo = [
  param('key').matches(/^[a-z0-9_]{1,50}$/).withMessage('key may only contain a-z, 0-9 and _ (at most 50 characters)'),
  text(body('text'), 'text is required and at most 1000 characters')
    .trim().isLength({ min: 1, max: 1000 }).withMessage('text is required and at most 1000 characters'),
  handleValidation,
];

module.exports = {
  STATUSES, inboundWebhook, statusWebhook, login,
  listConversations, oneConversation, patchConversation, replyToConversation, putHotelInfo,
};
