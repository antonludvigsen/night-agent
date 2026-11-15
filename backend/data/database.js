// SQLite with an asynchronous driver (sqlite3 + the sqlite promise wrapper).
// WAL mode lets the web instances and the worker read and write the same file.
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const config = require('../config');

let dbPromise;

// One shared connection per process, opened on first use.
function getDb() {
  if (!dbPromise) {
    dbPromise = open({ filename: config.dbPath, driver: sqlite3.Database }).then(async (db) => {
      await db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
      return db;
    });
  }
  return dbPromise;
}

// Transactions share the single connection, so they are queued within the process:
// two requests can never interleave statements inside the same BEGIN ... COMMIT.
// BEGIN IMMEDIATE takes the write lock up front; other processes wait (busy_timeout).
let queue = Promise.resolve();

function withTransaction(fn) {
  const run = async () => {
    const db = await getDb();
    await db.exec('BEGIN IMMEDIATE');
    try {
      const result = await fn(db);
      await db.exec('COMMIT');
      return result;
    } catch (err) {
      await db.exec('ROLLBACK');
      throw err;
    }
  };
  const result = queue.then(run, run);
  queue = result.catch(() => {});
  return result;
}

module.exports = { getDb, withTransaction };
