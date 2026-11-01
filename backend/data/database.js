// SQLite with an async driver and WAL mode, so web instances and worker can share it.
// Final driver choice in phase 1 (e.g. sqlite3 + sqlite promise wrapper).
module.exports = {
  async getDb() {
    throw new Error('Not implemented (phase 1)');
  },
};
