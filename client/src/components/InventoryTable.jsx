import React from 'react';
import './InventoryTable.css';

export default function InventoryTable({ products, selectedProduct, onSelectProduct }) {
  if (!products || products.length === 0) return null;

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 20 }}></th>
            <th>Product</th>
            <th>Stock</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const isSelected = selectedProduct && selectedProduct._id === product._id;
            const isLowStock = product.status === 'low_stock';
            const stockPercent = Math.min(
              100,
              Math.max(0, (product.current_stock / (product.reorder_point * 2)) * 100)
            );

            return (
              <tr
                key={product._id}
                className={`table-row ${isSelected ? 'selected' : ''} ${isLowStock ? 'low-stock-pulse' : ''}`}
                onClick={() => onSelectProduct(product)}
              >
                {/* Selection indicator */}
                <td style={{ padding: '13px 0 13px 14px' }}>
                  <div className="row-select-indicator">›</div>
                </td>

                {/* Column 1: Product Details */}
                <td>
                  <div className="product-cell">
                    <span className="product-name">{product.name}</span>
                    <span className="product-sku">{product.sku}</span>
                    <span className="product-price">${product.unit_price}</span>
                    <div className="comp-row">
                      {[product.comp_1, product.comp_2, product.comp_3].map((cp, i) => {
                        if (!cp) return null;
                        const isCheaper = cp > product.unit_price;
                        return (
                          <span
                            key={i}
                            className={`badge ${isCheaper ? 'badge-success' : 'badge-warning'}`}
                            style={{ fontSize: '0.63rem', padding: '1px 5px' }}
                          >
                            C{i + 1}: ${cp}
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
                      <span
                        className="current-stock"
                        style={{ color: isLowStock ? 'var(--danger)' : 'var(--text-primary)' }}
                      >
                        {product.current_stock}
                      </span>
                      <span className="reorder-point">/ {product.reorder_point}</span>
                    </div>
                    <div className="mini-progress-bg">
                      <div
                        className="mini-progress-fill"
                        style={{
                          width: `${stockPercent}%`,
                          background: isLowStock ? 'var(--danger)' : 'var(--success)',
                        }}
                      />
                    </div>
                  </div>
                </td>

                {/* Column 3: Status */}
                <td>
                  {isLowStock ? (
                    <span className="badge badge-danger">Low</span>
                  ) : (
                    <span className="badge badge-success">OK</span>
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
