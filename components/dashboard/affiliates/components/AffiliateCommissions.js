/**
 * Affiliate Commissions Component
 * Display commission history with filtering and pagination
 */
import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';

export default function AffiliateCommissions({ userData, affiliateData }) {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    loadCommissions();
  }, [filter, page]);

  const loadCommissions = async () => {
    try {
      setLoading(true);
      const statusParam = filter !== 'all' ? `&status=${filter}` : '';
      const response = await authApiRequest(`api/affiliates/commissions?page=${page}&limit=20${statusParam}`);
      
      if (response.ok) {
        const data = await response.json();
        setCommissions(data.commissions || []);
        setTotalPages(data.total_pages || 1);
        setSummary(data.summary || null);
      } else {
        setError('Failed to load commissions');
      }
    } catch (err) {
      setError('Error loading commissions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Pending', color: 'var(--warning-color)', bg: 'rgba(241, 196, 15, 0.15)' },
      eligible: { label: 'Eligible', color: 'var(--info-color)', bg: 'rgba(52, 152, 219, 0.15)' },
      processing: { label: 'Processing', color: 'var(--info-color)', bg: 'rgba(52, 152, 219, 0.15)' },
      paid: { label: 'Paid', color: 'var(--success-color)', bg: 'rgba(46, 204, 113, 0.15)' },
      cancelled: { label: 'Cancelled', color: 'var(--danger-color)', bg: 'rgba(231, 76, 60, 0.15)' },
      clawback: { label: 'Clawback', color: 'var(--danger-color)', bg: 'rgba(231, 76, 60, 0.15)' }
    };
    
    const config = statusConfig[status] || { label: status, color: 'inherit', bg: 'var(--bg-secondary)' };
    return (
      <span style={{ 
        padding: '3px 8px', 
        borderRadius: '4px', 
        fontSize: '0.8em',
        background: config.bg,
        color: config.color
      }}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return num < 0 ? `-$${Math.abs(num).toFixed(2)}` : `$${num.toFixed(2)}`;
  };

  return (
    <div>
      {/* Summary Cards */}
      {summary && (
        <div className="section-box">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '15px' }}>
            <div className="form-card" style={{ textAlign: 'center', padding: '15px' }}>
              <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: 'var(--warning-color)' }}>
                {formatCurrency(summary.total_pending || 0)}
              </div>
              <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Pending</div>
            </div>
            <div className="form-card" style={{ textAlign: 'center', padding: '15px' }}>
              <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: 'var(--success-color)' }}>
                {formatCurrency(summary.total_paid || 0)}
              </div>
              <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Paid</div>
            </div>
            <div className="form-card" style={{ textAlign: 'center', padding: '15px' }}>
              <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{summary.pending_count || 0}</div>
              <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Pending Count</div>
            </div>
            <div className="form-card" style={{ textAlign: 'center', padding: '15px' }}>
              <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{summary.total_count || 0}</div>
              <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Total</div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
        {['all', 'pending', 'paid', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => { setFilter(status); setPage(1); }}
            className={filter === status ? '' : 'secondary'}
            style={{ padding: '6px 12px', fontSize: '0.9em' }}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Commissions Table */}
      {loading ? (
        <div className="loading-state">Loading commissions...</div>
      ) : error ? (
        <div className="error-alert">
          {error}
          <button onClick={loadCommissions} className="secondary" style={{ marginLeft: '10px' }}>
            Try Again
          </button>
        </div>
      ) : commissions.length === 0 ? (
        <div className="info-alert">
          <h3>No commissions yet</h3>
          <p>Start sharing your affiliate links to earn commissions!</p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}>Order</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Item Amount</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Commission</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}>Eligible Date</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map(commission => (
                  <tr key={commission.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 8px' }}>{formatDate(commission.created_at)}</td>
                    <td style={{ padding: '10px 8px' }}>#{commission.order_id}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>{formatCurrency(commission.order_item_amount)}</td>
                    <td style={{ 
                      padding: '10px 8px', 
                      textAlign: 'right',
                      color: parseFloat(commission.net_amount) < 0 ? 'var(--danger-color)' : 'var(--success-color)',
                      fontWeight: 'bold'
                    }}>
                      {formatCurrency(commission.net_amount)}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>{getStatusBadge(commission.status)}</td>
                    <td style={{ padding: '10px 8px' }}>
                      {commission.status === 'paid' 
                        ? formatDate(commission.paid_date)
                        : formatDate(commission.eligible_date)
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px' }}>
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="secondary"
              >
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="secondary"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Info Card */}
      <div className="section-box" style={{ marginTop: '20px' }}>
        <h3>Understanding Commission Status</h3>
        <ul style={{ marginTop: '10px', paddingLeft: '20px', lineHeight: '1.8' }}>
          <li><strong>Pending:</strong> Commission recorded, waiting for 30-day hold period</li>
          <li><strong>Eligible:</strong> Hold period complete, awaiting order shipment</li>
          <li><strong>Paid:</strong> Commission has been paid out</li>
          <li><strong>Cancelled:</strong> Order was refunded or cancelled</li>
          <li><strong>Clawback:</strong> Refund occurred after payout (deducted from future earnings)</li>
        </ul>
      </div>
    </div>
  );
}
