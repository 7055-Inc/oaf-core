'use client';
import { useState, useEffect } from 'react';

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

  if (loading) return <div>Loading change log...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <button 
          onClick={loadChangeLog}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#055474',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
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
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            fontSize: '0.9rem',
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Date</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Category ID</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Action</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Changed By</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Before</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>After</th>
              </tr>
            </thead>
            <tbody>
              {changeLog.map((entry, index) => (
                <tr key={entry.id || index} style={{ 
                  borderBottom: '1px solid #f1f3f4',
                  backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa'
                }}>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f3f4' }}>
                    {formatDate(entry.changed_at)}
                  </td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f3f4' }}>
                    {safeString(entry.category_id)}
                  </td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f3f4' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      backgroundColor: 
                        entry.action === 'create' ? '#d4edda' :
                        entry.action === 'update' ? '#fff3cd' :
                        entry.action === 'delete' ? '#f8d7da' : '#e2e3e5',
                      color: 
                        entry.action === 'create' ? '#155724' :
                        entry.action === 'update' ? '#856404' :
                        entry.action === 'delete' ? '#721c24' : '#6c757d'
                    }}>
                      {safeString(entry.action).toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f3f4' }}>
                    {safeString(entry.changed_by)}
                  </td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f3f4', maxWidth: '200px' }}>
                    <details>
                      <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: '#666' }}>
                        View Before
                      </summary>
                      <pre style={{ 
                        fontSize: '0.7rem', 
                        backgroundColor: '#f8f9fa', 
                        padding: '0.5rem', 
                        borderRadius: '4px',
                        overflow: 'auto',
                        maxHeight: '150px',
                        margin: '0.5rem 0 0 0'
                      }}>
                        {formatJson(entry.before_json)}
                      </pre>
                    </details>
                  </td>
                  <td style={{ padding: '0.75rem', borderBottom: '1px solid #f1f3f4', maxWidth: '200px' }}>
                    <details>
                      <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: '#666' }}>
                        View After
                      </summary>
                      <pre style={{ 
                        fontSize: '0.7rem', 
                        backgroundColor: '#f8f9fa', 
                        padding: '0.5rem', 
                        borderRadius: '4px',
                        overflow: 'auto',
                        maxHeight: '150px',
                        margin: '0.5rem 0 0 0'
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