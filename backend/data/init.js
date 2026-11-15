// Creates the tables from schema.sql and inserts seed.sql. Safe to run again:
// the schema uses IF NOT EXISTS and the seed uses INSERT OR IGNORE.
// Usage: npm run db:init (from backend/)
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { getDb } = require('./database');
const { contentHash } = require('../services/crypto');

async function init() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');

  const db = await getDb();
  await db.exec(schema);
  await db.exec(seed);

  // Fingerprint of approved hotel knowledge (SHA-256), set for rows that have none yet.
  const rows = await db.all('SELECT id, text FROM hotel_info WHERE content_hash IS NULL');
  for (const row of rows) {
    await db.run('UPDATE hotel_info SET content_hash = ? WHERE id = ?', contentHash(row.text), row.id);
  }

  const tables = await db.all("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
  const info = await db.get('SELECT COUNT(*) AS n FROM hotel_info');
  console.log(`Database ready at ${config.dbPath}`);
  console.log(`Tables: ${tables.map((t) => t.name).join(', ')}`);
  console.log(`hotel_info rows: ${info.n}`);
  await db.close();
}

init().catch((err) => {
  console.error(err);
  process.exit(1);
});
