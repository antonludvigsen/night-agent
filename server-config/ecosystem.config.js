// pm2 (Exercise 2, 7): several web instances in cluster mode plus one worker.
// Start from anywhere: pm2 start server-config/ecosystem.config.js
// PORT, NODE_ENV and all keys come from .env in the repo root (not set here).
const path = require('path');

const root = path.join(__dirname, '..');

module.exports = {
  apps: [
    {
      name: 'night-agent-web',
      cwd: root,
      script: path.join(root, 'backend', 'app.js'),
      instances: 2,          // phase 4: compare 1 vs. several instances with loadtest
      exec_mode: 'cluster',
    },
    {
      name: 'night-agent-worker',
      cwd: root,
      script: path.join(root, 'worker', 'worker.js'),
      instances: 1,
    },
  ],
};
