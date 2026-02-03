/**
 * My Sales Component
 * Displays vendor's incoming orders (sales) with fulfillment capabilities
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  fetchVendorSales, 
  fetchVendorStats,
  markItemShipped,
  updateItemTracking 
} from '../../../lib/commerce';
import { getApiUrl } from '../../../lib/config';

const SALES_TABS = [
  { id: 'unshipped', label: 'Needs Shipping' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'all', label: 'All Orders' },
];

const CARRIERS = [
  { value: 'usps', label: 'USPS' },
  { value: 'ups', label: 'UPS' },
  { value: 'fedex', label: 'FedEx' },
  { value: 'dhl', label: 'DHL' },
  { value: 'other', label: 'Other' },
];

export default function MySales() {
  const [activeTab, setActiveTab] = useState('unshipped');
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState(new Set());
  
  // Shipping form state
  const [shippingForms, setShippingForms] = useState({}); // { itemId: { carrier, tracking_number, loading } }
  const [showShipForm, setShowShipForm] = useState(null); // itemId or null

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchVendorSales({ status: activeTab });
      setOrders(result.orders || []);
    } catch (err) {
      console.error('Error loading sales:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchVendorStats();
      setStats(data);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const toggleExpanded = (orderId) => {
    setExpandedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const handleShipFormChange = (itemId, field, value) => {
    setShippingForms(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const handleMarkShipped = async (itemId) => {
    const form = shippingForms[itemId] || {};
    
    setShippingForms(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], loading: true }
    }));

    try {
      await markItemShipped(itemId, {
        carrier: form.carrier || '',
        tracking_number: form.tracking_number || ''
      });

      // Refresh orders and stats
      loadOrders();
      loadStats();
      setShowShipForm(null);
      
      // Clear form
      setShippingForms(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    } catch (err) {
      console.error('Error marking shipped:', err);
      alert(err.message || 'Failed to mark as shipped');
    } finally {
      setShippingForms(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], loading: false }
      }));
    }
  };

  const handleUpdateTracking = async (itemId) => {
    const form = shippingForms[itemId] || {};
    
    if (!form.tracking_number) {
      alert('Please enter a tracking number');
      return;
    }

    setShippingForms(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], loading: true }
    }));

    try {
      await updateItemTracking(itemId, {
        carrier: form.carrier || '',
        tracking_number: form.tracking_number
      });

      loadOrders();
      setShowShipForm(null);
    } catch (err) {
      console.error('Error updating tracking:', err);
      alert(err.message || 'Failed to update tracking');
    } finally {
      setShippingForms(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], loading: false }
      }));
    }
  };

  const handleGetRates = async (itemId) => {
    setShippingForms(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], loadingRates: true, rates: [], selectedRate: null }
    }));
    setShowRatesForm(itemId);

    try {
      const rates = await fetchShippingRates(itemId);
      setShippingForms(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], rates, loadingRates: false }
      }));
    } catch (err) {
      console.error('Error fetching rates:', err);
      alert(err.message || 'Failed to fetch shipping rates');
      setShippingForms(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], loadingRates: false }
      }));
    }
  };

  const handleSelectRate = (itemId, rate) => {
    setShippingForms(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], selectedRate: rate }
    }));
  };

  const handlePurchaseLabel = async (itemId) => {
    const form = shippingForms[itemId] || {};
    
    if (!form.selectedRate) {
      alert('Please select a shipping rate');
      return;
    }

    setShippingForms(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], purchasing: true }
    }));

    try {
      const result = await purchaseShippingLabel(itemId, form.selectedRate);
      alert(`Label purchased! Tracking: ${result.data?.tracking_number}`);
      
      loadOrders();
      loadStats();
      setShowRatesForm(null);
      
      setShippingForms(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    } catch (err) {
      console.error('Error purchasing label:', err);
      alert(err.message || 'Failed to purchase label');
    } finally {
      setShippingForms(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], purchasing: false }
      }));
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

  const getImageSrc = (url) => {
    if (!url) return '';
    return url.startsWith('http') ? url : getApiUrl(url);
  };

  const formatAddress = (addr) => {
    if (!addr) return 'No address';
    const parts = [
      addr.recipient_name,
      addr.street,
      addr.street2,
      `${addr.city}, ${addr.state} ${addr.zip}`,
      addr.country !== 'US' ? addr.country : ''
    ].filter(Boolean);
    return parts.join('\n');
  };

  return (
    <div>
      {/* Stats Summary */}
      {stats && (
        <div className="stat-grid" style={{ marginBottom: '24px' }}>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '600', color: '#dc2626' }}>{stats.unshipped_count}</div>
            <div style={{ fontSize: '13px', color: '#666' }}>Needs Shipping</div>
          </div>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '600', color: '#059669' }}>{stats.shipped_count}</div>
            <div style={{ fontSize: '13px', color: '#666' }}>Shipped</div>
          </div>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '600', color: 'var(--primary-color)' }}>
              {formatCurrency(stats.total_sales)}
            </div>
            <div style={{ fontSize: '13px', color: '#666' }}>Total Sales</div>
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <div className="tab-container">
        {SALES_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.id === 'unshipped' && stats?.unshipped_count > 0 && (
              <span style={{ 
                marginLeft: '8px', 
                background: '#dc2626', 
                color: 'white', 
                padding: '2px 8px', 
                borderRadius: '12px',
                fontSize: '12px'
              }}>
                {stats.unshipped_count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading orders...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="error-alert">{error}</div>
      )}

      {/* Orders List */}
      {!loading && !error && orders.length > 0 && (
        <div>
          {orders.map((order) => (
            <div key={order.order_id} className="card" style={{ marginBottom: '16px' }}>
              <div 
                className="card-header" 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => toggleExpanded(order.order_id)}
              >
                <div>
                  <strong>Order #{order.order_id}</strong>
                  <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                    {formatDate(order.created_at)} • {order.customer_name}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={`status-badge ${order.order_status === 'paid' ? 'warning' : 'success'}`}>
                    {order.order_status}
                  </span>
                  <span style={{ fontSize: '18px', color: '#666' }}>
                    {expandedOrderIds.has(order.order_id) ? '▼' : '▶'}
                  </span>
                </div>
              </div>

              {expandedOrderIds.has(order.order_id) && (
                <div className="card-body">
                  {/* Shipping Address */}
                  <div style={{ 
                    background: '#f8f9fa', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    marginBottom: '16px',
                    fontSize: '14px'
                  }}>
                    <strong style={{ display: 'block', marginBottom: '8px' }}>Ship To:</strong>
                    <pre style={{ margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>
                      {formatAddress(order.shipping_address)}
                    </pre>
                  </div>

                  {/* Order Items */}
                  {order.items.map((item) => (
                    <div 
                      key={item.item_id} 
                      className="expansion-section" 
                      style={{ marginBottom: '12px' }}
                    >
                      <div style={{ display: 'flex', gap: '16px', padding: '16px' }}>
                        {item.product_thumbnail && (
                          <img
                            src={getImageSrc(item.product_thumbnail)}
                            alt={item.product_name}
                            style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '500', marginBottom: '4px' }}>{item.product_name}</div>
                          {item.product_sku && (
                            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
                              SKU: {item.product_sku}
                            </div>
                          )}
                          <div style={{ fontSize: '14px', color: '#666' }}>
                            Qty: {item.quantity} × {formatCurrency(item.price)} = {formatCurrency(item.item_total)}
                          </div>
                          
                          {/* Item Status & Tracking */}
                          <div style={{ marginTop: '8px' }}>
                            {item.item_status === 'pending' ? (
                              <>
                                <span className="status-badge warning">Awaiting Shipment</span>
                                
                                {showShipForm === item.item_id ? (
                                  <div style={{ marginTop: '12px', padding: '12px', background: '#f0f9ff', borderRadius: '8px' }}>
                                    <div className="form-group" style={{ marginBottom: '12px' }}>
                                      <label className="form-label">Carrier</label>
                                      <select
                                        className="form-select"
                                        value={shippingForms[item.item_id]?.carrier || ''}
                                        onChange={(e) => handleShipFormChange(item.item_id, 'carrier', e.target.value)}
                                      >
                                        <option value="">Select carrier...</option>
                                        {CARRIERS.map(c => (
                                          <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: '12px' }}>
                                      <label className="form-label">Tracking Number</label>
                                      <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Enter tracking number"
                                        value={shippingForms[item.item_id]?.tracking_number || ''}
                                        onChange={(e) => handleShipFormChange(item.item_id, 'tracking_number', e.target.value)}
                                      />
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <button
                                        className="primary small"
                                        onClick={() => handleMarkShipped(item.item_id)}
                                        disabled={shippingForms[item.item_id]?.loading}
                                      >
                                        {shippingForms[item.item_id]?.loading ? 'Saving...' : 'Mark Shipped'}
                                      </button>
                                      <button
                                        className="secondary small"
                                        onClick={() => setShowShipForm(null)}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : showRatesForm === item.item_id ? (
                                  <div style={{ marginTop: '12px', padding: '12px', background: '#e8f4f8', borderRadius: '8px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Select Shipping Rate</h4>
                                    
                                    {shippingForms[item.item_id]?.loadingRates ? (
                                      <div style={{ textAlign: 'center', padding: '20px' }}>
                                        <div className="spinner"></div>
                                        <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#666' }}>Fetching rates...</p>
                                      </div>
                                    ) : shippingForms[item.item_id]?.rates?.length > 0 ? (
                                      <>
                                        <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '12px' }}>
                                          {shippingForms[item.item_id].rates.map((rate, idx) => (
                                            <label 
                                              key={idx}
                                              style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                padding: '10px', 
                                                border: shippingForms[item.item_id]?.selectedRate === rate ? '2px solid var(--primary-color)' : '1px solid #ddd',
                                                borderRadius: '6px',
                                                marginBottom: '8px',
                                                cursor: 'pointer',
                                                background: shippingForms[item.item_id]?.selectedRate === rate ? '#d1e7dd' : 'white'
                                              }}
                                            >
                                              <input
                                                type="radio"
                                                name={`rate-${item.item_id}`}
                                                checked={shippingForms[item.item_id]?.selectedRate === rate}
                                                onChange={() => handleSelectRate(item.item_id, rate)}
                                                style={{ marginRight: '12px' }}
                                              />
                                              <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '500' }}>{rate.carrier?.toUpperCase()} - {rate.service_name || rate.service}</div>
                                                <div style={{ fontSize: '12px', color: '#666' }}>
                                                  {rate.delivery_days ? `${rate.delivery_days} day(s)` : 'Delivery varies'}
                                                </div>
                                              </div>
                                              <div style={{ fontWeight: '600', color: 'var(--primary-color)' }}>
                                                {formatCurrency(rate.cost)}
                                              </div>
                                            </label>
                                          ))}
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                          <button
                                            className="primary small"
                                            onClick={() => handlePurchaseLabel(item.item_id)}
                                            disabled={!shippingForms[item.item_id]?.selectedRate || shippingForms[item.item_id]?.purchasing}
                                          >
                                            {shippingForms[item.item_id]?.purchasing ? 'Purchasing...' : 'Buy Label'}
                                          </button>
                                          <button className="secondary small" onClick={() => setShowRatesForm(null)}>Cancel</button>
                                        </div>
                                      </>
                                    ) : (
                                      <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                                        <p>No rates available.</p>
                                        <button className="secondary small" onClick={() => setShowRatesForm(null)}>Close</button>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                                    <button className="primary small" onClick={() => handleGetRates(item.item_id)}>Buy Label</button>
                                    <button className="secondary small" onClick={() => setShowShipForm(item.item_id)}>Enter Tracking</button>
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="status-badge success">Shipped</span>
                                {item.shipped_at && (
                                  <span style={{ marginLeft: '8px', fontSize: '13px', color: '#666' }}>
                                    {formatDate(item.shipped_at)}
                                  </span>
                                )}
                                {item.tracking && (
                                  <div style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
                                    <strong>{item.tracking.carrier?.toUpperCase()}:</strong> {item.tracking.tracking_number}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && orders.length === 0 && (
        <div className="empty-state">
          <i className="fa-solid fa-inbox"></i>
          <p>
            {activeTab === 'unshipped'
              ? 'No orders awaiting shipment.'
              : activeTab === 'shipped'
              ? 'No shipped orders yet.'
              : 'No orders found.'}
          </p>
        </div>
      )}
    </div>
  );
}
