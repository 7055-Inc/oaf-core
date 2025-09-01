import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest, refreshAuthToken } from '../../../../../lib/csrf';
import StripeCardSetup from '../../../../stripe/StripeCardSetup';

export default function PricingTiers({ userData, onSubscriptionSuccess }) {
  // Enhanced signup state
  const [selectedTier, setSelectedTier] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [signupTermsAccepted, setSignupTermsAccepted] = useState(false);
  const [setupIntent, setSetupIntent] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [availableAddons, setAvailableAddons] = useState([]);

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
    },
    {
      name: "Promoter Business Plan",
      description: "Advanced event promotion with professional website tools, smart templates, and comprehensive brand management",
      price: "$79.95",
      period: "/month", 
      features: [
        "Everything in Promoter Plan, plus",
        "Professional website builder with smart templates",
        "Advanced color palette tools and customization",
        "Live site editor with real-time preview",
        "Multiple event websites with custom domains",
        "Enhanced analytics and reporting",
        "Priority dedicated support"
      ],
      popular: false
    }
  ];

  const handleSignupClick = (tierName) => {
    setSelectedTier(tierName);
    setSelectedAddons([]);
    setSignupTermsAccepted(false);
    
    // Fetch addons if Business or Promoter plan
    if (tierName === 'Business Plan' || tierName === 'Promoter Plan' || tierName === 'Promoter Business Plan') {
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
      'Promoter Plan': 49.95,
      'Promoter Business Plan': 79.95
    };
    
    let basePrice = basePrices[selectedTier] || 0;
    let addonTotal = selectedAddons.reduce((total, addon) => total + addon.monthly_price, 0);
    let discount = 0;
    
    // Auto-apply "bypass" discount for Business/Promoter plans
    if ((selectedTier === 'Business Plan' || selectedTier === 'Promoter Plan' || selectedTier === 'Promoter Business Plan') && selectedAddons.length > 0) {
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
      if (selectedTier === 'Professional Plan' || selectedTier === 'Promoter Plan') {
        permissions.push('manage_sites');
      } else if (selectedTier === 'Business Plan' || selectedTier === 'Promoter Business Plan') {
        permissions.push('professional_sites');
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
        
        // Call parent callback to refresh the page/state
        if (onSubscriptionSuccess) {
          onSubscriptionSuccess();
        } else {
          // Fallback to page reload
          window.location.reload();
        }
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

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ color: '#2c3e50', marginBottom: '10px' }}>Choose Your Website Plan</h2>
        <p style={{ color: '#6c757d', fontSize: '18px' }}>
          Create beautiful artist websites with our professional tools
        </p>
      </div>

      {/* All Plans */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '30px',
        maxWidth: '1600px',
        margin: '0 auto',
        marginBottom: '60px'
      }}>
        {pricingTiers.map((tier, index) => (
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



      {/* Enhanced Signup Modal */}
      {showSignupModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', padding: '40px', maxHeight: '90vh' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>
                Get Started with {selectedTier}
              </h3>
              <p style={{ color: '#6c757d' }}>
                {selectedTier === 'Business Plan' || selectedTier === 'Promoter Plan' || selectedTier === 'Promoter Business Plan'
                  ? 'Customize your plan with addons and set up payment' 
                  : 'Set up your payment method to activate your subscription'
                }
              </p>
            </div>

            {/* Addon Selection for Business/Promoter Plans */}
            {(selectedTier === 'Business Plan' || selectedTier === 'Promoter Plan' || selectedTier === 'Promoter Business Plan') && (
              <div style={{ marginBottom: '30px' }}>
                <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Select Add-ons</h4>
                
                {/* User-Level Addons Section */}
                {(() => {
                  const userLevelAddons = availableAddons.filter(addon => addon.user_level === 1);
                  return userLevelAddons.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <h5 style={{ color: '#495057', marginBottom: '10px', fontSize: '14px' }}>
                        Works across all sites and marketplace
                      </h5>
                      <div style={{ 
                        background: '#e8f4fd', 
                        padding: '15px', 
                        borderRadius: '2px',
                        border: '1px solid #b8daff',
                        marginBottom: '15px'
                      }}>
                        {userLevelAddons.map(addon => (
                          <div key={addon.id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 0',
                            borderBottom: userLevelAddons.indexOf(addon) < userLevelAddons.length - 1 ? '1px solid #b8daff' : 'none',
                            opacity: addon.user_already_has ? 0.6 : 1
                          }}>
                            <div style={{ flex: 1 }}>
                              <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                cursor: addon.user_already_has ? 'not-allowed' : 'pointer'
                              }}>
                                <input
                                  type="checkbox"
                                  checked={selectedAddons.find(a => a.id === addon.id) || false}
                                  onChange={() => !addon.user_already_has && handleAddonToggle(addon)}
                                  disabled={addon.user_already_has}
                                  style={{ marginRight: '10px' }}
                                />
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <strong>{addon.addon_name}</strong>
                                    <span style={{
                                      background: '#1976d2',
                                      color: 'white',
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
                                  {addon.description && (
                                    <div style={{ color: '#495057', fontSize: '14px' }}>
                                      {addon.description}
                                      <span style={{ fontStyle: 'italic' }}>
                                        {' '}- Applies to all your websites and marketplace
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </label>
                            </div>
                            <div style={{ color: '#2c3e50', fontWeight: 'bold' }}>
                              {addon.user_already_has ? (
                                <span style={{ color: '#2e7d32' }}>✓ Owned</span>
                              ) : (
                                `$${addon.monthly_price}/mo`
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Site-Level Addons Section */}
                {(() => {
                  const siteLevelAddons = availableAddons.filter(addon => addon.user_level === 0);
                  return siteLevelAddons.length > 0 && (
                    <div>
                      <h5 style={{ color: '#495057', marginBottom: '10px', fontSize: '14px' }}>
                        Per site add-ons
                      </h5>
                      <div style={{ 
                        background: '#f8f9fa', 
                        padding: '15px', 
                        borderRadius: '2px',
                        border: '1px solid #dee2e6'
                      }}>
                        {siteLevelAddons.map(addon => (
                          <div key={addon.id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 0',
                            borderBottom: siteLevelAddons.indexOf(addon) < siteLevelAddons.length - 1 ? '1px solid #e9ecef' : 'none'
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
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <strong>{addon.addon_name}</strong>
                                    <span style={{
                                      background: '#f0f0f0',
                                      color: '#666',
                                      padding: '2px 6px',
                                      borderRadius: '3px',
                                      fontSize: '11px',
                                      fontWeight: 'bold'
                                    }}>
                                      PER SITE
                                    </span>
                                  </div>
                                  {addon.description && (
                                    <div style={{ color: '#6c757d', fontSize: '14px' }}>
                                      {addon.description}
                                      <span style={{ fontStyle: 'italic' }}>
                                        {' '}- Applies to individual websites
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </label>
                            </div>
                            <div style={{ color: '#2c3e50', fontWeight: 'bold' }}>
                              ${addon.monthly_price}/mo
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {availableAddons.length === 0 && (
                  <div style={{ 
                    background: '#f8f9fa', 
                    padding: '20px', 
                    borderRadius: '2px',
                    border: '1px solid #dee2e6',
                    textAlign: 'center'
                  }}>
                    <p style={{ color: '#6c757d', margin: 0 }}>
                      Loading available add-ons...
                    </p>
                  </div>
                )}
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
