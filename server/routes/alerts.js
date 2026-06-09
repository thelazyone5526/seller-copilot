const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');

/**
 * GET /api/alerts
 * Returns all open alerts, newest first.
 */
router.get('/', async (req, res) => {
  try {
    const alerts = await Alert.find({ status: 'open' })
      .populate('product_id', 'name sku unit_price supplier_id')
      .sort({ created_at: -1 });
    res.json({ alerts });
  } catch (err) {
    console.error('[Alerts] GET error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/alerts/:id/resolve
 * Marks an alert as resolved.
 */
router.put('/:id/resolve', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved' },
      { new: true }
    );
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json({ alert });
  } catch (err) {
    console.error('[Alerts] PUT resolve error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
