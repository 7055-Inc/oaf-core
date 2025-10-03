import { useState, useEffect } from 'react';
import styles from '../../SlideIn.module.css';
import { getApiUrl } from '../../../../lib/config';

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
      
      const response = await fetch(getApiUrl('users/me'), {
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
      
      const response = await fetch(getApiUrl('api/events'), {
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
      
      const response = await fetch(getApiUrl('api/events/types'), {
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
      
      const response = await fetch(getApiUrl(`api/events/${eventId}`), {
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
        ? `api/events/${editingEvent.id}`
        : 'api/events';
      
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

  if (loading) return <div className="loading-state">Loading events...</div>;
  if (error) return <div className="error-alert">Error: {error}</div>;

  return (
    <div className="section-box">
      <div className="section-header">
        <h2>Event Management</h2>
        <button onClick={handleCreateEvent} className="primary">
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {events.length === 0 ? (
          <p>No events found.</p>
        ) : (
          events.map(event => (
            <div key={event.id} className="form-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '18px' }}>{event.title}</h3>
                <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>Status: <span className={styles.statusDefault}>{event.event_status}</span></p>
                <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>Applications: <span className={styles.statusDefault}>{event.application_status}</span></p>
                <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>Dates: {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}</p>
                <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>Venue: {event.venue_name}, {event.venue_city}, {event.venue_state}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => handleEditEvent(event)} className="secondary">
                  Edit
                </button>
                <button onClick={() => handleArchiveEvent(event.id)} className="danger">
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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div className="form-card" style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>{event ? 'Edit Event' : 'Create New Event'}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="form-input"
              rows="3"
            />
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Event Type *</label>
              <select
                name="event_type_id"
                value={formData.event_type_id}
                onChange={handleChange}
                className="form-input"
                required
              >
                <option value="">Select Type</option>
                {eventTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group" style={{ flex: 1 }}>
              <label>Status</label>
              <select name="event_status" value={formData.event_status} onChange={handleChange} className="form-input">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Start Date *</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            
            <div className="form-group" style={{ flex: 1 }}>
              <label>End Date *</label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
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

          <div className="form-group">
            <label>Venue Address</label>
            <input
              type="text"
              name="venue_address"
              value={formData.venue_address}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>City</label>
              <input
                type="text"
                name="venue_city"
                value={formData.venue_city}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            
            <div className="form-group" style={{ flex: 1 }}>
              <label>State</label>
              <input
                type="text"
                name="venue_state"
                value={formData.venue_state}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            
            <div className="form-group" style={{ flex: 1 }}>
              <label>ZIP</label>
              <input
                type="text"
                name="venue_zip"
                value={formData.venue_zip}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                name="allow_applications"
                checked={formData.allow_applications}
                onChange={handleChange}
              />
              Allow Artists to Apply
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
            <button type="button" onClick={onCancel} className="secondary">
              Cancel
            </button>
            <button type="submit" className="primary">
              {event ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 