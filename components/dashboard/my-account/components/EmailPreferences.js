import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../lib/csrf';

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
    <div style={{ maxWidth: '600px' }}>
      <h3>Email Notification Preferences</h3>
      
      <form onSubmit={handleUpdatePreferences}>
        <div style={{ marginBottom: '30px' }}>
          <label>Email Notifications:</label>
          <div style={{ margin: '10px 0' }}>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences.is_enabled}
                onChange={(e) => setPreferences({ ...preferences, is_enabled: e.target.checked })}
              />
              <span className="toggle-labels">
                <span className={!preferences.is_enabled ? 'active' : ''}>Disabled</span>
                <span className={preferences.is_enabled ? 'active' : ''}>Enabled</span>
              </span>
            </label>
          </div>
          <small style={{ fontSize: '14px', color: '#6c757d' }}>
            Turn off to stop receiving all email notifications from the system.
          </small>
        </div>

        {preferences.is_enabled && (
          <>
            <div style={{ marginBottom: '30px' }}>
              <label>Email Frequency:</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '15px', border: '2px solid #e9ecef', borderRadius: '8px', cursor: 'pointer', background: '#f8f9fa' }}>
                  <input
                    type="radio"
                    name="frequency"
                    value="live"
                    checked={preferences.frequency === 'live'}
                    onChange={(e) => setPreferences({ ...preferences, frequency: e.target.value })}
                    style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: '#055474' }}
                  />
                  <div>
                    <span style={{ fontWeight: '500', color: preferences.frequency === 'live' ? '#055474' : '#495057' }}>Live (Immediate)</span>
                    <p style={{ fontSize: '13px', color: '#6c757d', marginTop: '5px', lineHeight: '1.4', margin: '5px 0 0 0' }}>Receive emails immediately when events occur</p>
                  </div>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '15px', border: '2px solid #e9ecef', borderRadius: '8px', cursor: 'pointer', background: '#f8f9fa' }}>
                  <input
                    type="radio"
                    name="frequency"
                    value="hourly"
                    checked={preferences.frequency === 'hourly'}
                    onChange={(e) => setPreferences({ ...preferences, frequency: e.target.value })}
                    style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: '#055474' }}
                  />
                  <div>
                    <span style={{ fontWeight: '500', color: preferences.frequency === 'hourly' ? '#055474' : '#495057' }}>Hourly Digest</span>
                    <p style={{ fontSize: '13px', color: '#6c757d', marginTop: '5px', lineHeight: '1.4', margin: '5px 0 0 0' }}>Receive a summary of events every hour</p>
                  </div>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '15px', border: '2px solid #e9ecef', borderRadius: '8px', cursor: 'pointer', background: '#f8f9fa' }}>
                  <input
                    type="radio"
                    name="frequency"
                    value="daily"
                    checked={preferences.frequency === 'daily'}
                    onChange={(e) => setPreferences({ ...preferences, frequency: e.target.value })}
                    style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: '#055474' }}
                  />
                  <div>
                    <span style={{ fontWeight: '500', color: preferences.frequency === 'daily' ? '#055474' : '#495057' }}>Daily Digest</span>
                    <p style={{ fontSize: '13px', color: '#6c757d', marginTop: '5px', lineHeight: '1.4', margin: '5px 0 0 0' }}>Receive a daily summary of events</p>
                  </div>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '15px', border: '2px solid #e9ecef', borderRadius: '8px', cursor: 'pointer', background: '#f8f9fa' }}>
                  <input
                    type="radio"
                    name="frequency"
                    value="weekly"
                    checked={preferences.frequency === 'weekly'}
                    onChange={(e) => setPreferences({ ...preferences, frequency: e.target.value })}
                    style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: '#055474' }}
                  />
                  <div>
                    <span style={{ fontWeight: '500', color: preferences.frequency === 'weekly' ? '#055474' : '#495057' }}>Weekly Digest</span>
                    <p style={{ fontSize: '13px', color: '#6c757d', marginTop: '5px', lineHeight: '1.4', margin: '5px 0 0 0' }}>Receive a weekly summary of events</p>
                  </div>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label>Email Categories:</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '15px', border: '2px solid #e9ecef', borderRadius: '8px', cursor: 'pointer', background: '#f8f9fa' }}>
                  <input
                    type="radio"
                    name="categories"
                    value="all"
                    checked={preferences.categories === 'all'}
                    onChange={(e) => setPreferences({ ...preferences, categories: e.target.value })}
                    style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: '#055474' }}
                  />
                  <div>
                    <span style={{ fontWeight: '500', color: preferences.categories === 'all' ? '#055474' : '#495057' }}>All Notifications</span>
                    <p style={{ fontSize: '13px', color: '#6c757d', marginTop: '5px', lineHeight: '1.4', margin: '5px 0 0 0' }}>Receive all types of email notifications</p>
                  </div>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '15px', border: '2px solid #e9ecef', borderRadius: '8px', cursor: 'pointer', background: '#f8f9fa' }}>
                  <input
                    type="radio"
                    name="categories"
                    value="important"
                    checked={preferences.categories === 'important'}
                    onChange={(e) => setPreferences({ ...preferences, categories: e.target.value })}
                    style={{ marginTop: '3px', width: '18px', height: '18px', accentColor: '#055474' }}
                  />
                  <div>
                    <span style={{ fontWeight: '500', color: preferences.categories === 'important' ? '#055474' : '#495057' }}>Important Only</span>
                    <p style={{ fontSize: '13px', color: '#6c757d', marginTop: '5px', lineHeight: '1.4', margin: '5px 0 0 0' }}>Receive only critical notifications</p>
                  </div>
                </label>
              </div>
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderHistory = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Email History</h3>
        <button 
          onClick={loadEmailHistory}
          disabled={historyLoading}
          className="secondary"
        >
          {historyLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {emailHistory.length === 0 && !historyLoading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d', fontStyle: 'italic' }}>
          <p>No email history available.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {emailHistory.map(email => (
          <div key={email.id} style={{ background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '8px', padding: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontWeight: '600', color: '#495057' }}>{email.template_name}</span>
              <span style={{ 
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontSize: '12px', 
                fontWeight: '600', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px',
                backgroundColor: email.status === 'sent' ? '#d4edda' : email.status === 'failed' ? '#f8d7da' : '#fff3cd',
                color: email.status === 'sent' ? '#155724' : email.status === 'failed' ? '#721c24' : '#856404'
              }}>
                {email.status}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '14px', color: '#6c757d' }}>
              <span>Sent: {new Date(email.sent_at).toLocaleString()}</span>
              {email.error_message && (
                <span style={{ color: '#dc3545', fontWeight: '500' }}>Error: {email.error_message}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStatus = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Email Delivery Status</h3>
        <button 
          onClick={loadBounceStatus}
          disabled={statusLoading}
          className="secondary"
        >
          {statusLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {bounceStatus && (
        <div>
          <div style={{ background: '#f8f9fa', border: '2px solid #e9ecef', borderRadius: '8px', padding: '25px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
              <span style={{ 
                padding: '6px 12px', 
                borderRadius: '4px', 
                fontSize: '14px', 
                fontWeight: '600',
                backgroundColor: bounceStatus.is_blacklisted ? '#f8d7da' : '#d4edda',
                color: bounceStatus.is_blacklisted ? '#721c24' : '#155724'
              }}>
                {bounceStatus.is_blacklisted ? 'Blocked' : 'Active'}
              </span>
            </div>
            
            <div>
              <p><strong>Email Status:</strong> {bounceStatus.is_blacklisted ? 'Delivery blocked due to bounces' : 'Delivery active'}</p>
              <p><strong>Hard Bounces:</strong> {bounceStatus.hard_bounces || 0}</p>
              <p><strong>Soft Bounces:</strong> {bounceStatus.soft_bounces || 0}</p>
              {bounceStatus.last_bounce_at && (
                <p><strong>Last Bounce:</strong> {new Date(bounceStatus.last_bounce_at).toLocaleString()}</p>
              )}
            </div>
          </div>

          {bounceStatus.is_blacklisted && (
            <div>
              <h4>Reactivate Email Delivery</h4>
              <p>Your email has been temporarily blocked due to delivery issues. You can request reactivation:</p>
              <button 
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
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div className="tab-container">
        <button 
          className={activeTab === 'preferences' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('preferences')}
        >
          Preferences
        </button>
        <button 
          className={activeTab === 'history' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('history')}
        >
          Email History
        </button>
        <button 
          className={activeTab === 'status' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('status')}
        >
          Delivery Status
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '0 0 8px 8px', padding: '30px', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)', border: '2px solid #e9ecef', borderTop: 'none' }}>
        {error && (
          <div className="error-alert">
            {error}
          </div>
        )}

        {message && (
          <div className="success-alert">
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