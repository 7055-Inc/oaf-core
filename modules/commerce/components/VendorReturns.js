/**
 * Vendor Returns Component
 * Displays and manages incoming return requests for vendors
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  fetchVendorReturns, 
  fetchVendorReturnStats,
  addVendorReturnMessage,
  markReturnReceived,
  getReturnLabelUrl
} from '../../../lib/commerce';

const RETURN_STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'assistance', label: 'Needs Response' },
  { id: 'in_transit', label: 'In Transit' },
  { id: 'received', label: 'Received' },
];

const RETURN_REASONS = {
  defective: 'Product is defective',
  wrong_item: 'Wrong item shipped',
  damaged_transit: 'Damaged in shipping',
  not_as_described: 'Not as described',
  changed_mind: 'Changed mind',
  other: 'Other reason'
};

export default function VendorReturns() {
  const [activeTab, setActiveTab] = useState('all');
  const [returns, setReturns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  
  // Message form state
  const [messageForm, setMessageForm] = useState({}); // { returnId: { message, loading } }
  const [showMessageForm, setShowMessageForm] = useState(null);

  const loadReturns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchVendorReturns({ status: activeTab === 'all' ? undefined : activeTab });
      setReturns(data || []);
    } catch (err) {
      console.error('Error loading returns:', err);
      setError(err.message || 'Failed to load returns');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchVendorReturnStats();
      setStats(data);
    } catch (err) {
      console.error('Error loading return stats:', err);
    }
  }, []);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const toggleExpanded = (returnId) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(returnId)) next.delete(returnId);
      else next.add(returnId);
      return next;
    });
  };

  const handleSendMessage = async (returnId) => {
    const form = messageForm[returnId] || {};
    
    if (!form.message?.trim()) {
      alert('Please enter a message');
      return;
    }

    setMessageForm(prev => ({
      ...prev,
      [returnId]: { ...prev[returnId], loading: true }
    }));

    try {
      await addVendorReturnMessage(returnId, form.message);
      loadReturns();
      setShowMessageForm(null);
      setMessageForm(prev => {
        const next = { ...prev };
        delete next[returnId];
        return next;
      });
    } catch (err) {
      console.error('Error sending message:', err);
      alert(err.message || 'Failed to send message');
    } finally {
      setMessageForm(prev => ({
        ...prev,
        [returnId]: { ...prev[returnId], loading: false }
      }));
    }
  };

  const handleMarkReceived = async (returnId) => {
    if (!confirm('Mark this return as received? This will begin refund processing.')) {
      return;
    }

    try {
      await markReturnReceived(returnId);
      loadReturns();
      loadStats();
    } catch (err) {
      console.error('Error marking received:', err);
      alert(err.message || 'Failed to mark as received');
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
      case 'assistance':
        return 'status-badge warning';
      case 'label_created':
      case 'in_transit':
        return 'status-badge info';
      case 'received':
      case 'processed':
      case 'refunded':
        return 'status-badge success';
      case 'denied':
        return 'status-badge danger';
      default:
        return 'status-badge muted';
    }
  };

  return (
    <div>
      {/* Stats Summary */}
      {stats && (
        <div className="stat-grid" style={{ marginBottom: '24px' }}>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '600', color: '#d97706' }}>{stats.pending_count}</div>
            <div style={{ fontSize: '13px', color: '#666' }}>Pending</div>
          </div>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '600', color: '#2563eb' }}>{stats.in_transit_count}</div>
            <div style={{ fontSize: '13px', color: '#666' }}>In Transit</div>
          </div>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '600', color: '#059669' }}>{stats.received_count}</div>
            <div style={{ fontSize: '13px', color: '#666' }}>Received</div>
          </div>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '600', color: '#6b7280' }}>{stats.total_count}</div>
            <div style={{ fontSize: '13px', color: '#666' }}>Total (1yr)</div>
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <div className="tab-container">
        {RETURN_STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading returns...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="error-alert">{error}</div>
      )}

      {/* Returns List */}
      {!loading && !error && returns.length > 0 && (
        <div>
          {returns.map((returnItem) => (
            <div key={returnItem.id} className="card" style={{ marginBottom: '16px' }}>
              <div 
                className="card-header" 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => toggleExpanded(returnItem.id)}
              >
                <div>
                  <strong>Return #{returnItem.id}</strong> - Order #{returnItem.order_number}
                  <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                    {returnItem.product_name} • {formatDate(returnItem.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={getStatusBadgeClass(returnItem.return_status)}>
                    {returnItem.return_status?.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '18px', color: '#666' }}>
                    {expandedIds.has(returnItem.id) ? '▼' : '▶'}
                  </span>
                </div>
              </div>

              {expandedIds.has(returnItem.id) && (
                <div className="card-body">
                  {/* Return Details */}
                  <div className="stat-grid" style={{ marginBottom: '16px' }}>
                    <div className="stat-item">
                      <span className="stat-label">Customer</span>
                      <span className="stat-value">{returnItem.customer_name || returnItem.customer_email}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Reason</span>
                      <span className="stat-value">{RETURN_REASONS[returnItem.return_reason] || returnItem.return_reason}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Item Value</span>
                      <span className="stat-value">{formatCurrency(returnItem.item_price)} × {returnItem.quantity}</span>
                    </div>
                    {returnItem.tracking_number && (
                      <div className="stat-item">
                        <span className="stat-label">Tracking</span>
                        <span className="stat-value code">{returnItem.tracking_number}</span>
                      </div>
                    )}
                  </div>

                  {/* Customer Message */}
                  {returnItem.return_message && (
                    <div style={{ 
                      background: '#f8f9fa', 
                      padding: '12px', 
                      borderRadius: '8px', 
                      marginBottom: '16px' 
                    }}>
                      <strong style={{ fontSize: '13px', color: '#666' }}>Customer Message:</strong>
                      <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{returnItem.return_message}</p>
                    </div>
                  )}

                  {/* Case Messages */}
                  {returnItem.case_messages && (
                    <div style={{ 
                      background: '#fff3cd', 
                      padding: '12px', 
                      borderRadius: '8px', 
                      marginBottom: '16px',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      <strong style={{ fontSize: '13px', color: '#856404' }}>Conversation:</strong>
                      <pre style={{ 
                        margin: '8px 0 0', 
                        whiteSpace: 'pre-wrap', 
                        fontFamily: 'inherit',
                        fontSize: '13px'
                      }}>
                        {returnItem.case_messages}
                      </pre>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Reply Button */}
                    {['pending', 'assistance', 'assistance_vendor'].includes(returnItem.return_status) && (
                      showMessageForm === returnItem.id ? (
                        <div style={{ width: '100%', marginBottom: '12px' }}>
                          <textarea
                            className="form-input"
                            placeholder="Type your response..."
                            rows={3}
                            value={messageForm[returnItem.id]?.message || ''}
                            onChange={(e) => setMessageForm(prev => ({
                              ...prev,
                              [returnItem.id]: { ...prev[returnItem.id], message: e.target.value }
                            }))}
                          />
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button
                              className="primary small"
                              onClick={() => handleSendMessage(returnItem.id)}
                              disabled={messageForm[returnItem.id]?.loading}
                            >
                              {messageForm[returnItem.id]?.loading ? 'Sending...' : 'Send Reply'}
                            </button>
                            <button
                              className="secondary small"
                              onClick={() => setShowMessageForm(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="secondary small"
                          onClick={() => setShowMessageForm(returnItem.id)}
                        >
                          Reply to Customer
                        </button>
                      )
                    )}

                    {/* Mark Received Button */}
                    {['pending', 'label_created', 'in_transit'].includes(returnItem.return_status) && (
                      <button
                        className="primary small"
                        onClick={() => handleMarkReceived(returnItem.id)}
                      >
                        Mark as Received
                      </button>
                    )}

                    {/* View Label */}
                    {returnItem.label_file_path && (
                      <button
                        className="secondary small"
                        onClick={() => window.open(getReturnLabelUrl(returnItem.id), '_blank')}
                      >
                        View Return Label
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && returns.length === 0 && (
        <div className="empty-state">
          <i className="fa-solid fa-arrow-rotate-left"></i>
          <p>
            {activeTab === 'all'
              ? 'No return requests yet.'
              : `No ${activeTab.replace('_', ' ')} returns.`}
          </p>
        </div>
      )}
    </div>
  );
}
