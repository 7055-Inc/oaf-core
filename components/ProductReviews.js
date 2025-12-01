import { useState, useEffect } from 'react';
import { authApiRequest, apiRequest } from '../lib/apiUtils';
import { getAuthToken } from '../lib/csrf';
import styles from './ProductReviews.module.css';

export default function ProductReviews({ productId, currentUserId }) {
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [eligibilityMessage, setEligibilityMessage] = useState('');
  const [message, setMessage] = useState('');
  
  // Form state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    console.log('ProductReviews: currentUserId =', currentUserId);
    loadReviews();
    loadReviewSummary();
    if (currentUserId) {
      checkEligibility();
    }
  }, [productId, currentUserId]);

  const loadReviews = async () => {
    try {
      const response = await apiRequest(`/api/reviews?type=product&id=${productId}&sort=recent&limit=50`);
      const data = await response.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading reviews:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const loadReviewSummary = async () => {
    try {
      const response = await apiRequest(`/api/reviews/summary?type=product&id=${productId}`);
      const data = await response.json();
      setReviewSummary(data);
    } catch (error) {
      console.error('Error loading review summary:', error);
    }
  };

  const checkEligibility = async () => {
    try {
      const token = getAuthToken();
      const response = await authApiRequest(`/api/reviews/check-eligibility?type=product&id=${productId}`, {
        method: 'GET',
        token
      });
      const data = await response.json();
      setCanReview(data.canReview);
      setEligibilityMessage(data.reason || '');
    } catch (error) {
      console.error('Error checking eligibility:', error);
      // If check fails, assume they can try (backend will validate on submit)
      setCanReview(true);
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
      const token = getAuthToken();
      const response = await authApiRequest('/api/reviews', {
        method: 'POST',
        token,
        body: JSON.stringify({
          reviewable_type: 'product',
          reviewable_id: productId,
          rating,
          title,
          review_text: reviewText,
          display_as_anonymous: anonymous
        }),
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
      await checkEligibility();

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
      
      // Reload reviews to show updated counts
      await loadReviews();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const renderStars = (value, interactive = false, onHover = null, onClick = null) => {
    return (
      <div className={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`${styles.star} ${star <= (onHover ? hoverRating : value) ? styles.filled : ''} ${interactive ? styles.interactive : ''}`}
            onMouseEnter={() => interactive && onHover && onHover(star)}
            onMouseLeave={() => interactive && onHover && onHover(0)}
            onClick={() => interactive && onClick && onClick(star)}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return <div className={styles.loading}>Loading reviews...</div>;
  }

  return (
    <div className={styles.reviewsSection}>
      <div className={styles.reviewsHeader}>
        <h2>Customer Reviews</h2>
        
        {reviewSummary && reviewSummary.count > 0 && (
          <div className={styles.reviewSummary}>
            <div className={styles.averageRating}>
              <div className={styles.ratingNumber}>{reviewSummary.average_rating}</div>
              {renderStars(parseFloat(reviewSummary.average_rating))}
              <div className={styles.reviewCount}>Based on {reviewSummary.count} {reviewSummary.count === 1 ? 'review' : 'reviews'}</div>
            </div>
            
            <div className={styles.ratingBars}>
              {[5, 4, 3, 2, 1].map(star => (
                <div key={star} className={styles.ratingBar}>
                  <span className={styles.starLabel}>{star} ★</span>
                  <div className={styles.bar}>
                    <div 
                      className={styles.barFill} 
                      style={{ 
                        width: reviewSummary.count > 0 
                          ? `${(reviewSummary.rating_distribution[star] / reviewSummary.count) * 100}%` 
                          : '0%' 
                      }}
                    />
                  </div>
                  <span className={styles.barCount}>{reviewSummary.rating_distribution[star]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Review Form */}
      {currentUserId && (
        <div className={styles.reviewFormSection}>
          {!showForm && (
            <>
              <button 
                className={styles.addReviewButton}
                onClick={() => setShowForm(true)}
              >
                Write a Review
              </button>
              
              {!canReview && eligibilityMessage && (
                <div className={styles.eligibilityMessage}>
                  {eligibilityMessage}
                </div>
              )}
            </>
          )}

          {showForm && (
            <form className={styles.reviewForm} onSubmit={handleSubmit}>
              <h3>Write Your Review</h3>
              
              {message && (
                <div className={`${styles.message} ${message.includes('success') ? styles.success : styles.error}`}>
                  {message}
                </div>
              )}

              <div className={styles.formGroup}>
                <label>Rating *</label>
                {renderStars(
                  rating,
                  true,
                  setHoverRating,
                  setRating
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="title">Title *</label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Sum up your experience"
                  required
                  maxLength="255"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="reviewText">Review *</label>
                <textarea
                  id="reviewText"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your thoughts about this product..."
                  required
                  rows="6"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                  />
                  Post anonymously
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
                  onClick={() => {
                    setShowForm(false);
                    setRating(0);
                    setTitle('');
                    setReviewText('');
                    setAnonymous(false);
                    setMessage('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {!currentUserId && (
        <div className={styles.loginPrompt}>
          <a href="/login">Log in</a> to write a review
        </div>
      )}

      {/* Reviews List */}
      <div className={styles.reviewsList}>
        {reviews.length === 0 && (
          <p className={styles.noReviews}>No reviews yet. Be the first to review this product!</p>
        )}

        {reviews.map((review) => (
          <div key={review.id} className={styles.reviewCard}>
            <div className={styles.reviewHeader}>
              <div className={styles.reviewerInfo}>
                <div className={styles.reviewerName}>
                  {review.reviewer_first_name && review.reviewer_last_name
                    ? `${review.reviewer_first_name} ${review.reviewer_last_name}`
                    : review.reviewer_username}
                  {review.verified_transaction && (
                    <span className={styles.verifiedBadge}>✓ Verified Purchase</span>
                  )}
                </div>
                <div className={styles.reviewDate}>{formatDate(review.created_at)}</div>
              </div>
              <div className={styles.reviewRating}>
                {renderStars(parseFloat(review.rating))}
              </div>
            </div>

            <h4 className={styles.reviewTitle}>{review.title}</h4>
            <p className={styles.reviewText}>{review.review_text}</p>

            <div className={styles.reviewFooter}>
              <div className={styles.helpfulSection}>
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

            {review.reply_count > 0 && (
              <div className={styles.repliesIndicator}>
                {review.reply_count} {review.reply_count === 1 ? 'reply' : 'replies'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

