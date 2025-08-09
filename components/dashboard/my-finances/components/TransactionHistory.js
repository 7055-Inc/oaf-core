import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../lib/csrf';
import styles from '../../../../pages/dashboard/Dashboard.module.css';

export default function TransactionHistory({ userData }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    page: 1,
    limit: 50
  });
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    pages: 0
  });

  // Check if user is admin
  const checkAdminStatus = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/users/me', {
        method: 'GET'
      });

      if (response.ok) {
        const userData = await response.json();
        setIsAdmin(userData.user_type === 'admin');
      }
    } catch (err) {
      // Silently handle errors - user just won't see admin features
    }
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        page: filters.page,
        limit: filters.limit,
        ...(filters.type && { type: filters.type }),
        ...(filters.status && { status: filters.status })
      });

      // Use admin endpoint if showing all transactions, otherwise use vendor endpoint
      const endpoint = showAllTransactions && isAdmin 
        ? `https://api2.onlineartfestival.com/admin/all-transactions?${queryParams}`
        : `https://api2.onlineartfestival.com/api/vendor-financials/my-transactions?${queryParams}`;

      const response = await authenticatedApiRequest(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Transaction API Response:', data);
        if (data.success) {
          setTransactions(data.transactions);
          setPagination(data.pagination);
        } else {
          console.error('API returned success:false', data);
          setError('Failed to load transactions');
        }
      } else {
        console.error('API call failed:', response.status, response.statusText);
        setError('Failed to load transactions');
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch balance information
  const [balance, setBalance] = useState(null);
  const fetchBalance = async () => {
    try {
      const response = await authenticatedApiRequest(
        'https://api2.onlineartfestival.com/api/vendor-financials/my-balance',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBalance(data.balance);
        }
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  };

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    // Clear error state when switching views
    setError(null);
    fetchTransactions();
    fetchBalance();
  }, [filters, showAllTransactions]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  // Format transaction amount
  const formatAmount = (amount, type) => {
    const numAmount = parseFloat(amount);
    const isCredit = ['sale', 'adjustment'].includes(type) && numAmount > 0;
    const isDebit = ['payout', 'commission', 'subscription_charge'].includes(type) || numAmount < 0;
    
    return (
      <span className={`${isCredit ? styles.credit : ''} ${isDebit ? styles.debit : ''}`}>
        {isCredit ? '+' : ''}${Math.abs(numAmount).toFixed(2)}
      </span>
    );
  };

  // Get transaction icon
  const getTransactionIcon = (type) => {
    switch (type) {
      case 'sale':
        return '🛒';
      case 'commission':
        return '💰';
      case 'payout':
        return '💳';
      case 'refund':
        return '↩️';
      case 'adjustment':
        return '⚖️';
      case 'subscription_charge':
        return '📅';
      default:
        return '📊';
    }
  };

  // Get transaction status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return styles.statusCompleted;
      case 'pending':
        return styles.statusPending;
      case 'processing':
        return styles.statusProcessing;
      case 'failed':
        return styles.statusFailed;
      default:
        return styles.statusDefault;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

    if (loading && transactions.length === 0) {
    return <div className="loading-state">Loading transactions...</div>;
  }

  return (
    <div>
        {/* Admin Toggle */}
        {isAdmin && (
          <div className="section-box">
            <div className="toggle-slider-container">
              <input
                type="checkbox"
                id="showAllTransactions"
                checked={showAllTransactions}
                onChange={(e) => setShowAllTransactions(e.target.checked)}
                className="toggle-slider-input"
              />
              <label htmlFor="showAllTransactions" className="toggle-slider"></label>
              <span className="toggle-text">
                {showAllTransactions ? 'Showing All Transactions' : 'Show All Transactions'}
              </span>
            </div>
          </div>
        )}

        {/* Balance Summary - Only show for individual user view */}
        {balance && !showAllTransactions && (
          <div className="section-box">
            <div className="form-card">
              <h3>Current Balance</h3>
              <div className={styles.balanceAmount}>
                ${parseFloat(balance.current_balance || 0).toFixed(2)}
              </div>
            </div>
            <div className="form-card">
              <h3>Pending Payout</h3>
              <div className={styles.balanceAmount}>
                ${parseFloat(balance.pending_payout || 0).toFixed(2)}
              </div>
            </div>
            <div className="form-card">
              <h3>Total Sales</h3>
              <div className={styles.balanceAmount}>
                ${parseFloat(balance.total_sales || 0).toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label>Type:</label>
            <select 
              value={filters.type} 
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="">All Types</option>
              <option value="sale">Sales</option>
              <option value="commission">Commissions</option>
              <option value="payout">Payouts</option>
              <option value="refund">Refunds</option>
              <option value="adjustment">Adjustments</option>
              <option value="subscription_charge">Subscription Fees</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label>Status:</label>
            <select 
              value={filters.status} 
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-alert">
            {error}
          </div>
        )}

        {/* Transactions List */}
        <div className={styles.transactionsList}>
          {transactions.length === 0 ? (
            <div className="empty-state">
              <p>No transactions found for the selected filters.</p>
            </div>
          ) : (
            <>
              {transactions.map((transaction) => (
                <div key={transaction.id} className="form-card">
                  <div className={styles.transactionIcon}>
                    {getTransactionIcon(transaction.transaction_type)}
                  </div>
                  
                  <div className={styles.transactionDetails}>
                    <div className={styles.transactionHeader}>
                      <span className={styles.transactionType}>
                        {transaction.type_display}
                      </span>
                      <span className={`${styles.transactionStatus} ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </div>
                    
                    <div className={styles.transactionInfo}>
                      {showAllTransactions && transaction.vendor_name && (
                        <span className={styles.vendorName}>
                          {transaction.vendor_name}
                        </span>
                      )}
                      {transaction.order_number && (
                        <span className={styles.orderNumber}>
                          Order #{transaction.order_number}
                        </span>
                      )}
                      <span className={styles.transactionDate}>
                        {formatDate(transaction.created_at)}
                      </span>
                    </div>
                    
                    {transaction.description && (
                      <div className="transactionDescription">
                        {transaction.description}
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.transactionAmount}>
                    {formatAmount(transaction.amount, transaction.transaction_type)}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
            <button 
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="secondary"
            >
              Previous
            </button>
            
            <span style={{ fontWeight: 'bold' }}>
              Page {pagination.page} of {pagination.pages}
            </span>
            
            <button 
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
            >
              Next
            </button>
          </div>
        )}

        {/* Loading indicator for pagination */}
        {loading && transactions.length > 0 && (
          <div className="loading-state">
            Loading more transactions...
          </div>
                 )}
    </div>
  );
}
