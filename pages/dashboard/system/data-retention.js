/**
 * Data Retention Admin Page
 * 
 * Shows the retention policy, cleanup preview counts,
 * and allows running the cleanup manually.
 * 
 * Route: /dashboard/system/data-retention
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import DashboardShell from '../../../modules/dashboard/components/layout/DashboardShell';
import { getCurrentUser } from '../../../lib/users/api';
import { isAdmin as checkIsAdmin } from '../../../lib/userUtils';
import { apiRequest } from '../../../lib/apiUtils';

export default function DataRetentionPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [runResults, setRunResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const data = await getCurrentUser();
      setUserData(data);
      if (!checkIsAdmin(data)) {
        setError('Access denied. This page is only available to administrators.');
        return;
      }
      await Promise.all([loadPolicy(), loadPreview()]);
    } catch (err) {
      setError(err.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const loadPolicy = async () => {
    try {
      const res = await apiRequest('api/v2/system/policies/data-retention/default');
      if (res.ok) {
        const data = await res.json();
        setPolicy(data.data?.policy_text || data.policy_text);
      }
    } catch (err) {
      console.error('Error loading retention policy:', err);
    }
  };

  const loadPreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await apiRequest('api/v2/system/data-retention/preview', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPreview(data.data);
      }
    } catch (err) {
      console.error('Error loading preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const runCleanup = async () => {
    if (!confirm('This will permanently delete the data shown above. Are you sure?')) return;
    setRunning(true);
    setRunResults(null);
    try {
      const res = await apiRequest('api/v2/system/data-retention/run', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setRunResults(data);
        await loadPreview();
      } else {
        alert('Cleanup failed. Check the server logs.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell userData={null}>
        <Head><title>Data Retention | Dashboard | Brakebee</title></Head>
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading...</span>
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell userData={userData}>
        <Head><title>Data Retention | Dashboard | Brakebee</title></Head>
        <div className="alert alert-danger">{error}</div>
      </DashboardShell>
    );
  }

  const totalItems = preview ? preview.reduce((sum, r) => sum + r.count, 0) : 0;

  return (
    <DashboardShell userData={userData}>
      <Head><title>Data Retention | Dashboard | Brakebee</title></Head>

      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ marginBottom: 4 }}>Data Retention</h2>
        <p style={{ color: '#666', marginBottom: 24 }}>
          Manage data retention policy and run cleanup of expired data.
        </p>

        {/* Policy Section */}
        <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ margin: 0 }}>Retention Policy</h4>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setShowPolicy(!showPolicy)}
              >
                {showPolicy ? 'Hide Policy' : 'View Policy'}
              </button>
              <a href="/policies/data-retention" target="_blank" className="btn btn-sm btn-outline-primary">
                Public Page
              </a>
              <a href="/dashboard/system/terms" className="btn btn-sm btn-outline-primary">
                Edit in Terms & Policies
              </a>
            </div>
          </div>
          {showPolicy && policy && (
            <div
              style={{ borderTop: '1px solid #eee', paddingTop: 16, fontSize: 14, lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: policy }}
            />
          )}
        </div>

        {/* Cleanup Preview */}
        <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ margin: 0 }}>Cleanup Preview</h4>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={loadPreview}
              disabled={previewLoading}
            >
              {previewLoading ? 'Refreshing...' : 'Refresh Counts'}
            </button>
          </div>

          {previewLoading && !preview && (
            <p style={{ color: '#888' }}>Loading preview...</p>
          )}

          {preview && (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px' }}>Data Category</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', width: 100 }}>Records</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '8px 12px' }}>{item.name}</td>
                      <td style={{
                        textAlign: 'right',
                        padding: '8px 12px',
                        fontWeight: item.count > 0 ? 600 : 400,
                        color: item.count > 0 ? '#dc3545' : '#999'
                      }}>
                        {item.count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #dee2e6' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>Total</td>
                    <td style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600, color: totalItems > 0 ? '#dc3545' : '#999' }}>
                      {totalItems.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  className="btn btn-danger"
                  onClick={runCleanup}
                  disabled={running || totalItems === 0}
                >
                  {running ? 'Running Cleanup...' : `Run Cleanup Now (${totalItems} records)`}
                </button>
                {totalItems === 0 && (
                  <span style={{ color: '#28a745', fontSize: 14 }}>All clean — nothing to purge.</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Run Results */}
        {runResults && (
          <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: 8, padding: 20, marginBottom: 24 }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#155724' }}>Cleanup Complete</h4>
            <p style={{ fontSize: 13, color: '#155724', margin: '0 0 12px 0' }}>
              Ran at {new Date(runResults.timestamp).toLocaleString()}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #b1dfbb' }}>
                  <th style={{ textAlign: 'left', padding: '6px 12px', color: '#155724' }}>Task</th>
                  <th style={{ textAlign: 'right', padding: '6px 12px', width: 80, color: '#155724' }}>Deleted</th>
                  <th style={{ textAlign: 'right', padding: '6px 12px', width: 80, color: '#155724' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {runResults.data.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #c3e6cb' }}>
                    <td style={{ padding: '6px 12px', color: '#155724' }}>{r.name}</td>
                    <td style={{ textAlign: 'right', padding: '6px 12px', color: '#155724' }}>{r.count}</td>
                    <td style={{ textAlign: 'right', padding: '6px 12px', color: r.status === 'error' ? '#dc3545' : '#155724' }}>
                      {r.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Info */}
        <div style={{ background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 8, padding: 20, fontSize: 13, color: '#666' }}>
          <strong>Automated Schedule:</strong> This cleanup runs automatically every day at 3:00 AM MST.
          Use the manual run above for immediate cleanup or to verify counts before the next scheduled run.
        </div>
      </div>
    </DashboardShell>
  );
}
