// Worker (plan section 6.2). Runs as a separate pm2 process, independent of web instances.
// Loop: claim one pending job atomically (pending -> processing), load history and hotel_info,
// call the AI with timeout and retries, send reply via Twilio on the same channel,
// or mark needs_human + notify staff. Set job to done/failed.
const config = require('../backend/config');
// const { getDb } = require('../backend/data/database');
// const ai = require('../backend/services/ai');
// const twilio = require('../backend/services/twilio');
// const mail = require('../backend/services/mail');

const POLL_INTERVAL_MS = 1000;

async function processNextJob() {
  // TODO phase 1
  return false;
}

async function loop() {
  try {
    const didWork = await processNextJob();
    setTimeout(loop, didWork ? 0 : POLL_INTERVAL_MS);
  } catch (err) {
    console.error('Worker error:', err);
    setTimeout(loop, POLL_INTERVAL_MS);
  }
}

console.log(`Night Agent worker (pid ${process.pid}) started, model ${config.ai.model}`);
loop();
