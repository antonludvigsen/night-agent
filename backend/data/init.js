// Creates tables from schema.sql and inserts seed.sql (phase 1, once the driver is chosen).
const fs = require('fs');
const path = require('path');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');

// TODO phase 1: const db = await require('./database').getDb(); await db.exec(schema); await db.exec(seed);
console.log(`schema.sql: ${schema.length} chars, seed.sql: ${seed.length} chars (not applied yet)`);
