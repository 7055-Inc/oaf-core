import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { authApiRequest, apiRequest } from '../lib/apiUtils';
import { getAuthToken } from '../lib/csrf';
import styles from './ProductReviews.module.css'; // Reuse product review styles

export default function EventReviews({ eventId, currentUserId, userType }) {
  const router = useRouter();
  const { token: urlToken } = router.query;
  
  const [artistReviews, setArtistReviews] = useState([]);
  const [communityReviews, setCommunityReviews] = useState([]);
  const [artistSummary, setArtistSummary] = useState(null);
  const [communitySummary, setCommunitySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [eligibilityMessage, setEligibilityMessage] = useState('');
  const [message, setMessage] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [reviewerType, setReviewerType] = useState(null); // 'artist' or 'community'
  
  // Form state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadReviews();
    loadReviewSummary();
    if (currentUserId) {
      determineReviewEligibility();
    }
  }, [eventId, currentUserId, urlToken, userType]);

  const determineReviewEligibility = async () => {
    try {
      // If there's a token, validate it (artist review)
      if (urlToken) {
        const token = getAuthToken();
        const response = await authApiRequest('/api/reviews/validate-token', {
          method: 'POST',
          token,
          body: JSON.stringify({ token: urlToken, eventId }),
          headers: {
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        
        if (data.valid) {
          setTokenValid(true);
          setReviewerType('artist');
          setCanReview(true);
        } else {
          setEligibilityMessage(data.reason || 'Invalid review token');
          setCanReview(false);
        }
      } else {
        // No token - check if community user can review
        if (userType === 'artist') {
          setEligibilityMessage('Artist users must use the review link provided by the event promoter.');
          setCanReview(false);
        } else {
          // Community user - check general eligibility
          const token = getAuthToken();
          const response = await authApiRequest(`/api/reviews/check-eligibility?type=event&id=${eventId}`, {
            method: 'GET',
            token
          });
          const data = await response.json();
          setCanReview(data.canReview);
          setEligibilityMessage(data.reason || '');
          setReviewerType('community');
        }
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
      setCanReview(false);
      setEligibilityMessage('Unable to verify review eligibility');
    }
  };

  const loadReviews = async () => {
    try {
      // Load artist reviews
      const artistResponse = await apiRequest(`/api/reviews?type=event&id=${eventId}&sort=recent&limit=50`);
      const artistData = await artistResponse.json();
      const allReviews = Array.isArray(artistData) ? artistData : [];
      
      // Split by reviewer_type
      setArtistReviews(allReviews.filter(r => r.reviewer_type === 'artist'));
      setCommunityReviews(allReviews.filter(r => r.reviewer_type === 'community'));
    } catch (error) {
      console.error('Error loading reviews:', error);
      setArtistReviews([]);
      setCommunityReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const loadReviewSummary = async () => {
    try {
      const response = await apiRequest(`/api/reviews/summary?type=event&id=${eventId}`);
      const data = await response.json();
      setArtistSummary(data.artist);
      setCommunitySummary(data.community);
    } catch (error) {
      console.error('Error loading review summary:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUserId) {
      setMessage('You must be logged in to leave a review.');
      return;
    }

    if (rating === 0) {
      setMessage('Please select a star rating.');
      return;
    }

    if (!title.trim() || !reviewText.trim()) {
      setMessage('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const authToken = getAuthToken();
      const body = {
        reviewable_type: 'event',
        reviewable_id: eventId,
        rating,
        title,
        review_text: reviewText,
        display_as_anonymous: anonymous
      };
      
      // Include token if this is an artist review
      if (urlToken && reviewerType === 'artist') {
        body.token = urlToken;
      }
      
      const response = await authApiRequest('/api/reviews', {
        method: 'POST',
        token: authToken,
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const newReview = await response.json();

      // Reset form
      setRating(0);
      setTitle('');
      setReviewText('');
      setAnonymous(false);
      setShowForm(false);
      setMessage('✓ Review submitted successfully!');
      
      // Reload reviews
      await loadReviews();
      await loadReviewSummary();
      setCanReview(false); // User can only review once

    } catch (error) {
      console.error('Error submitting review:', error);
      setMessage(error.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHelpful = async (reviewId, voteType) => {
    if (!currentUserId) {
      setMessage('You must be logged in to vote.');
      return;
    }

    try {
      const token = getAuthToken();
      await authApiRequest(`/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
        token,
        body: JSON.stringify({ vote: voteType }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      await loadReviews();
    } catch (error) {
      console.error('Error voting on review:', error);
    }
  };

  const renderStars = (avg, count, onClick = null) => {
    const stars = [];
    const rating = parseFloat(avg);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={`${styles.star} ${i <= rating ? styles.filled : ''} ${onClick ? styles.clickable : ''}`}
          onClick={() => onClick && onClick(i)}
          onMouseEnter={() => onClick && setHoverRating(i)}
          onMouseLeave={() => onClick && setHoverRating(0)}
        >
          ★
        </span>
      );
    }
    return (
      <div className={styles.stars}>
        {stars}
        {count > 0 && <span className={styles.ratingText}>({avg}/5 from {count} {count === 1 ? 'review' : 'reviews'})</span>}
      </div>
    );
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

  const renderReviewSection = (reviews, summary, sectionTitle) => {
    if (!summary || (summary.count === 0 && reviews.length === 0)) {
      return (
        <div className={styles.reviewSection}>
          <h3>{sectionTitle}</h3>
          <p className={styles.noReviews}>No reviews yet</p>
        </div>
      );
    }

    return (
      <div className={styles.reviewSection}>
        <h3>{sectionTitle}</h3>
        
        {/* Summary */}
        <div className={styles.reviewSummary}>
          <div className={styles.overallRating}>
            <div className={styles.ratingNumber}>{summary.weighted_average}</div>
            {renderStars(summary.weighted_average, summary.count)}
          </div>
          
          {summary.rating_distribution && (
            <div className={styles.ratingDistribution}>
              {[5, 4, 3, 2, 1].map(star => (
                <div key={star} className={styles.distributionRow}>
                  <span>{star} ★</span>
                  <div className={styles.bar}>
                    <div 
                      className={styles.barFill} 
                      style={{ width: `${summary.count > 0 ? (summary.rating_distribution[star] / summary.count) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span>{summary.rating_distribution[star]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Individual Reviews */}
        <div className={styles.reviewsList}>
          {reviews.map(review => (
            <div key={review.id} className={styles.reviewCard}>
              <div className={styles.reviewHeader}>
                <div>
                  <div className={styles.reviewerName}>
                    {review.display_as_anonymous ? 'Anonymous' : (review.reviewer_first_name || review.reviewer_username || 'User')}
                    {review.verified_transaction && <span className={styles.verifiedBadge} title="Verified attendee">✓</span>}
                  </div>
                  {renderStars(review.rating, 0)}
                </div>
                <div className={styles.reviewDate}>
                  {new Date(review.created_at).toLocaleDateString()}
                </div>
              </div>
              
              <h4 className={styles.reviewTitle}>{review.title}</h4>
              <p className={styles.reviewText}>{review.review_text}</p>
              
              <div className={styles.reviewActions}>
                <button 
                  className={styles.helpfulButton}
                  onClick={() => handleHelpful(review.id, 'helpful')}
                  disabled={!currentUserId}
                  title="Helpful"
                >
                  <span>👍</span>
                  <span>({review.helpful_count})</span>
                </button>
                <button 
                  className={styles.helpfulButton}
                  onClick={() => handleHelpful(review.id, 'not_helpful')}
                  disabled={!currentUserId}
                  title="Not helpful"
                >
                  <span>👎</span>
                  <span>({review.not_helpful_count})</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className={styles.loading}>Loading reviews...</div>;
  }

  return (
    <div className={styles.reviewsSection}>
      <h2>Event Reviews</h2>
      
      {/* Review Form */}
      {currentUserId && canReview && (
        <div className={styles.reviewForm}>
          {!showForm ? (
            <button 
              className={styles.addReviewButton}
              onClick={() => setShowForm(true)}
            >
              Leave a Review {reviewerType === 'artist' ? '(Artist)' : '(Community)'}
            </button>
          ) : (
            <form onSubmit={handleSubmit}>
              <h3>Write Your Review</h3>
              
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
                  placeholder="Sum up your experience"
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Review *</label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your thoughts about this event"
                  rows="5"
                  required
                ></textarea>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                  />
                  Post as Anonymous
                </label>
              </div>
              
              {message && <div className={styles.message}>{message}</div>}
              
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
          )}
        </div>
      )}
      
      {currentUserId && !canReview && eligibilityMessage && (
        <div className={styles.eligibilityMessage}>
          {eligibilityMessage}
        </div>
      )}
      
      {!currentUserId && (
        <div className={styles.eligibilityMessage}>
          Please{' '}
          <a 
            href={`/login?redirect=${encodeURIComponent(router.asPath)}`}
            style={{ color: 'var(--primary-color)', textDecoration: 'underline', cursor: 'pointer' }}
          >
            log in
          </a>
          {' '}or{' '}
          <a 
            href={`/signup?redirect=${encodeURIComponent(router.asPath)}`}
            style={{ color: 'var(--primary-color)', textDecoration: 'underline', cursor: 'pointer' }}
          >
            sign up
          </a>
          {' '}to continue.
        </div>
      )}
      
      {message && !showForm && <div className={styles.message}>{message}</div>}
      
      {/* Artist Reviews Section */}
      {renderReviewSection(artistReviews, artistSummary, 'What Attending Artists Thought')}
      
      {/* Community Reviews Section */}
      {renderReviewSection(communityReviews, communitySummary, 'What The Community Thought')}
    </div>
  );
}

