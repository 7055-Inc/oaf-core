import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest, refreshAuthToken } from '../../../../lib/csrf';
import StripeCardSetup from '../../../stripe/StripeCardSetup';

export default function WebSiteSubscriptions({ userData }) {
  const [loading, setLoading] = useState(true);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [userSites, setUserSites] = useState([]);
  
  // Enhanced signup state
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [signupTermsAccepted, setSignupTermsAccepted] = useState(false);
  const [setupIntent, setSetupIntent] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [signupStep, setSignupStep] = useState('plan'); // 'plan', 'addons', 'payment', 'terms'

  // Module access state
  const [moduleState, setModuleState] = useState('loading'); // 'loading', 'dashboard', 'terms-required', 'signup'
  const [termsData, setTermsData] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Payment info state
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [showUpdatePayment, setShowUpdatePayment] = useState(false);

  // Site management state
  const [expandedSite, setExpandedSite] = useState(null);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [availableAddons, setAvailableAddons] = useState([]);
  const [siteForm, setSiteForm] = useState({});
  const [isEditingSite, setIsEditingSite] = useState(false);

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
            fetchSubscriptionData();
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

  const fetchSubscriptionData = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/subscriptions/sites/status');
      const data = await response.json();
      
      if (data.success) {
        setSubscriptionData(data);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    }
  };

  const fetchTemplatesAndAddons = async () => {
    try {
      // Fetch available templates
      const templatesResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/sites/templates');
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setAvailableTemplates(templatesData.templates || []);
      }

      // Fetch available addons (only for manage_sites users)
      if (userData?.permissions?.includes('manage_sites')) {
        const addonsResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/sites/addons');
        if (addonsResponse.ok) {
          const addonsData = await addonsResponse.json();
          setAvailableAddons(addonsData.addons || []);
        }
      }
    } catch (error) {
      console.error('Error fetching templates/addons:', error);
    }
  };

  const handleSiteManage = (site) => {
    if (expandedSite === site.id) {
      // Collapse if already expanded
      setExpandedSite(null);
      setIsEditingSite(false);
    } else {
      // Expand this site
      setExpandedSite(site.id);
      setSiteForm({
        site_name: site.site_name,
        site_title: site.site_title || '',
        site_description: site.site_description || '',
        template_id: site.template_id || 1,
        status: site.status
      });
      setIsEditingSite(false);
      
      // Fetch templates/addons when expanding
      if (availableTemplates.length === 0) {
        fetchTemplatesAndAddons();
      }
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
                  border: '1px solid #dee2e6',
                  borderRadius: '2px',
                  marginBottom: '10px'
                }}>
                  {/* Site Header */}
                  <div style={{ 
                    padding: '15px',
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    borderBottom: expandedSite === site.id ? '1px solid #dee2e6' : 'none'
                  }}>
                    <div>
                      <h4 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>{site.site_name}</h4>
                      <p style={{ margin: '0', color: '#6c757d', fontSize: '14px' }}>
                        {site.domain || `${site.subdomain}.onlineartfestival.com`} • {site.status}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <a 
                        href={`https://${site.domain || `${site.subdomain}.onlineartfestival.com`}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '6px 12px',
                          background: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '2px',
                          textDecoration: 'none',
                          fontSize: '12px'
                        }}
                      >
                        Visit Site
                      </a>
                      <button 
                        onClick={() => handleSiteManage(site)}
                        style={{
                          padding: '8px 16px',
                          background: expandedSite === site.id ? '#6c757d' : '#055474',
                          color: 'white',
                          border: 'none',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        {expandedSite === site.id ? 'Close' : 'Manage'}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Site Management Content */}
                  {expandedSite === site.id && (
                    <div style={{ padding: '20px' }}>
                      <SiteManagementContent 
                        site={site}
                        userData={userData}
                        availableTemplates={availableTemplates}
                        availableAddons={availableAddons}
                        siteForm={siteForm}
                        setSiteForm={setSiteForm}
                        isEditingSite={isEditingSite}
                        setIsEditingSite={setIsEditingSite}
                        onSiteUpdate={() => {
                          fetchUserSites();
                          setExpandedSite(null);
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6c757d' }}>No websites found. Create your first website to get started!</p>
          )}
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
                  •••• •••• •••• {subscriptionData?.cardLast4 || 'None on file'}
                </div>
                
                <div style={{ color: '#6c757d' }}>Status:</div>
                <div style={{ color: subscriptionData?.status === 'active' ? '#28a745' : '#6c757d' }}>
                  {subscriptionData?.status || 'Unknown'}
                </div>
                
                <div style={{ color: '#6c757d' }}>Plan:</div>
                <div style={{ color: '#2c3e50' }}>
                  {subscriptionData?.planName || 'Not specified'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowUpdatePayment(true)}
                  disabled={processing}
                  style={{
                    padding: '8px 16px',
                    background: '#055474',
                    color: 'white',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: processing ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    opacity: processing ? 0.6 : 1
                  }}
                >
                  Update Payment Method
                </button>
                
                {userData?.permissions?.includes('stripe_connect') && (
                  <button
                    onClick={() => {
                      // TODO: Toggle Connect balance preference
                      alert('Connect balance toggle coming soon...');
                    }}
                    disabled={processing}
                    style={{
                      padding: '8px 16px',
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: processing ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      opacity: processing ? 0.6 : 1
                    }}
                  >
                    Enable Balance Payments
                  </button>
                )}
                
                <button
                  onClick={handleSubscriptionCancel}
                  disabled={processing}
                  style={{
                    padding: '8px 16px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: processing ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    opacity: processing ? 0.6 : 1
                  }}
                >
                  Cancel Subscription
                </button>
              </div>
            </div>
          )}
        </div>

        {/* TODO: Add upgrade prompts and addon management here */}
        <div style={{ color: '#6c757d', fontStyle: 'italic' }}>
          Site creation, template selection, and addon management coming soon...
        </div>

        {/* Payment Method Update Modal */}
        {showUpdatePayment && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '500px', padding: '30px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>
                  Update Payment Method
                </h3>
                <p style={{ color: '#6c757d' }}>
                  Update your payment method for website subscription billing.
                </p>
              </div>

              {/* TODO: Add Stripe payment method update component */}
              <div style={{ 
                padding: '20px', 
                background: '#f8f9fa', 
                borderRadius: '2px',
                textAlign: 'center',
                marginBottom: '20px'
              }}>
                <p style={{ color: '#6c757d', margin: '0' }}>
                  Payment method update integration coming soon...
                </p>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <button
                  onClick={() => setShowUpdatePayment(false)}
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
                  onClick={() => {
                    // TODO: Implement payment method update
                    alert('Payment method update coming soon...');
                    setShowUpdatePayment(false);
                  }}
                  disabled={processing}
                  style={{
                    flex: 2,
                    padding: '12px',
                    background: processing ? '#ccc' : '#055474',
                    color: 'white',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: processing ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {processing ? 'Updating...' : 'Update Payment Method'}
                </button>
              </div>
            </div>
          </div>
        )}
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

// Site Management Content Component
function SiteManagementContent({ 
  site, 
  userData, 
  availableTemplates, 
  availableAddons, 
  siteForm, 
  setSiteForm, 
  isEditingSite, 
  setIsEditingSite,
  onSiteUpdate 
}) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(site.template_id || 1);
  const [siteAddons, setSiteAddons] = useState([]);

  const hasManageSites = userData?.permissions?.includes('manage_sites');

  useEffect(() => {
    if (hasManageSites) {
      fetchSiteAddons();
    }
  }, [site.id, hasManageSites]);

  const fetchSiteAddons = async () => {
    try {
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/api/sites/my-addons?site_id=${site.id}`);
      if (response.ok) {
        const data = await response.json();
        setSiteAddons(data.addons || []);
      }
    } catch (error) {
      console.error('Error fetching site addons:', error);
    }
  };

  const handleTemplateChange = async (templateId) => {
    try {
      setProcessing(true);
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/api/sites/template/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setSelectedTemplate(templateId);
        onSiteUpdate();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update template');
      }
    } catch (error) {
      setError('Error updating template');
    } finally {
      setProcessing(false);
    }
  };

  const handleSiteUpdate = async () => {
    try {
      setProcessing(true);
      setError(null);

      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/api/sites/${site.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_name: siteForm.site_name,
          site_title: siteForm.site_title,
          site_description: siteForm.site_description,
          status: siteForm.status
        })
      });

      if (response.ok) {
        setIsEditingSite(false);
        onSiteUpdate();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update site');
      }
    } catch (error) {
      setError('Error updating site');
    } finally {
      setProcessing(false);
    }
  };

  // Filter templates based on permissions
  const getAvailableTemplates = () => {
    if (!availableTemplates) return [];
    
    if (hasManageSites) {
      // Premium users see all templates
      return availableTemplates;
    } else {
      // Basic users see only free and basic tier templates
      return availableTemplates.filter(template => 
        template.tier_required === 'free' || template.tier_required === 'basic'
      );
    }
  };

  return (
    <div>
      {error && (
        <div style={{ 
          padding: '10px', 
          background: '#f8d7da', 
          border: '1px solid #dc3545', 
          borderRadius: '2px', 
          marginBottom: '15px',
          color: '#721c24',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* Site Information */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h4 style={{ margin: '0', color: '#2c3e50' }}>Site Information</h4>
          <button
            onClick={() => setIsEditingSite(!isEditingSite)}
            style={{
              padding: '6px 12px',
              background: isEditingSite ? '#6c757d' : '#055474',
              color: 'white',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {isEditingSite ? 'Cancel Edit' : 'Edit Info'}
          </button>
        </div>

        {isEditingSite ? (
          <div style={{ display: 'grid', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#495057', fontSize: '14px' }}>
                Website Name
              </label>
              <input
                type="text"
                value={siteForm.site_name}
                onChange={(e) => setSiteForm({...siteForm, site_name: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '2px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#495057', fontSize: '14px' }}>
                Site Title
              </label>
              <input
                type="text"
                value={siteForm.site_title}
                onChange={(e) => setSiteForm({...siteForm, site_title: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '2px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', color: '#495057', fontSize: '14px' }}>
                Site Description
              </label>
              <textarea
                value={siteForm.site_description}
                onChange={(e) => setSiteForm({...siteForm, site_description: e.target.value})}
                rows="3"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '2px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSiteUpdate}
                disabled={processing}
                style={{
                  padding: '8px 16px',
                  background: processing ? '#ccc' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {processing ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setIsEditingSite(false)}
                style={{
                  padding: '8px 16px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'auto 1fr', 
            gap: '8px 15px',
            fontSize: '14px'
          }}>
            <div style={{ color: '#6c757d' }}>Site Title:</div>
            <div style={{ color: '#2c3e50' }}>{site.site_title || 'Not set'}</div>
            
            <div style={{ color: '#6c757d' }}>Description:</div>
            <div style={{ color: '#2c3e50' }}>{site.site_description || 'Not set'}</div>
            
            <div style={{ color: '#6c757d' }}>Template:</div>
            <div style={{ color: '#2c3e50' }}>{site.template_name || 'Default'}</div>
          </div>
        )}
      </div>

      {/* Custom Domain Management - Only for manage_sites users */}
      {hasManageSites && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Custom Domain</h4>
          <CustomDomainSection site={site} />
        </div>
      )}

      {/* Template Selection */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>
          Choose Template 
          {!hasManageSites && (
            <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: 'normal' }}>
              (Basic templates - upgrade for premium templates)
            </span>
          )}
        </h4>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
          gap: '15px' 
        }}>
          {getAvailableTemplates().map(template => (
            <div key={template.id} style={{
              border: selectedTemplate === template.id ? '2px solid #055474' : '1px solid #dee2e6',
              borderRadius: '2px',
              padding: '10px',
              cursor: 'pointer',
              background: selectedTemplate === template.id ? '#f0f8ff' : 'white',
              transition: 'all 0.2s'
            }}
            onClick={() => !processing && handleTemplateChange(template.id)}
            >
              {template.preview_image_url ? (
                <img 
                  src={template.preview_image_url} 
                  alt={template.template_name}
                  style={{ 
                    width: '100%', 
                    height: '80px', 
                    objectFit: 'cover', 
                    borderRadius: '2px',
                    marginBottom: '8px'
                  }}
                />
              ) : (
                <div style={{ 
                  width: '100%', 
                  height: '80px', 
                  background: '#f8f9fa', 
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '8px',
                  color: '#6c757d',
                  fontSize: '12px'
                }}>
                  No Preview
                </div>
              )}
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: selectedTemplate === template.id ? 'bold' : 'normal',
                  color: selectedTemplate === template.id ? '#055474' : '#2c3e50'
                }}>
                  {template.template_name}
                </div>
                {template.tier_required !== 'free' && (
                  <div style={{ 
                    fontSize: '10px', 
                    color: '#6c757d',
                    textTransform: 'uppercase'
                  }}>
                    {template.tier_required}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Addon Management - Only for manage_sites users */}
      {hasManageSites && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Add-ons</h4>
          
          {/* Current Addons */}
          {siteAddons.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <h5 style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '14px' }}>Active Add-ons</h5>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {siteAddons.map(addon => (
                  <div key={addon.id} style={{
                    padding: '4px 8px',
                    background: '#28a745',
                    color: 'white',
                    borderRadius: '2px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    {addon.addon_name}
                    <button
                      onClick={() => {
                        // TODO: Remove addon
                        alert('Remove addon functionality coming soon...');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '10px',
                        padding: '0'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Addons */}
          <div>
            <h5 style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '14px' }}>Available Add-ons</h5>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
              gap: '10px' 
            }}>
              {availableAddons.map(addon => {
                const isActive = siteAddons.some(sa => sa.addon_id === addon.id);
                return (
                  <div key={addon.id} style={{
                    border: '1px solid #dee2e6',
                    borderRadius: '2px',
                    padding: '10px',
                    background: isActive ? '#f0f8ff' : 'white',
                    opacity: isActive ? 0.7 : 1
                  }}>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: 'bold', 
                      color: '#2c3e50',
                      marginBottom: '5px'
                    }}>
                      {addon.addon_name}
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#6c757d',
                      marginBottom: '8px'
                    }}>
                      ${addon.monthly_price}/month
                    </div>
                    <button
                      onClick={() => {
                        // TODO: Add/remove addon
                        alert(`${isActive ? 'Remove' : 'Add'} addon functionality coming soon...`);
                      }}
                      disabled={processing}
                      style={{
                        width: '100%',
                        padding: '6px',
                        background: isActive ? '#dc3545' : '#055474',
                        color: 'white',
                        border: 'none',
                        borderRadius: '2px',
                        cursor: processing ? 'not-allowed' : 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {isActive ? 'Remove' : 'Add'} Add-on
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Site Actions */}
      <div style={{ 
        borderTop: '1px solid #dee2e6', 
        paddingTop: '15px',
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => {
            // TODO: Open site editor
            alert('Site editor integration coming soon...');
          }}
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
          Edit Content
        </button>
        
        <button
          onClick={() => {
            // TODO: Duplicate site functionality
            alert('Duplicate site functionality coming soon...');
          }}
          disabled={!hasManageSites}
          style={{
            padding: '8px 16px',
            background: hasManageSites ? '#6c757d' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '2px',
            cursor: hasManageSites ? 'pointer' : 'not-allowed',
            fontSize: '14px'
          }}
        >
          Duplicate Site {!hasManageSites && '(Premium)'}
        </button>

        <button
          onClick={() => {
            if (confirm(`Are you sure you want to delete "${site.site_name}"? This cannot be undone.`)) {
              // TODO: Delete site functionality
              alert('Delete site functionality coming soon...');
            }
          }}
          style={{
            padding: '8px 16px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '14px',
            marginLeft: 'auto'
          }}
        >
          Delete Site
        </button>
      </div>
    </div>
  );
}

// Custom Domain Section Component
function CustomDomainSection({ site }) {
  const [domainStatus, setDomainStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [domainCheck, setDomainCheck] = useState({
    checking: false,
    available: null,
    error: null
  });

  useEffect(() => {
    // Always fetch domain status when component mounts to check for any validation in progress
    fetchDomainStatus();
  }, [site.id]);

  const fetchDomainStatus = async () => {
    try {
      setLoading(true);
      const response = await authenticatedApiRequest(
        `https://api2.onlineartfestival.com/api/domains/status/${site.id}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setDomainStatus(data);

      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch domain status');
        console.error('Domain status error:', errorData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkDomainAvailability = async (domain) => {
    // Only check domains that have a valid format (must contain a dot and TLD)
    if (!domain || domain.length < 4 || !domain.includes('.') || !domain.match(/\.[a-z]{2,}$/i)) {
      setDomainCheck({ checking: false, available: null, error: null });
      return;
    }

    setDomainCheck({ checking: true, available: null, error: null });

    try {
      const response = await authenticatedApiRequest(
        `https://api2.onlineartfestival.com/api/domains/check-availability?domain=${encodeURIComponent(domain)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setDomainCheck({
          checking: false,
          available: data.available,
          error: data.available ? null : (data.error || data.reason)
        });
      } else {
        const errorData = await response.json();
        setDomainCheck({
          checking: false,
          available: false,
          error: errorData.error || 'Failed to check domain'
        });
      }
    } catch (err) {
      setDomainCheck({
        checking: false,
        available: false,
        error: err.message
      });
    }
  };

  const startDomainValidation = async () => {
    if (!newDomain) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await authenticatedApiRequest(
        'https://api2.onlineartfestival.com/api/domains/start-validation',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            siteId: site.id,
            customDomain: newDomain
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSuccess('Domain validation started successfully! Please set up your DNS records.');
        setShowAddDomain(false);
        setNewDomain('');
        setDomainCheck({ checking: false, available: null, error: null });
        
        // Refresh domain status to show DNS instructions
        setTimeout(() => {
          fetchDomainStatus();
        }, 1000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to start domain validation');

      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const retryValidation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authenticatedApiRequest(
        `https://api2.onlineartfestival.com/api/domains/retry-validation/${site.id}`,
        {
          method: 'POST'
        }
      );

      if (response.ok) {
        setSuccess('Domain validation retry started!');
        
        // Refresh domain status
        setTimeout(() => {
          fetchDomainStatus();
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to retry validation');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelValidation = async () => {
    if (!confirm('Are you sure you want to cancel the domain validation? You can restart it later if needed.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await authenticatedApiRequest(
        `https://api2.onlineartfestival.com/api/domains/cancel-validation/${site.id}`,
        {
          method: 'POST'
        }
      );

      if (response.ok) {
        setSuccess('Domain validation cancelled successfully!');
        setDomainStatus(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to cancel validation');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeDomain = async () => {
    if (!confirm('Are you sure you want to remove your custom domain? This will disconnect it from your site.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await authenticatedApiRequest(
        `https://api2.onlineartfestival.com/api/domains/remove/${site.id}`,
        {
          method: 'DELETE'
        }
      );

      if (response.ok) {
        setSuccess('Custom domain removed successfully!');
        setDomainStatus(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to remove domain');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setSuccess('Copied to clipboard!');
      setTimeout(() => setSuccess(null), 2000);
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div>
      {error && (
        <div style={{ 
          padding: '10px', 
          background: '#f8d7da', 
          border: '1px solid #dc3545', 
          borderRadius: '2px', 
          marginBottom: '15px',
          color: '#721c24',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ 
          padding: '10px', 
          background: '#d4edda', 
          border: '1px solid #28a745', 
          borderRadius: '2px', 
          marginBottom: '15px',
          color: '#155724',
          fontSize: '14px'
        }}>
          {success}
        </div>
      )}

      {(site.custom_domain || domainStatus?.customDomain) ? (
        /* Existing Domain Management */
        <div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'auto 1fr', 
            gap: '8px 15px',
            fontSize: '14px',
            marginBottom: '15px'
          }}>
            <div style={{ color: '#6c757d' }}>Custom Domain:</div>
            <div style={{ color: '#2c3e50', fontWeight: 'bold' }}>{site.custom_domain || domainStatus?.customDomain}</div>
            
            <div style={{ color: '#6c757d' }}>Status:</div>
            <div style={{ 
              color: domainStatus?.validationStatus === 'verified' && domainStatus?.isActive ? '#28a745' : 
                    domainStatus?.validationStatus === 'failed' ? '#dc3545' : '#ffc107'
            }}>
              {domainStatus?.validationStatus === 'verified' && domainStatus?.isActive ? '✅ Active' :
               domainStatus?.validationStatus === 'failed' ? '❌ Failed' :
               domainStatus?.validationStatus === 'pending' ? '⏳ Pending Verification' : '🔄 Loading...'}
            </div>
          </div>

          {/* Domain Status Details */}
          {domainStatus && (
            <div>
              {domainStatus.validationStatus === 'pending' && (
                <div style={{ 
                  background: '#fff3cd', 
                  border: '1px solid #ffc107', 
                  borderRadius: '2px', 
                  padding: '15px',
                  marginBottom: '15px'
                }}>
                  <h5 style={{ margin: '0 0 10px 0', color: '#856404' }}>📋 DNS Setup Required</h5>
                  <p style={{ margin: '0 0 15px 0', color: '#856404' }}>Add these DNS records to your domain's DNS settings:</p>
                  
                  <div style={{ 
                    background: '#f8f9fa', 
                    border: '1px solid #dee2e6', 
                    borderRadius: '2px', 
                    padding: '10px',
                    marginBottom: '15px'
                  }}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Record Type:</strong> 
                      <code style={{ 
                        background: '#e9ecef', 
                        padding: '2px 6px', 
                        borderRadius: '2px', 
                        marginLeft: '8px',
                        fontSize: '12px'
                      }}>TXT</code>
                      <button 
                        onClick={() => copyToClipboard('TXT')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#055474',
                          cursor: 'pointer',
                          marginLeft: '5px',
                          fontSize: '12px'
                        }}
                      >
                        📋 Copy
                      </button>
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Name/Host:</strong> 
                      <code style={{ 
                        background: '#e9ecef', 
                        padding: '2px 6px', 
                        borderRadius: '2px', 
                        marginLeft: '8px',
                        fontSize: '12px'
                      }}>_oaf-site-verification</code>
                      <button 
                        onClick={() => copyToClipboard('_oaf-site-verification')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#055474',
                          cursor: 'pointer',
                          marginLeft: '5px',
                          fontSize: '12px'
                        }}
                      >
                        📋 Copy
                      </button>
                    </div>
                    
                    <div>
                      <strong>Value:</strong> 
                      <code style={{ 
                        background: '#e9ecef', 
                        padding: '2px 6px', 
                        borderRadius: '2px', 
                        marginLeft: '8px',
                        fontSize: '12px',
                        wordBreak: 'break-all'
                      }}>{domainStatus.validationKey}</code>
                      <button 
                        onClick={() => copyToClipboard(domainStatus.validationKey)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#055474',
                          cursor: 'pointer',
                          marginLeft: '5px',
                          fontSize: '12px'
                        }}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  {/* A-Record Instructions */}
                  <div style={{ 
                    background: '#f8f9fa', 
                    border: '1px solid #dee2e6', 
                    borderRadius: '2px', 
                    padding: '10px',
                    marginBottom: '15px'
                  }}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Record Type:</strong> 
                      <code style={{ 
                        background: '#e9ecef', 
                        padding: '2px 6px', 
                        borderRadius: '2px', 
                        marginLeft: '8px',
                        fontSize: '12px'
                      }}>A</code>
                      <button 
                        onClick={() => copyToClipboard('A')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#055474',
                          cursor: 'pointer',
                          marginLeft: '5px',
                          fontSize: '12px'
                        }}
                      >
                        📋 Copy
                      </button>
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Name/Host:</strong> 
                      <code style={{ 
                        background: '#e9ecef', 
                        padding: '2px 6px', 
                        borderRadius: '2px', 
                        marginLeft: '8px',
                        fontSize: '12px'
                      }}>@</code>
                      <button 
                        onClick={() => copyToClipboard('@')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#055474',
                          cursor: 'pointer',
                          marginLeft: '5px',
                          fontSize: '12px'
                        }}
                      >
                        📋 Copy
                      </button>
                      <span style={{ marginLeft: '10px', fontSize: '12px', color: '#6c757d' }}>
                        (or leave blank for root domain)
                      </span>
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Value/Points to:</strong> 
                      <code style={{ 
                        background: '#e9ecef', 
                        padding: '2px 6px', 
                        borderRadius: '2px', 
                        marginLeft: '8px',
                        fontSize: '12px'
                      }}>34.59.133.38</code>
                      <button 
                        onClick={() => copyToClipboard('34.59.133.38')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#055474',
                          cursor: 'pointer',
                          marginLeft: '5px',
                          fontSize: '12px'
                        }}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  {/* Optional WWW CNAME Record */}
                  <div style={{ 
                    background: '#f0f8ff', 
                    border: '1px solid #b3d9ff', 
                    borderRadius: '2px', 
                    padding: '10px',
                    marginBottom: '15px'
                  }}>
                    <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', color: '#0066cc' }}>
                      📌 Optional: Support www subdomain
                    </div>
                    <div style={{ fontSize: '12px', color: '#0066cc', marginBottom: '8px' }}>
                      Add this CNAME record to make www.{site.custom_domain || domainStatus?.customDomain} work too:
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Record Type:</strong> 
                      <code style={{ 
                        background: '#e6f3ff', 
                        padding: '2px 6px', 
                        borderRadius: '2px', 
                        marginLeft: '8px',
                        fontSize: '12px'
                      }}>CNAME</code>
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Name/Host:</strong> 
                      <code style={{ 
                        background: '#e6f3ff', 
                        padding: '2px 6px', 
                        borderRadius: '2px', 
                        marginLeft: '8px',
                        fontSize: '12px'
                      }}>www</code>
                    </div>
                    <div>
                      <strong>Value/Points to:</strong> 
                      <code style={{ 
                        background: '#e6f3ff', 
                        padding: '2px 6px', 
                        borderRadius: '2px', 
                        marginLeft: '8px',
                        fontSize: '12px'
                      }}>{site.custom_domain || domainStatus?.customDomain}</code>
                      <button 
                        onClick={() => copyToClipboard(site.custom_domain || domainStatus?.customDomain)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0066cc',
                          cursor: 'pointer',
                          marginLeft: '5px',
                          fontSize: '12px'
                        }}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  <div style={{ fontSize: '14px', color: '#856404' }}>
                    <p style={{ margin: '0 0 10px 0' }}><strong>💡 How to add these records:</strong></p>
                    <ol style={{ margin: '0', paddingLeft: '20px' }}>
                      <li>Log into your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)</li>
                      <li>Find the DNS settings for {site.custom_domain || domainStatus?.customDomain}</li>
                      <li><strong>Required:</strong> Add the TXT record above (for verification)</li>
                      <li><strong>Required:</strong> Add the A record above (to point your domain to our server)</li>
                      <li><strong>Optional:</strong> Add the CNAME record above (to support www subdomain)</li>
                      <li>Wait for DNS propagation (usually 5-30 minutes)</li>
                      <li>We'll automatically verify and activate your domain!</li>
                    </ol>
                  </div>

                  {domainStatus.expiresAt && (
                    <div style={{ 
                      marginTop: '10px', 
                      fontSize: '12px', 
                      color: '#856404' 
                    }}>
                      ⏰ Validation expires: {formatDate(domainStatus.expiresAt)}
                    </div>
                  )}
                </div>
              )}

              {domainStatus.validationStatus === 'failed' && (
                <div style={{ 
                  background: '#f8d7da', 
                  border: '1px solid #dc3545', 
                  borderRadius: '2px', 
                  padding: '15px',
                  marginBottom: '15px'
                }}>
                  <h5 style={{ margin: '0 0 10px 0', color: '#721c24' }}>❌ Validation Failed</h5>
                  <p style={{ margin: '0 0 10px 0', color: '#721c24' }}>We couldn't verify your domain ownership.</p>
                  {domainStatus.error && (
                    <div style={{ 
                      background: '#f5c6cb', 
                      padding: '8px', 
                      borderRadius: '2px', 
                      marginBottom: '10px'
                    }}>
                      <strong>Error:</strong> {domainStatus.error}
                    </div>
                  )}
                  <p style={{ margin: '0', color: '#721c24' }}>Please check your DNS settings and try again.</p>
                </div>
              )}

              {domainStatus.validationStatus === 'verified' && domainStatus.isActive && (
                <div style={{ 
                  background: '#d4edda', 
                  border: '1px solid #28a745', 
                  borderRadius: '2px', 
                  padding: '15px',
                  marginBottom: '15px'
                }}>
                  <h5 style={{ margin: '0 0 10px 0', color: '#155724' }}>✅ Domain Verified & Active</h5>
                  <p style={{ margin: '0 0 10px 0', color: '#155724' }}>Your custom domain is working perfectly! Visitors can now access your site at:</p>
                  <div style={{ textAlign: 'center' }}>
                    <a 
                      href={`https://${site.custom_domain || domainStatus?.customDomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        background: '#28a745',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '2px',
                        fontWeight: 'bold'
                      }}
                    >
                      https://{site.custom_domain || domainStatus?.customDomain}
                    </a>
                  </div>
                </div>
              )}

              {domainStatus.lastAttempt && (
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6c757d',
                  marginBottom: '15px'
                }}>
                  Last checked: {formatDate(domainStatus.lastAttempt)}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={fetchDomainStatus}
              disabled={loading}
              style={{
                padding: '6px 12px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '2px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: loading ? 0.6 : 1
              }}
            >
              🔄 Refresh Status
            </button>
            
            {domainStatus?.validationStatus === 'pending' && (
              <>
                <button 
                  onClick={retryValidation}
                  disabled={loading}
                  style={{
                    padding: '6px 12px',
                    background: '#055474',
                    color: 'white',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  🔁 Verify Now
                </button>
                <button 
                  onClick={cancelValidation}
                  disabled={loading}
                  style={{
                    padding: '6px 12px',
                    background: '#ffc107',
                    color: '#212529',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  ❌ Cancel Validation
                </button>
              </>
            )}

            {domainStatus?.validationStatus === 'failed' && (
              <button 
                onClick={retryValidation}
                disabled={loading}
                style={{
                  padding: '6px 12px',
                  background: '#ffc107',
                  color: '#212529',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  opacity: loading ? 0.6 : 1
                }}
              >
                🔁 Retry Validation
              </button>
            )}
            
            <button 
              onClick={removeDomain}
              disabled={loading}
              style={{
                padding: '6px 12px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '2px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: loading ? 0.6 : 1,
                marginLeft: 'auto'
              }}
            >
              🗑️ Delete Domain
            </button>
          </div>
        </div>
      ) : (
        /* Add Domain Section */
        <div>
          {!showAddDomain ? (
            <div>
              <div style={{ 
                background: '#f8f9fa', 
                border: '1px solid #dee2e6', 
                borderRadius: '2px', 
                padding: '15px',
                marginBottom: '15px'
              }}>
                <h5 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>🎯 Benefits of a Custom Domain:</h5>
                <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: '#495057' }}>
                  <li>✨ <strong>Professional Branding:</strong> yourname.art instead of yourname.onlineartfestival.com</li>
                  <li>🔍 <strong>Better SEO:</strong> Your own domain ranks better in search results</li>
                  <li>💼 <strong>Business Credibility:</strong> Looks more professional to clients</li>
                  <li>🎨 <strong>Full Control:</strong> Your brand, your domain, your way</li>
                </ul>
              </div>
              
              <button
                onClick={() => setShowAddDomain(true)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#055474',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                + Add Custom Domain
              </button>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#495057', fontSize: '14px' }}>
                  Enter your custom domain:
                </label>
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, '');
                    setNewDomain(value);
                    
                    // Clear previous timeout
                    if (window.domainCheckTimeout) {
                      clearTimeout(window.domainCheckTimeout);
                    }
                    
                    // Debounce domain checking
                    if (value) {
                      window.domainCheckTimeout = setTimeout(() => {
                        checkDomainAvailability(value);
                      }, 500);
                    } else {
                      setDomainCheck({ checking: false, available: null, error: null });
                    }
                  }}
                  placeholder="e.g., yourname.art, mysite.com"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ced4da',
                    borderRadius: '2px',
                    fontSize: '14px'
                  }}
                />
                
                {domainCheck.checking && (
                  <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '5px' }}>
                    Checking availability...
                  </div>
                )}
                {domainCheck.available === true && (
                  <div style={{ fontSize: '12px', color: '#28a745', marginTop: '5px' }}>
                    ✓ Domain is available for use!
                  </div>
                )}
                {domainCheck.available === false && (
                  <div style={{ fontSize: '12px', color: '#dc3545', marginTop: '5px' }}>
                    ✗ {domainCheck.error}
                  </div>
                )}
                {newDomain && !domainCheck.checking && domainCheck.available === null && 
                 (!newDomain.includes('.') || !newDomain.match(/\.[a-z]{2,}$/i)) && (
                  <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '5px' }}>
                    💡 Enter a complete domain (e.g., yourname.art, mysite.com)
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    setShowAddDomain(false);
                    setNewDomain('');
                    setDomainCheck({ checking: false, available: null, error: null });
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={startDomainValidation}
                  disabled={!newDomain || domainCheck.available !== true || loading}
                  style={{
                    flex: 2,
                    padding: '8px 16px',
                    background: (!newDomain || domainCheck.available !== true || loading) ? '#ccc' : '#055474',
                    color: 'white',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: (!newDomain || domainCheck.available !== true || loading) ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {loading ? 'Adding...' : 'Add Domain'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
