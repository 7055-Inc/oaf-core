/**
 * Reviews System Routes
 * Handles reviews for products, events, artists, promoters, and community members
 * Features: CRUD operations, threading, moderation, helpful votes
 */

const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');
const { 
  getReviewSummary, 
  getRecentReviews, 
  canUserReview, 
  hasVerifiedTransaction,
  getEventReviewSummaryByType,
  calculateEventReviewWeight,
  validateEventReviewToken,
  checkEventReviewWindow,
  matchPendingReviews
} = require('../utils/reviewHelpers');

/**
 * GET /api/reviews
 * Get reviews for a specific entity or by reviewer
 * 
 * Query params:
 * - type: reviewable_type (product, event, artist, promoter, community)
 * - id: reviewable_id
 * - reviewer_id: filter by reviewer
 * - limit: number of results (default 20)
 * - offset: pagination offset
 * - sort: recent, highest, lowest, helpful
 */
router.get('/', async (req, res) => {
  try {
    const { 
      type, 
      id, 
      reviewer_id, 
      limit = 20, 
      offset = 0,
      sort = 'recent'
    } = req.query;
    
    let query = `
      SELECT 
        r.*,
        u.username as reviewer_username,
        up.first_name as reviewer_first_name,
        up.last_name as reviewer_last_name,
        (SELECT COUNT(*) FROM review_replies WHERE review_id = r.id) as reply_count
      FROM reviews r
      LEFT JOIN users u ON r.reviewer_id = u.id
      LEFT JOIN user_profiles up ON r.reviewer_id = up.user_id
      WHERE r.status = 'active'
    `;
    
    const params = [];
    
    if (type && id) {
      query += ` AND r.reviewable_type = ? AND r.reviewable_id = ?`;
      params.push(type, id);
    }
    
    if (reviewer_id) {
      query += ` AND r.reviewer_id = ?`;
      params.push(reviewer_id);
    }
    
    // Sorting
    switch(sort) {
      case 'highest':
        query += ` ORDER BY r.rating DESC, r.created_at DESC`;
        break;
      case 'lowest':
        query += ` ORDER BY r.rating ASC, r.created_at DESC`;
        break;
      case 'helpful':
        query += ` ORDER BY r.helpful_count DESC, r.created_at DESC`;
        break;
      case 'recent':
      default:
        query += ` ORDER BY r.created_at DESC`;
    }
    
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    const [reviews] = await db.query(query, params);
    
    // Handle anonymous display
    const sanitizedReviews = reviews.map(review => {
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
    
    res.json(sanitizedReviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

/**
 * GET /api/reviews/summary
 * Get review summary/stats for an entity
 * For events, returns separate artist/community summaries
 */
router.get('/summary', async (req, res) => {
  try {
    const { type, id } = req.query;
    
    if (!type || !id) {
      return res.status(400).json({ error: 'type and id are required' });
    }
    
    // Event reviews have separate artist/community summaries
    if (type === 'event') {
      const summary = await getEventReviewSummaryByType(id);
      return res.json(summary);
    }
    
    const summary = await getReviewSummary(type, id);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching review summary:', error);
    res.status(500).json({ error: 'Failed to fetch review summary' });
  }
});

/**
 * GET /api/reviews/event-token/:eventId
 * Get review token URL for an event (promoter only)
 */
router.get('/event-token/:eventId', verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Check if user is the promoter of this event
    const [events] = await db.query('SELECT promoter_id FROM events WHERE id = ?', [eventId]);
    
    if (events.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    if (events[0].promoter_id !== req.userId) {
      return res.status(403).json({ error: 'Only the event promoter can access this token' });
    }
    
    // Get or create token
    const [tokens] = await db.query(`
      SELECT token, valid_from, valid_until FROM event_review_tokens WHERE event_id = ?
    `, [eventId]);
    
    if (tokens.length === 0) {
      return res.status(404).json({ error: 'Token not found for this event' });
    }
    
    const token = tokens[0];
    const baseUrl = process.env.FRONTEND_URL || 'https://brakebee.com';
    const tokenUrl = `${baseUrl}/events/${eventId}?token=${token.token}`;
    
    res.json({
      token: token.token,
      url: tokenUrl,
      valid_from: token.valid_from,
      valid_until: token.valid_until
    });
  } catch (error) {
    console.error('Error fetching event token:', error);
    res.status(500).json({ error: 'Failed to fetch event token' });
  }
});

/**
 * POST /api/reviews/validate-token
 * Validate an event review token
 */
router.post('/validate-token', verifyToken, async (req, res) => {
  try {
    const { token, eventId } = req.body;
    
    if (!token || !eventId) {
      return res.status(400).json({ error: 'token and eventId are required' });
    }
    
    // Validate the token
    const validation = await validateEventReviewToken(token, eventId);
    
    if (!validation.valid) {
      return res.status(400).json({ valid: false, reason: validation.reason });
    }
    
    // Check user type from JWT
    const [users] = await db.query('SELECT user_type FROM users WHERE id = ?', [req.userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userType = users[0].user_type;
    
    // Only artist users can use tokens
    if (userType !== 'artist') {
      return res.status(403).json({ 
        valid: false, 
        reason: 'This feature is only for registered artist users. If you need help changing your account to an artist profile, please reach out to Brakebee Support.' 
      });
    }
    
    // Check if user has already reviewed this event
    const eligibility = await canUserReview(req.userId, 'event', eventId);
    
    if (!eligibility.canReview) {
      return res.json({ 
        valid: false, 
        reason: eligibility.reason 
      });
    }
    
    res.json({ valid: true, userType });
  } catch (error) {
    console.error('Error validating token:', error);
    res.status(500).json({ error: 'Failed to validate token' });
  }
});

/**
 * GET /api/reviews/check-eligibility
 * Check if user can review an entity
 * MUST be before /:id route to avoid route collision
 */
router.get('/check-eligibility', verifyToken, async (req, res) => {
  try {
    const { type, id } = req.query;
    
    if (!type || !id) {
      return res.status(400).json({ error: 'type and id are required' });
    }
    
    const eligibility = await canUserReview(req.userId, type, id);
    const hasVerified = await hasVerifiedTransaction(req.userId, type, id);
    
    res.json({
      ...eligibility,
      can_verify: hasVerified
    });
  } catch (error) {
    console.error('Error checking eligibility:', error);
    res.status(500).json({ error: 'Failed to check eligibility' });
  }
});

/**
 * GET /api/reviews/:id
 * Get single review with full details and replies
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [reviews] = await db.query(`
      SELECT 
        r.*,
        u.username as reviewer_username,
        up.first_name as reviewer_first_name,
        up.last_name as reviewer_last_name
      FROM reviews r
      LEFT JOIN users u ON r.reviewer_id = u.id
      LEFT JOIN user_profiles up ON r.reviewer_id = up.user_id
      WHERE r.id = ?
    `, [id]);
    
    if (reviews.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    let review = reviews[0];
    
    // Handle anonymous display
    if (review.display_as_anonymous) {
      review.reviewer_id = null;
      review.reviewer_username = 'Anonymous';
      review.reviewer_first_name = null;
      review.reviewer_last_name = null;
    }
    
    // Get replies
    const [replies] = await db.query(`
      SELECT 
        rr.*,
        u.username as user_username,
        up.first_name as user_first_name,
        up.last_name as user_last_name
      FROM review_replies rr
      LEFT JOIN users u ON rr.user_id = u.id
      LEFT JOIN user_profiles up ON rr.user_id = up.user_id
      WHERE rr.review_id = ?
      ORDER BY rr.created_at ASC
    `, [id]);
    
    review.replies = replies;
    
    res.json(review);
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

/**
 * POST /api/reviews
 * Create a new review
 * For events: handles token validation, reviewer_type, weight calculation
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      reviewable_type,
      reviewable_id,
      rating,
      title,
      review_text,
      display_as_anonymous = false,
      token = null // Event review token (optional)
    } = req.body;
    
    // Validation
    if (!reviewable_type || !reviewable_id || !rating || !title || !review_text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    // Check eligibility
    const eligibility = await canUserReview(req.userId, reviewable_type, reviewable_id);
    if (!eligibility.canReview) {
      return res.status(403).json({ error: eligibility.reason });
    }
    
    // Get user type for event reviews
    const [users] = await db.query('SELECT user_type FROM users WHERE id = ?', [req.userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userType = users[0].user_type;
    
    // Event-specific logic
    let reviewerType = null;
    let seriesSequence = null;
    let weightFactor = 1.0;
    
    if (reviewable_type === 'event') {
      // Check 6-month review window
      const windowCheck = await checkEventReviewWindow(reviewable_id);
      if (!windowCheck.withinWindow) {
        return res.status(403).json({ error: windowCheck.reason });
      }
      
      // Determine reviewer type
      if (token) {
        // Artist review via token
        if (userType !== 'artist') {
          return res.status(403).json({ 
            error: 'This feature is only for registered artist users. If you need help changing your account to an artist profile, please reach out to Brakebee Support.' 
          });
        }
        
        // Validate token
        const validation = await validateEventReviewToken(token, reviewable_id);
        if (!validation.valid) {
          return res.status(403).json({ error: validation.reason });
        }
        
        reviewerType = 'artist';
      } else {
        // Community review (no token required)
        if (userType === 'artist') {
          return res.status(403).json({ 
            error: 'Artist users must use the review link provided by the event promoter.' 
          });
        }
        reviewerType = 'community';
      }
      
      // Check if user already reviewed as the other type
      const [existingOtherType] = await db.query(`
        SELECT id FROM reviews 
        WHERE reviewer_id = ? 
          AND reviewable_type = 'event' 
          AND reviewable_id = ?
          AND reviewer_type != ?
      `, [req.userId, reviewable_id, reviewerType]);
      
      if (existingOtherType.length > 0) {
        return res.status(403).json({ 
          error: 'You have already reviewed this event as a different user type. A single user cannot review as both artist and community.' 
        });
      }
      
      // Get series sequence for weight calculation
      const [seriesData] = await db.query(`
        SELECT se.sequence_number, e.series_id
        FROM events e
        LEFT JOIN series_events se ON e.id = se.event_id
        WHERE e.id = ?
      `, [reviewable_id]);
      
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
        seriesSequence = reviewSeq - currentSeq; // Relative sequence
        
        const calculatedWeight = calculateEventReviewWeight(seriesSequence);
        if (calculatedWeight === null) {
          return res.status(403).json({ error: 'This event is too old to accept new reviews' });
        }
        weightFactor = calculatedWeight;
      }
    }
    
    // Check if verified transaction
    const isVerified = await hasVerifiedTransaction(req.userId, reviewable_type, reviewable_id);
    
    // Create review
    const [result] = await db.query(`
      INSERT INTO reviews (
        reviewable_type,
        reviewable_id,
        reviewer_id,
        rating,
        title,
        review_text,
        display_as_anonymous,
        verified_transaction,
        reviewer_type,
        series_sequence,
        weight_factor,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `, [
      reviewable_type,
      reviewable_id,
      req.userId,
      rating,
      title,
      review_text,
      display_as_anonymous,
      isVerified,
      reviewerType,
      seriesSequence,
      weightFactor
    ]);
    
    // Fetch the created review
    const [newReview] = await db.query(`
      SELECT r.* FROM reviews r WHERE r.id = ?
    `, [result.insertId]);
    
    res.status(201).json(newReview[0]);
  } catch (error) {
    console.error('Error creating review:', error);
    
    // Handle duplicate review constraint
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'You have already reviewed this item' });
    }
    
    res.status(500).json({ error: 'Failed to create review' });
  }
});

/**
 * PATCH /api/reviews/:id
 * Edit own review (creates history entry)
 */
router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title, review_text } = req.body;
    
    // Check ownership
    const [existing] = await db.query(`
      SELECT * FROM reviews WHERE id = ? AND reviewer_id = ?
    `, [id, req.userId]);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Review not found or you do not own this review' });
    }
    
    const oldReview = existing[0];
    
    // Create history entries for changes
    if (rating && rating !== oldReview.rating) {
      await db.query(`
        INSERT INTO review_edit_history (review_id, field_changed, old_value, new_value, edited_by)
        VALUES (?, 'rating', ?, ?, ?)
      `, [id, oldReview.rating, rating, req.userId]);
    }
    
    if (title && title !== oldReview.title) {
      await db.query(`
        INSERT INTO review_edit_history (review_id, field_changed, old_value, new_value, edited_by)
        VALUES (?, 'title', ?, ?, ?)
      `, [id, oldReview.title, title, req.userId]);
    }
    
    if (review_text && review_text !== oldReview.review_text) {
      await db.query(`
        INSERT INTO review_edit_history (review_id, field_changed, old_value, new_value, edited_by)
        VALUES (?, 'review_text', ?, ?, ?)
      `, [id, oldReview.review_text, review_text, req.userId]);
    }
    
    // Update review
    const updates = [];
    const values = [];
    
    if (rating) {
      updates.push('rating = ?');
      values.push(rating);
    }
    if (title) {
      updates.push('title = ?');
      values.push(title);
    }
    if (review_text) {
      updates.push('review_text = ?');
      values.push(review_text);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(id);
    
    await db.query(`
      UPDATE reviews SET ${updates.join(', ')} WHERE id = ?
    `, values);
    
    // Fetch updated review
    const [updated] = await db.query('SELECT * FROM reviews WHERE id = ?', [id]);
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

/**
 * DELETE /api/reviews/:id
 * Delete own review (soft delete - sets status to removed)
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check ownership
    const [existing] = await db.query(`
      SELECT * FROM reviews WHERE id = ? AND reviewer_id = ?
    `, [id, req.userId]);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Review not found or you do not own this review' });
    }
    
    // Soft delete
    await db.query(`
      UPDATE reviews SET status = 'removed' WHERE id = ?
    `, [id]);
    
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

/**
 * POST /api/reviews/:id/replies
 * Add a reply to a review
 */
router.post('/:id/replies', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reply_text, parent_reply_id = null } = req.body;
    
    if (!reply_text) {
      return res.status(400).json({ error: 'reply_text is required' });
    }
    
    // Check if review exists
    const [review] = await db.query('SELECT id FROM reviews WHERE id = ?', [id]);
    if (review.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    // Create reply
    const [result] = await db.query(`
      INSERT INTO review_replies (review_id, parent_reply_id, user_id, reply_text)
      VALUES (?, ?, ?, ?)
    `, [id, parent_reply_id, req.userId, reply_text]);
    
    // Fetch created reply
    const [newReply] = await db.query(`
      SELECT 
        rr.*,
        u.username as user_username,
        up.first_name as user_first_name,
        up.last_name as user_last_name
      FROM review_replies rr
      LEFT JOIN users u ON rr.user_id = u.id
      LEFT JOIN user_profiles up ON rr.user_id = up.user_id
      WHERE rr.id = ?
    `, [result.insertId]);
    
    res.status(201).json(newReply[0]);
  } catch (error) {
    console.error('Error creating reply:', error);
    res.status(500).json({ error: 'Failed to create reply' });
  }
});

/**
 * GET /api/reviews/:id/replies
 * Get all replies for a review
 */
router.get('/:id/replies', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [replies] = await db.query(`
      SELECT 
        rr.*,
        u.username as user_username,
        up.first_name as user_first_name,
        up.last_name as user_last_name
      FROM review_replies rr
      LEFT JOIN users u ON rr.user_id = u.id
      LEFT JOIN user_profiles up ON rr.user_id = up.user_id
      WHERE rr.review_id = ?
      ORDER BY rr.created_at ASC
    `, [id]);
    
    res.json(replies);
  } catch (error) {
    console.error('Error fetching replies:', error);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

/**
 * POST /api/reviews/:id/helpful
 * Vote on review helpfulness
 */
router.post('/:id/helpful', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { vote } = req.body; // 'helpful' or 'not_helpful'
    
    if (!vote || !['helpful', 'not_helpful'].includes(vote)) {
      return res.status(400).json({ error: 'vote must be "helpful" or "not_helpful"' });
    }
    
    // Check if review exists
    const [review] = await db.query('SELECT id FROM reviews WHERE id = ?', [id]);
    if (review.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    // Check if user already voted
    const [existing] = await db.query(`
      SELECT vote FROM review_helpfulness WHERE review_id = ? AND user_id = ?
    `, [id, req.userId]);
    
    if (existing.length > 0) {
      const oldVote = existing[0].vote;
      
      // If same vote, remove it (toggle)
      if (oldVote === vote) {
        await db.query(`
          DELETE FROM review_helpfulness WHERE review_id = ? AND user_id = ?
        `, [id, req.userId]);
        
        // Update count
        const field = vote === 'helpful' ? 'helpful_count' : 'not_helpful_count';
        await db.query(`
          UPDATE reviews SET ${field} = ${field} - 1 WHERE id = ?
        `, [id]);
        
        return res.json({ message: 'Vote removed', current_vote: null });
      }
      
      // Otherwise, update vote
      await db.query(`
        UPDATE review_helpfulness SET vote = ? WHERE review_id = ? AND user_id = ?
      `, [vote, id, req.userId]);
      
      // Update counts
      if (oldVote === 'helpful') {
        await db.query(`
          UPDATE reviews SET helpful_count = helpful_count - 1, not_helpful_count = not_helpful_count + 1 WHERE id = ?
        `, [id]);
      } else {
        await db.query(`
          UPDATE reviews SET helpful_count = helpful_count + 1, not_helpful_count = not_helpful_count - 1 WHERE id = ?
        `, [id]);
      }
      
      return res.json({ message: 'Vote updated', current_vote: vote });
    }
    
    // Create new vote
    await db.query(`
      INSERT INTO review_helpfulness (review_id, user_id, vote)
      VALUES (?, ?, ?)
    `, [id, req.userId, vote]);
    
    // Update count
    const field = vote === 'helpful' ? 'helpful_count' : 'not_helpful_count';
    await db.query(`
      UPDATE reviews SET ${field} = ${field} + 1 WHERE id = ?
    `, [id]);
    
    res.json({ message: 'Vote recorded', current_vote: vote });
  } catch (error) {
    console.error('Error recording vote:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

/**
 * POST /api/reviews/:id/flag
 * Flag a review for moderation
 */
router.post('/:id/flag', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Check if review exists
    const [review] = await db.query('SELECT id FROM reviews WHERE id = ?', [id]);
    if (review.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    // Check if user already flagged this review
    const [existing] = await db.query(`
      SELECT id FROM review_flags WHERE review_id = ? AND flagger_id = ? AND status = 'pending'
    `, [id, req.userId]);
    
    if (existing.length > 0) {
      return res.status(409).json({ error: 'You have already flagged this review' });
    }
    
    // Create flag
    await db.query(`
      INSERT INTO review_flags (review_id, flagger_id, reason, status)
      VALUES (?, ?, ?, 'pending')
    `, [id, req.userId, reason || 'No reason provided']);
    
    res.json({ message: 'Review flagged for moderation' });
  } catch (error) {
    console.error('Error flagging review:', error);
    res.status(500).json({ error: 'Failed to flag review' });
  }
});

/**
 * GET /api/reviews/admin/flags
 * Get all flagged reviews (admin only)
 */
router.get('/admin/flags', verifyToken, requirePermission('admin'), async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    
    const [flags] = await db.query(`
      SELECT 
        rf.*,
        r.title as review_title,
        r.review_text,
        r.rating,
        r.reviewable_type,
        r.reviewable_id,
        flagger.username as flagger_username,
        reviewer.username as reviewer_username
      FROM review_flags rf
      JOIN reviews r ON rf.review_id = r.id
      LEFT JOIN users flagger ON rf.flagger_id = flagger.id
      LEFT JOIN users reviewer ON r.reviewer_id = reviewer.id
      WHERE rf.status = ?
      ORDER BY rf.created_at DESC
    `, [status]);
    
    res.json(flags);
  } catch (error) {
    console.error('Error fetching flags:', error);
    res.status(500).json({ error: 'Failed to fetch flags' });
  }
});

/**
 * PATCH /api/reviews/:id/moderate
 * Moderate a review - hide/show (admin only)
 */
router.patch('/:id/moderate', verifyToken, requirePermission('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, admin_notes } = req.body; // action: 'hide' or 'show'
    
    if (!action || !['hide', 'show'].includes(action)) {
      return res.status(400).json({ error: 'action must be "hide" or "show"' });
    }
    
    const newStatus = action === 'hide' ? 'hidden' : 'active';
    
    await db.query(`
      UPDATE reviews SET status = ? WHERE id = ?
    `, [newStatus, id]);
    
    // Resolve any pending flags
    await db.query(`
      UPDATE review_flags 
      SET status = 'resolved', resolved_by = ?, resolved_at = NOW(), admin_notes = ?
      WHERE review_id = ? AND status = 'pending'
    `, [req.userId, admin_notes || null, id]);
    
    res.json({ message: `Review ${action === 'hide' ? 'hidden' : 'shown'} successfully` });
  } catch (error) {
    console.error('Error moderating review:', error);
    res.status(500).json({ error: 'Failed to moderate review' });
  }
});

/**
 * POST /api/reviews/admin/pending
 * Manually enter a pending review (admin only)
 * For collecting artist reviews via email before they have an account
 */
router.post('/admin/pending', verifyToken, requirePermission('admin'), async (req, res) => {
  try {
    const {
      event_id,
      reviewer_email,
      reviewer_type, // 'artist' or 'community'
      rating,
      title,
      review_text,
      verified_transaction = false
    } = req.body;
    
    // Validation
    if (!event_id || !reviewer_email || !reviewer_type || !rating || !title || !review_text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!['artist', 'community'].includes(reviewer_type)) {
      return res.status(400).json({ error: 'reviewer_type must be "artist" or "community"' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    // Check if event exists
    const [events] = await db.query('SELECT id FROM events WHERE id = ?', [event_id]);
    if (events.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Check if user with this email already exists
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER(?)',
      [reviewer_email]
    );
    
    if (existingUsers.length > 0) {
      // User exists - try to associate review using matchPendingReviews logic
      const userId = existingUsers[0].id;
      
      // Check if user already reviewed this event (only count active reviews)
      const [existingReview] = await db.query(`
        SELECT id FROM reviews 
        WHERE reviewer_id = ? 
          AND reviewable_type = 'event' 
          AND reviewable_id = ?
          AND status = 'active'
      `, [userId, event_id]);
      
      if (existingReview.length > 0) {
        return res.status(409).json({ error: 'User has already reviewed this event' });
      }
      
      // Get series sequence for weight calculation
      const [seriesData] = await db.query(`
        SELECT se.sequence_number, e.series_id
        FROM events e
        LEFT JOIN series_events se ON e.id = se.event_id
        WHERE e.id = ?
      `, [event_id]);
      
      let seriesSequence = null;
      let weightFactor = 1.0;
      
      if (seriesData.length > 0 && seriesData[0].series_id) {
        const [currentSequence] = await db.query(`
          SELECT MAX(se.sequence_number) as max_seq
          FROM series_events se
          JOIN events e ON se.event_id = e.id
          WHERE e.series_id = ?
        `, [seriesData[0].series_id]);
        
        const currentSeq = currentSequence[0].max_seq || 0;
        const reviewSeq = seriesData[0].sequence_number || 0;
        seriesSequence = reviewSeq - currentSeq;
        
        const calculatedWeight = calculateEventReviewWeight(seriesSequence);
        if (calculatedWeight === null) {
          return res.status(403).json({ error: 'This event is too old to accept new reviews' });
        }
        weightFactor = calculatedWeight;
      }
      
      // Create review directly
      const [result] = await db.query(`
        INSERT INTO reviews (
          reviewable_type, reviewable_id, reviewer_id, rating, title, review_text,
          display_as_anonymous, verified_transaction, reviewer_type, series_sequence,
          weight_factor, status
        ) VALUES ('event', ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'active')
      `, [event_id, userId, rating, title, review_text, verified_transaction, reviewer_type, seriesSequence, weightFactor]);
      
      return res.status(201).json({ 
        success: true, 
        review_id: result.insertId,
        associated_immediately: true,
        message: 'Review created and associated with existing user account'
      });
    }
    
    // User doesn't exist - create pending review
    const [result] = await db.query(`
      INSERT INTO pending_reviews (
        event_id, reviewer_email, reviewer_type, rating, title, review_text,
        verified_transaction, created_by_admin_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [event_id, reviewer_email, reviewer_type, rating, title, review_text, verified_transaction, req.userId]);
    
    res.status(201).json({ 
      success: true, 
      pending_review_id: result.insertId,
      message: 'Pending review created. Will be associated when user creates account.'
    });
  } catch (error) {
    console.error('Error creating pending review:', error);
    res.status(500).json({ error: 'Failed to create pending review' });
  }
});

/**
 * GET /api/reviews/admin/pending
 * Get all pending reviews (admin only)
 */
router.get('/admin/pending', verifyToken, requirePermission('admin'), async (req, res) => {
  try {
    const [pendingReviews] = await db.query(`
      SELECT 
        pr.*,
        e.title as event_title,
        e.start_date as event_date,
        admin.username as admin_username
      FROM pending_reviews pr
      JOIN events e ON pr.event_id = e.id
      LEFT JOIN users admin ON pr.created_by_admin_id = admin.id
      WHERE pr.associated_user_id IS NULL
      ORDER BY pr.created_at DESC
    `);
    
    res.json(pendingReviews);
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    res.status(500).json({ error: 'Failed to fetch pending reviews' });
  }
});

module.exports = router;

