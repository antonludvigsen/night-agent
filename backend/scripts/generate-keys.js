// Generates DATA_ENCRYPTION_KEY and LOOKUP_SALT with crypto.randomBytes (Exercise 10)
// and writes them to .env in the repo root. Existing values are never overwritten,
// because data encrypted with the old key could then no longer be decrypted.
// The values are not printed. Usage: npm run keys (from backend/)
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '..', '.env');
const wanted = {
  DATA_ENCRYPTION_KEY: () => crypto.randomBytes(32).toString('hex'), // 256-bit AES key
  LOOKUP_SALT: () => crypto.randomBytes(16).toString('hex'),
};

let env = fs.readFileSync(envPath, 'utf8');
for (const [name, generate] of Object.entries(wanted)) {
  const line = new RegExp(`^${name}=(.*)$`, 'm');
  const match = env.match(line);
  if (match && match[1].trim() !== '') {
    console.log(`${name}: already set, left unchanged`);
  } else if (match) {
    env = env.replace(line, `${name}=${generate()}`);
    console.log(`${name}: generated`);
  } else {
    env = `${env.trimEnd()}\n${name}=${generate()}\n`;
    console.log(`${name}: generated (line added)`);
  }
}
fs.writeFileSync(envPath, env);
