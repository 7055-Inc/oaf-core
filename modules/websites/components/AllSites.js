/**
 * All Sites (admin) – System-wide site list.
 * Same card layout as My Sites; Visit and Manage links only (no Deactivate for other users' sites).
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchAllSites } from '../../../lib/websites/api';
import { getSubdomainUrl, getSubdomainBase } from '../../../lib/config';

export default function AllSites({ userData }) {
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError('');
        const list = await fetchAllSites();
        if (!cancelled) setSites(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load sites.');
          setSites([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const visitUrl = (site) => {
    if (site.custom_domain && site.custom_domain_active) return `https://${site.custom_domain}`;
    return getSubdomainUrl(site.subdomain);
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading all sites...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="form-card">
        <div className="error-alert">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <h3>All Sites (admin)</h3>
        <span style={{ fontSize: '14px', color: '#6c757d' }}>{sites.length} site{sites.length !== 1 ? 's' : ''}</span>
      </div>

      {sites.length === 0 ? (
        <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#6c757d' }}>No sites in the system.</p>
        </div>
      ) : (
        <div className="sites-cards-grid">
          {sites.map((site) => (
            <div key={site.id} className="site-card">
              <div className="site-card-header">
                <h3>{site.site_name}</h3>
                <div className="site-card-meta">
                  {site.custom_domain || `${site.subdomain}.${getSubdomainBase()}`}
                  <span className={`status-badge ${site.status === 'active' ? 'published' : 'draft'}`} style={{ marginLeft: '8px' }}>
                    {site.status}
                  </span>
                </div>
                {(site.first_name || site.last_name || site.email) && (
                  <div style={{ fontSize: '13px', color: '#6c757d', marginTop: '6px' }}>
                    {[site.first_name, site.last_name].filter(Boolean).join(' ')}
                    {site.email && ` · ${site.email}`}
                  </div>
                )}
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
