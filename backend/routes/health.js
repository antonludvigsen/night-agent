// GET /health, used by Nginx/load balancer checks and RTT measurements.
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ status: 'ok', pid: process.pid, uptime: process.uptime() });
});

module.exports = router;
