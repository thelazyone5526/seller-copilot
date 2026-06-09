const express = require('express');
const router = express.Router();
const axios = require('axios');
const Product = require('../models/product');
const Alert = require('../models/Alert');
const Supplier = require('../models/Supplier');

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';
const FALLBACK_EMAIL = process.env.FALLBACK_EMAIL ||
  'Dear Supplier, we urgently need to discuss a restock. Please contact us at your earliest convenience.';

/**
 * POST /api/negotiation/draft
 * Body: { "product_id", "alert_id", "action_type": "initial_request"|"price_negotiation" }
 *
 * 1. Reads product, alert, and supplier from MongoDB
 * 2. Passes context to FastAPI /rag/generate-email
 * 3. Saves draft_email back to the alert document
 * 4. Returns draft to client
 */
router.post('/draft', async (req, res) => {
  try {
    const { product_id, alert_id, action_type } = req.body;

    if (!product_id || !alert_id || !action_type) {
      return res.status(400).json({
        error: 'product_id, alert_id, and action_type are required',
      });
    }

    const validTypes = ['initial_request', 'price_negotiation'];
    if (!validTypes.includes(action_type)) {
      return res.status(400).json({
        error: `action_type must be one of: ${validTypes.join(', ')}`,
      });
    }

    const [product, alert] = await Promise.all([
      Product.findById(product_id),
      Alert.findById(alert_id),
    ]);

    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    const supplier = await Supplier.findById(product.supplier_id);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found for this product' });

    // Node.js assembles the context — FastAPI never queries MongoDB independently
    const ragPayload = {
      product_context: {
        sku: product.sku,
        name: product.name,
        current_stock: product.current_stock,
        reorder_point: product.reorder_point,
        suggested_reorder_qty: alert.suggested_reorder_qty,
      },
      supplier_context: {
        name: supplier.name,
        contact_name: supplier.contact_name,
        payment_terms: supplier.payment_terms,
      },
      supplier_id: supplier._id.toString(),
      action_type,
    };

    let draft_email;
    try {
      const ragRes = await axios.post(`${FASTAPI_URL}/rag/generate-email`, ragPayload, {
        timeout: 30000,
      });
      draft_email = ragRes.data.draft_email;
    } catch (ragErr) {
      console.warn('[Negotiation] RAG service unavailable, using fallback email');
      draft_email = FALLBACK_EMAIL;
    }

    // Save draft inline on the alert document
    await Alert.findByIdAndUpdate(alert_id, { draft_email });

    res.json({ draft_email, alert_id, action_type });
  } catch (err) {
    console.error('[Negotiation] draft error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
