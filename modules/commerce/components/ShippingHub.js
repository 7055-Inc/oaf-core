/**
 * Shipping Hub Component
 * Unified dashboard for shipping subscription, labels, and label creation
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  fetchShippingSubscription,
  fetchAllShippingLabels,
  fetchShippingLabelStats,
  getShippingLabelUrl
} from '../../../lib/commerce';
import { getApiUrl } from '../../../lib/config';

const LABEL_TABS = [
  { id: 'all', label: 'All Labels' },
  { id: 'order', label: 'Order Labels' },
  { id: 'standalone', label: 'Standalone' },
];

export default function ShippingHub() {
  const [subscription, setSubscription] = useState(null);
  const [labels, setLabels] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLabels, setSelectedLabels] = useState(new Set());

  const loadSubscription = useCallback(async () => {
    try {
      const data = await fetchShippingSubscription();
      setSubscription(data);
    } catch (err) {
      console.error('Error loading subscription:', err);
    }
  }, []);

  const loadLabels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllShippingLabels({ type: activeTab });
      setLabels(data || []);
    } catch (err) {
      console.error('Error loading labels:', err);
      setError(err.message || 'Failed to load labels');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchShippingLabelStats();
      setStats(data);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, []);

  useEffect(() => {
    loadSubscription();
    loadStats();
  }, [loadSubscription, loadStats]);

  useEffect(() => {
    loadLabels();
    setSelectedLabels(new Set());
  }, [loadLabels]);

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

  const toggleSelectLabel = (labelId) => {
    setSelectedLabels(prev => {
      const next = new Set(prev);
      if (next.has(labelId)) next.delete(labelId);
      else next.add(labelId);
      return next;
    });
  };

  const selectAllLabels = () => {
    const activeLabels = labels.filter(l => l.status !== 'voided');
    if (selectedLabels.size === activeLabels.length) {
      setSelectedLabels(new Set());
    } else {
      setSelectedLabels(new Set(activeLabels.map(l => l.db_id)));
    }
  };

  const getLabelUrl = (label) => {
    if (!label.label_file_path) return '#';
    const filename = label.label_file_path.split('/').pop();
    return getApiUrl(`/api/v2/commerce/shipping/labels/${encodeURIComponent(filename)}`);
  };

  return (
    <div>
      {/* Subscription Status Banner */}
      {subscription && (
        <div 
          className="card" 
          style={{ 
            marginBottom: '24px',
            background: subscription.active ? 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)' : '#fff3cd',
            border: subscription.active ? '1px solid #c3e6cb' : '1px solid #ffeaa7'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '18px' }}>
                {subscription.active ? 'Shipping Labels Active' : 'Shipping Labels'}
              </h3>
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                {subscription.active 
                  ? 'You can create and purchase shipping labels.' 
                  : 'Set up shipping labels to purchase discounted labels directly from your dashboard.'}
              </p>
            </div>
            {!subscription.active && (
              <a 
                href="/dashboard/subscriptions" 
                className="primary"
                style={{ 
                  padding: '10px 20px',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontWeight: '500'
                }}
              >
                Set Up Shipping
              </a>
            )}
            {subscription.active && (
              <span className="status-badge success">Active</span>
            )}
          </div>
        </div>
      )}

      {/* Stats Summary */}
      {stats && (
        <div className="stat-grid" style={{ marginBottom: '24px' }}>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '600', color: 'var(--primary-color)' }}>
              {stats.order_labels?.total || 0}
            </div>
            <div style={{ fontSize: '13px', color: '#666' }}>Order Labels (30d)</div>
          </div>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '600', color: '#6366f1' }}>
              {stats.standalone_labels?.total || 0}
            </div>
            <div style={{ fontSize: '13px', color: '#666' }}>Standalone Labels (30d)</div>
          </div>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '600', color: '#059669' }}>
              {formatCurrency(stats.total_spent_30d || 0)}
            </div>
            <div style={{ fontSize: '13px', color: '#666' }}>Total Spent (30d)</div>
          </div>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '600', color: '#dc2626' }}>
              {stats.order_labels?.voided || 0}
            </div>
            <div style={{ fontSize: '13px', color: '#666' }}>Voided Labels</div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {subscription?.active && (
        <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a 
            href="/dashboard/subscriptions" 
            className="secondary"
            style={{ 
              padding: '10px 16px',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            Create Standalone Label
          </a>
          <button 
            className="secondary"
            onClick={() => loadLabels()}
            style={{ padding: '10px 16px', fontSize: '14px' }}
          >
            Refresh Labels
          </button>
        </div>
      )}

      {/* Label Tabs */}
      <div className="tab-container">
        {LABEL_TABS.map((tab) => (
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
          <p>Loading labels...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="error-alert">{error}</div>
      )}

      {/* Labels Table */}
      {!loading && !error && labels.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {/* Bulk Actions */}
          {selectedLabels.size > 0 && (
            <div style={{ 
              padding: '12px 16px', 
              background: '#e8f4f8', 
              borderBottom: '1px solid #ddd',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontWeight: '500' }}>{selectedLabels.size} selected</span>
              <button className="secondary small" onClick={() => setSelectedLabels(new Set())}>
                Clear Selection
              </button>
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', minWidth: '700px' }}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedLabels.size === labels.filter(l => l.status !== 'voided').length && labels.length > 0}
                      onChange={selectAllLabels}
                    />
                  </th>
                  <th>Type</th>
                  <th>Service</th>
                  <th>Tracking</th>
                  <th>Customer/Product</th>
                  <th>Cost</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Label</th>
                </tr>
              </thead>
              <tbody>
                {labels.map((label) => (
                  <tr 
                    key={`${label.type}-${label.db_id}`}
                    style={{ 
                      opacity: label.status === 'voided' ? 0.5 : 1,
                      textDecoration: label.status === 'voided' ? 'line-through' : 'none'
                    }}
                  >
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedLabels.has(label.db_id)}
                        disabled={label.status === 'voided'}
                        onChange={() => toggleSelectLabel(label.db_id)}
                      />
                    </td>
                    <td>
                      <span 
                        className={`status-badge ${label.type === 'order' ? 'info' : 'muted'}`}
                        style={{ fontSize: '11px' }}
                      >
                        {label.type === 'order' ? 'Order' : 'Standalone'}
                      </span>
                    </td>
                    <td style={{ fontWeight: '500' }}>{label.service_name || '-'}</td>
                    <td>
                      <code style={{ fontSize: '12px', background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px' }}>
                        {label.tracking_number || '-'}
                      </code>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px' }}>{label.product_name}</div>
                      {label.customer_name && label.customer_name !== 'N/A' && (
                        <div style={{ fontSize: '12px', color: '#666' }}>{label.customer_name}</div>
                      )}
                    </td>
                    <td>{formatCurrency(label.cost)}</td>
                    <td style={{ fontSize: '13px' }}>{formatDate(label.created_at)}</td>
                    <td>
                      <span className={`status-badge ${label.status === 'voided' ? 'danger' : 'success'}`}>
                        {label.status === 'voided' ? 'Voided' : 'Active'}
                      </span>
                    </td>
                    <td>
                      {label.status !== 'voided' && label.label_file_path ? (
                        <a 
                          href={getLabelUrl(label)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--primary-color)', fontSize: '13px' }}
                        >
                          View PDF
                        </a>
                      ) : (
                        <span style={{ color: '#999', fontSize: '13px' }}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && labels.length === 0 && (
        <div className="empty-state">
          <i className="fa-solid fa-truck-fast"></i>
          <p>
            {activeTab === 'all'
              ? 'No shipping labels yet.'
              : activeTab === 'order'
              ? 'No order labels yet. Labels are created when you ship items from My Sales.'
              : 'No standalone labels yet. Create labels from the Subscriptions page.'}
          </p>
          {subscription?.active && (
            <a 
              href="/dashboard/subscriptions" 
              className="primary"
              style={{ marginTop: '12px', display: 'inline-block', textDecoration: 'none' }}
            >
              Create Standalone Label
            </a>
          )}
        </div>
      )}
    </div>
  );
}
