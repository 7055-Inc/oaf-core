import { useState, useEffect } from 'react';
import styles from './EventManagement.module.css';

export default function EventManagement() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventTypes, setEventTypes] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchEvents();
    fetchEventTypes();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }
      
      const response = await fetch('https://api2.onlineartfestival.com/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch current user');
      }
      
      const userData = await response.json();
      setCurrentUserId(userData.id);
    } catch (err) {
      setError('Failed to get current user information');
    }
  };

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch('https://api2.onlineartfestival.com/api/events', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }
      
      const response = await fetch('https://api2.onlineartfestival.com/api/events/types', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setEventTypes(data);
      }
    } catch (err) {
      // Silently fail - event types will be empty array
    }
  };

  const handleCreateEvent = () => {
    if (!currentUserId) {
      setError('Please wait while user information is loading...');
      return;
    }
    setEditingEvent(null);
    setShowCreateForm(true);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setShowCreateForm(true);
  };

  const handleArchiveEvent = async (eventId) => {
    if (!confirm('Are you sure you want to archive this event?')) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch(`https://api2.onlineartfestival.com/api/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to archive event');
      fetchEvents();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const url = editingEvent 
        ? `https://api2.onlineartfestival.com/api/events/${editingEvent.id}`
        : 'https://api2.onlineartfestival.com/api/events';
      
      const response = await fetch(url, {
        method: editingEvent ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Server error (${response.status}): ${errorData}`);
      }
      
      const result = await response.json();
      
      setShowCreateForm(false);
      setEditingEvent(null);
      fetchEvents();
    } catch (err) {
      setError(`Failed to save event: ${err.message}`);
    }
  };

  if (loading) return <div className={styles.loading}>Loading events...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Event Management</h2>
        <button onClick={handleCreateEvent} className={styles.createButton}>
          Create New Event
        </button>
      </div>

      {showCreateForm && currentUserId && (
        <EventForm 
          event={editingEvent}
          eventTypes={eventTypes}
          currentUserId={currentUserId}
          onSubmit={handleFormSubmit}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className={styles.eventsList}>
        {events.length === 0 ? (
          <p>No events found.</p>
        ) : (
          events.map(event => (
            <div key={event.id} className={styles.eventCard}>
              <div className={styles.eventInfo}>
                <h3>{event.title}</h3>
                <p>Status: <span className={styles.status}>{event.event_status}</span></p>
                <p>Applications: <span className={styles.status}>{event.application_status}</span></p>
                <p>Dates: {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}</p>
                <p>Venue: {event.venue_name}, {event.venue_city}, {event.venue_state}</p>
              </div>
              <div className={styles.eventActions}>
                <button onClick={() => handleEditEvent(event)} className={styles.editButton}>
                  Edit
                </button>
                <button onClick={() => handleArchiveEvent(event.id)} className={styles.archiveButton}>
                  Archive
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EventForm({ event, eventTypes, currentUserId, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    event_type_id: event?.event_type_id || '',
    event_status: event?.event_status || 'draft',
    application_status: event?.application_status || 'not_accepting',
    allow_applications: event?.allow_applications || false,
    start_date: event?.start_date ? event.start_date.split('T')[0] : '',
    end_date: event?.end_date ? event.end_date.split('T')[0] : '',
    venue_name: event?.venue_name || '',
    venue_address: event?.venue_address || '',
    venue_city: event?.venue_city || '',
    venue_state: event?.venue_state || '',
    venue_zip: event?.venue_zip || '',
    promoter_id: event?.promoter_id || currentUserId,
    created_by: event?.created_by || currentUserId,
    updated_by: currentUserId
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.title.trim()) {
      alert('Event title is required');
      return;
    }
    
    if (!formData.event_type_id) {
      alert('Event type is required');
      return;
    }
    
    if (!formData.start_date || !formData.end_date) {
      alert('Start date and end date are required');
      return;
    }
    
    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      alert('End date must be after start date');
      return;
    }
    
    onSubmit(formData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className={styles.formOverlay}>
      <div className={styles.formContainer}>
        <h3>{event ? 'Edit Event' : 'Create New Event'}</h3>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Event Type *</label>
              <select
                name="event_type_id"
                value={formData.event_type_id}
                onChange={handleChange}
                required
              >
                <option value="">Select Type</option>
                {eventTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
            
            <div className={styles.formGroup}>
              <label>Status</label>
              <select name="event_status" value={formData.event_status} onChange={handleChange}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Start Date *</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>End Date *</label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Venue Name</label>
            <input
              type="text"
              name="venue_name"
              value={formData.venue_name}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Venue Address</label>
            <input
              type="text"
              name="venue_address"
              value={formData.venue_address}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>City</label>
              <input
                type="text"
                name="venue_city"
                value={formData.venue_city}
                onChange={handleChange}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>State</label>
              <input
                type="text"
                name="venue_state"
                value={formData.venue_state}
                onChange={handleChange}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>ZIP</label>
              <input
                type="text"
                name="venue_zip"
                value={formData.venue_zip}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>
              <input
                type="checkbox"
                name="allow_applications"
                checked={formData.allow_applications}
                onChange={handleChange}
              />
              Allow Artists to Apply
            </label>
          </div>

          <div className={styles.formActions}>
            <button type="button" onClick={onCancel} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" className={styles.submitButton}>
              {event ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 