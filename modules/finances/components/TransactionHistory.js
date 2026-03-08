/**
 * Transaction History Component
 * Shows detailed transaction history with filters
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchTransactions, fetchBalance } from '../../../lib/finances';

const TRANSACTION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'sale', label: 'Sales' },
  { value: 'commission', label: 'Commissions' },
  { value: 'payout', label: 'Payouts' },
  { value: 'refund', label: 'Refunds' },
  { value: 'adjustment', label: 'Adjustments' },
  { value: 'subscription_charge', label: 'Subscriptions' },
];

const TRANSACTION_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
];

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    page: 1,
    limit: 50
  });

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTransactions(filters);
      setTransactions(result.transactions || []);
      setPagination(result.pagination || { page: 1, total: 0, pages: 0 });
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadBalance = useCallback(async () => {
    try {
      const data = await fetchBalance();
      setBalance(data);
    } catch (err) {
      console.error('Error loading balance:', err);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset to first page on filter change
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const formatCurrency = (amount) => {
    const value = Math.abs(amount || 0);
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
    return amount < 0 ? `-${formatted}` : formatted;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAmountColor = (transaction) => {
    if (transaction.transaction_type === 'payout' || transaction.transaction_type === 'commission' || transaction.amount < 0) {
      return '#dc2626';
    }
    if (transaction.transaction_type === 'sale' || transaction.transaction_type === 'adjustment') {
      return '#059669';
    }
    return 'inherit';
  };

  return (
    <div>
      {/* Balance Summary */}
      {balance && (
        <div className="stat-grid" style={{ marginBottom: '24px' }}>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--primary-color)' }}>
              {formatCurrency(balance.balance?.current_balance)}
            </div>
            <div style={{ fontSize: '13px', color: '#666' }}>Current Balance</div>
          </div>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#059669' }}>
              {formatCurrency(balance.balance?.total_sales)}
            </div>
            <div style={{ fontSize: '13px', color: '#666' }}>Total Sales</div>
          </div>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#6366f1' }}>
              {formatCurrency(balance.balance?.total_paid_out)}
            </div>
            <div style={{ fontSize: '13px', color: '#666' }}>Total Paid Out</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="form-group" style={{ margin: 0, minWidth: '150px' }}>
            <label className="form-label" style={{ fontSize: '12px' }}>Type</label>
            <select
              className="form-select"
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              {TRANSACTION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: '150px' }}>
            <label className="form-label" style={{ fontSize: '12px' }}>Status</label>
            <select
              className="form-select"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              {TRANSACTION_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div style={{ marginLeft: 'auto', color: '#666', fontSize: '14px' }}>
            {pagination.total} transactions
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading transactions...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="error-alert">{error}</div>
      )}

      {/* Transactions Table */}
      {!loading && !error && transactions.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', minWidth: '600px' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Order</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
                      {formatDate(tx.created_at)}
                    </td>
                    <td>
                      <span className={`status-badge ${
                        tx.transaction_type === 'sale' ? 'success' :
                        tx.transaction_type === 'payout' ? 'info' :
                        tx.transaction_type === 'refund' ? 'danger' :
                        'muted'
                      }`}>
                        {tx.type_display || tx.transaction_type}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px' }}>
                      {tx.description || '-'}
                    </td>
                    <td>
                      {tx.order_number ? (
                        <code style={{ fontSize: '12px' }}>#{tx.order_number}</code>
                      ) : '-'}
                    </td>
                    <td style={{ 
                      fontWeight: '500', 
                      color: getAmountColor(tx),
                      whiteSpace: 'nowrap'
                    }}>
                      {formatCurrency(tx.amount)}
                    </td>
                    <td>
                      <span className={`status-badge ${
                        tx.status === 'completed' ? 'success' :
                        tx.status === 'pending' ? 'warning' :
                        'danger'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{ 
              padding: '16px', 
              borderTop: '1px solid #eee',
              display: 'flex',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <button
                className="secondary small"
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                Previous
              </button>
              <span style={{ padding: '8px 12px', color: '#666' }}>
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                className="secondary small"
                disabled={pagination.page >= pagination.pages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && transactions.length === 0 && (
        <div className="empty-state">
          <i className="fa-solid fa-receipt"></i>
          <p>No transactions found.</p>
        </div>
      )}
    </div>
  );
}
