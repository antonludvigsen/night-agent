// Unit tests for passwords (bcrypt) and login tokens (JWT, RS256). Plan 6.4 and 6.5.
// A temporary RSA key pair is generated here, so the tests never touch the real keys.
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'night-agent-test-'));
const makeKeys = () => crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const keys = makeKeys();
fs.writeFileSync(path.join(dir, 'private.pem'), keys.privateKey);
fs.writeFileSync(path.join(dir, 'public.pem'), keys.publicKey);
process.env.JWT_PRIVATE_KEY_PATH = path.join(dir, 'private.pem');
process.env.JWT_PUBLIC_KEY_PATH = path.join(dir, 'public.pem');

const test = require('node:test');
const assert = require('node:assert');
const jwt = require('../../backend/node_modules/jsonwebtoken');
const { hashPassword, verifyPassword, signToken, verifyToken } = require('../../backend/services/crypto');

const payload = { sub: '1', hotel_id: 1, role: 'staff' };

test('bcrypt: the right password matches, a wrong one does not', async () => {
  const hash = await hashPassword('minHundHedderTorben1337');
  assert.strictEqual(await verifyPassword('minHundHedderTorben1337', hash), true);
  assert.strictEqual(await verifyPassword('minHundHedderTorben1337wrong', hash), false);
});

test('bcrypt: the same password gives a different hash each time (unique salt)', async () => {
  const a = await hashPassword('samme-password');
  const b = await hashPassword('samme-password');
  assert.notStrictEqual(a, b);
  assert.ok(!a.includes('samme-password'));
});

test('JWT: a valid token is verified and carries the payload', () => {
  const decoded = verifyToken(signToken(payload));
  assert.strictEqual(decoded.sub, '1');
  assert.strictEqual(decoded.hotel_id, 1);
  assert.strictEqual(decoded.iss, 'night-agent');
});

test('JWT: a token with a manipulated payload is rejected', () => {
  const [header, , signature] = signToken(payload).split('.');
  const forged = Buffer.from(JSON.stringify({ ...payload, hotel_id: 2, iss: 'night-agent' })).toString('base64url');
  assert.throws(() => verifyToken(`${header}.${forged}.${signature}`), { name: 'JsonWebTokenError' });
});

test('JWT: an expired token is rejected', async () => {
  const token = signToken(payload, { expiresIn: '1s' });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  assert.throws(() => verifyToken(token), { name: 'TokenExpiredError' });
});

test('JWT: a token signed with another private key is rejected', () => {
  const other = makeKeys();
  const token = jwt.sign(payload, other.privateKey, { algorithm: 'RS256', issuer: 'night-agent' });
  assert.throws(() => verifyToken(token), { name: 'JsonWebTokenError' });
});

test('JWT: a token signed with HS256 and the public key as secret is rejected', () => {
  // Classic attack: the public key is not secret, so it must never be accepted as an HMAC secret.
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iss: 'night-agent' })).toString('base64url');
  const signature = crypto.createHmac('sha256', keys.publicKey).update(`${header}.${body}`).digest('base64url');
  assert.throws(() => verifyToken(`${header}.${body}.${signature}`), { name: 'JsonWebTokenError' });
});
