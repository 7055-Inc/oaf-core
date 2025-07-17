import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../lib/csrf';
import styles from '../styles/EmailPreferences.module.css';

const EmailPreferences = ({ userId }) => {
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

  // Load initial data
  useEffect(() => {
    if (userId) {
      loadPreferences();
    }
  }, [userId]);

  // Load data based on active tab
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
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/emails/preferences');
      
      if (!response.ok) {
        throw new Error('Failed to load preferences');
      }
      
      const data = await response.json();
      
      // Ensure all required fields are present with defaults
      // Convert database tinyint(1) to boolean
      const loadedPreferences = {
        frequency: data.frequency || 'weekly',
        is_enabled: data.is_enabled !== undefined ? Boolean(data.is_enabled) : true,
        categories: data.categories || 'all'
      };
      
      setPreferences(loadedPreferences);
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
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/emails/log');
      
      if (!response.ok) {
        throw new Error('Failed to load email history');
      }
      
      const data = await response.json();
      
      // Ensure we always set an array
      if (Array.isArray(data)) {
        setEmailHistory(data);
      } else {
        setEmailHistory([]);
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setError('Failed to load email history');
      setEmailHistory([]); // Ensure it's always an array
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadBounceStatus = async () => {
    setStatusLoading(true);
    setError(null);
    
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/emails/bounce-status');
      setBounceStatus(response);
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
      // Send preferences data - backend handles JSON serialization
      const requestData = {
        frequency: preferences.frequency,
        is_enabled: preferences.is_enabled,
        categories: preferences.categories
      };
      
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/emails/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
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
      await authenticatedApiRequest('https://api2.onlineartfestival.com/emails/reactivate', {
        method: 'POST'
      });
      setMessage('Email reactivated successfully!');
      
      // Refresh bounce status
      await loadBounceStatus();
    } catch (err) {
      setError(`Failed to reactivate email: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderPreferences = () => (
    <div className={styles.preferences}>
      <h3>Email Notification Preferences</h3>
      
      <form onSubmit={handleUpdatePreferences} className={styles.preferencesForm}>
        <div className={styles.formGroup}>
          <label>Email Notifications:</label>
          <div className={styles.toggleLabel}>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={preferences.is_enabled}
                onChange={(e) => setPreferences({ ...preferences, is_enabled: e.target.checked })}
              />
              <span className={styles.toggleLabels}>
                <span className={!preferences.is_enabled ? styles.active : ''}>Disabled</span>
                <span className={preferences.is_enabled ? styles.active : ''}>Enabled</span>
              </span>
            </label>
          </div>
          <p className={styles.helpText}>
            Turn off to stop receiving all email notifications from the system.
          </p>
        </div>

        {preferences.is_enabled && (
          <>
            <div className={styles.formGroup}>
              <label>Email Frequency:</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="frequency"
                    value="live"
                    checked={preferences.frequency === 'live'}
                    onChange={(e) => setPreferences({ ...preferences, frequency: e.target.value })}
                  />
                  <span>Live (Immediate)</span>
                  <p className={styles.radioHelp}>Receive emails immediately when events occur</p>
                </label>
                
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="frequency"
                    value="hourly"
                    checked={preferences.frequency === 'hourly'}
                    onChange={(e) => setPreferences({ ...preferences, frequency: e.target.value })}
                  />
                  <span>Hourly Digest</span>
                  <p className={styles.radioHelp}>Receive a summary of events every hour</p>
                </label>
                
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="frequency"
                    value="daily"
                    checked={preferences.frequency === 'daily'}
                    onChange={(e) => setPreferences({ ...preferences, frequency: e.target.value })}
                  />
                  <span>Daily Digest</span>
                  <p className={styles.radioHelp}>Receive a daily summary of events</p>
                </label>
                
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="frequency"
                    value="weekly"
                    checked={preferences.frequency === 'weekly'}
                    onChange={(e) => setPreferences({ ...preferences, frequency: e.target.value })}
                  />
                  <span>Weekly Digest</span>
                  <p className={styles.radioHelp}>Receive a weekly summary of events</p>
                </label>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Email Categories:</label>
              <div className={styles.categoryGroup}>
                <label className={styles.categoryLabel}>
                  <input
                    type="radio"
                    name="categories"
                    value="all"
                    checked={preferences.categories === 'all'}
                    onChange={(e) => setPreferences({ ...preferences, categories: e.target.value })}
                  />
                  <span>All Notifications</span>
                  <p className={styles.categoryHelp}>Receive all types of email notifications</p>
                </label>
                
                <label className={styles.categoryLabel}>
                  <input
                    type="radio"
                    name="categories"
                    value="important"
                    checked={preferences.categories === 'important'}
                    onChange={(e) => setPreferences({ ...preferences, categories: e.target.value })}
                  />
                  <span>Important Only</span>
                  <p className={styles.categoryHelp}>Receive only critical notifications</p>
                </label>
              </div>
            </div>
          </>
        )}

        <div className={styles.buttonGroup}>
          <button type="submit" className={styles.saveButton} disabled={loading}>
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderHistory = () => (
    <div className={styles.history}>
      <div className={styles.historyHeader}>
        <h3>Email History</h3>
        <button 
          className={styles.refreshButton}
          onClick={loadEmailHistory}
          disabled={historyLoading}
        >
          {historyLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {emailHistory.length === 0 && !historyLoading && (
        <div className={styles.emptyState}>
          <p>No email history available.</p>
        </div>
      )}

      <div className={styles.emailList}>
        {emailHistory.map(email => (
          <div key={email.id} className={styles.emailItem}>
            <div className={styles.emailHeader}>
              <span className={styles.emailTemplate}>{email.template_name}</span>
              <span className={`${styles.emailStatus} ${styles[email.status]}`}>
                {email.status}
              </span>
            </div>
            <div className={styles.emailDetails}>
              <span>Sent: {new Date(email.sent_at).toLocaleString()}</span>
              {email.error_message && (
                <span className={styles.errorMessage}>Error: {email.error_message}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStatus = () => (
    <div className={styles.status}>
      <div className={styles.statusHeader}>
        <h3>Email Delivery Status</h3>
        <button 
          className={styles.refreshButton}
          onClick={loadBounceStatus}
          disabled={statusLoading}
        >
          {statusLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {bounceStatus && (
        <div className={styles.statusContent}>
          <div className={styles.statusCard}>
            <div className={styles.statusIndicator}>
              <span className={`${styles.statusBadge} ${bounceStatus.is_blacklisted ? styles.blocked : styles.active}`}>
                {bounceStatus.is_blacklisted ? 'Blocked' : 'Active'}
              </span>
            </div>
            
            <div className={styles.statusDetails}>
              <p><strong>Email Status:</strong> {bounceStatus.is_blacklisted ? 'Delivery blocked due to bounces' : 'Delivery active'}</p>
              <p><strong>Hard Bounces:</strong> {bounceStatus.hard_bounces || 0}</p>
              <p><strong>Soft Bounces:</strong> {bounceStatus.soft_bounces || 0}</p>
              {bounceStatus.last_bounce_at && (
                <p><strong>Last Bounce:</strong> {new Date(bounceStatus.last_bounce_at).toLocaleString()}</p>
              )}
            </div>
          </div>

          {bounceStatus.is_blacklisted && (
            <div className={styles.reactivationSection}>
              <h4>Reactivate Email Delivery</h4>
              <p>Your email has been temporarily blocked due to delivery issues. You can request reactivation:</p>
              <button 
                className={styles.reactivateButton}
                onClick={handleReactivateEmail}
                disabled={loading}
              >
                {loading ? 'Requesting...' : 'Request Reactivation'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.emailPreferences}>
      <div className={styles.tabs}>
        <button 
          className={activeTab === 'preferences' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('preferences')}
        >
          Preferences
        </button>
        <button 
          className={activeTab === 'history' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('history')}
        >
          Email History
        </button>
        <button 
          className={activeTab === 'status' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('status')}
        >
          Delivery Status
        </button>
      </div>

      <div className={styles.content}>
        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        {message && (
          <div className={styles.success}>
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