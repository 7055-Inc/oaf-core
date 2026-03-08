/**
 * Queue Tab Component
 * Manage email queue
 */

import { useState, useEffect } from 'react';
import { getQueue, processQueue } from '../../../../lib/email/api';

export default function QueueTab() {
  const [queueData, setQueueData] = useState({ stats: [], recent: [] });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getQueue();
      if (result.success) {
        setQueueData(result.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessQueue = async () => {
    try {
      setProcessing(true);
      setError(null);
      setSuccess('');
      
      const result = await processQueue();
      if (result.success) {
        setSuccess('Queue processing initiated');
        loadQueue();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <span>Loading queue...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h3>Email Queue</h3>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={loadQueue}>
            Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={handleProcessQueue}
            disabled={processing}
          >
            {processing ? 'Processing...' : 'Process Queue Now'}
          </button>
        </div>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      {/* Queue Stats */}
      <div className="stats-row">
        {queueData.stats?.map(stat => (
          <div key={stat.status} className="stat-card small">
            <span className="stat-label capitalize">{stat.status}</span>
            <span className="stat-value">{stat.count}</span>
          </div>
        ))}
        {(!queueData.stats || queueData.stats.length === 0) && (
          <p className="text-muted">Queue is empty</p>
        )}
      </div>
      
      {/* Recent Queue Items */}
      <div className="section">
        <h4>Recent Queue Items</h4>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Template</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {queueData.recent?.map(item => (
                <tr key={item.id}>
                  <td>{item.username || `User ${item.user_id}`}</td>
                  <td>{item.template_name || '—'}</td>
                  <td>
                    <span className={`status-badge status-${item.status}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>{formatDate(item.created_at)}</td>
                </tr>
              ))}
              {(!queueData.recent || queueData.recent.length === 0) && (
                <tr>
                  <td colSpan="4" className="text-center text-muted">
                    No items in queue
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <style jsx>{`
        .header-actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .stats-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        
        .stat-card.small {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1rem 1.5rem;
          background: #f8f9fa;
          border-radius: 6px;
          min-width: 100px;
        }
        
        .stat-label {
          font-size: 0.85rem;
          color: #666;
        }
        
        .stat-value {
          font-size: 1.5rem;
          font-weight: 600;
          color: #333;
        }
        
        .capitalize {
          text-transform: capitalize;
        }
      `}</style>
    </div>
  );
}
