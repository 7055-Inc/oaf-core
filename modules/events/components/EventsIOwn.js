/**
 * Events I Own
 * Promoter's owned events: current (draft + active) and archived tabs,
 * with review links and edit/view/delete. Uses v2 fetchMyEvents, archiveEvent.
 * Page: /dashboard/events/own
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getAuthToken } from '../../../lib/csrf';
import { getApiUrl } from '../../../lib/config';
import { fetchMyEvents, archiveEvent } from '../../../lib/events/api';

export default function EventsIOwn({ userData, onEdit }) {
  const [currentEvents, setCurrentEvents] = useState([]);
  const [archivedEvents, setArchivedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('current');
  const [reviewTokens, setReviewTokens] = useState({});
  const [copiedToken, setCopiedToken] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const allEvents = await fetchMyEvents();
      const current = (allEvents || []).filter(e => ['draft', 'active'].includes(e.event_status));
      const archived = (allEvents || []).filter(e => e.event_status === 'archived');
      setCurrentEvents(current);
      setArchivedEvents(archived);

      const token = getAuthToken();
      fetchReviewTokens([...current, ...archived], token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewTokens = async (events, token) => {
    const tokens = {};
    for (const event of events) {
      try {
        const response = await fetch(getApiUrl(`api/v2/content/reviews/event-token/${event.id}`), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const envelope = await response.json();
          const data = envelope.data || envelope;
          tokens[event.id] = data.url;
        }
      } catch (err) {
        console.error(`Failed to fetch token for event ${event.id}`, err);
      }
    }
    setReviewTokens(tokens);
  };

  const handleCopyToken = (eventId) => {
    const url = reviewTokens[eventId];
    if (url) {
      navigator.clipboard.writeText(url);
      setCopiedToken(eventId);
      setTimeout(() => setCopiedToken(null), 2000);
    }
  };

  const handleEdit = (eventId) => {
    if (onEdit) {
      onEdit(eventId);
    } else {
      router.push(`/events/new?edit_event_id=${eventId}`);
    }
  };

  const handleView = (eventId) => {
    router.push(`/events/${eventId}`);
  };

  const handleDelete = async (eventId, eventTitle) => {
    if (!confirm(`Are you sure you want to delete "${eventTitle}"? This will archive the event.`)) {
      return;
    }
    try {
      await archiveEvent(eventId);
      fetchEvents();
    } catch (err) {
      alert(`Error deleting event: ${err.message}`);
    }
  };

  /** Map event/application status to global .status-badge classes */
  const getStatusBadgeClass = (status) => {
    if (!status) return 'status-badge muted';
    const s = String(status).toLowerCase().replace('_', '');
    if (['active', 'accepting', 'verified'].includes(s)) return 'status-badge active';
    if (['closed', 'rejected', 'error'].includes(s)) return 'status-badge danger';
    if (['pending', 'not_accepting', 'notaccepting'].includes(s)) return 'status-badge pending';
    return 'status-badge muted';
  };

  if (loading) {
    return <div className="loading-state">Loading events...</div>;
  }

  if (error) {
    return <div className="error-alert">Error: {error}</div>;
  }

  const eventsToShow = activeTab === 'current' ? currentEvents : archivedEvents;
  const totalCurrent = currentEvents.length;
  const totalArchived = archivedEvents.length;

  return (
    <div className="section-box">
      <div className="section-header">
        <h2>Events I Own</h2>
        <Link href="/dashboard/events/new" className="primary">
          Create New Event
        </Link>
      </div>

      <div className="tab-container">
        <button
          type="button"
          className={`tab ${activeTab === 'current' ? 'active' : ''}`}
          onClick={() => setActiveTab('current')}
        >
          Current Events ({totalCurrent})
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'archived' ? 'active' : ''}`}
          onClick={() => setActiveTab('archived')}
        >
          Archived Events ({totalArchived})
        </button>
      </div>

      {eventsToShow.length === 0 ? (
        <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
          <h3>
            {activeTab === 'current' ? 'No Current Events' : 'No Archived Events'}
          </h3>
          <p style={{ marginBottom: '20px' }}>
            {activeTab === 'current'
              ? "You haven't created any events yet. Get started by creating your first event!"
              : "You don't have any archived events yet."}
          </p>
          {activeTab === 'current' && (
            <Link href="/dashboard/events/new" className="primary">
              Create Your First Event
            </Link>
          )}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Event Title</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Applications</th>
                <th>Location</th>
                <th>Artist Review Link</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {eventsToShow.map((event) => (
                <tr key={event.id}>
                  <td><strong>{event.title}</strong></td>
                  <td>{event.event_type_name || 'N/A'}</td>
                  <td>
                    {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(event.event_status)}>
                      {event.event_status}
                    </span>
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(event.application_status?.replace('_', ''))}>
                      {event.application_status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    {event.venue_city && event.venue_state
                      ? `${event.venue_city}, ${event.venue_state}`
                      : event.venue_name || 'TBD'}
                  </td>
                  <td>
                    {reviewTokens[event.id] ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="text"
                          value={reviewTokens[event.id]}
                          readOnly
                          style={{
                            fontSize: '12px',
                            padding: '4px 8px',
                            width: '200px',
                            border: '1px solid #ddd',
                            borderRadius: '3px'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleCopyToken(event.id)}
                          title="Copy review link"
                          className="secondary"
                          style={{
                            fontSize: '12px',
                            padding: '4px 12px',
                            background: copiedToken === event.id ? '#4caf50' : undefined,
                            color: copiedToken === event.id ? 'white' : undefined
                          }}
                        >
                          {copiedToken === event.id ? '✓ Copied!' : 'Copy'}
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#999' }}>Loading...</span>
                    )}
                  </td>
                  <td>
                    <div className="cell-actions">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => handleView(event.id)}
                        title="View Event"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => handleEdit(event.id)}
                        title="Edit Event"
                      >
                        {activeTab === 'archived' ? 'Renew' : 'Edit'}
                      </button>
                      {activeTab === 'current' && (
                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleDelete(event.id, event.title)}
                          title="Delete Event (Archive)"
                        >
                          Delete
                        </button>
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
