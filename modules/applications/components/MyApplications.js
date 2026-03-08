/**
 * MyApplications Component
 * Shows events the artist has applied to with status and actions
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchMyApplications, deleteApplication } from '../../../lib/applications';

export default function MyApplications({ userData }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleting, setDeleting] = useState(null);

  const loadApplications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchMyApplications({ status: statusFilter });
      setApplications(data || []);
      setError(null);
    } catch (err) {
      console.error('Error loading applications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleDelete = async (appId) => {
    if (!confirm('Are you sure you want to delete this draft application?')) {
      return;
    }

    try {
      setDeleting(appId);
      await deleteApplication(appId);
      setApplications(prev => prev.filter(app => app.id !== appId));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get status badge class
  const getStatusClass = (status) => {
    switch (status) {
      case 'accepted':
      case 'confirmed':
        return 'status-badge active';
      case 'submitted':
      case 'under_review':
      case 'waitlisted':
        return 'status-badge pending';
      case 'rejected':
      case 'declined':
        return 'status-badge danger';
      case 'draft':
      default:
        return 'status-badge muted';
    }
  };

  // Format status for display
  const formatStatus = (status) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Format fees
  const formatFees = (fees) => {
    const amount = parseFloat(fees) || 0;
    return amount > 0 ? `$${amount.toFixed(2)}` : 'Free';
  };

  if (loading) {
    return (
      <div className="loading-state">
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: 'var(--primary-color)' }}></i>
        <span>Loading applications...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-alert">
        <i className="fas fa-exclamation-triangle"></i>
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div>
      {/* Filter and Actions Bar */}
      <div className="filter-bar" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div className="form-group" style={{ minWidth: '180px', marginBottom: 0 }}>
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Applications</option>
            <option value="draft">Drafts</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="accepted">Accepted</option>
            <option value="waitlisted">Waitlisted</option>
            <option value="rejected">Rejected</option>
            <option value="confirmed">Confirmed</option>
          </select>
        </div>
        <Link href="/events" className="btn btn-primary">
          <i className="fas fa-search"></i> Browse Events
        </Link>
      </div>

      {/* Empty state */}
      {applications.length === 0 && (
        <div className="empty-state">
          <i className="fas fa-file-alt" style={{ fontSize: '48px', color: '#ccc', marginBottom: '1rem' }}></i>
          <h3>No Applications Yet</h3>
          <p>You haven't applied to any events yet. Start exploring events and apply to showcase your art!</p>
          <Link href="/events" className="btn btn-primary">
            Browse Events
          </Link>
        </div>
      )}

      {/* Applications Table */}
      {applications.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Applied Date</th>
                <th>Event Date</th>
                <th>Status</th>
                <th>Fees</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map(app => (
                <tr key={app.id}>
                  <td>
                    <div style={{ fontWeight: '500' }}>{app.event_title}</div>
                    {(app.event_venue_city || app.event_venue_state) && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {[app.event_venue_city, app.event_venue_state].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </td>
                  <td>{formatDate(app.submitted_at)}</td>
                  <td>{formatDate(app.event_start_date)}</td>
                  <td>
                    <span className={getStatusClass(app.status)}>
                      {formatStatus(app.status)}
                    </span>
                  </td>
                  <td>{formatFees(app.total_fees)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Link
                        href={`/events/${app.event_id}`}
                        className="btn btn-sm btn-secondary"
                        title="View Event"
                      >
                        <i className="fas fa-eye"></i>
                      </Link>
                      {app.status === 'draft' && (
                        <>
                          <Link
                            href={`/events/${app.event_id}`}
                            className="btn btn-sm btn-primary"
                            title="Complete Application"
                          >
                            <i className="fas fa-edit"></i>
                          </Link>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(app.id)}
                            disabled={deleting === app.id}
                            title="Delete Draft"
                          >
                            {deleting === app.id ? (
                              <i className="fas fa-spinner fa-spin"></i>
                            ) : (
                              <i className="fas fa-trash"></i>
                            )}
                          </button>
                        </>
                      )}
                    </div>
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
