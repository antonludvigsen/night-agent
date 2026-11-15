// Creates a staff user (or sets a new password for an existing one).
// The password is typed at a hidden prompt and only stored as a bcrypt hash.
// Usage (from backend/): npm run user:create -- name@example.com
const { getDb } = require('../data/database');
const { hashPassword } = require('../services/crypto');

const MIN_PASSWORD_LENGTH = 10;

// Reads one line without echoing it to the terminal.
// Input that arrives after the line break is kept for the next question.
let pending = '';

function askHidden(question) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    stdout.write(question);
    let value = '';
    const raw = Boolean(stdin.isTTY);
    if (raw) stdin.setRawMode(true);
    stdin.setEncoding('utf8');

    const finish = () => {
      if (raw) stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stdin.removeListener('end', finish);
      stdout.write('\n');
      resolve(value);
    };
    const consume = (chunk) => {
      const chars = [...chunk];
      for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        if (char === '\n' || char === '\r' || char === '\u0004') {
          pending = chars.slice(i + 1).join('').replace(/^\n/, '');
          return true;
        }
        if (char === '\u0003') process.exit(1);            // Ctrl+C
        if (char === '\u007f') value = value.slice(0, -1); // backspace
        else value += char;
      }
      return false;
    };
    const onData = (chunk) => { if (consume(chunk)) finish(); };

    if (pending) {
      const rest = pending;
      pending = '';
      if (consume(rest)) return finish();
    }
    stdin.on('data', onData);
    stdin.on('end', finish);
    stdin.resume();
  });
}

async function main() {
  const email = (process.argv[2] || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('Usage: npm run user:create -- name@example.com');
    process.exit(1);
  }

  const password = await askHidden(`Password for ${email} (at least ${MIN_PASSWORD_LENGTH} characters, not shown): `);
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`The password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exit(1);
  }
  const repeated = await askHidden('Repeat the password: ');
  if (repeated !== password) {
    console.error('The two passwords are not the same.');
    process.exit(1);
  }

  const db = await getDb();
  const hotel = await db.get('SELECT id, name FROM hotels ORDER BY id LIMIT 1');
  const passwordHash = await hashPassword(password);
  await db.run(
    `INSERT INTO staff_users (email, password_hash, hotel_id) VALUES (?, ?, ?)
     ON CONFLICT (email) DO UPDATE SET password_hash = excluded.password_hash`,
    email, passwordHash, hotel.id
  );
  console.log(`Staff user ${email} saved for ${hotel.name}. Only the bcrypt hash is stored.`);
  await db.close();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
