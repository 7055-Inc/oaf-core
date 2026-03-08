/**
 * Payouts & Earnings Component
 * Shows balance, earnings metrics, and payout history
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchBalance, fetchEarnings, fetchPayouts } from '../../../lib/finances';

export default function PayoutsEarnings() {
  const [balance, setBalance] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [balanceData, earningsData, payoutsData] = await Promise.all([
        fetchBalance(),
        fetchEarnings(),
        fetchPayouts()
      ]);

      setBalance(balanceData);
      setEarnings(earningsData);
      setPayouts(payoutsData.payouts || []);
      setPending(payoutsData.pending);
    } catch (err) {
      console.error('Error loading financial data:', err);
      setError(err.message || 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const toggleRowExpansion = (payoutId) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(payoutId)) next.delete(payoutId);
      else next.add(payoutId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading financial data...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error-alert">{error}</div>;
  }

  return (
    <div>
      {/* Balance Overview */}
      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '600', color: 'var(--primary-color)' }}>
            {formatCurrency(balance?.balance?.current_balance)}
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>Current Balance</div>
        </div>
        <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#d97706' }}>
            {formatCurrency(pending?.amount)}
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>Pending Payout</div>
          {pending?.next_date && (
            <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
              Next: {formatDate(pending.next_date)}
            </div>
          )}
        </div>
        <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#059669' }}>
            {formatCurrency(balance?.balance?.total_paid_out)}
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>Total Paid Out</div>
        </div>
        <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: '600', color: '#6366f1' }}>
            {balance?.balance?.total_orders || 0}
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>Total Orders</div>
        </div>
      </div>

      {/* Earnings This Month */}
      {earnings && (
        <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>This Month's Earnings</h3>
          <div className="stat-grid">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>
                {formatCurrency(earnings.this_month?.sales)}
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>Gross Sales</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#dc2626' }}>
                -{formatCurrency(earnings.this_month?.commission)}
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>Platform Fees</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '600', color: '#059669' }}>
                {formatCurrency(earnings.this_month?.net)}
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>Net Earnings</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                color: earnings.growth_percent >= 0 ? '#059669' : '#dc2626' 
              }}>
                {earnings.growth_percent >= 0 ? '+' : ''}{earnings.growth_percent}%
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>vs Last Month</div>
            </div>
          </div>
        </div>
      )}

      {/* Payout Settings */}
      {balance?.settings && (
        <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>Payout Settings</h3>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ color: '#666', fontSize: '14px' }}>Minimum Payout: </span>
              <strong>{formatCurrency(balance.settings.minimum_payout)}</strong>
            </div>
            <div>
              <span style={{ color: '#666', fontSize: '14px' }}>Payout Delay: </span>
              <strong>{balance.settings.payout_days} days after shipment</strong>
            </div>
            {balance.settings.commission_rate && (
              <div>
                <span style={{ color: '#666', fontSize: '14px' }}>Commission Rate: </span>
                <strong>{balance.settings.commission_rate}%</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payout History */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Payout History</h3>
        
        {payouts.length === 0 ? (
          <div className="empty-state">
            <i className="fa-solid fa-money-bill-transfer"></i>
            <p>No payouts yet. Payouts are processed automatically when your balance meets the minimum threshold.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr 
                    key={payout.id}
                    onClick={() => toggleRowExpansion(payout.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{formatDate(payout.created_at)}</td>
                    <td style={{ fontWeight: '500' }}>{formatCurrency(Math.abs(payout.amount))}</td>
                    <td>
                      <span className={`status-badge ${payout.status === 'completed' ? 'success' : 'warning'}`}>
                        {payout.status}
                      </span>
                    </td>
                    <td>
                      <code style={{ fontSize: '12px' }}>{payout.stripe_transfer_id || payout.id}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
