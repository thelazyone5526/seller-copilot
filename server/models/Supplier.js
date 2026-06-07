const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contact_email: { type: String, required: true, trim: true, lowercase: true },
    contact_name: { type: String, required: true, trim: true },
    payment_terms: { type: String, required: true, trim: true },
    avg_lead_time_days: { type: Number, required: true, min: 0, default: 0 }
  },
  { collection: 'suppliers' }
);

module.exports = mongoose.model('Supplier', supplierSchema);
