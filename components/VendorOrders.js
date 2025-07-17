import { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../lib/csrf';
import styles from './VendorOrders.module.css';

const VendorOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrders, setExpandedOrders] = useState(new Set());

  useEffect(() => {
    fetchOrders();
  }, [currentPage, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/vendor/orders?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOrders(data.orders);
          setTotalPages(data.pagination.pages);
        } else {
          setError('Failed to fetch orders');
        }
      } else {
        setError('Failed to fetch orders');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
  };

  const toggleOrderExpansion = (orderId) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#28a745';
      case 'processing': return '#ffc107';
      case 'shipped': return '#17a2b8';
      case 'cancelled': return '#dc3545';
      case 'refunded': return '#6c757d';
      default: return '#007bff';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return <div className={styles.loading}>Loading orders...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.vendorOrders}>
      <div className={styles.header}>
        <h2>My Orders</h2>
        <p className={styles.subtitle}>Manage your orders and track their status</p>
      </div>

      {/* Status Filter */}
      <div className={styles.filters}>
        <label htmlFor="status-filter">Filter by Status:</label>
        <select 
          id="status-filter"
          value={statusFilter} 
          onChange={(e) => handleStatusChange(e.target.value)}
          className={styles.statusFilter}
        >
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="paid">Paid</option>
          <option value="shipped">Shipped</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className={styles.noOrders}>
          <p>No orders found{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''}.</p>
        </div>
      ) : (
        <div className={styles.ordersList}>
          {orders.map((order) => (
            <div key={order.id} className={styles.orderCard}>
              <div className={styles.orderHeader} onClick={() => toggleOrderExpansion(order.id)}>
                <div className={styles.orderInfo}>
                  <div className={styles.orderNumber}>
                    <strong>Order #{order.id}</strong>
                  </div>
                  <div className={styles.orderMeta}>
                    <span className={styles.orderDate}>{formatDate(order.created_at)}</span>
                    <span 
                      className={styles.orderStatus}
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className={styles.orderSummary}>
                  <div className={styles.customerInfo}>
                    <strong>{order.customer_name || order.customer_email}</strong>
                  </div>
                  <div className={styles.orderTotal}>
                    <span className={styles.itemCount}>{order.items.length} item{order.items.length > 1 ? 's' : ''}</span>
                    <span className={styles.totalAmount}>{formatCurrency(order.total_amount)}</span>
                  </div>
                </div>
                <div className={styles.expandIcon}>
                  {expandedOrders.has(order.id) ? '▼' : '▶'}
                </div>
              </div>

              {/* Expanded Order Details */}
              {expandedOrders.has(order.id) && (
                <div className={styles.orderDetails}>
                  <div className={styles.orderItems}>
                    <h4>Items in this order:</h4>
                    {order.items.map((item, index) => (
                      <div key={index} className={styles.orderItem}>
                        <div className={styles.itemInfo}>
                          <div className={styles.itemName}>{item.product_name}</div>
                          <div className={styles.itemDetails}>
                            Quantity: {item.quantity} × {formatCurrency(item.price)}
                          </div>
                        </div>
                        <div className={styles.itemFinancials}>
                          <div className={styles.commissionInfo}>
                            Commission: {item.commission_rate}% ({formatCurrency(item.commission_amount)})
                          </div>
                          <div className={styles.vendorReceives}>
                            <strong>You receive: {formatCurrency(item.vendor_receives)}</strong>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={styles.orderFooter}>
                    <div className={styles.orderActions}>
                      <button className={styles.actionButton} disabled>
                        View Details
                      </button>
                      <button className={styles.actionButton} disabled>
                        Update Status
                      </button>
                    </div>
                    <div className={styles.orderTotals}>
                      <div>Shipping: {formatCurrency(order.shipping_amount)}</div>
                      <div><strong>Total: {formatCurrency(order.total_amount)}</strong></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button 
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={styles.paginationButton}
          >
            Previous
          </button>
          
          <span className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>
          
          <button 
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className={styles.paginationButton}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default VendorOrders; 