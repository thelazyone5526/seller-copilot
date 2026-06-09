import React, { useState } from 'react';
import { draftEmail, resolveAlert } from '../api';
import './AlertComposer.css';

export default function AlertComposer({ alerts, onAlertsChanged }) {
  const [loadingDraft, setLoadingDraft] = useState(null);   // alert._id being drafted
  const [loadingResolve, setLoadingResolve] = useState(null); // alert._id being resolved
  const [expandedEmail, setExpandedEmail] = useState(null); // alert._id with email open

  if (!alerts || alerts.length === 0) {
    return (
      <div className="panel-coming-soon">
        <div className="coming-soon-icon" style={{ opacity: 0.6 }}>✅</div>
        <p style={{ color: 'var(--success)' }}>All clear!</p>
        <span style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}>No open alerts</span>
      </div>
    );
  }

  const handleDraftEmail = async (alert) => {
    setLoadingDraft(alert._id);
    try {
      await draftEmail(
        alert.product_id._id || alert.product_id,
        alert._id,
        'initial_request'
      );
      // Refresh so the alert doc now has draft_email populated
      await onAlertsChanged();
      setExpandedEmail(alert._id);
    } catch (err) {
      alert('Error drafting email. Is FastAPI server running?');
    } finally {
      setLoadingDraft(null);
    }
  };

  const handleResolve = async (alert) => {
    setLoadingResolve(alert._id);
    try {
      await resolveAlert(alert._id);
      await onAlertsChanged();
      setExpandedEmail(null);
    } catch (err) {
      alert('Error resolving alert.');
    } finally {
      setLoadingResolve(null);
    }
  };

  const handleSendEmail = (alert) => {
    const supplierEmail = alert.product_id?.supplier_id?.contact_email || '';
    const subject = encodeURIComponent(`Urgent Restock Request — ${alert.product_id?.name || alert.sku} (${alert.sku})`);
    const body = encodeURIComponent(alert.draft_email || '');
    window.location.href = `mailto:${supplierEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="alert-list">
      {alerts.map((alert) => {
        const isExpanded = expandedEmail === alert._id;
        const hasDraft = !!alert.draft_email;

        return (
          <div key={alert._id} className={`alert-card ${isExpanded ? 'expanded' : ''}`}>
            {/* Alert Header */}
            <div className="alert-card-header">
              <div className="alert-info">
                <div className="alert-sku">{alert.sku}</div>
                <div className="alert-product-name">
                  {alert.product_id?.name || 'Unknown Product'}
                </div>
              </div>
              <span className="badge badge-danger">LOW STOCK</span>
            </div>

            {/* Stock Stats */}
            <div className="alert-stock-bar">
              <div className="alert-stock-stats">
                <span className="alert-stock-num">{alert.current_stock}</span>
                <span className="alert-stock-label">in stock</span>
                <span className="alert-stock-sep">·</span>
                <span className="alert-stock-label">Reorder at</span>
                <span className="alert-stock-num">{alert.reorder_point}</span>
                <span className="alert-stock-sep">·</span>
                <span className="alert-stock-label">Need</span>
                <span className="alert-stock-num text-warning">{alert.suggested_reorder_qty}</span>
              </div>
            </div>

            {/* Email Draft Area (expanded) */}
            {isExpanded && hasDraft && (
              <div className="email-draft-area animate-fade-in">
                <div className="email-draft-label">
                  <span className="badge badge-success">✓ AI Draft Ready</span>
                </div>
                <textarea
                  className="email-textarea"
                  defaultValue={alert.draft_email}
                  rows={8}
                  spellCheck={false}
                />
                <div className="email-actions">
                  <button className="btn btn-success btn-sm" onClick={() => handleSendEmail(alert)}>
                    📧 Open in Email Client
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setExpandedEmail(null)}
                  >
                    Collapse
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="alert-actions">
              {!hasDraft ? (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleDraftEmail(alert)}
                  disabled={loadingDraft === alert._id}
                  id={`draft-btn-${alert._id}`}
                >
                  {loadingDraft === alert._id ? (
                    <><span className="spinner"></span> Drafting...</>
                  ) : (
                    '✉️ Draft Email'
                  )}
                </button>
              ) : (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setExpandedEmail(isExpanded ? null : alert._id)}
                >
                  {isExpanded ? '▲ Hide Email' : '▼ View Email'}
                </button>
              )}

              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleResolve(alert)}
                disabled={loadingResolve === alert._id}
                id={`resolve-btn-${alert._id}`}
              >
                {loadingResolve === alert._id ? (
                  <><span className="spinner"></span> Resolving...</>
                ) : (
                  '✓ Resolve'
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
