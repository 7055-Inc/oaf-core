/**
 * AffiliateAdmin Component
 * Admin panel for managing affiliate accounts and global settings
 */
import React, { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../../../../lib/csrf';
import { getApiUrl } from '../../../../lib/config';
import styles from '../../SlideIn.module.css';

export default function AffiliateAdmin({ userData }) {
  // View state
  const [activeTab, setActiveTab] = useState('affiliates'); // 'affiliates', 'settings', 'analytics'
  
  // Affiliates list state
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Settings state
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [pendingSettings, setPendingSettings] = useState({});
  const [settingsSaving, setSavingSettings] = useState(false);
  
  // Messages
  const [successMessage, setSuccessMessage] = useState('');
  
  // Selected affiliate for detail view
  const [selectedAffiliate, setSelectedAffiliate] = useState(null);
  const [affiliateStats, setAffiliateStats] = useState(null);

  // Fetch affiliates list
  const fetchAffiliates = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(getApiUrl(`api/affiliates/admin/list?${params}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch affiliates');
      }
      
      const data = await response.json();
      setAffiliates(data.affiliates || []);
      setTotalPages(data.pagination?.pages || 1);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, searchTerm]);

  // Fetch global settings
  const fetchSettings = async () => {
    try {
      setSettingsLoading(true);
      const token = getAuthToken();
      
      const response = await fetch(getApiUrl('api/affiliates/admin/settings'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      
      const data = await response.json();
      setSettings(data);
      setPendingSettings({});
    } catch (err) {
      setError(err.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    if (activeTab === 'affiliates') {
      fetchAffiliates();
    } else if (activeTab === 'settings') {
      fetchSettings();
    }
  }, [activeTab, fetchAffiliates]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'affiliates') {
        setPage(1);
        fetchAffiliates();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, typeFilter]);

  // Save settings
  const saveSettings = async () => {
    if (Object.keys(pendingSettings).length === 0) return;
    
    try {
      setSavingSettings(true);
      const token = getAuthToken();
      
      const response = await fetch(getApiUrl('api/affiliates/admin/settings'), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pendingSettings)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      const data = await response.json();
      setSettings(data.settings);
      setPendingSettings({});
      setSuccessMessage('Settings saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Update affiliate status
  const updateAffiliateStatus = async (affiliateId, newStatus) => {
    try {
      const token = getAuthToken();
      
      const response = await fetch(getApiUrl(`api/affiliates/admin/${affiliateId}`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update affiliate');
      }
      
      // Refresh list
      fetchAffiliates();
      setSuccessMessage(`Affiliate status updated to ${newStatus}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Update affiliate commission rate
  const updateAffiliateRate = async (affiliateId, newRate) => {
    try {
      const token = getAuthToken();
      
      const response = await fetch(getApiUrl(`api/affiliates/admin/${affiliateId}`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ commission_rate: parseFloat(newRate) })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update commission rate');
      }
      
      fetchAffiliates();
      setSuccessMessage('Commission rate updated');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Fetch affiliate detail stats
  const viewAffiliateDetail = async (affiliate) => {
    try {
      const token = getAuthToken();
      
      const response = await fetch(getApiUrl(`api/affiliates/admin/${affiliate.id}/stats`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch affiliate stats');
      }
      
      const stats = await response.json();
      setSelectedAffiliate(affiliate);
      setAffiliateStats(stats);
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle setting change
  const handleSettingChange = (key, value) => {
    setPendingSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Render tabs
  const renderTabs = () => (
    <div className={styles.tabContainer} style={{ marginBottom: '20px' }}>
      <button
        className={`${styles.tabButton} ${activeTab === 'affiliates' ? styles.active : ''}`}
        onClick={() => setActiveTab('affiliates')}
        style={activeTab === 'affiliates' ? { borderBottom: '2px solid var(--accent-color)' } : {}}
      >
        Affiliates
      </button>
      <button
        className={`${styles.tabButton} ${activeTab === 'settings' ? styles.active : ''}`}
        onClick={() => setActiveTab('settings')}
        style={activeTab === 'settings' ? { borderBottom: '2px solid var(--accent-color)' } : {}}
      >
        Global Settings
      </button>
    </div>
  );

  // Render affiliates list
  const renderAffiliatesList = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading affiliates...</p>
        </div>
      );
    }

    return (
      <div>
        {/* Filters */}
        <div className="form-card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '2', minWidth: '200px' }}>
              <label className={styles.label}>Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Email, name, or affiliate code..."
                className={styles.input}
              />
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label className={styles.label}>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.select}
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div style={{ flex: '1', minWidth: '120px' }}>
              <label className={styles.label}>Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={styles.select}
              >
                <option value="">All</option>
                <option value="promoter">Promoter</option>
                <option value="artist">Artist</option>
                <option value="community">Community</option>
              </select>
            </div>
            <button onClick={fetchAffiliates} className="secondary" style={{ height: '40px' }}>
              Refresh
            </button>
          </div>
        </div>

        {/* Affiliates table */}
        {affiliates.length === 0 ? (
          <div className="info-alert">
            No affiliates found matching your filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table || 'data-table'} style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 8px', textAlign: 'left' }}>Affiliate</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left' }}>Code</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Rate</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Earnings</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.map((affiliate) => (
                  <tr key={affiliate.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <div>
                        <strong>{affiliate.first_name} {affiliate.last_name}</strong>
                        <br />
                        <small style={{ color: 'var(--text-muted)' }}>{affiliate.email}</small>
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <code style={{ 
                        background: 'var(--bg-secondary)', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {affiliate.affiliate_code}
                      </code>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        background: affiliate.affiliate_type === 'promoter' ? 'rgba(46, 204, 113, 0.2)' :
                                   affiliate.affiliate_type === 'artist' ? 'rgba(155, 89, 182, 0.2)' :
                                   'rgba(52, 152, 219, 0.2)',
                        color: affiliate.affiliate_type === 'promoter' ? '#27ae60' :
                               affiliate.affiliate_type === 'artist' ? '#8e44ad' :
                               '#2980b9'
                      }}>
                        {affiliate.affiliate_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <input
                        type="number"
                        defaultValue={affiliate.commission_rate}
                        min="0"
                        max="100"
                        step="0.5"
                        style={{ width: '60px', textAlign: 'right' }}
                        onBlur={(e) => {
                          if (parseFloat(e.target.value) !== parseFloat(affiliate.commission_rate)) {
                            updateAffiliateRate(affiliate.id, e.target.value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.target.blur();
                          }
                        }}
                      />%
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <div style={{ fontSize: '14px' }}>
                        <strong>${parseFloat(affiliate.total_earnings || 0).toFixed(2)}</strong>
                        <br />
                        <small style={{ color: 'var(--text-muted)' }}>
                          ${parseFloat(affiliate.pending_balance || 0).toFixed(2)} pending
                        </small>
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <select
                        value={affiliate.status}
                        onChange={(e) => updateAffiliateStatus(affiliate.id, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          background: affiliate.status === 'active' ? 'rgba(46, 204, 113, 0.1)' :
                                     affiliate.status === 'suspended' ? 'rgba(231, 76, 60, 0.1)' :
                                     'rgba(241, 196, 15, 0.1)',
                          color: affiliate.status === 'active' ? '#27ae60' :
                                 affiliate.status === 'suspended' ? '#c0392b' :
                                 '#f39c12'
                        }}
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="pending">Pending</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <button
                        onClick={() => viewAffiliateDetail(affiliate)}
                        className="secondary"
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="secondary"
            >
              Previous
            </button>
            <span style={{ padding: '8px 16px' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="secondary"
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render affiliate detail modal
  const renderAffiliateDetail = () => {
    if (!selectedAffiliate) return null;

    return (
      <div className="modal-overlay" onClick={() => setSelectedAffiliate(null)}>
        <div 
          className="modal-content form-card" 
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3>Affiliate Details</h3>
            <button onClick={() => setSelectedAffiliate(null)} className="secondary">×</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label className={styles.label}>Name</label>
              <p>{selectedAffiliate.first_name} {selectedAffiliate.last_name}</p>
            </div>
            <div>
              <label className={styles.label}>Email</label>
              <p>{selectedAffiliate.email}</p>
            </div>
            <div>
              <label className={styles.label}>Affiliate Code</label>
              <p><code>{selectedAffiliate.affiliate_code}</code></p>
            </div>
            <div>
              <label className={styles.label}>Type</label>
              <p style={{ textTransform: 'capitalize' }}>{selectedAffiliate.affiliate_type}</p>
            </div>
            <div>
              <label className={styles.label}>Payout Method</label>
              <p style={{ textTransform: 'capitalize' }}>{selectedAffiliate.payout_method?.replace('_', ' ')}</p>
            </div>
            <div>
              <label className={styles.label}>Commission Rate</label>
              <p>{selectedAffiliate.commission_rate}%</p>
            </div>
          </div>

          {affiliateStats && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ marginBottom: '15px' }}>Performance Stats</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                <div className="stat-card" style={{ padding: '15px', background: 'var(--bg-secondary)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>${parseFloat(affiliateStats.total_earnings || 0).toFixed(2)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Earned</div>
                </div>
                <div className="stat-card" style={{ padding: '15px', background: 'var(--bg-secondary)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>${parseFloat(affiliateStats.pending_balance || 0).toFixed(2)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pending</div>
                </div>
                <div className="stat-card" style={{ padding: '15px', background: 'var(--bg-secondary)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{affiliateStats.total_referrals || 0}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Referrals</div>
                </div>
                <div className="stat-card" style={{ padding: '15px', background: 'var(--bg-secondary)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{affiliateStats.total_conversions || 0}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Conversions</div>
                </div>
                <div className="stat-card" style={{ padding: '15px', background: 'var(--bg-secondary)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{(parseFloat(affiliateStats.conversion_rate || 0) * 100).toFixed(1)}%</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Conversion Rate</div>
                </div>
                <div className="stat-card" style={{ padding: '15px', background: 'var(--bg-secondary)', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{affiliateStats.total_commissions || 0}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Commissions</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <small style={{ color: 'var(--text-muted)' }}>
              Joined: {new Date(selectedAffiliate.created_at).toLocaleDateString()}
            </small>
          </div>
        </div>
      </div>
    );
  };

  // Render settings panel
  const renderSettings = () => {
    if (settingsLoading) {
      return (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading settings...</p>
        </div>
      );
    }

    if (!settings) {
      return (
        <div className="error-alert">
          Failed to load settings.
          <button onClick={fetchSettings} className="secondary" style={{ marginLeft: '10px' }}>
            Retry
          </button>
        </div>
      );
    }

    const currentSettings = { ...settings, ...pendingSettings };
    const hasChanges = Object.keys(pendingSettings).length > 0;

    return (
      <div>
        <div className="form-card">
          <h4 style={{ marginBottom: '20px' }}>Commission Settings</h4>
          
          <div style={{ marginBottom: '20px' }}>
            <label className={styles.label}>
              Default Commission Rate (% of platform commission)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="number"
                value={currentSettings.default_commission_rate || 20}
                onChange={(e) => handleSettingChange('default_commission_rate', parseFloat(e.target.value))}
                min="0"
                max="100"
                step="0.5"
                className={styles.input}
                style={{ width: '100px' }}
              />
              <span>%</span>
            </div>
            <small style={{ color: 'var(--text-muted)' }}>
              Affiliates earn this percentage of the platform's commission on each sale.
            </small>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className={styles.label}>
              Payout Delay (days)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="number"
                value={currentSettings.payout_delay_days || 30}
                onChange={(e) => handleSettingChange('payout_delay_days', parseInt(e.target.value))}
                min="0"
                max="90"
                className={styles.input}
                style={{ width: '100px' }}
              />
              <span>days</span>
            </div>
            <small style={{ color: 'var(--text-muted)' }}>
              Commissions are held for this period before becoming eligible for payout (allows for returns).
            </small>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className={styles.label}>
              Minimum Payout Amount
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>$</span>
              <input
                type="number"
                value={currentSettings.min_payout_amount || 0}
                onChange={(e) => handleSettingChange('min_payout_amount', parseFloat(e.target.value))}
                min="0"
                step="0.01"
                className={styles.input}
                style={{ width: '100px' }}
              />
            </div>
            <small style={{ color: 'var(--text-muted)' }}>
              Set to $0 for no minimum. Affiliates can request payout once they reach this threshold.
            </small>
          </div>
        </div>

        <div className="form-card" style={{ marginTop: '20px' }}>
          <h4 style={{ marginBottom: '20px' }}>Auto-Enrollment Settings</h4>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={currentSettings.auto_enroll_promoters === true || currentSettings.auto_enroll_promoters === 1}
                onChange={(e) => handleSettingChange('auto_enroll_promoters', e.target.checked)}
              />
              <span>Auto-enroll Promoters</span>
            </label>
            <small style={{ color: 'var(--text-muted)', marginLeft: '26px', display: 'block' }}>
              Automatically create affiliate accounts for all promoters
            </small>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={currentSettings.auto_enroll_artists === true || currentSettings.auto_enroll_artists === 1}
                onChange={(e) => handleSettingChange('auto_enroll_artists', e.target.checked)}
              />
              <span>Auto-enroll Artists</span>
            </label>
            <small style={{ color: 'var(--text-muted)', marginLeft: '26px', display: 'block' }}>
              Automatically create affiliate accounts for all artists
            </small>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={currentSettings.auto_enroll_community === true || currentSettings.auto_enroll_community === 1}
                onChange={(e) => handleSettingChange('auto_enroll_community', e.target.checked)}
              />
              <span>Auto-enroll Community Members</span>
            </label>
            <small style={{ color: 'var(--text-muted)', marginLeft: '26px', display: 'block' }}>
              Automatically create affiliate accounts for all community members
            </small>
          </div>
        </div>

        {hasChanges && (
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setPendingSettings({})}
              className="secondary"
              disabled={settingsSaving}
            >
              Discard Changes
            </button>
            <button
              onClick={saveSettings}
              disabled={settingsSaving}
            >
              {settingsSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="success-alert" style={{ marginBottom: '15px' }}>
          {successMessage}
        </div>
      )}
      {error && (
        <div className="error-alert" style={{ marginBottom: '15px' }}>
          {error}
          <button 
            onClick={() => setError(null)} 
            style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      {renderTabs()}
      
      {activeTab === 'affiliates' && renderAffiliatesList()}
      {activeTab === 'settings' && renderSettings()}
      
      {renderAffiliateDetail()}
    </div>
  );
}
