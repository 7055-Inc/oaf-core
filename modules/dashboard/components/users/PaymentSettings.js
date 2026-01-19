/**
 * Payment Settings Component
 * 
 * Manages Stripe Connect account, balance, payouts, and payment preferences.
 * Uses global CSS classes from global.css
 */

import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';

const PaymentSettings = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vendorSettings, setVendorSettings] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [updatingPreferences, setUpdatingPreferences] = useState(false);

  useEffect(() => {
    fetchVendorSettings();
  }, []);

  const fetchVendorSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await authApiRequest('vendor/settings', { method: 'GET' });
      
      if (!res.ok) {
        throw new Error('Failed to fetch payment settings');
      }
      
      const data = await res.json();
      setVendorSettings(data.settings);
    } catch (err) {
      setError('Unable to load payment settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    try {
      setActionLoading(true);
      setError(null);
      
      const res = await authApiRequest('vendor/stripe-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) {
        throw new Error('Failed to create Stripe account');
      }
      
      const data = await res.json();
      window.location.href = data.stripe_account.onboarding_url;
    } catch (err) {
      setError('Unable to connect Stripe account. Please try again.');
      setActionLoading(false);
    }
  };

  const handleContinueSetup = async () => {
    try {
      setActionLoading(true);
      setError(null);
      
      const res = await authApiRequest('vendor/stripe-onboarding', { method: 'GET' });
      
      if (!res.ok) {
        throw new Error('Failed to get onboarding link');
      }
      
      const data = await res.json();
      window.location.href = data.onboarding_url;
    } catch (err) {
      setError('Unable to continue setup. Please try again.');
      setActionLoading(false);
    }
  };

  const handlePaymentPreferenceChange = async (useConnectBalance) => {
    try {
      setUpdatingPreferences(true);
      setError(null);
      
      const res = await authApiRequest('vendor/subscription-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_payment_method: useConnectBalance ? 'balance_first' : 'card_only',
          reverse_transfer_enabled: useConnectBalance
        })
      });
      
      if (!res.ok) {
        throw new Error('Failed to update preferences');
      }
      
      setVendorSettings(prev => ({
        ...prev,
        subscription_payment_method: useConnectBalance ? 'balance_first' : 'card_only',
        reverse_transfer_enabled: useConnectBalance
      }));
      
    } catch (err) {
      setError('Unable to update payment preferences. Please try again.');
    } finally {
      setUpdatingPreferences(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getAccountStatus = () => {
    if (!vendorSettings?.stripe_account_id) {
      return { status: 'no-account', label: 'Not Connected', className: 'disconnected', icon: 'fa-circle-xmark' };
    }
    if (!vendorSettings?.stripe_account_verified) {
      return { status: 'pending', label: 'Setup Required', className: 'inactive', icon: 'fa-circle-exclamation' };
    }
    return { status: 'verified', label: 'Connected & Verified', className: 'connected', icon: 'fa-circle-check' };
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading payment settings...</p>
      </div>
    );
  }

  const accountStatus = getAccountStatus();

  return (
    <div>
      {error && (
        <div className="error-alert">
          <i className="fa-solid fa-circle-exclamation"></i>
          {error}
        </div>
      )}
      
      {/* Account Status */}
      <div className="form-card">
        <h3>Account Status</h3>
        <div className={`status-indicator ${accountStatus.className}`} style={{ marginTop: '16px' }}>
          <i className={`fa-solid ${accountStatus.icon}`}></i>
          <span>{accountStatus.label}</span>
        </div>
        
        {vendorSettings?.stripe_account_id && (
          <p style={{ marginTop: '12px', fontSize: '13px', color: '#6b7280' }}>
            Account: <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>
              {vendorSettings.stripe_account_id.substring(0, 12)}...
            </code>
          </p>
        )}
      </div>

      {/* Balance & Earnings */}
      {vendorSettings?.stripe_account_verified && (
        <div className="form-card">
          <h3>Balance & Earnings</h3>
          <div className="form-grid-2">
            <div style={{ textAlign: 'center', padding: '24px', background: '#f0fdf4', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available</p>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: '600', color: '#059669' }}>
                {formatCurrency(vendorSettings?.available_balance)}
              </p>
            </div>
            <div style={{ textAlign: 'center', padding: '24px', background: '#fffbeb', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending</p>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: '600', color: '#d97706' }}>
                {formatCurrency(vendorSettings?.pending_balance)}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '20px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
            <i className="fa-solid fa-calendar-check" style={{ fontSize: '24px', color: 'var(--primary-color)' }}></i>
            <div>
              <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Next Payout</p>
              <p style={{ margin: 0, fontWeight: '500' }}>
                {vendorSettings?.next_payout_date 
                  ? `${formatDate(vendorSettings.next_payout_date)} • ${formatCurrency(vendorSettings.next_payout_amount)}`
                  : 'No pending payouts'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payout Settings */}
      {vendorSettings?.stripe_account_verified && (
        <div className="form-card">
          <h3>Payout Settings</h3>
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">Schedule</span>
              <span className="stat-value">Every {vendorSettings?.payout_days || 15} days</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Commission Rate</span>
              <span className="stat-value">{vendorSettings?.commission_rate || 15}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Payment Preferences */}
      {vendorSettings?.stripe_account_verified && (
        <div className="form-card">
          <h3>Payment Preferences</h3>
          <label className="toggle-slider-container" style={{ marginTop: '12px' }}>
            <input
              type="checkbox"
              className="toggle-slider-input"
              checked={vendorSettings?.subscription_payment_method === 'balance_first'}
              onChange={(e) => handlePaymentPreferenceChange(e.target.checked)}
              disabled={updatingPreferences}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">Use Connect balance for subscriptions</span>
          </label>
          <p className="form-help" style={{ marginTop: '8px' }}>
            {vendorSettings?.subscription_payment_method === 'balance_first'
              ? 'Platform subscriptions will be paid from your Connect earnings first, then your card if needed.'
              : 'Platform subscriptions will always be charged to your card.'
            }
          </p>
          {updatingPreferences && (
            <p style={{ fontSize: '13px', color: 'var(--primary-color)', marginTop: '8px' }}>
              <i className="fa-solid fa-spinner fa-spin"></i> Updating preferences...
            </p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {accountStatus.status === 'no-account' && (
        <div className="form-card" style={{ textAlign: 'center', padding: '40px 28px' }}>
          <i className="fa-brands fa-stripe" style={{ fontSize: '48px', color: '#635bff', marginBottom: '16px', display: 'block' }}></i>
          <p style={{ margin: '0 0 20px', color: '#6b7280' }}>
            Connect your Stripe account to start receiving payments from your sales and services.
          </p>
          <button onClick={handleConnectStripe} disabled={actionLoading} className="large">
            {actionLoading ? (
              <><i className="fa-solid fa-spinner fa-spin"></i> Connecting...</>
            ) : (
              <><i className="fa-solid fa-link"></i> Connect Stripe Account</>
            )}
          </button>
          <p style={{ marginTop: '12px', fontSize: '12px', color: '#9ca3af' }}>This process takes 2-3 minutes</p>
        </div>
      )}
      
      {accountStatus.status === 'pending' && (
        <div className="form-card">
          <div className="warning-alert">
            <i className="fa-solid fa-triangle-exclamation"></i>
            Your Stripe account needs additional information to start processing payments.
          </div>
          <button onClick={handleContinueSetup} disabled={actionLoading} className="warning" style={{ width: '100%', marginTop: '16px' }}>
            {actionLoading ? (
              <><i className="fa-solid fa-spinner fa-spin"></i> Loading...</>
            ) : (
              <><i className="fa-solid fa-arrow-right"></i> Continue Setup</>
            )}
          </button>
        </div>
      )}
      
      {accountStatus.status === 'verified' && (
        <div className="form-card">
          <div className="quick-links">
            <button onClick={handleContinueSetup} className="secondary">
              <i className="fa-solid fa-building-columns"></i> Update Banking Info
            </button>
            <a 
              href={`https://dashboard.stripe.com/express/accounts/${vendorSettings?.stripe_account_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="secondary"
            >
              <i className="fa-solid fa-external-link"></i> View Stripe Dashboard
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSettings;
