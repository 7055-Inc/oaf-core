// Websites Dashboard - Shown after all checklist gates passed
// Extracted from old WebSiteSubscriptions component

import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../lib/apiUtils';
import { getSubdomainUrl, getSubdomainBase } from '../../../lib/config';
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
  const isAdminTier = userTier === 'Admin Plan';
  const canUseCustomDomain = isAdminTier || ['Professional Plan', 'Business Plan', 'Promoter Plan', 'Promoter Business Plan'].includes(userTier);
  const canCreateMultipleSites = isAdminTier || ['Business Plan', 'Promoter Business Plan'].includes(userTier);
  const canAccessPremiumAddons = isAdminTier || userTier !== 'Starter Plan';

  useEffect(() => {
    if (userData) {
      checkAndEnforceSiteLimits();
    }
  }, [userData]);

  const checkAndEnforceSiteLimits = async () => {
    try {
      setLoading(true);
      
      // Fetch sites first
      await fetchUserSites();
      
      // Check if user is over their tier limit
      const response = await authApiRequest('api/sites/enforce-limits');
      const result = await response.json();
      
      if (response.ok && result.sites_deactivated > 0) {
        alert(`⚠️ Tier Limit Enforced\n\nWe've deactivated ${result.sites_deactivated} site${result.sites_deactivated === 1 ? '' : 's'} to match your ${result.tier} plan.\n\nYour plan allows ${result.site_limit} active site${result.site_limit === 1 ? '' : 's'}. You may deactivate one site and reactivate another if you'd like to change which sites are active.`);
        
        // Refresh sites list to show the changes
        await fetchUserSites();
      }
    } catch (error) {
      console.error('Error checking site limits:', error);
      // Don't block the UI if this fails, just continue
      await fetchUserSites();
    } finally {
      setLoading(false);
    }
  };

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
        alert(`Failed to activate site: ${errorData.message || errorData.error}`);
      }
    } catch (error) {
      console.error('Error activating site:', error);
      alert('Error activating site. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeactivateSite = async (siteId) => {
    if (!confirm('Are you sure you want to deactivate this site? It will no longer be publicly accessible.')) {
      return;
    }

    try {
      setProcessing(true);
      
      const response = await authApiRequest(`api/sites/${siteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' })
      });

      if (response.ok) {
        fetchUserSites();
        alert('Site deactivated successfully. The site is now in draft mode and not publicly accessible.');
      } else {
        const errorData = await response.json();
        alert(`Failed to deactivate site: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error deactivating site:', error);
      alert('Error deactivating site. Please try again.');
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {(() => {
            const isAdmin = userData?.user_type === 'admin';
            const isPromoter = userData?.user_type === 'promoter';
            
              // Tier-based site limits
              const siteLimit = canCreateMultipleSites || isAdmin ? 999 : 1;
              const currentCount = userSites.length;
              const canAddSite = currentCount < siteLimit;
              
              return (
                <>
                <button
                  onClick={handleAddSite}
                    disabled={!canAddSite}
                  style={{
                    padding: '8px 16px',
                      background: canAddSite ? '#055474' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '2px',
                      cursor: canAddSite ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  + Add Site
                </button>
                  
                  {/* Show site count and limit */}
                  <span style={{ 
                    fontSize: '14px', 
                    color: currentCount > siteLimit ? '#dc3545' : '#6c757d',
                    fontWeight: currentCount > siteLimit ? 'bold' : 'normal'
                  }}>
                    {currentCount} of {siteLimit === 999 ? 'unlimited' : siteLimit} site{siteLimit === 1 ? '' : 's'}
                    {currentCount > siteLimit && ' (grandfathered)'}
                  </span>

                  {/* Upgrade hint if at or over limit */}
                  {!canAddSite && siteLimit < 999 && (
                    <span style={{ 
                      fontSize: '12px', 
                      color: currentCount > siteLimit ? '#856404' : '#dc3545',
                      backgroundColor: currentCount > siteLimit ? '#fff3cd' : '#f8d7da',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: `1px solid ${currentCount > siteLimit ? '#ffc107' : '#f5c6cb'}`
                    }}>
                      {currentCount > siteLimit 
                        ? 'Delete sites or upgrade to create more'
                        : 'Upgrade to Business or Promoter Business for multiple sites'
                      }
                    </span>
                  )}
                </>
              );
          })()}
          </div>
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
                      {site.domain || `${site.subdomain}.${getSubdomainBase()}`} • 
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
                    {site.status === 'active' && (
                      <button 
                        onClick={() => handleDeactivateSite(site.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#ffc107',
                          color: '#212529',
                          border: 'none',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      >
                        Deactivate Site
                      </button>
                    )}
                    <a 
                      href={site.domain ? `https://${site.domain}` : getSubdomainUrl(site.subdomain)}
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

                {/* Site Management Panel */}
                {expandedSite === site.id && (
                  <div style={{ padding: '20px' }}>
                    {/* Tab Navigation */}
                    <div style={{ 
                      display: 'flex', 
                      borderBottom: '2px solid #dee2e6', 
                      marginBottom: '20px',
                      gap: '5px'
                    }}>
                      <button
                        onClick={() => setSiteForm({ ...siteForm, activeTab: 'settings' })}
                        style={{
                          padding: '10px 20px',
                          background: (siteForm.activeTab || 'settings') === 'settings' ? '#055474' : 'transparent',
                          color: (siteForm.activeTab || 'settings') === 'settings' ? 'white' : '#495057',
                          border: 'none',
                          borderRadius: '4px 4px 0 0',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}
                      >
                        ⚙️ Site Settings
                      </button>
                      {canUseCustomDomain && (
                        <button
                          onClick={() => setSiteForm({ ...siteForm, activeTab: 'domain' })}
                          style={{
                            padding: '10px 20px',
                            background: siteForm.activeTab === 'domain' ? '#055474' : 'transparent',
                            color: siteForm.activeTab === 'domain' ? 'white' : '#495057',
                            border: 'none',
                            borderRadius: '4px 4px 0 0',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '14px'
                          }}
                        >
                          🌐 Custom Domain
                        </button>
                      )}
                      <button
                        onClick={() => setSiteForm({ ...siteForm, activeTab: 'customize' })}
                        style={{
                          padding: '10px 20px',
                          background: siteForm.activeTab === 'customize' ? '#055474' : 'transparent',
                          color: siteForm.activeTab === 'customize' ? 'white' : '#495057',
                          border: 'none',
                          borderRadius: '4px 4px 0 0',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}
                      >
                        🎨 Customize
                      </button>
                      <button
                        onClick={() => setSiteForm({ ...siteForm, activeTab: 'templates' })}
                        style={{
                          padding: '10px 20px',
                          background: siteForm.activeTab === 'templates' ? '#055474' : 'transparent',
                          color: siteForm.activeTab === 'templates' ? 'white' : '#495057',
                          border: 'none',
                          borderRadius: '4px 4px 0 0',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}
                      >
                        📋 Templates
                      </button>
                      <button
                        onClick={() => setSiteForm({ ...siteForm, activeTab: 'addons' })}
                        style={{
                          padding: '10px 20px',
                          background: siteForm.activeTab === 'addons' ? '#055474' : 'transparent',
                          color: siteForm.activeTab === 'addons' ? 'white' : '#495057',
                          border: 'none',
                          borderRadius: '4px 4px 0 0',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '14px'
                        }}
                      >
                        🧩 Addons
                      </button>
                    </div>

                    {/* Settings Tab */}
                    {(siteForm.activeTab || 'settings') === 'settings' && (
                      <div>
                        <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Site Settings</h4>
                        
                        <div style={{ marginBottom: '15px' }}>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#495057' }}>
                            Site Name
                          </label>
                          <input
                            type="text"
                            value={siteForm.site_name || ''}
                            onChange={(e) => setSiteForm({ ...siteForm, site_name: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid #ced4da',
                              borderRadius: '4px',
                              fontSize: '14px'
                            }}
                          />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#495057' }}>
                            Site Title (shown in browser tab)
                          </label>
                          <input
                            type="text"
                            value={siteForm.site_title || ''}
                            onChange={(e) => setSiteForm({ ...siteForm, site_title: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid #ced4da',
                              borderRadius: '4px',
                              fontSize: '14px'
                            }}
                          />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#495057' }}>
                            Site Description (for SEO)
                          </label>
                          <textarea
                            value={siteForm.site_description || ''}
                            onChange={(e) => setSiteForm({ ...siteForm, site_description: e.target.value })}
                            rows="3"
                            style={{
                              width: '100%',
                              padding: '8px',
                              border: '1px solid #ced4da',
                              borderRadius: '4px',
                              fontSize: '14px',
                              resize: 'vertical'
                            }}
                          />
                        </div>

                        <button
                          onClick={async () => {
                            try {
                              setProcessing(true);
                              const response = await authApiRequest(`api/sites/${site.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  site_name: siteForm.site_name,
                                  site_title: siteForm.site_title,
                                  site_description: siteForm.site_description
                                })
                              });
                              if (response.ok) {
                                alert('Site settings saved!');
                                fetchUserSites();
                              } else {
                                const err = await response.json();
                                alert(`Error: ${err.error || 'Failed to save'}`);
                              }
                            } catch (err) {
                              alert('Error saving settings');
                            } finally {
                              setProcessing(false);
                            }
                          }}
                          disabled={processing}
                          style={{
                            padding: '10px 20px',
                            background: processing ? '#6c757d' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: processing ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          {processing ? 'Saving...' : 'Save Settings'}
                        </button>
                      </div>
                    )}

                    {/* Custom Domain Tab */}
                    {siteForm.activeTab === 'domain' && canUseCustomDomain && (
                      <div>
                        <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Custom Domain</h4>
                        <CustomDomainSection site={site} />
                      </div>
                    )}

                    {/* Customize Tab */}
                    {siteForm.activeTab === 'customize' && (
                      <div>
                        <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Site Customization</h4>
                        <SiteCustomizer 
                          site={site} 
                          userData={userData} 
                          onUpdate={fetchUserSites}
                        />
                      </div>
                    )}

                    {/* Templates Tab */}
                    {siteForm.activeTab === 'templates' && (
                      <div>
                        <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Choose Template</h4>
                        <p style={{ color: '#6c757d', marginBottom: '20px', fontSize: '14px' }}>
                          Select a template to change the look and feel of your site. Your content will be preserved.
                        </p>
                        
                        {availableTemplates.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                            Loading templates...
                          </div>
                        ) : (
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                            gap: '20px' 
                          }}>
                            {availableTemplates.map(template => {
                              const isCurrentTemplate = site.template_id === template.id;
                              const tierLocked = template.tier_required && 
                                !isAdminTier &&
                                !['Professional Plan', 'Business Plan', 'Promoter Plan', 'Promoter Business Plan'].includes(userTier) &&
                                template.tier_required !== 'Starter Plan';
                              
                              return (
                                <div 
                                  key={template.id}
                                  style={{
                                    border: isCurrentTemplate ? '3px solid #055474' : '1px solid #dee2e6',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    background: 'white',
                                    opacity: tierLocked ? 0.7 : 1
                                  }}
                                >
                                  {/* Template Preview */}
                                  <div style={{ 
                                    height: '150px', 
                                    background: template.preview_image_url 
                                      ? `url(${template.preview_image_url}) center/cover` 
                                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    {!template.preview_image_url && (
                                      <span style={{ color: 'white', fontSize: '2rem' }}>📋</span>
                                    )}
                                    {isCurrentTemplate && (
                                      <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        right: '10px',
                                        background: '#055474',
                                        color: 'white',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 'bold'
                                      }}>
                                        CURRENT
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Template Info */}
                                  <div style={{ padding: '15px' }}>
                                    <h5 style={{ margin: '0 0 8px 0', color: '#2c3e50' }}>
                                      {template.template_name}
                                      {tierLocked && <span style={{ marginLeft: '8px', fontSize: '12px' }}>🔒</span>}
                                    </h5>
                                    <p style={{ 
                                      margin: '0 0 12px 0', 
                                      fontSize: '13px', 
                                      color: '#6c757d',
                                      minHeight: '40px'
                                    }}>
                                      {template.description || 'A beautiful template for your site.'}
                                    </p>
                                    
                                    {tierLocked ? (
                                      <div style={{
                                        padding: '8px',
                                        background: '#fff3cd',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        color: '#856404',
                                        textAlign: 'center'
                                      }}>
                                        Requires {template.tier_required}
                                      </div>
                                    ) : isCurrentTemplate ? (
                                      <button
                                        disabled
                                        style={{
                                          width: '100%',
                                          padding: '8px',
                                          background: '#e9ecef',
                                          color: '#6c757d',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: 'not-allowed',
                                          fontWeight: 'bold'
                                        }}
                                      >
                                        ✓ Active
                                      </button>
                                    ) : (
                                      <button
                                        onClick={async () => {
                                          if (!confirm(`Switch to "${template.template_name}" template? Your content will be preserved.`)) return;
                                          try {
                                            setProcessing(true);
                                            const response = await authApiRequest(`api/sites/${site.id}`, {
                                              method: 'PUT',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ template_id: template.id })
                                            });
                                            if (response.ok) {
                                              alert('Template updated successfully!');
                                              fetchUserSites();
                                            } else {
                                              const err = await response.json();
                                              alert(`Error: ${err.error || 'Failed to update template'}`);
                                            }
                                          } catch (err) {
                                            alert('Error updating template');
                                          } finally {
                                            setProcessing(false);
                                          }
                                        }}
                                        disabled={processing}
                                        style={{
                                          width: '100%',
                                          padding: '8px',
                                          background: processing ? '#6c757d' : '#055474',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: processing ? 'not-allowed' : 'pointer',
                                          fontWeight: 'bold'
                                        }}
                                      >
                                        {processing ? 'Applying...' : 'Use This Template'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Addons Tab */}
                    {siteForm.activeTab === 'addons' && (
                      <div>
                        <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Site Addons</h4>
                        <p style={{ color: '#6c757d', marginBottom: '20px', fontSize: '14px' }}>
                          Enhance your site with powerful addons. Some addons apply to your account, others are site-specific.
                        </p>

                        {!canAccessPremiumAddons && (
                          <div style={{
                            padding: '15px',
                            background: '#fff3cd',
                            border: '1px solid #ffc107',
                            borderRadius: '4px',
                            marginBottom: '20px'
                          }}>
                            <strong>🔒 Premium Addons</strong>
                            <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
                              Upgrade from Starter Plan to access premium addons.
                            </p>
                          </div>
                        )}
                        
                        {availableAddons.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                            Loading addons...
                          </div>
                        ) : (
                          <div>
                            {/* Group addons by category */}
                            {['site_features', 'user_features', 'marketplace', 'other'].map(category => {
                              const categoryAddons = availableAddons.filter(a => 
                                (a.category || 'other').toLowerCase() === category.toLowerCase()
                              );
                              if (categoryAddons.length === 0) return null;
                              
                              const categoryLabels = {
                                'site_features': '🌐 Site Features',
                                'user_features': '👤 Account Features', 
                                'marketplace': '🛒 Marketplace Connectors',
                                'other': '📦 Other'
                              };
                              
                              return (
                                <div key={category} style={{ marginBottom: '25px' }}>
                                  <h5 style={{ 
                                    margin: '0 0 15px 0', 
                                    color: '#495057',
                                    borderBottom: '1px solid #dee2e6',
                                    paddingBottom: '8px'
                                  }}>
                                    {categoryLabels[category] || category}
                                  </h5>
                                  
                                  <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                                    gap: '15px' 
                                  }}>
                                    {categoryAddons.map(addon => {
                                      const tierLocked = addon.tier_required && 
                                        !canAccessPremiumAddons &&
                                        addon.tier_required !== 'Starter Plan';
                                      const alreadyHas = addon.user_already_has;
                                      
                                      return (
                                        <div 
                                          key={addon.id}
                                          style={{
                                            border: alreadyHas ? '2px solid #28a745' : '1px solid #dee2e6',
                                            borderRadius: '8px',
                                            padding: '15px',
                                            background: 'white',
                                            opacity: tierLocked ? 0.7 : 1
                                          }}
                                        >
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                            <div>
                                              <h6 style={{ margin: '0 0 4px 0', color: '#2c3e50' }}>
                                                {addon.addon_name}
                                                {tierLocked && <span style={{ marginLeft: '6px' }}>🔒</span>}
                                              </h6>
                                              <span style={{
                                                fontSize: '11px',
                                                padding: '2px 6px',
                                                borderRadius: '10px',
                                                background: addon.addon_scope === 'user' ? '#e3f2fd' : '#f3e5f5',
                                                color: addon.addon_scope === 'user' ? '#1565c0' : '#7b1fa2'
                                              }}>
                                                {addon.addon_scope === 'user' ? '👤 Account-wide' : '🌐 Site-specific'}
                                              </span>
                                            </div>
                                            {addon.monthly_price > 0 && (
                                              <div style={{ 
                                                fontSize: '14px', 
                                                fontWeight: 'bold', 
                                                color: '#28a745' 
                                              }}>
                                                ${addon.monthly_price}/mo
                                              </div>
                                            )}
                                            {addon.monthly_price === 0 && (
                                              <div style={{ 
                                                fontSize: '12px', 
                                                fontWeight: 'bold', 
                                                color: '#6c757d',
                                                background: '#e9ecef',
                                                padding: '2px 8px',
                                                borderRadius: '10px'
                                              }}>
                                                FREE
                                              </div>
                                            )}
                                          </div>
                                          
                                          <p style={{ 
                                            margin: '0 0 12px 0', 
                                            fontSize: '13px', 
                                            color: '#6c757d',
                                            minHeight: '36px'
                                          }}>
                                            {addon.description || 'Enhance your site with this addon.'}
                                          </p>
                                          
                                          {tierLocked ? (
                                            <div style={{
                                              padding: '6px',
                                              background: '#fff3cd',
                                              borderRadius: '4px',
                                              fontSize: '12px',
                                              color: '#856404',
                                              textAlign: 'center'
                                            }}>
                                              Requires {addon.tier_required}
                                            </div>
                                          ) : alreadyHas ? (
                                            <button
                                              onClick={async () => {
                                                if (!confirm(`Disable "${addon.addon_name}"?`)) return;
                                                try {
                                                  setProcessing(true);
                                                  const endpoint = addon.addon_scope === 'user' 
                                                    ? `api/sites/user-addons/${addon.id}`
                                                    : `api/sites/${site.id}/addons/${addon.id}`;
                                                  const response = await authApiRequest(endpoint, {
                                                    method: 'DELETE'
                                                  });
                                                  if (response.ok) {
                                                    alert('Addon disabled!');
                                                    fetchTemplatesAndAddons();
                                                  } else {
                                                    const err = await response.json();
                                                    alert(`Error: ${err.error || 'Failed to disable addon'}`);
                                                  }
                                                } catch (err) {
                                                  alert('Error disabling addon');
                                                } finally {
                                                  setProcessing(false);
                                                }
                                              }}
                                              disabled={processing}
                                              style={{
                                                width: '100%',
                                                padding: '8px',
                                                background: '#dc3545',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: processing ? 'not-allowed' : 'pointer',
                                                fontWeight: 'bold',
                                                fontSize: '13px'
                                              }}
                                            >
                                              ✓ Enabled - Click to Disable
                                            </button>
                                          ) : (
                                            <button
                                              onClick={async () => {
                                                const priceNote = addon.monthly_price > 0 
                                                  ? ` This will add $${addon.monthly_price}/month to your subscription.` 
                                                  : '';
                                                if (!confirm(`Enable "${addon.addon_name}"?${priceNote}`)) return;
                                                try {
                                                  setProcessing(true);
                                                  const endpoint = addon.addon_scope === 'user' 
                                                    ? `api/sites/user-addons/${addon.id}`
                                                    : `api/sites/${site.id}/addons/${addon.id}`;
                                                  const response = await authApiRequest(endpoint, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ addon_id: addon.id })
                                                  });
                                                  if (response.ok) {
                                                    alert('Addon enabled!');
                                                    fetchTemplatesAndAddons();
                                                  } else {
                                                    const err = await response.json();
                                                    alert(`Error: ${err.error || 'Failed to enable addon'}`);
                                                  }
                                                } catch (err) {
                                                  alert('Error enabling addon');
                                                } finally {
                                                  setProcessing(false);
                                                }
                                              }}
                                              disabled={processing}
                                              style={{
                                                width: '100%',
                                                padding: '8px',
                                                background: processing ? '#6c757d' : '#28a745',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: processing ? 'not-allowed' : 'pointer',
                                                fontWeight: 'bold',
                                                fontSize: '13px'
                                              }}
                                            >
                                              {processing ? 'Processing...' : 'Enable Addon'}
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Upgrade prompt for non-Pro users trying to access domain */}
                    {!canUseCustomDomain && (
                      <div style={{
                        marginTop: '20px',
                        padding: '15px',
                        background: '#fff3cd',
                        border: '1px solid #ffc107',
                        borderRadius: '4px'
                      }}>
                        <strong>🔒 Custom Domain</strong>
                        <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
                          Upgrade to Professional Plan or higher to use your own custom domain.
                        </p>
                      </div>
                    )}
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
              {processing && (
                <div style={{ 
                  padding: '10px', 
                  backgroundColor: '#fff3cd', 
                  border: '1px solid #ffc107',
                  borderRadius: '4px',
                  marginBottom: '15px',
                  color: '#856404'
                }}>
                  Creating your website...
                </div>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                setProcessing(true);

                try {
                  const formData = {
                    site_name: siteForm.site_name,
                    subdomain: siteForm.subdomain,
                    site_title: siteForm.site_title || siteForm.site_name,
                    site_description: siteForm.site_description || '',
                    theme_name: 'default'
                  };

                  const response = await authApiRequest('api/sites', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                  });

                  const result = await response.json();

                  if (response.ok) {
                    alert('Website created successfully!');
                    setSiteForm({});
                    setExpandedSite(null);
                    setIsEditingSite(false);
                    fetchUserSites(); // Reload sites list
                  } else {
                    if (result.message) {
                      alert(`Error: ${result.message}`);
                    } else {
                      alert(`Error: ${result.error || 'Failed to create site'}`);
                    }
                  }
                } catch (error) {
                  console.error('Error creating site:', error);
                  alert('An error occurred while creating your site');
                } finally {
                  setProcessing(false);
                }
              }}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#495057' }}>
                    Site Name <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={siteForm.site_name || ''}
                    onChange={(e) => setSiteForm({ ...siteForm, site_name: e.target.value })}
                    placeholder="My Art Portfolio"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  <small style={{ color: '#6c757d' }}>Internal name for your site</small>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#495057' }}>
                    Subdomain <span style={{ color: 'red' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      required
                      value={siteForm.subdomain || ''}
                      onChange={(e) => {
                        // Clean input: lowercase, alphanumeric and hyphens only
                        const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                        setSiteForm({ ...siteForm, subdomain: cleaned });
                      }}
                      placeholder="myportfolio"
                      pattern="^[a-z0-9]([a-z0-9-]*[a-z0-9])?$"
                      minLength="3"
                      maxLength="63"
                      style={{
                        flex: 1,
                        padding: '8px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px 0 0 4px',
                        fontSize: '14px'
                      }}
                    />
                    <span style={{
                      padding: '8px 12px',
                      backgroundColor: '#e9ecef',
                      border: '1px solid #ced4da',
                      borderLeft: 'none',
                      borderRadius: '0 4px 4px 0',
                      fontSize: '14px',
                      color: '#495057'
                    }}>
                      .brakebee.com
                    </span>
                  </div>
                  <small style={{ color: '#6c757d' }}>3-63 characters, letters, numbers, and hyphens only</small>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#495057' }}>
                    Site Title
                  </label>
                  <input
                    type="text"
                    value={siteForm.site_title || ''}
                    onChange={(e) => setSiteForm({ ...siteForm, site_title: e.target.value })}
                    placeholder="Artist Portfolio - John Doe"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  <small style={{ color: '#6c757d' }}>Public title shown in browser tabs (defaults to site name)</small>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#495057' }}>
                    Site Description
                  </label>
                  <textarea
                    value={siteForm.site_description || ''}
                    onChange={(e) => setSiteForm({ ...siteForm, site_description: e.target.value })}
                    placeholder="A beautiful portfolio showcasing my artwork..."
                    rows="3"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                  <small style={{ color: '#6c757d' }}>Brief description for search engines (optional)</small>
                </div>

                <div style={{ 
                  display: 'flex', 
                  gap: '10px',
                  marginTop: '20px'
                }}>
                  <button
                    type="submit"
                    disabled={processing}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: processing ? '#6c757d' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: processing ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {processing ? 'Creating...' : 'Create Website'}
                  </button>
              <button
                    type="button"
                onClick={() => {
                  setExpandedSite(null);
                  setIsEditingSite(false);
                      setSiteForm({});
                }}
                    disabled={processing}
                style={{
                      padding: '10px 20px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                      borderRadius: '4px',
                      fontSize: '14px',
                      cursor: processing ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
                </div>
              </form>
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
          fontSize: '14px',
          marginBottom: '15px'
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

        <UpgradeTierButton 
          currentTier={subscriptionData?.subscription?.tier}
          currentPrice={subscriptionData?.subscription?.tierPrice}
          onUpgradeComplete={onUpdate}
        />
      </div>
    </div>
  );
}

// Upgrade Tier Button Component
function UpgradeTierButton({ currentTier, currentPrice, onUpgradeComplete }) {
  const [showUpgradeOptions, setShowUpgradeOptions] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState(null);

  // Define all available tiers
  const allTiers = [
    { name: "Starter Plan", price: 14.99, description: "Basic features for getting started" },
    { name: "Professional Plan", price: 24.95, description: "Professional brand building tools" },
    { name: "Business Plan", price: 49.95, description: "Advanced business features" },
    { name: "Promoter Plan", price: 49.95, description: "Event promotion tools" },
    { name: "Promoter Business Plan", price: 79.95, description: "Full event business suite" }
  ];

  // Filter to show all tiers except current (allow both upgrades and downgrades)
  const availableTiers = allTiers.filter(tier => {
    if (tier.name === currentTier) return false;
    
    // Show all other tiers (upgrades, downgrades, and track switches)
    return true;
  });

  const handleChangeTier = async (newTier) => {
    // Build confirmation message
    let confirmMessage = `Switch to ${newTier.name} for $${newTier.price}/month?\n\nYou'll be charged a prorated amount for the remainder of this billing cycle.`;
    
    // Check if this is a downgrade that might affect site limits
    const tierLimits = {
      "Starter Plan": 1,
      "Professional Plan": 1,
      "Business Plan": 999,
      "Promoter Plan": 1,
      "Promoter Business Plan": 999
    };
    
    const newTierLimit = tierLimits[newTier.name] || 1;
    const currentTierLimit = tierLimits[currentTier] || 1;
    
    if (newTierLimit < currentTierLimit) {
      confirmMessage += `\n\n⚠️ NOTE: This plan allows ${newTierLimit} site${newTierLimit === 1 ? '' : 's'}. Your existing sites will remain active, but you won't be able to create new sites if you exceed the limit.`;
    }
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setProcessing(true);
    setMessage(null);

    try {
      const response = await authApiRequest('api/subscriptions/websites/change-tier', {
        method: 'POST',
        body: JSON.stringify({
          new_tier_name: newTier.name,
          new_tier_price: newTier.price
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        let successMessage = `Successfully changed to ${newTier.name}! ${result.billing_note}`;
        
        setMessage({
          type: 'success',
          text: successMessage
        });
        setShowUpgradeOptions(false);
        
        // Refresh subscription data
        if (onUpgradeComplete) {
          setTimeout(() => onUpgradeComplete(), 2000);
        }
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to change tier'
        });
      }
    } catch (error) {
      console.error('Error changing tier:', error);
      setMessage({
        type: 'error',
        text: 'An error occurred while changing your tier'
      });
    } finally {
      setProcessing(false);
    }
  };

  if (availableTiers.length === 0) {
    return (
      <div style={{ 
        padding: '10px', 
        backgroundColor: '#d4edda', 
        border: '1px solid #c3e6cb',
        borderRadius: '4px',
        color: '#155724',
        fontSize: '14px'
      }}>
        ✅ You're on the highest tier available!
      </div>
    );
  }

  return (
    <div>
      {message && (
        <div style={{
          padding: '10px',
          marginBottom: '10px',
          backgroundColor: message.type === 'success' ? '#d4edda' : message.type === 'warning' ? '#fff3cd' : '#f8d7da',
          border: `1px solid ${message.type === 'success' ? '#c3e6cb' : message.type === 'warning' ? '#ffc107' : '#f5c6cb'}`,
          borderRadius: '4px',
          color: message.type === 'success' ? '#155724' : message.type === 'warning' ? '#856404' : '#721c24',
          fontSize: '14px',
          whiteSpace: 'pre-line'
        }}>
          {message.text}
        </div>
      )}

      {!showUpgradeOptions ? (
        <button
          onClick={() => setShowUpgradeOptions(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            width: '100%'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
        >
          🚀 Upgrade or Change Plan
        </button>
      ) : (
        <div style={{ 
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          padding: '15px',
          backgroundColor: 'white'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '15px'
          }}>
            <h4 style={{ margin: 0, color: '#495057' }}>Available Plans</h4>
            <button
              onClick={() => setShowUpgradeOptions(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#6c757d'
              }}
            >
              ✕
            </button>
          </div>

          {availableTiers.map((tier) => {
            const isUpgrade = tier.price > (currentPrice || 0);
            const isDowngrade = tier.price < (currentPrice || 0);
            const buttonColor = isUpgrade ? '#28a745' : isDowngrade ? '#fd7e14' : '#007bff';
            const buttonHoverColor = isUpgrade ? '#218838' : isDowngrade ? '#e67700' : '#0056b3';
            
            return (
              <div 
                key={tier.name}
                style={{
                  padding: '12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  marginBottom: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: '#2c3e50', marginBottom: '4px' }}>
                    {tier.name}
                    {isUpgrade && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#28a745' }}>⬆️ Upgrade</span>}
                    {isDowngrade && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#fd7e14' }}>⬇️ Downgrade</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
                    {tier.description}
                  </div>
                  <div style={{ fontSize: '16px', color: '#28a745', fontWeight: 'bold' }}>
                    ${tier.price}/month
                  </div>
                </div>
                <button
                  onClick={() => handleChangeTier(tier)}
                  disabled={processing}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: processing ? '#6c757d' : buttonColor,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: processing ? 'not-allowed' : 'pointer',
                    marginLeft: '15px'
                  }}
                  onMouseOver={(e) => !processing && (e.target.style.backgroundColor = buttonHoverColor)}
                  onMouseOut={(e) => !processing && (e.target.style.backgroundColor = buttonColor)}
                >
                  {processing ? 'Processing...' : 'Select'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

