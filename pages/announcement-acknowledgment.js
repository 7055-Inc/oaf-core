import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { authenticatedApiRequest } from '../lib/csrf';
import styles from '../styles/AnnouncementAcknowledgment.module.css';

export default function AnnouncementAcknowledgment() {
  const [announcements, setAnnouncements] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { redirect } = router.query;

  useEffect(() => {
    const fetchPendingAnnouncements = async () => {
      try {
        const response = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/announcements/pending');
        if (!response.ok) {
          throw new Error('Failed to fetch pending announcements');
        }
        const data = await response.json();
        setAnnouncements(data);
        
        // If no announcements, redirect immediately
        if (data.length === 0) {
          handleComplete();
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingAnnouncements();
  }, []);

  const currentAnnouncement = announcements[currentIndex];

  const handleComplete = () => {
    const redirectUrl = redirect || '/dashboard';
    router.push(redirectUrl);
  };

  const verifyAndComplete = async () => {
    // Verify no pending announcements before redirecting
    let verificationAttempts = 0;
    let noMoreAnnouncements = false;
    
    while (verificationAttempts < 3 && !noMoreAnnouncements) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        const checkResponse = await authenticatedApiRequest('https://api2.onlineartfestival.com/api/announcements/check-pending');
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (!checkData.requiresAcknowledgment) {
            noMoreAnnouncements = true;
            break;
          }
        }
      } catch (checkErr) {
        // Continue with attempts if check fails
      }
      
      verificationAttempts++;
    }

    handleComplete();
  };

  const handleAcknowledge = async () => {
    if (!currentAnnouncement) return;
    
    setSubmitting(true);
    setError(null);

    try {
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/api/announcements/${currentAnnouncement.id}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to acknowledge announcement');
      }

      // Small delay to ensure database commit completes
      await new Promise(resolve => setTimeout(resolve, 300));

      // Remove the acknowledged announcement from the array
      const updatedAnnouncements = announcements.filter((_, index) => index !== currentIndex);
      setAnnouncements(updatedAnnouncements);

      // If there are more announcements, stay at the same index (since we removed one)
      // If this was the last announcement, complete the flow
      if (updatedAnnouncements.length === 0) {
        await verifyAndComplete();
      }
      // If current index is now beyond the array length, go to the last valid index
      else if (currentIndex >= updatedAnnouncements.length) {
        setCurrentIndex(updatedAnnouncements.length - 1);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemindLater = async () => {
    if (!currentAnnouncement) return;
    
    setSubmitting(true);
    setError(null);

    try {
      const response = await authenticatedApiRequest(`https://api2.onlineartfestival.com/api/announcements/${currentAnnouncement.id}/remind-later`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set reminder');
      }

      // Small delay to ensure database commit completes
      await new Promise(resolve => setTimeout(resolve, 300));

      // Remove the dismissed announcement from the array
      const updatedAnnouncements = announcements.filter((_, index) => index !== currentIndex);
      setAnnouncements(updatedAnnouncements);

      // If there are more announcements, stay at the same index (since we removed one)
      // If this was the last announcement, complete the flow
      if (updatedAnnouncements.length === 0) {
        await verifyAndComplete();
      }
      // If current index is now beyond the array length, go to the last valid index
      else if (currentIndex >= updatedAnnouncements.length) {
        setCurrentIndex(updatedAnnouncements.length - 1);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Announcements - Online Art Festival</title>
        </Head>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading announcements...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Head>
          <title>Announcements - Online Art Festival</title>
        </Head>
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => router.push('/')} className={styles.backButton}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (announcements.length === 0) {
    // Auto-redirect after 2 seconds when no announcements
    useEffect(() => {
      const timer = setTimeout(() => handleComplete(), 2000);
      return () => clearTimeout(timer);
    }, []);

    return (
      <div className={styles.container}>
        <Head>
          <title>No Announcements - Online Art Festival</title>
        </Head>
        <div className={styles.modal}>
          <div className={styles.header}>
            <h1>All Caught Up!</h1>
            <p>You have no pending announcements. Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Important Announcement - Online Art Festival</title>
      </Head>
      
      <div className={styles.modal}>
        <div className={styles.header}>
          <h1>📢 Important Announcement</h1>
          <div className={styles.subtitle}>
            <p>{currentAnnouncement.title}</p>
            {announcements.length > 1 && (
              <div className={styles.progress}>
                Announcement {currentIndex + 1} of {announcements.length}
              </div>
            )}
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.announcementMeta}>
            <span className={styles.date}>
              Valid until: {formatDate(currentAnnouncement.expires_at)}
            </span>
          </div>

          <div className={styles.announcementContent}>
            <div 
              className={styles.htmlContent}
              dangerouslySetInnerHTML={{ __html: currentAnnouncement.content }}
            />
          </div>

          {error && (
            <div className={styles.errorMessage}>
              <p>{error}</p>
            </div>
          )}

          <div className={styles.actions}>
            <button 
              onClick={handleRemindLater}
              className={styles.remindButton}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className={styles.spinner}></span>
                  Processing...
                </>
              ) : (
                <>
                  <span className={styles.buttonIcon}>⏰</span>
                  Remind me later
                </>
              )}
            </button>
            
            <button 
              onClick={handleAcknowledge}
              className={styles.acknowledgeButton}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className={styles.spinner}></span>
                  Processing...
                </>
              ) : (
                <>
                  <span className={styles.buttonIcon}>✅</span>
                  Got it!
                </>
              )}
            </button>
          </div>

          {announcements.length > 1 && (
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill}
                style={{ width: `${((currentIndex + 1) / announcements.length) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 