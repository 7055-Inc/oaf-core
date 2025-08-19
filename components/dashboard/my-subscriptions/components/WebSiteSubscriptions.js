import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest, refreshAuthToken } from '../../../../lib/csrf';
import PricingTiers from './website-components/PricingTiers';
import CustomDomainSection from './website-components/CustomDomainSection';
import SiteCustomizer from './website-components/SiteCustomizer';

export default function WebSiteSubscriptions({ userData }) {
  const [loading, setLoading] = useState(true);
  const [userSites, setUserSites] = useState([]);
  const [processing, setProcessing] = useState(false);

  // Module access state
  const [moduleState, setModuleState] = useState('loading'); // 'loading', 'dashboard', 'terms-required', 'signup'
  const [termsData, setTermsData] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [signupTermsAccepted, setSignupTermsAccepted] = useState(false);

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
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/sites/me');
      const sites = await response.json();
      
      if (response.ok && Array.isArray(sites)) {
        setUserSites(sites);
        setLoading(false);
      } else {
        console.error('Failed to fetch sites:', sites);
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

  const handleSubscriptionSuccess = () => {
    // Callback for when subscription is successful
    // Force token refresh and reload to update permissions
    refreshAuthToken().then(() => {
      window.location.reload();
    });
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

  const handleAddSite = () => {
    // Check tier limits before allowing site creation
    const isAdmin = userData?.user_type === 'admin';
    const isPromoter = userData?.user_type === 'promoter';
    const hasManageSites = userData?.permissions?.includes('manage_sites');
    const hasSitesPermission = userData?.permissions?.includes('sites');
    
    // Basic sites permission users are limited to 1 site
    if (hasSitesPermission && !hasManageSites && !isAdmin && !isPromoter && userSites.length >= 1) {
      alert('Your current plan allows for 1 website. Upgrade to Professional or Business plan for unlimited websites.');
      return;
    }
    
    // Create a new site form
    setSiteForm({
      site_name: '',
      subdomain: '',
      site_title: '',
      site_description: '',
      template_id: '1'
    });
    setIsEditingSite(true);
    setExpandedSite('new'); // Use 'new' as a special identifier for new site creation
  };

  const handleActivateSite = async (siteId) => {
    if (!confirm('Are you sure you want to activate this site? Once activated, it will be publicly accessible.')) {
      return;
    }

    try {
      setProcessing(true);
      
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/api/sites/${siteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'active'
        })
      });

      if (response.ok) {
        // Refresh the sites list to show updated status
        fetchUserSites();
        alert('Site activated successfully! Your website is now live and publicly accessible.');
      } else {
        const errorData = await response.json();
        alert(`Failed to activate site: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error activating site:', error);
      alert('Error activating site. Please try again.');
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: '0', color: '#495057' }}>Your Websites</h3>
            {/* Add Site Button - Tier-based visibility */}
            {(() => {
              const isAdmin = userData?.user_type === 'admin';
              const isPromoter = userData?.user_type === 'promoter';
              const hasManageSites = userData?.permissions?.includes('manage_sites');
              const hasSitesPermission = userData?.permissions?.includes('sites');
              
              // Admin and promoter users get unlimited sites
              if (isAdmin || isPromoter) {
                return (
                  <button
                    onClick={handleAddSite}
                    style={{
                      padding: '8px 16px',
                      background: '#055474',
                      color: 'white',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    + Add Site
                  </button>
                );
              }
              
              // Professional/Business users with manage_sites get unlimited sites
              if (hasManageSites) {
                return (
                  <button
                    onClick={handleAddSite}
                    style={{
                      padding: '8px 16px',
                      background: '#055474',
                      color: 'white',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    + Add Site
                  </button>
                );
              }
              
              // Basic 'sites' permission users get 1 site - hide button if they already have one
              if (hasSitesPermission && userSites.length === 0) {
                return (
                  <button
                    onClick={handleAddSite}
                    style={{
                      padding: '8px 16px',
                      background: '#055474',
                      color: 'white',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    + Add Site
                  </button>
                );
              }
              
              // No button for basic users who already have their 1 site
              return null;
            })()}
          </div>
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
                        {site.domain || `${site.subdomain}.onlineartfestival.com`} • 
                        <span style={{ 
                          color: site.status === 'active' ? '#28a745' : site.status === 'draft' ? '#ffc107' : '#dc3545',
                          fontWeight: 'bold',
                          marginLeft: '5px'
                        }}>
                          {site.status}
                        </span>
                        {site.status === 'draft' && (
                          <span style={{ color: '#6c757d', fontSize: '12px', marginLeft: '5px' }}>
                            (Not publicly accessible)
                          </span>
                        )}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {site.status === 'draft' && (
                        <button 
                          onClick={() => handleActivateSite(site.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        >
                          Activate Site
                        </button>
                      )}
                      <a 
                        href={`https://${site.domain || `${site.subdomain}.onlineartfestival.com`}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '6px 12px',
                          background: site.status === 'active' ? '#6c757d' : '#ccc',
                          color: 'white',
                          border: 'none',
                          borderRadius: '2px',
                          textDecoration: 'none',
                          fontSize: '12px',
                          cursor: site.status === 'active' ? 'pointer' : 'not-allowed'
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

          {/* New Site Creation Form */}
          {expandedSite === 'new' && (
            <div style={{
              background: 'white',
              border: '1px solid #dee2e6',
              borderRadius: '2px',
              marginTop: '10px'
            }}>
              <div style={{ 
                padding: '15px',
                borderBottom: '1px solid #dee2e6'
              }}>
                <h4 style={{ margin: '0', color: '#2c3e50' }}>Create New Website</h4>
              </div>
              <div style={{ padding: '20px' }}>
                <NewSiteForm 
                  siteForm={siteForm}
                  setSiteForm={setSiteForm}
                  availableTemplates={availableTemplates}
                  onSiteCreate={(newSite) => {
                    fetchUserSites();
                    setExpandedSite(null);
                    setIsEditingSite(false);
                  }}
                  onCancel={() => {
                    setExpandedSite(null);
                    setIsEditingSite(false);
                    setSiteForm({});
                  }}
                />
              </div>
            </div>
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
      <PricingTiers 
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
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
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
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/api/sites/${site.id}/addons`);
      if (response.ok) {
        const data = await response.json();
        setSiteAddons(data.addons || []);
      }
    } catch (error) {
      console.error('Error fetching site addons:', error);
    }
  };

  const handleAddonToggle = async (addon, isActive) => {
    try {
      setProcessing(true);
      setError(null);
      
      if (isActive) {
        // Remove addon
        const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/api/sites/addons/${addon.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          await fetchSiteAddons(); // Refresh the list
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to remove addon');
        }
      } else {
        // Add addon
        const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/api/sites/addons/${addon.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          await fetchSiteAddons(); // Refresh the list
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to add addon');
        }
      }
    } catch (error) {
      setError(`Error ${isActive ? 'removing' : 'adding'} addon`);
    } finally {
      setProcessing(false);
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

      {/* Site Customization */}
      <div style={{ marginBottom: '20px' }}>
        <SiteCustomizer 
          site={site}
          userData={userData}
          onUpdate={onSiteUpdate}
        />
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
                      onClick={() => handleAddonToggle(addon, true)}
                      disabled={processing}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        cursor: processing ? 'not-allowed' : 'pointer',
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
                      onClick={() => handleAddonToggle(addon, isActive)}
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

// New Site Creation Form Component
function NewSiteForm({ siteForm, setSiteForm, availableTemplates, onSiteCreate, onCancel }) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    // Validate required fields
    if (!siteForm.site_name || !siteForm.subdomain) {
      setError('Site name and subdomain are required');
      setCreating(false);
      return;
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
    if (!subdomainRegex.test(siteForm.subdomain) || siteForm.subdomain.length < 3 || siteForm.subdomain.length > 63) {
      setError('Subdomain must be 3-63 characters, alphanumeric and hyphens only');
      setCreating(false);
      return;
    }

    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_name: siteForm.site_name,
          subdomain: siteForm.subdomain,
          site_title: siteForm.site_title || siteForm.site_name,
          site_description: siteForm.site_description || '',
          theme_name: 'default'
        })
      });

      if (response.ok) {
        const newSite = await response.json();
        onSiteCreate(newSite);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create website');
      }
    } catch (err) {
      setError('Error creating website. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ 
          background: '#f8d7da', 
          color: '#721c24', 
          padding: '10px', 
          borderRadius: '2px', 
          marginBottom: '15px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#495057' }}>
          Site Name *
        </label>
        <input
          type="text"
          value={siteForm.site_name || ''}
          onChange={(e) => setSiteForm({...siteForm, site_name: e.target.value})}
          placeholder="My Art Gallery"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #dee2e6',
            borderRadius: '2px',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#495057' }}>
          Subdomain *
        </label>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            value={siteForm.subdomain || ''}
            onChange={(e) => setSiteForm({...siteForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
            placeholder="myartgallery"
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #dee2e6',
              borderRadius: '2px 0 0 2px',
              fontSize: '14px'
            }}
          />
          <span style={{
            padding: '8px 12px',
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderLeft: 'none',
            borderRadius: '0 2px 2px 0',
            fontSize: '14px',
            color: '#6c757d'
          }}>
            .onlineartfestival.com
          </span>
        </div>
        <small style={{ color: '#6c757d', fontSize: '12px' }}>
          3-63 characters, letters, numbers, and hyphens only
        </small>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#495057' }}>
          Site Title
        </label>
        <input
          type="text"
          value={siteForm.site_title || ''}
          onChange={(e) => setSiteForm({...siteForm, site_title: e.target.value})}
          placeholder="Welcome to My Art Gallery"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #dee2e6',
            borderRadius: '2px',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#495057' }}>
          Site Description
        </label>
        <textarea
          value={siteForm.site_description || ''}
          onChange={(e) => setSiteForm({...siteForm, site_description: e.target.value})}
          placeholder="Describe your website..."
          rows="3"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #dee2e6',
            borderRadius: '2px',
            fontSize: '14px',
            resize: 'vertical'
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
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
        <button
          type="submit"
          disabled={creating}
          style={{
            padding: '8px 16px',
            background: creating ? '#ccc' : '#055474',
            color: 'white',
            border: 'none',
            borderRadius: '2px',
            cursor: creating ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {creating ? 'Creating...' : 'Create Website'}
        </button>
      </div>
    </form>
  );
}
