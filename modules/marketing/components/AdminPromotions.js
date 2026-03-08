/**
 * Admin Promotions Component
 * 
 * Admin-only tool for managing platform promotions, sales, and coupons.
 * - Collaborative Promotions (platform + vendor shared discounts)
 * - Site-wide Sales (platform-funded discounts)
 * - Admin Coupons (platform coupon codes)
 * 
 * Uses existing /api/admin/* endpoints (to be migrated to v2 later)
 * Uses global CSS classes
 */

import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../lib/apiUtils';

const AdminPromotions = () => {
  const [promotions, setPromotions] = useState([]);
  const [sitewideSales, setSitewideSales] = useState([]);
  const [adminCoupons, setAdminCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('promotions');
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState('promotion');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedPromotionId, setSelectedPromotionId] = useState(null);
  
  // Vendor invitation state
  const [availableVendors, setAvailableVendors] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [vendorProducts, setVendorProducts] = useState({});
  const [selectedProducts, setSelectedProducts] = useState({});
  
  // Form states
  const [promotionForm, setPromotionForm] = useState({
    name: '', description: '', admin_discount_percentage: '', suggested_vendor_discount: '',
    application_type: 'coupon_code', coupon_code: '', min_order_amount: '0',
    usage_limit_per_user: '1', total_usage_limit: '', valid_from: '', valid_until: ''
  });
  
  const [saleForm, setSaleForm] = useState({
    name: '', description: '', discount_type: 'percentage', discount_value: '',
    application_type: 'auto_apply', coupon_code: '', min_order_amount: '0',
    usage_limit_per_user: '1', total_usage_limit: '', valid_from: '', valid_until: '', product_ids: []
  });
  
  const [couponForm, setCouponForm] = useState({
    code: '', name: '', description: '', discount_type: 'percentage', discount_value: '',
    application_type: 'coupon_code', min_order_amount: '0', usage_limit_per_user: '1',
    total_usage_limit: '', valid_from: '', valid_until: '', vendor_id: '', product_ids: [], max_discount_amount: ''
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([fetchPromotions(), fetchSitewideSales(), fetchAdminCoupons()]);
    setLoading(false);
  };

  const fetchPromotions = async () => {
    try {
      const response = await authApiRequest('/api/v2/system/admin/promotions/all', { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        const payload = data.data || data;
        setPromotions(payload.promotions || []);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchSitewideSales = async () => {
    try {
      const response = await authApiRequest('/api/v2/system/admin/sales/all', { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        const payload = data.data || data;
        setSitewideSales(payload.sales || []);
      }
    } catch (err) {
      console.error('Failed to fetch sales:', err);
    }
  };

  const fetchAdminCoupons = async () => {
    try {
      const response = await authApiRequest('/api/v2/system/admin/coupons/all', { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        const payload = data.data || data;
        setAdminCoupons(payload.coupons || []);
      }
    } catch (err) {
      console.error('Failed to fetch coupons:', err);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Create handlers
  const openCreateModal = (type) => {
    setCreateType(type);
    setShowCreateModal(true);
    if (type === 'promotion') {
      setPromotionForm({ name: '', description: '', admin_discount_percentage: '', suggested_vendor_discount: '',
        application_type: 'coupon_code', coupon_code: '', min_order_amount: '0',
        usage_limit_per_user: '1', total_usage_limit: '', valid_from: '', valid_until: '' });
    } else if (type === 'sale') {
      setSaleForm({ name: '', description: '', discount_type: 'percentage', discount_value: '',
        application_type: 'auto_apply', coupon_code: '', min_order_amount: '0',
        usage_limit_per_user: '1', total_usage_limit: '', valid_from: '', valid_until: '', product_ids: [] });
    } else {
      setCouponForm({ code: '', name: '', description: '', discount_type: 'percentage', discount_value: '',
        application_type: 'coupon_code', min_order_amount: '0', usage_limit_per_user: '1',
        total_usage_limit: '', valid_from: '', valid_until: '', vendor_id: '', product_ids: [], max_discount_amount: '' });
    }
  };

  const handleSubmitPromotion = async (e) => {
    e.preventDefault();
    try {
      const data = {
        name: promotionForm.name, description: promotionForm.description,
        admin_discount_percentage: parseFloat(promotionForm.admin_discount_percentage),
        suggested_vendor_discount: parseFloat(promotionForm.suggested_vendor_discount),
        application_type: promotionForm.application_type,
        min_order_amount: parseFloat(promotionForm.min_order_amount),
        usage_limit_per_user: parseInt(promotionForm.usage_limit_per_user),
        valid_from: promotionForm.valid_from, valid_until: promotionForm.valid_until || null
      };
      if (promotionForm.application_type === 'coupon_code') data.coupon_code = promotionForm.coupon_code;
      if (promotionForm.total_usage_limit) data.total_usage_limit = parseInt(promotionForm.total_usage_limit);

      const response = await authApiRequest('/api/v2/system/admin/promotions/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      });
      if (response.ok) {
        setShowCreateModal(false);
        fetchPromotions();
        showSuccess('Promotion created successfully!');
      } else {
        const err = await response.json();
        setError(err.error || 'Failed to create promotion');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmitSale = async (e) => {
    e.preventDefault();
    try {
      const data = {
        name: saleForm.name, description: saleForm.description,
        discount_type: saleForm.discount_type, discount_value: parseFloat(saleForm.discount_value),
        application_type: saleForm.application_type,
        min_order_amount: parseFloat(saleForm.min_order_amount),
        usage_limit_per_user: parseInt(saleForm.usage_limit_per_user),
        valid_from: saleForm.valid_from, valid_until: saleForm.valid_until || null,
        product_ids: saleForm.product_ids
      };
      if (saleForm.application_type === 'coupon_code') data.coupon_code = saleForm.coupon_code;
      if (saleForm.total_usage_limit) data.total_usage_limit = parseInt(saleForm.total_usage_limit);

      const response = await authApiRequest('/api/v2/system/admin/sales/create-sitewide', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      });
      if (response.ok) {
        setShowCreateModal(false);
        fetchSitewideSales();
        showSuccess('Sale created successfully!');
      } else {
        const err = await response.json();
        setError(err.error || 'Failed to create sale');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmitCoupon = async (e) => {
    e.preventDefault();
    try {
      const data = {
        code: couponForm.code, name: couponForm.name, description: couponForm.description,
        discount_type: couponForm.discount_type, discount_value: parseFloat(couponForm.discount_value),
        application_type: couponForm.application_type,
        min_order_amount: parseFloat(couponForm.min_order_amount),
        usage_limit_per_user: parseInt(couponForm.usage_limit_per_user),
        valid_from: couponForm.valid_from, valid_until: couponForm.valid_until || null,
        product_ids: couponForm.product_ids
      };
      if (couponForm.vendor_id) data.vendor_id = parseInt(couponForm.vendor_id);
      if (couponForm.total_usage_limit) data.total_usage_limit = parseInt(couponForm.total_usage_limit);
      if (couponForm.max_discount_amount) data.max_discount_amount = parseFloat(couponForm.max_discount_amount);

      const response = await authApiRequest('/api/v2/system/admin/coupons', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      });
      if (response.ok) {
        setShowCreateModal(false);
        fetchAdminCoupons();
        showSuccess('Coupon created successfully!');
      } else {
        const err = await response.json();
        setError(err.error || 'Failed to create coupon');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Toggle handlers
  const togglePromotion = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const response = await authApiRequest(`/api/v2/system/admin/promotions/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        setPromotions(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
        showSuccess(`Promotion ${newStatus === 'active' ? 'activated' : 'paused'}`);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleSale = async (id, isActive) => {
    try {
      const response = await authApiRequest(`/api/v2/system/admin/sales/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !isActive })
      });
      if (response.ok) {
        setSitewideSales(prev => prev.map(s => s.id === id ? { ...s, is_active: !isActive } : s));
        showSuccess(`Sale ${!isActive ? 'activated' : 'deactivated'}`);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleCoupon = async (id, isActive) => {
    try {
      const response = await authApiRequest(`/api/v2/system/admin/coupons/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !isActive })
      });
      if (response.ok) {
        setAdminCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !isActive } : c));
        showSuccess(`Coupon ${!isActive ? 'activated' : 'deactivated'}`);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Vendor invitation handlers
  const openInviteModal = async (promotionId) => {
    setSelectedPromotionId(promotionId);
    setSelectedVendors([]);
    setVendorProducts({});
    setSelectedProducts({});
    try {
      const response = await authApiRequest('/api/v2/users?user_type=vendor', { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        setAvailableVendors(data.data || data.users || []);
        setShowInviteModal(true);
      }
    } catch (err) {
      setError('Failed to load vendors');
    }
  };

  const handleVendorSelection = async (vendorId) => {
    const isSelected = selectedVendors.includes(vendorId);
    if (isSelected) {
      setSelectedVendors(prev => prev.filter(id => id !== vendorId));
      setSelectedProducts(prev => { const n = { ...prev }; delete n[vendorId]; return n; });
    } else {
      setSelectedVendors(prev => [...prev, vendorId]);
      if (!vendorProducts[vendorId]) {
        try {
          const response = await authApiRequest(`products?vendor_id=${vendorId}`, { method: 'GET' });
          if (response.ok) {
            const data = await response.json();
            setVendorProducts(prev => ({ ...prev, [vendorId]: data.products || [] }));
            setSelectedProducts(prev => ({ ...prev, [vendorId]: [] }));
          }
        } catch (err) {
          console.error('Failed to fetch vendor products:', err);
        }
      }
    }
  };

  const handleProductSelection = (vendorId, productId) => {
    setSelectedProducts(prev => ({
      ...prev,
      [vendorId]: prev[vendorId]?.includes(productId)
        ? prev[vendorId].filter(id => id !== productId)
        : [...(prev[vendorId] || []), productId]
    }));
  };

  const sendInvitations = async () => {
    if (selectedVendors.length === 0) {
      setError('Please select at least one vendor');
      return;
    }
    try {
      const product_selections = {};
      selectedVendors.forEach(vid => {
        if (selectedProducts[vid]?.length > 0) product_selections[vid] = selectedProducts[vid];
      });
      const response = await authApiRequest(`/api/v2/system/admin/promotions/${selectedPromotionId}/invite-vendors`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_ids: selectedVendors,
          product_selections: Object.keys(product_selections).length > 0 ? product_selections : undefined,
          admin_message: 'You have been invited to participate in this collaborative promotion.'
        })
      });
      if (response.ok) {
        setShowInviteModal(false);
        fetchPromotions();
        const totalProducts = Object.values(selectedProducts).reduce((sum, p) => sum + p.length, 0);
        showSuccess(`Invitations sent to ${selectedVendors.length} vendor(s)${totalProducts > 0 ? ` for ${totalProducts} product(s)` : ''}`);
      } else {
        const err = await response.json();
        setError(err.error || 'Failed to send invitations');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading promotions...</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="error-alert">
          {error}
          <button onClick={() => setError(null)} className="secondary small">Dismiss</button>
        </div>
      )}
      {successMessage && <div className="success-alert">{successMessage}</div>}

      {/* Tab Navigation */}
      <div className="tab-container">
        <button className={`tab ${activeTab === 'promotions' ? 'active' : ''}`} onClick={() => setActiveTab('promotions')}>
          Collaborative Promotions ({promotions.length})
        </button>
        <button className={`tab ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>
          Site-wide Sales ({sitewideSales.length})
        </button>
        <button className={`tab ${activeTab === 'coupons' ? 'active' : ''}`} onClick={() => setActiveTab('coupons')}>
          Admin Coupons ({adminCoupons.length})
        </button>
        <button className={`tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
          Analytics
        </button>
      </div>

      {/* Collaborative Promotions Tab */}
      {activeTab === 'promotions' && (
        <div className="tab-content">
          <div className="section-header">
            <h3>Collaborative Promotions</h3>
            <button onClick={() => openCreateModal('promotion')}>Create New Promotion</button>
          </div>

          {promotions.length === 0 ? (
            <div className="empty-state">
              <p>No collaborative promotions created yet.</p>
              <button onClick={() => openCreateModal('promotion')}>Create Your First Promotion</button>
            </div>
          ) : (
            <div className="card-grid">
              {promotions.map(promo => (
                <div key={promo.id} className="form-card">
                  <div className="card-header">
                    <h4>{promo.name}</h4>
                    <span className={`status-badge ${promo.status === 'active' ? 'success' : 'muted'}`}>{promo.status}</span>
                  </div>
                  <p className="text-muted">{promo.description}</p>
                  <div className="stat-grid">
                    <div className="stat-item">
                      <span className="stat-label">Admin Discount</span>
                      <span className="stat-value">{promo.admin_discount_percentage}%</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Vendor Suggested</span>
                      <span className="stat-value">{promo.suggested_vendor_discount}%</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Vendors</span>
                      <span className="stat-value">{promo.vendors_accepted || 0}/{promo.vendors_invited || 0}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Usage</span>
                      <span className="stat-value">{promo.current_usage_count || 0}/{promo.total_usage_limit || '∞'}</span>
                    </div>
                  </div>
                  <p className="text-muted small">
                    Valid: {new Date(promo.valid_from).toLocaleDateString()} - {promo.valid_until ? new Date(promo.valid_until).toLocaleDateString() : 'No expiration'}
                  </p>
                  <div className="button-group">
                    <button onClick={() => openInviteModal(promo.id)} className="secondary small">Invite Vendors</button>
                    <button onClick={() => togglePromotion(promo.id, promo.status)} className={`small ${promo.status === 'active' ? 'danger' : 'success'}`}>
                      {promo.status === 'active' ? 'Pause' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Site-wide Sales Tab */}
      {activeTab === 'sales' && (
        <div className="tab-content">
          <div className="section-header">
            <h3>Site-wide Sales</h3>
            <button onClick={() => openCreateModal('sale')}>Create New Sale</button>
          </div>

          {sitewideSales.length === 0 ? (
            <div className="empty-state">
              <p>No site-wide sales created yet.</p>
              <button onClick={() => openCreateModal('sale')}>Create Your First Sale</button>
            </div>
          ) : (
            <div className="card-grid">
              {sitewideSales.map(sale => (
                <div key={sale.id} className="form-card">
                  <div className="card-header">
                    <h4>{sale.name}</h4>
                    <span className={`status-badge ${sale.is_active ? 'success' : 'muted'}`}>{sale.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <p className="text-muted">{sale.description}</p>
                  <div className="stat-grid">
                    <div className="stat-item">
                      <span className="stat-label">Discount</span>
                      <span className="stat-value">{sale.discount_type === 'percentage' ? `${sale.discount_value}%` : `$${sale.discount_value}`}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Scope</span>
                      <span className="stat-value">{sale.scope === 'sitewide' ? 'Site-wide' : `${sale.product_count} products`}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Used</span>
                      <span className="stat-value">{sale.current_usage_count || 0} times</span>
                    </div>
                  </div>
                  <p className="text-muted small">
                    Valid: {new Date(sale.valid_from).toLocaleDateString()} - {sale.valid_until ? new Date(sale.valid_until).toLocaleDateString() : 'No expiration'}
                  </p>
                  <div className="button-group">
                    <button onClick={() => toggleSale(sale.id, sale.is_active)} className={`small ${sale.is_active ? 'danger' : 'success'}`}>
                      {sale.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin Coupons Tab */}
      {activeTab === 'coupons' && (
        <div className="tab-content">
          <div className="section-header">
            <h3>Admin Coupons</h3>
            <button onClick={() => openCreateModal('coupon')}>Create New Coupon</button>
          </div>

          {adminCoupons.length === 0 ? (
            <div className="empty-state">
              <p>No admin coupons created yet.</p>
              <button onClick={() => openCreateModal('coupon')}>Create Your First Coupon</button>
            </div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Discount</th>
                    <th>Scope</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminCoupons.map(coupon => (
                    <tr key={coupon.id}>
                      <td><strong>{coupon.code}</strong></td>
                      <td>{coupon.name}</td>
                      <td>{coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `$${coupon.discount_value}`}</td>
                      <td>{coupon.is_vendor_specific ? 'Vendor-specific' : 'Site-wide'}</td>
                      <td><span className={`status-badge ${coupon.is_active ? 'success' : 'muted'}`}>{coupon.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <button onClick={() => toggleCoupon(coupon.id, coupon.is_active)} className={`small ${coupon.is_active ? 'danger' : 'success'}`}>
                          {coupon.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="tab-content">
          <div className="section-header">
            <h3>Promotion Analytics</h3>
          </div>
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">Total Promotions</span>
              <span className="stat-value">{promotions.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Active Promotions</span>
              <span className="stat-value">{promotions.filter(p => p.status === 'active').length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Sales</span>
              <span className="stat-value">{sitewideSales.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Active Sales</span>
              <span className="stat-value">{sitewideSales.filter(s => s.is_active).length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Coupons</span>
              <span className="stat-value">{adminCoupons.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Active Coupons</span>
              <span className="stat-value">{adminCoupons.filter(c => c.is_active).length}</span>
            </div>
          </div>
          <div className="info-alert">
            Detailed analytics charts and reports will be added in a future update.
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            {createType === 'promotion' && (
              <>
                <h3>Create Collaborative Promotion</h3>
                <form onSubmit={handleSubmitPromotion}>
                  <div className="form-group">
                    <label>Promotion Name *</label>
                    <input type="text" value={promotionForm.name} onChange={e => setPromotionForm(p => ({ ...p, name: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea value={promotionForm.description} onChange={e => setPromotionForm(p => ({ ...p, description: e.target.value }))} rows="3" />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Admin Discount % *</label>
                      <input type="number" step="0.01" min="0" max="100" value={promotionForm.admin_discount_percentage} onChange={e => setPromotionForm(p => ({ ...p, admin_discount_percentage: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label>Suggested Vendor Discount % *</label>
                      <input type="number" step="0.01" min="0" max="100" value={promotionForm.suggested_vendor_discount} onChange={e => setPromotionForm(p => ({ ...p, suggested_vendor_discount: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Application Type *</label>
                    <select value={promotionForm.application_type} onChange={e => setPromotionForm(p => ({ ...p, application_type: e.target.value }))}>
                      <option value="coupon_code">Requires coupon code</option>
                      <option value="auto_apply">Auto-apply</option>
                    </select>
                  </div>
                  {promotionForm.application_type === 'coupon_code' && (
                    <div className="form-group">
                      <label>Coupon Code *</label>
                      <input type="text" value={promotionForm.coupon_code} onChange={e => setPromotionForm(p => ({ ...p, coupon_code: e.target.value.toUpperCase() }))} required />
                    </div>
                  )}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Valid From *</label>
                      <input type="datetime-local" value={promotionForm.valid_from} onChange={e => setPromotionForm(p => ({ ...p, valid_from: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label>Valid Until</label>
                      <input type="datetime-local" value={promotionForm.valid_until} onChange={e => setPromotionForm(p => ({ ...p, valid_until: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Min Order Amount</label>
                      <input type="number" step="0.01" min="0" value={promotionForm.min_order_amount} onChange={e => setPromotionForm(p => ({ ...p, min_order_amount: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Usage Limit Per User</label>
                      <input type="number" min="1" value={promotionForm.usage_limit_per_user} onChange={e => setPromotionForm(p => ({ ...p, usage_limit_per_user: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Total Usage Limit</label>
                      <input type="number" min="1" value={promotionForm.total_usage_limit} onChange={e => setPromotionForm(p => ({ ...p, total_usage_limit: e.target.value }))} placeholder="Unlimited" />
                    </div>
                  </div>
                  <div className="info-alert">
                    <strong>3% Commission Rule:</strong> Products will be excluded if total discount drops platform commission below 3%.
                  </div>
                  <div className="form-actions">
                    <button type="button" className="secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                    <button type="submit">Create Promotion</button>
                  </div>
                </form>
              </>
            )}

            {createType === 'sale' && (
              <>
                <h3>Create Site-wide Sale</h3>
                <form onSubmit={handleSubmitSale}>
                  <div className="form-group">
                    <label>Sale Name *</label>
                    <input type="text" value={saleForm.name} onChange={e => setSaleForm(p => ({ ...p, name: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea value={saleForm.description} onChange={e => setSaleForm(p => ({ ...p, description: e.target.value }))} rows="3" />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Discount Type *</label>
                      <select value={saleForm.discount_type} onChange={e => setSaleForm(p => ({ ...p, discount_type: e.target.value }))}>
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed_amount">Fixed Amount ($)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Discount Value *</label>
                      <input type="number" step="0.01" min="0" max={saleForm.discount_type === 'percentage' ? '100' : undefined} value={saleForm.discount_value} onChange={e => setSaleForm(p => ({ ...p, discount_value: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Application Type *</label>
                    <select value={saleForm.application_type} onChange={e => setSaleForm(p => ({ ...p, application_type: e.target.value }))}>
                      <option value="auto_apply">Auto-apply</option>
                      <option value="coupon_code">Requires coupon code</option>
                    </select>
                  </div>
                  {saleForm.application_type === 'coupon_code' && (
                    <div className="form-group">
                      <label>Coupon Code *</label>
                      <input type="text" value={saleForm.coupon_code} onChange={e => setSaleForm(p => ({ ...p, coupon_code: e.target.value.toUpperCase() }))} required />
                    </div>
                  )}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Valid From *</label>
                      <input type="datetime-local" value={saleForm.valid_from} onChange={e => setSaleForm(p => ({ ...p, valid_from: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label>Valid Until</label>
                      <input type="datetime-local" value={saleForm.valid_until} onChange={e => setSaleForm(p => ({ ...p, valid_until: e.target.value }))} />
                    </div>
                  </div>
                  <div className="info-alert">
                    <strong>Admin-funded:</strong> This discount is fully funded by the platform.
                  </div>
                  <div className="form-actions">
                    <button type="button" className="secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                    <button type="submit">Create Sale</button>
                  </div>
                </form>
              </>
            )}

            {createType === 'coupon' && (
              <>
                <h3>Create Admin Coupon</h3>
                <form onSubmit={handleSubmitCoupon}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Coupon Code *</label>
                      <input type="text" value={couponForm.code} onChange={e => setCouponForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} required />
                    </div>
                    <div className="form-group">
                      <label>Coupon Name *</label>
                      <input type="text" value={couponForm.name} onChange={e => setCouponForm(p => ({ ...p, name: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea value={couponForm.description} onChange={e => setCouponForm(p => ({ ...p, description: e.target.value }))} rows="3" />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Discount Type *</label>
                      <select value={couponForm.discount_type} onChange={e => setCouponForm(p => ({ ...p, discount_type: e.target.value }))}>
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed_amount">Fixed Amount ($)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Discount Value *</label>
                      <input type="number" step="0.01" min="0" max={couponForm.discount_type === 'percentage' ? '100' : undefined} value={couponForm.discount_value} onChange={e => setCouponForm(p => ({ ...p, discount_value: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Valid From *</label>
                      <input type="datetime-local" value={couponForm.valid_from} onChange={e => setCouponForm(p => ({ ...p, valid_from: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label>Valid Until</label>
                      <input type="datetime-local" value={couponForm.valid_until} onChange={e => setCouponForm(p => ({ ...p, valid_until: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Vendor ID (optional - leave empty for site-wide)</label>
                    <input type="number" min="1" value={couponForm.vendor_id} onChange={e => setCouponForm(p => ({ ...p, vendor_id: e.target.value }))} />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                    <button type="submit">Create Coupon</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Vendor Invitation Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <h3>Invite Vendors to Promotion</h3>
            <p className="text-muted">Select vendors to invite. You can optionally select specific products for each vendor.</p>
            
            {availableVendors.length === 0 ? (
              <div className="loading-state"><div className="spinner"></div><p>Loading vendors...</p></div>
            ) : (
              <div className="vendor-list">
                {availableVendors.map(vendor => (
                  <div key={vendor.id} className="form-card">
                    <label className="checkbox-label">
                      <input type="checkbox" checked={selectedVendors.includes(vendor.id)} onChange={() => handleVendorSelection(vendor.id)} />
                      <strong>{vendor.business_name || vendor.name}</strong>
                      {vendor.email && <span className="text-muted"> ({vendor.email})</span>}
                    </label>
                    
                    {selectedVendors.includes(vendor.id) && vendorProducts[vendor.id] && (
                      <div className="product-selection">
                        <p className="text-muted small">Select products (optional - leave empty for all):</p>
                        {vendorProducts[vendor.id].length === 0 ? (
                          <p className="text-muted"><em>No products</em></p>
                        ) : (
                          <div className="checkbox-grid">
                            {vendorProducts[vendor.id].map(product => (
                              <label key={product.id} className="checkbox-label small">
                                <input type="checkbox" checked={selectedProducts[vendor.id]?.includes(product.id) || false} onChange={() => handleProductSelection(vendor.id, product.id)} />
                                {product.title} - ${product.price}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="info-alert">
              <strong>{selectedVendors.length}</strong> vendor(s) selected
              {Object.values(selectedProducts).flat().length > 0 && (
                <span> • <strong>{Object.values(selectedProducts).flat().length}</strong> specific product(s)</span>
              )}
            </div>
            
            <div className="form-actions">
              <button type="button" className="secondary" onClick={() => setShowInviteModal(false)}>Cancel</button>
              <button onClick={sendInvitations} disabled={selectedVendors.length === 0}>
                Send Invitations ({selectedVendors.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPromotions;
