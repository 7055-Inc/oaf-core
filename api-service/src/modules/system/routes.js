/**
 * System Module Routes (v2)
 * 
 * @route /api/v2/system/*
 * 
 * Handles:
 * - Hero settings (text, videos, CTA)
 * - Announcements (CRUD, acknowledgments, stats)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const verifyToken = require('../../middleware/jwt');
const { requirePermission } = require('../../middleware/permissions');
const { heroService, announcementsService, termsService, policiesService } = require('./services');

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const tempDir = path.join(__dirname, '../../../temp_uploads');
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (err) {
      // Directory exists
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'), false);
    }
  }
});

// ============================================================
// HERO SETTINGS ROUTES
// ============================================================

/**
 * Get hero data
 * @route GET /api/v2/system/hero
 * @access Private (requires manage_system permission)
 */
router.get('/hero', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const heroData = await heroService.getHeroData();
    res.json(heroData);
  } catch (err) {
    console.error('Error getting hero data:', err);
    res.status(500).json({ error: 'Failed to get hero data' });
  }
});

/**
 * Save hero text data
 * @route PUT /api/v2/system/hero
 * @access Private (requires manage_system permission)
 */
router.put('/hero', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { h1Text, h3Text, buttonText, buttonUrl, videos } = req.body;

    // Validate required fields
    if (!h1Text || !h3Text || !buttonText || !buttonUrl) {
      return res.status(400).json({ error: 'All text fields are required' });
    }

    const savedData = await heroService.saveHeroData({
      h1Text,
      h3Text,
      buttonText,
      buttonUrl,
      videos
    });

    res.json({
      success: true,
      message: 'Hero data saved successfully',
      data: savedData
    });
  } catch (err) {
    console.error('Error saving hero data:', err);
    res.status(500).json({ error: 'Failed to save hero data' });
  }
});

/**
 * Upload hero videos
 * @route POST /api/v2/system/hero/videos
 * @access Private (requires manage_system permission)
 */
router.post('/hero/videos', verifyToken, requirePermission('manage_system'), upload.array('videos', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedVideos = await heroService.processVideoUploads(req.files);
    const updatedHero = await heroService.addVideos(uploadedVideos);

    res.json({
      success: true,
      videos: uploadedVideos,
      message: `Successfully uploaded ${uploadedVideos.length} video(s)`
    });
  } catch (err) {
    console.error('Error uploading videos:', err);
    res.status(500).json({ error: 'Failed to upload videos: ' + err.message });
  }
});

/**
 * Delete a hero video
 * @route DELETE /api/v2/system/hero/videos/:videoId
 * @access Private (requires manage_system permission)
 */
router.delete('/hero/videos/:videoId', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }

    const updatedHero = await heroService.deleteVideo(videoId);

    res.json({
      success: true,
      message: 'Video deleted successfully',
      remainingVideos: updatedHero.videos.length
    });
  } catch (err) {
    console.error('Error deleting video:', err);
    if (err.message === 'Video not found') {
      return res.status(404).json({ error: 'Video not found' });
    }
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

// ============================================================
// ANNOUNCEMENTS ROUTES
// ============================================================

/**
 * Check if user has pending announcements
 * @route GET /api/v2/system/announcements/check-pending
 * @access Private (requires authentication)
 */
router.get('/announcements/check-pending', verifyToken, async (req, res) => {
  try {
    const status = await announcementsService.checkPendingStatus(req.userId);
    res.json(status);
  } catch (err) {
    console.error('Error checking pending announcements:', err);
    res.status(500).json({ error: 'Failed to check pending announcements' });
  }
});

/**
 * Get pending announcements for current user
 * @route GET /api/v2/system/announcements/pending
 * @access Private (requires authentication)
 */
router.get('/announcements/pending', verifyToken, async (req, res) => {
  try {
    const announcements = await announcementsService.getPendingAnnouncements(req.userId);
    res.json(announcements);
  } catch (err) {
    console.error('Error getting pending announcements:', err);
    if (err.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to get pending announcements' });
  }
});

/**
 * Get all announcements (admin)
 * @route GET /api/v2/system/announcements
 * @access Private (requires manage_system permission)
 */
router.get('/announcements', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const announcements = await announcementsService.getAllAnnouncements();
    res.json(announcements);
  } catch (err) {
    console.error('Error fetching announcements:', err);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

/**
 * Create new announcement (admin)
 * @route POST /api/v2/system/announcements
 * @access Private (requires manage_system permission)
 */
router.post('/announcements', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const result = await announcementsService.createAnnouncement(req.body, req.userId);
    res.status(201).json(result);
  } catch (err) {
    console.error('Error creating announcement:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * Get announcement statistics (admin)
 * @route GET /api/v2/system/announcements/:id/stats
 * @access Private (requires manage_system permission)
 */
router.get('/announcements/:id/stats', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const stats = await announcementsService.getAnnouncementStats(req.params.id);
    res.json(stats);
  } catch (err) {
    console.error('Error getting announcement stats:', err);
    if (err.message === 'Announcement not found') {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.status(500).json({ error: 'Failed to get announcement statistics' });
  }
});

/**
 * Update announcement (admin)
 * @route PUT /api/v2/system/announcements/:id
 * @access Private (requires manage_system permission)
 */
router.put('/announcements/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const result = await announcementsService.updateAnnouncement(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    console.error('Error updating announcement:', err);
    if (err.message === 'Announcement not found') {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.status(400).json({ error: err.message });
  }
});

/**
 * Delete announcement (admin)
 * @route DELETE /api/v2/system/announcements/:id
 * @access Private (requires manage_system permission)
 */
router.delete('/announcements/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const result = await announcementsService.deleteAnnouncement(req.params.id);
    res.json(result);
  } catch (err) {
    console.error('Error deleting announcement:', err);
    if (err.message === 'Announcement not found') {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

/**
 * Acknowledge announcement
 * @route POST /api/v2/system/announcements/:id/acknowledge
 * @access Private (requires authentication)
 */
router.post('/announcements/:id/acknowledge', verifyToken, async (req, res) => {
  try {
    const clientInfo = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || ''
    };
    const result = await announcementsService.acknowledgeAnnouncement(req.params.id, req.userId, clientInfo);
    res.json(result);
  } catch (err) {
    console.error('Error acknowledging announcement:', err);
    if (err.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (err.message === 'Announcement not found or expired') {
      return res.status(404).json({ error: 'Announcement not found or expired' });
    }
    if (err.message === 'This announcement is not for your user type') {
      return res.status(403).json({ error: 'This announcement is not for your user type' });
    }
    res.status(500).json({ error: 'Failed to acknowledge announcement' });
  }
});

/**
 * Set reminder for announcement
 * @route POST /api/v2/system/announcements/:id/remind-later
 * @access Private (requires authentication)
 */
router.post('/announcements/:id/remind-later', verifyToken, async (req, res) => {
  try {
    const clientInfo = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || ''
    };
    const result = await announcementsService.setReminder(req.params.id, req.userId, clientInfo);
    res.json(result);
  } catch (err) {
    console.error('Error setting reminder:', err);
    if (err.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (err.message === 'Announcement not found or expired') {
      return res.status(404).json({ error: 'Announcement not found or expired' });
    }
    if (err.message === 'This announcement is not for your user type') {
      return res.status(403).json({ error: 'This announcement is not for your user type' });
    }
    res.status(500).json({ error: 'Failed to set reminder' });
  }
});

// ============================================================
// TERMS & CONDITIONS ROUTES
// ============================================================

/**
 * Get all terms versions (admin)
 * @route GET /api/v2/system/terms
 * @access Private (requires manage_system permission)
 */
router.get('/terms', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const terms = await termsService.getAllTerms();
    res.json({ success: true, data: terms });
  } catch (err) {
    console.error('Error fetching terms:', err);
    res.status(500).json({ error: 'Failed to fetch terms' });
  }
});

/**
 * Get terms statistics (admin)
 * @route GET /api/v2/system/terms/stats
 * @access Private (requires manage_system permission)
 */
router.get('/terms/stats', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const stats = await termsService.getTermsStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('Error fetching terms stats:', err);
    res.status(500).json({ error: 'Failed to fetch terms statistics' });
  }
});

/**
 * Get single terms version (admin)
 * @route GET /api/v2/system/terms/:id
 * @access Private (requires manage_system permission)
 */
router.get('/terms/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const terms = await termsService.getTermsById(req.params.id);
    if (!terms) {
      return res.status(404).json({ error: 'Terms version not found' });
    }
    res.json({ success: true, data: terms });
  } catch (err) {
    console.error('Error fetching terms:', err);
    res.status(500).json({ error: 'Failed to fetch terms' });
  }
});

/**
 * Create new terms version (admin)
 * @route POST /api/v2/system/terms
 * @access Private (requires manage_system permission)
 */
router.post('/terms', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { version, title, content, setCurrent, subscription_type } = req.body;
    
    if (!version || !title || !content) {
      return res.status(400).json({ error: 'Version, title, and content are required' });
    }
    
    const result = await termsService.createTerms(req.body, req.userId);
    res.json({ success: true, ...result, message: 'Terms version created successfully' });
  } catch (err) {
    console.error('Error creating terms:', err);
    res.status(500).json({ error: 'Failed to create terms' });
  }
});

/**
 * Update terms version (admin)
 * @route PUT /api/v2/system/terms/:id
 * @access Private (requires manage_system permission)
 */
router.put('/terms/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { version, title, content, setCurrent } = req.body;
    
    if (!version || !title || !content) {
      return res.status(400).json({ error: 'Version, title, and content are required' });
    }
    
    const result = await termsService.updateTerms(req.params.id, req.body);
    res.json({ success: true, message: 'Terms version updated successfully' });
  } catch (err) {
    console.error('Error updating terms:', err);
    if (err.message === 'Terms version not found') {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update terms' });
  }
});

/**
 * Set terms version as current (admin)
 * @route PUT /api/v2/system/terms/:id/set-current
 * @access Private (requires manage_system permission)
 */
router.put('/terms/:id/set-current', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const result = await termsService.setCurrentTerms(req.params.id);
    res.json({ success: true, message: 'Terms version set as current' });
  } catch (err) {
    console.error('Error setting current terms:', err);
    if (err.message === 'Terms version not found') {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to set current terms' });
  }
});

/**
 * Delete terms version (admin)
 * @route DELETE /api/v2/system/terms/:id
 * @access Private (requires manage_system permission)
 */
router.delete('/terms/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const result = await termsService.deleteTerms(req.params.id);
    res.json({ success: true, message: 'Terms version deleted successfully' });
  } catch (err) {
    console.error('Error deleting terms:', err);
    if (err.message === 'Terms version not found') {
      return res.status(404).json({ error: err.message });
    }
    if (err.message === 'Cannot delete current terms version') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to delete terms' });
  }
});

// ============================================================
// POLICIES ROUTES
// ============================================================

/**
 * Get policy types list
 * @route GET /api/v2/system/policies/types
 * @access Private (requires manage_system permission)
 */
router.get('/policies/types', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const types = policiesService.getPolicyTypes();
    res.json({ success: true, data: types });
  } catch (err) {
    console.error('Error fetching policy types:', err);
    res.status(500).json({ error: 'Failed to fetch policy types' });
  }
});

/**
 * Get all policies (admin)
 * @route GET /api/v2/system/policies
 * @access Private (requires manage_system permission)
 */
router.get('/policies', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const policies = await policiesService.getAllPolicies();
    res.json({ success: true, data: policies });
  } catch (err) {
    console.error('Error fetching policies:', err);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

/**
 * Get single policy by type (admin)
 * @route GET /api/v2/system/policies/:type
 * @access Private (requires manage_system permission)
 */
router.get('/policies/:type', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const policy = await policiesService.getPolicyByType(req.params.type);
    res.json({ success: true, data: policy });
  } catch (err) {
    console.error('Error fetching policy:', err);
    if (err.message === 'Invalid policy type') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to fetch policy' });
  }
});

/**
 * Update policy (admin)
 * @route PUT /api/v2/system/policies/:type
 * @access Private (requires manage_system permission)
 */
router.put('/policies/:type', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { policy_text } = req.body;
    
    if (!policy_text) {
      return res.status(400).json({ error: 'Policy text is required' });
    }
    
    const result = await policiesService.updatePolicy(req.params.type, policy_text, req.userId);
    res.json({ success: true, message: 'Policy updated successfully', ...result });
  } catch (err) {
    console.error('Error updating policy:', err);
    if (err.message === 'Invalid policy type') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update policy' });
  }
});

module.exports = router;
