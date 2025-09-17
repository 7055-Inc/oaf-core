import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../lib/csrf';

export default function ManagePromotions({ userData }) {
  const [coupons, setCoupons] = useState([]);
  const [promotionInvitations, setPromotionInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('my-coupons');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Coupon form state - matching /api/vendor/coupons/create endpoint
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
    product_ids: [] // For product-specific coupons
  });

  useEffect(() => {
    fetchCoupons();
    fetchPromotionInvitations();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/coupons/my', {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setCoupons(data.coupons || []);
      } else {
        throw new Error('Failed to fetch coupons');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchPromotionInvitations = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/promotions/invitations', {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setPromotionInvitations(data.invitations || []);
      }
    } catch (err) {
      console.error('Failed to fetch promotion invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoupon = () => {
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
      product_ids: []
    });
  };

  const handleCouponFormChange = (field, value) => {
    setCouponForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitCoupon = async (e) => {
    e.preventDefault();
    
    try {
      // Prepare data for the vendor coupon endpoint
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

      // Add total_usage_limit if provided
      if (couponForm.total_usage_limit) {
        couponData.total_usage_limit = parseInt(couponForm.total_usage_limit);
      }

      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/vendor/coupons/create', {
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
        fetchCoupons(); // Refresh the list
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

  const handleDeleteCoupon = async (couponId) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;

    try {
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/vendor/coupons/${couponId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setCoupons(prev => prev.filter(c => c.id !== couponId));
      } else {
        throw new Error('Failed to delete coupon');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleCoupon = async (couponId, isActive) => {
    try {
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/vendor/coupons/${couponId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      });

      if (response.ok) {
        setCoupons(prev => prev.map(c => 
          c.id === couponId ? { ...c, is_active: !isActive } : c
        ));
      } else {
        throw new Error('Failed to update coupon');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const respondToInvitation = async (invitationId, response, vendorDiscount = null) => {
    try {
      const apiResponse = await authenticatedApiRequest(`https://api2.onlineartfestival.com/vendor/promotions/${invitationId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response,
          vendor_discount_percentage: vendorDiscount
        })
      });

      if (apiResponse.ok) {
        fetchPromotionInvitations(); // Refresh invitations
      } else {
        throw new Error('Failed to respond to invitation');
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
          className={`tab ${activeTab === 'my-coupons' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-coupons')}
        >
          My Coupons ({coupons.length})
        </button>
        <button 
          className={`tab ${activeTab === 'promotion-invitations' ? 'active' : ''}`}
          onClick={() => setActiveTab('promotion-invitations')}
        >
          Promotion Invitations ({promotionInvitations.length})
        </button>
      </div>

      {/* My Coupons Tab */}
      {activeTab === 'my-coupons' && (
        <div className="tab-content">
          <div className="section-header">
            <h3>My Coupons</h3>
            <button onClick={handleCreateCoupon}>
              Create New Coupon
            </button>
          </div>

          {coupons.length === 0 ? (
            <div className="empty-state">
              <p>You haven't created any coupons yet.</p>
              <button onClick={handleCreateCoupon}>
                Create Your First Coupon
              </button>
            </div>
          ) : (
            <div className="coupons-grid">
              {coupons.map(coupon => (
                <div key={coupon.id} className="coupon-card">
                  <div className="coupon-header">
                    <h4>{coupon.name}</h4>
                    <div className="coupon-status">
                      <span className={`status-badge ${coupon.is_active ? 'active' : 'inactive'}`}>
                        {coupon.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="coupon-details">
                    <div className="coupon-code">Code: <strong>{coupon.code}</strong></div>
                    <div className="coupon-discount">
                      {coupon.discount_type === 'percentage' ? (
                        <span>{coupon.discount_value}% off</span>
                      ) : (
                        <span>${coupon.discount_value} off</span>
                      )}
                    </div>
                    <div className="coupon-usage">
                      Used: {coupon.current_usage_count} / {coupon.usage_limit_per_user || '∞'} per user
                    </div>
                    <div className="coupon-dates">
                      Valid: {new Date(coupon.valid_from).toLocaleDateString()} - 
                      {coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString() : 'No expiration'}
                    </div>
                  </div>

                  <div className="coupon-actions">
                    <button 
                      onClick={() => handleToggleCoupon(coupon.id, coupon.is_active)}
                      className={coupon.is_active ? 'secondary' : ''}
                    >
                      {coupon.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => handleDeleteCoupon(coupon.id)} className="secondary">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Promotion Invitations Tab */}
      {activeTab === 'promotion-invitations' && (
        <div className="tab-content">
          <div className="section-header">
            <h3>Promotion Invitations</h3>
          </div>

          {promotionInvitations.length === 0 ? (
            <div className="empty-state">
              <p>No promotion invitations at this time.</p>
            </div>
          ) : (
            <div className="invitations-list">
              {promotionInvitations.map(invitation => (
                <div key={invitation.id} className="invitation-card">
                  <div className="invitation-header">
                    <h4>{invitation.promotion_name}</h4>
                    <span className={`status-badge ${invitation.invitation_status}`}>
                      {invitation.invitation_status}
                    </span>
                  </div>
                  
                  <div className="invitation-details">
                    <p>{invitation.promotion_description}</p>
                    <div className="discount-breakdown">
                      <div>Admin Contribution: {invitation.admin_discount_percentage}%</div>
                      <div>Suggested Vendor Contribution: {invitation.suggested_vendor_discount}%</div>
                      <div>Total Customer Discount: {invitation.admin_discount_percentage + invitation.suggested_vendor_discount}%</div>
                    </div>
                    <div className="invitation-message">
                      <strong>Message from Admin:</strong>
                      <p>{invitation.admin_message}</p>
                    </div>
                  </div>

                  {invitation.invitation_status === 'pending' && (
                    <div className="invitation-actions">
                      <div className="vendor-discount-input">
                        <label>Your Discount Contribution (%):</label>
                        <input 
                          type="number" 
                          min="0" 
                          max="50" 
                          defaultValue={invitation.suggested_vendor_discount}
                          id={`vendor-discount-${invitation.id}`}
                        />
                      </div>
                      <div className="action-buttons">
                        <button 
                          onClick={() => {
                            const discountInput = document.getElementById(`vendor-discount-${invitation.id}`);
                            respondToInvitation(invitation.id, 'accepted', parseFloat(discountInput.value));
                          }}
                        >
                          Accept Invitation
                        </button>
                        <button 
                          onClick={() => respondToInvitation(invitation.id, 'rejected')}
                          className="secondary"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Coupon Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Create New Coupon</h3>
            <form onSubmit={handleSubmitCoupon}>
              <div>
                <label>Coupon Code *</label>
                <input
                  type="text"
                  value={couponForm.code}
                  onChange={(e) => handleCouponFormChange('code', e.target.value.toUpperCase())}
                  placeholder="SAVE15"
                  required
                />
              </div>

              <div>
                <label>Coupon Name *</label>
                <input
                  type="text"
                  value={couponForm.name}
                  onChange={(e) => handleCouponFormChange('name', e.target.value)}
                  placeholder="e.g., 15% Off My Art"
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
                    placeholder={couponForm.discount_type === 'percentage' ? '15' : '20.00'}
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
        </div>
      )}
    </div>
  );
}
