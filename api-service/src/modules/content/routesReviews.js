const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const { requireAuth, requirePermission } = require('../auth/middleware');
const {
  getReviewSummary,
  canUserReview,
  hasVerifiedTransaction,
  getEventReviewSummaryByType,
  calculateEventReviewWeight,
  validateEventReviewToken,
  checkEventReviewWindow
} = require('../../utils/reviewHelpers');

router.get('/', async (req, res) => {
  try {
    const { type, id, reviewer_id, limit = 20, offset = 0, sort = 'recent' } = req.query;

    let query = `
      SELECT r.*, u.username as reviewer_username,
             up.first_name as reviewer_first_name, up.last_name as reviewer_last_name,
             (SELECT COUNT(*) FROM review_replies WHERE review_id = r.id) as reply_count
      FROM reviews r
      LEFT JOIN users u ON r.reviewer_id = u.id
      LEFT JOIN user_profiles up ON r.reviewer_id = up.user_id
      WHERE r.status = 'active'
    `;
    const params = [];

    if (type && id) {
      query += ' AND r.reviewable_type = ? AND r.reviewable_id = ?';
      params.push(type, id);
    }
    if (reviewer_id) {
      query += ' AND r.reviewer_id = ?';
      params.push(reviewer_id);
    }

    switch (sort) {
      case 'highest': query += ' ORDER BY r.rating DESC, r.created_at DESC'; break;
      case 'lowest': query += ' ORDER BY r.rating ASC, r.created_at DESC'; break;
      case 'helpful': query += ' ORDER BY r.helpful_count DESC, r.created_at DESC'; break;
      default: query += ' ORDER BY r.created_at DESC';
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [reviews] = await db.query(query, params);

    const sanitized = reviews.map(r => {
      if (r.display_as_anonymous) {
        return { ...r, reviewer_id: null, reviewer_username: 'Anonymous', reviewer_first_name: null, reviewer_last_name: null };
      }
      return r;
    });

    res.json({ success: true, data: sanitized });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 } });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const { type, id } = req.query;
    if (!type || !id) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'type and id are required', status: 400 } });
    }
    const summary = type === 'event' ? await getEventReviewSummaryByType(id) : await getReviewSummary(type, id);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching review summary:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 } });
  }
});

router.get('/check-eligibility', requireAuth, async (req, res) => {
  try {
    const { type, id } = req.query;
    if (!type || !id) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'type and id are required', status: 400 } });
    }
    const eligibility = await canUserReview(req.userId, type, id);
    const hasVerified = await hasVerifiedTransaction(req.userId, type, id);
    res.json({ success: true, data: { ...eligibility, can_verify: hasVerified } });
  } catch (error) {
    console.error('Error checking eligibility:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 } });
  }
});

router.get('/event-token/:eventId', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const [events] = await db.query('SELECT promoter_id FROM events WHERE id = ?', [eventId]);
    if (events.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found', status: 404 } });
    }
    if (events[0].promoter_id !== req.userId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only the event promoter can access this token', status: 403 } });
    }
    const [tokens] = await db.query('SELECT token, valid_from, valid_until FROM event_review_tokens WHERE event_id = ?', [eventId]);
    if (tokens.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Token not found for this event', status: 404 } });
    }
    const token = tokens[0];
    const baseUrl = process.env.FRONTEND_URL || 'https://brakebee.com';
    res.json({ success: true, data: { token: token.token, url: `${baseUrl}/events/${eventId}?token=${token.token}`, valid_from: token.valid_from, valid_until: token.valid_until } });
  } catch (error) {
    console.error('Error fetching event token:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 } });
  }
});

router.post('/validate-token', requireAuth, async (req, res) => {
  try {
    const { token, eventId } = req.body;
    if (!token || !eventId) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'token and eventId are required', status: 400 } });
    }
    const validation = await validateEventReviewToken(token, eventId);
    if (!validation.valid) {
      return res.json({ success: true, data: { valid: false, reason: validation.reason } });
    }
    const [users] = await db.query('SELECT user_type FROM users WHERE id = ?', [req.userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found', status: 404 } });
    }
    if (users[0].user_type !== 'artist') {
      return res.json({ success: true, data: { valid: false, reason: 'This feature is only for registered artist users.' } });
    }
    const eligibility = await canUserReview(req.userId, 'event', eventId);
    if (!eligibility.canReview) {
      return res.json({ success: true, data: { valid: false, reason: eligibility.reason } });
    }
    res.json({ success: true, data: { valid: true, userType: users[0].user_type } });
  } catch (error) {
    console.error('Error validating token:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 } });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { reviewable_type, reviewable_id, rating, title, review_text, display_as_anonymous = false, token = null } = req.body;

    if (!reviewable_type || !reviewable_id || !rating || !title || !review_text) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Missing required fields', status: 400 } });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Rating must be between 1 and 5', status: 400 } });
    }

    const eligibility = await canUserReview(req.userId, reviewable_type, reviewable_id);
    if (!eligibility.canReview) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: eligibility.reason, status: 403 } });
    }

    const [users] = await db.query('SELECT user_type FROM users WHERE id = ?', [req.userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found', status: 404 } });
    }
    const userType = users[0].user_type;

    let reviewerType = null;
    let seriesSequence = null;
    let weightFactor = 1.0;

    if (reviewable_type === 'event') {
      const windowCheck = await checkEventReviewWindow(reviewable_id);
      if (!windowCheck.withinWindow) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: windowCheck.reason, status: 403 } });
      }

      if (token) {
        if (userType !== 'artist') {
          return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'This feature is only for registered artist users.', status: 403 } });
        }
        const validation = await validateEventReviewToken(token, reviewable_id);
        if (!validation.valid) {
          return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: validation.reason, status: 403 } });
        }
        reviewerType = 'artist';
      } else {
        if (userType === 'artist') {
          return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Artist users must use the review link provided by the event promoter.', status: 403 } });
        }
        reviewerType = 'community';
      }

      const [existingOtherType] = await db.query(
        `SELECT id FROM reviews WHERE reviewer_id = ? AND reviewable_type = 'event' AND reviewable_id = ? AND reviewer_type != ?`,
        [req.userId, reviewable_id, reviewerType]
      );
      if (existingOtherType.length > 0) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You have already reviewed this event as a different user type.', status: 403 } });
      }

      const [seriesData] = await db.query(
        `SELECT se.sequence_number, e.series_id FROM events e LEFT JOIN series_events se ON e.id = se.event_id WHERE e.id = ?`,
        [reviewable_id]
      );
      if (seriesData.length > 0 && seriesData[0].series_id) {
        const [currentSequence] = await db.query(
          `SELECT MAX(se.sequence_number) as max_seq FROM series_events se JOIN events e ON se.event_id = e.id WHERE e.series_id = ?`,
          [seriesData[0].series_id]
        );
        seriesSequence = (seriesData[0].sequence_number || 0) - (currentSequence[0].max_seq || 0);
        const calculatedWeight = calculateEventReviewWeight(seriesSequence);
        if (calculatedWeight === null) {
          return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'This event is too old to accept new reviews', status: 403 } });
        }
        weightFactor = calculatedWeight;
      }
    }

    const isVerified = await hasVerifiedTransaction(req.userId, reviewable_type, reviewable_id);

    const [result] = await db.query(`
      INSERT INTO reviews (reviewable_type, reviewable_id, reviewer_id, rating, title, review_text,
        display_as_anonymous, verified_transaction, reviewer_type, series_sequence, weight_factor, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `, [reviewable_type, reviewable_id, req.userId, rating, title, review_text, display_as_anonymous, isVerified, reviewerType, seriesSequence, weightFactor]);

    const [newReview] = await db.query('SELECT r.* FROM reviews r WHERE r.id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: newReview[0] });
  } catch (error) {
    console.error('Error creating review:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'You have already reviewed this item', status: 409 } });
    }
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 } });
  }
});

router.post('/:id/helpful', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { vote } = req.body;

    if (!vote || !['helpful', 'not_helpful'].includes(vote)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'vote must be "helpful" or "not_helpful"', status: 400 } });
    }

    const [review] = await db.query('SELECT id FROM reviews WHERE id = ?', [id]);
    if (review.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Review not found', status: 404 } });
    }

    const [existing] = await db.query('SELECT vote FROM review_helpfulness WHERE review_id = ? AND user_id = ?', [id, req.userId]);

    if (existing.length > 0) {
      const oldVote = existing[0].vote;
      if (oldVote === vote) {
        await db.query('DELETE FROM review_helpfulness WHERE review_id = ? AND user_id = ?', [id, req.userId]);
        const field = vote === 'helpful' ? 'helpful_count' : 'not_helpful_count';
        await db.query(`UPDATE reviews SET ${field} = ${field} - 1 WHERE id = ?`, [id]);
        return res.json({ success: true, data: { message: 'Vote removed', current_vote: null } });
      }
      await db.query('UPDATE review_helpfulness SET vote = ? WHERE review_id = ? AND user_id = ?', [vote, id, req.userId]);
      if (oldVote === 'helpful') {
        await db.query('UPDATE reviews SET helpful_count = helpful_count - 1, not_helpful_count = not_helpful_count + 1 WHERE id = ?', [id]);
      } else {
        await db.query('UPDATE reviews SET helpful_count = helpful_count + 1, not_helpful_count = not_helpful_count - 1 WHERE id = ?', [id]);
      }
      return res.json({ success: true, data: { message: 'Vote updated', current_vote: vote } });
    }

    await db.query('INSERT INTO review_helpfulness (review_id, user_id, vote) VALUES (?, ?, ?)', [id, req.userId, vote]);
    const field = vote === 'helpful' ? 'helpful_count' : 'not_helpful_count';
    await db.query(`UPDATE reviews SET ${field} = ${field} + 1 WHERE id = ?`, [id]);
    res.json({ success: true, data: { message: 'Vote recorded', current_vote: vote } });
  } catch (error) {
    console.error('Error recording vote:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 } });
  }
});

router.post('/admin/pending', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { event_id, reviewer_email, reviewer_type, rating, title, review_text, verified_transaction = false } = req.body;

    if (!event_id || !reviewer_email || !reviewer_type || !rating || !title || !review_text) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Missing required fields', status: 400 } });
    }
    if (!['artist', 'community'].includes(reviewer_type)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'reviewer_type must be "artist" or "community"', status: 400 } });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Rating must be between 1 and 5', status: 400 } });
    }

    const [events] = await db.query('SELECT id FROM events WHERE id = ?', [event_id]);
    if (events.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found', status: 404 } });
    }

    const [existingUsers] = await db.query('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [reviewer_email]);

    if (existingUsers.length > 0) {
      const userId = existingUsers[0].id;
      const [existingReview] = await db.query(
        `SELECT id FROM reviews WHERE reviewer_id = ? AND reviewable_type = 'event' AND reviewable_id = ? AND status = 'active'`,
        [userId, event_id]
      );
      if (existingReview.length > 0) {
        return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'User has already reviewed this event', status: 409 } });
      }

      let seriesSequence = null;
      let weightFactor = 1.0;
      const [seriesData] = await db.query(
        'SELECT se.sequence_number, e.series_id FROM events e LEFT JOIN series_events se ON e.id = se.event_id WHERE e.id = ?',
        [event_id]
      );
      if (seriesData.length > 0 && seriesData[0].series_id) {
        const [currentSequence] = await db.query(
          'SELECT MAX(se.sequence_number) as max_seq FROM series_events se JOIN events e ON se.event_id = e.id WHERE e.series_id = ?',
          [seriesData[0].series_id]
        );
        seriesSequence = (seriesData[0].sequence_number || 0) - (currentSequence[0].max_seq || 0);
        const calculatedWeight = calculateEventReviewWeight(seriesSequence);
        if (calculatedWeight !== null) weightFactor = calculatedWeight;
      }

      const [result] = await db.query(`
        INSERT INTO reviews (reviewable_type, reviewable_id, reviewer_id, rating, title, review_text,
          display_as_anonymous, verified_transaction, reviewer_type, series_sequence, weight_factor, status)
        VALUES ('event', ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'active')
      `, [event_id, userId, rating, title, review_text, verified_transaction, reviewer_type, seriesSequence, weightFactor]);

      return res.status(201).json({ success: true, data: { review_id: result.insertId, associated_immediately: true, message: 'Review created and associated with existing user account' } });
    }

    const [result] = await db.query(`
      INSERT INTO pending_reviews (event_id, reviewer_email, reviewer_type, rating, title, review_text, verified_transaction, created_by_admin_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [event_id, reviewer_email, reviewer_type, rating, title, review_text, verified_transaction, req.userId]);

    res.status(201).json({ success: true, data: { pending_review_id: result.insertId, message: 'Pending review created. Will be associated when user creates account.' } });
  } catch (error) {
    console.error('Error creating pending review:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 } });
  }
});

router.get('/admin/pending', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const [pendingReviews] = await db.query(`
      SELECT pr.*, e.title as event_title, e.start_date as event_date, admin.username as admin_username
      FROM pending_reviews pr
      JOIN events e ON pr.event_id = e.id
      LEFT JOIN users admin ON pr.created_by_admin_id = admin.id
      WHERE pr.associated_user_id IS NULL
      ORDER BY pr.created_at DESC
    `);
    res.json({ success: true, data: pendingReviews });
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 } });
  }
});

module.exports = router;
