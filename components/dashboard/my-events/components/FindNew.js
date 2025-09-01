import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../../SlideIn.module.css';

export default function FindNew({ userData }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('https://api2.onlineartfestival.com/api/events?allow_applications=1&application_status=accepting');
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      setEvents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="loading-state">Loading events...</div>;
  }

  if (error) {
    return <div className="error-alert">Error: {error}</div>;
  }

  return (
    <div className="section-box">
      <div className="section-header">
        <h2>Find New Events</h2>
        <p style={{ margin: 0, color: '#666' }}>Find events accepting artist applications</p>
      </div>

      {events.length === 0 ? (
        <div className="form-card" style={{ textAlign: 'center', padding: '40px' }}>
          <h3>No Events Available</h3>
          <p>There are currently no events accepting applications. Check back soon!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {events.map((event) => (
            <div key={event.id} className="form-card">
              <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>{event.title}</h3>
              
              <div style={{ marginBottom: '15px' }}>
                <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                  <strong>Type:</strong> {event.event_type_name}
                </p>
                <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                  <strong>Date:</strong> {formatDate(event.start_date)} - {formatDate(event.end_date)}
                </p>
                <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                  <strong>Location:</strong> {event.venue_city}, {event.venue_state}
                </p>
                {event.application_deadline && (
                  <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                    <strong>Deadline:</strong> {formatDate(event.application_deadline)}
                  </p>
                )}
              </div>

              {(event.application_fee > 0 || event.jury_fee > 0) && (
                <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '14px' }}>
                  {event.application_fee > 0 && (
                    <span style={{ display: 'block', marginBottom: '5px' }}>
                      App Fee: ${parseFloat(event.application_fee).toFixed(2)}
                    </span>
                  )}
                  {event.jury_fee > 0 && (
                    <span style={{ display: 'block' }}>
                      Jury Fee: ${parseFloat(event.jury_fee).toFixed(2)}
                    </span>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Link 
                  href={`/events/${event.id}`} 
                  className="primary"
                >
                  View & Apply
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
