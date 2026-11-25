// Approved hotel knowledge the AI answers from. Requires a valid login token.
const express = require('express');
const { getDb } = require('../data/database');
const { contentHash } = require('../services/crypto');
const { requireUser } = require('../middleware/requireUser');
const validate = require('../middleware/validate');

const router = express.Router();
router.use(requireUser);

// GET /api/hotel-info   200, 401
router.get('/', async (req, res) => {
  const db = await getDb();
  const rows = await db.all(
    'SELECT key, text, content_hash, approved_by, updated_at FROM hotel_info WHERE hotel_id = ? ORDER BY key',
    req.user.hotel_id
  );
  // intact = the text still matches the fingerprint stored when it was approved.
  res.json(rows.map(({ content_hash, ...row }) => ({ ...row, intact: contentHash(row.text) === content_hash })));
});

// PUT /api/hotel-info/:key   { text, title? }   200, 400, 401, 404, 409
// Saving a text approves it: a SHA-256 fingerprint of the text is stored with it,
// and the worker checks the fingerprint before the text is given to the AI.
// An optional { title } renames the text: the title is the key the AI sees.
router.put('/:key', validate.putHotelInfo, async (req, res) => {
  const { key: oldKey } = req.params;
  const { text, title } = req.body; // trimmed by the validator
  const key = title || oldKey;

  const db = await getDb();
  if (key !== oldKey) {
    const taken = await db.get('SELECT 1 FROM hotel_info WHERE hotel_id = ? AND key = ?', req.user.hotel_id, key);
    if (taken) return res.status(409).json({ error: 'A text with that title already exists' });
    const renamed = await db.run(
      `UPDATE hotel_info SET key = ?, text = ?, content_hash = ?, approved_by = ?, updated_at = datetime('now')
       WHERE hotel_id = ? AND key = ?`,
      key, text, contentHash(text), req.user.email, req.user.hotel_id, oldKey
    );
    if (renamed.changes === 0) return res.status(404).json({ error: 'Not found' });
  } else await db.run(
    `INSERT INTO hotel_info (hotel_id, key, text, content_hash, approved_by)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (hotel_id, key) DO UPDATE SET
       text = excluded.text, content_hash = excluded.content_hash,
       approved_by = excluded.approved_by, updated_at = datetime('now')`,
    req.user.hotel_id, key, text, contentHash(text), req.user.email
  );
  const row = await db.get(
    'SELECT key, text, approved_by, updated_at FROM hotel_info WHERE hotel_id = ? AND key = ?',
    req.user.hotel_id, key
  );
  res.json({ ...row, intact: true });
});

module.exports = router;
