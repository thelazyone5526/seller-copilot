const express = require('express');
const router = express.Router();
const axios = require('axios');
const Product = require('../models/product');
const cache = require('../services/pricingCache');

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

/**
 * POST /api/pricing/optimize
 * Body: { "product_id": "<ObjectId>" }
 *
 * 1. Reads product from MongoDB
 * 2. Calls FastAPI /ml/optimize-price (with 5-min cache)
 * 3. Saves result back to product document
 * 4. Returns recommendation to client
 */
router.post('/optimize', async (req, res) => {
  try {
    const { product_id } = req.body;
    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required' });
    }

    // Check cache first
    const cached = cache.get(product_id);
    if (cached) {
      console.log(`[Pricing] Cache hit for ${product_id}`);
      return res.json({ ...cached, cached: true });
    }

    const product = await Product.findById(product_id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Build ML payload from product fields
    const mlPayload = {
      unit_price: product.unit_price,
      cost_price: product.cost_price,
      customers: Math.max(Math.round(product.volume * 0.3), 50),
      holiday: 0,
      weekday: new Date().getDay() >= 1 && new Date().getDay() <= 5 ? 1 : 0,
      weekend: new Date().getDay() === 0 || new Date().getDay() === 6 ? 1 : 0,
      comp_1: product.comp_1 || product.unit_price * 0.95,
      comp_2: product.comp_2 || product.unit_price * 1.05,
      comp_3: product.comp_3 || product.unit_price,
      ps1: 0.75,
      ps2: 0.72,
      ps3: 0.70,
      fp1: product.comp_1 || product.unit_price * 0.95,
      fp2: product.comp_2 || product.unit_price * 1.05,
      fp3: product.comp_3 || product.unit_price,
      lag_price: product.last_recommended_price || product.unit_price,
      volume: product.volume || 100,
      product_score: product.product_score || 0.5,
      price_range_pct: 0.30,
      price_steps: 30,
    };

    const mlRes = await axios.post(`${FASTAPI_URL}/ml/optimize-price`, mlPayload, {
      timeout: 10000,
    });

    const { recommended_price, predicted_demand, estimated_profit, confidence_score } =
      mlRes.data;

    // Persist results back to the product document
    await Product.findByIdAndUpdate(product_id, {
      last_recommended_price: recommended_price,
      last_predicted_demand: predicted_demand,
      last_estimated_profit: estimated_profit,
      last_confidence_score: confidence_score,
      updated_at: new Date(),
    });

    const result = { recommended_price, predicted_demand, estimated_profit, confidence_score };

    // Cache for 5 minutes
    cache.set(product_id, result);

    res.json(result);
  } catch (err) {
    console.error('[Pricing] optimize error:', err.message);

    // Fallback: return last known recommendation if ML service is down
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      try {
        const product = await Product.findById(req.body.product_id);
        if (product && product.last_recommended_price) {
          return res.json({
            recommended_price: product.last_recommended_price,
            predicted_demand: product.last_predicted_demand,
            estimated_profit: product.last_estimated_profit,
            confidence_score: product.last_confidence_score,
            fallback: true,
          });
        }
      } catch (_) {}
      return res.status(503).json({ error: 'ML service unavailable. Start FastAPI on port 8000.' });
    }

    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
