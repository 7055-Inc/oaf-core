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
          monthlyPrice: data.hasSubscription ? 14.99 : 0, // Base price - would need API enhancement for actual plan
          features: ['Website Creation', 'Custom Domains', 'Site Management']
        };
      } else if (response.status === 404) {
        // API endpoint doesn't exist yet - check permissions instead
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
      // Fallback to permission check
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
          monthlyPrice: 0, // Pay-as-you-go
          features: ['Shipping Label Creation', 'Multiple Carriers', 'Tracking Updates']
        };
      }
    } catch (error) {
      console.error('Error loading shipping subscription:', error);
    }
    return null;
  };

  const loadVerificationSubscription = async () => {
    // Verification subscription - check via new universal flow API
    try {
      const response = await authApiRequest('api/subscriptions/verified/my');
      if (response.ok) {
        const data = await response.json();
        if (data.has_permission) {
          return {
            type: 'verification',
            status: data.subscription?.status || 'active',
            plan: 'Artist Verification',
            annualPrice: 50, // $50/year
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
    // Marketplace subscription - check via new universal flow API
    try {
      const response = await authApiRequest('api/subscriptions/verified/my');
      if (response.ok) {
        const data = await response.json();
        // Check if user has marketplace tier specifically
        if (data.subscription?.tier === 'Marketplace Seller' && data.has_permission) {
          return {
            type: 'marketplace',
            status: data.subscription?.status || 'active',
            plan: 'Marketplace Seller',
            monthlyPrice: 0, // Free
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
        // Handle both monthly and annual subscriptions
        if (sub.isAnnual && sub.annualPrice) {
          // Don't add annual fees to monthly total
          // They're billed separately
        } else {
          monthlyTotal += parseFloat(sub.monthlyPrice) || 0;
        }
      }
    });

    setSubscriptionStats({
      totalActive,
      monthlyTotal,
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Placeholder
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
      
      // Refresh data after action
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
      // Future implementation is now active:
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
          endpoint = 'subscriptions/verified/cancel'; // Same backend as verified
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
      
      // Refresh data
      await loadAllSubscriptions();
      
    } catch (error) {
      console.error('Error canceling subscription:', error);
      alert(`Failed to cancel subscription: ${error.message}`);
    }
  };

  const handleSubscribeToService = async (subscriptionType) => {
    // Open the appropriate subscription slide-in
    const slideInTypes = {
      'website': 'website-subscriptions',
      'shipping': 'shipping-labels-subscriptions',
      'verification': 'verified-subscriptions',
      'marketplace': 'marketplace-subscriptions'
    };
    
    const slideInType = slideInTypes[subscriptionType];
    if (slideInType) {
      // Trigger slide-in open event (parent dashboard will handle)
      window.dispatchEvent(new CustomEvent('openSlideIn', { 
        detail: { type: slideInType } 
      }));
    } else {
      alert(`Subscription activation for ${subscriptionType} coming soon!`);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #055474',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <p>Loading your subscriptions...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8d7da', 
          border: '1px solid #dc3545', 
          borderRadius: '4px', 
          marginBottom: '20px',
          color: '#721c24'
        }}>
          {error}
        </div>
      )}

      {/* Subscription & Addon Table */}
      <SubscriptionTable 
        subscriptions={subscriptions}
        userData={userData}
        onAction={handleSubscriptionAction}
        onRefresh={loadAllSubscriptions}
      />

      {/* Monthly Total */}
      <div style={{ 
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        textAlign: 'right'
      }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }}>
          Your current monthly subscription fee: ${subscriptionStats.monthlyTotal.toFixed(2)}
        </div>
      </div>

      {/* Connect Balance Preference */}
      {userData?.permissions?.includes('stripe_connect') && (
        <ConnectBalancePreference 
          userData={userData}
          onUpdate={loadAllSubscriptions}
        />
      )}

      {/* Billing Info */}
      <div style={{ 
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#e7f3ff',
        border: '1px solid #b8daff',
        borderRadius: '4px'
      }}>
        <div style={{ fontSize: '14px', color: '#004085' }}>
          <strong>ℹ️ Billing Information:</strong> All subscription renewals are charged as a lump-sum fee on or around the 20th of each month.
        </div>
      </div>
    </div>
  );
}

// Subscription & Addon Table Component
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
        console.warn('Addons API not available, using empty list');
        setAvailableAddons([]);
      }
    } catch (error) {
      console.error('Error loading addons:', error);
      setAvailableAddons([]);
    }
  };

  // Define all available subscriptions and addons
  const allSubscriptionsAndAddons = [
    // Core Subscriptions
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
      monthlyFee: 0, // Pay-as-you-go
      isActive: subscriptions.shipping?.status === 'active',
      description: 'Pay-as-you-go shipping label creation'
    },
    {
      id: 'verification',
      name: 'Artist Verification',
      type: 'subscription',
      annualFee: 50, // $50/year
      isAnnual: true,
      isActive: subscriptions.verification?.status === 'active',
      description: 'Verified artist status and enhanced features'
    },
    {
      id: 'marketplace',
      name: 'Marketplace Seller',
      type: 'subscription',
      monthlyFee: 0, // Free
      isActive: subscriptions.marketplace?.status === 'active',
      description: 'Sell on marketplace + FREE verified badge'
    },
    // Addons (loaded dynamically)
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
    <div style={{ marginBottom: '20px' }}>
      <div style={{ 
        border: '1px solid #dee2e6', 
        borderRadius: '4px', 
        overflow: 'hidden',
        backgroundColor: 'white'
      }}>
        {/* Table Header */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '2fr 1fr 1fr', 
          gap: '15px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #dee2e6',
          fontWeight: 'bold',
          color: '#495057'
        }}>
          <div>Subscription/Add-on</div>
          <div style={{ textAlign: 'center' }}>Monthly Fee</div>
          <div style={{ textAlign: 'center' }}>Action</div>
        </div>

        {/* Table Rows */}
        {allSubscriptionsAndAddons.map((item, index) => (
          <div key={item.id} style={{ 
            display: 'grid', 
            gridTemplateColumns: '2fr 1fr 1fr', 
            gap: '15px',
            padding: '15px',
            borderBottom: index < allSubscriptionsAndAddons.length - 1 ? '1px solid #dee2e6' : 'none',
            backgroundColor: item.isActive ? '#f8fff8' : 'white'
          }}>
            {/* Name & Description */}
    <div>
              <div style={{ 
                fontWeight: 'bold', 
                color: '#2c3e50',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {item.name}
                {item.isActive && (
                  <span style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '11px',
                    fontWeight: 'bold'
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
                    fontWeight: 'bold'
                  }}>
                    ADD-ON
                  </span>
                )}
              </div>
              <div style={{ fontSize: '13px', color: '#6c757d' }}>
                {item.description}
              </div>
            </div>

            {/* Monthly Fee */}
            <div style={{ 
              textAlign: 'center',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#055474',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '4px'
            }}>
              {(() => {
                if (item.isAnnual && item.annualFee) {
                  // Annual subscription
                  return (
                    <>
                      <div>${item.annualFee.toFixed(2)}/year</div>
                    </>
                  );
                }
                const fee = parseFloat(item.monthlyFee) || 0;
                return fee > 0 ? `$${fee.toFixed(2)}/mo` : 'Free';
              })()}
              {item.id === 'shipping' && (
                <div style={{ fontSize: '11px', color: '#6c757d' }}>
                  (Pay-as-you-go)
                </div>
              )}
            </div>

            {/* Action Button */}
            <div style={{ 
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {item.isActive ? (
                <button
                  onClick={() => handleActionClick(item, 'cancel')}
                  disabled={loading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  Cancel
                </button>
              ) : (
                <button
                  onClick={() => handleActionClick(item, 'subscribe')}
                  disabled={loading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  Subscribe Now
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Connect Balance Preference Component
function ConnectBalancePreference({ userData, onUpdate }) {
  const [preferConnectBalance, setPreferConnectBalance] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load current preference from shipping subscription (if exists)
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
        body: JSON.stringify({
          preferConnectBalance: checked
        })
      });

      if (response.ok) {
        setPreferConnectBalance(checked);
        onUpdate(); // Refresh parent data
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
    <div style={{ 
      marginTop: '20px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '4px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input
          type="checkbox"
          id="preferConnectBalance"
          checked={preferConnectBalance}
          onChange={(e) => handlePreferenceChange(e.target.checked)}
          disabled={loading}
          style={{ transform: 'scale(1.2)' }}
        />
        <label 
          htmlFor="preferConnectBalance" 
          style={{ 
            fontSize: '14px', 
            color: '#2c3e50',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          Use my Connect balance when available to pay subscription fees
        </label>
      </div>
      
      {error && (
        <div style={{ 
          marginTop: '8px',
          fontSize: '12px', 
          color: '#dc3545' 
        }}>
          {error}
        </div>
      )}
      
      <div style={{ 
        marginTop: '8px',
        fontSize: '12px', 
        color: '#6c757d' 
      }}>
        When enabled, we'll use your Connect earnings balance before charging your card for subscription fees.
      </div>
    </div>
  );
}
