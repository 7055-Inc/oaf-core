/**
 * Social Central - Corporate Connections (Admin)
 * Dashboard > Marketing > Social Central > Corp Connections
 *
 * Admin-only page for:
 *   1. Managing corporate social media accounts (multiple per platform)
 *   2. Labeling/nicknaming connections (e.g. "Affiliate TikTok #1")
 *   3. Overseeing all user connections across the system
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import { getCurrentUser } from '../../../../lib/users/api';
import { authApiRequest } from '../../../../lib/apiUtils';
import { getOAuthUrl, PLATFORMS } from '../../../../lib/social-central/api';

export default function AdminConnectionsPage() {
  const router = useRouter();

  // Auth
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Data
  const [corpConnections, setCorpConnections] = useState([]);
  const [allConnections, setAllConnections] = useState([]);

  // UI
  const [activeTab, setActiveTab] = useState('corporate'); // corporate | users
  const [actionLoading, setActionLoading] = useState(null);
  const [editingLabel, setEditingLabel] = useState(null); // connection id being edited
  const [labelValue, setLabelValue] = useState('');
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // ---------------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------------
  useEffect(() => { loadUser(); }, []);
  useEffect(() => { if (userData) { loadCorpConnections(); loadAllConnections(); } }, [userData]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); } }, [toast]);

  const loadUser = async () => {
    try {
      const data = await getCurrentUser();
      const isAdmin = data?.user_type === 'admin' || data?.roles?.includes('admin');
      if (!isAdmin || !data?.permissions?.includes('leo_social')) {
        router.push('/dashboard/marketing/social-central');
        return;
      }
      setUserData(data);
    } catch { router.push('/login?redirect=/dashboard/marketing/social-central/admin-connections'); }
    finally { setLoading(false); }
  };

  const loadCorpConnections = async () => {
    try {
      const response = await authApiRequest('api/v2/marketing/connections', { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        if (data.success) setCorpConnections(data.connections || []);
      }
    } catch (err) { console.error('Error loading corp connections:', err); }
  };

  const loadAllConnections = async () => {
    try {
      const response = await authApiRequest('api/v2/marketing/connections/admin/all', { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        if (data.success) setAllConnections(data.connections || []);
      }
    } catch (err) { console.error('Error loading all connections:', err); }
  };

  // ---------------------------------------------------------------------------
  // Internal system toggle state (drip, collection, email/CRM)
  // ---------------------------------------------------------------------------
  const INTERNAL_SYSTEMS = ['email', 'drip', 'collection'];
  const internalEnabled = {};
  corpConnections.filter(c => c.status === 'active' && INTERNAL_SYSTEMS.includes(c.platform)).forEach(c => {
    internalEnabled[c.platform] = true;
  });

  const handleToggleInternal = async (platformId, enable) => {
    setActionLoading(platformId);
    try {
      const endpoint = platformId === 'email'
        ? 'api/v2/marketing/connections/crm'
        : `api/v2/marketing/connections/${platformId}`;
      const response = await authApiRequest(endpoint, {
        method: enable ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        const name = PLATFORMS[platformId]?.name || platformId;
        setToast({ type: 'success', message: enable ? `${name} enabled for campaigns.` : `${name} disabled.` });
        await loadCorpConnections();
        await loadAllConnections();
      } else {
        setToast({ type: 'error', message: data.error || 'Failed to update.' });
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to update.' });
    } finally { setActionLoading(null); }
  };

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const handleConnect = (platformId) => {
    setActionLoading(platformId);
    window.location.href = getOAuthUrl(platformId);
  };

  const handleDisconnect = async (connectionId, name) => {
    if (!confirm(`Disconnect "${name || 'this account'}"? This can be reconnected later.`)) return;
    setActionLoading(connectionId);
    try {
      const response = await authApiRequest(`api/v2/marketing/connections/${connectionId}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setToast({ type: 'success', message: `Disconnected "${name}".` });
        await loadCorpConnections();
        await loadAllConnections();
      } else {
        setToast({ type: 'error', message: data.error || 'Failed to disconnect.' });
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to disconnect.' });
    } finally { setActionLoading(null); }
  };

  const handleRevokeUser = async (connectionId, username, platform) => {
    if (!confirm(`Revoke ${platform} connection for user "${username}"?`)) return;
    setActionLoading(connectionId);
    try {
      const response = await authApiRequest(`api/v2/marketing/connections/${connectionId}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setToast({ type: 'success', message: `Revoked ${platform} for ${username}.` });
        await loadAllConnections();
      } else {
        setToast({ type: 'error', message: data.error || 'Failed to revoke.' });
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to revoke.' });
    } finally { setActionLoading(null); }
  };

  const startEditLabel = (conn) => {
    setEditingLabel(conn.id);
    setLabelValue(conn.label || '');
  };

  const saveLabel = async (connId) => {
    try {
      const response = await authApiRequest(`api/v2/marketing/connections/${connId}/label`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: labelValue.trim() || null }),
      });
      const data = await response.json();
      if (data.success) {
        setToast({ type: 'success', message: 'Label updated.' });
        await loadCorpConnections();
        await loadAllConnections();
      }
    } catch {}
    setEditingLabel(null);
  };

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------
  // Group corp connections by platform
  const corpByPlatform = {};
  corpConnections.filter(c => c.status === 'active').forEach(c => {
    if (!corpByPlatform[c.platform]) corpByPlatform[c.platform] = [];
    corpByPlatform[c.platform].push(c);
  });

  // Filter user connections for the oversight tab
  const filteredUserConnections = allConnections.filter(c => {
    if (filterPlatform !== 'all' && c.platform !== filterPlatform) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = (c.account_name || '').toLowerCase().includes(q)
        || (c.label || '').toLowerCase().includes(q)
        || (c.owner_username || '').toLowerCase().includes(q)
        || (c.platform || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const socialPlatforms = Object.values(PLATFORMS).filter(p => !p.isInternal);
  const internalPlatforms = Object.values(PLATFORMS).filter(p => p.isInternal);

  if (loading) {
    return (
      <DashboardShell userData={null}>
        <Head><title>Corp Connections | Social Central | Dashboard</title></Head>
        <div className="loading-state"><div className="spinner"></div><span>Loading...</span></div>
      </DashboardShell>
    );
  }

  return (
    <>
      <DashboardShell userData={userData}>
        <Head><title>Corp Connections | Social Central | Dashboard</title></Head>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
            padding: '14px 20px', borderRadius: '8px',
            background: toast.type === 'success' ? '#d4edda' : '#f8d7da',
            color: toast.type === 'success' ? '#155724' : '#842029',
            border: `1px solid ${toast.type === 'success' ? '#c3e6cb' : '#f5c2c7'}`,
            boxShadow: 'var(--shadow-lg)', fontSize: '14px', maxWidth: '400px',
          }}>
            <i className={`fa ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`} style={{ marginRight: '8px' }}></i>
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>
              <i className="fa fa-building" style={{ marginRight: '10px', color: '#198754' }}></i>
              Corporate Connections
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#888' }}>
              Manage company-wide social accounts and oversee user connections
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #eee', marginBottom: '24px' }}>
          {[
            { id: 'corporate', label: 'Corporate Accounts', icon: 'fa-building' },
            { id: 'users', label: 'User Connections', icon: 'fa-users' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px', fontSize: '14px', fontWeight: 600,
                border: 'none', background: 'none', cursor: 'pointer',
                color: activeTab === tab.id ? '#198754' : '#888',
                borderBottom: activeTab === tab.id ? '2px solid #198754' : '2px solid transparent',
                marginBottom: '-2px', transition: 'all 0.15s ease',
              }}
            >
              <i className={`fa ${tab.icon}`} style={{ marginRight: '6px' }}></i>
              {tab.label}
              {tab.id === 'users' && allConnections.length > 0 && (
                <span style={{
                  marginLeft: '6px', padding: '1px 7px', borderRadius: '10px',
                  fontSize: '11px', background: '#e9ecef', color: '#555',
                }}>{allConnections.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ================================================================= */}
        {/* TAB: Corporate Accounts */}
        {/* ================================================================= */}
        {activeTab === 'corporate' && (
          <>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px', lineHeight: '1.6' }}>
              <i className="fa fa-info-circle" style={{ marginRight: '6px', color: '#198754' }}></i>
              Corporate accounts are company-wide connections. You can connect <strong>multiple accounts per platform</strong> (e.g., primary + affiliate accounts).
              Use labels to identify each account.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '20px',
            }}>
              {socialPlatforms.map(platform => {
                const conns = corpByPlatform[platform.id] || [];

                return (
                  <div key={platform.id} className="section-box" style={{ padding: 0, overflow: 'hidden' }}>
                    {/* Platform Header */}
                    <div style={{
                      background: platform.color, padding: '14px 18px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className={`fab ${platform.icon}`} style={{ color: 'white', fontSize: '20px' }}></i>
                        <span style={{ color: 'white', fontSize: '15px', fontWeight: 600 }}>{platform.name}</span>
                      </div>
                      <span style={{
                        background: 'rgba(255,255,255,0.2)', color: 'white',
                        fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '10px',
                      }}>
                        {conns.length} account{conns.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Accounts List */}
                    <div style={{ padding: '16px' }}>
                      {conns.length === 0 ? (
                        <p style={{ fontSize: '13px', color: '#999', marginBottom: '12px' }}>No corporate accounts connected.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                          {conns.map(conn => (
                            <div key={conn.id} style={{
                              background: platform.colorLight, borderRadius: '8px',
                              padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px',
                            }}>
                              <i className="fa fa-check-circle" style={{ color: '#28a745', fontSize: '14px', flexShrink: 0 }}></i>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {/* Label (editable) */}
                                {editingLabel === conn.id ? (
                                  <div style={{ display: 'flex', gap: '4px', marginBottom: '2px' }}>
                                    <input
                                      type="text"
                                      value={labelValue}
                                      onChange={(e) => setLabelValue(e.target.value)}
                                      onKeyDown={(e) => { if (e.key === 'Enter') saveLabel(conn.id); if (e.key === 'Escape') setEditingLabel(null); }}
                                      placeholder="e.g. Primary Account"
                                      maxLength={100}
                                      autoFocus
                                      style={{
                                        flex: 1, padding: '3px 8px', fontSize: '12px',
                                        border: '1px solid #ccc', borderRadius: '4px',
                                      }}
                                    />
                                    <button onClick={() => saveLabel(conn.id)} style={{
                                      padding: '3px 8px', fontSize: '11px', background: '#198754',
                                      color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
                                    }}>Save</button>
                                    <button onClick={() => setEditingLabel(null)} style={{
                                      padding: '3px 8px', fontSize: '11px', background: '#eee',
                                      border: 'none', borderRadius: '4px', cursor: 'pointer',
                                    }}>Cancel</button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {conn.label || conn.account_name || 'Unnamed Account'}
                                    </span>
                                    <button
                                      onClick={() => startEditLabel(conn)}
                                      title="Edit label"
                                      style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: '#888', fontSize: '11px', padding: '0 2px', flexShrink: 0,
                                      }}
                                    >
                                      <i className="fa fa-pencil"></i>
                                    </button>
                                  </div>
                                )}
                                {conn.label && conn.account_name && (
                                  <div style={{ fontSize: '11px', color: '#666', marginTop: '1px' }}>
                                    {conn.account_name}
                                  </div>
                                )}
                                {conn.token_expires_at && (
                                  <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>
                                    Token expires: {new Date(conn.token_expires_at).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => handleDisconnect(conn.id, conn.label || conn.account_name)}
                                disabled={actionLoading === conn.id}
                                title="Disconnect"
                                style={{
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  color: '#dc3545', fontSize: '14px', padding: '4px', flexShrink: 0,
                                  opacity: actionLoading === conn.id ? 0.5 : 1,
                                }}
                              >
                                <i className={`fa ${actionLoading === conn.id ? 'fa-spinner fa-spin' : 'fa-times-circle'}`}></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Connect Another */}
                      <button
                        onClick={() => handleConnect(platform.id)}
                        disabled={actionLoading === platform.id}
                        style={{
                          width: '100%', padding: '9px', fontSize: '13px', fontWeight: 600,
                          background: 'white', color: platform.color,
                          border: `1px dashed ${platform.color}`, borderRadius: '6px',
                          cursor: actionLoading === platform.id ? 'not-allowed' : 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.target.style.background = platform.colorLight; }}
                        onMouseLeave={(e) => { e.target.style.background = 'white'; }}
                      >
                        {actionLoading === platform.id ? (
                          <><i className="fa fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>Connecting...</>
                        ) : (
                          <><i className="fa fa-plus-circle" style={{ marginRight: '6px' }}></i>Connect {conns.length > 0 ? 'Another' : ''} Account</>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Internal Systems Section */}
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '32px 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa fa-plug" style={{ color: '#198754' }}></i>
              Internal Systems
            </h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px', lineHeight: '1.5' }}>
              Toggle internal platforms on to make them available as channels in the admin campaign builder.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px',
            }}>
              {internalPlatforms.map(platform => {
                const enabled = !!internalEnabled[platform.id];
                const isLoading = actionLoading === platform.id;

                return (
                  <div key={platform.id} className="section-box" style={{ padding: 0, overflow: 'hidden' }}>
                    {/* Header band */}
                    <div style={{
                      background: platform.color, padding: '12px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className={`fa ${platform.icon}`} style={{ color: 'white', fontSize: '18px' }}></i>
                        <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>{platform.name}</span>
                      </div>
                      <span style={{
                        background: enabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)',
                        color: 'white', fontSize: '10px', fontWeight: 700, padding: '3px 10px',
                        borderRadius: '10px', textTransform: 'uppercase',
                      }}>
                        {enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '16px' }}>
                      <p style={{ fontSize: '13px', color: '#666', margin: '0 0 14px 0', lineHeight: '1.5' }}>
                        {platform.description}
                      </p>

                      {/* Toggle switch */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: enabled ? '#198754' : '#888' }}>
                          {enabled ? 'Available in campaigns' : 'Not connected'}
                        </span>
                        <button
                          onClick={() => handleToggleInternal(platform.id, !enabled)}
                          disabled={isLoading}
                          style={{
                            position: 'relative', width: '48px', height: '26px',
                            borderRadius: '13px', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
                            background: enabled ? '#198754' : '#ccc',
                            transition: 'background 0.2s ease',
                          }}
                        >
                          <span style={{
                            position: 'absolute',
                            top: '3px',
                            left: enabled ? '25px' : '3px',
                            width: '20px', height: '20px',
                            borderRadius: '50%', background: 'white',
                            transition: 'left 0.2s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          }}></span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ================================================================= */}
        {/* TAB: User Connections */}
        {/* ================================================================= */}
        {activeTab === 'users' && (
          <>
            {/* Filters */}
            <div style={{
              display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center',
            }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user, account, or platform..."
                style={{
                  flex: '1 1 200px', padding: '8px 12px', fontSize: '13px',
                  border: '1px solid #ddd', borderRadius: '6px',
                }}
              />
              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid #ddd', borderRadius: '6px' }}
              >
                <option value="all">All Platforms</option>
                {Object.values(PLATFORMS).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid #ddd', borderRadius: '6px' }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="revoked">Revoked</option>
              </select>
              <span style={{ fontSize: '12px', color: '#888' }}>
                {filteredUserConnections.length} connection{filteredUserConnections.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Table */}
            <div className="section-box" style={{ padding: 0, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Owner</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Type</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Platform</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Account</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Label</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>Connected</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUserConnections.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#999' }}>
                        No connections found.
                      </td>
                    </tr>
                  ) : filteredUserConnections.map(conn => {
                    const pl = PLATFORMS[conn.platform] || {};
                    const statusColors = {
                      active: { bg: '#d4edda', color: '#155724' },
                      expired: { bg: '#fff3cd', color: '#856404' },
                      revoked: { bg: '#f8d7da', color: '#842029' },
                    };
                    const sc = statusColors[conn.status] || statusColors.active;

                    return (
                      <tr key={conn.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontWeight: 600 }}>{conn.owner_username || `User #${conn.owner_id}`}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 700,
                            background: conn.owner_type === 'admin' ? '#d4edda' : '#e9ecef',
                            color: conn.owner_type === 'admin' ? '#155724' : '#555',
                            textTransform: 'uppercase',
                          }}>
                            {conn.owner_type}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <i className={`${pl.isCRM ? 'fa' : 'fab'} ${pl.icon || 'fa-globe'}`} style={{ color: pl.color || '#666' }}></i>
                            {pl.name || conn.platform}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {conn.account_name || '-'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {editingLabel === conn.id ? (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <input
                                type="text" value={labelValue}
                                onChange={(e) => setLabelValue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') saveLabel(conn.id); if (e.key === 'Escape') setEditingLabel(null); }}
                                maxLength={100} autoFocus
                                style={{ width: '120px', padding: '2px 6px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '3px' }}
                              />
                              <button onClick={() => saveLabel(conn.id)} style={{ padding: '2px 6px', fontSize: '10px', background: '#198754', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>OK</button>
                            </div>
                          ) : (
                            <span
                              onClick={() => startEditLabel(conn)}
                              style={{ cursor: 'pointer', color: conn.label ? '#333' : '#ccc', fontStyle: conn.label ? 'normal' : 'italic' }}
                              title="Click to edit label"
                            >
                              {conn.label || 'no label'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                            background: sc.bg, color: sc.color, textTransform: 'capitalize',
                          }}>
                            {conn.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '12px', color: '#666' }}>
                          {conn.created_at ? new Date(conn.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {conn.status === 'active' && conn.owner_type === 'user' && (
                            <button
                              onClick={() => handleRevokeUser(conn.id, conn.owner_username, pl.name || conn.platform)}
                              disabled={actionLoading === conn.id}
                              title="Revoke connection"
                              style={{
                                background: 'none', border: '1px solid #dc3545', color: '#dc3545',
                                padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                                cursor: actionLoading === conn.id ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {actionLoading === conn.id ? <i className="fa fa-spinner fa-spin"></i> : 'Revoke'}
                            </button>
                          )}
                          {conn.status === 'active' && conn.owner_type === 'admin' && (
                            <button
                              onClick={() => handleDisconnect(conn.id, conn.label || conn.account_name)}
                              disabled={actionLoading === conn.id}
                              title="Disconnect"
                              style={{
                                background: 'none', border: '1px solid #dc3545', color: '#dc3545',
                                padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                                cursor: actionLoading === conn.id ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {actionLoading === conn.id ? <i className="fa fa-spinner fa-spin"></i> : 'Disconnect'}
                            </button>
                          )}
                          {conn.status !== 'active' && (
                            <span style={{ fontSize: '11px', color: '#999' }}>-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Info Box */}
        <div style={{
          marginTop: '30px', padding: '16px 20px', background: '#f0f7ff',
          borderRadius: '8px', border: '1px solid #b6d4fe',
          fontSize: '13px', color: '#084298', lineHeight: '1.6',
        }}>
          <i className="fa fa-info-circle" style={{ marginRight: '8px' }}></i>
          <strong>Corporate Accounts:</strong> These are company-wide connections used for official campaigns.
          You can connect multiple accounts per platform (e.g., primary + affiliate TikTok accounts).
          Assign labels to keep them organized. User connections can be monitored and revoked from the "User Connections" tab.
        </div>
      </DashboardShell>
    </>
  );
}
