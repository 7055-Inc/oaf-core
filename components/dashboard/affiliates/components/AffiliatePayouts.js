/**
 * Affiliate Payouts Component
 * Display payout history and status
 */
import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';

export default function AffiliatePayouts({ userData, affiliateData }) {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadPayouts();
  }, [page]);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      const response = await authApiRequest(`api/affiliates/payouts?page=${page}&limit=20`);
      
      if (response.ok) {
        const data = await response.json();
        setPayouts(data.payouts || []);
        setTotalPages(data.total_pages || 1);
      } else {
        setError('Failed to load payouts');
      }
    } catch (err) {
      setError('Error loading payouts');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      scheduled: { label: 'Scheduled', color: 'var(--warning-color)', bg: 'rgba(241, 196, 15, 0.15)' },
      processing: { label: 'Processing', color: 'var(--info-color)', bg: 'rgba(52, 152, 219, 0.15)' },
      completed: { label: 'Completed', color: 'var(--success-color)', bg: 'rgba(46, 204, 113, 0.15)' },
      failed: { label: 'Failed', color: 'var(--danger-color)', bg: 'rgba(231, 76, 60, 0.15)' }
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
    return `$${(parseFloat(amount) || 0).toFixed(2)}`;
  };

  return (
    <div>
      {/* Summary Cards */}
      <div className="section-box">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
          <div className="form-card" style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '1.3em', fontWeight: 'bold', color: 'var(--success-color)' }}>
              {formatCurrency(affiliateData?.paid_balance || 0)}
            </div>
            <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '5px' }}>Total Paid Out</div>
          </div>
          <div className="form-card" style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '1.3em', fontWeight: 'bold', color: 'var(--warning-color)' }}>
              {formatCurrency(affiliateData?.pending_balance || 0)}
            </div>
            <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '5px' }}>Pending Payout</div>
          </div>
          <div className="form-card" style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontWeight: 'bold' }}>
              {affiliateData?.payout_method === 'stripe' ? 'Bank Transfer' : 'Site Credit'}
            </div>
            <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '5px' }}>Payout Method</div>
          </div>
        </div>
      </div>

      {/* Payouts Table */}
      {loading ? (
        <div className="loading-state">Loading payouts...</div>
      ) : error ? (
        <div className="error-alert">
          {error}
          <button onClick={loadPayouts} className="secondary" style={{ marginLeft: '10px' }}>
            Try Again
          </button>
        </div>
      ) : payouts.length === 0 ? (
        <div className="info-alert">
          <h3>No payouts yet</h3>
          <p>Your first payout will appear here after commissions are processed.</p>
          <p style={{ marginTop: '10px', color: 'var(--text-muted)' }}>
            Commissions are held for 30 days after an order is placed. 
            Once the order is shipped and the hold period ends, your earnings 
            are processed for payout.
          </p>
        </div>
      ) : (
        <>
          <div className="section-box">
            <h3>Payout History</h3>
            <div style={{ overflowX: 'auto', marginTop: '15px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center' }}>Commissions</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center' }}>Method</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(payout => (
                    <tr key={payout.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 8px' }}>{formatDate(payout.processed_at || payout.scheduled_for)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--success-color)', fontWeight: 'bold' }}>
                        {formatCurrency(payout.total_amount)}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>{payout.commission_count} item(s)</td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        {payout.payout_method === 'stripe' ? 'Bank' : 'Credit'}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>{getStatusBadge(payout.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

      {/* Payout Info */}
      <div className="section-box" style={{ marginTop: '20px' }}>
        <h3>Payout Schedule</h3>
        <p style={{ marginTop: '10px' }}>
          Payouts are processed daily at 2:00 AM UTC. To be included in a payout:
        </p>
        <ul style={{ marginTop: '10px', paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>Commission must be past the 30-day hold period</li>
          <li>Associated order must be marked as shipped</li>
          <li>Your affiliate account must be active</li>
        </ul>
        {affiliateData?.payout_method === 'stripe' && (
          <p style={{ marginTop: '10px', fontSize: '0.9em', color: 'var(--text-muted)' }}>
            Bank transfers typically arrive within 2-3 business days.
          </p>
        )}
      </div>
    </div>
  );
}
