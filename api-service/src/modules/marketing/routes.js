/**
 * Marketing Module Routes
 * /api/v2/marketing
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/jwt');
const { requirePermission } = require('../../middleware/permissions');
const { generalRateLimiter } = require('../../middleware/rateLimiter');
const upload = require('../../config/multer');
const contentService = require('./services/content');
const db = require('../../../config/db');

// ============================================================================
// NEWSLETTER SUBSCRIPTION
// ============================================================================

/**
 * Subscribe to newsletter via ActiveCampaign
 * POST /api/v2/marketing/newsletter/subscribe
 * @public - No auth required
 */
router.post('/newsletter/subscribe', generalRateLimiter, async (req, res) => {
  const { email } = req.body;

  // Validate email
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
  }

  // Check for required environment variables
  const apiUrl = process.env.ACTIVECAMPAIGN_API_URL;
  const apiKey = process.env.ACTIVECAMPAIGN_API_KEY;
  const listIds = process.env.ACTIVECAMPAIGN_LIST_IDS; // Comma-separated list IDs

  if (!apiUrl || !apiKey || !listIds) {
    console.error('ActiveCampaign not configured');
    return res.status(500).json({ success: false, message: 'Email service not configured' });
  }

  // Parse list IDs
  const lists = listIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

  try {
    // Step 1: Create or update contact in ActiveCampaign
    const contactResponse = await fetch(`${apiUrl}/api/3/contacts`, {
      method: 'POST',
      headers: {
        'Api-Token': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contact: {
          email: email.toLowerCase().trim(),
        },
      }),
    });

    let contactData;
    
    if (contactResponse.status === 422) {
      // Contact already exists - look them up
      const searchResponse = await fetch(
        `${apiUrl}/api/3/contacts?email=${encodeURIComponent(email.toLowerCase().trim())}`,
        {
          headers: { 'Api-Token': apiKey },
        }
      );
      const searchData = await searchResponse.json();
      
      if (searchData.contacts && searchData.contacts.length > 0) {
        contactData = { contact: searchData.contacts[0] };
      } else {
        return res.status(500).json({ success: false, message: 'Unable to process subscription' });
      }
    } else if (!contactResponse.ok) {
      return res.status(500).json({ success: false, message: 'Unable to process subscription' });
    } else {
      contactData = await contactResponse.json();
    }

    const contactId = contactData.contact?.id;
    
    if (!contactId) {
      return res.status(500).json({ success: false, message: 'Unable to process subscription' });
    }

    // Step 2: Add contact to all specified lists
    for (const listId of lists) {
      await fetch(`${apiUrl}/api/3/contactLists`, {
        method: 'POST',
        headers: {
          'Api-Token': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactList: {
            list: listId,
            contact: parseInt(contactId, 10),
            status: 1, // 1 = subscribed
          },
        }),
      });
      // Ignore errors for individual lists (contact may already be subscribed)
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Successfully subscribed!' 
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return res.status(500).json({ success: false, message: 'Network error. Please try again.' });
  }
});

// ============================================================================
// USER INFO & CONTENT SUBMISSIONS
// ============================================================================

/**
 * Get current user's profile info for form prefill
 * GET /api/v2/marketing/user-info
 */
router.get('/user-info', verifyToken, async (req, res) => {
  try {
    const [users] = await db.execute(
      `SELECT u.id, u.username as email, u.user_type,
              up.first_name, up.last_name,
              ap.business_name as artist_business_name,
              pp.business_name as promoter_business_name
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       LEFT JOIN artist_profiles ap ON u.id = ap.user_id
       LEFT JOIN promoter_profiles pp ON u.id = pp.user_id
       WHERE u.id = ?`,
      [req.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    const businessName = user.artist_business_name || user.promoter_business_name || null;

    res.json({
      success: true,
      data: {
        user_id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        business_name: businessName
      }
    });
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

/**
 * Submit marketing content
 * POST /api/v2/marketing/submit
 */
router.post('/submit', verifyToken, upload.array('marketing_media', 5), async (req, res) => {
  try {
    const { description, consent_given } = req.body;
    
    // Consent is required
    if (consent_given !== 'true' && consent_given !== true) {
      return res.status(400).json({ error: 'Consent is required to submit content' });
    }

    // Must have at least one file
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'At least one file is required' });
    }

    // Get user info
    const [users] = await db.execute(
      `SELECT u.username as email, up.first_name, up.last_name,
              ap.business_name as artist_business_name,
              pp.business_name as promoter_business_name
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       LEFT JOIN artist_profiles ap ON u.id = ap.user_id
       LEFT JOIN promoter_profiles pp ON u.id = pp.user_id
       WHERE u.id = ?`,
      [req.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    const businessName = user.artist_business_name || user.promoter_business_name || null;

    // Get client IP
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                      req.connection?.remoteAddress || 
                      req.ip || 
                      'unknown';

    // Create submission
    const submissionId = await contentService.createSubmission({
      userId: req.userId,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      businessName,
      ipAddress,
      description: description || '',
      consentGiven: true
    });

    // Add media files
    await contentService.addMediaToSubmission(submissionId, req.files);

    // Also add to pending_images for processing
    for (const file of req.files) {
      const imagePath = `/temp_images/marketing/${file.filename}`;
      await db.execute(
        `INSERT INTO pending_images (user_id, image_path, original_name, mime_type, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [req.userId, imagePath, file.originalname, file.mimetype]
      );
    }

    // Get the created submission
    const submission = await contentService.getSubmissionById(submissionId);

    res.json({
      success: true,
      message: 'Content submitted successfully',
      data: submission
    });
  } catch (error) {
    console.error('Error submitting marketing content:', error);
    res.status(500).json({ error: 'Failed to submit content' });
  }
});

/**
 * Get current user's submissions
 * GET /api/v2/marketing/my-submissions
 */
router.get('/my-submissions', verifyToken, async (req, res) => {
  try {
    const submissions = await contentService.getUserSubmissions(req.userId);
    
    res.json({
      success: true,
      data: submissions
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

/**
 * Get all submissions (admin only)
 * GET /api/v2/marketing/admin/submissions
 */
router.get('/admin/submissions', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status, user_id, limit, offset } = req.query;
    
    const submissions = await contentService.getAllSubmissions({
      status,
      userId: user_id,
      limit: limit || 50,
      offset: offset || 0
    });
    
    res.json({
      success: true,
      data: submissions
    });
  } catch (error) {
    console.error('Error fetching all submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

/**
 * Get single submission (admin only)
 * GET /api/v2/marketing/admin/submissions/:id
 */
router.get('/admin/submissions/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const submission = await contentService.getSubmissionById(req.params.id);
    
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    res.json({
      success: true,
      data: submission
    });
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

/**
 * Update admin notes (admin only)
 * PUT /api/v2/marketing/admin/submissions/:id/notes
 */
router.put('/admin/submissions/:id/notes', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { admin_notes } = req.body;
    
    await contentService.updateAdminNotes(req.params.id, admin_notes);
    
    res.json({
      success: true,
      message: 'Notes updated successfully'
    });
  } catch (error) {
    console.error('Error updating notes:', error);
    res.status(500).json({ error: 'Failed to update notes' });
  }
});

/**
 * Update submission status (admin only)
 * PUT /api/v2/marketing/admin/submissions/:id/status
 */
router.put('/admin/submissions/:id/status', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'reviewed', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    await contentService.updateStatus(req.params.id, status);
    
    res.json({
      success: true,
      message: 'Status updated successfully'
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/**
 * Delete submission (admin only)
 * DELETE /api/v2/marketing/admin/submissions/:id
 */
router.delete('/admin/submissions/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    await contentService.deleteSubmission(req.params.id);
    
    res.json({
      success: true,
      message: 'Submission deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting submission:', error);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

module.exports = router;
