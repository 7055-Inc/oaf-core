/**
 * Subscription Overview Component
 * 
 * Displays an overview of user subscriptions and addons.
 * Uses global styles from modules/styles/.
 */

import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../lib/apiUtils';
import SubscriptionCard from './SubscriptionCard';
import ConnectBalancePreference from './ConnectBalancePreference';

export default function SubscriptionOverview({ userData }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      
      // Load addons from v2 API
      let availableAddons = [];
      try {
        const addonsResponse = await authApiRequest('api/v2/websites/addons');
        if (addonsResponse.ok) {
          const addonsData = await addonsResponse.json();
          availableAddons = addonsData.addons || [];
        }
      } catch (err) {
        console.error('Error loading addons:', err);
      }
      
      // Build subscription list based on user type
      const subs = [];
      
      // Website subscription
      if (userData?.user_type === 'artist' || userData?.user_type === 'promoter' || userData?.user_type === 'admin') {
        subs.push({
          id: 'website',
          name: 'Website Subscription',
          description: 'Create and manage professional websites',
          type: 'subscription',
          monthlyFee: 14.99,
          isActive: userData?.permissions?.includes('sites') || false,
          badge: null
        });
      }
      
      // Shipping subscription for vendors
      if (userData?.user_type === 'artist' || userData?.user_type === 'admin') {
        subs.push({
          id: 'shipping',
          name: 'Shipping Labels',
          description: 'Pay-as-you-go shipping label creation',
          type: 'subscription',
          isPayAsYouGo: true,
          monthlyFee: 0,
          isActive: userData?.permissions?.includes('shipping') || false,
          badge: null
        });
      }
      
      // Artist Verification
      if (userData?.user_type === 'artist' || userData?.user_type === 'admin') {
        subs.push({
          id: 'verification',
          name: 'Artist Verification',
          description: 'Verified artist status and enhanced features',
          type: 'subscription',
          isAnnual: true,
          annualFee: 50,
          monthlyFee: 0,
          isActive: userData?.permissions?.includes('verified') || false,
          badge: null
        });
      }
      
      // Marketplace Seller
      if (userData?.user_type === 'artist' || userData?.user_type === 'admin') {
        subs.push({
          id: 'marketplace',
          name: 'Marketplace Seller',
          description: 'Sell on marketplace + FREE verified badge',
          type: 'subscription',
          monthlyFee: 0,
          isActive: userData?.permissions?.includes('marketplace') || false,
          badge: null
        });
      }

      // Map addons
      const addonItems = availableAddons.map(addon => ({
        id: `addon_${addon.id}`,
        addonId: addon.id,
        name: addon.addon_name || addon.name,
        type: 'addon',
        monthlyFee: parseFloat(addon.monthly_price) || 0,
        isActive: addon.user_already_has || false,
        description: addon.description || 'Add-on feature'
      }));

      setSubscriptions(subs);
      setAddons(addonItems);
    } catch (err) {
      console.error('Error loading subscriptions:', err);
      setError('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (item) => {
    // Handle addon subscription
    if (item.type === 'addon') {
      try {
        const response = await authApiRequest(`api/v2/websites/user-addons/${item.addonId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          alert('Addon activated successfully');
          loadSubscriptions();
        } else {
          const data = await response.json();
          alert(data.error || 'Failed to activate addon');
        }
      } catch (err) {
        alert('Failed to activate addon');
      }
      return;
    }

    // Navigate to appropriate dashboard page (each uses ChecklistController for tier/signup flow)
    switch (item.id) {
      case 'marketplace':
        window.location.href = '/dashboard/commerce/marketplace';
        break;
      case 'shipping':
        window.location.href = '/dashboard/commerce/shipping-labels';
        break;
      case 'website':
        window.location.href = '/dashboard/websites/subscription';
        break;
      case 'verification':
        window.location.href = '/dashboard/users/verified';
        break;
      default:
        break;
    }
  };

  const handleCancel = async (item) => {
    if (!confirm('Are you sure you want to cancel this?')) return;
    
    try {
      // Handle addon cancellation
      if (item.type === 'addon') {
        const response = await authApiRequest(`api/v2/websites/user-addons/${item.addonId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          alert('Addon deactivated successfully');
          loadSubscriptions();
        } else {
          const data = await response.json();
          alert(data.error || 'Failed to deactivate addon');
        }
        return;
      }

      // Handle subscription cancellation
      let endpoint;
      switch (item.id) {
        case 'shipping':
          endpoint = 'api/v2/commerce/subscriptions/shipping/cancel';
          break;
        case 'website':
          endpoint = 'api/v2/websites/subscription/cancel';
          break;
        default:
          alert('Cannot cancel this subscription from here');
          return;
      }
      
      const response = await authApiRequest(endpoint, { method: 'POST' });
      if (response.ok) {
        alert('Subscription cancelled successfully');
        loadSubscriptions();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to cancel subscription');
      }
    } catch (err) {
      alert('Failed to cancel');
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <span>Loading subscriptions...</span>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  const hasStripeConnect = userData?.permissions?.includes('stripe_connect');
  
  // Combine subscriptions and addons for display
  const allItems = [...subscriptions, ...addons];

  return (
    <div>
      <div className="form-card" style={{ marginBottom: '20px', padding: 0, overflow: 'hidden' }}>
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
        
        {allItems.length === 0 ? (
          <div style={{ padding: '20px' }}>No subscriptions available for your account type.</div>
        ) : (
          allItems.map((item, index) => (
            <div 
              key={item.id} 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: '2fr 1fr 1fr', 
                gap: '15px',
                padding: '15px',
                borderBottom: index < allItems.length - 1 ? '1px solid #dee2e6' : 'none',
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
                  : item.isPayAsYouGo
                    ? <>Free<div style={{ fontSize: '11px', color: '#6c757d', fontWeight: 'normal' }}>(Pay-as-you-go)</div></>
                    : (item.monthlyFee > 0 ? `$${item.monthlyFee.toFixed(2)}/mo` : 'Free')
                }
              </div>

              {/* Action Button */}
              <div style={{ textAlign: 'center', alignSelf: 'center' }}>
                {item.isActive ? (
                  <button
                    onClick={() => handleCancel(item)}
                    style={{ 
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      minWidth: '100px'
                    }}
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    className="secondary"
                    onClick={() => handleSubscribe(item)}
                    style={{ 
                      minWidth: '100px',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Subscribe Now
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Connect Balance Preference - only show for users with Stripe Connect */}
      {hasStripeConnect && (
        <ConnectBalancePreference 
          userData={userData} 
          onUpdate={loadSubscriptions}
        />
      )}
    </div>
  );
}
