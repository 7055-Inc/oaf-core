const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');
const EmailService = require('../services/emailService');

const emailService = new EmailService();

// ===== USER EMAIL MANAGEMENT ROUTES =====

// GET /emails/preferences - Get user's email preferences
router.get('/preferences', verifyToken, async (req, res) => {
  try {
    const [preferences] = await db.execute(
      'SELECT * FROM user_email_preferences WHERE user_id = ?',
      [req.userId]
    );

    if (preferences.length === 0) {
      // Return default preferences if none exist
      res.json({
        frequency: 'weekly',
        is_enabled: true,
        categories: 'all'
      });
    } else {
      res.json(preferences[0]);
    }
  } catch (err) {
    console.error('Error fetching email preferences:', err.message);
    res.status(500).json({ error: 'Failed to fetch email preferences' });
  }
});

// PUT /emails/preferences - Update user's email preferences
router.put('/preferences', verifyToken, async (req, res) => {
  try {
    const { frequency, is_enabled, categories } = req.body;
    
    // Validate frequency
    const validFrequencies = ['live', 'hourly', 'daily', 'weekly'];
    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({ error: 'Invalid frequency value' });
    }

    // Format categories for JSON column - ensure it's a JSON string
    let categoriesJson = categories;
    if (typeof categories === 'object' && categories !== null) {
      categoriesJson = JSON.stringify(categories);
    } else if (typeof categories === 'string') {
      // If it's already a string, make sure it's valid JSON
      try {
        JSON.parse(categories);
        categoriesJson = categories;
      } catch (e) {
        // If it's not valid JSON, treat it as a simple string value
        categoriesJson = JSON.stringify(categories);
      }
    }

    // Check if preferences exist and get old values for logging
    const [existingPrefs] = await db.execute(
      'SELECT id, frequency, is_enabled, categories FROM user_email_preferences WHERE user_id = ?',
      [req.userId]
    );

    let oldPreferences = {};
    if (existingPrefs.length > 0) {
      // Capture old preferences for logging
      oldPreferences = {
        frequency: existingPrefs[0].frequency,
        is_enabled: Boolean(existingPrefs[0].is_enabled),
        categories: existingPrefs[0].categories || {}
      };
      
      // Update existing preferences
      await db.execute(
        'UPDATE user_email_preferences SET frequency = ?, is_enabled = ?, categories = ? WHERE user_id = ?',
        [frequency, is_enabled, categoriesJson, req.userId]
      );
    } else {
      // Create new preferences
      await db.execute(
        'INSERT INTO user_email_preferences (user_id, frequency, is_enabled, categories) VALUES (?, ?, ?, ?)',
        [req.userId, frequency, is_enabled, categoriesJson]
      );
    }

    // Log the preference change
    const newPreferences = {
      frequency: frequency,
      is_enabled: is_enabled,
      categories: JSON.parse(categoriesJson)
    };
    
    await db.execute(
      'INSERT INTO user_email_preference_log (user_id, changed_by_user_id, changed_by_admin, old_preferences, new_preferences, change_reason) VALUES (?, ?, ?, ?, ?, ?)',
      [req.userId, req.userId, 0, JSON.stringify(oldPreferences), JSON.stringify(newPreferences), 'User preference update']
    );

    res.json({ message: 'Email preferences updated successfully' });
  } catch (err) {
    console.error('Error updating email preferences:', err.message);
    res.status(500).json({ error: 'Failed to update email preferences' });
  }
});

// GET /emails/log - Get user's email history
router.get('/log', verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const [emails] = await db.execute(`
      SELECT 
        el.*,
        et.name as template_name
      FROM email_log el
      LEFT JOIN email_templates et ON el.template_id = et.id
      WHERE el.user_id = ?
      ORDER BY el.sent_at DESC
      LIMIT ? OFFSET ?
    `, [req.userId, limit, offset]);

    res.json(emails);
  } catch (err) {
    console.error('Error fetching email log:', err.message);
    res.status(500).json({ error: 'Failed to fetch email history' });
  }
});

// GET /emails/bounce-status - Check user's bounce status
router.get('/bounce-status', verifyToken, async (req, res) => {
  try {
    const [user] = await db.execute('SELECT username FROM users WHERE id = ?', [req.userId]);
    
    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userEmail = user[0].username;

    // Check bounce tracking for this specific user's email address
    const [bounceData] = await db.execute(
      'SELECT * FROM bounce_tracking WHERE email_address = ?',
      [userEmail]
    );

    if (bounceData.length === 0) {
      // No bounce data means email is active
      res.json({
        is_blacklisted: false,
        hard_bounces: 0,
        soft_bounces: 0,
        last_bounce_at: null,
        bounce_count: 0,
        bounce_type: null
      });
    } else {
      const bounce = bounceData[0];
      res.json({
        is_blacklisted: bounce.is_blacklisted,
        hard_bounces: bounce.bounce_type === 'hard' ? bounce.bounce_count : 0,
        soft_bounces: bounce.bounce_type === 'soft' ? bounce.bounce_count : 0,
        last_bounce_at: bounce.last_bounce_date,
        bounce_count: bounce.bounce_count,
        bounce_type: bounce.bounce_type,
        last_error: bounce.last_error
      });
    }
  } catch (err) {
    console.error('Error checking bounce status:', err.message);
    res.status(500).json({ error: 'Failed to check bounce status' });
  }
});

// POST /emails/reactivate - Reactivate email after bounces
router.post('/reactivate', verifyToken, async (req, res) => {
  try {
    const [user] = await db.execute('SELECT username FROM users WHERE id = ?', [req.userId]);
    
    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userEmail = user[0].username;

    // Remove this specific email from blacklist
    await db.execute(
      'UPDATE bounce_tracking SET is_blacklisted = FALSE, bounce_count = 0 WHERE email_address = ?',
      [userEmail]
    );

    // Log the reactivation request
    await db.execute(
      'INSERT INTO email_log (user_id, email_address, template_id, subject, status) VALUES (?, ?, NULL, ?, ?)',
      [req.userId, userEmail, 'Email Reactivation Request', 'sent']
    );

    res.json({ message: 'Email reactivation request processed successfully' });
  } catch (err) {
    console.error('Error processing reactivation request:', err.message);
    res.status(500).json({ error: 'Failed to process reactivation request' });
  }
});

// POST /emails/send - Send email immediately (internal use)
router.post('/send', verifyToken, async (req, res) => {
  try {
    const { templateKey, templateData } = req.body;
    
    if (!templateKey) {
      return res.status(400).json({ error: 'Template key is required' });
    }

    const result = await emailService.sendEmail(req.userId, templateKey, templateData || {});
    
    if (result.success) {
      res.json({ 
        message: 'Email sent successfully',
        emailId: result.emailId
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send email',
        details: result.error
      });
    }
  } catch (err) {
    console.error('Error sending email:', err.message);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// POST /emails/queue - Queue email for later sending
router.post('/queue', verifyToken, async (req, res) => {
  try {
    const { templateKey, templateData, scheduledFor, priority } = req.body;
    
    if (!templateKey) {
      return res.status(400).json({ error: 'Template key is required' });
    }

    // Use EmailService like the admin endpoint does
    const result = await emailService.queueEmail(req.userId, templateKey, templateData || {}, { priority });

    if (result.success) {
      res.json({ 
        message: 'Email queued successfully',
        queueId: result.queueId
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to queue email',
        details: result.error
      });
    }
  } catch (err) {
    console.error('Error queueing email:', err.message);
    res.status(500).json({ error: 'Failed to queue email' });
  }
});

// GET /emails/preferences/history - Get preference change history
router.get('/preferences/history', verifyToken, async (req, res) => {
  try {
    const [history] = await db.execute(
      'SELECT * FROM user_email_preference_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.userId]
    );

    res.json(history);
  } catch (err) {
    console.error('Error fetching preference history:', err.message);
    res.status(500).json({ error: 'Failed to fetch preference history' });
  }
});

// GET /emails/log/:id - Get specific email details
router.get('/log/:id', verifyToken, async (req, res) => {
  try {
    const emailId = parseInt(req.params.id);
    
    const [email] = await db.execute(`
      SELECT 
        el.*,
        et.name as template_name,
        et.template_key
      FROM email_log el
      LEFT JOIN email_templates et ON el.template_id = et.id
      WHERE el.id = ? AND el.user_id = ?
    `, [emailId, req.userId]);

    if (email.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    res.json(email[0]);
  } catch (err) {
    console.error('Error fetching email details:', err.message);
    res.status(500).json({ error: 'Failed to fetch email details' });
  }
});

module.exports = router; 