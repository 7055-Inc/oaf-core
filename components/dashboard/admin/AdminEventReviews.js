import { useState, useEffect } from 'react';
import { authApiRequest, apiRequest } from '../../../lib/apiUtils';
import { getAuthToken } from '../../../lib/csrf';
import styles from '../admin/AdminReviews.module.css';

export default function AdminEventReviews() {
  const [events, setEvents] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [selectedEvent, setSelectedEvent] = useState('');
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [reviewerType, setReviewerType] = useState('artist');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    loadEvents();
    loadPendingReviews();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await apiRequest('/api/events?status=all&limit=100');
      const data = await response.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingReviews = async () => {
    try {
      const token = getAuthToken();
      const response = await authApiRequest('/api/reviews/admin/pending', {
        method: 'GET',
        token
      });
      const data = await response.json();
      setPendingReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading pending reviews:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      setMessage('Please select a star rating.');
      return;
    }

    if (!selectedEvent || !reviewerEmail.trim() || !title.trim() || !reviewText.trim()) {
      setMessage('Please fill in all required fields.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(reviewerEmail)) {
      setMessage('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const token = getAuthToken();
      const response = await authApiRequest('/api/reviews/admin/pending', {
        method: 'POST',
        token,
        body: JSON.stringify({
          event_id: selectedEvent,
          reviewer_email: reviewerEmail,
          reviewer_type: reviewerType,
          rating,
          title,
          review_text: reviewText,
          verified_transaction: verified
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        // Reset form
        setSelectedEvent('');
        setReviewerEmail('');
        setReviewerType('artist');
        setRating(0);
        setTitle('');
        setReviewText('');
        setVerified(false);
        setShowForm(false);
        setMessage(data.message || '✓ Review submitted successfully!');
        
        // Reload pending reviews
        await loadPendingReviews();
      } else {
        setMessage('Failed to submit review. Please try again.');
      }

    } catch (error) {
      console.error('Error submitting review:', error);
      setMessage(error.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderFormStars = () => {
    const stars = [];
    const displayRating = hoverRating || rating;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={`${styles.star} ${i <= displayRating ? styles.filled : ''} ${styles.clickable}`}
          onClick={() => setRating(i)}
          onMouseEnter={() => setHoverRating(i)}
          onMouseLeave={() => setHoverRating(0)}
        >
          ★
        </span>
      );
    }
    return <div className={styles.stars}>{stars}</div>;
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.adminReviewsContainer}>
      <h2>Manage Event Reviews</h2>
      <p className={styles.description}>
        Manually enter reviews collected from artists via email, phone, or in-person. 
        Reviews will be automatically associated when users create accounts.
      </p>

      {/* Add Review Button */}
      <div className={styles.actions}>
        <button 
          className={styles.addButton}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ Add Manual Review'}
        </button>
      </div>

      {message && <div className={styles.message}>{message}</div>}

      {/* Review Form */}
      {showForm && (
        <div className={styles.formSection}>
          <form onSubmit={handleSubmit} className={styles.reviewForm}>
            <h3>Enter Manual Review</h3>
            
            <div className={styles.formGroup}>
              <label>Event *</label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                required
              >
                <option value="">Select an event...</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.title} - {new Date(event.start_date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Reviewer Email *</label>
              <input
                type="email"
                value={reviewerEmail}
                onChange={(e) => setReviewerEmail(e.target.value)}
                placeholder="artist@example.com"
                required
              />
              <small>We'll associate this review if the user creates an account with this email.</small>
            </div>

            <div className={styles.formGroup}>
              <label>Reviewer Type *</label>
              <select
                value={reviewerType}
                onChange={(e) => setReviewerType(e.target.value)}
                required
              >
                <option value="artist">Artist</option>
                <option value="community">Community</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Rating *</label>
              {renderFormStars()}
            </div>
            
            <div className={styles.formGroup}>
              <label>Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sum up their experience"
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Review *</label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Enter the review text"
                rows="5"
                required
              ></textarea>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={verified}
                  onChange={(e) => setVerified(e.target.checked)}
                />
                Mark as Verified Attendee
              </label>
            </div>
            
            <div className={styles.formActions}>
              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
              <button 
                type="button" 
                className={styles.cancelButton}
                onClick={() => setShowForm(false)}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pending Reviews Table */}
      <div className={styles.pendingSection}>
        <h3>Pending Reviews ({pendingReviews.length})</h3>
        <p className={styles.description}>
          These reviews are waiting to be associated with user accounts.
        </p>

        {pendingReviews.length === 0 ? (
          <p className={styles.noReviews}>No pending reviews</p>
        ) : (
          <div className={styles.table}>
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Email</th>
                  <th>Type</th>
                  <th>Rating</th>
                  <th>Review</th>
                  <th>Submitted</th>
                  <th>Added By</th>
                </tr>
              </thead>
              <tbody>
                {pendingReviews.map(review => (
                  <tr key={review.id}>
                    <td>{review.event_title}</td>
                    <td>{review.reviewer_email}</td>
                    <td><span className={styles.badge}>{review.reviewer_type}</span></td>
                    <td>{'★'.repeat(review.rating)}</td>
                    <td>
                      <strong>{review.title}</strong>
                      <br />
                      <small>{review.review_text.substring(0, 100)}...</small>
                    </td>
                    <td>{new Date(review.created_at).toLocaleDateString()}</td>
                    <td>{review.admin_username || 'Admin'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

