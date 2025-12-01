/**
 * Review System Helper Functions
 * Utilities for fetching review summaries and aggregates
 */

const db = require('../../config/db');

/**
 * Get review summary for any reviewable entity
 * @param {string} reviewableType - Type of entity (product, event, artist, promoter, community)
 * @param {number} reviewableId - ID of the entity
 * @returns {Object} Review summary with counts and averages
 */
async function getReviewSummary(reviewableType, reviewableId) {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(AVG(rating), 0) as average_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1,
        SUM(CASE WHEN verified_transaction = TRUE THEN 1 ELSE 0 END) as verified_count
      FROM reviews 
      WHERE reviewable_type = ? 
        AND reviewable_id = ? 
        AND status = 'active'
    `, [reviewableType, reviewableId]);
    
    const result = stats[0];
    
    return {
      count: parseInt(result.count) || 0,
      average_rating: parseFloat(result.average_rating).toFixed(1),
      verified_count: parseInt(result.verified_count) || 0,
      rating_distribution: {
        5: parseInt(result.rating_5) || 0,
        4: parseInt(result.rating_4) || 0,
        3: parseInt(result.rating_3) || 0,
        2: parseInt(result.rating_2) || 0,
        1: parseInt(result.rating_1) || 0
      }
    };
  } catch (error) {
    console.error('Error getting review summary:', error);
    return {
      count: 0,
      average_rating: '0.0',
      verified_count: 0,
      rating_distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };
  }
}

/**
 * Get recent reviews for an entity
 * @param {string} reviewableType 
 * @param {number} reviewableId 
 * @param {number} limit - Number of reviews to return
 * @returns {Array} Recent reviews
 */
async function getRecentReviews(reviewableType, reviewableId, limit = 5) {
  try {
    const [reviews] = await db.query(`
      SELECT 
        r.*,
        u.username as reviewer_username,
        up.first_name as reviewer_first_name,
        up.last_name as reviewer_last_name
      FROM reviews r
      LEFT JOIN users u ON r.reviewer_id = u.id
      LEFT JOIN user_profiles up ON r.reviewer_id = up.user_id
      WHERE r.reviewable_type = ? 
        AND r.reviewable_id = ? 
        AND r.status = 'active'
      ORDER BY r.created_at DESC
      LIMIT ?
    `, [reviewableType, reviewableId, limit]);
    
    // Handle anonymous display
    return reviews.map(review => {
      if (review.display_as_anonymous) {
        return {
          ...review,
          reviewer_id: null,
          reviewer_username: 'Anonymous',
          reviewer_first_name: null,
          reviewer_last_name: null
        };
      }
      return review;
    });
  } catch (error) {
    console.error('Error getting recent reviews:', error);
    return [];
  }
}

/**
 * Check if user can review an entity
 * @param {number} userId 
 * @param {string} reviewableType 
 * @param {number} reviewableId 
 * @returns {Object} { canReview: boolean, reason: string }
 */
async function canUserReview(userId, reviewableType, reviewableId) {
  try {
    // Check if user already reviewed this (only count active reviews)
    const [existing] = await db.query(`
      SELECT id FROM reviews 
      WHERE reviewer_id = ? 
        AND reviewable_type = ? 
        AND reviewable_id = ?
        AND status = 'active'
    `, [userId, reviewableType, reviewableId]);
    
    if (existing.length > 0) {
      return { canReview: false, reason: 'You have already reviewed this item' };
    }
    
    // Check if reviewing own content
    if (reviewableType === 'product') {
      const [product] = await db.query('SELECT vendor_id FROM products WHERE id = ?', [reviewableId]);
      if (product.length > 0 && product[0].vendor_id === userId) {
        return { canReview: false, reason: 'You cannot review your own products' };
      }
    }
    
    if (reviewableType === 'event') {
      const [event] = await db.query('SELECT promoter_id FROM events WHERE id = ?', [reviewableId]);
      if (event.length > 0 && event[0].promoter_id === userId) {
        return { canReview: false, reason: 'You cannot review your own events' };
      }
    }
    
    if (reviewableType === 'artist' || reviewableType === 'promoter' || reviewableType === 'community') {
      if (reviewableId === userId) {
        return { canReview: false, reason: 'You cannot review yourself' };
      }
    }
    
    return { canReview: true };
  } catch (error) {
    console.error('Error checking if user can review:', error);
    return { canReview: false, reason: 'Error checking review eligibility' };
  }
}

/**
 * Check if user has verified transaction for verification badge
 * @param {number} userId 
 * @param {string} reviewableType 
 * @param {number} reviewableId 
 * @returns {boolean}
 */
async function hasVerifiedTransaction(userId, reviewableType, reviewableId) {
  try {
    if (reviewableType === 'product') {
      // Check if user purchased this product
      const [orders] = await db.query(`
        SELECT oi.id 
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.user_id = ? 
          AND oi.product_id = ?
          AND o.status = 'paid'
        LIMIT 1
      `, [userId, reviewableId]);
      
      return orders.length > 0;
    }
    
    if (reviewableType === 'event') {
      // Check if user attended event (via application)
      const [applications] = await db.query(`
        SELECT id FROM event_applications
        WHERE artist_id = ?
          AND event_id = ?
          AND status IN ('accepted', 'confirmed')
        LIMIT 1
      `, [userId, reviewableId]);
      
      return applications.length > 0;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking verified transaction:', error);
    return false;
  }
}

/**
 * Get event review summary split by reviewer type
 * @param {number} eventId - Event ID
 * @returns {Object} Separate summaries for artist and community reviews
 */
async function getEventReviewSummaryByType(eventId) {
  try {
    const [artistStats] = await db.query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(AVG(rating * weight_factor), 0) as weighted_average,
        COALESCE(AVG(rating), 0) as raw_average,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1,
        SUM(CASE WHEN verified_transaction = TRUE THEN 1 ELSE 0 END) as verified_count
      FROM reviews 
      WHERE reviewable_type = 'event' 
        AND reviewable_id = ? 
        AND reviewer_type = 'artist'
        AND status = 'active'
    `, [eventId]);

    const [communityStats] = await db.query(`
      SELECT 
        COUNT(*) as count,
        COALESCE(AVG(rating * weight_factor), 0) as weighted_average,
        COALESCE(AVG(rating), 0) as raw_average,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1,
        SUM(CASE WHEN verified_transaction = TRUE THEN 1 ELSE 0 END) as verified_count
      FROM reviews 
      WHERE reviewable_type = 'event' 
        AND reviewable_id = ? 
        AND reviewer_type = 'community'
        AND status = 'active'
    `, [eventId]);

    const artistResult = artistStats[0];
    const communityResult = communityStats[0];

    return {
      artist: {
        count: parseInt(artistResult.count) || 0,
        weighted_average: parseFloat(artistResult.weighted_average).toFixed(1),
        raw_average: parseFloat(artistResult.raw_average).toFixed(1),
        verified_count: parseInt(artistResult.verified_count) || 0,
        rating_distribution: {
          5: parseInt(artistResult.rating_5) || 0,
          4: parseInt(artistResult.rating_4) || 0,
          3: parseInt(artistResult.rating_3) || 0,
          2: parseInt(artistResult.rating_2) || 0,
          1: parseInt(artistResult.rating_1) || 0
        }
      },
      community: {
        count: parseInt(communityResult.count) || 0,
        weighted_average: parseFloat(communityResult.weighted_average).toFixed(1),
        raw_average: parseFloat(communityResult.raw_average).toFixed(1),
        verified_count: parseInt(communityResult.verified_count) || 0,
        rating_distribution: {
          5: parseInt(communityResult.rating_5) || 0,
          4: parseInt(communityResult.rating_4) || 0,
          3: parseInt(communityResult.rating_3) || 0,
          2: parseInt(communityResult.rating_2) || 0,
          1: parseInt(communityResult.rating_1) || 0
        }
      }
    };
  } catch (error) {
    console.error('Error getting event review summary by type:', error);
    return {
      artist: { count: 0, weighted_average: '0.0', raw_average: '0.0', verified_count: 0, rating_distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } },
      community: { count: 0, weighted_average: '0.0', raw_average: '0.0', verified_count: 0, rating_distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } }
    };
  }
}

/**
 * Calculate weight factor based on series sequence
 * Weight decay: Current = 1.0, -1 year = 0.8, -2 = 0.6, -3 = 0.4, -4 = 0.2, -5+ = excluded
 * @param {number} sequenceNumber - Sequence number from series_events (0 = current, -1 = last year, etc)
 * @returns {number|null} Weight factor or null if too old
 */
function calculateEventReviewWeight(sequenceNumber) {
  if (sequenceNumber === null || sequenceNumber === undefined) {
    return 1.0; // Default weight for events not in a series
  }

  const sequence = parseInt(sequenceNumber);
  
  if (sequence >= 0) return 1.0;  // Current or future event
  if (sequence === -1) return 0.8; // Last year
  if (sequence === -2) return 0.6; // 2 years ago
  if (sequence === -3) return 0.4; // 3 years ago
  if (sequence === -4) return 0.2; // 4 years ago
  
  return null; // 5+ years old - exclude from calculations
}

/**
 * Validate event review token
 * @param {string} token - Review token from URL
 * @param {number} eventId - Event ID
 * @returns {Object} { valid: boolean, reason: string, tokenData: object }
 */
async function validateEventReviewToken(token, eventId) {
  try {
    const [tokens] = await db.query(`
      SELECT * FROM event_review_tokens
      WHERE token = ? AND event_id = ?
    `, [token, eventId]);

    if (tokens.length === 0) {
      return { valid: false, reason: 'Invalid review token' };
    }

    const tokenData = tokens[0];
    const now = new Date();
    const validFrom = new Date(tokenData.valid_from);
    const validUntil = new Date(tokenData.valid_until);

    if (now < validFrom) {
      return { valid: false, reason: 'Review period has not started yet' };
    }

    if (now > validUntil) {
      return { valid: false, reason: 'Review period has ended (6 months after event)' };
    }

    return { valid: true, tokenData };
  } catch (error) {
    console.error('Error validating event review token:', error);
    return { valid: false, reason: 'Error validating token' };
  }
}

/**
 * Check if event is within 6-month review window
 * @param {number} eventId - Event ID
 * @returns {Object} { withinWindow: boolean, reason: string }
 */
async function checkEventReviewWindow(eventId) {
  try {
    const [events] = await db.query(`
      SELECT start_date, end_date FROM events WHERE id = ?
    `, [eventId]);

    if (events.length === 0) {
      return { withinWindow: false, reason: 'Event not found' };
    }

    const event = events[0];
    const now = new Date();
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    const reviewDeadline = new Date(endDate);
    reviewDeadline.setMonth(reviewDeadline.getMonth() + 6);

    if (now < startDate) {
      return { withinWindow: false, reason: 'Event has not started yet' };
    }

    if (now > reviewDeadline) {
      return { withinWindow: false, reason: 'Review period has ended (6 months after event)' };
    }

    return { withinWindow: true };
  } catch (error) {
    console.error('Error checking event review window:', error);
    return { withinWindow: false, reason: 'Error checking review window' };
  }
}

/**
 * Match pending reviews to a newly created user account
 * @param {string} email - User's email (lowercase)
 * @param {number} userId - Newly created user ID
 * @returns {number} Number of reviews matched and moved
 */
async function matchPendingReviews(email, userId) {
  try {
    // Find all pending reviews for this email
    const [pendingReviews] = await db.query(`
      SELECT * FROM pending_reviews 
      WHERE LOWER(reviewer_email) = LOWER(?) 
        AND associated_user_id IS NULL
    `, [email]);

    if (pendingReviews.length === 0) {
      return 0;
    }

    let movedCount = 0;

    for (const pending of pendingReviews) {
      // Check if user already has a review for this event (only count active reviews)
      const [existing] = await db.query(`
        SELECT id FROM reviews 
        WHERE reviewer_id = ? 
          AND reviewable_type = 'event' 
          AND reviewable_id = ?
          AND status = 'active'
      `, [userId, pending.event_id]);

      if (existing.length > 0) {
        // User already reviewed this event, skip
        continue;
      }

      // Get sequence number for weight calculation
      const [seriesData] = await db.query(`
        SELECT se.sequence_number, e.series_id
        FROM events e
        LEFT JOIN series_events se ON e.id = se.event_id
        WHERE e.id = ?
      `, [pending.event_id]);

      let sequenceNumber = null;
      let weightFactor = 1.0;

      if (seriesData.length > 0 && seriesData[0].series_id) {
        // Get current sequence for this series
        const [currentSequence] = await db.query(`
          SELECT MAX(se.sequence_number) as max_seq
          FROM series_events se
          JOIN events e ON se.event_id = e.id
          WHERE e.series_id = ?
        `, [seriesData[0].series_id]);

        const currentSeq = currentSequence[0].max_seq || 0;
        const reviewSeq = seriesData[0].sequence_number || 0;
        sequenceNumber = reviewSeq - currentSeq; // Relative sequence
        
        const calculatedWeight = calculateEventReviewWeight(sequenceNumber);
        if (calculatedWeight === null) {
          // Too old, don't move this review
          continue;
        }
        weightFactor = calculatedWeight;
      }

      // Move to reviews table
      await db.query(`
        INSERT INTO reviews (
          reviewable_type, reviewable_id, reviewer_id, rating, title, review_text,
          display_as_anonymous, verified_transaction, reviewer_type, series_sequence, 
          weight_factor, status, created_at
        ) VALUES (
          'event', ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'active', ?
        )
      `, [
        pending.event_id,
        userId,
        pending.rating,
        pending.title,
        pending.review_text,
        pending.verified_transaction,
        pending.reviewer_type,
        sequenceNumber,
        weightFactor,
        pending.created_at
      ]);

      // Mark as associated
      await db.query(`
        UPDATE pending_reviews 
        SET associated_user_id = ?, associated_at = NOW()
        WHERE id = ?
      `, [userId, pending.id]);

      movedCount++;
    }

    return movedCount;
  } catch (error) {
    console.error('Error matching pending reviews:', error);
    return 0;
  }
}

module.exports = {
  getReviewSummary,
  getRecentReviews,
  canUserReview,
  hasVerifiedTransaction,
  getEventReviewSummaryByType,
  calculateEventReviewWeight,
  validateEventReviewToken,
  checkEventReviewWindow,
  matchPendingReviews
};

