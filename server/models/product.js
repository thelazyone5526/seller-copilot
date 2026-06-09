const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    unit_price: { type: Number, required: true, min: 0 },
    cost_price: { type: Number, required: true, min: 0 },
    current_stock: { type: Number, required: true, min: 0, default: 0 },
    reorder_point: { type: Number, required: true, min: 0, default: 0 },
    lead_time_days: { type: Number, required: true, min: 0, default: 0 },
    supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    product_score: { type: Number, min: 0, max: 1, default: 0 },
    volume: { type: Number, min: 0, default: 0 },
    comp_1: { type: Number, default: 0 },
    comp_2: { type: Number, default: 0 },
    comp_3: { type: Number, default: 0 },
    last_recommended_price: { type: Number, default: null },
    last_predicted_demand: { type: Number, default: null },
    last_estimated_profit: { type: Number, default: null },
    last_confidence_score: { type: Number, default: null },
    status: { type: String, enum: ['active', 'low_stock'], default: 'active' },
    updated_at: { type: Date, default: Date.now }
  },
  { collection: 'products' }
);


module.exports = mongoose.model('Product', productSchema);
