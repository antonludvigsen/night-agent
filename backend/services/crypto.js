// Cryptography with Node's built-in crypto (phase 3, LM3).
// - Symmetric: AES-256-GCM for guest phone numbers (DATA_ENCRYPTION_KEY)
// - Hashing: SHA-256 of phone numbers for lookup; password hashing for staff
module.exports = {
  encrypt(plaintext) { throw new Error('Not implemented (phase 3)'); },
  decrypt(ciphertext) { throw new Error('Not implemented (phase 3)'); },
  hashLookup(value) { throw new Error('Not implemented (phase 3)'); },
};
