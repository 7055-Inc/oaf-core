/**
 * Admin Returns Component
 * Admin interface for managing return requests across the platform
 * 
 * Uses v2 /api/v2/commerce/returns/admin/* endpoints
 */

import { useState, useEffect, useCallback } from 'react';
import { authenticatedApiRequest } from '../../../lib/csrf';
import { getApiUrl } from '../../../lib/config';

const TABS = [
  { id: 'assistance', label: 'Assistance Cases' },
  { id: 'pending', label: 'Pending Returns' },
  { id: 'all', label: 'All Returns' },
  { id: 'completed', label: 'Completed' }
];

export default function AdminReturns() {
  const [activeTab, setActiveTab] = useState('assistance');
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [messageInputs, setMessageInputs] = useState({});

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = '';
      const params = new URLSearchParams();

      if (activeTab === 'all') {
        endpoint = '/api/v2/commerce/returns/admin/all';
        if (searchTerm) params.append('search', searchTerm);
        if (vendorFilter) params.append('vendor', vendorFilter);
      } else {
        endpoint = `/api/v2/commerce/returns/admin/by-status/${activeTab}`;
      }

      const queryString = params.toString();
      const url = getApiUrl(`${endpoint}${queryString ? `?${queryString}` : ''}`);

      const response = await authenticatedApiRequest(url);
      
      if (response.ok) {
        const data = await response.json();
        const payload = data.data || data;
        setReturns(payload.returns || []);
      } else {
        console.error('Failed to fetch returns');
        setReturns([]);
      }
    } catch (error) {
      console.error('Error fetching returns:', error);
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, vendorFilter]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const sendAdminMessage = async (returnId) => {
    const message = messageInputs[returnId];
    if (!message || !message.trim()) return;

    try {
      const response = await authenticatedApiRequest(getApiUrl(`/api/v2/commerce/returns/${returnId}/admin-message`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() })
      });

      if (response.ok) {
        // Clear input and refresh
        setMessageInputs(prev => ({ ...prev, [returnId]: '' }));
        fetchReturns();
      } else {
        alert('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusClass = (status) => {
    const statusMap = {
      assistance: 'status-danger',
      assistance_vendor: 'status-warning',
      pending: 'status-warning',
      label_created: 'status-info',
      in_transit: 'status-info',
      received: 'status-info',
      completed: 'status-success',
      processed: 'status-success',
      denied: 'status-secondary'
    };
    return statusMap[status] || 'status-secondary';
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchReturns();
  };

  return (
    <div className="admin-returns-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Returns Management</h1>
          <p className="page-subtitle">Manage return requests and assistance cases</p>
        </div>
        <div className="page-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => fetchReturns()}
            disabled={loading}
          >
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-container">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.id === 'assistance' && returns.length > 0 && activeTab === 'assistance' && (
              <span className="tab-badge">{returns.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search/Filter for All Returns tab */}
      {activeTab === 'all' && (
        <form onSubmit={handleSearch} className="filters-bar">
          <div className="filter-group search">
            <input
              type="text"
              placeholder="Search by return ID, order #, or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="filter-group">
            <input
              type="text"
              placeholder="Filter by vendor..."
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="form-input"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
      )}

      {/* Returns List */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading returns...</p>
        </div>
      ) : returns.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <div className="empty-state-content">
            <h3>No returns found</h3>
            <p>No returns match this filter criteria.</p>
          </div>
        </div>
      ) : (
        <div className="returns-list">
          {returns.map((returnItem) => (
            <div key={returnItem.id} className="return-card">
              <div className="return-card-header">
                <div className="return-id">Return #{returnItem.id}</div>
                <span className={`status-badge ${getStatusClass(returnItem.return_status)}`}>
                  {returnItem.return_status.replace('_', ' ')}
                </span>
              </div>

              <div className="return-card-grid">
                <div className="return-detail">
                  <span className="detail-label">Order</span>
                  <span className="detail-value">#{returnItem.order_id || returnItem.order_number}</span>
                </div>
                <div className="return-detail">
                  <span className="detail-label">Customer</span>
                  <span className="detail-value">{returnItem.customer_username}</span>
                </div>
                <div className="return-detail">
                  <span className="detail-label">Vendor</span>
                  <span className="detail-value">{returnItem.vendor_username}</span>
                </div>
                <div className="return-detail">
                  <span className="detail-label">Date</span>
                  <span className="detail-value">{formatDate(returnItem.created_at)}</span>
                </div>
              </div>

              <div className="return-product">
                <strong>Product:</strong> {returnItem.product_name}
              </div>
              <div className="return-reason">
                <strong>Reason:</strong> {returnItem.return_reason?.replace('_', ' ')}
              </div>

              {returnItem.return_message && (
                <div className="return-message">
                  <strong>Customer Message:</strong>
                  <p>{returnItem.return_message}</p>
                </div>
              )}

              {returnItem.case_messages && (
                <div className="case-messages">
                  <strong>Case History:</strong>
                  <div className="messages-content">
                    {returnItem.case_messages}
                  </div>
                </div>
              )}

              {/* Admin Actions */}
              <div className="return-actions">
                {(returnItem.return_status === 'assistance' || returnItem.return_status === 'assistance_vendor') && (
                  <div className="message-input-group">
                    <input
                      type="text"
                      placeholder="Type admin response..."
                      value={messageInputs[returnItem.id] || ''}
                      onChange={(e) => setMessageInputs(prev => ({ ...prev, [returnItem.id]: e.target.value }))}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          sendAdminMessage(returnItem.id);
                        }
                      }}
                      className="form-input"
                    />
                    <button 
                      className="btn btn-primary"
                      onClick={() => sendAdminMessage(returnItem.id)}
                      disabled={!messageInputs[returnItem.id]?.trim()}
                    >
                      Send
                    </button>
                  </div>
                )}

                {returnItem.shipping_label_id && (
                  <a 
                    href={`/api/v2/commerce/returns/${returnItem.id}/label`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    <i className="fas fa-tag"></i> View Label
                  </a>
                )}

                {returnItem.tracking_number && (
                  <span className="tracking-number">
                    Tracking: {returnItem.tracking_number}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .admin-returns-container {
          max-width: 1200px;
        }

        .filters-bar {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
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

        .filter-group.search {
          flex: 1;
        }

        .filter-group.search input {
          width: 100%;
        }

        .form-input {
          padding: 0.5rem 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .tab-badge {
          background: #dc3545;
          color: white;
          font-size: 0.7rem;
          padding: 0.15rem 0.4rem;
          border-radius: 10px;
          margin-left: 0.5rem;
        }

        .returns-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .return-card {
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.25rem;
        }

        .return-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #eee;
        }

        .return-id {
          font-weight: 600;
          font-size: 1rem;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
        }

        .status-badge.status-danger {
          background: #f8d7da;
          color: #721c24;
        }

        .status-badge.status-warning {
          background: #fff3cd;
          color: #856404;
        }

        .status-badge.status-info {
          background: #cce5ff;
          color: #004085;
        }

        .status-badge.status-success {
          background: #d4edda;
          color: #155724;
        }

        .status-badge.status-secondary {
          background: #e9ecef;
          color: #6c757d;
        }

        .return-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .return-detail {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .detail-label {
          font-size: 0.75rem;
          color: #6c757d;
          text-transform: uppercase;
        }

        .detail-value {
          font-weight: 500;
        }

        .return-product,
        .return-reason {
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }

        .return-message {
          margin: 1rem 0;
          padding: 0.75rem;
          background: #f8f9fa;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .return-message p {
          margin: 0.5rem 0 0 0;
          color: #495057;
        }

        .case-messages {
          margin: 1rem 0;
          font-size: 0.9rem;
        }

        .messages-content {
          margin-top: 0.5rem;
          padding: 0.75rem;
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 4px;
          white-space: pre-wrap;
          max-height: 200px;
          overflow-y: auto;
          font-size: 0.85rem;
          line-height: 1.5;
        }

        .return-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }

        .message-input-group {
          display: flex;
          gap: 0.5rem;
          flex: 1;
          min-width: 300px;
        }

        .message-input-group input {
          flex: 1;
        }

        .tracking-number {
          font-size: 0.8rem;
          color: #6c757d;
          font-family: monospace;
        }

        @media (max-width: 768px) {
          .filters-bar {
            flex-direction: column;
          }

          .return-card-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .message-input-group {
            min-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
