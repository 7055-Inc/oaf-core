import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest, refreshAuthToken } from '../../../../lib/csrf';
import { authApiRequest } from '../../../../lib/apiUtils';
import MarketplacePricingTiers from './marketplace-components/MarketplacePricingTiers';

export default function MarketplaceSubscriptions({ userData }) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Module access state
  const [moduleState, setModuleState] = useState('loading'); // 'loading', 'dashboard', 'terms-required', 'signup'
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
      
      // Step 1: Check permission from JWT (source of truth)
      const hasMarketplacePermission = userData?.permissions?.includes('marketplace');
      


      if (hasMarketplacePermission) {
        // Step 2: User has permission - check if they've accepted latest marketplace terms
        try {
          const termsResponse = await authApiRequest('api/subscriptions/marketplace/terms-check');
          
          if (termsResponse.ok) {
            const termsData = await termsResponse.json();
            
            if (termsData.termsAccepted) {
              // All good - show dashboard
              setModuleState('dashboard');
              fetchMarketplaceData();
              fetchSubscriptionData();
            } else {
              // Need to accept new terms
              setModuleState('terms-required');
              setTermsData(termsData.latestTerms);
            }
          } else {
            // Terms check failed - default to dashboard (graceful degradation)
            setModuleState('dashboard');
            fetchMarketplaceData();
          }
        } catch (termsError) {
          // Terms endpoint might not exist yet - default to dashboard
          setModuleState('dashboard');
          fetchMarketplaceData();
        }
      } else {
        // Step 3: No permission - show signup workflow
        setModuleState('signup');
      }
      
    } catch (error) {
      console.error('Error checking marketplace access:', error);
      // Graceful fallback based on permission
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
      // Set marketplace permission based on JWT (already verified)
      setMarketplacePermission({ hasPermission: true });

      // Fetch real addon data from API (only user-level addons for marketplace)
      try {
        const addonsResponse = await authApiRequest('api/sites/addons');
        const addonsData = await addonsResponse.json();
        
        if (addonsData.success) {
          // Filter to only show user-level addons for marketplace
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
      // For now, set placeholder data
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
    // Callback for when subscription is successful
    // Force token refresh and reload to update permissions
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
        // Refresh marketplace data to update user_already_has status
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
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Loading your marketplace subscription...</div>
      </div>
    );
  }

  // Show marketplace dashboard if user has permission
  if (moduleState === 'dashboard') {
    return (
      <div style={{ padding: '20px' }}>
        {/* Marketplace Overview */}
        <div style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '2px', 
          marginBottom: '30px' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: '0', color: '#495057' }}>Marketplace Dashboard</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
          </div>

          <div style={{ 
            background: '#e7f3ff', 
            border: '1px solid #b8daff',
            borderRadius: '2px',
            padding: '15px',
            marginBottom: '20px'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#004085' }}>🎉 Welcome to the Marketplace!</h4>
            <p style={{ margin: '0', color: '#004085', fontSize: '14px' }}>
              Your marketplace subscription is active. You can now sell your products on our marketplaces. 
              Add wholesale pricing and other add-ons below to enhance your selling capabilities.
            </p>
          </div>


        </div>

        {/* Add-ons Management */}
        <div style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '2px', 
          marginBottom: '30px' 
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>Marketplace Add-ons</h3>
          
          {/* Available Add-ons */}
          <div>
            <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50', fontSize: '16px' }}>Available Add-ons</h4>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
              gap: '15px' 
            }}>
              {availableAddons.map(addon => (
                <div key={addon.id} style={{
                  background: 'white',
                  border: '1px solid #dee2e6',
                  borderRadius: '2px',
                  padding: '15px',
                  opacity: addon.user_already_has ? 0.7 : 1
                }}>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: 'bold', 
                    color: '#2c3e50',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
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
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#6c757d',
                    marginBottom: '8px',
                    minHeight: '40px'
                  }}>
                    {addon.description}
                    <span style={{ fontStyle: 'italic' }}>
                      {' '}- Works across all your websites and marketplace
                    </span>
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 'bold',
                    color: '#055474',
                    marginBottom: '12px'
                  }}>
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
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: addon.user_already_has ? '#6c757d' : '#055474',
                      color: 'white',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: addon.user_already_has ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    {addon.user_already_has ? 'Owned' : 'Add Add-on'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Information - Collapsible */}
        <div style={{ 
          background: '#f8f9fa', 
          borderRadius: '2px', 
          marginBottom: '20px',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ 
            padding: '15px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: showPaymentInfo ? '1px solid #dee2e6' : 'none'
          }}>
            <h3 style={{ margin: '0', color: '#495057', fontSize: '16px' }}>Payment Information</h3>
            <button
              onClick={() => setShowPaymentInfo(!showPaymentInfo)}
              style={{
                background: 'none',
                border: 'none',
                color: '#055474',
                cursor: 'pointer',
                fontSize: '14px',
                textDecoration: 'underline',
                padding: '0'
              }}
            >
              {showPaymentInfo ? 'Hide Payment Info' : 'Show Payment Info'}
            </button>
          </div>
          
          {showPaymentInfo && (
            <div style={{ 
              padding: '0 20px 20px 20px'
            }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'auto 1fr', 
                gap: '10px 20px',
                marginBottom: '15px',
                fontSize: '14px'
              }}>
                <div style={{ color: '#6c757d' }}>Payment Method:</div>
                <div style={{ color: '#2c3e50' }}>
                  Card on file required for add-ons
                </div>
                
                <div style={{ color: '#6c757d' }}>Status:</div>
                <div style={{ color: '#28a745' }}>
                  Active
                </div>
                
                <div style={{ color: '#6c757d' }}>Plan:</div>
                <div style={{ color: '#2c3e50' }}>
                  Marketplace (Free + Add-ons)
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => alert('Payment method management coming soon!')}
                  style={{
                    padding: '8px 16px',
                    background: '#055474',
                    color: 'white',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Add Payment Method
                </button>
              </div>
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

  // Fallback - should not reach here
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div>Loading...</div>
    </div>
  );
}
