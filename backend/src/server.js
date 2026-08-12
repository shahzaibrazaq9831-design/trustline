require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

require('./config/db'); // initializes schema on boot

const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// --- Security-related HTTP headers (CSP, no-sniff, frame-deny, etc.) ---
app.use(helmet());

// --- Only your React app's origin may call this API, and only with credentials ---
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json({ limit: '100kb' })); // caps request body size
app.use(cookieParser());
app.use(apiLimiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);

// 404 fallback
app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

// Central error handler — never leak stack traces or internals to the client.
app.use((err, req, res, next) => {
  console.error(err); // full detail stays server-side, in real logs
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Trustline Bank API listening on http://localhost:${PORT}`);
});
