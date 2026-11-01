// Claude API over HTTPS with fetch() and AbortController timeout (phase 1).
// System prompt: answer briefly and only from approved hotel_info; invent nothing.
// Guest text is passed as data, not instructions (prompt injection).
// Returns { answer, needs_human, reason }.
module.exports = {
  async generateReply({ hotelInfo, history, guestMessage }) {
    throw new Error('Not implemented (phase 1)');
  },
};
