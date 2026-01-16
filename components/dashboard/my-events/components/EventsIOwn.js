import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getAuthToken } from '../../../../lib/csrf';
import { getApiUrl } from '../../../../lib/config';
import styles from '../../SlideIn.module.css';

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
      const token = getAuthToken();
      
      // Fetch current events (draft and active)
      const currentResponse = await fetch(getApiUrl(`api/events?promoter_id=${userData.id}&event_status=draft,active`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Fetch archived events
      const archivedResponse = await fetch(getApiUrl(`api/events?promoter_id=${userData.id}&event_status=archived`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!currentResponse.ok || !archivedResponse.ok) {
        throw new Error('Failed to fetch events');
      }

      const currentData = await currentResponse.json();
      const archivedData = await archivedResponse.json();
      
      setCurrentEvents(currentData);
      setArchivedEvents(archivedData);
      
      // Fetch review tokens for all events
      const allEvents = [...currentData, ...archivedData];
      fetchReviewTokens(allEvents, token);
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
        const response = await fetch(getApiUrl(`api/reviews/event-token/${event.id}`), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          tokens[event.id] = data.url;
        }
      } catch (err) {
        // Silently fail for individual token fetches
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
    // Future: redirect to public event page
    router.push(`/events/${eventId}`);
  };

  const handleDelete = async (eventId, eventTitle) => {
    if (!confirm(`Are you sure you want to delete "${eventTitle}"? This will archive the event.`)) {
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(getApiUrl(`api/events/${eventId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      // Refresh the events list
      fetchEvents();
    } catch (err) {
      alert(`Error deleting event: ${err.message}`);
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'draft': styles.statusDefault,
      'active': styles.statusCompleted,
      'archived': styles.statusDefault,
      'accepting': styles.statusCompleted,
      'closed': styles.statusFailed,
      'not_accepting': styles.statusPending
    };
    return statusMap[status] || styles.statusDefault;
  };

  if (loading) {
    return <div className="loading-state">Loading events...</div>;
  }

  if (error) {
    return <div className="error-alert">Error: {error}</div>;
  }

  const currentEventsToShow = currentEvents;
  const archivedEventsToShow = archivedEvents;
  const eventsToShow = activeTab === 'current' ? currentEventsToShow : archivedEventsToShow;
  const totalCurrent = currentEvents.length;
  const totalArchived = archivedEvents.length;

  return (
    <div className="section-box">
      <div className="section-header">
        <h2>Events I Own</h2>
        <Link href="/events/new" className="primary">
          Create New Event
        </Link>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #ddd', marginBottom: '20px' }}>
        <button
          className={activeTab === 'current' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('current')}
          style={{ 
            borderRadius: '4px 4px 0 0', 
            marginRight: '5px',
            border: 'none',
            padding: '10px 20px',
            fontSize: '14px'
          }}
        >
          Current Events ({totalCurrent})
        </button>
        <button
          className={activeTab === 'archived' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('archived')}
          style={{ 
            borderRadius: '4px 4px 0 0',
            border: 'none',
            padding: '10px 20px',
            fontSize: '14px'
          }}
        >
          Archived Events ({totalArchived})
        </button>
      </div>

      {/* Events Table */}
      {eventsToShow.length === 0 ? (
        <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
          <h3>
            {activeTab === 'current' ? 'No Current Events' : 'No Archived Events'}
          </h3>
          <p style={{ marginBottom: '20px' }}>
            {activeTab === 'current' 
              ? "You haven't created any events yet. Get started by creating your first event!"
              : "You don't have any archived events yet."
            }
          </p>
          {activeTab === 'current' && (
            <Link href="/events/new" className="primary">
              Create Your First Event
            </Link>
          )}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHeader}>
                <th className={styles.tableHeaderCell}>Event Title</th>
                <th className={styles.tableHeaderCell}>Type</th>
                <th className={styles.tableHeaderCell}>Dates</th>
                <th className={styles.tableHeaderCell}>Status</th>
                <th className={styles.tableHeaderCell}>Applications</th>
                <th className={styles.tableHeaderCell}>Location</th>
                <th className={styles.tableHeaderCell}>Artist Review Link</th>
                <th className={styles.tableHeaderCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {eventsToShow.map((event) => (
                <tr key={event.id} className={styles.tableRow}>
                  <td className={styles.tableCell}>
                    <strong>{event.title}</strong>
                  </td>
                  <td className={styles.tableCell}>{event.event_type_name || 'N/A'}</td>
                  <td className={styles.tableCell}>
                    {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                  </td>
                  <td className={styles.tableCell}>
                    <span className={getStatusBadgeClass(event.event_status)}>
                      {event.event_status}
                    </span>
                  </td>
                  <td className={styles.tableCell}>
                    <span className={getStatusBadgeClass(event.application_status?.replace('_', ''))}>
                      {event.application_status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className={styles.tableCell}>
                    {event.venue_city && event.venue_state ? 
                      `${event.venue_city}, ${event.venue_state}` : 
                      event.venue_name || 'TBD'
                    }
                  </td>
                  <td className={styles.tableCell}>
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
                          onClick={() => handleCopyToken(event.id)}
                          title="Copy review link"
                          style={{ 
                            fontSize: '12px', 
                            padding: '4px 12px',
                            background: copiedToken === event.id ? '#4caf50' : '#3E1C56',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {copiedToken === event.id ? '✓ Copied!' : 'Copy'}
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#999' }}>Loading...</span>
                    )}
                  </td>
                  <td className={styles.tableCell}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        className="secondary"
                        onClick={() => handleView(event.id)}
                        title="View Event"
                        style={{ fontSize: '14px', padding: '6px 12px' }}
                      >
                        View
                      </button>
                      <button
                        className="primary"
                        onClick={() => handleEdit(event.id)}
                        title="Edit Event"
                        style={{ fontSize: '14px', padding: '6px 12px' }}
                      >
                        {activeTab === 'archived' ? 'Renew' : 'Edit'}
                      </button>
                      {activeTab === 'current' && (
                        <button
                          className="danger"
                          onClick={() => handleDelete(event.id, event.title)}
                          title="Delete Event (Archive)"
                          style={{ 
                            fontSize: '14px', 
                            padding: '6px 12px',
                            background: '#d32f2f',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
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
