import axios from 'axios';

const BASE = 'http://localhost:3001/api';

const api = axios.create({ baseURL: BASE });

// ── Products ──────────────────────────────────────────────────────────────────
export const getProducts = () =>
  api.get('/products').then((r) => r.data.products);

export const updateProductStock = (id, current_stock) =>
  api.put(`/products/${id}`, { current_stock }).then((r) => r.data.product);

// ── Alerts ────────────────────────────────────────────────────────────────────
export const getAlerts = () =>
  api.get('/alerts').then((r) => r.data.alerts);

export const resolveAlert = (id) =>
  api.put(`/alerts/${id}/resolve`).then((r) => r.data.alert);

// ── Pricing ───────────────────────────────────────────────────────────────────
export const optimizePrice = (product_id) =>
  api.post('/pricing/optimize', { product_id }).then((r) => r.data);

// ── Negotiation ───────────────────────────────────────────────────────────────
export const draftEmail = (product_id, alert_id, action_type = 'initial_request') =>
  api.post('/negotiation/draft', { product_id, alert_id, action_type }).then((r) => r.data);

export default api;
