/**
 * My Orders Component
 * Displays customer's order history with filtering and return functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchMyOrders, fetchMyReturns, getReturnLabelUrl } from '../../../lib/commerce';
import { getReturnPolicy, getReturnWindowDays } from '../../../lib/returnPolicies';
import { getApiUrl } from '../../../lib/config';
import ReturnRequestModal from './ReturnRequestModal';

const ORDER_STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'processing', label: 'Processing' },
  { id: 'paid', label: 'Paid' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'refunded', label: 'Refunded' },
];

export default function MyOrders() {
  const [activeTab, setActiveTab] = useState('all');
  const [ordersByStatus, setOrdersByStatus] = useState({});
  const [loadingByStatus, setLoadingByStatus] = useState({});
  const [errorByStatus, setErrorByStatus] = useState({});
  const [expandedOrderIds, setExpandedOrderIds] = useState(new Set());
  const [vendorModalUserId, setVendorModalUserId] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedReturnItem, setSelectedReturnItem] = useState(null);
  const [returnStatuses, setReturnStatuses] = useState({});

  const loadReturnStatuses = useCallback(async () => {
    try {
      const returns = await fetchMyReturns();
      const statusMap = {};
      returns.forEach(returnItem => {
        statusMap[returnItem.order_item_id] = {
          id: returnItem.id,
          status: returnItem.return_status,
          has_label: returnItem.shipping_label_id ? true : false
        };
      });
      setReturnStatuses(statusMap);
    } catch (error) {
      console.error('Error loading return statuses:', error);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchOrders = async () => {
      const status = activeTab;

      // Skip if we already have data for this status
      if (ordersByStatus[status] && !loadingByStatus[status]) {
        return;
      }

      setLoadingByStatus(prev => ({ ...prev, [status]: true }));
      setErrorByStatus(prev => ({ ...prev, [status]: null }));

      try {
        const result = await fetchMyOrders({
          page: 1,
          limit: 50,
          status: status === 'all' ? undefined : status
        });

        if (!isMounted) return;

        setOrdersByStatus(prev => ({
          ...prev,
          [status]: {
            orders: result.orders || [],
            ...result.pagination
          }
        }));

        // Load return statuses after orders
        loadReturnStatuses();
      } catch (err) {
        if (!isMounted) return;
        setErrorByStatus(prev => ({ ...prev, [status]: err?.message || 'Failed to fetch orders' }));
      } finally {
        if (!isMounted) return;
        setLoadingByStatus(prev => ({ ...prev, [status]: false }));
      }
    };

    // Debounce API calls
    const timer = setTimeout(fetchOrders, 300);

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [activeTab, loadReturnStatuses]);

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
    const s = String(status || '').toLowerCase();
    if (s === 'pending') return 'status-badge pending';
    if (s === 'processing') return 'status-badge info';
    if (s === 'paid' || s === 'shipped' || s === 'delivered') return 'status-badge success';
    if (s === 'cancelled' || s === 'refunded') return 'status-badge danger';
    return 'status-badge muted';
  };

  const toggleExpanded = (orderId) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const openVendorModal = (vendorUserId) => {
    setVendorModalUserId(vendorUserId);
  };

  const closeVendorModal = () => {
    setVendorModalUserId(null);
  };

  const handleReturnRequest = (item, order) => {
    setSelectedReturnItem({ ...item, order });
    setShowReturnModal(true);
  };

  const closeReturnModal = () => {
    setShowReturnModal(false);
    setSelectedReturnItem(null);
    loadReturnStatuses();
  };

  const handlePrintLabel = (returnId) => {
    window.open(getReturnLabelUrl(returnId), '_blank');
  };

  const isReturnEligible = (item, order) => {
    if (order.status !== 'shipped') return false;

    const windowDays = getReturnWindowDays(item.allow_returns);

    if (windowDays !== null && item.shipped_at) {
      const shipDate = new Date(item.shipped_at);
      const now = new Date();
      const daysDiff = (now - shipDate) / (1000 * 60 * 60 * 24);
      if (daysDiff > windowDays) return false;
    }

    return true;
  };

  const getImageSrc = (url) => {
    if (!url) return '';
    return url.startsWith('http') ? url : getApiUrl(url);
  };

  const current = ordersByStatus[activeTab];
  const isLoading = !!loadingByStatus[activeTab];
  const error = errorByStatus[activeTab];

  return (
    <div>
      {/* Status Tabs */}
      <div className="tab-container">
        {ORDER_STATUS_TABS.map((tab) => (
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
      {isLoading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading orders...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="error-alert">{error}</div>
      )}

      {/* Orders List */}
      {!isLoading && !error && current?.orders?.length > 0 && (
        <div className="order-cards">
          {current.orders.map((order) => (
            <div key={order.id} className="card" style={{ marginBottom: '16px' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>Order #{order.id}</strong>
                  <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                    {formatDate(order.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={getStatusBadgeClass(order.status)}>{order.status}</span>
                  <strong>{formatCurrency(order.total_amount)}</strong>
                </div>
              </div>

              <div className="card-body">
                <button className="secondary small" onClick={() => toggleExpanded(order.id)}>
                  {expandedOrderIds.has(order.id) ? 'Hide details' : 'View details'}
                </button>

                {expandedOrderIds.has(order.id) && (
                  <div style={{ marginTop: '16px' }}>
                    {order.items?.map((item) => (
                      <div key={item.item_id} className="expansion-section" style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', gap: '16px', padding: '16px' }}>
                          {item.product_thumbnail && (
                            <img
                              src={getImageSrc(item.product_thumbnail)}
                              alt={item.product_name}
                              style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '500', marginBottom: '8px' }}>{item.product_name}</div>
                            <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                              Vendor:{' '}
                              <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); openVendorModal(item.vendor_id); }}
                                style={{ color: 'var(--primary-color)' }}
                              >
                                {item.vendor_name}
                              </a>
                            </div>
                            <div style={{ fontSize: '14px', color: '#666' }}>
                              {item.quantity} × {formatCurrency(item.price)} = {formatCurrency(item.item_total)}
                            </div>
                            {item.shipping_cost > 0 && (
                              <div style={{ fontSize: '13px', color: '#888' }}>
                                Shipping: {formatCurrency(item.shipping_cost)}
                              </div>
                            )}
                            {item.shipped_at && (
                              <div style={{ fontSize: '13px', color: '#059669', marginTop: '4px' }}>
                                Shipped {formatDate(item.shipped_at)} via {item.selected_shipping_service || 'Standard'}
                              </div>
                            )}

                            {/* Tracking & Returns */}
                            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {item.tracking?.tracking_number ? (
                                <button className="secondary small">
                                  Track Package
                                </button>
                              ) : (
                                <button className="secondary small" disabled style={{ opacity: 0.5 }}>
                                  No Tracking Yet
                                </button>
                              )}

                              {(() => {
                                const returnStatus = returnStatuses[item.item_id];

                                if (returnStatus) {
                                  if (returnStatus.has_label) {
                                    return (
                                      <button
                                        className="secondary small"
                                        onClick={() => handlePrintLabel(returnStatus.id)}
                                      >
                                        Print Return Label
                                      </button>
                                    );
                                  } else {
                                    return (
                                      <button className="secondary small" disabled style={{ opacity: 0.7 }}>
                                        Return in Progress
                                      </button>
                                    );
                                  }
                                } else if (isReturnEligible(item, order)) {
                                  return (
                                    <button
                                      className="secondary small"
                                      onClick={() => handleReturnRequest(item, order)}
                                    >
                                      Return Item
                                    </button>
                                  );
                                } else {
                                  return (
                                    <button className="secondary small" disabled style={{ opacity: 0.5 }}>
                                      Not Returnable
                                    </button>
                                  );
                                }
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Order Summary */}
                    {order.tax_amount > 0 && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', fontSize: '14px', color: '#666' }}>
                        Tax: {formatCurrency(order.tax_amount)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && current?.orders?.length === 0 && (
        <div className="empty-state">
          <i className="fa-solid fa-box-open"></i>
          <p>
            {activeTab === 'all'
              ? "You don't have any orders yet."
              : `No ${activeTab} orders found.`}
          </p>
        </div>
      )}

      {/* Vendor Profile Modal */}
      {vendorModalUserId && (
        <div className="modal-overlay" onClick={closeVendorModal}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeVendorModal}>×</button>
            <h3 className="modal-title">Vendor Profile</h3>
            <div style={{ height: '500px' }}>
              <iframe
                title="Vendor Profile"
                src={`/profile/${vendorModalUserId}`}
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Return Request Modal */}
      <ReturnRequestModal
        isOpen={showReturnModal}
        onClose={closeReturnModal}
        item={selectedReturnItem}
        order={selectedReturnItem?.order}
      />
    </div>
  );
}
