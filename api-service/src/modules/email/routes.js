/**
 * Email Module Routes
 * /api/v2/email
 * 
 * Admin email management including templates, logs, and sending
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/jwt');
const { requirePermission } = require('../../middleware/permissions');
const { templates, logs } = require('./services');
const EmailService = require('../../services/emailService');

// Initialize email service
let emailService;
try {
  emailService = new EmailService();
} catch (err) {
  console.error('Failed to initialize EmailService:', err.message);
}

// ============================================================================
// STATS & OVERVIEW
// ============================================================================

/**
 * Get email system statistics
 * GET /api/v2/email/stats
 */
router.get('/stats', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const stats = await logs.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching email stats:', error);
    res.status(500).json({ error: 'Failed to fetch email stats' });
  }
});

/**
 * Get recent email activity
 * GET /api/v2/email/recent
 */
router.get('/recent', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const activity = await logs.getRecentActivity(parseInt(limit));
    res.json({ success: true, data: activity });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

// ============================================================================
// TEMPLATES
// ============================================================================

/**
 * Get all email templates
 * GET /api/v2/email/templates
 */
router.get('/templates', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const templateList = await templates.getAllTemplates();
    res.json({ success: true, data: templateList });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * Get single template
 * GET /api/v2/email/templates/:id
 */
router.get('/templates/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const template = await templates.getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Get template stats
    const stats = await templates.getTemplateStats(req.params.id);
    
    res.json({ success: true, data: { ...template, stats } });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

/**
 * Update template
 * PUT /api/v2/email/templates/:id
 */
router.put('/templates/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { name, subject_template, body_template, priority_level, is_transactional, layout_key } = req.body;
    
    const updated = await templates.updateTemplate(req.params.id, {
      name,
      subject_template,
      body_template,
      priority_level,
      is_transactional,
      layout_key
    });
    
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

/**
 * Create template
 * POST /api/v2/email/templates
 */
router.post('/templates', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const template = await templates.createTemplate(req.body);
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

/**
 * Delete template
 * DELETE /api/v2/email/templates/:id
 */
router.delete('/templates/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    await templates.deleteTemplate(req.params.id);
    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

/**
 * Get available layouts
 * GET /api/v2/email/layouts
 */
router.get('/layouts', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const layouts = await templates.getLayouts();
    res.json({ success: true, data: layouts });
  } catch (error) {
    console.error('Error fetching layouts:', error);
    res.status(500).json({ error: 'Failed to fetch layouts' });
  }
});

// ============================================================================
// LOGS
// ============================================================================

/**
 * Get email logs with search/filter
 * GET /api/v2/email/logs
 */
router.get('/logs', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { search, status, template_id, start_date, end_date, page, limit } = req.query;
    
    const result = await logs.getLogs({
      search,
      status,
      templateId: template_id,
      startDate: start_date,
      endDate: end_date,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50
    });
    
    res.json({ success: true, data: result.logs, pagination: result.pagination });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

/**
 * Get single log entry
 * GET /api/v2/email/logs/:id
 */
router.get('/logs/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const log = await logs.getLogById(req.params.id);
    if (!log) {
      return res.status(404).json({ error: 'Log entry not found' });
    }
    res.json({ success: true, data: log });
  } catch (error) {
    console.error('Error fetching log:', error);
    res.status(500).json({ error: 'Failed to fetch log' });
  }
});

// ============================================================================
// SENDING
// ============================================================================

/**
 * Send test/preview email
 * POST /api/v2/email/send-preview
 */
router.post('/send-preview', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { email, template_id, subject, body } = req.body;
    
    if (!emailService) {
      return res.status(500).json({ error: 'Email service not configured' });
    }
    
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    
    // If template_id provided, use template
    if (template_id) {
      const template = await templates.getTemplateById(template_id);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      // Use custom subject/body if provided, otherwise use template
      const finalSubject = subject || template.subject_template;
      const finalBody = body || template.body_template;
      
      // Send via SMTP directly (bypass user preferences for preview)
      const result = await emailService.sendSMTPEmail({
        to: email,
        subject: `[PREVIEW] ${finalSubject}`,
        html: await emailService.renderEmailWithLayout(finalBody, {}, template)
      });
      
      // Log the preview send
      await logs.createLogEntry({
        user_id: req.userId,
        email_address: email,
        template_id: template.id,
        subject: `[PREVIEW] ${finalSubject}`,
        status: 'sent'
      });
      
      return res.json({ success: true, message: 'Preview email sent', messageId: result.messageId });
    }
    
    // Send custom email without template
    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and body are required for custom email' });
    }
    
    const result = await emailService.sendSMTPEmail({
      to: email,
      subject: `[PREVIEW] ${subject}`,
      html: body
    });
    
    res.json({ success: true, message: 'Preview email sent', messageId: result.messageId });
    
  } catch (error) {
    console.error('Error sending preview:', error);
    res.status(500).json({ error: 'Failed to send preview email' });
  }
});

/**
 * Resend an email from logs
 * POST /api/v2/email/resend/:id
 */
router.post('/resend/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { email: overrideEmail } = req.body;
    
    if (!emailService) {
      return res.status(500).json({ error: 'Email service not configured' });
    }
    
    // Get original log entry
    const originalLog = await logs.getLogById(req.params.id);
    if (!originalLog) {
      return res.status(404).json({ error: 'Log entry not found' });
    }
    
    // Get the template
    const template = await templates.getTemplateById(originalLog.template_id);
    if (!template) {
      return res.status(404).json({ error: 'Original template not found' });
    }
    
    const targetEmail = overrideEmail || originalLog.email_address;
    
    // Resend the email
    const result = await emailService.sendSMTPEmail({
      to: targetEmail,
      subject: originalLog.subject,
      html: await emailService.renderEmailWithLayout(template.body_template, {}, template)
    });
    
    // Log the resend as a new entry
    const newLogId = await logs.createLogEntry({
      user_id: originalLog.user_id,
      email_address: targetEmail,
      template_id: originalLog.template_id,
      subject: `[RESEND] ${originalLog.subject}`,
      status: 'sent'
    });
    
    res.json({ 
      success: true, 
      message: 'Email resent successfully', 
      messageId: result.messageId,
      logId: newLogId
    });
    
  } catch (error) {
    console.error('Error resending email:', error);
    res.status(500).json({ error: 'Failed to resend email' });
  }
});

/**
 * Send test email using template key (for testing templates)
 * POST /api/v2/email/test
 */
router.post('/test', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { recipient, templateKey, testData = {} } = req.body;
    
    if (!emailService) {
      return res.status(500).json({ error: 'Email service not configured' });
    }
    
    if (!recipient || !templateKey) {
      return res.status(400).json({ error: 'Recipient and templateKey are required' });
    }
    
    // Check if recipient is email or user ID
    let targetEmail = recipient;
    let userId = null;
    
    if (/^\d+$/.test(recipient)) {
      // It's a user ID
      userId = parseInt(recipient);
      targetEmail = await emailService.getUserEmail(userId);
      if (!targetEmail) {
        return res.status(404).json({ error: 'User not found' });
      }
    }
    
    // Get template
    const template = await templates.getTemplateByKey(templateKey);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Render and send
    const renderedSubject = emailService.renderTemplate(template.subject_template, testData);
    const renderedBody = emailService.renderTemplate(template.body_template, testData);
    const finalBody = await emailService.renderEmailWithLayout(renderedBody, testData, template);
    
    const result = await emailService.sendSMTPEmail({
      to: targetEmail,
      subject: `[TEST] ${renderedSubject}`,
      html: finalBody
    });
    
    // Log the test send
    await logs.createLogEntry({
      user_id: userId || req.userId,
      email_address: targetEmail,
      template_id: template.id,
      subject: `[TEST] ${renderedSubject}`,
      status: 'sent'
    });
    
    res.json({ success: true, message: 'Test email sent', messageId: result.messageId });
    
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: error.message || 'Failed to send test email' });
  }
});

// ============================================================================
// QUEUE MANAGEMENT
// ============================================================================

/**
 * Get queue status
 * GET /api/v2/email/queue
 */
router.get('/queue', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const db = require('../../../../config/db');
    
    // Get queue stats
    const [stats] = await db.execute(
      `SELECT status, COUNT(*) as count FROM email_queue GROUP BY status`
    );
    
    // Get recent queue items
    const [recent] = await db.execute(
      `SELECT eq.*, u.username, et.name as template_name
       FROM email_queue eq
       LEFT JOIN users u ON eq.user_id = u.id
       LEFT JOIN email_templates et ON eq.template_id = et.id
       ORDER BY eq.created_at DESC
       LIMIT 20`
    );
    
    res.json({ success: true, data: { stats, recent } });
  } catch (error) {
    console.error('Error fetching queue:', error);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

/**
 * Process queue manually
 * POST /api/v2/email/queue/process
 */
router.post('/queue/process', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    if (!emailService) {
      return res.status(500).json({ error: 'Email service not configured' });
    }
    
    const result = await emailService.processQueue();
    res.json({ success: true, message: 'Queue processing initiated', result });
  } catch (error) {
    console.error('Error processing queue:', error);
    res.status(500).json({ error: 'Failed to process queue' });
  }
});

// ============================================================================
// BOUNCE MANAGEMENT
// ============================================================================

/**
 * Get bounce data
 * GET /api/v2/email/bounces
 */
router.get('/bounces', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const db = require('../../../../config/db');
    
    const [bounces] = await db.execute(
      `SELECT * FROM email_tracking 
       WHERE hard_bounces > 0 OR soft_bounces > 0
       ORDER BY last_bounce_at DESC`
    );
    
    res.json({ success: true, data: bounces });
  } catch (error) {
    console.error('Error fetching bounces:', error);
    res.status(500).json({ error: 'Failed to fetch bounces' });
  }
});

/**
 * Unblacklist a domain
 * POST /api/v2/email/bounces/unblacklist
 */
router.post('/bounces/unblacklist', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { domain } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }
    
    const db = require('../../../../config/db');
    
    await db.execute(
      `UPDATE email_tracking SET is_blacklisted = 0 WHERE domain = ?`,
      [domain]
    );
    
    res.json({ success: true, message: `Domain ${domain} removed from blacklist` });
  } catch (error) {
    console.error('Error unblacklisting domain:', error);
    res.status(500).json({ error: 'Failed to unblacklist domain' });
  }
});

module.exports = router;
