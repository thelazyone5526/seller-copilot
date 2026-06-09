import React from 'react';
import './InventoryTable.css';

export default function InventoryTable({ products, selectedProduct, onSelectProduct }) {
  if (!products || products.length === 0) return null;

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Product Details</th>
            <th>Stock Level</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const isSelected = selectedProduct && selectedProduct._id === product._id;
            const isLowStock = product.status === 'low_stock';
            
            // Calculate stock percentage for the mini progress bar
            const stockPercent = Math.min(100, Math.max(0, (product.current_stock / (product.reorder_point * 2)) * 100));

            return (
              <tr 
                key={product._id} 
                className={`table-row ${isSelected ? 'selected' : ''} ${isLowStock ? 'low-stock-pulse' : ''}`}
                onClick={() => onSelectProduct(product)}
              >
                {/* Column 1: Details */}
                <td>
                  <div className="product-cell">
                    <span className="product-name">{product.name}</span>
                    <span className="product-sku">{product.sku} · ${product.unit_price}</span>
                    <div className="comp-badges" style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      {[product.comp_1, product.comp_2, product.comp_3].map((compPrice, index) => {
                        if (!compPrice) return null;
                        const isCheaper = compPrice > product.unit_price;
                        return (
                          <span key={index} className={`badge ${isCheaper ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem', padding: '1px 4px' }}>
                            C{index + 1}: ${compPrice}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </td>

                {/* Column 2: Stock Bar */}
                <td>
                  <div className="stock-cell">
                    <div className="stock-numbers">
                      <span className="current-stock" style={{ color: isLowStock ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {product.current_stock}
                      </span>
                      <span className="reorder-point">/ {product.reorder_point}</span>
                    </div>
                    <div className="mini-progress-bg">
                      <div 
                        className="mini-progress-fill" 
                        style={{ 
                          width: `${stockPercent}%`,
                          background: isLowStock ? 'var(--danger)' : 'var(--success)'
                        }} 
                      />
                    </div>
                  </div>
                </td>

                {/* Column 3: Status Pill */}
                <td>
                  {isLowStock ? (
                    <span className="badge badge-danger">Low Stock</span>
                  ) : (
                    <span className="badge badge-success">Active</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
