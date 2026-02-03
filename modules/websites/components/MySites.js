/**
 * My Sites – Card list for Websites module.
 * Visit (new tab, custom domain if possible), Manage (navigate to manage page), Deactivate.
 * Uses global CSS: sites-cards-grid, site-card, site-card-header, site-card-meta, site-card-actions.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchMySites, updateSite } from '../../../lib/websites';
import { getSubdomainUrl, getSubdomainBase } from '../../../lib/config';

export default function MySites({ userData, subscriptionData }) {
  const [loading, setLoading] = useState(true);
  const [userSites, setUserSites] = useState([]);
  const [processing, setProcessing] = useState(false);

  const userTier = subscriptionData?.subscription?.tier;
  const isAdminTier = userTier === 'Admin Plan';
  const canCreateMultipleSites = isAdminTier || ['Business Plan', 'Promoter Business Plan'].includes(userTier);
  const isAdmin = userData?.user_type === 'admin';
  const isPromoter = userData?.user_type === 'promoter';
  const siteLimit = canCreateMultipleSites || isAdmin ? 999 : 1;

  useEffect(() => {
    fetchUserSites();
  }, []);

  const fetchUserSites = async () => {
    try {
      setLoading(true);
      const sites = await fetchMySites();
      setUserSites(Array.isArray(sites) ? sites : []);
    } catch (err) {
      console.error('Error fetching sites:', err);
      setUserSites([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (siteId) => {
    if (!confirm('Deactivate this site? It will no longer be publicly accessible.')) return;
    try {
      setProcessing(true);
      await updateSite(siteId, { status: 'draft' });
      await fetchUserSites();
    } catch (err) {
      alert(err.message || 'Error deactivating site.');
    } finally {
      setProcessing(false);
    }
  };

  const visitUrl = (site) => {
    if (site.domain) return `https://${site.domain}`;
    return getSubdomainUrl(site.subdomain);
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading your websites...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <h3>My Sites</h3>
        <div className="content-header-actions">
          <span style={{ fontSize: '14px', color: '#6c757d' }}>
            {userSites.length} of {siteLimit === 999 ? 'unlimited' : siteLimit} site{siteLimit !== 1 ? 's' : ''}
          </span>
          {userSites.length < siteLimit && (
            <Link href="/dashboard/websites/new" className="primary">
              <i className="fa-solid fa-plus" style={{ marginRight: '6px' }} />
              Add Site
            </Link>
          )}
        </div>
      </div>

      {userSites.length === 0 ? (
        <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#6c757d', marginBottom: '16px' }}>No websites yet. Create your first site to get started.</p>
          {siteLimit > 0 && (
            <Link href="/dashboard/websites/new" className="primary">Add Site</Link>
          )}
        </div>
      ) : (
        <div className="sites-cards-grid">
          {userSites.map((site) => (
            <div key={site.id} className="site-card">
              <div className="site-card-header">
                <h3>{site.site_name}</h3>
                <div className="site-card-meta">
                  {site.custom_domain || `${site.subdomain}.${getSubdomainBase()}`}
                  <span className={`status-badge ${site.status === 'active' ? 'published' : 'draft'}`} style={{ marginLeft: '8px' }}>
                    {site.status}
                  </span>
                </div>
              </div>
              <div className="site-card-actions">
                <a
                  href={visitUrl(site)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={site.status === 'active' ? 'primary btn-visit' : 'secondary btn-visit'}
                  style={{ pointerEvents: site.status === 'active' ? 'auto' : 'none', opacity: site.status === 'active' ? 1 : 0.6 }}
                >
                  <i className="fa-solid fa-external-link" /> Visit
                </a>
                <Link href={`/dashboard/websites/manage/${site.id}`} className="primary">
                  Manage
                </Link>
                {site.status === 'active' && (
                  <button
                    type="button"
                    className="warning"
                    onClick={() => handleDeactivate(site.id)}
                    disabled={processing}
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
