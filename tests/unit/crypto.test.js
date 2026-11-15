// Unit tests for backend/services/crypto.js (plan 6.4). Run: npm test (from backend/)
// Test keys are set here, so the tests never touch the real keys in .env.
process.env.DATA_ENCRYPTION_KEY = 'a'.repeat(64);
process.env.LOOKUP_SALT = 'b'.repeat(32);

const test = require('node:test');
const assert = require('node:assert');
const { encrypt, decrypt, lookupHash, contentHash } = require('../../backend/services/crypto');

test('decrypt(encrypt(x)) gives x back', () => {
  for (const text of ['+4512345678', 'Hej, vi ankommer først kl. 23.30 æøå', '']) {
    assert.strictEqual(decrypt(encrypt(text)), text);
  }
});

test('the same text gives different ciphertext each time (new IV)', () => {
  const a = encrypt('+4512345678');
  const b = encrypt('+4512345678');
  assert.notStrictEqual(a, b);
  assert.match(a, /^[0-9a-f]{32}:[0-9a-f]+$/);
});

test('ciphertext does not contain the plaintext', () => {
  assert.ok(!encrypt('+4512345678').includes('4512345678'));
});

test('lookupHash is stable for the same number and differs between numbers', () => {
  assert.strictEqual(lookupHash('+4512345678'), lookupHash('+4512345678'));
  assert.notStrictEqual(lookupHash('+4512345678'), lookupHash('+4512345679'));
  assert.match(lookupHash('+4512345678'), /^[0-9a-f]{64}$/);
});

test('lookupHash depends on the secret salt (not a plain SHA-256 of the number)', () => {
  assert.notStrictEqual(lookupHash('+4512345678'), contentHash('+4512345678'));
});

test('contentHash changes when the text changes', () => {
  assert.notStrictEqual(contentHash('Check-out is at 11:00.'), contentHash('Check-out is at 12:00.'));
});
