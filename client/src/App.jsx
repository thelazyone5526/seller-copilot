import { useState, useEffect, useCallback } from 'react';
import { getProducts, getAlerts } from './api';
import InventoryTable from './components/InventoryTable';
import PricingCard from './components/PricingCard';
import AlertComposer from './components/AlertComposer';
import './App.css';

export default function App() {
  const [products, setProducts] = useState([]);
  const [alerts, setAlerts]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [prods, alts] = await Promise.all([getProducts(), getAlerts()]);
      setProducts(prods);
      setAlerts(alts);
      setError(null);

      // ── FIX: keep selectedProduct in sync with fresh data ──────────────
      setSelectedProduct((prev) => {
        if (!prev) return null;
        const fresh = prods.find((p) => p._id === prev._id);
        return fresh ?? prev;
      });
    } catch (err) {
      setError('Cannot connect to backend. Please check if the server is running and VITE_API_URL is set.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-inner">
          <div className="loading-logo">
            <span className="logo-icon">🛒</span>
            <span className="logo-text">Seller <span>Copilot</span></span>
          </div>
          <div className="loading-bar">
            <div className="loading-bar-fill" />
          </div>
          <p className="loading-sub">Loading your inventory...</p>
        </div>
      </div>
    );
  }

  // ── Error State ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="app-loading">
        <div className="loading-inner">
          <div className="error-icon">⚠️</div>
          <h2 style={{ color: 'var(--danger)', marginBottom: 8 }}>Connection Failed</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 360, textAlign: 'center' }}>{error}</p>
        </div>
      </div>
    );
  }

  const lowStockCount = products.filter((p) => p.status === 'low_stock').length;

  // ── Main Layout ────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      {/* ── Top Nav ─────────────────────────────────────────────────────── */}
      <header className="topnav">
        <div className="topnav-brand">
          <div className="nav-logo-mark">🛒</div>
          <span className="nav-logo-text">Seller Copilot</span>
          <span className="nav-badge">Beta</span>
        </div>

        <div className="topnav-stats">
          <div className="nav-stat">
            <span className="nav-stat-value">{products.length}</span>
            <span className="nav-stat-label">Products</span>
          </div>
          <div className="nav-stat">
            <span className="nav-stat-value" style={{ color: alerts.length > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {alerts.length}
            </span>
            <span className="nav-stat-label">Open Alerts</span>
          </div>
          <div className="nav-stat">
            <span className="nav-stat-value" style={{ color: lowStockCount > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
              {lowStockCount}
            </span>
            <span className="nav-stat-label">Low Stock</span>
          </div>
        </div>

        <div className="topnav-actions">
          <button className="btn btn-ghost btn-sm" onClick={fetchAll} id="refresh-btn">
            ↺ Refresh
          </button>
          <div className="nav-pulse-dot" title="Backend connected" />
        </div>
      </header>

      {/* ── Page Title ──────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>Inventory Intelligence</h1>
          <p className="page-sub">Real-time stock · AI price optimization · Automated supplier negotiation</p>
        </div>
      </div>
      <div className="page-header-divider" />

      {/* ── 3-Column Layout ─────────────────────────────────────────────── */}
      <main className="app-grid">
        {/* Left Panel — Inventory */}
        <section className="panel glass" id="inventory-panel">
          <div className="panel-header">
            <div className="panel-label">
              <div className="panel-icon icon-purple">📦</div>
              <h2>Inventory</h2>
            </div>
            <span className="badge badge-accent">{products.length} products</span>
          </div>
          <InventoryTable 
            products={products} 
            selectedProduct={selectedProduct} 
            onSelectProduct={setSelectedProduct} 
          />
        </section>

        {/* Center Panel — Pricing */}
        <section className="panel glass" id="pricing-panel">
          <div className="panel-header">
            <div className="panel-label">
              <div className="panel-icon icon-blue">💹</div>
              <h2>Price Optimizer</h2>
            </div>
            <span className="badge badge-info">AI powered</span>
          </div>
          <PricingCard 
            selectedProduct={selectedProduct} 
            onPriceUpdated={fetchAll} 
          />
        </section>

        {/* Right Panel — Alerts */}
        <section className="panel glass" id="alerts-panel">
          <div className="panel-header">
            <div className="panel-label">
              <div className="panel-icon icon-orange">🔔</div>
              <h2>Alerts</h2>
            </div>
            {alerts.length > 0 && (
              <span className="badge badge-danger">{alerts.length} open</span>
            )}
          </div>
          <AlertComposer 
            alerts={alerts} 
            onAlertsChanged={fetchAll} 
          />
        </section>
      </main>
    </div>
  );
}
