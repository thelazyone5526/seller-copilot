import React, { useState } from 'react';
import { optimizePrice, updateProductStock } from '../api';
import './PricingCard.css';

export default function PricingCard({ selectedProduct, onPriceUpdated }) {
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [newStock, setNewStock]     = useState('');
  const [stockLoading, setStockLoading] = useState(false);

  // Clear state when the selected product changes
  React.useEffect(() => {
    setResult(null);
    setNewStock('');
  }, [selectedProduct?._id]);

  if (!selectedProduct) {
    return (
      <div className="panel-coming-soon">
        <div className="coming-soon-icon">👈</div>
        <p>Select a product to start</p>
        <span>Click any row on the left</span>
      </div>
    );
  }

  const handleOptimize = async () => {
    setLoading(true);
    try {
      const data = await optimizePrice(selectedProduct._id);
      setResult(data);
      if (onPriceUpdated) onPriceUpdated();
    } catch (err) {
      alert('Error optimizing price. Is the FastAPI server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = async () => {
    const qty = parseInt(newStock, 10);
    if (isNaN(qty) || qty < 0) return;
    setStockLoading(true);
    try {
      await updateProductStock(selectedProduct._id, qty);
      setNewStock('');
      if (onPriceUpdated) onPriceUpdated(); // this now also syncs selectedProduct
    } catch (err) {
      alert('Error updating stock.');
    } finally {
      setStockLoading(false);
    }
  };

  const isLowStock = selectedProduct.status === 'low_stock';

  return (
    <div className="pricing-card-container">

      {/* ── Product Summary Header ─────────────────────────────────────── */}
      <div className="pc-header">
        <div className="pc-title">
          <h3>{selectedProduct.name}</h3>
          <span className="badge badge-accent">{selectedProduct.sku}</span>
        </div>
        <div className="pc-competitor-box">
          <span className="pc-label">Competitor prices</span>
          <div className="pc-comp-prices">
            {[selectedProduct.comp_1, selectedProduct.comp_2, selectedProduct.comp_3].map((cp, i) =>
              cp ? <span key={i} className="pc-comp-chip">${cp}</span> : null
            )}
          </div>
        </div>
      </div>

      {/* ── Current Price ──────────────────────────────────────────────── */}
      <div className="pc-current-price">
        <div>
          <span className="pc-label">Current selling price</span>
          <div className="pc-price-display">${selectedProduct.unit_price}</div>
        </div>
        <span className="pc-price-tag">Live</span>
      </div>

      {/* ── Stock Editor ───────────────────────────────────────────────── */}
      <div className="pc-stock-editor">
        <span className="pc-stock-editor-title">Stock Management</span>
        <div className="pc-stock-current">
          <div>
            <span className="pc-label">Current stock</span>
            <span className={`pc-stock-num ${isLowStock ? 'danger' : 'ok'}`}>
              {selectedProduct.current_stock}
              <span className="pc-reorder-hint">/ reorder at {selectedProduct.reorder_point}</span>
            </span>
          </div>
          {isLowStock && (
            <span className="badge badge-danger">⚠ Low</span>
          )}
        </div>
        <div className="pc-stock-input-row">
          <input
            type="number"
            className="pc-stock-input"
            placeholder="Enter new quantity…"
            value={newStock}
            min={0}
            onChange={(e) => setNewStock(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStockUpdate()}
            id="stock-update-input"
          />
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleStockUpdate}
            disabled={stockLoading || newStock === ''}
            id="stock-update-btn"
          >
            {stockLoading ? <><span className="spinner" /> Saving…</> : 'Update'}
          </button>
        </div>
      </div>

      {/* ── Optimization Action ─────────────────────────────────────────── */}
      <div className="pc-action-area">
        {!result && !loading && (
          <button className="btn btn-primary btn-optimize" onClick={handleOptimize}>
            ⚡ Run Price Optimization
          </button>
        )}

        {loading && (
          <div className="pc-loading">
            <div className="spinner" />
            <span>Running ML price sweep…</span>
          </div>
        )}
      </div>

      {/* ── ML Results ─────────────────────────────────────────────────── */}
      {result && (
        <div className="pc-results animate-fade-in">
          <div className="pc-result-header">
            <h4>Recommended Strategy</h4>
            <span className="badge badge-success">
              {(result.confidence_score * 100).toFixed(1)}% confidence
            </span>
            {result.cached && <span className="badge badge-warning">Cached</span>}
          </div>

          <div className="pc-result-grid">
            <div className="stat-card">
              <span className="stat-label">Optimal Price</span>
              <span className="stat-value text-accent">${result.recommended_price}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Predicted Demand</span>
              <span className="stat-value">{result.predicted_demand} units</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Est. Profit</span>
              <span className="stat-value text-success">${result.estimated_profit}</span>
            </div>
          </div>

          <div className="pc-rerun-row">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setResult(null); }}
            >
              ↺ Re-run
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
