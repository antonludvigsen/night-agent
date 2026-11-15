// Evidence for F17: what is actually stored in the database.
// Prints shortened values, so a screenshot shows the format without leaking full ciphertexts or hashes.
// Run on the droplet (from backend/): npm run security:db-snapshot
const { getDb } = require('../../backend/data/database');

const short = (value, n = 24) => (value ? `${String(value).slice(0, n)}…` : value);

(async () => {
  const db = await getDb();

  console.log('\nconversations (guest number encrypted with AES-256-CBC, lookup hash = SHA-256 + secret salt)');
  console.table((await db.all('SELECT id, channel, status, guest_number_enc, guest_number_hash FROM conversations ORDER BY id DESC LIMIT 3'))
    .map((r) => ({ ...r, guest_number_enc: short(r.guest_number_enc, 40), guest_number_hash: short(r.guest_number_hash) })));

  console.log('\nmessages (text encrypted with AES-256-CBC, stored as iv:ciphertext)');
  console.table((await db.all('SELECT id, direction, author, body_enc, delivery_status FROM messages ORDER BY id DESC LIMIT 4'))
    .map((r) => ({ ...r, body_enc: short(r.body_enc, 48) })));

  console.log('\nstaff_users (password stored only as bcrypt hash: $2b$ = bcrypt, 10 = salt rounds)');
  console.table((await db.all('SELECT id, email, password_hash FROM staff_users'))
    .map((r) => ({ ...r, password_hash: short(r.password_hash, 29) })));

  console.log('\nhotel_info (SHA-256 fingerprint of the approved text)');
  console.table((await db.all('SELECT key, content_hash FROM hotel_info ORDER BY key LIMIT 3'))
    .map((r) => ({ ...r, content_hash: short(r.content_hash) })));

  await db.close();
})();
