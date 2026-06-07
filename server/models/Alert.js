const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true, trim: true },
    type: { type: String, enum: ['LOW_STOCK'], default: 'LOW_STOCK' },
    current_stock: { type: Number, required: true, min: 0, default: 0 },
    reorder_point: { type: Number, required: true, min: 0, default: 0 },
    suggested_reorder_qty: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    draft_email: { type: String, default: null },
    created_at: { type: Date, default: Date.now }
  },
  { collection: 'alerts' }
);

module.exports = mongoose.model('Alert', alertSchema);
