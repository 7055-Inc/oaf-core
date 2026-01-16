import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';
import { refreshAuthToken } from '../../../../lib/csrf';

export default function ManageSubscriptions({ userData }) {
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState({
    website: null,
    shipping: null,
    verification: null,
    marketplace: null
  });
  const [subscriptionStats, setSubscriptionStats] = useState({
    totalActive: 0,
    monthlyTotal: 0,
    nextBillingDate: null
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userData) {
      loadAllSubscriptions();
    }
  }, [userData]);

  const loadAllSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all subscription types in parallel
      const [websiteData, shippingData, verificationData, marketplaceData] = await Promise.allSettled([
        loadWebsiteSubscription(),
        loadShippingSubscription(),
        loadVerificationSubscription(),
        loadMarketplaceSubscription()
      ]);

      // Process results
      const subscriptionData = {
        website: websiteData.status === 'fulfilled' ? websiteData.value : null,
        shipping: shippingData.status === 'fulfilled' ? shippingData.value : null,
        verification: verificationData.status === 'fulfilled' ? verificationData.value : null,
        marketplace: marketplaceData.status === 'fulfilled' ? marketplaceData.value : null
      };

      setSubscriptions(subscriptionData);
      calculateSubscriptionStats(subscriptionData);

    } catch (error) {
      console.error('Error loading subscriptions:', error);
      setError('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const loadWebsiteSubscription = async () => {
    try {
      const response = await authApiRequest('api/subscriptions/sites/status');
      if (response.ok) {
        const data = await response.json();
        return {
          type: 'website',
          status: data.hasSubscription ? 'active' : 'inactive',
          sitesCount: data.sitesCount || 0,
          plan: data.hasSubscription ? 'Website Subscription' : null,
          monthlyPrice: data.hasSubscription ? 14.99 : 0,
          features: ['Website Creation', 'Custom Domains', 'Site Management']
        };
      } else if (response.status === 404) {
        const hasSites = userData?.permissions?.includes('sites');
        return {
          type: 'website',
          status: hasSites ? 'active' : 'inactive',
          sitesCount: 0,
          plan: hasSites ? 'Website Subscription' : null,
          monthlyPrice: hasSites ? 14.99 : 0,
          features: ['Website Creation', 'Custom Domains', 'Site Management']
        };
      }
    } catch (error) {
      console.error('Error loading website subscription:', error);
      const hasSites = userData?.permissions?.includes('sites');
      return {
        type: 'website',
        status: hasSites ? 'active' : 'inactive',
        sitesCount: 0,
        plan: hasSites ? 'Website Subscription' : null,
        monthlyPrice: hasSites ? 14.99 : 0,
        features: ['Website Creation', 'Custom Domains', 'Site Management']
      };
    }
    return null;
  };

  const loadShippingSubscription = async () => {
    try {
      const response = await authApiRequest('api/subscriptions/shipping/my');
      if (response.ok) {
        const data = await response.json();
        return {
          type: 'shipping',
          status: data.subscription?.status || 'inactive',
          cardLast4: data.subscription?.cardLast4,
          preferConnectBalance: data.subscription?.preferConnectBalance,
          plan: 'Shipping Labels (Pay-as-you-go)',
          monthlyPrice: 0,
          features: ['Shipping Label Creation', 'Multiple Carriers', 'Tracking Updates']
        };
      }
    } catch (error) {
      console.error('Error loading shipping subscription:', error);
    }
    return null;
  };

  const loadVerificationSubscription = async () => {
    try {
      const response = await authApiRequest('api/subscriptions/verified/my');
      if (response.ok) {
        const data = await response.json();
        if (data.has_permission) {
          return {
            type: 'verification',
            status: data.subscription?.status || 'active',
            plan: 'Artist Verification',
            annualPrice: 50,
            isAnnual: true,
            features: ['Verified Badge', 'Enhanced Profile', 'Priority Support']
          };
        }
      }
    } catch (error) {
      console.error('Error loading verification subscription:', error);
    }
    return null;
  };

  const loadMarketplaceSubscription = async () => {
    try {
      const response = await authApiRequest('api/subscriptions/verified/my');
      if (response.ok) {
        const data = await response.json();
        if (data.subscription?.tier === 'Marketplace Seller' && data.has_permission) {
          return {
            type: 'marketplace',
            status: data.subscription?.status || 'active',
            plan: 'Marketplace Seller',
            monthlyPrice: 0,
            features: ['Sell on Marketplace', 'FREE Verified Badge', 'Commission-based']
          };
        }
      }
    } catch (error) {
      console.error('Error loading marketplace subscription:', error);
    }
    return null;
  };

  const calculateSubscriptionStats = (subscriptionData) => {
    let totalActive = 0;
    let monthlyTotal = 0;

    Object.values(subscriptionData).forEach(sub => {
      if (sub && sub.status === 'active') {
        totalActive++;
        if (sub.isAnnual && sub.annualPrice) {
          // Don't add annual fees to monthly total
        } else {
          monthlyTotal += parseFloat(sub.monthlyPrice) || 0;
        }
      }
    });

    setSubscriptionStats({
      totalActive,
      monthlyTotal,
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
  };

  const handleSubscriptionAction = async (subscriptionType, action) => {
    try {
      setError(null);
      
      switch (action) {
        case 'cancel':
          await handleCancelSubscription(subscriptionType);
          break;
        case 'subscribe':
          await handleSubscribeToService(subscriptionType);
          break;
        default:
          console.warn('Unknown action:', action);
      }
      
      await loadAllSubscriptions();
      
    } catch (error) {
      console.error(`Error with ${action} for ${subscriptionType}:`, error);
      setError(`Failed to ${action} subscription: ${error.message}`);
    }
  };

  const handleCancelSubscription = async (subscriptionType) => {
    const confirmMessage = `Are you sure you want to cancel your ${subscriptionType} subscription?\n\n` +
      `Note: You'll keep access until the end of your current billing period, but your subscription won't renew.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      let endpoint;
      switch (subscriptionType) {
        case 'website':
          endpoint = 'subscriptions/websites/cancel';
          break;
        case 'shipping':
          endpoint = 'subscriptions/shipping/cancel';
          break;
        case 'verified':
          endpoint = 'subscriptions/verified/cancel';
          break;
        case 'marketplace':
          endpoint = 'subscriptions/verified/cancel';
          break;
        default:
          throw new Error(`Cancellation not implemented for ${subscriptionType}`);
      }

      const response = await authApiRequest(endpoint, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Cancellation failed');
      }

      const result = await response.json();
      alert(`Subscription canceled successfully.\n\n${result.note || result.message}`);
      
      await loadAllSubscriptions();
      
    } catch (error) {
      console.error('Error canceling subscription:', error);
      alert(`Failed to cancel subscription: ${error.message}`);
    }
  };

  const handleSubscribeToService = async (subscriptionType) => {
    const slideInTypes = {
      'website': 'website-subscriptions',
      'shipping': 'shipping-labels-subscriptions',
      'verification': 'verified-subscriptions',
      'marketplace': 'marketplace-subscriptions'
    };
    
    const slideInType = slideInTypes[subscriptionType];
    if (slideInType) {
      window.dispatchEvent(new CustomEvent('dashboard-open-slide-in', { 
        detail: { type: slideInType, title: `${subscriptionType.charAt(0).toUpperCase() + subscriptionType.slice(1)} Subscription` } 
      }));
    } else {
      alert(`Subscription activation for ${subscriptionType} coming soon!`);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" style={{ width: '24px', height: '24px' }}></div>
        <span>Loading your subscriptions...</span>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="error-alert">{error}</div>}

      {/* Subscription Table */}
      <SubscriptionTable 
        subscriptions={subscriptions}
        userData={userData}
        onAction={handleSubscriptionAction}
        onRefresh={loadAllSubscriptions}
      />

      {/* Monthly Total */}
      <div className="form-card" style={{ textAlign: 'right' }}>
        <strong style={{ fontSize: '18px' }}>
          Your current monthly subscription fee: ${subscriptionStats.monthlyTotal.toFixed(2)}
        </strong>
      </div>

      {/* Connect Balance Preference */}
      {userData?.permissions?.includes('stripe_connect') && (
        <ConnectBalancePreference 
          userData={userData}
          onUpdate={loadAllSubscriptions}
        />
      )}

      {/* Billing Info */}
      <div className="form-card" style={{ backgroundColor: '#e7f3ff', borderColor: '#b8daff' }}>
        <strong>ℹ️ Billing Information:</strong> All subscription renewals are charged as a lump-sum fee on or around the 20th of each month.
      </div>
    </div>
  );
}

// Subscription Table Component
function SubscriptionTable({ subscriptions, userData, onAction, onRefresh }) {
  const [availableAddons, setAvailableAddons] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAvailableAddons();
  }, []);

  const loadAvailableAddons = async () => {
    try {
      const response = await authApiRequest('api/sites/addons');
      if (response.ok) {
        const data = await response.json();
        setAvailableAddons(data.addons || []);
      } else {
        setAvailableAddons([]);
      }
    } catch (error) {
      console.error('Error loading addons:', error);
      setAvailableAddons([]);
    }
  };

  const allSubscriptionsAndAddons = [
    {
      id: 'website',
      name: 'Website Subscription',
      type: 'subscription',
      monthlyFee: 14.99,
      isActive: subscriptions.website?.status === 'active',
      description: 'Create and manage professional websites'
    },
    {
      id: 'shipping',
      name: 'Shipping Labels',
      type: 'subscription',
      monthlyFee: 0,
      isActive: subscriptions.shipping?.status === 'active',
      description: 'Pay-as-you-go shipping label creation'
    },
    {
      id: 'verification',
      name: 'Artist Verification',
      type: 'subscription',
      annualFee: 50,
      isAnnual: true,
      isActive: subscriptions.verification?.status === 'active',
      description: 'Verified artist status and enhanced features'
    },
    {
      id: 'marketplace',
      name: 'Marketplace Seller',
      type: 'subscription',
      monthlyFee: 0,
      isActive: subscriptions.marketplace?.status === 'active',
      description: 'Sell on marketplace + FREE verified badge'
    },
    ...availableAddons.map(addon => ({
      id: `addon_${addon.id}`,
      name: addon.addon_name || addon.name,
      type: 'addon',
      monthlyFee: parseFloat(addon.monthly_price) || 0,
      isActive: addon.user_already_has || false,
      description: addon.description || 'Add-on feature'
    }))
  ];

  const handleActionClick = async (item, action) => {
    setLoading(true);
    try {
      if (item.type === 'subscription') {
        await onAction(item.id, action);
      } else if (item.type === 'addon') {
        await handleAddonAction(item, action);
      }
      await onRefresh();
    } catch (error) {
      console.error(`Error with ${action}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddonAction = async (addon, action) => {
    const addonId = addon.id.replace('addon_', '');
    
    if (action === 'subscribe') {
      const response = await authApiRequest(`api/sites/user-addons/${addonId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to activate addon');
      }
    } else if (action === 'cancel') {
      const response = await authApiRequest(`api/sites/user-addons/${addonId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deactivate addon');
      }
    }
  };

  return (
    <div className="form-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Table Header */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '2fr 1fr 1fr', 
        gap: '15px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #dee2e6',
        fontWeight: 'bold'
      }}>
        <div>Subscription/Add-on</div>
        <div style={{ textAlign: 'center' }}>Fee</div>
        <div style={{ textAlign: 'center' }}>Action</div>
      </div>

      {/* Table Rows */}
      {allSubscriptionsAndAddons.map((item, index) => (
        <div 
          key={item.id} 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: '2fr 1fr 1fr', 
            gap: '15px',
            padding: '15px',
            borderBottom: index < allSubscriptionsAndAddons.length - 1 ? '1px solid #dee2e6' : 'none',
            backgroundColor: item.isActive ? '#f0fff0' : 'white'
          }}
        >
          {/* Name & Description */}
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {item.name}
              {item.isActive && (
                <span style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  marginLeft: '8px'
                }}>
                  ACTIVE
                </span>
              )}
              {item.type === 'addon' && (
                <span style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  marginLeft: '8px'
                }}>
                  ADD-ON
                </span>
              )}
            </div>
            <div style={{ fontSize: '13px', color: '#6c757d' }}>
              {item.description}
            </div>
          </div>

          {/* Fee */}
          <div style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--primary-color)', alignSelf: 'center' }}>
            {item.isAnnual && item.annualFee 
              ? `$${item.annualFee.toFixed(2)}/year`
              : (item.monthlyFee > 0 ? `$${item.monthlyFee.toFixed(2)}/mo` : 'Free')
            }
            {item.id === 'shipping' && (
              <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: 'normal' }}>
                (Pay-as-you-go)
              </div>
            )}
          </div>

          {/* Action Button */}
          <div style={{ textAlign: 'center', alignSelf: 'center' }}>
            {item.isActive ? (
              <button
                onClick={() => handleActionClick(item, 'cancel')}
                disabled={loading}
                style={{ 
                  background: '#dc3545',
                  opacity: loading ? 0.6 : 1 
                }}
              >
                Cancel
              </button>
            ) : (
              <button
                className="secondary"
                onClick={() => handleActionClick(item, 'subscribe')}
                disabled={loading}
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                Subscribe Now
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Connect Balance Preference Component
function ConnectBalancePreference({ userData, onUpdate }) {
  const [preferConnectBalance, setPreferConnectBalance] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCurrentPreference();
  }, []);

  const loadCurrentPreference = async () => {
    try {
      const response = await authApiRequest('api/subscriptions/shipping/my');
      if (response.ok) {
        const data = await response.json();
        setPreferConnectBalance(data.subscription?.preferConnectBalance || false);
      }
    } catch (error) {
      console.error('Error loading Connect balance preference:', error);
    }
  };

  const handlePreferenceChange = async (checked) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authApiRequest('api/subscriptions/shipping/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferConnectBalance: checked })
      });

      if (response.ok) {
        setPreferConnectBalance(checked);
        onUpdate();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update preference');
      }
    } catch (error) {
      setError(error.message);
      console.error('Error updating Connect balance preference:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input
          type="checkbox"
          id="preferConnectBalance"
          checked={preferConnectBalance}
          onChange={(e) => handlePreferenceChange(e.target.checked)}
          disabled={loading}
          style={{ width: 'auto' }}
        />
        <label 
          htmlFor="preferConnectBalance" 
          style={{ 
            margin: 0,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          Use my Connect balance when available to pay subscription fees
        </label>
      </div>
      
      {error && <div style={{ marginTop: '8px', fontSize: '12px', color: '#dc3545' }}>{error}</div>}
      
      <div style={{ marginTop: '8px', fontSize: '12px', color: '#6c757d' }}>
        When enabled, we'll use your Connect earnings balance before charging your card for subscription fees.
      </div>
    </div>
  );
}
