/**
 * Bounces Tab Component
 * Manage email bounces and blacklist
 */

import { useState, useEffect } from 'react';
import { getBounces, unblacklistDomain } from '../../../../lib/email/api';

export default function BouncesTab() {
  const [bounces, setBounces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadBounces();
  }, []);

  const loadBounces = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getBounces();
      if (result.success) {
        setBounces(result.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblacklist = async (domain) => {
    if (!confirm(`Remove ${domain} from blacklist?`)) return;
    
    try {
      setError(null);
      setSuccess('');
      const result = await unblacklistDomain(domain);
      if (result.success) {
        setSuccess(`${domain} removed from blacklist`);
        loadBounces();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <span>Loading bounces...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h3>Bounce Management</h3>
        <button className="btn btn-secondary" onClick={loadBounces}>
          Refresh
        </button>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <div className="bounce-list">
        {bounces.map(bounce => (
          <div key={bounce.id} className="bounce-card">
            <div className="bounce-header">
              <span className="domain">{bounce.domain || bounce.email || 'Unknown'}</span>
              <span className={`status-badge ${bounce.is_blacklisted ? 'status-failed' : 'status-sent'}`}>
                {bounce.is_blacklisted ? 'Blacklisted' : 'Active'}
              </span>
            </div>
            
            <div className="bounce-stats">
              <span>Hard Bounces: <strong>{bounce.hard_bounces || 0}</strong></span>
              <span>Soft Bounces: <strong>{bounce.soft_bounces || 0}</strong></span>
              <span>Last Bounce: <strong>{formatDate(bounce.last_bounce_at)}</strong></span>
            </div>
            
            {bounce.is_blacklisted && (
              <div className="bounce-actions">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleUnblacklist(bounce.domain || bounce.email)}
                >
                  Remove from Blacklist
                </button>
              </div>
            )}
          </div>
        ))}
        
        {bounces.length === 0 && (
          <p className="text-muted text-center">No bounce data found</p>
        )}
      </div>
      
      <style jsx>{`
        .bounce-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .bounce-card {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 1rem;
        }
        
        .bounce-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        
        .domain {
          font-weight: 600;
          font-size: 1.1rem;
        }
        
        .bounce-stats {
          display: flex;
          gap: 1.5rem;
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 0.75rem;
        }
        
        .bounce-actions {
          padding-top: 0.75rem;
          border-top: 1px solid #eee;
        }
        
        .status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 3px;
          font-size: 0.8rem;
          font-weight: 500;
        }
        
        .status-sent {
          background: #d4edda;
          color: #155724;
        }
        
        .status-failed {
          background: #f8d7da;
          color: #721c24;
        }
        
        .btn-sm {
          padding: 0.25rem 0.5rem;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}
