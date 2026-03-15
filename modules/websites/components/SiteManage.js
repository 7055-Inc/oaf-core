/**
 * Site Manage – Single-site management page (settings, domain, customize, templates, addons).
 * Activate (if draft) / Deactivate (if active) at top. Uses global CSS and existing
 * SiteCustomizer, CustomDomainSection in this module.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { fetchMySites, updateSite, fetchTemplates, applyTemplate as applyTemplateApi, fetchAddons, enableSiteAddon, disableSiteAddon, enableUserAddon, disableUserAddon } from '../../../lib/websites';
import { getSubdomainBase } from '../../../lib/config';
import SiteCustomizer from './SiteCustomizer';
import CustomDomainSection from './CustomDomainSection';

const TAB_SETTINGS = 'settings';
const TAB_DOMAIN = 'domain';
const TAB_CUSTOMIZE = 'customize';
const TAB_TEMPLATES = 'templates';
const TAB_ADDONS = 'addons';

export default function SiteManage({ siteId, userData, subscriptionData, onSiteUpdated }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [site, setSite] = useState(null);
  const [activeTab, setActiveTab] = useState(TAB_SETTINGS);
  const [siteForm, setSiteForm] = useState({});
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [availableAddons, setAvailableAddons] = useState([]);
  const [processing, setProcessing] = useState(false);

  const userTier = subscriptionData?.subscription?.tier;
  const isAdminTier = userTier === 'Admin Plan';
  const canUseCustomDomain = isAdminTier || ['Professional Plan', 'Business Plan', 'Promoter Plan', 'Promoter Business Plan'].includes(userTier);
  const canAccessPremiumAddons = isAdminTier || userTier !== 'Starter Plan';

  useEffect(() => {
    if (!siteId) return;
    loadSite();
  }, [siteId]);

  const loadSite = async () => {
    try {
      setLoading(true);
      const sites = await fetchMySites();
      if (!Array.isArray(sites)) {
        setSite(null);
        return;
      }
      const found = sites.find(s => String(s.id) === String(siteId));
      setSite(found || null);
      if (found) {
        setSiteForm({
          site_name: found.site_name,
          site_title: found.site_title || '',
          site_description: found.site_description || '',
          template_id: found.template_id || 1,
          status: found.status
        });
        if (activeTab === TAB_TEMPLATES || activeTab === TAB_ADDONS) {
          fetchTemplatesAndAddons();
        }
      }
    } catch (err) {
      console.error('Error loading site:', err);
      setSite(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplatesAndAddons = async () => {
    try {
      const templates = await fetchTemplates();
      setAvailableTemplates(templates);
      if (userData?.permissions?.includes('manage_sites')) {
        const addons = await fetchAddons();
        setAvailableAddons(addons);
      }
    } catch (err) {
      console.error('Error fetching templates/addons:', err);
    }
  };

  useEffect(() => {
    if (site && (activeTab === TAB_TEMPLATES || activeTab === TAB_ADDONS)) {
      fetchTemplatesAndAddons();
    }
  }, [site?.id, activeTab]);

  const handleActivate = async () => {
    if (!confirm('Activate this site? It will be publicly accessible.')) return;
    try {
      setProcessing(true);
      await updateSite(site.id, { status: 'active' });
      await loadSite();
      if (onSiteUpdated) onSiteUpdated();
    } catch (err) {
      alert(err.message || 'Error activating site.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm('Deactivate this site? It will no longer be publicly accessible.')) return;
    try {
      setProcessing(true);
      await updateSite(site.id, { status: 'draft' });
      await loadSite();
      if (onSiteUpdated) onSiteUpdated();
    } catch (err) {
      alert(err.message || 'Error deactivating site.');
    } finally {
      setProcessing(false);
    }
  };

  const saveSettings = async () => {
    try {
      setProcessing(true);
      await updateSite(site.id, {
        site_name: siteForm.site_name,
        site_title: siteForm.site_title,
        site_description: siteForm.site_description
      });
      await loadSite();
    } catch (err) {
      alert(err.message || 'Failed to save');
    } finally {
      setProcessing(false);
    }
  };

  const applyTemplate = async (templateId) => {
    try {
      setProcessing(true);
      await applyTemplateApi(templateId);
      await loadSite();
      fetchTemplatesAndAddons();
    } catch (err) {
      alert(err.message || 'Failed to update template');
    } finally {
      setProcessing(false);
    }
  };

  const toggleAddon = async (addon, enable) => {
    try {
      setProcessing(true);
      if (addon.addon_scope === 'user') {
        if (enable) await enableUserAddon(addon.id);
        else await disableUserAddon(addon.id);
      } else {
        if (enable) await enableSiteAddon(site.id, addon.id);
        else await disableSiteAddon(site.id, addon.id);
      }
      await fetchTemplatesAndAddons();
    } catch (err) {
      alert(err.message || (enable ? 'Failed to enable' : 'Failed to disable'));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading site...</p>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ marginBottom: '16px' }}>Site not found.</p>
        <Link href="/dashboard/websites/mine" className="primary">Back to My Sites</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="content-header-actions" style={{ marginBottom: '16px' }}>
        <Link href="/dashboard/websites/mine" className="secondary">
          <i className="fa-solid fa-arrow-left" style={{ marginRight: '6px' }} />
          Back to My Sites
        </Link>
      </div>

      <div className="form-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0' }}>{site.site_name}</h2>
            <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
              {site.domain || `${site.subdomain}.${getSubdomainBase()}`}
              <span className={`status-badge ${site.status === 'active' ? 'published' : 'draft'}`} style={{ marginLeft: '8px' }}>
                {site.status}
              </span>
            </p>
          </div>
          <div className="site-card-actions">
            {site.status === 'draft' && (
              <button type="button" className="primary" onClick={handleActivate} disabled={processing}>
                Activate Site
              </button>
            )}
            {site.status === 'active' && (
              <button type="button" className="warning" onClick={handleDeactivate} disabled={processing}>
                Deactivate Site
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="tab-nav-sites">
        <button type="button" className={activeTab === TAB_SETTINGS ? 'active' : ''} onClick={() => setActiveTab(TAB_SETTINGS)}>
          Site Settings
        </button>
        {canUseCustomDomain && (
          <button type="button" className={activeTab === TAB_DOMAIN ? 'active' : ''} onClick={() => setActiveTab(TAB_DOMAIN)}>
            Custom Domain
          </button>
        )}
        <button type="button" className={activeTab === TAB_CUSTOMIZE ? 'active' : ''} onClick={() => setActiveTab(TAB_CUSTOMIZE)}>
          Customize
        </button>
        <button type="button" className={activeTab === TAB_TEMPLATES ? 'active' : ''} onClick={() => setActiveTab(TAB_TEMPLATES)}>
          Templates
        </button>
        <button type="button" className={activeTab === TAB_ADDONS ? 'active' : ''} onClick={() => setActiveTab(TAB_ADDONS)}>
          Addons
        </button>
      </div>

      <div className="form-card">
        {activeTab === TAB_SETTINGS && (
          <div>
            <h4 style={{ margin: '0 0 16px 0' }}>Site Settings</h4>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Site Name</label>
              <input
                type="text"
                className="form-input"
                value={siteForm.site_name || ''}
                onChange={(e) => setSiteForm({ ...siteForm, site_name: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Site Title (browser tab)</label>
              <input
                type="text"
                className="form-input"
                value={siteForm.site_title || ''}
                onChange={(e) => setSiteForm({ ...siteForm, site_title: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Site Description (SEO)</label>
              <textarea
                className="form-input"
                rows={3}
                value={siteForm.site_description || ''}
                onChange={(e) => setSiteForm({ ...siteForm, site_description: e.target.value })}
              />
            </div>
            <button type="button" className="primary" onClick={saveSettings} disabled={processing}>
              {processing ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}

        {activeTab === TAB_DOMAIN && canUseCustomDomain && (
          <div>
            <h4 style={{ margin: '0 0 16px 0' }}>Custom Domain</h4>
            <CustomDomainSection site={site} />
          </div>
        )}

        {activeTab === TAB_CUSTOMIZE && (
          <div>
            <SiteCustomizer site={site} userData={userData} onUpdate={loadSite} />
          </div>
        )}

        {activeTab === TAB_TEMPLATES && (
          <div>
            <h4 style={{ margin: '0 0 16px 0' }}>Choose Template</h4>
            <p className="form-help" style={{ marginBottom: '20px' }}>
              Select a template to change the look and feel. Your content will be preserved.
            </p>
            {availableTemplates.length === 0 ? (
              <div className="loading-state">Loading templates...</div>
            ) : (
              <div className="sites-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
                {availableTemplates.map((template) => {
                  const isCurrent = site.template_id === template.id;
                  const templateTierLevel = { free: 0, basic: 1, pro: 2, premium: 3 }[template.tier_required] ?? 0;
                  const tierKey = (userTier || '').toLowerCase().replace(/\s*plan\s*/gi, '');
                  const userTierLevel = isAdminTier || tierKey === 'admin' ? 99
                    : ['professional', 'business', 'promoter', 'promoterbusiness', 'pro'].includes(tierKey) ? 2
                    : tierKey === 'basic' ? 1
                    : 0;
                  const tierLocked = templateTierLevel > userTierLevel;
                  return (
                    <div key={template.id} className="site-card" style={{ opacity: tierLocked ? 0.7 : 1 }}>
                      <div style={{ height: '120px', background: template.preview_image_url ? `url(${template.preview_image_url}) center/cover` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '8px', marginBottom: '12px' }} />
                      <h5 style={{ margin: '0 0 8px 0' }}>{template.template_name}{tierLocked ? ' 🔒' : ''}</h5>
                      <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6c757d' }}>{template.description || 'A beautiful template.'}</p>
                      {tierLocked ? (
                        <Link href="/dashboard/websites/subscription" style={{ fontSize: '13px', color: '#856404' }}>
                          Upgrade to {template.tier_required} tier to use this template
                        </Link>
                      ) : isCurrent ? (
                        <button type="button" className="secondary" disabled>Current</button>
                      ) : (
                        <button type="button" className="primary" disabled={processing} onClick={() => confirm(`Switch to "${template.template_name}"?`) && applyTemplate(template.id)}>
                          Use This Template
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === TAB_ADDONS && (
          <div>
            <h4 style={{ margin: '0 0 16px 0' }}>Site Addons</h4>
            <p className="form-help" style={{ marginBottom: '20px' }}>Enable addons for this site or your account.</p>
            {!canAccessPremiumAddons && (
              <div className="warning-alert" style={{ marginBottom: '20px' }}>
                Upgrade from Starter Plan to access premium addons.
              </div>
            )}
            {availableAddons.length === 0 ? (
              <div className="loading-state">Loading addons...</div>
            ) : (
              <div className="sites-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {availableAddons.map((addon) => {
                  const tierLocked = addon.tier_required && !canAccessPremiumAddons && addon.tier_required !== 'Starter Plan';
                  const alreadyHas = addon.user_already_has;
                  return (
                    <div key={addon.id} className="site-card" style={{ opacity: tierLocked ? 0.7 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h5 style={{ margin: 0 }}>{addon.addon_name}{tierLocked ? ' 🔒' : ''}</h5>
                        {addon.monthly_price > 0 ? <span style={{ fontWeight: 'bold', color: '#28a745' }}>${addon.monthly_price}/mo</span> : <span className="status-badge draft">FREE</span>}
                      </div>
                      <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6c757d' }}>{addon.description || 'Enhance your site.'}</p>
                      {tierLocked ? (
                        <span className="form-help">Requires {addon.tier_required}</span>
                      ) : alreadyHas ? (
                        <button type="button" className="warning" disabled={processing} onClick={() => confirm(`Disable "${addon.addon_name}"?`) && toggleAddon(addon, false)}>
                          Disable
                        </button>
                      ) : (
                        <button type="button" className="primary" disabled={processing} onClick={() => confirm(`Enable "${addon.addon_name}"?`) && toggleAddon(addon, true)}>
                          Enable
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!canUseCustomDomain && activeTab !== TAB_DOMAIN && (
          <p className="form-help" style={{ marginTop: '16px' }}>Upgrade to Professional Plan or higher to use a custom domain.</p>
        )}
      </div>
    </div>
  );
}
