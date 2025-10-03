import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../lib/csrf';
import { authApiRequest } from '../../../../lib/apiUtils';

const PaymentSettings = ({ userData }) => {
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
      
      const res = await authApiRequest('vendor/settings', {
        method: 'GET'
      });
      
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
      
      const res = await authenticatedApiRequest('vendor/stripe-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) {
        throw new Error('Failed to create Stripe account');
      }
      
      const data = await res.json();
      
      // Redirect to Stripe onboarding
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
      
      const res = await authenticatedApiRequest('vendor/stripe-onboarding', {
        method: 'GET'
      });
      
      if (!res.ok) {
        throw new Error('Failed to get onboarding link');
      }
      
      const data = await res.json();
      
      // Redirect to Stripe onboarding
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
      
      const res = await authenticatedApiRequest('vendor/subscription-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription_payment_method: useConnectBalance ? 'balance_first' : 'card_only',
          reverse_transfer_enabled: useConnectBalance
        })
      });
      
      if (!res.ok) {
        throw new Error('Failed to update preferences');
      }
      
      // Update local state
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
      return { status: 'no-account', label: 'Not Connected', color: '#6c757d' };
    }
    if (!vendorSettings?.stripe_account_verified) {
      return { status: 'pending', label: 'Setup Required', color: 'var(--warning-color)' };
    }
    return { status: 'verified', label: 'Connected & Verified', color: 'var(--success-color)' };
  };

  const renderAccountStatus = () => {
    const accountStatus = getAccountStatus();
    
    return (
      <div className="section-box">
        <h3>Account Status</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div 
            style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: accountStatus.color 
            }}
          ></div>
          <span style={{ fontWeight: '500', fontSize: '16px' }}>
            {accountStatus.label}
          </span>
        </div>
        
        {vendorSettings?.stripe_account_id && (
          <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '16px' }}>
            Account: {vendorSettings.stripe_account_id.substring(0, 12)}...
          </div>
        )}
      </div>
    );
  };

  const renderBalanceSection = () => {
    if (!vendorSettings?.stripe_account_verified) return null;
    
    return (
      <div className="section-box">
        <h3>Balance & Earnings</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div className="form-card">
            <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Available</div>
            <div style={{ fontSize: '20px', fontWeight: '600' }}>
              {formatCurrency(vendorSettings?.available_balance)}
            </div>
          </div>
          <div className="form-card">
            <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Pending</div>
            <div style={{ fontSize: '20px', fontWeight: '600' }}>
              {formatCurrency(vendorSettings?.pending_balance)}
            </div>
          </div>
        </div>
        
        <div style={{ padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '6px', borderLeft: '4px solid #2196f3' }}>
          <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Next Payout</div>
          <div style={{ fontSize: '14px' }}>
            {vendorSettings?.next_payout_date 
              ? `${formatDate(vendorSettings.next_payout_date)} • ${formatCurrency(vendorSettings.next_payout_amount)}`
              : 'No pending payouts'
            }
          </div>
        </div>
      </div>
    );
  };

  const renderPayoutSettings = () => {
    if (!vendorSettings?.stripe_account_verified) return null;
    
    return (
      <div className="section-box">
        <h3>Payout Settings</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Schedule</div>
            <div style={{ fontSize: '16px' }}>
              Every {vendorSettings?.payout_days || 15} days
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Commission Rate</div>
            <div style={{ fontSize: '16px' }}>
              {vendorSettings?.commission_rate || 15}%
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPaymentPreferences = () => {
    if (!vendorSettings?.stripe_account_verified) return null;
    
    const useConnectBalance = vendorSettings?.subscription_payment_method === 'balance_first';
    
    return (
      <div className="section-box">
        <h3>Payment Preferences</h3>
        <div className="form-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', opacity: updatingPreferences ? 0.6 : 1 }}>
            <input 
              type="checkbox"
              checked={useConnectBalance}
              onChange={(e) => handlePaymentPreferenceChange(e.target.checked)}
              disabled={updatingPreferences}
              style={{ marginTop: '2px', transform: 'scale(1.1)' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                Use Connect balance for subscriptions
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                {useConnectBalance 
                  ? 'Platform subscriptions will be paid from your Connect earnings first, then your card if needed.'
                  : 'Platform subscriptions will always be charged to your card.'
                }
              </div>
              {updatingPreferences && (
                <div style={{ fontSize: '12px', color: '#055474', marginTop: '4px' }}>
                  Updating preferences...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActionButtons = () => {
    const accountStatus = getAccountStatus();
    
    if (accountStatus.status === 'no-account') {
      return (
        <div className="section-box">
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '16px', marginBottom: '16px', color: '#6c757d' }}>
              Connect your Stripe account to start receiving payments from your sales and services.
            </div>
            <button 
              onClick={handleConnectStripe}
              disabled={actionLoading}
            >
              {actionLoading ? 'Connecting...' : 'Connect Stripe Account'}
            </button>
            <div style={{ fontSize: '12px', color: '#8d8d8d', marginTop: '12px' }}>
              This process takes 2-3 minutes
            </div>
          </div>
        </div>
      );
    }
    
    if (accountStatus.status === 'pending') {
      return (
        <div className="section-box">
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div className="warning-alert">
              Your Stripe account needs additional information to start processing payments.
            </div>
            <button 
              onClick={handleContinueSetup}
              disabled={actionLoading}
              style={{ backgroundColor: 'var(--warning-color)' }}
            >
              {actionLoading ? 'Loading...' : 'Continue Setup'}
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="section-box">
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button 
            onClick={handleContinueSetup}
            className="secondary"
          >
            Update Banking Info
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <a 
            href={`https://dashboard.stripe.com/express/accounts/${vendorSettings?.stripe_account_id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              fontSize: '11px', 
              color: '#8d8d8d', 
              textDecoration: 'none',
              borderBottom: '1px dotted #8d8d8d'
            }}
          >
            Click here to visit your stripe.com account
          </a>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: '16px', color: '#6c757d' }}>Loading payment settings...</div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{ 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          padding: '12px 16px', 
          borderRadius: '6px', 
          marginBottom: '24px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}
      
      {renderAccountStatus()}
      {renderBalanceSection()}
      {renderPayoutSettings()}
      {renderPaymentPreferences()}
      {renderActionButtons()}
    </div>
  );
};

export default PaymentSettings;
