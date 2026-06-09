/**
 * Seed script — inserts suppliers then products into MongoDB.
 * Run with: node server/seed.js
 * Requires MONGO_URI in .env or environment.
 */
// Use Google DNS — fixes SRV lookup failures on Windows system DNS
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const mongoose = require('mongoose');

const Supplier = require('./models/Supplier');
const Product = require('./models/product');
const Alert = require('./models/Alert');

const suppliersData = require('../data/synthetic/suppliers.json');
const productsData = require('../data/synthetic/products.json');

async function seed() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/seller-copilot';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // ── Wipe existing data ──────────────────────────────────────────────────────
  await Promise.all([
    Supplier.deleteMany({}),
    Product.deleteMany({}),
    Alert.deleteMany({}),
  ]);
  console.log('Cleared existing collections');

  // ── Insert suppliers ────────────────────────────────────────────────────────
  const suppliers = await Supplier.insertMany(suppliersData);
  console.log(`Inserted ${suppliers.length} suppliers`);

  // ── Insert products (map supplier_index → _id) ──────────────────────────────
  const productDocs = productsData.map((p) => {
    const { supplier_index, ...rest } = p;
    return { ...rest, supplier_id: suppliers[supplier_index]._id };
  });

  const products = await Product.insertMany(productDocs);
  console.log(`Inserted ${products.length} products`);

  // ── Auto-create LOW_STOCK alerts for products already below reorder point ───
  const lowStockProducts = products.filter(
    (p) => p.current_stock <= p.reorder_point
  );

  const alertDocs = lowStockProducts.map((p) => ({
    product_id: p._id,
    sku: p.sku,
    type: 'LOW_STOCK',
    current_stock: p.current_stock,
    reorder_point: p.reorder_point,
    suggested_reorder_qty: Math.max(p.reorder_point * 2 - p.current_stock, 10),
    status: 'open',
  }));

  if (alertDocs.length > 0) {
    const alerts = await Alert.insertMany(alertDocs);
    console.log(`Created ${alerts.length} LOW_STOCK alerts`);
  }

  console.log('\n[DONE] Seed complete. Summary:');
  console.log(`   Suppliers : ${suppliers.length}`);
  console.log(`   Products  : ${products.length}`);
  console.log(`   Alerts    : ${alertDocs.length}`);
  console.log('\nProduct IDs (save these for testing):');
  products.forEach((p) =>
    console.log(`   ${p.sku.padEnd(12)} -> ${p._id}`)
  );

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
