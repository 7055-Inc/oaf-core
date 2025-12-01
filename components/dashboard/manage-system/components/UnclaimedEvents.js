import React, { useState, useEffect } from 'react';
import { authApiRequest } from '../../../../lib/apiUtils';
import styles from '../../SlideIn.module.css';

const UnclaimedEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(null); // Track which event is being processed
  const [success, setSuccess] = useState(null);

  // Load unclaimed events on component mount
  useEffect(() => {
    loadUnclaimedEvents();
  }, []);

  // Load unclaimed events from API
  const loadUnclaimedEvents = async () => {
    try {
      setLoading(true);
      const response = await authApiRequest('admin/promoters/unclaimed-events');

      if (!response.ok) {
        throw new Error(`Failed to load unclaimed events: ${response.status}`);
      }

      const data = await response.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      console.error('Error loading unclaimed events:', err);
    } finally {
      setLoading(false);
    }
  };

  // Resend claim email
  const handleResendEmail = async (eventId, promoterEmail) => {
    if (!confirm(`Resend claim email to ${promoterEmail}?`)) {
      return;
    }

    try {
      setProcessing(`resend-${eventId}`);
      setError(null);
      setSuccess(null);

      const response = await authApiRequest('admin/promoters/resend-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ event_id: eventId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resend email');
      }

      setSuccess(`✅ Claim email resent to ${promoterEmail}`);
      
      // Reload events to update timestamps
      await loadUnclaimedEvents();
    } catch (err) {
      setError(err.message);
      console.error('Error resending email:', err);
    } finally {
      setProcessing(null);
    }
  };

  // Delete unclaimed event
  const handleDeleteEvent = async (eventId, eventTitle) => {
    if (!confirm(`Are you sure you want to delete "${eventTitle}" and its associated draft promoter account? This action cannot be undone.`)) {
      return;
    }

    try {
      setProcessing(`delete-${eventId}`);
      setError(null);
      setSuccess(null);

      const response = await authApiRequest(`admin/promoters/unclaimed-events/${eventId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete event');
      }

      setSuccess(`✅ Event "${eventTitle}" and draft promoter deleted successfully`);
      
      // Remove from list
      setEvents(prev => prev.filter(e => e.event_id !== eventId));
    } catch (err) {
      setError(err.message);
      console.error('Error deleting event:', err);
    } finally {
      setProcessing(null);
    }
  };

  // Calculate days pending
  const getDaysPending = (createdAt) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={styles.slideInContent}>
        <div className={styles.contentArea}>
          <h2 className={styles.sectionTitle}>Unclaimed Events</h2>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className={styles.spinner}>Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.slideInContent}>
      <div className={styles.contentArea}>
        <h2 className={styles.sectionTitle}>Unclaimed Events</h2>
        <p className={styles.sectionDescription}>
          Events created by admins that are pending promoter claim. 
          You can resend the claim email or delete unclaimed events.
        </p>

        {error && (
          <div style={{ 
            padding: '12px', 
            background: '#fee', 
            border: '1px solid #fcc', 
            borderRadius: '4px',
            marginBottom: '20px',
            color: '#c00'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ 
            padding: '12px', 
            background: '#efe', 
            border: '1px solid #cfc', 
            borderRadius: '4px',
            marginBottom: '20px',
            color: '#060'
          }}>
            {success}
          </div>
        )}

        {/* Statistics */}
        <div style={{ 
          display: 'flex', 
          gap: '20px', 
          marginBottom: '30px',
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#007bff' }}>
              {events.length}
            </div>
            <div style={{ color: '#666', fontSize: '14px' }}>Pending Claims</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff6b6b' }}>
              {events.filter(e => getDaysPending(e.created_at) > 30).length}
            </div>
            <div style={{ color: '#666', fontSize: '14px' }}>Over 30 Days</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffc107' }}>
              {events.filter(e => getDaysPending(e.created_at) > 90).length}
            </div>
            <div style={{ color: '#666', fontSize: '14px' }}>Over 90 Days</div>
          </div>
        </div>

        {/* Events List */}
        {events.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <p style={{ fontSize: '18px', color: '#666' }}>
              🎉 No unclaimed events! All promoters have claimed their events.
            </p>
          </div>
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px' 
          }}>
            {events.map(event => (
              <div 
                key={event.event_id} 
                style={{ 
                  border: '1px solid #ddd', 
                  borderRadius: '8px', 
                  padding: '20px',
                  background: 'white',
                  transition: 'box-shadow 0.2s',
                  ':hover': {
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
                      {event.event_title}
                    </h3>
                    <div style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>
                      {formatDate(event.event_start_date)} - {formatDate(event.event_end_date)}
                      {event.venue_name && ` • ${event.venue_name}`}
                      {event.venue_city && event.venue_state && ` • ${event.venue_city}, ${event.venue_state}`}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '16px', 
                      fontSize: '14px',
                      marginBottom: '12px'
                    }}>
                      <div>
                        <strong>Promoter:</strong> {event.promoter_name}
                      </div>
                      <div>
                        <strong>Email:</strong> {event.promoter_email}
                      </div>
                      <div>
                        <strong>Created:</strong> {formatDate(event.created_at)}
                      </div>
                      <div style={{ 
                        color: getDaysPending(event.created_at) > 60 ? '#dc3545' : 
                               getDaysPending(event.created_at) > 30 ? '#ff6b6b' : '#666'
                      }}>
                        <strong>Days Pending:</strong> {getDaysPending(event.created_at)}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '20px' }}>
                    <button
                      onClick={() => handleResendEmail(event.event_id, event.promoter_email)}
                      disabled={processing === `resend-${event.event_id}`}
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        background: processing === `resend-${event.event_id}` ? '#ccc' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: processing === `resend-${event.event_id}` ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {processing === `resend-${event.event_id}` ? 'Sending...' : 'Resend Email'}
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.event_id, event.event_title)}
                      disabled={processing === `delete-${event.event_id}`}
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        background: processing === `delete-${event.event_id}` ? '#ccc' : '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: processing === `delete-${event.event_id}` ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {processing === `delete-${event.event_id}` ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnclaimedEvents;

