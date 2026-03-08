/**
 * Commerce Module - Wholesale Applications Routes (v2)
 * Admin management and customer submission of wholesale applications.
 * Mounted at /api/v2/commerce/wholesale
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const { requireAuth, requirePermission } = require('../auth');
const wholesaleService = require('./services/wholesale');

// Admin routes require manage_system permission
const adminAuth = [requireAuth, requirePermission('manage_system')];

// Customer routes just require authentication
const customerAuth = [requireAuth];

// ==================== ADMIN ROUTES ====================

/**
 * GET /api/v2/commerce/wholesale/applications
 * Get wholesale applications (admin)
 */
router.get('/applications', ...adminAuth, async (req, res) => {
  try {
    const { status } = req.query;
    const applications = await wholesaleService.listApplications({ status });
    res.json({ success: true, applications });
  } catch (error) {
    console.error('Error fetching wholesale applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

/**
 * GET /api/v2/commerce/wholesale/applications/:id
 * Get single wholesale application (admin)
 */
router.get('/applications/:id', ...adminAuth, async (req, res) => {
  try {
    const application = await wholesaleService.getApplication(req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    res.json({ success: true, application });
  } catch (error) {
    console.error('Error fetching wholesale application:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

/**
 * GET /api/v2/commerce/wholesale/stats
 * Get wholesale application statistics (admin)
 */
router.get('/stats', ...adminAuth, async (req, res) => {
  try {
    const stats = await wholesaleService.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching wholesale stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * PUT /api/v2/commerce/wholesale/applications/:id/approve
 * Approve wholesale application (admin)
 */
router.put('/applications/:id/approve', ...adminAuth, async (req, res) => {
  try {
    const { admin_notes } = req.body;
    await wholesaleService.approveApplication(req.params.id, req.userId, admin_notes);
    res.json({ success: true, message: 'Application approved successfully' });
  } catch (error) {
    console.error('Error approving wholesale application:', error);
    res.status(500).json({ error: error.message || 'Failed to approve application' });
  }
});

/**
 * PUT /api/v2/commerce/wholesale/applications/:id/deny
 * Deny wholesale application (admin)
 */
router.put('/applications/:id/deny', ...adminAuth, async (req, res) => {
  try {
    const { admin_notes, denial_reason, reapplication_policy } = req.body;
    await wholesaleService.denyApplication(req.params.id, req.userId, admin_notes, denial_reason, reapplication_policy);
    res.json({ success: true, message: 'Application denied successfully' });
  } catch (error) {
    console.error('Error denying wholesale application:', error);
    if (error.message === 'Denial reason is required') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to deny application' });
  }
});

// ==================== CUSTOMER ROUTES ====================

/**
 * POST /api/v2/commerce/wholesale/apply
 * Submit wholesale application (customer)
 */
router.post('/apply', ...customerAuth, async (req, res) => {
  try {
    const result = await wholesaleService.submitApplication(req.userId, req.body);
    res.json({ 
      success: true, 
      message: 'Wholesale application submitted successfully',
      application_id: result.application_id
    });
  } catch (error) {
    console.error('Error submitting wholesale application:', error);
    if (error.message.includes('required') || error.message.includes('already have') || error.message.includes('reapply') || error.message.includes('Reapplication')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

/**
 * GET /api/v2/commerce/wholesale/my-status
 * Get current user's application status (customer)
 */
router.get('/my-status', ...customerAuth, async (req, res) => {
  try {
    const application = await wholesaleService.getUserApplicationStatus(req.userId);
    res.json({ success: true, application });
  } catch (error) {
    console.error('Error fetching application status:', error);
    res.status(500).json({ error: 'Failed to fetch application status' });
  }
});

module.exports = router;
