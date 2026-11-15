// Cryptography with Node's built-in crypto module, following Exercise 10 (LM3).
// - encrypt/decrypt: symmetric encryption, AES-256-CBC (1-crypto/1-symmetric.js)
// - lookupHash:      SHA-256 with a secret salt (1-crypto/3-hashing.js, 5-salt.js)
// - contentHash:     SHA-256 message digest (1-crypto/3-hashing.js)
// - hashPassword/verifyPassword: bcrypt with salt rounds (2-bcrypt/1-password.js)
// - signToken/verifyToken: JWT signed with an RSA key pair, RS256 (3-jwt/3-asymmetric.js)
// Used by both the web app and the worker.
const crypto = require('crypto');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

const algorithm = 'aes-256-cbc';

// AES-256 needs a 256-bit key: 32 bytes, stored as 64 hex characters in .env.
function getKey() {
  const key = Buffer.from(config.dataEncryptionKey || '', 'hex');
  if (key.length !== 32) {
    throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes as hex (run: npm run keys)');
  }
  return key;
}

function getSalt() {
  if (!config.lookupSalt) {
    throw new Error('LOOKUP_SALT is missing (run: npm run keys)');
  }
  return config.lookupSalt;
}

// Encrypts one field. A new random IV (16 bytes, the AES block size) is generated for
// every field, so the same plaintext gives a different ciphertext each time.
// Stored as "iv:ciphertext" in hex; the IV is not secret, but is needed to decrypt.
function encrypt(plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, getKey(), iv);
  const encrypted = cipher.update(String(plaintext), 'utf8', 'hex') + cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decrypt(blob) {
  const [ivHex, encrypted] = String(blob).split(':');
  const decipher = crypto.createDecipheriv(algorithm, getKey(), Buffer.from(ivHex, 'hex'));
  return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
}

// Hash of a phone number, used to find a conversation without decrypting every number.
// The salt is fixed and secret: the same number must give the same hash on every lookup,
// and without the salt the 10^8 possible Danish numbers could be brute forced quickly.
function lookupHash(value) {
  return crypto.createHash('sha256').update(String(value) + getSalt()).digest('hex');
}

// Fingerprint of approved hotel knowledge (integrity at rest). No key involved.
function contentHash(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

// Passwords are hashed, not encrypted: they never need to be read again.
// bcrypt generates a unique salt per hash and stores it inside the hash.
const saltRounds = 10;

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, saltRounds);
}

async function verifyPassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

// Login tokens. The private key signs (only the login route needs it),
// the public key verifies (every instance behind the load balancer can do that
// without a shared session store).
const TOKEN_ISSUER = 'night-agent';
const TOKEN_LIFETIME = '8h';
const keys = {};

function readKey(name, filePath) {
  if (!keys[name]) {
    try {
      keys[name] = fs.readFileSync(filePath, 'utf8');
    } catch {
      throw new Error(`JWT ${name} key not found at ${filePath} (run: npm run jwt-keys)`);
    }
  }
  return keys[name];
}

function signToken(payload, options = {}) {
  return jwt.sign(payload, readKey('private', config.jwt.privateKeyPath), {
    algorithm: 'RS256',
    expiresIn: TOKEN_LIFETIME,
    issuer: TOKEN_ISSUER,
    ...options,
  });
}

// The algorithm is locked to RS256: a token signed with any other algorithm is rejected.
// Throws TokenExpiredError or JsonWebTokenError if the token is not valid.
function verifyToken(token) {
  return jwt.verify(token, readKey('public', config.jwt.publicKeyPath), {
    algorithms: ['RS256'],
    issuer: TOKEN_ISSUER,
  });
}

module.exports = {
  encrypt, decrypt, lookupHash, contentHash,
  hashPassword, verifyPassword, signToken, verifyToken,
};
