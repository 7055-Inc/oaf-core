/**
 * Unclaimed Events Component
 * Admin interface for monitoring events pending promoter claim
 */

import { useState, useEffect } from 'react';
import { fetchUnclaimedEvents, resendClaimEmail, deleteUnclaimedEvent } from '../../../lib/events/api';

export default function UnclaimedEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchUnclaimedEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async (eventId, promoterEmail) => {
    if (!confirm(`Resend claim email to ${promoterEmail}?`)) return;

    try {
      setProcessing(`resend-${eventId}`);
      setError(null);
      setSuccess(null);
      await resendClaimEmail(eventId);
      setSuccess(`Claim email resent to ${promoterEmail}`);
      await loadEvents();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleDeleteEvent = async (eventId, eventTitle) => {
    if (!confirm(`Delete "${eventTitle}" and its draft promoter account? This cannot be undone.`)) return;

    try {
      setProcessing(`delete-${eventId}`);
      setError(null);
      setSuccess(null);
      await deleteUnclaimedEvent(eventId);
      setSuccess(`Event "${eventTitle}" and draft promoter deleted`);
      setEvents(prev => prev.filter(e => e.event_id !== eventId));
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const getDaysPending = (createdAt) => {
    const created = new Date(createdAt);
    const now = new Date();
    return Math.floor(Math.abs(now - created) / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <span>Loading unclaimed events...</span>
      </div>
    );
  }

  const over30Days = events.filter(e => getDaysPending(e.created_at) > 30).length;
  const over90Days = events.filter(e => getDaysPending(e.created_at) > 90).length;

  return (
    <div>
      <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
        Events created by admins that are pending promoter claim. 
        You can resend the claim email or delete unclaimed events.
      </p>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Statistics */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-value">{events.length}</div>
          <div className="stat-label">Pending Claims</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: over30Days > 0 ? '#dc3545' : 'inherit' }}>
            {over30Days}
          </div>
          <div className="stat-label">Over 30 Days</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: over90Days > 0 ? '#dc3545' : 'inherit' }}>
            {over90Days}
          </div>
          <div className="stat-label">Over 90 Days</div>
        </div>
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <div className="empty-state">
          <p>No unclaimed events! All promoters have claimed their events.</p>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Promoter</th>
                <th>Created</th>
                <th>Days Pending</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => {
                const daysPending = getDaysPending(event.created_at);
                return (
                  <tr key={event.event_id}>
                    <td>
                      <div>
                        <strong>{event.event_title}</strong>
                        <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                          {formatDate(event.event_start_date)} - {formatDate(event.event_end_date)}
                          {event.venue_city && event.venue_state && (
                            <> • {event.venue_city}, {event.venue_state}</>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{event.promoter_name}</div>
                      <div className="text-muted" style={{ fontSize: '0.85rem' }}>{event.promoter_email}</div>
                    </td>
                    <td>{formatDate(event.created_at)}</td>
                    <td>
                      <span className={`badge ${daysPending > 60 ? 'badge-danger' : daysPending > 30 ? 'badge-warning' : 'badge-secondary'}`}>
                        {daysPending} days
                      </span>
                    </td>
                    <td>
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleResendEmail(event.event_id, event.promoter_email)}
                          disabled={processing === `resend-${event.event_id}`}
                        >
                          {processing === `resend-${event.event_id}` ? 'Sending...' : 'Resend Email'}
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteEvent(event.event_id, event.event_title)}
                          disabled={processing === `delete-${event.event_id}`}
                        >
                          {processing === `delete-${event.event_id}` ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
