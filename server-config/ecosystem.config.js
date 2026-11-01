// pm2 (Exercise 2, 7): several web instances in cluster mode plus one worker.
module.exports = {
  apps: [
    {
      name: 'night-agent-web',
      script: './backend/app.js',
      instances: 2,          // phase 4: compare 1 vs. several instances with loadtest
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production', PORT: 3000 },
    },
    {
      name: 'night-agent-worker',
      script: './worker/worker.js',
      instances: 1,
      env: { NODE_ENV: 'production' },
    },
  ],
};
