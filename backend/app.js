// Express setup and middleware stack (Exercise 1, 2, 3).
const path = require('path');
const express = require('express');
const cors = require('cors');
const config = require('./config');

const webhookRoutes = require('./routes/webhooks');
const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const hotelInfoRoutes = require('./routes/hotelInfo');
const healthRoutes = require('./routes/health');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Behind Nginx: trust X-Forwarded-Proto/Host so the Twilio signature URL matches (phase 1)
app.set('trust proxy', 1);

// TODO phase 1: helmet, morgan, response-time (Exercise 3)
// TODO phase 2: cookie-parser, express-session with shared session store
// TODO phase 3: express-rate-limit on /api/auth/login
app.use(cors());
app.use(express.urlencoded({ extended: false })); // Twilio webhooks are form-encoded
app.use(express.json());

// Static dashboard (in production Nginx serves frontend/ directly)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/webhooks/twilio', webhookRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/hotel-info', hotelInfoRoutes);
app.use('/health', healthRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, '127.0.0.1', () => {
  console.log(`Night Agent web (pid ${process.pid}) on http://localhost:${config.port}`);
});
