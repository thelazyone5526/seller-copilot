const Alert = require('../models/Alert');
const Product = require('../models/product');

/**
 * Called after every PUT /api/products/:id.
 * Creates a LOW_STOCK alert if stock <= reorder_point (idempotent).
 * Resolves any open alert if stock is back above reorder_point.
 *
 * @param {import('mongoose').Document} product - Updated product document
 */
async function checkAndCreateAlert(product) {
  if (product.current_stock <= product.reorder_point) {
    // Idempotency guard — never create duplicate open alerts
    const existing = await Alert.findOne({
      product_id: product._id,
      type: 'LOW_STOCK',
      status: 'open',
    });

    if (!existing) {
      const suggested_reorder_qty = Math.max(
        product.reorder_point * 2 - product.current_stock,
        10
      );
      await Alert.create({
        product_id: product._id,
        sku: product.sku,
        type: 'LOW_STOCK',
        current_stock: product.current_stock,
        reorder_point: product.reorder_point,
        suggested_reorder_qty,
        status: 'open',
      });
      console.log(`[AlertService] LOW_STOCK alert created for SKU: ${product.sku}`);
    } else {
      console.log(`[AlertService] LOW_STOCK alert already open for SKU: ${product.sku} — skipping`);
    }

    // Keep product status in sync
    await Product.findByIdAndUpdate(product._id, { status: 'low_stock' });
  } else {
    // Stock recovered — resolve any open alerts for this product
    const resolved = await Alert.updateMany(
      { product_id: product._id, type: 'LOW_STOCK', status: 'open' },
      { status: 'resolved' }
    );
    if (resolved.modifiedCount > 0) {
      console.log(`[AlertService] Resolved ${resolved.modifiedCount} alert(s) for SKU: ${product.sku}`);
    }
    await Product.findByIdAndUpdate(product._id, { status: 'active' });
  }
}

module.exports = { checkAndCreateAlert };
