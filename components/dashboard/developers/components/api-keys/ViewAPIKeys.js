import { useState, useEffect } from 'react';
import { getAuthToken } from '../../../../../lib/csrf';
import { getApiUrl } from '../../../../../lib/config';
import styles from '../../../SlideIn.module.css';

export default function ViewAPIKeys({ userData, refreshTrigger }) {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchApiKeys();
  }, [refreshTrigger]);

  const fetchApiKeys = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Please log in to view API keys');
      }

      const response = await fetch(getApiUrl('api-keys'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }

      const data = await response.json();
      setApiKeys(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleKeyStatus = async (publicKey, currentStatus) => {
    try {
      const token = getAuthToken();
      const response = await fetch(getApiUrl(`api-keys/${publicKey}/toggle`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchApiKeys(); // Refresh the list
      } else {
        throw new Error('Failed to update API key status');
      }
    } catch (err) {
      alert('Failed to update API key: ' + err.message);
    }
  };

  const deleteApiKey = async (publicKey) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(getApiUrl(`api-keys/${publicKey}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchApiKeys(); // Refresh the list
      } else {
        throw new Error('Failed to delete API key');
      }
    } catch (err) {
      alert('Failed to delete API key: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="loading-state">Loading API keys...</div>;
  }

  if (error) {
    return <div className="error-alert">Error: {error}</div>;
  }

  if (apiKeys.length === 0) {
    return (
      <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
        <h3>No API Keys Found</h3>
        <p style={{ marginBottom: '20px' }}>You haven't created any API keys yet.</p>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Use the "Generate New" tab to create your first API key.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Manage your API keys for accessing the Online Art Festival API. Keep your private keys secure and never share them publicly.
        </p>
      </div>

      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <div className={styles.tableHeaderCell}>Name</div>
          <div className={styles.tableHeaderCell}>Public Key</div>
          <div className={styles.tableHeaderCell}>Status</div>
          <div className={styles.tableHeaderCell}>Created</div>
          <div className={styles.tableHeaderCell}>Actions</div>
        </div>
        {apiKeys.map((key) => (
          <div key={key.public_key} className={styles.tableRow}>
            <div className={styles.tableCell}>
              <strong>{key.name}</strong>
            </div>
            <div className={styles.tableCell}>
              <code style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '4px 8px', 
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}>
                {key.public_key}
              </code>
            </div>
            <div className={styles.tableCell}>
              <span className={key.is_active ? styles.statusCompleted : styles.statusDefault}>
                {key.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className={styles.tableCell}>
              {formatDate(key.created_at)}
            </div>
            <div className={styles.tableCell}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => toggleKeyStatus(key.public_key, key.is_active)}
                  className={key.is_active ? 'secondary' : 'primary'}
                  style={{ fontSize: '12px', padding: '4px 8px' }}
                >
                  {key.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => deleteApiKey(key.public_key)}
                  className="danger"
                  style={{ fontSize: '12px', padding: '4px 8px' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#0066cc' }}>API Usage Guidelines</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#666' }}>
          <li>Use your public key for API identification</li>
          <li>Keep your private key secure and never expose it in client-side code</li>
          <li>Deactivate keys immediately if you suspect they've been compromised</li>
          <li>Use descriptive names to identify the purpose of each key</li>
        </ul>
      </div>
    </div>
  );
}
