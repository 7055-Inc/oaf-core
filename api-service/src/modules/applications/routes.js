/**
 * Applications Module Routes - v2
 * RESTful API endpoints for artist event applications
 */

const express = require('express');
const router = express.Router();

// Auth middleware
const { requireAuth, requireRole } = require('../auth');

// Services
const applicationsService = require('./services');

// ============================================================================
// ADMIN: ALL APPLICATIONS (must be before /:id)
// ============================================================================

/**
 * GET /api/v2/applications/admin/all
 * Get all applications (admin only), with sort, search, filter, pagination
 */
router.get('/admin/all', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { status, search, sort, order, limit, offset } = req.query;
    const result = await applicationsService.getAllApplicationsAdmin({
      status,
      search,
      sort: sort || 'submitted_at',
      order: order || 'desc',
      limit: limit || 50,
      offset: offset || 0
    });
    res.json({
      success: true,
      data: result.applications,
      pagination: { total: result.total, limit: parseInt(limit, 10) || 50, offset: parseInt(offset, 10) || 0 }
    });
  } catch (error) {
    console.error('Error fetching admin applications:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * GET /api/v2/applications/admin/:id
 * Get single application full detail (admin only)
 */
router.get('/admin/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const application = await applicationsService.getApplicationByIdAdmin(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found' } });
    }
    res.json({ success: true, data: application });
  } catch (error) {
    console.error('Error fetching admin application detail:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ============================================================================
// ARTIST APPLICATIONS
// ============================================================================

/**
 * GET /api/v2/applications/mine
 * Get current user's applications (artist)
 */
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    const applications = await applicationsService.getArtistApplications(req.userId, { status });
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('Error fetching artist applications:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * GET /api/v2/applications/stats
 * Get application statistics for current user
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await applicationsService.getApplicationStats(req.userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching application stats:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * GET /api/v2/applications/:id
 * Get single application details
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const application = await applicationsService.getApplicationById(req.params.id, req.userId);
    if (!application) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found' } });
    }
    res.json({ success: true, data: application });
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/v2/applications/:id
 * Delete a draft application
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await applicationsService.deleteApplication(req.params.id, req.userId);
    res.json({ success: true, message: 'Application deleted' });
  } catch (error) {
    console.error('Error deleting application:', error);
    const status = error.message.includes('not found') ? 404 : 
                   error.message.includes('Only draft') ? 400 : 500;
    res.status(status).json({ success: false, error: { code: 'DELETE_FAILED', message: error.message } });
  }
});

module.exports = router;
