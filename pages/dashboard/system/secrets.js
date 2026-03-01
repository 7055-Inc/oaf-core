/**
 * Secrets Manager Admin Page
 * 
 * View, edit, add, and copy secrets between environments.
 * Route: /dashboard/system/secrets
 */

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import DashboardShell from '../../../modules/dashboard/components/layout/DashboardShell';
import { getCurrentUser } from '../../../lib/users/api';
import { isAdmin as checkIsAdmin } from '../../../lib/userUtils';
import { apiRequest } from '../../../lib/apiUtils';

export default function SecretsPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [secrets, setSecrets] = useState(null);
  const [environments, setEnvironments] = useState([]);
  const [activeEnv, setActiveEnv] = useState('');
  const [search, setSearch] = useState('');
  const [revealedKeys, setRevealedKeys] = useState(new Set());
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [copyTarget, setCopyTarget] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const data = await getCurrentUser();
      setUserData(data);
      if (!checkIsAdmin(data)) {
        setError('Access denied. Administrators only.');
        return;
      }
      await loadEnvironments();
    } catch (err) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const loadEnvironments = async () => {
    try {
      const res = await apiRequest('api/v2/system/secrets/environments');
      if (res.ok) {
        const data = await res.json();
        setEnvironments(data.data || []);
        if (data.data?.length > 0) {
          const current = data.data.find(e => e.isCurrent) || data.data[0];
          setActiveEnv(current.name);
          await loadSecrets(current.name);
        }
      }
    } catch (err) {
      console.error('Error loading environments:', err);
    }
  };

  const loadSecrets = async (envName) => {
    try {
      const res = await apiRequest(`api/v2/system/secrets/list?env=${envName}`);
      if (res.ok) {
        const data = await res.json();
        setSecrets(data.data || {});
        setRevealedKeys(new Set());
      }
    } catch (err) {
      console.error('Error loading secrets:', err);
    }
  };

  const switchEnv = async (envName) => {
    setActiveEnv(envName);
    setSearch('');
    setEditingKey(null);
    setShowAdd(false);
    await loadSecrets(envName);
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const toggleReveal = (key) => {
    setRevealedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const startEdit = (key, value) => {
    setEditingKey(key);
    setEditValue(value);
  };

  const saveEdit = async () => {
    if (!editingKey) return;
    setSaving(true);
    try {
      const res = await apiRequest('api/v2/system/secrets/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ env: activeEnv, key: editingKey, value: editValue }),
      });
      if (res.ok) {
        showMessage(`Updated ${editingKey}`);
        setEditingKey(null);
        await loadSecrets(activeEnv);
      } else {
        const data = await res.json();
        showMessage(data.error || 'Failed to save', 'error');
      }
    } catch (err) {
      showMessage('Error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const addSecret = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    setSaving(true);
    try {
      const res = await apiRequest('api/v2/system/secrets/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ env: activeEnv, key: newKey.trim(), value: newValue }),
      });
      if (res.ok) {
        showMessage(`Added ${newKey.trim()}`);
        setNewKey('');
        setNewValue('');
        setShowAdd(false);
        await loadSecrets(activeEnv);
      } else {
        const data = await res.json();
        showMessage(data.error || 'Failed to add', 'error');
      }
    } catch (err) {
      showMessage('Error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteSecret = async (key) => {
    if (!confirm(`Remove "${key}" from ${activeEnv}?`)) return;
    try {
      const res = await apiRequest('api/v2/system/secrets/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ env: activeEnv, key }),
      });
      if (res.ok) {
        showMessage(`Removed ${key}`);
        await loadSecrets(activeEnv);
      }
    } catch (err) {
      showMessage('Error: ' + err.message, 'error');
    }
  };

  const copyToEnv = async () => {
    if (!copyTarget || copyTarget === activeEnv) return;
    if (!confirm(`Copy ALL secrets from "${activeEnv}" to "${copyTarget}"? This will overwrite any matching keys in ${copyTarget}.`)) return;
    setSaving(true);
    try {
      const res = await apiRequest('api/v2/system/secrets/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromEnv: activeEnv, toEnv: copyTarget }),
      });
      if (res.ok) {
        const data = await res.json();
        showMessage(`Copied ${data.count} secrets to ${copyTarget}`);
      } else {
        const data = await res.json();
        showMessage(data.error || 'Copy failed', 'error');
      }
    } catch (err) {
      showMessage('Error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const maskValue = (val) => {
    if (!val) return '';
    if (val.length <= 8) return '****';
    return val.substring(0, 4) + '...' + val.substring(val.length - 4);
  };

  if (loading) {
    return (
      <DashboardShell userData={null}>
        <Head><title>Secrets Manager | Dashboard</title></Head>
        <div className="loading-state"><div className="spinner"></div><span>Loading...</span></div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell userData={userData}>
        <Head><title>Secrets Manager | Dashboard</title></Head>
        <div className="alert alert-danger">{error}</div>
      </DashboardShell>
    );
  }

  const sortedKeys = secrets
    ? Object.keys(secrets).filter(k => !search || k.toLowerCase().includes(search.toLowerCase())).sort()
    : [];

  const otherEnvs = environments.filter(e => e.name !== activeEnv);

  return (
    <DashboardShell userData={userData}>
      <Head><title>Secrets Manager | Dashboard</title></Head>

      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <h2 style={{ marginBottom: 4 }}>Secrets Manager</h2>
        <p style={{ color: '#666', marginBottom: 20 }}>
          Manage credentials stored in GCP Secret Manager. Changes take effect on next service restart.
        </p>

        {message && (
          <div style={{
            padding: '10px 16px', marginBottom: 16, borderRadius: 6,
            background: message.type === 'error' ? '#f8d7da' : '#d4edda',
            color: message.type === 'error' ? '#721c24' : '#155724',
            border: `1px solid ${message.type === 'error' ? '#f5c6cb' : '#c3e6cb'}`
          }}>
            {message.text}
          </div>
        )}

        {/* Environment tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          {environments.map(env => (
            <button
              key={env.name}
              onClick={() => switchEnv(env.name)}
              className={`btn btn-sm ${activeEnv === env.name ? 'btn-primary' : 'btn-outline-secondary'}`}
            >
              {env.name} {env.isCurrent && '(this server)'} — {env.count} keys
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search keys..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: '6px 12px', border: '1px solid #ced4da', borderRadius: 4, fontSize: 14 }}
          />
          <button className="btn btn-sm btn-success" onClick={() => { setShowAdd(true); setEditingKey(null); }}>
            + Add Secret
          </button>
          {otherEnvs.length > 0 && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <select
                value={copyTarget}
                onChange={e => setCopyTarget(e.target.value)}
                style={{ padding: '4px 8px', border: '1px solid #ced4da', borderRadius: 4, fontSize: 13 }}
              >
                <option value="">Copy to...</option>
                {otherEnvs.map(e => <option key={e.name} value={e.name}>{e.name}</option>)}
              </select>
              {copyTarget && (
                <button className="btn btn-sm btn-warning" onClick={copyToEnv} disabled={saving}>
                  Copy All
                </button>
              )}
            </div>
          )}
        </div>

        {/* Add new secret */}
        {showAdd && (
          <div style={{ background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="KEY_NAME"
                value={newKey}
                onChange={e => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                style={{ width: 240, padding: '6px 12px', border: '1px solid #ced4da', borderRadius: 4, fontFamily: 'monospace', fontSize: 13 }}
              />
              <input
                type="text"
                placeholder="secret value"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                style={{ flex: 1, minWidth: 200, padding: '6px 12px', border: '1px solid #ced4da', borderRadius: 4, fontFamily: 'monospace', fontSize: 13 }}
              />
              <button className="btn btn-sm btn-success" onClick={addSecret} disabled={saving || !newKey || !newValue}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Secrets table */}
        <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #dee2e6', background: '#f8f9fa' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', width: '30%' }}>Key</th>
                <th style={{ textAlign: 'left', padding: '10px 12px' }}>Value</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedKeys.map(key => (
                <tr key={key} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 500 }}>{key}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#555' }}>
                    {editingKey === key ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          style={{ flex: 1, padding: '4px 8px', border: '1px solid #80bdff', borderRadius: 4, fontFamily: 'monospace', fontSize: 13, outline: 'none' }}
                          autoFocus
                        />
                        <button className="btn btn-sm btn-success" onClick={saveEdit} disabled={saving}>
                          {saving ? '...' : 'Save'}
                        </button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => setEditingKey(null)}>Cancel</button>
                      </div>
                    ) : (
                      <span>{revealedKeys.has(key) ? secrets[key] : maskValue(secrets[key])}</span>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {editingKey !== key && (
                      <>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          style={{ marginRight: 4, fontSize: 11, padding: '2px 8px' }}
                          onClick={() => toggleReveal(key)}
                        >
                          {revealedKeys.has(key) ? 'Hide' : 'Show'}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          style={{ marginRight: 4, fontSize: 11, padding: '2px 8px' }}
                          onClick={() => startEdit(key, secrets[key])}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          style={{ fontSize: 11, padding: '2px 8px' }}
                          onClick={() => deleteSecret(key)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {sortedKeys.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: 20, textAlign: 'center', color: '#999' }}>
                    {search ? 'No secrets match your search.' : 'No secrets found in this environment.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 16, fontSize: 12, color: '#888' }}>
          {sortedKeys.length} of {secrets ? Object.keys(secrets).length : 0} keys shown.
          After editing, restart services: <code>pm2 restart all</code>
        </div>
      </div>
    </DashboardShell>
  );
}
