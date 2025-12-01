import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getApiUrl } from '../../../lib/config';
import { getAuthToken, authenticatedApiRequest } from '../../../lib/csrf';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import styles from './claim.module.css';

export default function ClaimEvent() {
  const router = useRouter();
  const { token } = router.query;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [user, setUser] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showExistingEventsModal, setShowExistingEventsModal] = useState(false);
  const [existingEvents, setExistingEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authToken = await getAuthToken();
        if (authToken) {
          // Fetch user data
          const response = await authenticatedApiRequest(getApiUrl('users/me'));
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          }
        }
      } catch (err) {
        console.error('Auth check error:', err);
      }
    };
    checkAuth();
    
    // Re-check auth when page gets focus (user returns from login)
    const handleFocus = () => checkAuth();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Verify token and load event data
  useEffect(() => {
    if (!token) return;

    const verifyToken = async () => {
      try {
        setLoading(true);
        const response = await fetch(getApiUrl(`api/events/verify-claim/${token}`));
        const data = await response.json();

        if (!response.ok || !data.valid) {
          setError(data.error || 'Invalid or expired claim link');
          setLoading(false);
          return;
        }

        setEventData(data.event);
        setLoading(false);
      } catch (err) {
        console.error('Error verifying token:', err);
        setError('Failed to verify claim link');
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleClaimNew = async () => {
    if (!user) {
      // Redirect to login with return URL
      router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    try {
      setProcessing(true);
      const response = await authenticatedApiRequest(getApiUrl(`api/events/claim-new/${token}`), {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim event');
      }

      // Redirect to event editor
      router.push(data.redirect_url);
    } catch (err) {
      console.error('Error claiming event:', err);
      alert(`Error: ${err.message}`);
      setProcessing(false);
    }
  };

  const handleLinkExisting = async () => {
    if (!user) {
      // Redirect to login with return URL
      router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    try {
      setLoadingEvents(true);
      setShowExistingEventsModal(true);

      // Fetch promoter's events
      const response = await authenticatedApiRequest(getApiUrl('api/events/mine'));
      const data = await response.json();

      if (!response.ok) {
        throw new Error('Failed to load your events');
      }

      setExistingEvents(data || []);
      setLoadingEvents(false);
    } catch (err) {
      console.error('Error loading events:', err);
      alert(`Error: ${err.message}`);
      setShowExistingEventsModal(false);
      setLoadingEvents(false);
    }
  };

  const handleSelectEvent = async (eventId) => {
    try {
      setProcessing(true);
      const response = await authenticatedApiRequest(getApiUrl(`api/events/link-existing/${token}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to link event');
      }

      // Show success and redirect
      alert(`Successfully linked to "${data.event_title}"!`);
      router.push(`/events/${eventId}`);
    } catch (err) {
      console.error('Error linking event:', err);
      alert(`Error: ${err.message}`);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Claim Event - Brakebee</title>
        </Head>
        <Header />
        <div className={styles.container}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Verifying claim link...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Head>
          <title>Claim Event - Brakebee</title>
        </Head>
        <Header />
        <div className={styles.container}>
          <div className={styles.errorCard}>
            <div className={styles.errorIcon}>⚠️</div>
            <h1>Invalid Claim Link</h1>
            <p>{error}</p>
            <p className={styles.errorHelp}>
              This link may have expired or already been used. Please contact the artist who sent you this link.
            </p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Claim Event - {eventData?.event_name} - Brakebee</title>
      </Head>
      <Header />
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1>Event Claim Request</h1>
            <p className={styles.subtitle}>
              <strong>{eventData?.artist_name}</strong> has suggested this event and would like you to add it to Brakebee
            </p>
          </div>

          <div className={styles.eventDetails}>
            <h3>Event Details</h3>
            <div className={styles.detailRow}>
              <span className={styles.label}>Event Name:</span>
              <span className={styles.value}>{eventData?.event_name}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.label}>Dates:</span>
              <span className={styles.value}>
                {new Date(eventData?.event_start_date).toLocaleDateString('en-US', { 
                  month: 'long', day: 'numeric', year: 'numeric' 
                })} - {new Date(eventData?.event_end_date).toLocaleDateString('en-US', { 
                  month: 'long', day: 'numeric', year: 'numeric' 
                })}
              </span>
            </div>
            {eventData?.venue_name && (
              <div className={styles.detailRow}>
                <span className={styles.label}>Venue:</span>
                <span className={styles.value}>{eventData.venue_name}</span>
              </div>
            )}
            {(eventData?.city || eventData?.state) && (
              <div className={styles.detailRow}>
                <span className={styles.label}>Location:</span>
                <span className={styles.value}>
                  {[eventData.city, eventData.state].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
            {eventData?.website && (
              <div className={styles.detailRow}>
                <span className={styles.label}>Website:</span>
                <span className={styles.value}>
                  <a href={eventData.website} target="_blank" rel="noopener noreferrer">
                    {eventData.website}
                  </a>
                </span>
              </div>
            )}
            <div className={styles.detailRow}>
              <span className={styles.label}>Suggested by:</span>
              <span className={styles.value}>
                {eventData?.artist_name} ({eventData?.artist_email})
              </span>
            </div>
          </div>

          <div className={styles.actions}>
            <h3>What would you like to do?</h3>
            
            <div className={styles.actionCard}>
              <div className={styles.actionIcon}>🎨</div>
              <h4>Claim as New Event</h4>
              <p>Create a new event listing on Brakebee with pre-filled details from the artist's suggestion.</p>
              <button 
                onClick={handleClaimNew}
                disabled={processing}
                className={styles.primaryButton}
              >
                {processing ? 'Processing...' : 'Claim Event'}
              </button>
            </div>

            <div className={styles.actionCard}>
              <div className={styles.actionIcon}>🔗</div>
              <h4>Link to Existing Event</h4>
              <p>This event is already listed on Brakebee. Connect the artist's suggestion to your existing event.</p>
              <button 
                onClick={handleLinkExisting}
                disabled={processing}
                className={styles.secondaryButton}
              >
                {processing ? 'Processing...' : 'Link to Existing Event'}
              </button>
            </div>
          </div>

          {!user && (
            <div className={styles.authNotice}>
              <p>You'll need to sign in or create a promoter account to claim this event.</p>
            </div>
          )}
        </div>
      </div>

      {/* Existing Events Modal */}
      {showExistingEventsModal && (
        <div className={styles.modal} onClick={() => !processing && setShowExistingEventsModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Select Your Event</h2>
              <button 
                className={styles.modalClose}
                onClick={() => !processing && setShowExistingEventsModal(false)}
                disabled={processing}
              >
                ×
              </button>
            </div>

            {loadingEvents ? (
              <div className={styles.modalLoading}>
                <div className={styles.spinner}></div>
                <p>Loading your events...</p>
              </div>
            ) : existingEvents.length === 0 ? (
              <div className={styles.noEvents}>
                <p>You don't have any active events yet.</p>
                <p>Please use "Claim as New Event" instead.</p>
              </div>
            ) : (
              <div className={styles.eventsList}>
                {existingEvents.map(event => (
                  <div key={event.id} className={styles.eventItem}>
                    <div className={styles.eventInfo}>
                      <h4>{event.title}</h4>
                      <p className={styles.eventDates}>
                        {new Date(event.start_date).toLocaleDateString('en-US', { 
                          month: 'short', day: 'numeric', year: 'numeric' 
                        })} - {new Date(event.end_date).toLocaleDateString('en-US', { 
                          month: 'short', day: 'numeric', year: 'numeric' 
                        })}
                      </p>
                      {event.venue_city && (
                        <p className={styles.eventLocation}>{event.venue_city}, {event.venue_state}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleSelectEvent(event.id)}
                      disabled={processing}
                      className={styles.selectButton}
                    >
                      {processing ? 'Linking...' : 'Select This Event'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

