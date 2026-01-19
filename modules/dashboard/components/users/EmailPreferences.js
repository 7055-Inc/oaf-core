/**
 * Email Preferences Component
 * 
 * Manages user email notification preferences, history, and delivery status.
 * Uses global CSS classes from global.css
 */

import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';

const EmailPreferences = () => {
  const [activeTab, setActiveTab] = useState('preferences');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  
  // Preferences data
  const [preferences, setPreferences] = useState({
    frequency: 'weekly',
    is_enabled: true,
    categories: 'all'
  });
  
  // Email history data
  const [emailHistory, setEmailHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Bounce status data
  const [bounceStatus, setBounceStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  useEffect(() => {
    if (activeTab === 'history' && !emailHistory.length) {
      loadEmailHistory();
    } else if (activeTab === 'status' && !bounceStatus) {
      loadBounceStatus();
    }
  }, [activeTab]);

  const loadPreferences = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authApiRequest('emails/preferences');
      
      if (!response.ok) {
        throw new Error('Failed to load preferences');
      }
      
      const data = await response.json();
      
      setPreferences({
        frequency: data.frequency || 'weekly',
        is_enabled: data.is_enabled !== undefined ? Boolean(data.is_enabled) : true,
        categories: data.categories || 'all'
      });
    } catch (err) {
      setError('Failed to load email preferences');
    } finally {
      setLoading(false);
    }
  };

  const loadEmailHistory = async () => {
    setHistoryLoading(true);
    setError(null);
    
    try {
      // TEMPORARILY DISABLED FOR DEBUGGING DOMAIN 500 ERROR
      setHistoryLoading(false);
      return;
    } catch (err) {
      setError('Failed to load email history');
      setEmailHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadBounceStatus = async () => {
    setStatusLoading(true);
    setError(null);
    
    try {
      const response = await authApiRequest('emails/bounce-status');
      if (response.ok) {
        const data = await response.json();
        setBounceStatus(data);
      } else {
        throw new Error('Failed to load bounce status');
      }
    } catch (err) {
      setError('Failed to load bounce status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleUpdatePreferences = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage('');

    try {
      const response = await authApiRequest('emails/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frequency: preferences.frequency,
          is_enabled: preferences.is_enabled,
          categories: preferences.categories
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update preferences');
      }

      setMessage('Email preferences updated successfully!');
    } catch (err) {
      setError(`Failed to update preferences: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateEmail = async () => {
    setLoading(true);
    setError(null);
    setMessage('');

    try {
      const response = await authApiRequest('emails/reactivate', {
        method: 'POST'
      });
      
      if (response.ok) {
        setMessage('Email reactivated successfully!');
        await loadBounceStatus();
      } else {
        throw new Error('Failed to reactivate email');
      }
    } catch (err) {
      setError(`Failed to reactivate email: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const RadioOption = ({ name, value, checked, onChange, label, description }) => (
    <label className={`radio-card ${checked ? 'selected' : ''}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
      />
      <div className="radio-card-content">
        <span className="radio-card-label">{label}</span>
        <p className="radio-card-description">{description}</p>
      </div>
    </label>
  );

  const renderPreferences = () => (
    <form onSubmit={handleUpdatePreferences}>
      <div style={{ marginBottom: '24px' }}>
        <label>Email Notifications</label>
        <label className="toggle-slider-container" style={{ marginTop: '8px' }}>
          <input
            type="checkbox"
            className="toggle-slider-input"
            checked={preferences.is_enabled}
            onChange={(e) => setPreferences({ ...preferences, is_enabled: e.target.checked })}
          />
          <span className="toggle-slider"></span>
          <span className="toggle-text">{preferences.is_enabled ? 'Enabled' : 'Disabled'}</span>
        </label>
        <small className="form-help">Turn off to stop receiving all email notifications.</small>
      </div>

      {preferences.is_enabled && (
        <>
          <div style={{ marginBottom: '24px' }}>
            <label>Email Frequency</label>
            <div className="radio-card-group">
              <RadioOption
                name="frequency"
                value="live"
                checked={preferences.frequency === 'live'}
                onChange={(e) => setPreferences({ ...preferences, frequency: e.target.value })}
                label="Live (Immediate)"
                description="Receive emails immediately when events occur"
              />
              <RadioOption
                name="frequency"
                value="hourly"
                checked={preferences.frequency === 'hourly'}
                onChange={(e) => setPreferences({ ...preferences, frequency: e.target.value })}
                label="Hourly Digest"
                description="Receive a summary of events every hour"
              />
              <RadioOption
                name="frequency"
                value="daily"
                checked={preferences.frequency === 'daily'}
                onChange={(e) => setPreferences({ ...preferences, frequency: e.target.value })}
                label="Daily Digest"
                description="Receive a daily summary of events"
              />
              <RadioOption
                name="frequency"
                value="weekly"
                checked={preferences.frequency === 'weekly'}
                onChange={(e) => setPreferences({ ...preferences, frequency: e.target.value })}
                label="Weekly Digest"
                description="Receive a weekly summary of events"
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label>Email Categories</label>
            <div className="radio-card-group">
              <RadioOption
                name="categories"
                value="all"
                checked={preferences.categories === 'all'}
                onChange={(e) => setPreferences({ ...preferences, categories: e.target.value })}
                label="All Notifications"
                description="Receive all types of email notifications"
              />
              <RadioOption
                name="categories"
                value="important"
                checked={preferences.categories === 'important'}
                onChange={(e) => setPreferences({ ...preferences, categories: e.target.value })}
                label="Important Only"
                description="Receive only critical notifications"
              />
            </div>
          </div>
        </>
      )}

      <div className="form-actions">
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </form>
  );

  const renderHistory = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h4 style={{ margin: 0 }}>Email History</h4>
        <button onClick={loadEmailHistory} disabled={historyLoading} className="secondary small">
          {historyLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {emailHistory.length === 0 && !historyLoading && (
        <div className="empty-state">
          <i className="fa-solid fa-inbox"></i>
          <p>No email history available.</p>
        </div>
      )}

      {emailHistory.length > 0 && (
        <div className="expandable-list">
          {emailHistory.map(email => (
            <div key={email.id} className="expandable-row">
              <div className="expandable-row-header" style={{ cursor: 'default' }}>
                <div style={{ flex: 1 }}>
                  <strong>{email.template_name}</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                    Sent: {new Date(email.sent_at).toLocaleString()}
                  </p>
                  {email.error_message && (
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#dc2626' }}>
                      Error: {email.error_message}
                    </p>
                  )}
                </div>
                <span className={`status-badge ${email.status === 'sent' ? 'success' : email.status === 'failed' ? 'danger' : 'muted'}`}>
                  {email.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStatus = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h4 style={{ margin: 0 }}>Email Delivery Status</h4>
        <button onClick={loadBounceStatus} disabled={statusLoading} className="secondary small">
          {statusLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {bounceStatus && (
        <div>
          <div className={`status-indicator ${bounceStatus.is_blacklisted ? 'disconnected' : 'connected'}`} style={{ marginBottom: '20px' }}>
            <i className={`fa-solid ${bounceStatus.is_blacklisted ? 'fa-ban' : 'fa-envelope-circle-check'}`}></i>
            <span>{bounceStatus.is_blacklisted ? 'Delivery Blocked' : 'Delivery Active'}</span>
          </div>
          
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">Email Status</span>
              <span className="stat-value">{bounceStatus.is_blacklisted ? 'Blocked due to bounces' : 'Active'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Hard Bounces</span>
              <span className="stat-value">{bounceStatus.hard_bounces || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Soft Bounces</span>
              <span className="stat-value">{bounceStatus.soft_bounces || 0}</span>
            </div>
            {bounceStatus.last_bounce_at && (
              <div className="stat-item">
                <span className="stat-label">Last Bounce</span>
                <span className="stat-value">{new Date(bounceStatus.last_bounce_at).toLocaleString()}</span>
              </div>
            )}
          </div>

          {bounceStatus.is_blacklisted && (
            <div style={{ marginTop: '24px', padding: '20px', background: '#fef2f2', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 8px', color: '#b91c1c' }}>Reactivate Email Delivery</h4>
              <p style={{ margin: '0 0 16px', color: '#7f1d1d', fontSize: '14px' }}>
                Your email has been temporarily blocked due to delivery issues.
              </p>
              <button onClick={handleReactivateEmail} disabled={loading}>
                {loading ? 'Requesting...' : 'Request Reactivation'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="tab-container">
        <button 
          className={`tab ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          Preferences
        </button>
        <button 
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Email History
        </button>
        <button 
          className={`tab ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          Delivery Status
        </button>
      </div>

      <div className="form-card">
        {error && (
          <div className="error-alert">
            <i className="fa-solid fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        {message && (
          <div className="success-alert">
            <i className="fa-solid fa-check-circle"></i>
            {message}
          </div>
        )}

        {activeTab === 'preferences' && renderPreferences()}
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'status' && renderStatus()}
      </div>
    </div>
  );
};

export default EmailPreferences;
