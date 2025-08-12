import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest, refreshAuthToken } from '../../../../lib/csrf';
import StripeCardSetup from '../../../stripe/StripeCardSetup';

export default function WebSiteSubscriptions({ userData }) {
  const [loading, setLoading] = useState(true);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [userSites, setUserSites] = useState([]);
  
  // Enhanced signup state
  const [availableAddons, setAvailableAddons] = useState([]);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [signupTermsAccepted, setSignupTermsAccepted] = useState(false);
  const [setupIntent, setSetupIntent] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [signupStep, setSignupStep] = useState('plan'); // 'plan', 'addons', 'payment', 'terms'

  // Module access state
  const [moduleState, setModuleState] = useState('loading'); // 'loading', 'dashboard', 'terms-required', 'signup'
  const [termsData, setTermsData] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    checkModuleAccess();
  }, [userData]);

  const checkModuleAccess = async () => {
    try {
      setLoading(true);
      
      // Step 1: Check permission from JWT (source of truth)
      const hasSitesPermission = userData?.permissions?.includes('sites');
      
      if (hasSitesPermission) {
        // Step 2: User has permission - check if they've accepted latest site terms
        const termsResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/subscriptions/sites/terms-check');
        
        if (termsResponse.ok) {
          const termsData = await termsResponse.json();
          
          if (termsData.termsAccepted) {
            // All good - show dashboard
            setModuleState('dashboard');
            fetchUserSites();
          } else {
            // Need to accept new terms
            setModuleState('terms-required');
            setTermsData(termsData.latestTerms);
          }
        } else {
          // Terms check failed - default to dashboard (graceful degradation)
          setModuleState('dashboard');
          fetchUserSites();
        }
      } else {
        // Step 3: No permission - show signup workflow
        setModuleState('signup');
      }
      
    } catch (error) {
      console.error('Error checking module access:', error);
      // Graceful fallback based on permission
      const hasSitesPermission = userData?.permissions?.includes('sites');
      setModuleState(hasSitesPermission ? 'dashboard' : 'signup');
      if (hasSitesPermission) {
        fetchUserSites();
      }
    } finally {
      setLoading(false);
    }
  };



  const fetchUserSites = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/subscriptions/sites/my-sites');
      const data = await response.json();
      
      if (data.success) {
        setUserSites(data.sites);
        setLoading(false);
      } else {
        console.error('Failed to fetch sites:', data.error);
        setUserSites([]);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
      setUserSites([]);
      setLoading(false);
    }
  };

  const handleSignupClick = (tierName) => {
    setSelectedTier(tierName);
    setSelectedAddons([]);
    setSignupTermsAccepted(false);
    setSignupStep('plan');
    
    // Fetch addons if Business or Promoter plan
    if (tierName === 'Business Plan' || tierName === 'Promoter Plan') {
      fetchAvailableAddons();
    }
    
    setShowSignupModal(true);
  };

  const fetchAvailableAddons = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/sites/addons');
      const data = await response.json();
      
      if (data.success) {
        setAvailableAddons(data.addons);
      } else {
        console.error('Failed to fetch addons:', data.error);
        setAvailableAddons([]);
      }
    } catch (error) {
      console.error('Error fetching addons:', error);
      setAvailableAddons([]);
    }
  };

  const calculateTotalPrice = () => {
    const basePrices = {
      'Starter Plan': 14.99,
      'Professional Plan': 24.95,
      'Business Plan': 49.95,
      'Promoter Plan': 49.95
    };
    
    let basePrice = basePrices[selectedTier] || 0;
    let addonTotal = selectedAddons.reduce((total, addon) => total + addon.monthly_price, 0);
    let discount = 0;
    
    // Auto-apply "bypass" discount for Business/Promoter plans
    if ((selectedTier === 'Business Plan' || selectedTier === 'Promoter Plan') && selectedAddons.length > 0) {
      if (selectedAddons.length === 1) discount = 5;
      else if (selectedAddons.length === 2) discount = 10;
      else if (selectedAddons.length >= 3) discount = 15;
    }
    
    return {
      basePrice,
      addonTotal,
      discount,
      total: basePrice + addonTotal - discount
    };
  };

  const handleAddonToggle = (addon) => {
    setSelectedAddons(prev => {
      const isSelected = prev.find(a => a.id === addon.id);
      if (isSelected) {
        return prev.filter(a => a.id !== addon.id);
      } else {
        return [...prev, addon];
      }
    });
  };

  const handleModalClose = () => {
    setShowSignupModal(false);
    setSelectedTier(null);
  };

  const handleSubscriptionSignup = async (paymentMethodId = null) => {
    if (!signupTermsAccepted) {
      alert('Please accept the terms and conditions to continue.');
      return;
    }

    try {
      setProcessing(true);
      
      // Determine permissions based on plan
      const permissions = ['sites'];
      if (selectedTier === 'Professional Plan' || selectedTier === 'Business Plan' || selectedTier === 'Promoter Plan') {
        permissions.push('manage_sites');
      }
      
      // Calculate pricing with auto-applied discounts
      const pricing = calculateTotalPrice();
      
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/subscriptions/sites/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_name: selectedTier,
          permissions: permissions,
          selected_addons: selectedAddons.map(addon => addon.id),
          pricing: pricing,
          payment_method_id: paymentMethodId,
          auto_applied_discount: pricing.discount > 0 ? {
            code: 'bypass',
            amount: pricing.discount,
            addon_count: selectedAddons.length
          } : null
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Force token refresh to get updated permissions
        await refreshAuthToken();
        
        alert(`Successfully subscribed to ${selectedTier}! Total: $${pricing.total}/month`);
        handleModalClose();
        // Refresh the page to update permissions
        window.location.reload();
      } else {
        console.error('Signup failed:', data.error);
        alert(`Signup failed: ${data.error}`);
      }
      
    } catch (error) {
      console.error('Error during signup:', error);
      alert('Error during signup. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCardSetupSuccess = (confirmedSetupIntent) => {
    // Card setup successful, proceed with subscription
    handleSubscriptionSignup(confirmedSetupIntent.payment_method);
  };

  const handleCardSetupError = (error) => {
    alert(`Card setup failed: ${error}`);
    setProcessing(false);
  };

  const handleSubscriptionCancel = async () => {
    if (!confirm('Are you sure you want to cancel your website subscription? Your sites will become inaccessible.')) {
      return;
    }

    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/subscriptions/sites/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Subscription cancelled successfully.');
        // Refresh the page to update permissions
        window.location.reload();
      } else {
        console.error('Cancellation failed:', data.error);
        alert(`Cancellation failed: ${data.error}`);
      }
      
    } catch (error) {
      console.error('Error during cancellation:', error);
      alert('Error during cancellation. Please try again.');
    }
  };



  // Pricing tiers
  const pricingTiers = [
    {
      name: "Starter Plan",
      description: "Simple setup, core features, great for getting started",
      price: "$14.99",
      period: "/month",
      features: [
        "1 Website",
        "Subdomain included",
        "Basic templates",
        "Use your OAF data to build a complete site in minutes",
        "Community support"
      ],
      popular: false
    },
    {
      name: "Professional Plan",
      description: "Build a professional brand, grow your online presence, connect with your shoppers",
      price: "$24.95", 
      period: "/month",
      features: [
        "Everything in Starter Plan",
        "Use your Custom domain",
        "Premium design templates",
        "Access to premium addons",
        "Priority Support",
        "Access to custom design services"
      ],
      popular: true
    },
    {
      name: "Business Plan",
      description: "Take your art business to the next level with marketplace connectors, wholesale access and brand building tools",
      price: "$49.95",
      period: "/month", 
      features: [
        "Everything in Starter and Professional Plans",
        "Access to multiple websites with custom domains",
        "Premium addons and marketplace connectors",
        "Wholesale pricing",
        "Dedicated support",
        "Core analytics"
      ],
      popular: false
    },
    {
      name: "Promoter Plan",
      description: "Grow your event and promote your artists with tools tailored to help you drive more traffic to your event participants",
      price: "$49.95",
      period: "/month", 
      features: [
        "Includes all artist pro features, plus",
        "Tools to help you sell merch",
        "Application and jury tools",
        "Invoicing and acceptance management",
        "Excel at SEO and web optimization"
      ],
      popular: false
    }
  ];

  const handleTermsAcceptance = async () => {
    try {
      setProcessing(true);
      
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/subscriptions/sites/terms-accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terms_version_id: termsData.id
        })
      });
      
      if (response.ok) {
        // Terms accepted - now show dashboard
        setModuleState('dashboard');
        setShowTermsModal(false);
        fetchUserSites();
      } else {
        const errorData = await response.json();
        alert(`Failed to accept terms: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error accepting terms:', error);
      alert('Error accepting terms. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Loading your website subscription...</div>
      </div>
    );
  }

  // Show sites dashboard if user has permission AND accepted terms
  if (moduleState === 'dashboard') {
    return (
      <div style={{ padding: '20px' }}>
        <h2 style={{ marginBottom: '30px', color: '#2c3e50' }}>Website Subscription Dashboard</h2>
        
        <div style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '2px', 
          marginBottom: '30px' 
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>Your Websites</h3>
          {userSites.length > 0 ? (
            <div>
              {userSites.map(site => (
                <div key={site.id} style={{
                  background: 'white',
                  padding: '15px',
                  borderRadius: '2px',
                  border: '1px solid #dee2e6',
                  marginBottom: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>{site.site_name}</h4>
                      <p style={{ margin: '0', color: '#6c757d', fontSize: '14px' }}>
                        {site.subdomain}.onlineartfestival.com • {site.status}
                      </p>
                    </div>
                    <div>
                      <button style={{
                        padding: '8px 16px',
                        background: '#055474',
                        color: 'white',
                        border: 'none',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}>
                        Manage
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6c757d' }}>No websites found. Create your first website to get started!</p>
          )}
        </div>

        {/* Subscription Management */}
        <div style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '2px', 
          marginBottom: '30px' 
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>Subscription Management</h3>
          <button
            onClick={handleSubscriptionCancel}
            style={{
              padding: '12px 24px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#c82333';
            }}
            onMouseOut={(e) => {
              e.target.style.background = '#dc3545';
            }}
          >
            Cancel Subscription
          </button>
        </div>

        {/* TODO: Add upgrade prompts and addon management here */}
        <div style={{ color: '#6c757d', fontStyle: 'italic' }}>
          Upgrade prompts and addon management coming soon...
        </div>
      </div>
    );
  }

  // Show terms modal if user has permission but hasn't accepted latest terms
  if (moduleState === 'terms-required') {
    return (
      <div style={{ padding: '20px' }}>
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', padding: '40px' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>
                Updated Website Terms
              </h3>
              <p style={{ color: '#6c757d' }}>
                Please review and accept the updated website service terms to continue.
              </p>
            </div>

            <div style={{ 
              background: '#f8f9fa', 
              padding: '20px', 
              borderRadius: '2px',
              marginBottom: '30px',
              border: '1px solid #dee2e6',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>
                {termsData?.title || 'Website Service Terms'}
              </h4>
              <div style={{ whiteSpace: 'pre-line', lineHeight: '1.6', fontSize: '14px' }}>
                {termsData?.content || 'Loading terms content...'}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                cursor: 'pointer',
                fontSize: '14px'
              }}>
                <input
                  type="checkbox"
                  checked={signupTermsAccepted}
                  onChange={(e) => setSignupTermsAccepted(e.target.checked)}
                  style={{ marginRight: '10px', marginTop: '2px' }}
                />
                <span style={{ color: '#495057' }}>
                  I agree to the updated website service terms and conditions.
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                onClick={() => {
                  // User can't really "cancel" terms acceptance, but we can log them out
                  alert('You must accept the updated terms to continue using website services.');
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleTermsAcceptance}
                disabled={!signupTermsAccepted || processing}
                style={{
                  flex: 2,
                  padding: '12px',
                  background: !signupTermsAccepted || processing ? '#ccc' : '#055474',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: !signupTermsAccepted || processing ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {processing ? 'Accepting...' : 'Accept Terms & Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show pricing tiers if no permission (signup workflow)
  if (moduleState === 'signup') {
    return (
    <div style={{ padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ color: '#2c3e50', marginBottom: '10px' }}>Choose Your Website Plan</h2>
        <p style={{ color: '#6c757d', fontSize: '18px' }}>
          Create beautiful artist websites with our professional tools
        </p>
      </div>

      {/* Artist Plans - First 3 tiers */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '30px',
        maxWidth: '1200px',
        margin: '0 auto',
        marginBottom: '60px'
      }}>
        {pricingTiers.slice(0, 3).map((tier, index) => (
          <div key={index} style={{
            background: 'white',
            border: tier.popular ? '2px solid #055474' : '1px solid #dee2e6',
            borderRadius: '2px',
            padding: '30px',
            position: 'relative',
            boxShadow: tier.popular ? '0 8px 25px rgba(0,123,255,0.15)' : '0 2px 10px rgba(0,0,0,0.1)',
            transform: tier.popular ? 'scale(1.05)' : 'none'
          }}>
            {tier.popular && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#055474',
                color: 'white',
                padding: '6px 20px',
                borderRadius: '2px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                MOST POPULAR
              </div>
            )}

            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h3 style={{ color: '#2c3e50', marginBottom: '10px', fontSize: '24px' }}>{tier.name}</h3>
              <p style={{ color: '#6c757d', fontSize: '16px', marginBottom: '20px', lineHeight: '1.4' }}>
                {tier.description}
              </p>
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#2c3e50' }}>{tier.price}</span>
                <span style={{ color: '#6c757d' }}>{tier.period}</span>
              </div>
            </div>

            <ul style={{ 
              listStyle: 'none', 
              padding: 0, 
              marginBottom: '30px' 
            }}>
              {tier.features.map((feature, featureIndex) => (
                <li key={featureIndex} style={{
                  padding: '8px 0',
                  color: '#495057',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <span style={{ color: '#3e1c56', marginRight: '10px' }}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSignupClick(tier.name)}
              style={{
                width: '100%',
                padding: '15px',
                background: tier.popular ? '#055474' : '#3e1c56',
                color: 'white',
                border: 'none',
                borderRadius: '2px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Get Started with {tier.name}
            </button>
          </div>
        ))}
      </div>

      {/* Promoter Plan - Centered on its own row */}
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '60px'
      }}>
        {pricingTiers.slice(3).map((tier, index) => (
          <div key={index + 3} style={{
            background: 'white',
            border: tier.popular ? '2px solid #055474' : '1px solid #dee2e6',
            borderRadius: '2px',
            padding: '30px',
            position: 'relative',
            boxShadow: tier.popular ? '0 8px 25px rgba(0,123,255,0.15)' : '0 2px 10px rgba(0,0,0,0.1)',
            transform: tier.popular ? 'scale(1.05)' : 'none',
            width: '350px',
            maxWidth: '90vw'
          }}>
            {tier.popular && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#055474',
                color: 'white',
                padding: '5px 20px',
                borderRadius: '2px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                MOST POPULAR
              </div>
            )}

            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h3 style={{ color: '#2c3e50', marginBottom: '10px', fontSize: '24px' }}>{tier.name}</h3>
              <p style={{ color: '#6c757d', fontSize: '16px', marginBottom: '20px', lineHeight: '1.4' }}>
                {tier.description}
              </p>
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#2c3e50' }}>{tier.price}</span>
                <span style={{ color: '#6c757d' }}>{tier.period}</span>
              </div>
            </div>

            <ul style={{ 
              listStyle: 'none', 
              padding: 0, 
              marginBottom: '30px' 
            }}>
              {tier.features.map((feature, featureIndex) => (
                <li key={featureIndex} style={{
                  padding: '8px 0',
                  borderBottom: '1px solid #f1f3f4',
                  color: '#495057',
                  fontSize: '15px'
                }}>
                  <span style={{ color: '#3e1c56', marginRight: '10px' }}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSignupClick(tier.name)}
              style={{
                width: '100%',
                padding: '15px',
                background: tier.popular ? '#055474' : '#3e1c56',
                color: 'white',
                border: 'none',
                borderRadius: '2px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Get Started with {tier.name}
            </button>
          </div>
        ))}
      </div>



      {/* Enhanced Signup Modal */}
      {showSignupModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', padding: '40px', maxHeight: '90vh' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>
                Get Started with {selectedTier}
              </h3>
              <p style={{ color: '#6c757d' }}>
                {selectedTier === 'Business Plan' || selectedTier === 'Promoter Plan' 
                  ? 'Customize your plan with addons and set up payment' 
                  : 'Set up your payment method to activate your subscription'
                }
              </p>
            </div>

            {/* Addon Selection for Business/Promoter Plans */}
            {(selectedTier === 'Business Plan' || selectedTier === 'Promoter Plan') && (
              <div style={{ marginBottom: '30px' }}>
                <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Select Add-ons</h4>
                <div style={{ 
                  background: '#f8f9fa', 
                  padding: '20px', 
                  borderRadius: '2px',
                  border: '1px solid #dee2e6'
                }}>
                  {availableAddons.length > 0 ? (
                    availableAddons.map(addon => (
                      <div key={addon.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 0',
                        borderBottom: '1px solid #e9ecef'
                      }}>
                        <div style={{ flex: 1 }}>
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedAddons.find(a => a.id === addon.id) || false}
                              onChange={() => handleAddonToggle(addon)}
                              style={{ marginRight: '10px' }}
                            />
                            <div>
                              <strong>{addon.addon_name}</strong>
                              {addon.description && (
                                <div style={{ color: '#6c757d', fontSize: '14px' }}>
                                  {addon.description}
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                        <div style={{ color: '#2c3e50', fontWeight: 'bold' }}>
                          ${addon.monthly_price}/mo
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: '#6c757d', textAlign: 'center', margin: 0 }}>
                      Loading available add-ons...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Pricing Summary */}
            <div style={{ 
              background: '#f8f9fa', 
              padding: '20px', 
              borderRadius: '2px',
              marginBottom: '30px',
              border: '1px solid #dee2e6'
            }}>
              <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Pricing Summary</h4>
              {(() => {
                const pricing = calculateTotalPrice();
  return (
    <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span>{selectedTier}</span>
                      <span>${pricing.basePrice}/mo</span>
                    </div>
                    {selectedAddons.map(addon => (
                      <div key={addon.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '14px', color: '#6c757d' }}>
                        <span>+ {addon.addon_name}</span>
                        <span>${addon.monthly_price}/mo</span>
                      </div>
                    ))}
                    {pricing.discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#28a745' }}>
                        <span>Package Discount ({selectedAddons.length} addon{selectedAddons.length !== 1 ? 's' : ''})</span>
                        <span>-${pricing.discount}/mo</span>
                      </div>
                    )}
                    <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #dee2e6' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px' }}>
                      <span>Total</span>
                      <span>${pricing.total}/mo</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Payment Method Setup */}
            {!setupIntent && (
              <div style={{ marginBottom: '20px' }}>
                <button
                  onClick={() => {
                    // TODO: Create setup intent via API
                    alert('Setup intent creation coming soon...');
                  }}
                  style={{
                    width: '100%',
                    padding: '15px',
                    background: '#055474',
                    color: 'white',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  Set Up Payment Method
                </button>
              </div>
            )}

            {/* Stripe Card Setup */}
            {setupIntent && (
              <div style={{ marginBottom: '20px' }}>
                <StripeCardSetup
                  setupIntent={setupIntent}
                  onSuccess={handleCardSetupSuccess}
                  onError={handleCardSetupError}
                  processing={processing}
                  setProcessing={setProcessing}
                />
              </div>
            )}

            {/* Terms Acceptance */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                cursor: 'pointer',
                fontSize: '14px'
              }}>
                <input
                  type="checkbox"
                  checked={signupTermsAccepted}
                  onChange={(e) => setSignupTermsAccepted(e.target.checked)}
                  style={{ marginRight: '10px', marginTop: '2px' }}
                />
                <span style={{ color: '#495057' }}>
                  I agree to the{' '}
                  <span style={{ color: '#055474', textDecoration: 'underline' }}>
                    Website Subscription Terms
                  </span>
                  {' '}and authorize monthly billing for the selected plan and add-ons.
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                onClick={handleModalClose}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              {setupIntent ? (
                <button
                  onClick={() => handleSubscriptionSignup()}
                  disabled={!signupTermsAccepted || processing}
                  style={{
                    flex: 2,
                    padding: '12px',
                    background: !signupTermsAccepted || processing ? '#ccc' : '#055474',
                    color: 'white',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: !signupTermsAccepted || processing ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {processing ? 'Processing...' : `Subscribe for $${calculateTotalPrice().total}/mo`}
                </button>
              ) : (
                <button
                  onClick={() => handleSubscriptionSignup()}
                  disabled={!signupTermsAccepted}
                  style={{
                    flex: 2,
                    padding: '12px',
                    background: !signupTermsAccepted ? '#ccc' : '#055474',
                    color: 'white',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: !signupTermsAccepted ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Subscribe for $${calculateTotalPrice().total}/mo
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    );
  }

  // Fallback - should not reach here
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div>Loading...</div>
    </div>
  );
}
