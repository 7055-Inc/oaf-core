import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';

export default function AdminPromotions({ userData }) {
  const [promotions, setPromotions] = useState([]);
  const [sitewideSales, setSitewideSales] = useState([]);
  const [adminCoupons, setAdminCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('promotions');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState('promotion'); // 'promotion', 'sale', or 'coupon'
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedPromotionId, setSelectedPromotionId] = useState(null);
  const [availableVendors, setAvailableVendors] = useState([]);
  const [selectedVendors, setSelectedVendors] = useState([]);
  const [vendorProducts, setVendorProducts] = useState({}); // {vendorId: [products]}
  const [selectedProducts, setSelectedProducts] = useState({}); // {vendorId: [productIds]}
  
  // Sale form state - matching /api/admin/sales/create-sitewide endpoint
  const [saleForm, setSaleForm] = useState({
    name: '',
    description: '',
    discount_type: 'percentage', // 'percentage' or 'fixed_amount'
    discount_value: '',
    application_type: 'auto_apply', // 'auto_apply' or 'coupon_code'
    coupon_code: '',
    min_order_amount: '0',
    usage_limit_per_user: '1',
    total_usage_limit: '',
    valid_from: '',
    valid_until: '',
    product_ids: [] // Empty = site-wide
  });

  // Coupon form state - matching /api/admin/coupons endpoint
  const [couponForm, setCouponForm] = useState({
    code: '',
    name: '',
    description: '',
    discount_type: 'percentage', // 'percentage' or 'fixed_amount'
    discount_value: '',
    application_type: 'coupon_code', // 'auto_apply' or 'coupon_code'
    min_order_amount: '0',
    usage_limit_per_user: '1',
    total_usage_limit: '',
    valid_from: '',
    valid_until: '',
    vendor_id: '', // For vendor-specific coupons
    product_ids: [], // For product-specific coupons
    max_discount_amount: ''
  });

  // Promotion form state - matching /api/admin/promotions/create endpoint
  const [promotionForm, setPromotionForm] = useState({
    name: '',
    description: '',
    admin_discount_percentage: '',
    suggested_vendor_discount: '',
    application_type: 'coupon_code', // 'auto_apply' or 'coupon_code'
    coupon_code: '',
    min_order_amount: '0',
    usage_limit_per_user: '1',
    total_usage_limit: '',
    valid_from: '',
    valid_until: ''
  });

  useEffect(() => {
    fetchPromotions();
    fetchSitewideSales();
    fetchAdminCoupons();
  }, []);

  const fetchPromotions = async () => {
    try {
      const response = await authApiRequest('admin/promotions/all', {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setPromotions(data.promotions || []);
      } else {
        throw new Error('Failed to fetch promotions');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchSitewideSales = async () => {
    try {
      const response = await authApiRequest('admin/sales/all', {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setSitewideSales(data.sales || []);
      }
    } catch (err) {
      console.error('Failed to fetch site-wide sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminCoupons = async () => {
    try {
      const response = await authApiRequest('admin/coupons/all', {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setAdminCoupons(data.coupons || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromotion = () => {
    setCreateType('promotion');
    setShowCreateModal(true);
    // Reset form to defaults
    setPromotionForm({
      name: '',
      description: '',
      admin_discount_percentage: '',
      suggested_vendor_discount: '',
      application_type: 'coupon_code',
      coupon_code: '',
      min_order_amount: '0',
      usage_limit_per_user: '1',
      total_usage_limit: '',
      valid_from: '',
      valid_until: ''
    });
  };

  const handleCreateSale = () => {
    setCreateType('sale');
    setShowCreateModal(true);
    // Reset form to defaults
    setSaleForm({
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      application_type: 'auto_apply',
      coupon_code: '',
      min_order_amount: '0',
      usage_limit_per_user: '1',
      total_usage_limit: '',
      valid_from: '',
      valid_until: '',
      product_ids: []
    });
  };

  const handleCreateCoupon = () => {
    setCreateType('coupon');
    setShowCreateModal(true);
    // Reset form to defaults
    setCouponForm({
      code: '',
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      application_type: 'coupon_code',
      min_order_amount: '0',
      usage_limit_per_user: '1',
      total_usage_limit: '',
      valid_from: '',
      valid_until: '',
      vendor_id: '',
      product_ids: [],
      max_discount_amount: ''
    });
  };

  const handleSaleFormChange = (field, value) => {
    setSaleForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCouponFormChange = (field, value) => {
    setCouponForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePromotionFormChange = (field, value) => {
    setPromotionForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitSale = async (e) => {
    e.preventDefault();
    
    try {
      // Prepare data for the existing endpoint
      const saleData = {
        name: saleForm.name,
        description: saleForm.description,
        discount_type: saleForm.discount_type,
        discount_value: parseFloat(saleForm.discount_value),
        application_type: saleForm.application_type,
        min_order_amount: parseFloat(saleForm.min_order_amount),
        usage_limit_per_user: parseInt(saleForm.usage_limit_per_user),
        valid_from: saleForm.valid_from,
        valid_until: saleForm.valid_until || null,
        product_ids: saleForm.product_ids
      };

      // Add coupon_code if needed
      if (saleForm.application_type === 'coupon_code') {
        saleData.coupon_code = saleForm.coupon_code;
      }

      // Add total_usage_limit if provided
      if (saleForm.total_usage_limit) {
        saleData.total_usage_limit = parseInt(saleForm.total_usage_limit);
      }

      const response = await authApiRequest('admin/sales/create-sitewide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(saleData)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Sale created successfully:', data);
        setShowCreateModal(false);
        fetchSitewideSales(); // Refresh the list
      } else {
        const errorData = await response.json();
        console.error('Failed to create sale:', errorData);
        alert('Failed to create sale: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating sale:', error);
      alert('Error creating sale: ' + error.message);
    }
  };

  const handleSubmitCoupon = async (e) => {
    e.preventDefault();
    
    try {
      // Prepare data for the admin coupon endpoint
      const couponData = {
        code: couponForm.code,
        name: couponForm.name,
        description: couponForm.description,
        discount_type: couponForm.discount_type,
        discount_value: parseFloat(couponForm.discount_value),
        application_type: couponForm.application_type,
        min_order_amount: parseFloat(couponForm.min_order_amount),
        usage_limit_per_user: parseInt(couponForm.usage_limit_per_user),
        valid_from: couponForm.valid_from,
        valid_until: couponForm.valid_until || null,
        product_ids: couponForm.product_ids
      };

      // Add vendor_id if provided
      if (couponForm.vendor_id) {
        couponData.vendor_id = parseInt(couponForm.vendor_id);
      }

      // Add total_usage_limit if provided
      if (couponForm.total_usage_limit) {
        couponData.total_usage_limit = parseInt(couponForm.total_usage_limit);
      }

      // Add max_discount_amount if provided
      if (couponForm.max_discount_amount) {
        couponData.max_discount_amount = parseFloat(couponForm.max_discount_amount);
      }

      const response = await authApiRequest('admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(couponData)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Coupon created successfully:', data);
        setShowCreateModal(false);
        fetchAdminCoupons(); // Refresh the list
      } else {
        const errorData = await response.json();
        console.error('Failed to create coupon:', errorData);
        alert('Failed to create coupon: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating coupon:', error);
      alert('Error creating coupon: ' + error.message);
    }
  };

  const handleSubmitPromotion = async (e) => {
    e.preventDefault();
    
    try {
      // Prepare data for the admin promotion endpoint
      const promotionData = {
        name: promotionForm.name,
        description: promotionForm.description,
        admin_discount_percentage: parseFloat(promotionForm.admin_discount_percentage),
        suggested_vendor_discount: parseFloat(promotionForm.suggested_vendor_discount),
        application_type: promotionForm.application_type,
        min_order_amount: parseFloat(promotionForm.min_order_amount),
        usage_limit_per_user: parseInt(promotionForm.usage_limit_per_user),
        valid_from: promotionForm.valid_from,
        valid_until: promotionForm.valid_until || null
      };

      // Add coupon_code if needed
      if (promotionForm.application_type === 'coupon_code') {
        promotionData.coupon_code = promotionForm.coupon_code;
      }

      // Add total_usage_limit if provided
      if (promotionForm.total_usage_limit) {
        promotionData.total_usage_limit = parseInt(promotionForm.total_usage_limit);
      }

      const response = await authApiRequest('admin/promotions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(promotionData)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Promotion created successfully:', data);
        setShowCreateModal(false);
        fetchPromotions(); // Refresh the list
      } else {
        const errorData = await response.json();
        console.error('Failed to create promotion:', errorData);
        alert('Failed to create promotion: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating promotion:', error);
      alert('Error creating promotion: ' + error.message);
    }
  };

  const handleInviteVendors = async (promotionId) => {
    setSelectedPromotionId(promotionId);
    setSelectedVendors([]);
    
    try {
      // Fetch available vendors
      const response = await authApiRequest('admin/users?role=vendor', {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableVendors(data.users || []);
        setShowInviteModal(true);
      } else {
        console.error('Failed to fetch vendors');
        alert('Failed to load vendors');
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      alert('Error loading vendors');
    }
  };

  const handleVendorSelection = async (vendorId) => {
    setSelectedVendors(prev => {
      const newSelected = prev.includes(vendorId) 
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId];
      
      // If vendor is being selected and we don't have their products yet, fetch them
      if (!prev.includes(vendorId) && !vendorProducts[vendorId]) {
        fetchVendorProducts(vendorId);
      }
      
      // If vendor is being deselected, clear their product selections
      if (prev.includes(vendorId)) {
        setSelectedProducts(prevProducts => {
          const newProducts = { ...prevProducts };
          delete newProducts[vendorId];
          return newProducts;
        });
      }
      
      return newSelected;
    });
  };

  const fetchVendorProducts = async (vendorId) => {
    try {
      const response = await authApiRequest(`products?vendor_id=${vendorId}`, {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setVendorProducts(prev => ({
          ...prev,
          [vendorId]: data.products || []
        }));
        // Initialize empty product selection for this vendor
        setSelectedProducts(prev => ({
          ...prev,
          [vendorId]: []
        }));
      } else {
        console.error(`Failed to fetch products for vendor ${vendorId}`);
      }
    } catch (error) {
      console.error(`Error fetching products for vendor ${vendorId}:`, error);
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

  const handleSendInvitations = async () => {
    if (selectedVendors.length === 0) {
      alert('Please select at least one vendor to invite');
      return;
    }

    try {
      // Prepare product selections for each vendor
      const product_selections = {};
      selectedVendors.forEach(vendorId => {
        if (selectedProducts[vendorId] && selectedProducts[vendorId].length > 0) {
          product_selections[vendorId] = selectedProducts[vendorId];
        }
      });

      const response = await authApiRequest(`admin/promotions/${selectedPromotionId}/invite-vendors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vendor_ids: selectedVendors,
          product_selections: Object.keys(product_selections).length > 0 ? product_selections : undefined,
          admin_message: 'You have been invited to participate in this collaborative promotion.'
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Invitations sent successfully:', data);
        setShowInviteModal(false);
        fetchPromotions(); // Refresh the list
        
        // Count total products selected
        const totalProducts = Object.values(selectedProducts).reduce((sum, products) => sum + products.length, 0);
        const message = totalProducts > 0 
          ? `Invitations sent to ${selectedVendors.length} vendor(s) for ${totalProducts} product(s)`
          : `Invitations sent to ${selectedVendors.length} vendor(s) for all their products`;
        alert(message);
      } else {
        const errorData = await response.json();
        console.error('Failed to send invitations:', errorData);
        alert('Failed to send invitations: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
      alert('Error sending invitations: ' + error.message);
    }
  };

  const handleViewSuggestions = async (promotionId) => {
    // This would open a suggestions review modal
    console.log('View vendor suggestions for promotion:', promotionId);
  };

  const handleTogglePromotion = async (promotionId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      const response = await authApiRequest(`admin/promotions/${promotionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setPromotions(prev => prev.map(p => 
          p.id === promotionId ? { ...p, status: newStatus } : p
        ));
      } else {
        throw new Error('Failed to update promotion');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleSale = async (saleId, isActive) => {
    try {
      const response = await authApiRequest(`admin/sales/${saleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      });

      if (response.ok) {
        setSitewideSales(prev => prev.map(s => 
          s.id === saleId ? { ...s, is_active: !isActive } : s
        ));
      } else {
        throw new Error('Failed to update sale');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleCoupon = async (couponId, isActive) => {
    try {
      const response = await authApiRequest(`admin/coupons/${couponId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      });

      if (response.ok) {
        setAdminCoupons(prev => prev.map(c => 
          c.id === couponId ? { ...c, is_active: !isActive } : c
        ));
      } else {
        throw new Error('Failed to update coupon');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading promotions...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div>
      {/* Tab Navigation */}
      <div className="tab-container">
        <button 
          className={`tab ${activeTab === 'promotions' ? 'active' : ''}`}
          onClick={() => setActiveTab('promotions')}
        >
          Collaborative Promotions ({promotions.length})
        </button>
        <button 
          className={`tab ${activeTab === 'sales' ? 'active' : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          Site-wide Sales ({sitewideSales.length})
        </button>
        <button 
          className={`tab ${activeTab === 'coupons' ? 'active' : ''}`}
          onClick={() => setActiveTab('coupons')}
        >
          Admin Coupons ({adminCoupons.length})
        </button>
        <button 
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
      </div>

      {/* Collaborative Promotions Tab */}
      {activeTab === 'promotions' && (
        <div className="tab-content">
          <div className="section-header">
            <h3>Collaborative Promotions</h3>
            <button onClick={handleCreatePromotion}>
              Create New Promotion
            </button>
          </div>

          {promotions.length === 0 ? (
            <div className="empty-state">
              <p>No collaborative promotions created yet.</p>
              <button onClick={handleCreatePromotion}>
                Create Your First Promotion
              </button>
            </div>
          ) : (
            <div className="promotions-grid">
              {promotions.map(promotion => (
                <div key={promotion.id} className="promotion-card">
                  <div className="promotion-header">
                    <h4>{promotion.name}</h4>
                    <span className={`status-badge ${promotion.status}`}>
                      {promotion.status}
                    </span>
                  </div>
                  
                  <div className="promotion-details">
                    <p>{promotion.description}</p>
                    <div className="discount-info">
                      <div>Admin Contribution: {promotion.admin_discount_percentage}%</div>
                      <div>Suggested Vendor: {promotion.suggested_vendor_discount}%</div>
                    </div>
                    <div className="promotion-stats">
                      <div>Vendors Invited: {promotion.vendors_invited || 0}</div>
                      <div>Vendors Accepted: {promotion.vendors_accepted || 0}</div>
                      <div>Products: {promotion.total_products || 0}</div>
                      <div>Usage: {promotion.current_usage_count || 0} / {promotion.total_usage_limit || '∞'}</div>
                    </div>
                    <div className="promotion-dates">
                      Valid: {new Date(promotion.valid_from).toLocaleDateString()} - 
                      {promotion.valid_until ? new Date(promotion.valid_until).toLocaleDateString() : 'No expiration'}
                    </div>
                  </div>

                  <div className="promotion-actions">
                    <button onClick={() => handleInviteVendors(promotion.id)}>
                      Invite Vendors
                    </button>
                    <button onClick={() => handleViewSuggestions(promotion.id)}>
                      View Suggestions
                    </button>
                    <button 
                      onClick={() => handleTogglePromotion(promotion.id, promotion.status)}
                      className={promotion.status === 'active' ? 'pause-btn' : 'activate-btn'}
                    >
                      {promotion.status === 'active' ? 'Pause' : 'Activate'}
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
            <button onClick={handleCreateSale}>
              Create New Sale
            </button>
          </div>

          {sitewideSales.length === 0 ? (
            <div className="empty-state">
              <p>No site-wide sales created yet.</p>
              <button onClick={handleCreateSale}>
                Create Your First Sale
              </button>
            </div>
          ) : (
            <div className="sales-grid">
              {sitewideSales.map(sale => (
                <div key={sale.id} className="sale-card">
                  <div className="sale-header">
                    <h4>{sale.name}</h4>
                    <span className={`status-badge ${sale.is_active ? 'active' : 'inactive'}`}>
                      {sale.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="sale-details">
                    <p>{sale.description}</p>
                    <div className="sale-discount">
                      {sale.discount_type === 'percentage' ? (
                        <span>{sale.discount_value}% off (Admin funded)</span>
                      ) : (
                        <span>${sale.discount_value} off (Admin funded)</span>
                      )}
                    </div>
                    <div className="sale-scope">
                      Scope: {sale.scope === 'sitewide' ? 'Site-wide' : `${sale.product_count} products`}
                    </div>
                    <div className="sale-usage">
                      Used: {sale.current_usage_count || 0} times
                    </div>
                    <div className="sale-dates">
                      Valid: {new Date(sale.valid_from).toLocaleDateString()} - 
                      {sale.valid_until ? new Date(sale.valid_until).toLocaleDateString() : 'No expiration'}
                    </div>
                  </div>

                  <div className="sale-actions">
                    <button 
                      onClick={() => handleToggleSale(sale.id, sale.is_active)}
                      className={sale.is_active ? 'deactivate-btn' : 'activate-btn'}
                    >
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
            <button onClick={handleCreateCoupon}>
              Create New Coupon
            </button>
          </div>

          {adminCoupons.length === 0 ? (
            <div className="empty-state">
              <p>No admin coupons created yet.</p>
              <button onClick={handleCreateCoupon}>
                Create Your First Coupon
              </button>
            </div>
          ) : (
            <div className="coupons-grid">
              {adminCoupons.map(coupon => (
                <div key={coupon.id} className="coupon-card">
                  <div className="coupon-header">
                    <h4>{coupon.name}</h4>
                    <span className={`status ${coupon.is_active ? 'active' : 'inactive'}`}>
                      {coupon.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="coupon-details">
                    <div className="coupon-code">
                      Code: <strong>{coupon.code}</strong>
                    </div>
                    <div className="coupon-discount">
                      Discount: {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `$${coupon.discount_value}`}
                    </div>
                    <div className="coupon-scope">
                      Scope: {coupon.is_vendor_specific ? `Vendor-specific` : 'Site-wide'}
                    </div>
                  </div>

                  <div className="coupon-actions">
                    <button 
                      onClick={() => handleToggleCoupon(coupon.id, coupon.is_active)}
                      className={coupon.is_active ? 'deactivate-btn' : 'activate-btn'}
                    >
                      {coupon.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
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
          
          <div className="analytics-dashboard">
            <div className="analytics-cards">
              <div className="analytics-card">
                <h4>Total Promotions</h4>
                <div className="metric">{promotions.length}</div>
              </div>
              <div className="analytics-card">
                <h4>Active Promotions</h4>
                <div className="metric">{promotions.filter(p => p.status === 'active').length}</div>
              </div>
              <div className="analytics-card">
                <h4>Total Sales</h4>
                <div className="metric">{sitewideSales.length}</div>
              </div>
              <div className="analytics-card">
                <h4>Active Sales</h4>
                <div className="metric">{sitewideSales.filter(s => s.is_active).length}</div>
              </div>
            </div>
            
            <div className="analytics-placeholder">
              <p>Detailed analytics charts and reports will be implemented here.</p>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            {createType === 'sale' ? (
              <div>
                <h3 className="modal-title">Create New Site-Wide Sale</h3>
                <form onSubmit={handleSubmitSale}>
                  <div>
                    <label>Sale Name *</label>
                    <input
                      type="text"
                      value={saleForm.name}
                      onChange={(e) => handleSaleFormChange('name', e.target.value)}
                      placeholder="e.g., Summer Sale 2024"
                      required
                    />
                  </div>

                  <div>
                    <label>Description</label>
                    <textarea
                      value={saleForm.description}
                      onChange={(e) => handleSaleFormChange('description', e.target.value)}
                      placeholder="Brief description of the sale"
                      rows="3"
                    />
                  </div>

                  <div className="form-grid-2">
                    <div>
                      <label>Discount Type *</label>
                      <select
                        value={saleForm.discount_type}
                        onChange={(e) => handleSaleFormChange('discount_type', e.target.value)}
                        required
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed_amount">Fixed Amount ($)</option>
                      </select>
                    </div>

                    <div>
                      <label>Discount Value *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={saleForm.discount_type === 'percentage' ? '100' : undefined}
                        value={saleForm.discount_value}
                        onChange={(e) => handleSaleFormChange('discount_value', e.target.value)}
                        placeholder={saleForm.discount_type === 'percentage' ? '10' : '25.00'}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label>Application Type *</label>
                    <select
                      value={saleForm.application_type}
                      onChange={(e) => handleSaleFormChange('application_type', e.target.value)}
                      required
                    >
                      <option value="auto_apply">Auto-apply (no code needed)</option>
                      <option value="coupon_code">Requires coupon code</option>
                    </select>
                  </div>

                  {saleForm.application_type === 'coupon_code' && (
                    <div>
                      <label>Coupon Code *</label>
                      <input
                        type="text"
                        value={saleForm.coupon_code}
                        onChange={(e) => handleSaleFormChange('coupon_code', e.target.value.toUpperCase())}
                        placeholder="SUMMER2024"
                        required
                      />
                    </div>
                  )}

                  <div className="form-grid-2">
                    <div>
                      <label>Valid From *</label>
                      <input
                        type="datetime-local"
                        value={saleForm.valid_from}
                        onChange={(e) => handleSaleFormChange('valid_from', e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label>Valid Until</label>
                      <input
                        type="datetime-local"
                        value={saleForm.valid_until}
                        onChange={(e) => handleSaleFormChange('valid_until', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div>
                      <label>Minimum Order Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={saleForm.min_order_amount}
                        onChange={(e) => handleSaleFormChange('min_order_amount', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label>Usage Limit Per User</label>
                      <input
                        type="number"
                        min="1"
                        value={saleForm.usage_limit_per_user}
                        onChange={(e) => handleSaleFormChange('usage_limit_per_user', e.target.value)}
                        placeholder="1"
                      />
                    </div>
                  </div>

                  <div>
                    <label>Total Usage Limit</label>
                    <input
                      type="number"
                      min="1"
                      value={saleForm.total_usage_limit}
                      onChange={(e) => handleSaleFormChange('total_usage_limit', e.target.value)}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>

                  <div className="commission-warning">
                    <p><strong>3% Commission Rule:</strong> Products will be automatically excluded if the discount would reduce platform commission below 3%.</p>
                  </div>

                  <div className="modal-actions">
                    <button type="button" className="secondary" onClick={() => setShowCreateModal(false)}>
                      Cancel
                    </button>
                    <button type="submit">
                      Create Sale
                    </button>
                  </div>
                </form>
              </div>
            ) : createType === 'coupon' ? (
              <div>
                <h3 className="modal-title">Create New Admin Coupon</h3>
                <form onSubmit={handleSubmitCoupon}>
                  <div>
                    <label>Coupon Code *</label>
                    <input
                      type="text"
                      value={couponForm.code}
                      onChange={(e) => handleCouponFormChange('code', e.target.value.toUpperCase())}
                      placeholder="SAVE20"
                      required
                    />
                  </div>

                  <div>
                    <label>Coupon Name *</label>
                    <input
                      type="text"
                      value={couponForm.name}
                      onChange={(e) => handleCouponFormChange('name', e.target.value)}
                      placeholder="e.g., 20% Off Holiday Sale"
                      required
                    />
                  </div>

                  <div>
                    <label>Description</label>
                    <textarea
                      value={couponForm.description}
                      onChange={(e) => handleCouponFormChange('description', e.target.value)}
                      placeholder="Brief description of the coupon"
                      rows="3"
                    />
                  </div>

                  <div className="form-grid-2">
                    <div>
                      <label>Discount Type *</label>
                      <select
                        value={couponForm.discount_type}
                        onChange={(e) => handleCouponFormChange('discount_type', e.target.value)}
                        required
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed_amount">Fixed Amount ($)</option>
                      </select>
                    </div>

                    <div>
                      <label>Discount Value *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={couponForm.discount_type === 'percentage' ? '100' : undefined}
                        value={couponForm.discount_value}
                        onChange={(e) => handleCouponFormChange('discount_value', e.target.value)}
                        placeholder={couponForm.discount_type === 'percentage' ? '20' : '25.00'}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label>Application Type *</label>
                    <select
                      value={couponForm.application_type}
                      onChange={(e) => handleCouponFormChange('application_type', e.target.value)}
                      required
                    >
                      <option value="coupon_code">Requires coupon code</option>
                      <option value="auto_apply">Auto-apply (no code needed)</option>
                    </select>
                  </div>

                  <div className="form-grid-2">
                    <div>
                      <label>Valid From *</label>
                      <input
                        type="datetime-local"
                        value={couponForm.valid_from}
                        onChange={(e) => handleCouponFormChange('valid_from', e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label>Valid Until</label>
                      <input
                        type="datetime-local"
                        value={couponForm.valid_until}
                        onChange={(e) => handleCouponFormChange('valid_until', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div>
                      <label>Minimum Order Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={couponForm.min_order_amount}
                        onChange={(e) => handleCouponFormChange('min_order_amount', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label>Usage Limit Per User</label>
                      <input
                        type="number"
                        min="1"
                        value={couponForm.usage_limit_per_user}
                        onChange={(e) => handleCouponFormChange('usage_limit_per_user', e.target.value)}
                        placeholder="1"
                      />
                    </div>
                  </div>

                  <div>
                    <label>Total Usage Limit</label>
                    <input
                      type="number"
                      min="1"
                      value={couponForm.total_usage_limit}
                      onChange={(e) => handleCouponFormChange('total_usage_limit', e.target.value)}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>

                  {couponForm.discount_type === 'percentage' && (
                    <div>
                      <label>Maximum Discount Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={couponForm.max_discount_amount}
                        onChange={(e) => handleCouponFormChange('max_discount_amount', e.target.value)}
                        placeholder="100.00"
                      />
                    </div>
                  )}

                  <div>
                    <label>Vendor ID (Optional)</label>
                    <input
                      type="number"
                      min="1"
                      value={couponForm.vendor_id}
                      onChange={(e) => handleCouponFormChange('vendor_id', e.target.value)}
                      placeholder="Leave empty for site-wide coupon"
                    />
                  </div>

                  <div className="commission-warning">
                    <p><strong>3% Commission Rule:</strong> Products will be automatically excluded if the discount would reduce platform commission below 3%.</p>
                  </div>

                  <div className="modal-actions">
                    <button type="button" className="secondary" onClick={() => setShowCreateModal(false)}>
                      Cancel
                    </button>
                    <button type="submit">
                      Create Coupon
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div>
                <h3 className="modal-title">Create New Collaborative Promotion</h3>
                <form onSubmit={handleSubmitPromotion}>
                  <div>
                    <label>Promotion Name *</label>
                    <input
                      type="text"
                      value={promotionForm.name}
                      onChange={(e) => handlePromotionFormChange('name', e.target.value)}
                      placeholder="e.g., Holiday Art Sale 2024"
                      required
                    />
                  </div>

                  <div>
                    <label>Description</label>
                    <textarea
                      value={promotionForm.description}
                      onChange={(e) => handlePromotionFormChange('description', e.target.value)}
                      placeholder="Brief description of the collaborative promotion"
                      rows="3"
                    />
                  </div>

                  <div className="form-grid-2">
                    <div>
                      <label>Admin Discount % *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={promotionForm.admin_discount_percentage}
                        onChange={(e) => handlePromotionFormChange('admin_discount_percentage', e.target.value)}
                        placeholder="10.00"
                        required
                      />
                      <small>Platform-funded discount percentage</small>
                    </div>

                    <div>
                      <label>Suggested Vendor Discount % *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={promotionForm.suggested_vendor_discount}
                        onChange={(e) => handlePromotionFormChange('suggested_vendor_discount', e.target.value)}
                        placeholder="15.00"
                        required
                      />
                      <small>Suggested vendor-funded discount</small>
                    </div>
                  </div>

                  <div>
                    <label>Application Type *</label>
                    <select
                      value={promotionForm.application_type}
                      onChange={(e) => handlePromotionFormChange('application_type', e.target.value)}
                      required
                    >
                      <option value="coupon_code">Requires coupon code</option>
                      <option value="auto_apply">Auto-apply (no code needed)</option>
                    </select>
                  </div>

                  {promotionForm.application_type === 'coupon_code' && (
                    <div>
                      <label>Coupon Code *</label>
                      <input
                        type="text"
                        value={promotionForm.coupon_code}
                        onChange={(e) => handlePromotionFormChange('coupon_code', e.target.value.toUpperCase())}
                        placeholder="HOLIDAY2024"
                        required
                      />
                    </div>
                  )}

                  <div className="form-grid-2">
                    <div>
                      <label>Valid From *</label>
                      <input
                        type="datetime-local"
                        value={promotionForm.valid_from}
                        onChange={(e) => handlePromotionFormChange('valid_from', e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label>Valid Until</label>
                      <input
                        type="datetime-local"
                        value={promotionForm.valid_until}
                        onChange={(e) => handlePromotionFormChange('valid_until', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div>
                      <label>Minimum Order Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={promotionForm.min_order_amount}
                        onChange={(e) => handlePromotionFormChange('min_order_amount', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label>Usage Limit Per User</label>
                      <input
                        type="number"
                        min="1"
                        value={promotionForm.usage_limit_per_user}
                        onChange={(e) => handlePromotionFormChange('usage_limit_per_user', e.target.value)}
                        placeholder="1"
                      />
                    </div>
                  </div>

                  <div>
                    <label>Total Usage Limit</label>
                    <input
                      type="number"
                      min="1"
                      value={promotionForm.total_usage_limit}
                      onChange={(e) => handlePromotionFormChange('total_usage_limit', e.target.value)}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>

                  <div className="commission-warning">
                    <p><strong>Collaborative Promotion:</strong> Admin provides {promotionForm.admin_discount_percentage || 'X'}% discount, vendors will be invited to contribute their suggested discount. Products will be excluded if total discount drops platform commission below 3%.</p>
                  </div>

                  <div className="modal-actions">
                    <button type="button" className="secondary" onClick={() => setShowCreateModal(false)}>
                      Cancel
                    </button>
                    <button type="submit">
                      Create Promotion
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vendor Invitation Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Invite Vendors to Promotion</h3>
            
            <p>Select vendors to invite to this collaborative promotion:</p>
            
            <div className="vendor-selection">
              {availableVendors.length === 0 ? (
                <p>Loading vendors...</p>
              ) : (
                <div className="vendor-list">
                  {availableVendors.map(vendor => (
                    <div key={vendor.id} className="vendor-section">
                      <div className="vendor-item">
                        <label>
                          <input
                            type="checkbox"
                            checked={selectedVendors.includes(vendor.id)}
                            onChange={() => handleVendorSelection(vendor.id)}
                          />
                          <span className="vendor-info">
                            <strong>{vendor.business_name || vendor.name}</strong>
                            {vendor.email && <small> ({vendor.email})</small>}
                          </span>
                        </label>
                      </div>

                      {/* Product Selection for Selected Vendors */}
                      {selectedVendors.includes(vendor.id) && (
                        <div className="product-selection">
                          <h5>Select Products (optional - leave empty for all products):</h5>
                          {vendorProducts[vendor.id] ? (
                            vendorProducts[vendor.id].length === 0 ? (
                              <p><em>This vendor has no products</em></p>
                            ) : (
                              <div className="product-list">
                                {vendorProducts[vendor.id].map(product => (
                                  <div key={product.id} className="product-item">
                                    <label>
                                      <input
                                        type="checkbox"
                                        checked={selectedProducts[vendor.id]?.includes(product.id) || false}
                                        onChange={() => handleProductSelection(vendor.id, product.id)}
                                      />
                                      <span className="product-info">
                                        <strong>{product.title}</strong>
                                        <small> - ${product.price}</small>
                                        {product.category && <small> ({product.category})</small>}
                                      </span>
                                    </label>
                                  </div>
                                ))}
                              </div>
                            )
                          ) : (
                            <p><em>Loading products...</em></p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="selection-summary">
              <p><strong>{selectedVendors.length}</strong> vendor(s) selected</p>
              {Object.keys(selectedProducts).length > 0 && (
                <p>
                  <strong>{Object.values(selectedProducts).reduce((sum, products) => sum + products.length, 0)}</strong> specific product(s) selected
                  <br />
                  <small>Vendors with no products selected will have all their products included</small>
                </p>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setShowInviteModal(false)}>
                Cancel
              </button>
              <button 
                onClick={handleSendInvitations}
                disabled={selectedVendors.length === 0}
              >
                Send Invitations ({selectedVendors.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
