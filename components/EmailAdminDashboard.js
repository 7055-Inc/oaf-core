import React, { useState, useEffect } from 'react';
import { authenticatedApiRequest } from '../lib/csrf';
import styles from '../styles/EmailAdmin.module.css';

const EmailAdminDashboard = () => {
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
    <div className={styles.overview}>
      <div className={styles.header}>
        <h3>Email System Overview</h3>
        <button 
          className={styles.refreshButton}
          onClick={loadOverviewData}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <h4>Queue Status</h4>
            {stats.queue?.map(stat => (
              <div key={stat.status} className={styles.statItem}>
                <span className={styles.statLabel}>{stat.status}:</span>
                <span className={styles.statValue}>{stat.count}</span>
              </div>
            ))}
          </div>

          <div className={styles.statCard}>
            <h4>30-Day Statistics</h4>
            {stats.monthly?.map(stat => (
              <div key={stat.status} className={styles.statItem}>
                <span className={styles.statLabel}>{stat.status}:</span>
                <span className={styles.statValue}>{stat.count}</span>
              </div>
            ))}
          </div>

          <div className={styles.statCard}>
            <h4>Template Usage</h4>
            {stats.templates?.slice(0, 5).map(template => (
              <div key={template.template_key} className={styles.statItem}>
                <span className={styles.statLabel}>{template.name}:</span>
                <span className={styles.statValue}>{template.sent_count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.recentActivity}>
        <h4>Recent Email Activity</h4>
        <div className={styles.emailList}>
          {(recentActivity || []).map(email => (
            <div key={email.id} className={styles.emailItem}>
              <div className={styles.emailRecipient}>{email.recipient}</div>
              <div className={styles.emailTemplate}>{email.template_name}</div>
              <div className={`${styles.emailStatus} ${styles[email.status]}`}>
                {email.status}
              </div>
              <div className={styles.emailDate}>
                {new Date(email.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTestEmail = () => (
    <div className={styles.testEmail}>
      <h3>Send Test Email</h3>
      <form onSubmit={handleTestEmail} className={styles.testForm}>
        <div className={styles.formGroup}>
          <label htmlFor="recipient">Recipient Email or User ID:</label>
          <input
            type="text"
            id="recipient"
            value={testData.recipient}
            onChange={(e) => setTestData({ ...testData, recipient: e.target.value })}
            required
            placeholder="user@example.com or 123"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="templateKey">Template:</label>
          <select
            id="templateKey"
            value={testData.templateKey}
            onChange={(e) => setTestData({ ...testData, templateKey: e.target.value })}
            required
          >
            <option value="">Select a template...</option>
            {templates.map(template => (
              <option key={template.id} value={template.template_key}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="customData">Custom Test Data (JSON):</label>
          <textarea
            id="customData"
            value={testData.customData}
            onChange={(e) => setTestData({ ...testData, customData: e.target.value })}
            placeholder='{"name": "Test User", "message": "Hello World"}'
            rows={4}
          />
        </div>

        <button type="submit" className={styles.submitButton} disabled={loading}>
          {loading ? 'Sending...' : 'Send Test Email'}
        </button>
      </form>

      {message && (
        <div className={`${styles.testResult} ${styles.success}`}>
          {message}
        </div>
      )}
    </div>
  );

  const renderQueueManagement = () => (
    <div className={styles.queueManagement}>
      <div className={styles.header}>
        <h3>Queue Management</h3>
        <button 
          className={styles.refreshButton}
          onClick={handleProcessQueue}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Process Queue Now'}
        </button>
      </div>

      {queueStats && (
        <div className={styles.queueStats}>
          <h4>Queue Statistics</h4>
          <div className={styles.statsGrid}>
            {queueStats.stats?.map(stat => (
              <div key={stat.status} className={styles.statItem}>
                <span className={styles.statLabel}>{stat.status}:</span>
                <span className={styles.statValue}>{stat.count}</span>
              </div>
            ))}
          </div>

          <h4>Recent Queue Items</h4>
          <div className={styles.emailList}>
            {queueStats.recent?.map(item => (
              <div key={item.id} className={styles.emailItem}>
                <div className={styles.emailRecipient}>{item.username}</div>
                <div className={styles.emailTemplate}>{item.template_name}</div>
                <div className={`${styles.emailStatus} ${styles[item.status]}`}>
                  {item.status}
                </div>
                <div className={styles.emailDate}>
                  {new Date(item.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderBounceManagement = () => (
    <div className={styles.bounceManagement}>
      <h3>Bounce Management</h3>
      <div className={styles.bounceList}>
        {(bounceData || []).map(bounce => (
          <div key={bounce.id} className={styles.bounceItem}>
            <div className={styles.bounceHeader}>
              <span className={styles.bounceDomain}>{bounce.domain || 'Unknown'}</span>
              <span className={`${styles.bounceStatus} ${bounce.is_blacklisted ? styles.blacklisted : styles.active}`}>
                {bounce.is_blacklisted ? 'Blacklisted' : 'Active'}
              </span>
            </div>
            <div className={styles.bounceStats}>
              <span>Hard Bounces: {bounce.hard_bounces || 0}</span>
              <span>Soft Bounces: {bounce.soft_bounces || 0}</span>
              <span>Last Bounce: {bounce.last_bounce_at ? new Date(bounce.last_bounce_at).toLocaleDateString() : 'N/A'}</span>
            </div>
            {bounce.is_blacklisted && (
              <button 
                className={styles.unblacklistButton}
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
    <div className={styles.templates}>
      <h3>Email Templates</h3>
      <div className={styles.templateList}>
        {(templates || []).map(template => (
          <div key={template.id} className={styles.templateItem}>
            <div className={styles.templateHeader}>
              <span className={styles.templateName}>{template.name}</span>
              <span className={styles.templatePriority}>Priority: {template.priority}</span>
            </div>
            <div className={styles.templateKey}>{template.template_key}</div>
            <div className={styles.templateDescription}>
              {template.is_transactional ? 'Transactional' : 'Bulk'} • 
              {template.can_compile ? 'Compilable' : 'Standalone'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={styles.emailAdmin}>
      <div className={styles.tabs}>
        <button 
          className={activeTab === 'overview' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'test' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('test')}
        >
          Test Email
        </button>
        <button 
          className={activeTab === 'queue' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('queue')}
        >
          Queue Management
        </button>
        <button 
          className={activeTab === 'bounces' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('bounces')}
        >
          Bounce Management
        </button>
        <button 
          className={activeTab === 'templates' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('templates')}
        >
          Templates
        </button>
      </div>

      <div className={styles.content}>
        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        {loading && !error && (
          <div className={styles.loading}>
            Loading...
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

export default EmailAdminDashboard; 