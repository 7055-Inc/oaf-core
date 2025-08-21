import { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../lib/csrf';
import slideInStyles from '../../SlideIn.module.css';

const ORDER_STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'processing', label: 'Processing' },
  { id: 'paid', label: 'Paid' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'refunded', label: 'Refunded' },
];

export default function MyOrders({ userData }) {
  const [activeTab, setActiveTab] = useState('all');
  const [ordersByStatus, setOrdersByStatus] = useState({});
  const [loadingByStatus, setLoadingByStatus] = useState({});
  const [errorByStatus, setErrorByStatus] = useState({});
  const [expandedOrderIds, setExpandedOrderIds] = useState(new Set());
  const [vendorModalUserId, setVendorModalUserId] = useState(null);
  const [debounceTimer, setDebounceTimer] = useState(null);

  useEffect(() => {
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const controller = new AbortController();
    let isMounted = true;

    const fetchOrders = async () => {
      const status = activeTab;
      const page = 1;

      // Skip if we already have data for this status and it's not currently loading
      if (ordersByStatus[status] && !loadingByStatus[status]) {
        return;
      }

      setLoadingByStatus(prev => ({ ...prev, [status]: true }));
      setErrorByStatus(prev => ({ ...prev, [status]: null }));

      try {
        const params = new URLSearchParams({ page: String(page) });
        if (status && status !== 'all') params.append('status', status);

        const res = await authenticatedApiRequest(
          `https://api2.onlineartfestival.com/checkout/orders/my?${params.toString()}`,
          { method: 'GET', signal: controller.signal }
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        if (!isMounted) return;

        if (data && data.success) {
          setOrdersByStatus(prev => ({
            ...prev,
            [status]: {
              orders: Array.isArray(data.orders) ? data.orders : [],
              page: data.pagination?.page || page,
              pages: data.pagination?.pages || 1,
              total: data.pagination?.total || (Array.isArray(data.orders) ? data.orders.length : 0)
            }
          }));
        } else {
          throw new Error(data?.error || 'Failed to fetch orders');
        }
      } catch (err) {
        if (!isMounted) return;
        if (err?.name === 'AbortError') return;
        setErrorByStatus(prev => ({ ...prev, [status]: err?.message || 'Failed to fetch orders' }));
      } finally {
        if (!isMounted) return;
        setLoadingByStatus(prev => ({ ...prev, [status]: false }));
      }
    };

    // Debounce API calls to prevent rate limiting
    const timer = setTimeout(() => {
      fetchOrders();
    }, 800);

    setDebounceTimer(timer);

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [activeTab]);

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

  const getStatusClass = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'pending') return slideInStyles.statusPending;
    if (s === 'processing') return slideInStyles.statusProcessing;
    if (s === 'paid' || s === 'shipped' || s === 'delivered') return slideInStyles.statusCompleted;
    if (s === 'cancelled' || s === 'refunded') return slideInStyles.statusFailed;
    return slideInStyles.statusDefault;
  };

  const toggleExpanded = (orderId) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId); else next.add(orderId);
      return next;
    });
  };

  const openVendorModal = (vendorUserId) => {
    setVendorModalUserId(vendorUserId);
  };

  const closeVendorModal = () => {
    setVendorModalUserId(null);
  };

  const getImageSrc = (url) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `https://api2.onlineartfestival.com${url}`;
  };

  const handleTrackingClick = (e, orderId, itemId) => {
    e.preventDefault();
    // Placeholder for future tracking modal/flow
  };

  const current = ordersByStatus[activeTab];
  const isLoading = !!loadingByStatus[activeTab];
  const error = errorByStatus[activeTab];

  return (
    <div>
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

      {isLoading && (
        <div className={slideInStyles.loading}>Loading orders...</div>
      )}

      {error && !isLoading && (
        <div className="error-alert">{error}</div>
      )}

      {!isLoading && !error && current && Array.isArray(current.orders) && current.orders.length > 0 && (
        <div className={slideInStyles.orderCards}>
          {current.orders.map((order) => (
            <div key={order.id} className={slideInStyles.orderCard}>
              <div className={slideInStyles.orderHeader}>
                <div>
                  <div className={slideInStyles.orderTitle}>Order #{order.id}</div>
                  <div className={slideInStyles.orderMeta}>{formatDate(order.created_at)}</div>
                </div>
                <div className={slideInStyles.orderActions}>
                  <span className={`${slideInStyles.statusBadge} ${getStatusClass(order.status)}`}>{order.status}</span>
                  <span className={slideInStyles.orderTotal}>{formatCurrency(order.total_amount)}</span>
                </div>
              </div>
              <div className={slideInStyles.detailsSection}>
                <button className="secondary" onClick={() => toggleExpanded(order.id)}>
                  {expandedOrderIds.has(order.id) ? 'Hide details' : 'Order details'}
                </button>
              </div>

              {expandedOrderIds.has(order.id) && (
                <div className={slideInStyles.orderDetails}>
                  <div className={slideInStyles.itemsList}>
                    {order.items && order.items.map((item) => (
                      <div key={item.item_id} className={slideInStyles.itemCard}>
                        <div className={slideInStyles.itemRow}>
                        <img
                          className={slideInStyles.itemThumb}
                          src={getImageSrc(item.product_thumbnail)}
                          alt={item.product_name || 'Product'}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <div className={slideInStyles.itemInfo}>
                          <div className={slideInStyles.productName}>{item.product_name}</div>
                          <div>
                            Vendor: {' '}
                            <a href="#" className={slideInStyles.vendorLink} onClick={(e) => { e.preventDefault(); openVendorModal(item.vendor_id); }}>
                              {item.vendor_name || item.vendor_email}
                            </a>
                          </div>
                          <div>
                            {item.tracking && item.tracking.tracking_number ? (
                              <button 
                                className={slideInStyles.trackingButton}
                                onClick={(e) => handleTrackingClick(e, order.id, item.item_id)}
                              >
                                Track My Package
                              </button>
                            ) : (
                              <button 
                                className={slideInStyles.trackingButtonDisabled}
                                disabled
                              >
                                Track My Package
                              </button>
                            )}
                          </div>
                          {item.shipped_at && (
                            <div className={slideInStyles.shipStatus}>
                              Shipped {formatDate(item.shipped_at)} via {item.selected_shipping_service || 'Standard'}
                            </div>
                          )}
                        </div>
                        <div className={slideInStyles.itemPricing}>
                          <div>{formatCurrency(item.item_total)}</div>
                          <div className={slideInStyles.itemPricingDetails}>
                            {item.quantity} × {formatCurrency(item.price)}
                          </div>
                          {item.shipping_cost > 0 && (
                            <div className={slideInStyles.itemPricingDetails}>
                              Shipping: {formatCurrency(item.shipping_cost)}
                            </div>
                          )}
                        </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Order Summary */}
                  {order.tax_amount > 0 && (
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f0f0f0', fontSize: 14, color: '#6c757d' }}>
                      Tax: {formatCurrency(order.tax_amount)}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && current && Array.isArray(current.orders) && current.orders.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '48px 24px',
          color: '#6c757d',
          fontSize: '16px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <div style={{ fontWeight: '500', marginBottom: '8px' }}>
            It looks like you don't have any {activeTab === 'all' ? '' : activeTab + ' '}orders yet.
          </div>
          <div style={{ fontSize: '14px' }}>
            {activeTab === 'all' 
              ? 'When you place an order, it will appear here.' 
              : `When you have ${activeTab} orders, they will appear here.`
            }
          </div>
        </div>
      )}

      {/* Vendor Profile Modal */}
      {vendorModalUserId && (
        <div className={slideInStyles.modalOverlay} onClick={closeVendorModal}>
          <div className={slideInStyles.modalContentLarge} onClick={(e) => e.stopPropagation()}>
            <div className={slideInStyles.modalTitle}>Vendor Profile</div>
            <div className={slideInStyles.modalCloseButton}>
              <button onClick={closeVendorModal} className="secondary">Close</button>
            </div>
            <div className={slideInStyles.modalIframeContainer}>
              <iframe
                title="Vendor Profile"
                src={`/profile/${vendorModalUserId}`}
                className={slideInStyles.modalIframe}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}