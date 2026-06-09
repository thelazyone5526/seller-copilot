const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const { checkAndCreateAlert } = require('../services/alertService');

/**
 * GET /api/products
 * Returns all products with supplier info populated.
 */
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate(
      'supplier_id',
      'name contact_email contact_name payment_terms avg_lead_time_days'
    );
    res.json({ products });
  } catch (err) {
    console.error('[Products] GET error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/products/:id
 * Updates a product and triggers low-stock alert detection.
 */
router.put('/:id', async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updated_at: new Date() },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: 'Product not found' });

    // Always run alert detection after a stock update
    await checkAndCreateAlert(updated);

    res.json({ product: updated });
  } catch (err) {
    console.error('[Products] PUT error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
