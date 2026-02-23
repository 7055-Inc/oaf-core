/**
 * Social Central - Connections Page
 * Dashboard > Marketing > Social Central > Connections
 * 
 * Card-grid layout for connecting / disconnecting social media accounts.
 * Each platform has its own branded card showing connection status.
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import DashboardShell from '../../../../modules/dashboard/components/layout/DashboardShell';
import { getCurrentUser } from '../../../../lib/users/api';
import { fetchConnections, disconnectAccount, getOAuthUrl, PLATFORMS } from '../../../../lib/social-central/api';

export default function ConnectionsPage() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState([]);
  const [crmEnabled, setCrmEnabled] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // platform id of card being acted on
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message }

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (userData) loadConnections();
  }, [userData]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadUser = async () => {
    try {
      const data = await getCurrentUser();
      const hasPermission = data?.permissions?.includes('leo_social');
      if (!hasPermission) {
        router.push('/dashboard/marketing');
        return;
      }
      setUserData(data);
    } catch (err) {
      console.error('Error loading user:', err);
      router.push('/login?redirect=/dashboard/marketing/social-central/connections');
    } finally {
      setLoading(false);
    }
  };

  const loadConnections = async () => {
    try {
      const data = await fetchConnections();
      if (data.success) {
        setConnections(data.connections || []);
        // Check if CRM/email is among the active connections
        const hasCrm = (data.connections || []).some(c => c.platform === 'email' && c.status === 'active');
        setCrmEnabled(hasCrm);
      }
    } catch (err) {
      console.error('Error loading connections:', err);
    }
  };

  const handleConnect = (platformId) => {
    // CRM/email uses an internal toggle, not OAuth
    if (platformId === 'email') {
      handleToggleCRM(true);
      return;
    }
    setActionLoading(platformId);
    // Navigate to the OAuth authorize endpoint — this redirects to the platform
    window.location.href = getOAuthUrl(platformId);
  };

  const handleToggleCRM = async (enable) => {
    setActionLoading('email');
    try {
      const response = await authApiRequest('api/v2/marketing/connections/crm', {
        method: enable ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      if (result.success) {
        setCrmEnabled(enable);
        setToast({ type: 'success', message: enable ? 'CRM email system connected. Email will be available as a campaign channel.' : 'CRM email system disconnected.' });
        await loadConnections();
      } else {
        setToast({ type: 'error', message: result.error || 'Failed to update CRM connection.' });
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to update CRM connection.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (connection) => {
    const platform = PLATFORMS[connection.platform] || {};
    if (!confirm(`Disconnect ${platform.name || connection.platform}? You can reconnect anytime.`)) return;

    setActionLoading(connection.platform);
    try {
      await disconnectAccount(connection.id);
      setToast({ type: 'success', message: `${platform.name || connection.platform} disconnected successfully.` });
      await loadConnections();
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to disconnect account.' });
    } finally {
      setActionLoading(null);
    }
  };

  // Map connections by platform for easy lookup
  const connectionsByPlatform = {};
  connections.forEach(conn => {
    // A platform can have multiple connections (e.g. Facebook + Instagram both via Meta)
    if (!connectionsByPlatform[conn.platform]) {
      connectionsByPlatform[conn.platform] = [];
    }
    connectionsByPlatform[conn.platform].push(conn);
  });

  if (loading) {
    return (
      <DashboardShell userData={null}>
        <Head><title>Connections | Social Central | Brakebee</title></Head>
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading...</span>
        </div>
      </DashboardShell>
    );
  }

  if (!userData) return null;

  return (
    <>
      <Head><title>Connections | Social Central | Brakebee</title></Head>
      <DashboardShell userData={userData}>
        {/* Toast Notification */}
        {toast && (
          <div style={{
            position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
            padding: '14px 20px', borderRadius: '8px', maxWidth: '400px',
            color: 'white', fontWeight: '500', fontSize: '14px',
            background: toast.type === 'success' ? '#28a745' : '#dc3545',
            boxShadow: 'var(--shadow-lg)',
            animation: 'fadeIn 0.2s ease',
          }}>
            <i className={`fa ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`} style={{ marginRight: '8px' }}></i>
            {toast.message}
          </div>
        )}

        {/* Breadcrumb */}
        <div style={{ marginBottom: '8px' }}>
          <span
            style={{ fontSize: '13px', color: 'var(--primary-color)', cursor: 'pointer', textDecoration: 'none' }}
            onClick={() => router.push('/dashboard/marketing/social-central')}
          >
            Social Central
          </span>
          <span style={{ fontSize: '13px', color: '#999', margin: '0 6px' }}>/</span>
          <span style={{ fontSize: '13px', color: '#666' }}>Connections</span>
        </div>

        <div className="page-header">
          <h1>Social Connections</h1>
          <p className="page-subtitle">Connect your social media accounts to start publishing content</p>
        </div>

        {/* Platform Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px',
          marginTop: '10px',
        }}>
          {Object.values(PLATFORMS).map(platform => {
            const isCRMPlatform = platform.isCRM;
            const platformConnections = connectionsByPlatform[platform.id] || [];
            const activeConnection = platformConnections.find(c => c.status === 'active');
            const isConnected = isCRMPlatform ? crmEnabled : !!activeConnection;
            const isLoading = actionLoading === platform.id;

            return (
              <div
                key={platform.id}
                className="section-box"
                style={{
                  padding: '0',
                  overflow: 'hidden',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  opacity: isLoading ? 0.7 : 1,
                }}
                onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; } }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {/* Platform Header Band */}
                <div style={{
                  background: platform.color,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className={`${platform.isCRM ? 'fa' : 'fab'} ${platform.icon}`} style={{ color: 'white', fontSize: '22px' }}></i>
                    <span style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>{platform.name}</span>
                  </div>
                  {isConnected && (
                    <span style={{
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      padding: '3px 10px',
                      borderRadius: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      Connected
                    </span>
                  )}
                </div>

                {/* Card Body */}
                <div style={{ padding: '20px' }}>
                  <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#555', lineHeight: '1.5' }}>
                    {platform.description}
                  </p>

                  {/* Connected Account Info */}
                  {isConnected && !isCRMPlatform && activeConnection && (
                    <div style={{
                      background: platform.colorLight,
                      borderRadius: '8px',
                      padding: '12px 14px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}>
                      <i className="fa fa-check-circle" style={{ color: '#28a745', fontSize: '16px' }}></i>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600' }}>
                          {activeConnection.account_name || 'Connected Account'}
                        </div>
                        {activeConnection.token_expires_at && (
                          <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                            Token expires: {new Date(activeConnection.token_expires_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CRM Toggle Info */}
                  {isCRMPlatform && isConnected && (
                    <div style={{
                      background: platform.colorLight,
                      borderRadius: '8px',
                      padding: '12px 14px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}>
                      <i className="fa fa-check-circle" style={{ color: '#28a745', fontSize: '16px' }}></i>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600' }}>CRM System Active</div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                          Email is available as a campaign channel. AI will include email concepts in campaign plans.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  {isCRMPlatform ? (
                    /* CRM uses a toggle switch */
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: isConnected ? '#155724' : '#6c757d' }}>
                        {isConnected ? 'Email channel enabled' : 'Enable email channel'}
                      </span>
                      <button
                        onClick={() => handleToggleCRM(!crmEnabled)}
                        disabled={isLoading}
                        style={{
                          position: 'relative',
                          width: '50px',
                          height: '26px',
                          borderRadius: '13px',
                          border: 'none',
                          background: isConnected ? '#28a745' : '#ccc',
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          transition: 'background 0.2s ease',
                          padding: 0,
                        }}
                      >
                        <span style={{
                          position: 'absolute',
                          top: '3px',
                          left: isConnected ? '27px' : '3px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: 'white',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          transition: 'left 0.2s ease',
                        }} />
                      </button>
                    </div>
                  ) : isConnected ? (
                    <button
                      onClick={() => handleDisconnect(activeConnection)}
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: 'white',
                        color: '#dc3545',
                        border: '1px solid #dc3545',
                        borderRadius: 'var(--border-radius-md)',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        fontSize: '13px',
                        transition: 'background 0.15s ease, color 0.15s ease',
                      }}
                      onMouseEnter={(e) => { if (!isLoading) { e.target.style.background = '#dc3545'; e.target.style.color = 'white'; } }}
                      onMouseLeave={(e) => { e.target.style.background = 'white'; e.target.style.color = '#dc3545'; }}
                    >
                      {isLoading ? (
                        <><i className="fa fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>Disconnecting...</>
                      ) : (
                        <><i className="fa fa-unlink" style={{ marginRight: '6px' }}></i>Disconnect</>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(platform.id)}
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: platform.color,
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--border-radius-md)',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        fontSize: '13px',
                        transition: 'opacity 0.15s ease',
                      }}
                      onMouseEnter={(e) => { if (!isLoading) e.target.style.opacity = '0.85'; }}
                      onMouseLeave={(e) => { e.target.style.opacity = '1'; }}
                    >
                      {isLoading ? (
                        <><i className="fa fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>Connecting...</>
                      ) : (
                        <><i className="fa fa-plug" style={{ marginRight: '6px' }}></i>Connect {platform.name}</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Box */}
        <div style={{
          marginTop: '30px',
          padding: '16px 20px',
          background: '#f0f7ff',
          borderRadius: '8px',
          border: '1px solid #b6d4fe',
          fontSize: '13px',
          color: '#084298',
          lineHeight: '1.6',
        }}>
          <i className="fa fa-info-circle" style={{ marginRight: '8px' }}></i>
          <strong>How it works:</strong> Clicking "Connect" will redirect you to the platform's authorization page.
          Once you approve access, you'll be redirected back here. Your tokens are securely stored and automatically refreshed.
          You can disconnect any account at any time.
        </div>
      </DashboardShell>
    </>
  );
}
