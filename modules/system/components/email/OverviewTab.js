/**
 * Overview Tab Component
 * Shows email system statistics and recent activity
 */

import { useState, useEffect } from 'react';
import { getStats, getRecentActivity } from '../../../../lib/email/api';

export default function OverviewTab() {
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statsResult, activityResult] = await Promise.all([
        getStats(),
        getRecentActivity(15)
      ]);
      
      if (statsResult.success) {
        setStats(statsResult.data);
      }
      
      if (activityResult.success) {
        setRecentActivity(activityResult.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <span>Loading...</span>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div>
      <div className="section-header">
        <h3>Email System Overview</h3>
        <button className="btn btn-secondary" onClick={loadData}>
          Refresh
        </button>
      </div>

      {stats && (
        <div className="stats-grid">
          {/* Today's Stats */}
          <div className="stat-card">
            <h4>Today</h4>
            <div className="stat-row">
              <span>Total:</span>
              <strong>{stats.today?.total || 0}</strong>
            </div>
            <div className="stat-row">
              <span>Sent:</span>
              <strong className="text-success">{stats.today?.sent || 0}</strong>
            </div>
            <div className="stat-row">
              <span>Failed:</span>
              <strong className="text-danger">{stats.today?.failed || 0}</strong>
            </div>
          </div>

          {/* Queue Status */}
          <div className="stat-card">
            <h4>Queue Status</h4>
            {stats.queue?.map(item => (
              <div key={item.status} className="stat-row">
                <span className="capitalize">{item.status}:</span>
                <strong>{item.count}</strong>
              </div>
            ))}
            {(!stats.queue || stats.queue.length === 0) && (
              <p className="text-muted">Queue empty</p>
            )}
          </div>

          {/* 30-Day Stats */}
          <div className="stat-card">
            <h4>Last 30 Days</h4>
            {stats.monthly?.map(item => (
              <div key={item.status} className="stat-row">
                <span className="capitalize">{item.status}:</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>

          {/* Top Templates */}
          <div className="stat-card">
            <h4>Top Templates</h4>
            {stats.templates?.slice(0, 5).map(template => (
              <div key={template.template_key} className="stat-row">
                <span className="truncate">{template.name}:</span>
                <strong>{template.sent_count}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="section">
        <h4>Recent Email Activity</h4>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Template</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map(email => (
                <tr key={email.id}>
                  <td>{email.recipient}</td>
                  <td>{email.template_name || '—'}</td>
                  <td>
                    <span className={`status-badge status-${email.status}`}>
                      {email.status}
                    </span>
                  </td>
                  <td>{formatDate(email.created_at)}</td>
                </tr>
              ))}
              {recentActivity.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center text-muted">No recent activity</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
