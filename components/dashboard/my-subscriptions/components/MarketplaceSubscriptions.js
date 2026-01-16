import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest, refreshAuthToken } from '../../../../lib/csrf';
import { authApiRequest } from '../../../../lib/apiUtils';
import MarketplacePricingTiers from './marketplace-components/MarketplacePricingTiers';

export default function MarketplaceSubscriptions({ userData }) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Module access state
  const [moduleState, setModuleState] = useState('loading');
  const [termsData, setTermsData] = useState(null);
  const [signupTermsAccepted, setSignupTermsAccepted] = useState(false);

  // Payment info state
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [showUpdatePayment, setShowUpdatePayment] = useState(false);

  // Marketplace data state
  const [marketplacePermission, setMarketplacePermission] = useState(null);
  const [marketplaceStats, setMarketplaceStats] = useState(null);
  const [availableAddons, setAvailableAddons] = useState([]);
  const [userAddons, setUserAddons] = useState([]);

  useEffect(() => {
    checkModuleAccess();
  }, [userData]);

  const checkModuleAccess = async () => {
    try {
      setLoading(true);
      
      const hasMarketplacePermission = userData?.permissions?.includes('marketplace');

      if (hasMarketplacePermission) {
        try {
          const termsResponse = await authApiRequest('api/subscriptions/marketplace/terms-check');
          
          if (termsResponse.ok) {
            const termsData = await termsResponse.json();
            
            if (termsData.termsAccepted) {
              setModuleState('dashboard');
              fetchMarketplaceData();
              fetchSubscriptionData();
            } else {
              setModuleState('terms-required');
              setTermsData(termsData.latestTerms);
            }
          } else {
            setModuleState('dashboard');
            fetchMarketplaceData();
          }
        } catch (termsError) {
          setModuleState('dashboard');
          fetchMarketplaceData();
        }
      } else {
        setModuleState('signup');
      }
      
    } catch (error) {
      console.error('Error checking marketplace access:', error);
      const hasMarketplacePermission = userData?.permissions?.includes('marketplace');
      setModuleState(hasMarketplacePermission ? 'dashboard' : 'signup');
      if (hasMarketplacePermission) {
        fetchMarketplaceData();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketplaceData = async () => {
    try {
      setMarketplacePermission({ hasPermission: true });

      try {
        const addonsResponse = await authApiRequest('api/sites/addons');
        const addonsData = await addonsResponse.json();
        
        if (addonsData.success) {
          const userLevelAddons = addonsData.addons.filter(addon => addon.user_level === 1);
          setAvailableAddons(userLevelAddons);
        } else {
          console.error('Failed to fetch addons:', addonsData.error);
          setAvailableAddons([]);
        }
      } catch (addonsError) {
        console.error('Error fetching addons:', addonsError);
        setAvailableAddons([]);
      }
      
    } catch (error) {
      console.error('Error fetching marketplace data:', error);
    }
  };

  const fetchSubscriptionData = async () => {
    try {
      setSubscriptionData({
        status: 'active',
        cardLast4: 'None',
        planName: 'Marketplace (Free)'
      });
    } catch (error) {
      console.error('Error fetching marketplace subscription data:', error);
    }
  };

  const handleSubscriptionSuccess = () => {
    refreshAuthToken().then(() => {
      window.location.reload();
    });
  };

  const handleAddonPurchase = async (addon) => {
    try {
      setProcessing(true);
      
      const response = await authenticatedApiRequest(`api/sites/user-addons/${addon.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        await fetchMarketplaceData();
        alert('Add-on activated successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to activate add-on: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error activating add-on:', error);
      alert('Error activating add-on. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" style={{ width: '24px', height: '24px' }}></div>
        <span>Loading your marketplace subscription...</span>
      </div>
    );
  }

  // Show marketplace dashboard if user has permission
  if (moduleState === 'dashboard') {
    return (
      <div>
        {/* Marketplace Overview */}
        <div className="form-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Marketplace Dashboard</h3>
            <span style={{
              padding: '4px 8px',
              background: '#28a745',
              color: 'white',
              borderRadius: '2px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              Active
            </span>
          </div>

          <div className="success-alert" style={{ marginBottom: 0 }}>
            <h4 style={{ margin: '0 0 8px 0' }}>🎉 Welcome to the Marketplace!</h4>
            <p style={{ margin: 0, fontSize: '14px' }}>
              Your marketplace subscription is active. You can now sell your products on our marketplaces. 
              Add wholesale pricing and other add-ons below to enhance your selling capabilities.
            </p>
          </div>
        </div>

        {/* Add-ons Management */}
        <div className="form-card">
          <h3 style={{ margin: '0 0 15px 0' }}>Marketplace Add-ons</h3>
          
          <h4 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Available Add-ons</h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
            gap: '15px' 
          }}>
            {availableAddons.map(addon => (
              <div 
                key={addon.id} 
                className="form-card"
                style={{
                  margin: 0,
                  opacity: addon.user_already_has ? 0.7 : 1
                }}
              >
                <div style={{ 
                  fontWeight: 'bold', 
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  {addon.addon_name || addon.name}
                  <span style={{
                    background: '#e3f2fd',
                    color: '#1976d2',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    USER-WIDE
                  </span>
                  {addon.user_already_has && (
                    <span style={{
                      background: '#e8f5e8',
                      color: '#2e7d32',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>
                      OWNED
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '8px', minHeight: '40px' }}>
                  {addon.description}
                  <span style={{ fontStyle: 'italic' }}>
                    {' '}- Works across all your websites and marketplace
                  </span>
                </div>
                <div style={{ fontWeight: 'bold', color: 'var(--primary-color)', marginBottom: '12px' }}>
                  {addon.user_already_has ? (
                    <span style={{ color: '#2e7d32' }}>✓ Owned</span>
                  ) : (
                    `$${addon.monthly_price}/month`
                  )}
                </div>
                <button
                  onClick={() => addon.user_already_has ? 
                    alert('You already own this add-on!') : 
                    handleAddonPurchase(addon)
                  }
                  disabled={addon.user_already_has || processing}
                  className={addon.user_already_has ? '' : 'secondary'}
                  style={{
                    width: '100%',
                    opacity: addon.user_already_has ? 0.6 : 1,
                    cursor: addon.user_already_has ? 'not-allowed' : 'pointer'
                  }}
                >
                  {addon.user_already_has ? 'Owned' : 'Add Add-on'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Information - Collapsible */}
        <div className="form-card" style={{ padding: 0 }}>
          <div style={{ 
            padding: '15px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: showPaymentInfo ? '1px solid #dee2e6' : 'none'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Payment Information</h3>
            <button
              onClick={() => setShowPaymentInfo(!showPaymentInfo)}
              className="secondary"
              style={{ padding: '6px 12px', fontSize: '13px' }}
            >
              {showPaymentInfo ? 'Hide' : 'Show'}
            </button>
          </div>
          
          {showPaymentInfo && (
            <div style={{ padding: '15px', paddingTop: 0 }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'auto 1fr', 
                gap: '10px 20px',
                marginBottom: '15px',
                fontSize: '14px'
              }}>
                <div style={{ color: '#6c757d' }}>Payment Method:</div>
                <div>Card on file required for add-ons</div>
                
                <div style={{ color: '#6c757d' }}>Status:</div>
                <div style={{ color: '#28a745' }}>Active</div>
                
                <div style={{ color: '#6c757d' }}>Plan:</div>
                <div>Marketplace (Free + Add-ons)</div>
              </div>

              <button onClick={() => alert('Payment method management coming soon!')}>
                Add Payment Method
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show pricing tiers if no permission (signup workflow)
  if (moduleState === 'signup') {
    return (
      <MarketplacePricingTiers 
        userData={userData} 
        onSubscriptionSuccess={handleSubscriptionSuccess}
      />
    );
  }

  // Fallback
  return (
    <div className="loading-state">
      <span>Loading...</span>
    </div>
  );
}
