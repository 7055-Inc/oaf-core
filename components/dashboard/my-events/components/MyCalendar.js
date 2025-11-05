import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAuthToken } from '../../../../lib/csrf';
import { getApiUrl } from '../../../../lib/config';
import styles from '../../SlideIn.module.css';

// Custom Event Modal Component
function CustomEventModal({ onSave, onCancel }) {
  const [formData, setFormData] = useState({
    event_name: '',
    event_start_date: '',
    event_end_date: '',
    venue_name: '',
    city: '',
    state: '',
    website: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div className="form-card" style={{ width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 20px 0' }}>Add Custom Event</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div className="form-group">
            <label>Event Name *</label>
            <input
              type="text"
              name="event_name"
              value={formData.event_name}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Start Date *</label>
              <input
                type="date"
                name="event_start_date"
                value={formData.event_start_date}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>End Date *</label>
              <input
                type="date"
                name="event_end_date"
                value={formData.event_end_date}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Venue Name</label>
            <input
              type="text"
              name="venue_name"
              value={formData.venue_name}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Website</label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
            <button type="button" onClick={onCancel} className="secondary">
              Cancel
            </button>
            <button type="submit" className="primary">
              Add Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MyCalendar({ userData }) {
  const [events, setEvents] = useState([]);
  const [customEvents, setCustomEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddCustomEvent, setShowAddCustomEvent] = useState(false);

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Please log in to view your calendar');
      }

      // Fetch application events
      const applicationsResponse = await fetch(getApiUrl('api/applications/'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Fetch custom events
      const customEventsResponse = await fetch(getApiUrl('api/events/my-events'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (applicationsResponse.ok) {
        const applicationsData = await applicationsResponse.json();
        // Extract applications array from response object
        const apps = applicationsData.applications || [];
        // Filter to show only relevant statuses (hide rejected/declined)
        const relevantEvents = apps.filter(app => 
          !['rejected', 'declined'].includes(app.status)
        );
        setEvents(relevantEvents);
      }

      if (customEventsResponse.ok) {
        const customData = await customEventsResponse.json();
        // my-events returns array directly
        setCustomEvents(Array.isArray(customData) ? customData : []);
      } else if (customEventsResponse.status !== 404) {
        // 404 is expected if no custom events exist
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addCustomEvent = async (eventData) => {
    try {
      const token = getAuthToken();
      const response = await fetch(getApiUrl('api/events/custom'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });

      if (response.ok) {
        fetchCalendarData(); // Refresh data
        setShowAddCustomEvent(false);
      } else {
        throw new Error('Failed to add custom event');
      }
    } catch (err) {
      alert('Error adding custom event: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getEventTypeLabel = (event) => {
    if (event.event_title) {
      // Application event
      switch (event.status) {
        case 'submitted': return 'Applied';
        case 'under_review': return 'Under Review';
        case 'accepted': return 'Accepted';
        case 'confirmed': return 'Exhibiting';
        case 'waitlisted': return 'Waitlisted';
        default: return 'Applied';
      }
    } else {
      // Custom event
      return 'Personal Event';
    }
  };

  const getEventBadgeClass = (event) => {
    if (event.event_title) {
      // Application event colors
      switch (event.status) {
        case 'submitted': return styles.statusProcessing;
        case 'under_review': return styles.statusPending;
        case 'accepted': return styles.statusCompleted;
        case 'confirmed': return styles.statusCompleted;
        case 'waitlisted': return styles.statusPending;
        default: return styles.statusProcessing;
      }
    } else {
      // Custom event
      return styles.statusDefault;
    }
  };

  if (loading) {
    return <div className="loading-state">Loading your calendar...</div>;
  }

  if (error) {
    return <div className="error-alert">Error: {error}</div>;
  }

  return (
    <div className="section-box">
      <div className="section-header">
        <h2>My Calendar</h2>
        <button 
          onClick={() => setShowAddCustomEvent(true)}
          className="primary"
        >
          Add Custom Event
        </button>
      </div>

      {/* Calendar Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <div className="form-card" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745', marginBottom: '5px' }}>
            {events.filter(e => e.status === 'confirmed').length}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>Exhibiting</div>
        </div>
        <div className="form-card" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff', marginBottom: '5px' }}>
            {events.filter(e => ['submitted', 'under_review', 'accepted'].includes(e.status)).length}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>Applied</div>
        </div>
        <div className="form-card" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107', marginBottom: '5px' }}>
            {events.filter(e => e.status === 'waitlisted').length}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>Waitlisted</div>
        </div>
        <div className="form-card" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6f42c1', marginBottom: '5px' }}>
            {customEvents.length}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>Custom Events</div>
        </div>
      </div>

      {/* Events List View */}
      <div>
        <h3 style={{ marginBottom: '20px' }}>Upcoming Events</h3>
        
        {events.length === 0 && customEvents.length === 0 ? (
          <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
            <h4>No Events in Your Calendar</h4>
            <p style={{ marginBottom: '20px' }}>Start by applying to events or adding your own custom events!</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/events" className="primary">
                Browse Events
              </Link>
              <button 
                onClick={() => setShowAddCustomEvent(true)}
                className="secondary"
              >
                Add Custom Event
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {/* Application Events */}
            {events.map((event) => (
              <div key={`app-${event.id}`} className="form-card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#007bff', flexShrink: 0 }}></div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px' }}>{event.event_title}</h4>
                    <span className={getEventBadgeClass(event)}>
                      {getEventTypeLabel(event)}
                    </span>
                  </div>
                  <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                    {formatDate(event.event_start_date)} - {formatDate(event.event_end_date)}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>{event.event_location}</p>
                </div>
                <div>
                  <Link 
                    href={`/events/${event.event_id}`} 
                    className="secondary"
                    style={{ fontSize: '14px', padding: '6px 12px' }}
                  >
                    View Event
                  </Link>
                </div>
              </div>
            ))}

            {/* Custom Events */}
            {customEvents.map((event) => (
              <div key={`custom-${event.id}`} className="form-card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#6f42c1', flexShrink: 0 }}></div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px' }}>{event.event_name}</h4>
                    <span className={styles.statusDefault}>
                      Personal Event
                    </span>
                  </div>
                  <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                    {formatDate(event.event_start_date)} - {formatDate(event.event_end_date)}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                    {event.venue_name}
                    {event.venue_city && `, ${event.venue_city}`}
                    {event.venue_state && `, ${event.venue_state}`}
                  </p>
                  {event.website && (
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                      <a href={event.website} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
                        Event Website
                      </a>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Custom Event Modal */}
      {showAddCustomEvent && (
        <CustomEventModal 
          onSave={addCustomEvent}
          onCancel={() => setShowAddCustomEvent(false)}
        />
      )}
    </div>
  );
}
