/**
 * Promotions Management (Business Center)
 * Coupons and promotion invitations. Uses v2 API: /api/v2/commerce/coupons, /api/v2/commerce/promotions
 */

import React, { useState, useEffect } from 'react';
import {
  fetchMyCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  fetchPromotionInvitations,
  respondToPromotionInvitation
} from '../../../lib/commerce';

const defaultCouponForm = {
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
};

export default function PromotionsManagement({ userData: propUserData }) {
  const [coupons, setCoupons] = useState([]);
  const [promotionInvitations, setPromotionInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('my-coupons');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [couponForm, setCouponForm] = useState(defaultCouponForm);

  useEffect(() => {
    loadCoupons();
    loadInvitations();
  }, []);

  const loadCoupons = async () => {
    try {
      const data = await fetchMyCoupons();
      setCoupons(data.coupons || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadInvitations = async () => {
    try {
      const data = await fetchPromotionInvitations();
      setPromotionInvitations(data.invitations || []);
    } catch (err) {
      console.error('Failed to fetch promotion invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoupon = () => {
    setShowCreateModal(true);
    setCouponForm({ ...defaultCouponForm });
  };

  const handleCouponFormChange = (field, value) => {
    setCouponForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitCoupon = async (e) => {
    e.preventDefault();
    try {
      const couponData = {
        code: couponForm.code,
        name: couponForm.name,
        description: couponForm.description,
        discount_type: couponForm.discount_type,
        discount_value: parseFloat(couponForm.discount_value),
        application_type: couponForm.application_type,
        min_order_amount: parseFloat(couponForm.min_order_amount),
        usage_limit_per_user: parseInt(couponForm.usage_limit_per_user, 10),
        valid_from: couponForm.valid_from,
        valid_until: couponForm.valid_until || null,
        product_ids: couponForm.product_ids || []
      };
      if (couponForm.total_usage_limit) {
        couponData.total_usage_limit = parseInt(couponForm.total_usage_limit, 10);
      }
      await createCoupon(couponData);
      setShowCreateModal(false);
      loadCoupons();
    } catch (err) {
      setError(err.message);
      alert('Failed to create coupon: ' + err.message);
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await deleteCoupon(couponId);
      setCoupons(prev => prev.filter(c => c.id !== couponId));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleCoupon = async (couponId, isActive) => {
    try {
      await updateCoupon(couponId, { is_active: !isActive });
      setCoupons(prev => prev.map(c => (c.id === couponId ? { ...c, is_active: !isActive } : c)));
    } catch (err) {
      setError(err.message);
    }
  };

  const respondToInvitation = async (invitationId, response, vendorDiscount = null) => {
    try {
      await respondToPromotionInvitation(invitationId, {
        response,
        vendor_discount_percentage: vendorDiscount != null ? parseFloat(vendorDiscount) : undefined
      });
      loadInvitations();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="loading-state">Loading promotions...</div>;
  }

  if (error) {
    return <div className="error-alert">Error: {error}</div>;
  }

  return (
    <div className="section-box">
      <div className="tab-container">
        <button
          type="button"
          className={`tab ${activeTab === 'my-coupons' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-coupons')}
        >
          My Coupons ({coupons.length})
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'promotion-invitations' ? 'active' : ''}`}
          onClick={() => setActiveTab('promotion-invitations')}
        >
          Promotion Invitations ({promotionInvitations.length})
        </button>
      </div>

      {activeTab === 'my-coupons' && (
        <div className="tab-content">
          <div className="section-header">
            <h3>My Coupons</h3>
            <button type="button" className="primary" onClick={handleCreateCoupon}>
              Create New Coupon
            </button>
          </div>

          {coupons.length === 0 ? (
            <div className="empty-state">
              <p>You haven&apos;t created any coupons yet.</p>
              <button type="button" className="primary" onClick={handleCreateCoupon}>
                Create Your First Coupon
              </button>
            </div>
          ) : (
            <div className="coupons-grid">
              {coupons.map(coupon => (
                <div key={coupon.id} className="coupon-card">
                  <div className="coupon-header">
                    <h4>{coupon.name}</h4>
                    <span className={`status-badge ${coupon.is_active ? 'active' : 'inactive'}`}>
                      {coupon.is_active ? 'Active' : 'Inactive'}
                    </span>
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
                      Used: {coupon.current_usage_count ?? 0} / {coupon.usage_limit_per_user || '∞'} per user
                    </div>
                    <div className="coupon-dates">
                      Valid: {new Date(coupon.valid_from).toLocaleDateString()} -{' '}
                      {coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString() : 'No expiration'}
                    </div>
                  </div>
                  <div className="coupon-actions">
                    <button
                      type="button"
                      className={coupon.is_active ? 'secondary' : 'primary'}
                      onClick={() => handleToggleCoupon(coupon.id, coupon.is_active)}
                    >
                      {coupon.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button type="button" className="secondary" onClick={() => handleDeleteCoupon(coupon.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
                    {invitation.promotion_description && <p>{invitation.promotion_description}</p>}
                    {(invitation.admin_discount_percentage != null || invitation.suggested_vendor_discount != null) && (
                      <div className="discount-breakdown">
                        {invitation.admin_discount_percentage != null && (
                          <div>Admin Contribution: {invitation.admin_discount_percentage}%</div>
                        )}
                        {invitation.suggested_vendor_discount != null && (
                          <div>Suggested Vendor Contribution: {invitation.suggested_vendor_discount}%</div>
                        )}
                        {invitation.admin_discount_percentage != null && invitation.suggested_vendor_discount != null && (
                          <div>Total Customer Discount: {Number(invitation.admin_discount_percentage) + Number(invitation.suggested_vendor_discount)}%</div>
                        )}
                      </div>
                    )}
                    {invitation.admin_message && (
                      <div className="invitation-message">
                        <strong>Message from Admin:</strong>
                        <p>{invitation.admin_message}</p>
                      </div>
                    )}
                  </div>
                  {invitation.invitation_status === 'pending' && (
                    <div className="invitation-actions">
                      <div className="vendor-discount-input">
                        <label htmlFor={`vendor-discount-${invitation.id}`}>Your Discount Contribution (%):</label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          defaultValue={invitation.suggested_vendor_discount}
                          id={`vendor-discount-${invitation.id}`}
                          className="form-input"
                        />
                      </div>
                      <div className="content-action-buttons">
                        <button
                          type="button"
                          className="primary"
                          onClick={() => {
                            const input = document.getElementById(`vendor-discount-${invitation.id}`);
                            respondToInvitation(invitation.id, 'accepted', input?.value);
                          }}
                        >
                          Accept Invitation
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => respondToInvitation(invitation.id, 'rejected')}
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

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Create New Coupon</h3>
            <form onSubmit={handleSubmitCoupon}>
              <div className="form-group">
                <label htmlFor="coupon-code">Coupon Code *</label>
                <input
                  id="coupon-code"
                  type="text"
                  className="form-input"
                  value={couponForm.code}
                  onChange={e => handleCouponFormChange('code', e.target.value.toUpperCase())}
                  placeholder="SAVE15"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="coupon-name">Coupon Name *</label>
                <input
                  id="coupon-name"
                  type="text"
                  className="form-input"
                  value={couponForm.name}
                  onChange={e => handleCouponFormChange('name', e.target.value)}
                  placeholder="e.g., 15% Off My Art"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="coupon-desc">Description</label>
                <textarea
                  id="coupon-desc"
                  className="form-textarea"
                  value={couponForm.description}
                  onChange={e => handleCouponFormChange('description', e.target.value)}
                  placeholder="Brief description of the coupon"
                  rows={3}
                />
              </div>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label htmlFor="coupon-discount-type">Discount Type *</label>
                  <select
                    id="coupon-discount-type"
                    className="form-select"
                    value={couponForm.discount_type}
                    onChange={e => handleCouponFormChange('discount_type', e.target.value)}
                    required
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount ($)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="coupon-discount-value">Discount Value *</label>
                  <input
                    id="coupon-discount-value"
                    type="number"
                    step="0.01"
                    min="0"
                    max={couponForm.discount_type === 'percentage' ? 100 : undefined}
                    className="form-input"
                    value={couponForm.discount_value}
                    onChange={e => handleCouponFormChange('discount_value', e.target.value)}
                    placeholder={couponForm.discount_type === 'percentage' ? '15' : '20.00'}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="coupon-application">Application Type *</label>
                <select
                  id="coupon-application"
                  className="form-select"
                  value={couponForm.application_type}
                  onChange={e => handleCouponFormChange('application_type', e.target.value)}
                  required
                >
                  <option value="coupon_code">Requires coupon code</option>
                  <option value="auto_apply">Auto-apply (no code needed)</option>
                </select>
              </div>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label htmlFor="coupon-valid-from">Valid From *</label>
                  <input
                    id="coupon-valid-from"
                    type="datetime-local"
                    className="form-input"
                    value={couponForm.valid_from}
                    onChange={e => handleCouponFormChange('valid_from', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="coupon-valid-until">Valid Until</label>
                  <input
                    id="coupon-valid-until"
                    type="datetime-local"
                    className="form-input"
                    value={couponForm.valid_until}
                    onChange={e => handleCouponFormChange('valid_until', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label htmlFor="coupon-min-order">Minimum Order Amount</label>
                  <input
                    id="coupon-min-order"
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    value={couponForm.min_order_amount}
                    onChange={e => handleCouponFormChange('min_order_amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="coupon-usage-per-user">Usage Limit Per User</label>
                  <input
                    id="coupon-usage-per-user"
                    type="number"
                    min="1"
                    className="form-input"
                    value={couponForm.usage_limit_per_user}
                    onChange={e => handleCouponFormChange('usage_limit_per_user', e.target.value)}
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="coupon-total-usage">Total Usage Limit</label>
                <input
                  id="coupon-total-usage"
                  type="number"
                  min="1"
                  className="form-input"
                  value={couponForm.total_usage_limit}
                  onChange={e => handleCouponFormChange('total_usage_limit', e.target.value)}
                  placeholder="Leave empty for unlimited"
                />
              </div>
              <p className="form-help-muted">
                <strong>3% Commission Rule:</strong> Products will be automatically excluded if the discount would reduce platform commission below 3%.
              </p>
              <div className="form-actions">
                <button type="button" className="secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary">
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
