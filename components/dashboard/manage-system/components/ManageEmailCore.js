import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../../../../lib/csrf';
import styles from '../../SlideIn.module.css';

const ManageEmailCore = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  
  // Overview data
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  
  // Test email data
  const [testData, setTestData] = useState({
    recipient: '',
    templateKey: '',
    customData: ''
  });
  
  // Queue data
  const [queueStats, setQueueStats] = useState(null);
  const [queueHistory, setQueueHistory] = useState([]);
  
  // Bounce data
  const [bounceData, setBounceData] = useState([]);
  
  // Template data
  const [templates, setTemplates] = useState([]);
  
  // Set default template when templates are loaded
  useEffect(() => {
    if (templates.length > 0 && !testData.templateKey) {
      setTestData(prev => ({
        ...prev,
        templateKey: templates[0].template_key
      }));
    }
  }, [templates, testData.templateKey]);

  // Load data based on active tab
  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  const loadTabData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      switch (activeTab) {
        case 'overview':
          await loadOverviewData();
          break;
        case 'queue':
          await loadQueueData();
          break;
        case 'bounces':
          await loadBounceData();
          break;
        case 'templates':
          await loadTemplateData();
          break;
        case 'test':
          // No data loading needed for test tab
          break;
      }
    } catch (err) {
      setError(`Failed to load ${activeTab} data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadOverviewData = async () => {
    try {
      const statsResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/admin/email-stats');
      setStats(statsResponse);
      
      const recentResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/admin/email-recent?limit=10');
      setRecentActivity(recentResponse.emails || []);
    } catch (err) {
      setStats({});
      setRecentActivity([]);
    }
  };

  const loadQueueData = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/admin/email-queue');
      setQueueStats(response);
    } catch (err) {
      setQueueStats({ stats: [], recent: [] });
    }
  };

  const loadBounceData = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/admin/email-bounces');
      setBounceData(Array.isArray(response) ? response : []);
    } catch (err) {
      setBounceData([]);
    }
  };

  const loadTemplateData = async () => {
    try {
      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/admin/email-templates');
      const data = await response.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      setTemplates([]);
    }
  };

  const handleTestEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage('');

    try {
      const requestData = {
        recipient: testData.recipient,
        templateKey: testData.templateKey
      };

      // Add custom data if provided
      if (testData.customData.trim()) {
        try {
          requestData.testData = JSON.parse(testData.customData);
        } catch (err) {
          throw new Error('Invalid JSON in custom data field');
        }
      }

      const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/admin/email-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      // Check if the response was successful
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }

      setMessage('Test email sent successfully!');
      setTestData({ 
        recipient: '', 
        templateKey: templates.length > 0 ? templates[0].template_key : '', 
        customData: '' 
      });
      
      // Refresh overview if we're on that tab
      if (activeTab === 'overview') {
        await loadOverviewData();
      }
    } catch (err) {
      setError(`Failed to send test email: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessQueue = async () => {
    setLoading(true);
    setError(null);
    setMessage('');

    try {
      await authenticatedApiRequest('https://api2.onlineartfestival.com/admin/email-process-queue', {
        method: 'POST'
      });
      setMessage('Queue processing initiated successfully!');
      
      // Refresh queue data
      await loadQueueData();
    } catch (err) {
      setError(`Failed to process queue: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblacklistDomain = async (domain) => {
    setLoading(true);
    setError(null);
    setMessage('');

    try {
      await authenticatedApiRequest('https://api2.onlineartfestival.com/admin/email-bounces-unblacklist', {
        method: 'POST',
        body: JSON.stringify({ domain })
      });
      setMessage(`Domain ${domain} has been removed from blacklist`);
      
      // Refresh bounce data
      await loadBounceData();
    } catch (err) {
      setError(`Failed to unblacklist domain: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px' 
      }}>
        <h3 style={{ margin: 0, color: '#495057' }}>Email System Overview</h3>
        <button 
          className="secondary"
          onClick={loadOverviewData}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div className="form-card">
            <h4 style={{ marginBottom: '15px', color: '#495057' }}>Queue Status</h4>
            {stats.queue?.map(stat => (
              <div key={stat.status} style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid #f0f0f0'
              }}>
                <span style={{ color: '#6c757d', textTransform: 'capitalize' }}>{stat.status}:</span>
                <span style={{ fontWeight: '500', color: '#495057' }}>{stat.count}</span>
              </div>
            ))}
          </div>

          <div className="form-card">
            <h4 style={{ marginBottom: '15px', color: '#495057' }}>30-Day Statistics</h4>
            {stats.monthly?.map(stat => (
              <div key={stat.status} style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid #f0f0f0'
              }}>
                <span style={{ color: '#6c757d', textTransform: 'capitalize' }}>{stat.status}:</span>
                <span style={{ fontWeight: '500', color: '#495057' }}>{stat.count}</span>
              </div>
            ))}
          </div>

          <div className="form-card">
            <h4 style={{ marginBottom: '15px', color: '#495057' }}>Template Usage</h4>
            {stats.templates?.slice(0, 5).map(template => (
              <div key={template.template_key} style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid #f0f0f0'
              }}>
                <span style={{ color: '#6c757d', fontSize: '14px' }}>{template.name}:</span>
                <span style={{ fontWeight: '500', color: '#495057' }}>{template.sent_count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section-box">
        <h4 style={{ marginBottom: '15px', color: '#495057' }}>Recent Email Activity</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(recentActivity || []).map(email => (
            <div key={email.id} style={{ 
              display: 'grid',
              gridTemplateColumns: '1fr 1fr auto auto',
              gap: '15px',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              alignItems: 'center'
            }}>
              <div style={{ fontWeight: '500', color: '#495057' }}>{email.recipient}</div>
              <div style={{ color: '#6c757d', fontSize: '14px' }}>{email.template_name}</div>
              <div className={`${styles.statusBadge} ${
                email.status === 'sent' ? styles.statusCompleted :
                email.status === 'pending' ? styles.statusPending :
                email.status === 'failed' ? styles.statusFailed :
                styles.statusDefault
              }`}>
                {email.status}
              </div>
              <div style={{ color: '#6c757d', fontSize: '12px' }}>
                {new Date(email.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTestEmail = () => (
    <div className="form-card">
      <h3 style={{ marginBottom: '20px', color: '#495057' }}>Send Test Email</h3>
      <form onSubmit={handleTestEmail} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label htmlFor="recipient" style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '500',
            color: '#495057'
          }}>
            Recipient Email or User ID:
          </label>
          <input
            type="text"
            id="recipient"
            value={testData.recipient}
            onChange={(e) => setTestData({ ...testData, recipient: e.target.value })}
            required
            placeholder="user@example.com or 123"
            className="form-input"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label htmlFor="templateKey" style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '500',
            color: '#495057'
          }}>
            Template:
          </label>
          <select
            id="templateKey"
            value={testData.templateKey}
            onChange={(e) => setTestData({ ...testData, templateKey: e.target.value })}
            required
            className="form-input"
            style={{ width: '100%' }}
          >
            <option value="">Select a template...</option>
            {templates.map(template => (
              <option key={template.id} value={template.template_key}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="customData" style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '500',
            color: '#495057'
          }}>
            Custom Test Data (JSON):
          </label>
          <textarea
            id="customData"
            value={testData.customData}
            onChange={(e) => setTestData({ ...testData, customData: e.target.value })}
            placeholder='{"name": "Test User", "message": "Hello World"}'
            rows={4}
            className="form-input"
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        <button type="submit" className="primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
          {loading ? 'Sending...' : 'Send Test Email'}
        </button>
      </form>

      {message && (
        <div className="success-alert" style={{ marginTop: '20px' }}>
          {message}
        </div>
      )}
    </div>
  );

  const renderQueueManagement = () => (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px' 
      }}>
        <h3 style={{ margin: 0, color: '#495057' }}>Queue Management</h3>
        <button 
          className="primary"
          onClick={handleProcessQueue}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Process Queue Now'}
        </button>
      </div>

      {queueStats && (
        <div>
          <div className="form-card" style={{ marginBottom: '20px' }}>
            <h4 style={{ marginBottom: '15px', color: '#495057' }}>Queue Statistics</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
              {queueStats.stats?.map(stat => (
                <div key={stat.status} style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  minWidth: '100px'
                }}>
                  <span style={{ color: '#6c757d', textTransform: 'capitalize', fontSize: '14px' }}>{stat.status}</span>
                  <span style={{ fontWeight: '600', color: '#495057', fontSize: '18px' }}>{stat.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="section-box">
            <h4 style={{ marginBottom: '15px', color: '#495057' }}>Recent Queue Items</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {queueStats.recent?.map(item => (
                <div key={item.id} style={{ 
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr auto auto',
                  gap: '15px',
                  padding: '12px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  alignItems: 'center'
                }}>
                  <div style={{ fontWeight: '500', color: '#495057' }}>{item.username}</div>
                  <div style={{ color: '#6c757d', fontSize: '14px' }}>{item.template_name}</div>
                  <div className={`${styles.statusBadge} ${
                    item.status === 'sent' ? styles.statusCompleted :
                    item.status === 'pending' ? styles.statusPending :
                    item.status === 'processing' ? styles.statusProcessing :
                    item.status === 'failed' ? styles.statusFailed :
                    styles.statusDefault
                  }`}>
                    {item.status}
                  </div>
                  <div style={{ color: '#6c757d', fontSize: '12px' }}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderBounceManagement = () => (
    <div>
      <h3 style={{ marginBottom: '20px', color: '#495057' }}>Bounce Management</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {(bounceData || []).map(bounce => (
          <div key={bounce.id} className="form-card">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <span style={{ fontWeight: '500', color: '#495057', fontSize: '16px' }}>
                {bounce.domain || 'Unknown'}
              </span>
              <span className={`${styles.statusBadge} ${
                bounce.is_blacklisted ? styles.statusFailed : styles.statusCompleted
              }`}>
                {bounce.is_blacklisted ? 'Blacklisted' : 'Active'}
              </span>
            </div>
            <div style={{ 
              display: 'flex', 
              gap: '20px', 
              marginBottom: '15px',
              fontSize: '14px',
              color: '#6c757d'
            }}>
              <span>Hard Bounces: <strong>{bounce.hard_bounces || 0}</strong></span>
              <span>Soft Bounces: <strong>{bounce.soft_bounces || 0}</strong></span>
              <span>Last Bounce: <strong>{bounce.last_bounce_at ? new Date(bounce.last_bounce_at).toLocaleDateString() : 'N/A'}</strong></span>
            </div>
            {bounce.is_blacklisted && (
              <button 
                className="secondary"
                onClick={() => handleUnblacklistDomain(bounce.domain)}
                disabled={loading}
              >
                Remove from Blacklist
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderTemplates = () => (
    <div>
      <h3 style={{ marginBottom: '20px', color: '#495057' }}>Email Templates</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {(templates || []).map(template => (
          <div key={template.id} className="form-card">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{ fontWeight: '500', color: '#495057', fontSize: '16px' }}>
                {template.name}
              </span>
              <span style={{ 
                fontSize: '12px', 
                color: '#6c757d',
                backgroundColor: '#f8f9fa',
                padding: '4px 8px',
                borderRadius: '3px'
              }}>
                Priority: {template.priority}
              </span>
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#6c757d', 
              fontFamily: 'monospace',
              backgroundColor: '#f8f9fa',
              padding: '4px 8px',
              borderRadius: '3px',
              marginBottom: '8px'
            }}>
              {template.template_key}
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#6c757d',
              display: 'flex',
              gap: '10px'
            }}>
              <span className={`${styles.statusBadge} ${
                template.is_transactional ? styles.statusProcessing : styles.statusDefault
              }`}>
                {template.is_transactional ? 'Transactional' : 'Bulk'}
              </span>
              <span className={`${styles.statusBadge} ${
                template.can_compile ? styles.statusCompleted : styles.statusPending
              }`}>
                {template.can_compile ? 'Compilable' : 'Standalone'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        borderBottom: '1px solid #dee2e6',
        paddingBottom: '10px'
      }}>
        <button 
          className={activeTab === 'overview' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('overview')}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'test' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('test')}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          Test Email
        </button>
        <button 
          className={activeTab === 'queue' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('queue')}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          Queue Management
        </button>
        <button 
          className={activeTab === 'bounces' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('bounces')}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          Bounce Management
        </button>
        <button 
          className={activeTab === 'templates' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('templates')}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          Templates
        </button>
      </div>

      <div>
        {error && (
          <div className="error-alert" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {loading && !error && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        )}

        {!loading && (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'test' && renderTestEmail()}
            {activeTab === 'queue' && renderQueueManagement()}
            {activeTab === 'bounces' && renderBounceManagement()}
            {activeTab === 'templates' && renderTemplates()}
          </>
        )}
      </div>
    </div>
  );
};

export default ManageEmailCore; 