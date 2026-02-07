import { useState, useEffect } from 'react';
import Head from 'next/head';
import { authApiRequest } from '../../../lib/apiUtils';
import { DashboardShell } from '../../../modules/dashboard/components/layout';

/**
 * Leo AI - Manual Sync Page
 * 
 * Admin-only page for triggering data ingestion and truth discovery:
 * - Data ingestion into ChromaDB
 * - Truth discovery (patterns, similarities)
 * 
 * Route: /dashboard/leo/sync
 */
export default function LeoSyncPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [discoverers, setDiscoverers] = useState([]);
  const [syncing, setSyncing] = useState({});
  const [results, setResults] = useState({});
  const [stats, setStats] = useState(null);
  const [truthStats, setTruthStats] = useState(null);

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

        // Fetch available ingestion scripts
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

        // Fetch truth discoverers status
        const truthsResponse = await authApiRequest('api/v2/leo/admin/truths/status');
        if (truthsResponse.ok) {
          const truthsData = await truthsResponse.json();
          if (truthsData.success) {
            setDiscoverers(truthsData.discoverers || []);
            setTruthStats(truthsData.truthStats?.collections || {});
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

  const pollJobStatus = async (jobId, scriptId, jobType = 'ingest') => {
    const maxPolls = 120; // Max 10 minutes (5s intervals)
    let pollCount = 0;
    const endpoint = jobType === 'truths' 
      ? `api/v2/leo/admin/truths/job/${jobId}`
      : `api/v2/leo/admin/ingest/job/${jobId}`;

    const poll = async () => {
      try {
        const response = await authApiRequest(endpoint);
        const data = await response.json();

        if (data.success && data.job) {
          // Update with current status
          setResults(prev => ({
            ...prev,
            [scriptId]: {
              success: true,
              message: data.message || `${scriptId} ${data.job.status}...`,
              status: data.job.status,
              duration_ms: data.job.duration_ms,
              stats: data.stats
            }
          }));

          if (data.job.status === 'completed') {
            setSyncing(prev => ({ ...prev, [scriptId]: false }));
            // Refresh stats after completion
            const statsResponse = await authApiRequest('api/v2/leo/stats');
            if (statsResponse.ok) {
              const statsData = await statsResponse.json();
              if (statsData.success) {
                setStats(statsData.collections);
              }
            }
            // Refresh truth stats too
            if (jobType === 'truths') {
              const truthsResponse = await authApiRequest('api/v2/leo/admin/truths/stats');
              if (truthsResponse.ok) {
                const truthsData = await truthsResponse.json();
                if (truthsData.success) {
                  setTruthStats(truthsData.collections || {});
                }
              }
            }
            return;
          } else if (data.job.status === 'failed') {
            setResults(prev => ({
              ...prev,
              [scriptId]: { success: false, error: data.error || 'Job failed' }
            }));
            setSyncing(prev => ({ ...prev, [scriptId]: false }));
            return;
          }
        }

        // Still running, continue polling
        pollCount++;
        if (pollCount < maxPolls) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          setResults(prev => ({
            ...prev,
            [scriptId]: { success: false, error: 'Polling timeout - job may still be running in background' }
          }));
          setSyncing(prev => ({ ...prev, [scriptId]: false }));
        }
      } catch (err) {
        // Network error - retry a few times
        pollCount++;
        if (pollCount < maxPolls) {
          setTimeout(poll, 5000);
        } else {
          setResults(prev => ({
            ...prev,
            [scriptId]: { success: false, error: err.message }
          }));
          setSyncing(prev => ({ ...prev, [scriptId]: false }));
        }
      }
    };

    poll();
  };

  const runSync = async (scriptId, full = false) => {
    setSyncing(prev => ({ ...prev, [scriptId]: true }));
    setResults(prev => ({ 
      ...prev, 
      [scriptId]: { success: true, message: 'Starting...', status: 'starting' } 
    }));

    try {
      const response = await authApiRequest(`api/v2/leo/admin/ingest/${scriptId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full })
      });

      const data = await response.json();
      
      if (data.success && data.jobId) {
        // Async job started, begin polling
        setResults(prev => ({
          ...prev,
          [scriptId]: { 
            success: true, 
            message: data.message, 
            status: 'running',
            jobId: data.jobId
          }
        }));
        pollJobStatus(data.jobId, scriptId, 'ingest');
      } else if (!data.success) {
        setResults(prev => ({ ...prev, [scriptId]: data }));
        setSyncing(prev => ({ ...prev, [scriptId]: false }));
      }
    } catch (err) {
      setResults(prev => ({ 
        ...prev, 
        [scriptId]: { success: false, error: err.message } 
      }));
      setSyncing(prev => ({ ...prev, [scriptId]: false }));
    }
  };

  const runDiscoverer = async (discovererName) => {
    const key = `truth_${discovererName}`;
    setSyncing(prev => ({ ...prev, [key]: true }));
    setResults(prev => ({ 
      ...prev, 
      [key]: { success: true, message: 'Starting discovery...', status: 'starting' } 
    }));

    try {
      const endpoint = discovererName === 'all' 
        ? 'api/v2/leo/admin/truths/discover/all'
        : `api/v2/leo/admin/truths/discover/${discovererName}`;

      const response = await authApiRequest(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (data.success && data.jobId) {
        setResults(prev => ({
          ...prev,
          [key]: { 
            success: true, 
            message: data.message, 
            status: 'running',
            jobId: data.jobId
          }
        }));
        pollJobStatus(data.jobId, key, 'truths');
      } else if (!data.success) {
        setResults(prev => ({ ...prev, [key]: data }));
        setSyncing(prev => ({ ...prev, [key]: false }));
      }
    } catch (err) {
      setResults(prev => ({ 
        ...prev, 
        [key]: { success: false, error: err.message } 
      }));
      setSyncing(prev => ({ ...prev, [key]: false }));
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
                {Object.entries(stats).map(([name, data]) => (
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
                      {(data?.count ?? data ?? 0).toLocaleString()}
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
                        background: results[script.id].success 
                          ? (results[script.id].status === 'running' ? '#fff3cd' : '#d4edda')
                          : '#f8d7da',
                        borderRadius: '6px',
                        fontSize: '13px'
                      }}>
                        {results[script.id].success ? (
                          <>
                            <strong style={{ color: results[script.id].status === 'running' ? '#856404' : '#155724' }}>
                              {results[script.id].status === 'running' ? '⏳' : '✓'} {results[script.id].message}
                              {results[script.id].status === 'running' && results[script.id].duration_ms && (
                                <span style={{ fontWeight: 'normal', marginLeft: '8px' }}>
                                  ({Math.round(results[script.id].duration_ms / 1000)}s elapsed)
                                </span>
                              )}
                            </strong>
                            {results[script.id].stats && (
                              <div style={{ marginTop: '8px', color: '#155724' }}>
                                {/* Generic stats display - show all values */}
                                {Object.entries(results[script.id].stats).map(([key, value]) => (
                                  value !== null && value !== undefined && value !== '' ? (
                                    typeof value === 'boolean' ? (
                                      value === true ? (
                                        <div key={key} style={{ color: '#28a745' }}>
                                          ✓ {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                        </div>
                                      ) : null
                                    ) : (
                                      <div key={key}>
                                        {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}: {
                                          typeof value === 'number' ? value.toLocaleString() : value
                                        }
                                      </div>
                                    )
                                  ) : null
                                ))}
                                <div style={{ marginTop: '4px', fontSize: '12px' }}>
                                  Duration: {results[script.id].duration_ms?.toLocaleString() || 0}ms
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

          {/* Truth Stats */}
          {truthStats && Object.keys(truthStats).length > 0 && (
            <div className="stats-section" style={{ marginTop: '24px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>Truth Collections</h2>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                gap: '12px' 
              }}>
                {Object.entries(truthStats).map(([name, data]) => (
                  <div key={name} style={{ 
                    background: '#e8f4f8', 
                    padding: '12px 16px', 
                    borderRadius: '8px',
                    border: '1px solid #b8daec'
                  }}>
                    <div style={{ fontSize: '12px', color: '#055474', marginBottom: '4px' }}>
                      {name.replace('truth_', '')}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: '#055474' }}>
                      {(data?.count ?? 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Truth Discoverers */}
          <div className="discoverers-section" style={{ marginTop: '24px' }}>
            <h2 style={{ fontSize: '16px', marginBottom: '12px' }}>Truth Discoverers</h2>
            <p style={{ fontSize: '13px', color: '#6c757d', marginBottom: '16px' }}>
              Pattern discovery finds similarities and correlations across your data.
            </p>
            
            {/* Run All Button */}
            <div style={{ marginBottom: '16px' }}>
              <button
                onClick={() => runDiscoverer('all')}
                disabled={syncing['truth_all']}
                style={{
                  padding: '10px 20px',
                  background: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: syncing['truth_all'] ? 'not-allowed' : 'pointer',
                  opacity: syncing['truth_all'] ? 0.6 : 1,
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {syncing['truth_all'] ? 'Running All...' : 'Run All Discoverers'}
              </button>
              {results['truth_all'] && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: results['truth_all'].success 
                    ? (results['truth_all'].status === 'running' ? '#fff3cd' : '#d4edda')
                    : '#f8d7da',
                  borderRadius: '6px',
                  fontSize: '13px'
                }}>
                  {results['truth_all'].success ? (
                    <strong style={{ color: results['truth_all'].status === 'running' ? '#856404' : '#155724' }}>
                      {results['truth_all'].status === 'running' ? '⏳' : '✓'} {results['truth_all'].message}
                    </strong>
                  ) : (
                    <strong style={{ color: '#721c24' }}>✗ {results['truth_all'].error}</strong>
                  )}
                </div>
              )}
            </div>

            {discoverers.length === 0 ? (
              <p style={{ color: '#6c757d' }}>No discoverers available</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {discoverers.map(disc => {
                  const key = `truth_${disc.name}`;
                  return (
                    <div key={disc.name} style={{
                      background: '#fff',
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                      padding: '16px'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        marginBottom: '8px'
                      }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '15px' }}>
                            {disc.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </h3>
                          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6c757d' }}>
                            {disc.description}
                          </p>
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#999' }}>
                            Target: <code>{disc.targetCollection}</code>
                            {disc.lastRun && (
                              <span style={{ marginLeft: '12px' }}>
                                Last run: {new Date(disc.lastRun).toLocaleString()}
                              </span>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => runDiscoverer(disc.name)}
                          disabled={syncing[key] || disc.isRunning}
                          style={{
                            padding: '8px 16px',
                            background: '#055474',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: (syncing[key] || disc.isRunning) ? 'not-allowed' : 'pointer',
                            opacity: (syncing[key] || disc.isRunning) ? 0.6 : 1,
                            fontSize: '13px'
                          }}
                        >
                          {syncing[key] ? 'Running...' : disc.isRunning ? 'Already Running' : 'Run'}
                        </button>
                      </div>

                      {/* Result display */}
                      {results[key] && (
                        <div style={{
                          marginTop: '12px',
                          padding: '12px',
                          background: results[key].success 
                            ? (results[key].status === 'running' ? '#fff3cd' : '#d4edda')
                            : '#f8d7da',
                          borderRadius: '6px',
                          fontSize: '13px'
                        }}>
                          {results[key].success ? (
                            <>
                              <strong style={{ color: results[key].status === 'running' ? '#856404' : '#155724' }}>
                                {results[key].status === 'running' ? '⏳' : '✓'} {results[key].message}
                                {results[key].status === 'running' && results[key].duration_ms && (
                                  <span style={{ fontWeight: 'normal', marginLeft: '8px' }}>
                                    ({Math.round(results[key].duration_ms / 1000)}s elapsed)
                                  </span>
                                )}
                              </strong>
                              {results[key].stats && (
                                <div style={{ marginTop: '8px', color: '#155724' }}>
                                  {Object.entries(results[key].stats).map(([k, v]) => (
                                    v !== null && v !== undefined && typeof v !== 'object' ? (
                                      <div key={k}>
                                        {k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}: {
                                          typeof v === 'number' ? v.toLocaleString() : String(v)
                                        }
                                      </div>
                                    ) : null
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <strong style={{ color: '#721c24' }}>
                              ✗ Error: {results[key].error || results[key].message}
                            </strong>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
              <li><strong>Discoverers</strong> - Find patterns and similarities across your data</li>
              <li>All jobs run in the background - you can close this page and they&apos;ll continue</li>
              <li>Cron jobs run ingestion every 6 hours and discovery daily</li>
            </ul>
          </div>
        </div>
      </DashboardShell>
    </>
  );
}
