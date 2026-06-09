require('dns').setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/seller-copilot';

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Database ─────────────────────────────────────────────────────────────────
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err.message));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/products', require('./routes/products'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/pricing', require('./routes/pricing'));
app.use('/api/negotiation', require('./routes/negotiation'));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'node' }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Unhandled]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`Node.js server running on port ${PORT}`));
