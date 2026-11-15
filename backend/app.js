// Express setup and middleware stack (Exercise 1, 2, 3, 10).
const fs = require('fs');
const https = require('https');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const responseTime = require('response-time');
const cookieParser = require('cookie-parser');
const config = require('./config');

const webhookRoutes = require('./routes/webhooks');
const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const hotelInfoRoutes = require('./routes/hotelInfo');
const healthRoutes = require('./routes/health');
const { requirePage } = require('./middleware/requireUser');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const frontendDir = path.join(__dirname, '..', 'frontend');

// Behind Nginx: trust X-Forwarded-Proto/Host so the Twilio signature URL matches,
// and so rate limiting sees the client's IP address instead of Nginx's.
app.set('trust proxy', 1);

// Middleware stack from Exercise 3
app.use(responseTime()); // X-Response-Time header on every response
app.use(helmet());       // security headers, including HSTS
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
app.use(cors({ origin: config.publicBaseUrl, credentials: true })); // dashboard is served from the same origin
app.use(express.urlencoded({ extended: false })); // Twilio webhooks are form-encoded
app.use(express.json());
app.use(cookieParser()); // reads the login token from the cookie
// TODO phase 3: express-rate-limit on the webhooks

// Dashboard pages are only served to a logged-in user; otherwise redirect to the login page.
// The data itself is protected on the API (requireUser); this is defence in depth.
const protectedPages = ['conversations.html', 'conversation.html', 'hotel-info.html', 'stats.html'];
for (const page of protectedPages) {
  app.get(`/${page}`, requirePage, (req, res) => res.sendFile(path.join(frontendDir, page)));
}

// Public files: login page, CSS and scripts
app.use(express.static(frontendDir));

app.use('/webhooks/twilio', webhookRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/hotel-info', hotelInfoRoutes);
app.use('/health', healthRoutes);

app.use(notFound);
app.use(errorHandler);

if (config.env !== 'production' && config.https.keyPath && config.https.certPath) {
  // Local development over HTTPS with a self-signed certificate (Exercise 10, task 4 and 5),
  // so the Secure cookie can be tested. The browser warns, because no CA has signed it.
  const options = {
    key: fs.readFileSync(config.https.keyPath),
    cert: fs.readFileSync(config.https.certPath),
  };
  https.createServer(options, app).listen(config.port, '127.0.0.1', () => {
    console.log(`Night Agent web (pid ${process.pid}) on https://localhost:${config.port} (self-signed)`);
  });
} else {
  app.listen(config.port, '127.0.0.1', () => {
    console.log(`Night Agent web (pid ${process.pid}) on http://localhost:${config.port}`);
  });
}
