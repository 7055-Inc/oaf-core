/**
 * Admin Refunds Component
 * Centralized payment listing and refund processing for all payment types
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  fetchAdminPayments, 
  processAdminRefund, 
  fetchAdminRefunds 
} from '../../../lib/finances';

const PAYMENT_TYPES = [
  { value: 'all', label: 'All Payments' },
  { value: 'checkout', label: 'Orders' },
  { value: 'app_fee', label: 'Application Fees' },
  { value: 'booth_fee', label: 'Booth Fees' },
  { value: 'subscription', label: 'Subscriptions' }
];

export default function AdminRefunds() {
  const [activeTab, setActiveTab] = useState('payments');
  const [payments, setPayments] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [refundStats, setRefundStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  
  // Filter/search state
  const [filters, setFilters] = useState({
    type: 'all',
    search: '',
    days: 90
  });
  
  // Refund modal state
  const [refundModal, setRefundModal] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadPayments = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const result = await fetchAdminPayments({
        ...filters,
        page,
        limit: 50
      });
      setPayments(result.payments || []);
      setPagination(result.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadRefunds = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const result = await fetchAdminRefunds({ page, limit: 50 });
      setRefunds(result.refunds || []);
      setRefundStats(result.stats);
      setPagination(result.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      console.error('Error loading refunds:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'payments') {
      loadPayments(1);
    } else {
      loadRefunds(1);
    }
  }, [activeTab, loadPayments, loadRefunds]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'payments') {
        loadPayments(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const openRefundModal = (payment) => {
    setRefundModal(payment);
    setRefundAmount(payment.eligible_refund?.toFixed(2) || '0.00');
    setRefundReason('');
  };

  const closeRefundModal = () => {
    setRefundModal(null);
    setRefundAmount('');
    setRefundReason('');
  };

  const handleRefund = async () => {
    if (!refundModal) return;

    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid refund amount');
      return;
    }
    if (amount > refundModal.eligible_refund) {
      alert(`Refund cannot exceed eligible amount of $${refundModal.eligible_refund.toFixed(2)}`);
      return;
    }

    try {
      setProcessing(true);
      await processAdminRefund(
        refundModal.payment_type,
        refundModal.payment_id,
        amount,
        refundReason
      );
      
      alert(`Refund of $${amount.toFixed(2)} processed successfully`);
      closeRefundModal();
      loadPayments(pagination.page);
    } catch (error) {
      alert(`Refund failed: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const formatPaymentType = (type) => {
    const types = {
      checkout: 'Order',
      app_fee: 'App Fee',
      booth_fee: 'Booth Fee',
      subscription: 'Subscription'
    };
    return types[type] || type;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusClass = (status) => {
    const statusMap = {
      paid: 'success',
      succeeded: 'success',
      processing: 'warning',
      refunded: 'info',
      pending: 'warning',
      failed: 'danger'
    };
    return statusMap[status] || 'secondary';
  };

  return (
    <div className="refunds-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Admin Refunds</h1>
          <p className="page-subtitle">Process refunds for all payment types across the platform</p>
        </div>
        <div className="page-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => activeTab === 'payments' ? loadPayments(1) : loadRefunds(1)}
            disabled={loading}
          >
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      {/* Stats (show on refunds tab) */}
      {activeTab === 'refunds' && refundStats && (
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">{refundStats.total_refunds}</div>
            <div className="stat-label">Total Refunds (90 days)</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">${refundStats.total_amount?.toFixed(2) || '0.00'}</div>
            <div className="stat-label">Total Refunded</div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-container">
        <button
          className={`tab ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          <i className="fas fa-credit-card"></i>
          Eligible Payments
        </button>
        <button
          className={`tab ${activeTab === 'refunds' ? 'active' : ''}`}
          onClick={() => setActiveTab('refunds')}
        >
          <i className="fas fa-undo"></i>
          Refunds Processed
        </button>
      </div>

      {/* Filters (payments tab only) */}
      {activeTab === 'payments' && (
        <div className="filters-bar">
          <div className="filter-group">
            <label>Type:</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="form-select"
            >
              {PAYMENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Period:</label>
            <select
              value={filters.days}
              onChange={(e) => handleFilterChange('days', parseInt(e.target.value))}
              className="form-select"
            >
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 180 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>

          <div className="filter-group search">
            <input
              type="text"
              placeholder="Search by name, email, or payment ID..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="form-input"
            />
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading {activeTab === 'payments' ? 'payments' : 'refunds'}...</p>
        </div>
      ) : activeTab === 'payments' ? (
        /* Payments List */
        <div className="payments-list">
          {payments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💳</div>
              <div className="empty-state-content">
                <h3>No payments found</h3>
                <p>Try adjusting your filters or search criteria</p>
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Customer</th>
                  <th>Reference</th>
                  <th>Original</th>
                  <th>Refunded</th>
                  <th>Eligible</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={`${payment.payment_type}-${payment.payment_id}`}>
                    <td className="date-cell">{formatDate(payment.created_at)}</td>
                    <td>
                      <span className={`type-badge type-${payment.payment_type}`}>
                        {formatPaymentType(payment.payment_type)}
                      </span>
                    </td>
                    <td>
                      <div className="customer-cell">
                        <div className="customer-name">{payment.customer_name || 'N/A'}</div>
                        <div className="customer-email">{payment.customer_email}</div>
                      </div>
                    </td>
                    <td className="reference-cell">
                      {payment.event_title && <span title="Event">{payment.event_title}</span>}
                      {payment.subscription_type && <span>Sub: {payment.subscription_type}</span>}
                      {!payment.event_title && !payment.subscription_type && (
                        <span className="payment-id">#{payment.payment_id}</span>
                      )}
                    </td>
                    <td className="amount-cell">${payment.original_amount.toFixed(2)}</td>
                    <td className="amount-cell refunded">
                      {payment.refunded_amount > 0 
                        ? `$${payment.refunded_amount.toFixed(2)}` 
                        : '-'}
                    </td>
                    <td className="amount-cell eligible">
                      ${payment.eligible_refund.toFixed(2)}
                    </td>
                    <td>
                      <span className={`status-badge status-${getStatusClass(payment.payment_status)}`}>
                        {payment.payment_status}
                      </span>
                    </td>
                    <td>
                      {payment.eligible_refund > 0 ? (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => openRefundModal(payment)}
                        >
                          Refund
                        </button>
                      ) : (
                        <span className="fully-refunded">Fully Refunded</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* Refunds List */
        <div className="refunds-list">
          {refunds.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-content">
                <h3>No refunds processed yet</h3>
                <p>Refunds you process will appear here</p>
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Stripe Refund ID</th>
                  <th>Reason</th>
                  <th>Processed By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((refund) => (
                  <tr key={refund.id}>
                    <td className="date-cell">{formatDate(refund.created_at)}</td>
                    <td>
                      <span className={`type-badge type-${refund.payment_type}`}>
                        {formatPaymentType(refund.payment_type)}
                      </span>
                    </td>
                    <td className="amount-cell">${parseFloat(refund.amount).toFixed(2)}</td>
                    <td className="refund-id">{refund.stripe_refund_id}</td>
                    <td className="reason-cell">{refund.reason || '-'}</td>
                    <td>{refund.admin_name || refund.admin_email || 'System'}</td>
                    <td>
                      <span className={`status-badge status-${getStatusClass(refund.status)}`}>
                        {refund.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-sm"
            disabled={pagination.page <= 1}
            onClick={() => activeTab === 'payments' 
              ? loadPayments(pagination.page - 1) 
              : loadRefunds(pagination.page - 1)
            }
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </span>
          <button
            className="btn btn-sm"
            disabled={pagination.page >= pagination.pages}
            onClick={() => activeTab === 'payments' 
              ? loadPayments(pagination.page + 1) 
              : loadRefunds(pagination.page + 1)
            }
          >
            Next
          </button>
        </div>
      )}

      {/* Refund Modal */}
      {refundModal && (
        <div className="modal-overlay" onClick={closeRefundModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Process Refund</h2>
              <button className="modal-close" onClick={closeRefundModal}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="refund-details">
                <div className="detail-row">
                  <span className="detail-label">Customer:</span>
                  <span className="detail-value">{refundModal.customer_name || refundModal.customer_email}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Payment Type:</span>
                  <span className="detail-value">{formatPaymentType(refundModal.payment_type)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Original Amount:</span>
                  <span className="detail-value">${refundModal.original_amount.toFixed(2)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Already Refunded:</span>
                  <span className="detail-value">${refundModal.refunded_amount.toFixed(2)}</span>
                </div>
                <div className="detail-row highlight">
                  <span className="detail-label">Eligible for Refund:</span>
                  <span className="detail-value">${refundModal.eligible_refund.toFixed(2)}</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="refundAmount">Refund Amount *</label>
                <div className="input-with-prefix">
                  <span className="input-prefix">$</span>
                  <input
                    type="number"
                    id="refundAmount"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    step="0.01"
                    min="0.01"
                    max={refundModal.eligible_refund}
                    className="form-input"
                  />
                </div>
                <small>Maximum: ${refundModal.eligible_refund.toFixed(2)}</small>
              </div>

              <div className="form-group">
                <label htmlFor="refundReason">Reason (optional)</label>
                <textarea
                  id="refundReason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Enter reason for refund..."
                  className="form-textarea"
                  rows={3}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={closeRefundModal}
                disabled={processing}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleRefund}
                disabled={processing || !refundAmount}
              >
                {processing ? 'Processing...' : `Refund $${parseFloat(refundAmount || 0).toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .refunds-container {
          max-width: 1400px;
        }

        .stats-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.25rem 2rem;
          text-align: center;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--primary-color);
        }

        .stat-label {
          font-size: 0.8rem;
          color: #6c757d;
          margin-top: 0.25rem;
        }

        .filters-bar {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          background: #fff;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .filter-group label {
          font-size: 0.85rem;
          font-weight: 500;
          color: #666;
          white-space: nowrap;
        }

        .filter-group.search {
          flex: 1;
          min-width: 250px;
        }

        .filter-group.search input {
          width: 100%;
        }

        .form-select, .form-input {
          padding: 0.5rem 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .data-table {
          width: 100%;
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          border-collapse: collapse;
          overflow: hidden;
        }

        .data-table th,
        .data-table td {
          padding: 0.75rem 1rem;
          text-align: left;
          border-bottom: 1px solid #eee;
        }

        .data-table th {
          background: #f8f9fa;
          font-weight: 600;
          font-size: 0.8rem;
          text-transform: uppercase;
          color: #666;
        }

        .data-table tr:last-child td {
          border-bottom: none;
        }

        .data-table tr:hover {
          background: #fafbfc;
        }

        .date-cell {
          font-size: 0.85rem;
          color: #666;
          white-space: nowrap;
        }

        .customer-cell {
          line-height: 1.3;
        }

        .customer-name {
          font-weight: 500;
        }

        .customer-email {
          font-size: 0.8rem;
          color: #888;
        }

        .amount-cell {
          font-weight: 500;
          font-family: monospace;
        }

        .amount-cell.refunded {
          color: #dc3545;
        }

        .amount-cell.eligible {
          color: #28a745;
          font-weight: 600;
        }

        .reference-cell {
          font-size: 0.85rem;
          color: #666;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .payment-id {
          font-family: monospace;
          font-size: 0.8rem;
        }

        .refund-id {
          font-family: monospace;
          font-size: 0.8rem;
          color: #666;
        }

        .reason-cell {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .type-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .type-badge.type-checkout {
          background: #e3f2fd;
          color: #1976d2;
        }

        .type-badge.type-app_fee {
          background: #fff3e0;
          color: #f57c00;
        }

        .type-badge.type-booth_fee {
          background: #e8f5e9;
          color: #388e3c;
        }

        .type-badge.type-subscription {
          background: #f3e5f5;
          color: #7b1fa2;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
        }

        .status-badge.status-success {
          background: #d4edda;
          color: #155724;
        }

        .status-badge.status-warning {
          background: #fff3cd;
          color: #856404;
        }

        .status-badge.status-info {
          background: #cce5ff;
          color: #004085;
        }

        .status-badge.status-danger {
          background: #f8d7da;
          color: #721c24;
        }

        .status-badge.status-secondary {
          background: #e9ecef;
          color: #6c757d;
        }

        .fully-refunded {
          font-size: 0.8rem;
          color: #888;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .pagination-info {
          font-size: 0.85rem;
          color: #666;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }

        .modal-content {
          background: #fff;
          border-radius: 12px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #eee;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #666;
          padding: 0;
          line-height: 1;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .modal-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }

        .refund-details {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #e9ecef;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-row.highlight {
          font-weight: 600;
          color: #28a745;
        }

        .detail-label {
          color: #666;
        }

        .detail-value {
          font-weight: 500;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .form-group small {
          display: block;
          margin-top: 0.25rem;
          color: #666;
          font-size: 0.8rem;
        }

        .input-with-prefix {
          display: flex;
          align-items: center;
        }

        .input-prefix {
          background: #f8f9fa;
          border: 1px solid #ddd;
          border-right: none;
          border-radius: 4px 0 0 4px;
          padding: 0.5rem 0.75rem;
          color: #666;
        }

        .input-with-prefix .form-input {
          border-radius: 0 4px 4px 0;
          flex: 1;
        }

        .form-textarea {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.9rem;
          font-family: inherit;
          resize: vertical;
        }

        @media (max-width: 1024px) {
          .data-table {
            display: block;
            overflow-x: auto;
          }
        }

        @media (max-width: 768px) {
          .filters-bar {
            flex-direction: column;
          }

          .filter-group {
            width: 100%;
          }

          .filter-group select,
          .filter-group input {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}
