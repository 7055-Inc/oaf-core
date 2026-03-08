/**
 * Admin All Orders
 * Lists all orders site-wide (admin only). Redirects non-admins to dashboard.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { getCurrentUser } from '../../../lib/users';
import { fetchAdminOrders } from '../../../lib/commerce';

const ORDER_STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'processing', label: 'Processing' },
  { id: 'paid', label: 'Paid' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'refunded', label: 'Refunded' },
];

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString(undefined, { dateStyle: 'short' });
}

function formatMoney(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

export default function AdminAllOrders() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState(new Set());

  // Auth: admin only
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const user = await getCurrentUser();
        if (cancelled) return;
        setUserData(user);
        const isAdmin = user?.user_type === 'admin';
        const hasManage = user?.permissions?.includes('manage_system');
        if (!isAdmin && !hasManage) {
          router.replace('/dashboard');
          return;
        }
      } catch (err) {
        if (!cancelled) router.replace('/login');
      } finally {
        if (!cancelled) setCheckingAuth(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [router]);

  const loadOrders = useCallback(async () => {
    if (!userData) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminOrders({
        page: 1,
        limit: 50,
        status: activeTab === 'all' ? 'all' : activeTab,
      });
      setOrders(result.orders || []);
      setPagination(result.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [userData, activeTab]);

  useEffect(() => {
    if (!userData || checkingAuth) return;
    loadOrders();
  }, [userData, checkingAuth, activeTab, loadOrders]);

  const toggleExpanded = (orderId) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  if (checkingAuth || !userData) {
    return (
      <div className="page-header">
        <h1 className="page-title">All Orders</h1>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">All Orders</h1>
        <p className="page-description">Site-wide order list (admin only).</p>
      </div>

      <div className="dashboard-tabs" role="tablist">
        {ORDER_STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'tab active' : 'tab'}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading orders…</p>
      ) : orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Status</th>
                <th>Total</th>
                <th aria-label="Expand" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const isExpanded = expandedOrderIds.has(order.id);
                const customerLabel = order.customer_name || order.customer_email || `#${order.user_id}`;
                return (
                  <React.Fragment key={order.id}>
                    <tr>
                      <td>#{order.id}</td>
                      <td>{customerLabel}</td>
                      <td>{formatDate(order.created_at)}</td>
                      <td><span className="badge">{order.status}</span></td>
                      <td>{formatMoney(order.total_amount)}</td>
                      <td>
                        <button
                          type="button"
                          className="secondary small"
                          aria-expanded={isExpanded}
                          onClick={() => toggleExpanded(order.id)}
                        >
                          {isExpanded ? 'Hide' : 'Details'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} style={{ padding: '0.5rem 1rem', background: 'var(--bg-subtle, #f8f9fa)' }}>
                          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                            {(order.items || []).map((item) => (
                              <li key={item.item_id} style={{ padding: '0.25rem 0' }}>
                                {item.product_name} × {item.quantity} — {formatMoney(item.item_total)}
                                {item.vendor_name && ` (vendor: ${item.vendor_name})`}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination.pages > 1 && (
        <p className="pagination-meta">
          Page {pagination.page} of {pagination.pages} ({pagination.total} orders)
        </p>
      )}
    </>
  );
}
