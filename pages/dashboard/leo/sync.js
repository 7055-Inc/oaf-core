import { useState, useEffect } from 'react';
import Head from 'next/head';
import { authApiRequest } from '../../../lib/apiUtils';
import { DashboardShell } from '../../../modules/dashboard/components/layout';

/**
 * Leo AI - Manual Sync Page
 * 
 * Admin-only page for triggering data ingestion into ChromaDB:
 * - User profiles sync
 * - (Future) Products sync
 * - (Future) Orders sync
 * 
 * Route: /dashboard/leo/sync
 */
export default function LeoSyncPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [syncing, setSyncing] = useState({});
  const [results, setResults] = useState({});
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user data
        const userResponse = await authApiRequest('api/v2/auth/me');
        if (userResponse.ok) {
          const result = await userResponse.json();
          if (result.success && result.data) {
            const isAdmin = result.data.roles?.includes('admin') || false;
            setUserData({ ...result.data, isAdmin });
          } else {
            setError('Failed to load user data');
            return;
          }
        } else {
          setError('Failed to load user data');
          return;
        }

        // Fetch available scripts
        const scriptsResponse = await authApiRequest('api/v2/leo/admin/ingest/status');
        if (scriptsResponse.ok) {
          const scriptsData = await scriptsResponse.json();
          if (scriptsData.success) {
            setScripts(scriptsData.scripts);
          }
        }

        // Fetch collection stats
        const statsResponse = await authApiRequest('api/v2/leo/stats');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          if (statsData.success) {
            setStats(statsData.collections);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const runSync = async (scriptId, full = false) => {
    setSyncing(prev => ({ ...prev, [scriptId]: true }));
    setResults(prev => ({ ...prev, [scriptId]: null }));

    try {
      const response = await authApiRequest(`api/v2/leo/admin/ingest/${scriptId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full })
      });

      const data = await response.json();
      setResults(prev => ({ ...prev, [scriptId]: data }));

      // Refresh stats after sync
      const statsResponse = await authApiRequest('api/v2/leo/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats(statsData.collections);
        }
      }
    } catch (err) {
      setResults(prev => ({ 
        ...prev, 
        [scriptId]: { success: false, error: err.message } 
      }));
    } finally {
      setSyncing(prev => ({ ...prev, [scriptId]: false }));
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell>
        <div className="error-alert">Error: {error}</div>
      </DashboardShell>
    );
  }

  if (!userData?.isAdmin) {
    return (
      <DashboardShell>
        <div className="error-alert">
          Access denied. This page is only available to administrators.
        </div>
      </DashboardShell>
    );
  }

  return (
    <>
      <Head>
        <title>Leo AI - Manual Sync | Dashboard</title>
      </Head>
      <DashboardShell>
        <div className="dashboard-page">
          <div className="page-header">
            <h1><i className="fas fa-brain"></i> Leo AI - Manual Sync</h1>
            <p className="page-subtitle">
              Trigger data ingestion into ChromaDB for AI-powered search and recommendations
            </p>
          </div>

          {/* Collection Stats */}
          {stats && (
            <div className="stats-section" style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>Collection Stats</h2>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                gap: '12px' 
              }}>
                {Object.entries(stats).map(([name, count]) => (
                  <div key={name} style={{ 
                    background: '#f8f9fa', 
                    padding: '12px 16px', 
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
                      {name}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '600' }}>
                      {count.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ingestion Scripts */}
          <div className="scripts-section">
            <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>Ingestion Scripts</h2>
            
            {scripts.length === 0 ? (
              <p style={{ color: '#6c757d' }}>No ingestion scripts available</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {scripts.map(script => (
                  <div key={script.id} style={{
                    background: '#fff',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      marginBottom: '12px'
                    }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '15px' }}>{script.name}</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6c757d' }}>
                          {script.description}
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#999' }}>
                          Collection: <code>{script.collection}</code>
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => runSync(script.id, false)}
                          disabled={syncing[script.id]}
                          style={{
                            padding: '8px 16px',
                            background: '#055474',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: syncing[script.id] ? 'not-allowed' : 'pointer',
                            opacity: syncing[script.id] ? 0.6 : 1,
                            fontSize: '13px'
                          }}
                        >
                          {syncing[script.id] ? 'Syncing...' : 'Incremental Sync'}
                        </button>
                        <button
                          onClick={() => runSync(script.id, true)}
                          disabled={syncing[script.id]}
                          style={{
                            padding: '8px 16px',
                            background: '#dc3545',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: syncing[script.id] ? 'not-allowed' : 'pointer',
                            opacity: syncing[script.id] ? 0.6 : 1,
                            fontSize: '13px'
                          }}
                        >
                          Full Sync
                        </button>
                      </div>
                    </div>

                    {/* Result display */}
                    {results[script.id] && (
                      <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        background: results[script.id].success ? '#d4edda' : '#f8d7da',
                        borderRadius: '6px',
                        fontSize: '13px'
                      }}>
                        {results[script.id].success ? (
                          <>
                            <strong style={{ color: '#155724' }}>
                              ✓ {results[script.id].message}
                            </strong>
                            {results[script.id].stats && (
                              <div style={{ marginTop: '8px', color: '#155724' }}>
                                <div>Total: {results[script.id].stats.total}</div>
                                {results[script.id].stats.artists > 0 && (
                                  <div>Artists: {results[script.id].stats.artists}</div>
                                )}
                                {results[script.id].stats.promoters > 0 && (
                                  <div>Promoters: {results[script.id].stats.promoters}</div>
                                )}
                                {results[script.id].stats.community > 0 && (
                                  <div>Community: {results[script.id].stats.community}</div>
                                )}
                                <div style={{ marginTop: '4px', fontSize: '12px' }}>
                                  Duration: {results[script.id].duration_ms}ms
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <strong style={{ color: '#721c24' }}>
                            ✗ Error: {results[script.id].error || results[script.id].message}
                          </strong>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ 
            marginTop: '24px', 
            padding: '16px', 
            background: '#fff3cd', 
            borderRadius: '8px',
            fontSize: '13px'
          }}>
            <strong>💡 Tips:</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
              <li><strong>Incremental Sync</strong> - Only syncs data updated in the last 24 hours (fast)</li>
              <li><strong>Full Sync</strong> - Re-ingests all data from scratch (slower, use for rebuilding)</li>
            </ul>
          </div>
        </div>
      </DashboardShell>
    </>
  );
}
