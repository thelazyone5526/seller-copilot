const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/seller-copilot';

app.use(cors());
app.use(express.json());

// Mongoose connection placeholder
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  });

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/products', (req, res) => {
  res.json({
    message: 'List all products',
    products: []
  });
});

app.put('/api/products/:id', (req, res) => {
  res.json({
    message: 'Update product (stub)',
    productId: req.params.id,
    body: req.body
  });
});

app.get('/api/alerts', (req, res) => {
  res.json({
    message: 'Get all open alerts',
    alerts: []
  });
});

app.put('/api/alerts/:id/resolve', (req, res) => {
  res.json({
    message: 'Resolve alert (stub)',
    alertId: req.params.id
  });
});

app.post('/api/pricing/optimize', (req, res) => {
  res.json({
    message: 'Run price optimization (stub)',
    recommended_price: 24.99,
    predicted_demand: 87,
    estimated_profit: 1131.13,
    confidence_score: 0.82,
    request: req.body
  });
});

app.post('/api/negotiation/draft', (req, res) => {
  res.json({
    message: 'Generate supplier email draft (stub)',
    draft: 'Draft email placeholder.',
    request: req.body
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
