// Websites Dashboard - Shown after all checklist gates passed
// Extracted from old WebSiteSubscriptions component

import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../lib/apiUtils';
import SiteCustomizer from '../../dashboard/my-subscriptions/components/website-components/SiteCustomizer';
import CustomDomainSection from '../../dashboard/my-subscriptions/components/website-components/CustomDomainSection';

export default function WebsitesDashboard({ subscriptionData, userData, onUpdate }) {
  const [loading, setLoading] = useState(true);
  const [userSites, setUserSites] = useState([]);
  const [expandedSite, setExpandedSite] = useState(null);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [availableAddons, setAvailableAddons] = useState([]);
  const [siteForm, setSiteForm] = useState({});
  const [isEditingSite, setIsEditingSite] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Tier-based feature gating (NEW UNIVERSAL PATTERN)
  const userTier = subscriptionData?.subscription?.tier;
  const canUseCustomDomain = ['Professional Plan', 'Business Plan', 'Promoter Plan', 'Promoter Business Plan'].includes(userTier);
  const canCreateMultipleSites = ['Business Plan', 'Promoter Business Plan'].includes(userTier);
  const canAccessPremiumAddons = userTier !== 'Starter Plan';

  useEffect(() => {
    fetchUserSites();
  }, [userData]);

  const fetchUserSites = async () => {
    try {
      const response = await authApiRequest('api/sites/me');
      const sites = await response.json();
      
      if (response.ok && Array.isArray(sites)) {
        setUserSites(sites);
      } else {
        console.error('Failed to fetch sites:', sites);
        setUserSites([]);
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
      setUserSites([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplatesAndAddons = async () => {
    try {
      // Fetch available templates
      const templatesResponse = await authApiRequest('api/sites/templates');
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setAvailableTemplates(templatesData.templates || []);
      }

      // Fetch available addons (only for manage_sites users)
      if (userData?.permissions?.includes('manage_sites')) {
        const addonsResponse = await authApiRequest('api/sites/addons');
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
      setExpandedSite(null);
      setIsEditingSite(false);
    } else {
      setExpandedSite(site.id);
      setSiteForm({
        site_name: site.site_name,
        site_title: site.site_title || '',
        site_description: site.site_description || '',
        template_id: site.template_id || 1,
        status: site.status
      });
      setIsEditingSite(false);
      
      if (availableTemplates.length === 0) {
        fetchTemplatesAndAddons();
      }
    }
  };

  const handleAddSite = () => {
    const isAdmin = userData?.user_type === 'admin';
    const isPromoter = userData?.user_type === 'promoter';
    
    // Tier-based site limit checking (NEW UNIVERSAL PATTERN)
    if (!isAdmin && !isPromoter && !canCreateMultipleSites && userSites.length >= 1) {
      alert(`Your current plan (${userTier}) allows for 1 website. Upgrade to Business or Promoter Business plan for unlimited websites.`);
      return;
    }
    
    setSiteForm({
      site_name: '',
      subdomain: '',
      site_title: '',
      site_description: '',
      template_id: '1'
    });
    setIsEditingSite(true);
    setExpandedSite('new');
  };

  const handleActivateSite = async (siteId) => {
    if (!confirm('Are you sure you want to activate this site? Once activated, it will be publicly accessible.')) {
      return;
    }

    try {
      setProcessing(true);
      
      const response = await authApiRequest(`api/sites/${siteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      });

      if (response.ok) {
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
        <div>Loading your websites...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Sites List */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '2px', 
        marginBottom: '30px' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: '0', color: '#495057' }}>Your Websites</h3>
          {(() => {
            const isAdmin = userData?.user_type === 'admin';
            const isPromoter = userData?.user_type === 'promoter';
            
            // Tier-based button visibility (NEW UNIVERSAL PATTERN)
            const canAddSite = isAdmin || isPromoter || canCreateMultipleSites || userSites.length === 0;
            
            if (canAddSite) {
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
                      {site.domain || `${site.subdomain}.beemeeart.com`} • 
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
                      href={`https://${site.domain || `${site.subdomain}.beemeeart.com`}`}
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

                {/* TODO: Add expandable site management when needed */}
                {expandedSite === site.id && (
                  <div style={{ padding: '20px' }}>
                    <p style={{ color: '#6c757d' }}>Site management details coming soon...</p>
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
              <p style={{ color: '#6c757d' }}>Site creation form coming soon...</p>
              <button
                onClick={() => {
                  setExpandedSite(null);
                  setIsEditingSite(false);
                }}
                style={{
                  padding: '8px 16px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Subscription Info */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '2px',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>Subscription Details</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'auto 1fr', 
          gap: '10px 20px',
          fontSize: '14px'
        }}>
          <div style={{ color: '#6c757d' }}>Plan:</div>
          <div style={{ color: '#2c3e50', fontWeight: 'bold' }}>
            {subscriptionData?.subscription?.tier || 'Not specified'}
          </div>
          
          <div style={{ color: '#6c757d' }}>Status:</div>
          <div style={{ color: subscriptionData?.subscription?.status === 'active' ? '#28a745' : '#6c757d' }}>
            {subscriptionData?.subscription?.status || 'Unknown'}
          </div>
          
          <div style={{ color: '#6c757d' }}>Payment Method:</div>
          <div style={{ color: '#2c3e50' }}>
            •••• •••• •••• {subscriptionData?.subscription?.cardLast4 || 'None on file'}
          </div>
        </div>
      </div>
    </div>
  );
}

