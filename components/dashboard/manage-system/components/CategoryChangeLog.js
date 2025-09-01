'use client';
import { useState, useEffect } from 'react';
import styles from '../../SlideIn.module.css';

export default function CategoryChangeLog() {
  const [changeLog, setChangeLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadChangeLog();
  }, []);

  const loadChangeLog = async () => {
    try {
      setLoading(true);
      const token = document.cookie.split('token=')[1]?.split(';')[0];
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('https://api2.onlineartfestival.com/categories/change-log', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load change log');
      }

      const data = await response.json();
      setChangeLog(data.log || []);
    } catch (err) {
      console.error('Error loading change log:', err);
      if (err.response && err.response.status === 403) {
        setError('You do not have permission to view the change log.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid Date';
    }
  };

  const formatJson = (jsonData) => {
    if (!jsonData) return 'N/A';
    try {
      const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return String(jsonData);
    }
  };

  const safeString = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return String(value);
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading change log...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-alert">
        Error: {error}
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={loadChangeLog}
          className="secondary"
        >
          Refresh
        </button>
      </div>

      {(!changeLog || changeLog.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          No changes recorded yet.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead className={styles.tableHeader}>
              <tr>
                <th className={styles.tableHeaderCell}>Date</th>
                <th className={styles.tableHeaderCell}>Category ID</th>
                <th className={styles.tableHeaderCell}>Action</th>
                <th className={styles.tableHeaderCell}>Changed By</th>
                <th className={styles.tableHeaderCell}>Before</th>
                <th className={styles.tableHeaderCell}>After</th>
              </tr>
            </thead>
            <tbody>
              {changeLog.map((entry, index) => (
                <tr key={entry.id || index} className={styles.tableRow}>
                  <td className={styles.tableCell}>
                    {formatDate(entry.changed_at)}
                  </td>
                  <td className={styles.tableCell}>
                    {safeString(entry.category_id)}
                  </td>
                  <td className={styles.tableCell}>
                    <span className={`${styles.statusBadge} ${
                      entry.action === 'create' ? styles.statusCompleted :
                      entry.action === 'update' ? styles.statusPending :
                      entry.action === 'delete' ? styles.statusFailed :
                      styles.statusDefault
                    }`}>
                      {safeString(entry.action).toUpperCase()}
                    </span>
                  </td>
                  <td className={styles.tableCell}>
                    {safeString(entry.changed_by)}
                  </td>
                  <td className={styles.tableCell} style={{ maxWidth: '200px' }}>
                    <details>
                      <summary style={{ cursor: 'pointer', fontSize: '12px', color: '#6c757d' }}>
                        View Before
                      </summary>
                      <pre style={{ 
                        fontSize: '11px', 
                        backgroundColor: '#f8f9fa', 
                        padding: '8px', 
                        borderRadius: '4px',
                        overflow: 'auto',
                        maxHeight: '150px',
                        margin: '8px 0 0 0'
                      }}>
                        {formatJson(entry.before_json)}
                      </pre>
                    </details>
                  </td>
                  <td className={styles.tableCell} style={{ maxWidth: '200px' }}>
                    <details>
                      <summary style={{ cursor: 'pointer', fontSize: '12px', color: '#6c757d' }}>
                        View After
                      </summary>
                      <pre style={{ 
                        fontSize: '11px', 
                        backgroundColor: '#f8f9fa', 
                        padding: '8px', 
                        borderRadius: '4px',
                        overflow: 'auto',
                        maxHeight: '150px',
                        margin: '8px 0 0 0'
                      }}>
                        {formatJson(entry.after_json)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 