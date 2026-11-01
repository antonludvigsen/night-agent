-- Night Agent data model (plan_netvaerksapplikation.md section 4)
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS hotels (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL,
  sms_number      TEXT,
  whatsapp_number TEXT
);

CREATE TABLE IF NOT EXISTS hotel_info (
  id          INTEGER PRIMARY KEY,
  hotel_id    INTEGER NOT NULL REFERENCES hotels(id),
  key         TEXT NOT NULL,
  text        TEXT NOT NULL,
  approved_by TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (hotel_id, key)
);

CREATE TABLE IF NOT EXISTS conversations (
  id                INTEGER PRIMARY KEY,
  hotel_id          INTEGER NOT NULL REFERENCES hotels(id),
  channel           TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp')),
  guest_number_enc  TEXT NOT NULL,
  guest_number_hash TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'ai' CHECK (status IN ('ai', 'needs_human', 'closed')),
  assigned_to       INTEGER REFERENCES staff_users(id),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_conversations_lookup ON conversations (hotel_id, channel, guest_number_hash);

CREATE TABLE IF NOT EXISTS messages (
  id              INTEGER PRIMARY KEY,
  hotel_id        INTEGER NOT NULL REFERENCES hotels(id),
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction       TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  author          TEXT NOT NULL CHECK (author IN ('guest', 'ai', 'staff')),
  body            TEXT NOT NULL,
  message_sid     TEXT,
  delivery_status TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (hotel_id, message_sid) -- idempotency for repeated webhooks
);

CREATE TABLE IF NOT EXISTS jobs (
  id         INTEGER PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  attempts   INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status, created_at);

CREATE TABLE IF NOT EXISTS staff_users (
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  hotel_id      INTEGER NOT NULL REFERENCES hotels(id)
);

CREATE TABLE IF NOT EXISTS sessions (
  sid     TEXT PRIMARY KEY,
  sess    TEXT NOT NULL,
  expires INTEGER NOT NULL
);
