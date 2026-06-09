/**
 * Simple in-memory LRU cache with 5-minute TTL.
 * Used on POST /api/pricing/optimize keyed by product_id.
 */
const TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function set(key, value) {
  cache.set(key, { value, timestamp: Date.now() });
}

function invalidate(key) {
  cache.delete(key);
}

module.exports = { get, set, invalidate };
