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

const crypto = require('crypto');
const verifyToken = require('../../middleware/jwt');
const { requireAuth } = require('../auth/middleware');
const { requirePermission } = require('../../middleware/permissions');
const { heroService, announcementsService, termsService, policiesService } = require('./services');
const EmailService = require('../../services/emailService');

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
// ADMIN NOTIFICATIONS
// ============================================================

const db = require('../../../config/db');

/**
 * GET /api/v2/system/admin/notifications
 * Aggregated admin notification counts (pending items needing attention)
 */
router.get('/admin/notifications', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const [marketplaceApps] = await db.execute(
      `SELECT COUNT(*) as count FROM marketplace_applications WHERE marketplace_status = 'pending'`
    );
    const [wholesaleApps] = await db.execute(
      `SELECT COUNT(*) as count FROM wholesale_applications WHERE status = 'pending'`
    );
    const [pendingReturns] = await db.execute(
      `SELECT COUNT(*) as count FROM returns WHERE return_status = 'pending'`
    );
    const [openTickets] = await db.execute(
      `SELECT COUNT(*) as count FROM support_tickets WHERE status IN ('open', 'awaiting_support', 'escalated')`
    );
    const [unsortedProducts] = await db.execute(
      `SELECT COUNT(*) as count FROM products WHERE marketplace_enabled = TRUE AND marketplace_category = 'unsorted' AND status = 'active'`
    );

    res.json({
      success: true,
      data: {
        notifications: {
          marketplace_applications: marketplaceApps[0]?.count || 0,
          wholesale_applications: wholesaleApps[0]?.count || 0,
          pending_returns: pendingReturns[0]?.count || 0,
          open_tickets: openTickets[0]?.count || 0,
          unsorted_products: unsortedProducts[0]?.count || 0
        }
      }
    });
  } catch (err) {
    console.error('Error fetching admin notifications:', err.message);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch admin notifications', status: 500 }
    });
  }
});

// ============================================================
// ADMIN PROMOTIONS
// ============================================================

router.get('/admin/promotions/all', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const [promotions] = await db.execute('SELECT id, name, status, created_at FROM promotions ORDER BY created_at DESC');
    res.json({ success: true, data: { promotions } });
  } catch (error) {
    console.error('Error getting promotions:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get promotions', status: 500 } });
  }
});

router.post('/admin/promotions/create', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { name, description, admin_discount_percentage, suggested_vendor_discount,
      application_type, coupon_code, min_order_amount = 0, usage_limit_per_user = 1,
      total_usage_limit, valid_from, valid_until } = req.body;

    if (!name || !admin_discount_percentage || !suggested_vendor_discount || !application_type || !valid_from) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields', status: 400 } });
    }
    if (!['auto_apply', 'coupon_code'].includes(application_type)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid application type', status: 400 } });
    }
    if (application_type === 'coupon_code' && !coupon_code) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Coupon code required', status: 400 } });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
      if (coupon_code) {
        const [existing] = await connection.execute(
          'SELECT id FROM coupons WHERE code = ? UNION SELECT id FROM promotions WHERE coupon_code = ?', [coupon_code, coupon_code]);
        if (existing.length > 0) { await connection.rollback(); return res.status(400).json({ success: false, error: { code: 'DUPLICATE', message: 'Coupon code already exists', status: 400 } }); }
      }
      const [result] = await connection.execute(
        `INSERT INTO promotions (name, description, admin_discount_percentage, suggested_vendor_discount,
          application_type, coupon_code, min_order_amount, usage_limit_per_user,
          total_usage_limit, valid_from, valid_until, status, created_by_admin_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, NOW())`,
        [name, description, admin_discount_percentage, suggested_vendor_discount,
         application_type, coupon_code, min_order_amount, usage_limit_per_user,
         total_usage_limit, valid_from, valid_until, req.userId]);
      await connection.commit();
      res.json({ success: true, data: { promotion_id: result.insertId, message: 'Promotion created successfully' } });
    } catch (err) { await connection.rollback(); throw err; } finally { connection.release(); }
  } catch (error) {
    console.error('Error creating promotion:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create promotion', status: 500 } });
  }
});

router.put('/admin/promotions/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status, name, description, valid_until } = req.body;
    const [check] = await db.execute('SELECT id FROM promotions WHERE id = ?', [req.params.id]);
    if (check.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Promotion not found', status: 404 } });

    const updates = [], params = [];
    if (status !== undefined) {
      if (!['draft', 'inviting_vendors', 'active', 'paused', 'ended'].includes(status))
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid status', status: 400 } });
      updates.push('status = ?'); params.push(status);
    }
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (valid_until !== undefined) { updates.push('valid_until = ?'); params.push(valid_until); }
    if (updates.length === 0) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No fields to update', status: 400 } });

    updates.push('updated_at = NOW()'); params.push(req.params.id);
    await db.execute(`UPDATE promotions SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, data: { message: 'Promotion updated successfully' } });
  } catch (error) {
    console.error('Error updating promotion:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update promotion', status: 500 } });
  }
});

router.post('/admin/promotions/:id/invite-vendors', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { vendor_ids, product_selections, admin_message } = req.body;
    if (!vendor_ids || !Array.isArray(vendor_ids) || vendor_ids.length === 0)
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Vendor IDs required', status: 400 } });

    const [check] = await db.execute('SELECT id, status FROM promotions WHERE id = ?', [req.params.id]);
    if (check.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Promotion not found', status: 404 } });
    if (check[0].status !== 'draft' && check[0].status !== 'inviting_vendors')
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: 'Cannot invite in current status', status: 400 } });

    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
      for (const vendorId of vendor_ids) {
        const [existing] = await connection.execute('SELECT id FROM promotion_invitations WHERE promotion_id = ? AND vendor_id = ?', [req.params.id, vendorId]);
        if (existing.length === 0) {
          await connection.execute(
            `INSERT INTO promotion_invitations (promotion_id, vendor_id, invitation_status, admin_message, invited_at, expires_at)
             VALUES (?, ?, 'pending', ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY))`, [req.params.id, vendorId, admin_message]);
        }
      }
      if (product_selections) {
        for (const sel of product_selections) {
          if (sel.product_ids?.length > 0) {
            for (const pid of sel.product_ids) {
              await connection.execute(
                `INSERT INTO promotion_products (promotion_id, product_id, vendor_id, added_by, added_by_user_id, approval_status, admin_discount_percentage, vendor_discount_percentage, created_at)
                 VALUES (?, ?, ?, 'admin', ?, 'approved', ?, ?, NOW())`,
                [req.params.id, pid, sel.vendor_id, req.userId, sel.admin_discount_percentage, sel.vendor_discount_percentage]);
            }
          }
        }
      }
      await connection.execute("UPDATE promotions SET status = 'inviting_vendors', updated_at = NOW() WHERE id = ?", [req.params.id]);
      await connection.commit();
      res.json({ success: true, data: { message: `Invitations sent to ${vendor_ids.length} vendors` } });
    } catch (err) { await connection.rollback(); throw err; } finally { connection.release(); }
  } catch (error) {
    console.error('Error inviting vendors:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to invite vendors', status: 500 } });
  }
});

// ============================================================
// ADMIN PROMOTER ONBOARDING
// ============================================================

router.get('/admin/promoters/check-email', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email is required', status: 400 } });

    const [existing] = await db.execute('SELECT id, username, user_type, status FROM users WHERE username = ?', [email]);
    if (existing.length > 0) {
      return res.json({ success: true, data: { exists: true, user_id: existing[0].id, user_type: existing[0].user_type, status: existing[0].status } });
    }
    res.json({ success: true, data: { exists: false } });
  } catch (error) {
    console.error('Error checking email:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error', status: 500 } });
  }
});

router.post('/admin/promoters/create', verifyToken, requirePermission('manage_system'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const adminId = req.userId;
    const { promoter_email, promoter_first_name, promoter_last_name, promoter_business_name,
      event_title, event_start_date, event_end_date, venue_name, venue_address,
      venue_city, venue_state, venue_zip, event_description } = req.body;

    if (!promoter_email || !promoter_first_name || !promoter_last_name || !event_title || !event_start_date || !event_end_date) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields', status: 400 } });
    }

    const [existingUser] = await connection.execute('SELECT id FROM users WHERE username = ?', [promoter_email]);
    if (existingUser.length > 0) {
      await connection.rollback();
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'A user with this email already exists', status: 409, user_id: existingUser[0].id } });
    }

    const [userResult] = await connection.execute(
      `INSERT INTO users (username, user_type, status, email_verified, created_by_admin_id, email_confirmed) VALUES (?, 'promoter', 'draft', 'no', ?, 0)`,
      [promoter_email, adminId]);
    const userId = userResult.insertId;

    await connection.execute('INSERT INTO user_profiles (user_id, first_name, last_name) VALUES (?, ?, ?)', [userId, promoter_first_name, promoter_last_name]);
    await connection.execute('INSERT INTO promoter_profiles (user_id, business_name) VALUES (?, ?)', [userId, promoter_business_name || null]);
    await connection.execute('INSERT INTO user_permissions (user_id, events) VALUES (?, 1)', [userId]);

    const [eventResult] = await connection.execute(
      `INSERT INTO events (promoter_id, event_type_id, title, description, start_date, end_date,
        venue_name, venue_address, venue_city, venue_state, venue_zip,
        venue_country, event_status, claim_status, allow_applications, application_status,
        created_by, updated_by, created_by_admin_id)
       VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USA', 'draft', 'pending_claim', 0, 'not_accepting', ?, ?, ?)`,
      [userId, event_title, event_description || null, event_start_date, event_end_date,
       venue_name || null, venue_address || null, venue_city || null, venue_state || null, venue_zip || null,
       adminId, adminId, adminId]);
    const eventId = eventResult.insertId;

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6);
    await connection.execute(
      'INSERT INTO promoter_claim_tokens (user_id, event_id, token, promoter_email, expires_at, created_by_admin_id) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, eventId, token, promoter_email, expiresAt, adminId]);

    await connection.commit();

    try {
      const emailService = new EmailService();
      const claimUrl = `${process.env.FRONTEND_URL}/promoters/claim/${token}`;
      await emailService.sendExternalEmail(promoter_email, 'promoter_claim_invitation', {
        promoter_name: `${promoter_first_name} ${promoter_last_name}`, promoter_first_name, event_title,
        event_start_date: new Date(event_start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        event_end_date: new Date(event_end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        venue_name: venue_name || 'TBD', venue_city: venue_city || '', venue_state: venue_state || '',
        claim_url: claimUrl, expires_days: 180 });
    } catch (emailError) { console.error('Failed to send claim email:', emailError); }

    res.status(201).json({ success: true, data: { message: 'Promoter and event created successfully', user_id: userId, event_id: eventId, claim_token: token } });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating promoter:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error', status: 500 } });
  } finally { connection.release(); }
});

// ============================================================
// ADMIN SALES
// ============================================================

router.get('/admin/sales/all', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const [sales] = await db.execute("SELECT id, code, name, discount_type, discount_value, is_active, created_at FROM coupons WHERE coupon_type = 'site_sale' ORDER BY created_at DESC");
    res.json({ success: true, data: { sales } });
  } catch (error) {
    console.error('Error getting sales:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get sales', status: 500 } });
  }
});

router.post('/admin/sales/create-sitewide', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { name, description, discount_type, discount_value, application_type, coupon_code,
      min_order_amount = 0, usage_limit_per_user = 1, total_usage_limit, valid_from, valid_until, product_ids = [] } = req.body;

    if (!name || !discount_type || !discount_value || !application_type || !valid_from)
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields', status: 400 } });
    if (application_type === 'coupon_code' && !coupon_code)
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Coupon code required', status: 400 } });

    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
      if (coupon_code) {
        const [existing] = await connection.execute('SELECT id FROM coupons WHERE code = ? UNION SELECT id FROM promotions WHERE coupon_code = ?', [coupon_code, coupon_code]);
        if (existing.length > 0) { await connection.rollback(); return res.status(400).json({ success: false, error: { code: 'DUPLICATE', message: 'Coupon code already exists', status: 400 } }); }
      }
      const [result] = await connection.execute(
        `INSERT INTO coupons (code, name, description, coupon_type, created_by_admin_id, discount_type, discount_value, application_type, min_order_amount, usage_limit_per_user, total_usage_limit, valid_from, valid_until, is_active, created_at)
         VALUES (?, ?, ?, 'site_sale', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [coupon_code || `SALE_${Date.now()}`, name, description, req.userId, discount_type, discount_value, application_type, min_order_amount, usage_limit_per_user, total_usage_limit, valid_from, valid_until]);
      if (product_ids.length > 0) {
        for (const pid of product_ids) {
          const [pi] = await connection.execute('SELECT user_id as vendor_id FROM products WHERE id = ?', [pid]);
          if (pi.length > 0) await connection.execute('INSERT INTO coupon_products (coupon_id, product_id, vendor_id) VALUES (?, ?, ?)', [result.insertId, pid, pi[0].vendor_id]);
        }
      }
      await connection.commit();
      res.json({ success: true, data: { sale_id: result.insertId, message: 'Site-wide sale created successfully' } });
    } catch (err) { await connection.rollback(); throw err; } finally { connection.release(); }
  } catch (error) {
    console.error('Error creating site-wide sale:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create site-wide sale', status: 500 } });
  }
});

router.put('/admin/sales/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { is_active, name, description, discount_value, valid_until } = req.body;
    const [check] = await db.execute("SELECT id FROM coupons WHERE id = ? AND coupon_type = 'site_sale'", [req.params.id]);
    if (check.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Sale not found', status: 404 } });

    const updates = [], params = [];
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (discount_value !== undefined) { updates.push('discount_value = ?'); params.push(discount_value); }
    if (valid_until !== undefined) { updates.push('valid_until = ?'); params.push(valid_until); }
    if (updates.length === 0) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No fields to update', status: 400 } });

    updates.push('updated_at = NOW()'); params.push(req.params.id);
    await db.execute(`UPDATE coupons SET ${updates.join(', ')} WHERE id = ? AND coupon_type = 'site_sale'`, params);
    res.json({ success: true, data: { message: 'Sale updated successfully' } });
  } catch (error) {
    console.error('Error updating sale:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update sale', status: 500 } });
  }
});

// ============================================================
// ADMIN COUPONS
// ============================================================

router.get('/admin/coupons/all', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const [coupons] = await db.execute("SELECT id, code, name, discount_type, discount_value, is_active, vendor_id, is_vendor_specific, created_at FROM coupons WHERE coupon_type = 'admin_coupon' ORDER BY created_at DESC");
    res.json({ success: true, data: { coupons } });
  } catch (error) {
    console.error('Error getting admin coupons:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get coupons', status: 500 } });
  }
});

router.post('/admin/coupons', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { code, name, description, discount_type, discount_value, application_type,
      min_order_amount = 0, usage_limit_per_user = 1, total_usage_limit, valid_from, valid_until,
      vendor_id, product_ids = [], max_discount_amount } = req.body;

    if (!code || !name || !discount_type || !discount_value || !application_type || !valid_from)
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields', status: 400 } });

    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
      const [existing] = await connection.execute('SELECT id FROM coupons WHERE code = ?', [code]);
      if (existing.length > 0) { await connection.rollback(); return res.status(400).json({ success: false, error: { code: 'DUPLICATE', message: 'Coupon code already exists', status: 400 } }); }

      const [result] = await connection.execute(
        `INSERT INTO coupons (code, name, description, coupon_type, created_by_admin_id, discount_type, discount_value, application_type, min_order_amount, usage_limit_per_user, total_usage_limit, max_discount_amount, vendor_id, is_vendor_specific, valid_from, valid_until, is_active, created_at)
         VALUES (?, ?, ?, 'admin_coupon', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [code, name, description, req.userId, discount_type, discount_value, application_type, min_order_amount, usage_limit_per_user, total_usage_limit, max_discount_amount, vendor_id || null, vendor_id ? 1 : 0, valid_from, valid_until || null]);
      if (product_ids.length > 0) {
        for (const pid of product_ids) {
          const [pi] = await connection.execute('SELECT user_id as vendor_id FROM products WHERE id = ?', [pid]);
          if (pi.length > 0) await connection.execute('INSERT INTO coupon_products (coupon_id, product_id, vendor_id) VALUES (?, ?, ?)', [result.insertId, pid, pi[0].vendor_id]);
        }
      }
      await connection.commit();
      res.json({ success: true, data: { message: 'Admin coupon created successfully', coupon: { id: result.insertId, code, name, discount_type, discount_value } } });
    } catch (err) { await connection.rollback(); throw err; } finally { connection.release(); }
  } catch (error) {
    console.error('Error creating admin coupon:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create coupon', status: 500 } });
  }
});

router.put('/admin/coupons/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { is_active } = req.body;
    const [result] = await db.execute("UPDATE coupons SET is_active = ? WHERE id = ? AND coupon_type = 'admin_coupon'", [is_active, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin coupon not found', status: 404 } });
    res.json({ success: true, data: { message: 'Coupon status updated successfully' } });
  } catch (error) {
    console.error('Error updating coupon status:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update coupon status', status: 500 } });
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

// --- Public / customer terms endpoints (must be before :id catch-all) ---

router.get('/terms/current', async (req, res) => {
  try {
    const [terms] = await db.query("SELECT id, version, title, content, created_at FROM terms_versions WHERE is_current = TRUE AND subscription_type = 'general' ORDER BY created_at DESC LIMIT 1");
    if (!terms[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No current terms found' } });
    res.json({ success: true, data: terms[0] });
  } catch (err) {
    console.error('Error fetching current terms:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

router.get('/terms/type/:type', async (req, res) => {
  try {
    const validTypes = ['general', 'verified', 'shipping_labels', 'websites', 'wholesale', 'marketplace', 'addons'];
    if (!validTypes.includes(req.params.type)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid terms type' } });
    const [terms] = await db.query('SELECT id, version, title, content, subscription_type, created_at FROM terms_versions WHERE is_current = TRUE AND subscription_type = ? ORDER BY created_at DESC LIMIT 1', [req.params.type]);
    if (!terms[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No current terms found for this type' } });
    res.json({ success: true, data: terms[0] });
  } catch (err) {
    console.error('Error fetching terms by type:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

router.get('/terms/check-acceptance', requireAuth, async (req, res) => {
  try {
    const [currentTerms] = await db.query("SELECT id FROM terms_versions WHERE is_current = TRUE AND subscription_type = 'general' ORDER BY created_at DESC LIMIT 1");
    if (!currentTerms[0]) return res.json({ success: true, data: { hasAccepted: false, requiresAcceptance: false, message: 'No current terms found' } });
    const [acceptance] = await db.query("SELECT id, accepted_at FROM user_terms_acceptance WHERE user_id = ? AND terms_version_id = ? AND subscription_type = 'general'", [req.userId, currentTerms[0].id]);
    res.json({ success: true, data: { hasAccepted: acceptance.length > 0, requiresAcceptance: acceptance.length === 0, termsVersionId: currentTerms[0].id, acceptedAt: acceptance[0]?.accepted_at || null } });
  } catch (err) {
    console.error('Error checking terms acceptance:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

router.post('/terms/accept', requireAuth, async (req, res) => {
  try {
    const { termsVersionId } = req.body;
    if (!termsVersionId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Terms version ID is required' } });
    const [currentTerms] = await db.query('SELECT id FROM terms_versions WHERE id = ? AND is_current = TRUE', [termsVersionId]);
    if (!currentTerms[0]) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid or outdated terms version' } });
    const [existing] = await db.query('SELECT id FROM user_terms_acceptance WHERE user_id = ? AND terms_version_id = ?', [req.userId, termsVersionId]);
    if (existing.length > 0) return res.json({ success: true, message: 'Terms already accepted' });
    await db.query('INSERT INTO user_terms_acceptance (user_id, terms_version_id, ip_address, user_agent) VALUES (?, ?, ?, ?)', [req.userId, termsVersionId, req.ip || req.connection?.remoteAddress, req.get('User-Agent')]);
    res.json({ success: true, message: 'Terms accepted successfully' });
  } catch (err) {
    console.error('Error accepting terms:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
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

// ============================================================================
// DATA RETENTION CLEANUP
// ============================================================================

/**
 * Preview what the data retention cleanup would delete
 * @route POST /api/v2/system/data-retention/preview
 * @access Private (requires manage_system permission)
 */
router.post('/data-retention/preview', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const mysql = require('mysql2/promise');
    const { getPreviewCounts, dbConfig } = require('../../cron/data-retention-cleanup');
    const db = await mysql.createConnection(dbConfig);
    try {
      const results = await getPreviewCounts(db);
      res.json({ success: true, data: results });
    } finally {
      await db.end();
    }
  } catch (err) {
    console.error('Error getting retention preview:', err);
    res.status(500).json({ error: 'Failed to get cleanup preview' });
  }
});

/**
 * Run the data retention cleanup
 * @route POST /api/v2/system/data-retention/run
 * @access Private (requires manage_system permission)
 */
router.post('/data-retention/run', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const mysql = require('mysql2/promise');
    const { runCleanupTasks, runUserDeletions, dbConfig } = require('../../cron/data-retention-cleanup');
    const db = await mysql.createConnection(dbConfig);
    try {
      const cleanupResults = await runCleanupTasks(db);
      const userResults = await runUserDeletions(db);
      res.json({
        success: true,
        data: [...cleanupResults, ...userResults],
        timestamp: new Date().toISOString()
      });
    } finally {
      await db.end();
    }
  } catch (err) {
    console.error('Error running retention cleanup:', err);
    res.status(500).json({ error: 'Failed to run cleanup' });
  }
});

/**
 * Approve a user for deletion (GDPR)
 * @route POST /api/v2/system/data-retention/approve-deletion/:userId
 * @access Private (requires manage_system permission)
 */
router.post('/data-retention/approve-deletion/:userId', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const db = require('../../../config/db');
    const targetUserId = req.params.userId;

    const [users] = await db.execute(
      "SELECT id, username, status FROM users WHERE id = ?",
      [targetUserId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (users[0].status !== 'deleted') {
      return res.status(400).json({ error: 'User must have status "deleted" before deletion can be approved' });
    }

    await db.execute(
      "UPDATE users SET deletion_approved_at = NOW(), deletion_approved_by = ? WHERE id = ?",
      [req.userId, targetUserId]
    );

    res.json({ success: true, message: `Deletion approved for user ${targetUserId}. Data will be removed on next cleanup run.` });
  } catch (err) {
    console.error('Error approving deletion:', err);
    res.status(500).json({ error: 'Failed to approve deletion' });
  }
});

// ============================================================================
// SECRETS MANAGER
// ============================================================================

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const GCP_PROJECT_ID = 'onlineartfestival-com';

function getSecretsClient() {
  return new SecretManagerServiceClient();
}

async function getSecretJson(client, secretName) {
  try {
    const name = `projects/${GCP_PROJECT_ID}/secrets/${secretName}/versions/latest`;
    const [version] = await client.accessSecretVersion({ name });
    return JSON.parse(version.payload.data.toString('utf8'));
  } catch (err) {
    if (err.code === 5) return null;
    throw err;
  }
}

async function saveSecretJson(client, secretName, data) {
  const parent = `projects/${GCP_PROJECT_ID}`;
  const payload = JSON.stringify(data, null, 2);

  try {
    await client.getSecret({ name: `${parent}/secrets/${secretName}` });
  } catch (err) {
    if (err.code === 5) {
      await client.createSecret({
        parent,
        secretId: secretName,
        secret: { replication: { automatic: {} } },
      });
    } else {
      throw err;
    }
  }

  await client.addSecretVersion({
    parent: `${parent}/secrets/${secretName}`,
    payload: { data: Buffer.from(payload, 'utf8') },
  });
}

/**
 * List available environments and their secret counts
 */
router.get('/secrets/environments', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const client = getSecretsClient();
    const currentInstance = process.env.API_INSTANCE || 'staging';
    const envNames = ['staging', 'production'];
    const results = [];

    for (const name of envNames) {
      const secretName = `${name}-env-secrets`;
      const data = await getSecretJson(client, secretName);
      results.push({
        name,
        secretName,
        count: data ? Object.keys(data).length : 0,
        exists: data !== null,
        isCurrent: name === currentInstance,
      });
    }

    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Error listing environments:', err);
    res.status(500).json({ error: 'Failed to list environments' });
  }
});

/**
 * List all secrets for an environment
 */
router.get('/secrets/list', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const envName = req.query.env || process.env.API_INSTANCE || 'staging';
    const client = getSecretsClient();
    const data = await getSecretJson(client, `${envName}-env-secrets`);
    res.json({ success: true, data: data || {} });
  } catch (err) {
    console.error('Error listing secrets:', err);
    res.status(500).json({ error: 'Failed to list secrets' });
  }
});

/**
 * Set (add or update) a single secret
 */
router.post('/secrets/set', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { env, key, value } = req.body;
    if (!env || !key || value === undefined) {
      return res.status(400).json({ error: 'env, key, and value are required' });
    }

    const client = getSecretsClient();
    const secretName = `${env}-env-secrets`;
    const data = await getSecretJson(client, secretName) || {};
    data[key] = value;
    await saveSecretJson(client, secretName, data);

    res.json({ success: true, message: `Set ${key} in ${env}` });
  } catch (err) {
    console.error('Error setting secret:', err);
    res.status(500).json({ error: 'Failed to set secret' });
  }
});

/**
 * Delete a single secret key
 */
router.post('/secrets/delete', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { env, key } = req.body;
    if (!env || !key) {
      return res.status(400).json({ error: 'env and key are required' });
    }

    const client = getSecretsClient();
    const secretName = `${env}-env-secrets`;
    const data = await getSecretJson(client, secretName);
    if (!data || !(key in data)) {
      return res.status(404).json({ error: `Key "${key}" not found in ${env}` });
    }

    delete data[key];
    await saveSecretJson(client, secretName, data);

    res.json({ success: true, message: `Removed ${key} from ${env}` });
  } catch (err) {
    console.error('Error deleting secret:', err);
    res.status(500).json({ error: 'Failed to delete secret' });
  }
});

/**
 * Copy all secrets from one environment to another
 */
router.post('/secrets/copy', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { fromEnv, toEnv } = req.body;
    if (!fromEnv || !toEnv || fromEnv === toEnv) {
      return res.status(400).json({ error: 'fromEnv and toEnv are required and must differ' });
    }

    const client = getSecretsClient();
    const sourceData = await getSecretJson(client, `${fromEnv}-env-secrets`);
    if (!sourceData) {
      return res.status(404).json({ error: `No secrets found in ${fromEnv}` });
    }

    const targetData = await getSecretJson(client, `${toEnv}-env-secrets`) || {};
    const merged = { ...targetData, ...sourceData };
    await saveSecretJson(client, `${toEnv}-env-secrets`, merged);

    res.json({ success: true, count: Object.keys(sourceData).length, message: `Copied ${Object.keys(sourceData).length} secrets from ${fromEnv} to ${toEnv}` });
  } catch (err) {
    console.error('Error copying secrets:', err);
    res.status(500).json({ error: 'Failed to copy secrets' });
  }
});

// ============================================================================
// DASHBOARD WIDGETS
// ============================================================================

async function ensureShortcutsWidgetType() {
  const [existing] = await db.execute('SELECT id FROM dashboard_widget_types WHERE widget_type = ?', ['my_shortcuts']);
  if (existing.length === 0) {
    await db.execute('INSERT INTO dashboard_widget_types (widget_type, display_name, description, category, is_active, default_config) VALUES (?, ?, ?, ?, ?, ?)',
      ['my_shortcuts', 'My Shortcuts', 'Quick access shortcuts to frequently used menu items', 'productivity', 1, JSON.stringify({ shortcuts: [] })]);
  }
}

async function ensureProductsWidgetType() {
  const [existing] = await db.execute('SELECT id FROM dashboard_widget_types WHERE widget_type = ?', ['my_products']);
  if (existing.length === 0) {
    await db.execute('INSERT INTO dashboard_widget_types (widget_type, display_name, description, category, is_active, default_config) VALUES (?, ?, ?, ?, ?, ?)',
      ['my_products', 'My Products', 'Display your recent products with quick access to manage them', 'store_management', 1, JSON.stringify({})]);
  }
}

async function ensureShortcutsWidget(userId) {
  await ensureShortcutsWidgetType();
  const [existing] = await db.execute('SELECT id FROM dashboard_layouts WHERE user_id = ? AND widget_type = ? ORDER BY id ASC', [userId, 'my_shortcuts']);
  if (existing.length === 0) {
    const defaultConfig = { shortcuts: [
      { id: 'edit-profile', label: 'Edit Profile', icon: 'fas fa-user-edit', slideInType: 'edit-profile' },
      { id: 'my-orders', label: 'My Orders', icon: 'fas fa-shopping-bag', slideInType: 'my-orders' },
      { id: 'email-settings', label: 'Email Settings', icon: 'fas fa-envelope-open-text', slideInType: 'email-settings' }
    ]};
    await db.execute('INSERT INTO dashboard_layouts (user_id, widget_type, grid_row, grid_col, widget_config, is_admin_locked) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, 'my_shortcuts', 0, 0, JSON.stringify(defaultConfig), 0]);
  } else if (existing.length > 1) {
    await db.execute('DELETE FROM dashboard_layouts WHERE user_id = ? AND widget_type = ? AND id != ?', [userId, 'my_shortcuts', existing[0].id]);
  }
}

router.get('/dashboard-widgets/layout', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    await ensureShortcutsWidget(userId);
    await ensureProductsWidgetType();
    const [userLayout] = await db.execute('SELECT dl.*, dwt.display_name, dwt.category, dwt.default_config FROM dashboard_layouts dl JOIN dashboard_widget_types dwt ON dl.widget_type = dwt.widget_type WHERE dl.user_id = ? ORDER BY dl.grid_row ASC, dl.grid_col ASC', [userId]);
    const [adminLayout] = await db.execute('SELECT dl.*, dwt.display_name, dwt.category, dwt.default_config FROM dashboard_layouts dl JOIN dashboard_widget_types dwt ON dl.widget_type = dwt.widget_type WHERE dl.is_admin_locked = 1 AND dl.user_id = ? ORDER BY dl.grid_row ASC, dl.grid_col ASC', [userId]);
    res.json({ success: true, data: { userLayout, adminLayout, totalWidgets: userLayout.length + adminLayout.length } });
  } catch (err) {
    console.error('Error fetching dashboard layout:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

router.post('/dashboard-widgets/layout', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { layout } = req.body;
    if (!Array.isArray(layout)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Layout must be an array' } });
    await db.execute('DELETE FROM dashboard_layouts WHERE user_id = ? AND is_admin_locked = 0', [userId]);
    if (layout.length > 0) {
      const values = layout.map(w => [userId, w.widget_type, w.grid_row, w.grid_col, w.widget_config ? JSON.stringify(w.widget_config) : null, 0]);
      const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
      await db.execute(`INSERT INTO dashboard_layouts (user_id, widget_type, grid_row, grid_col, widget_config, is_admin_locked) VALUES ${placeholders} ON DUPLICATE KEY UPDATE widget_type = VALUES(widget_type), widget_config = VALUES(widget_config), is_admin_locked = VALUES(is_admin_locked)`, values.flat());
    }
    res.json({ success: true, message: 'Dashboard layout saved' });
  } catch (err) {
    console.error('Error saving dashboard layout:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

router.get('/dashboard-widgets/widget-data/:widgetType', requireAuth, async (req, res) => {
  try {
    const { widgetType } = req.params;
    const userId = req.userId;
    let widgetData = {};
    if (widgetType === 'my_shortcuts') {
      const [widget] = await db.execute('SELECT widget_config FROM dashboard_layouts WHERE user_id = ? AND widget_type = ?', [userId, 'my_shortcuts']);
      const shortcuts = (widget[0]?.widget_config?.shortcuts) || [];
      widgetData = { shortcuts, maxShortcuts: 10, canAddMore: shortcuts.length < 10 };
    } else if (widgetType === 'my_products') {
      widgetData = { message: 'My Products widget fetches data directly' };
    } else {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Unknown widget type' } });
    }
    res.json({ success: true, data: widgetData, widget_type: widgetType });
  } catch (err) {
    console.error('Error fetching widget data:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

router.post('/dashboard-widgets/shortcuts/add', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { shortcut } = req.body;
    if (!shortcut || !shortcut.id || !shortcut.label || (!shortcut.href && !shortcut.slideInType)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid shortcut data' } });
    }
    const [widget] = await db.execute('SELECT * FROM dashboard_layouts WHERE user_id = ? AND widget_type = ?', [userId, 'my_shortcuts']);
    if (widget.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Shortcuts widget not found' } });
    const currentConfig = widget[0].widget_config || { shortcuts: [] };
    const shortcuts = currentConfig.shortcuts || [];
    if (shortcuts.find(s => s.id === shortcut.id)) return res.status(400).json({ success: false, error: { code: 'DUPLICATE', message: 'Shortcut already exists' } });
    if (shortcuts.length >= 10) return res.status(400).json({ success: false, error: { code: 'LIMIT_REACHED', message: 'Maximum shortcuts limit reached' } });
    shortcuts.push(shortcut);
    await db.execute('UPDATE dashboard_layouts SET widget_config = ? WHERE user_id = ? AND widget_type = ?', [JSON.stringify({ ...currentConfig, shortcuts }), userId, 'my_shortcuts']);
    res.json({ success: true, data: { shortcuts } });
  } catch (err) {
    console.error('Error adding shortcut:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

router.post('/dashboard-widgets/shortcuts/remove', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { shortcutId } = req.body;
    if (!shortcutId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Shortcut ID required' } });
    const [widget] = await db.execute('SELECT * FROM dashboard_layouts WHERE user_id = ? AND widget_type = ?', [userId, 'my_shortcuts']);
    if (widget.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Shortcuts widget not found' } });
    const currentConfig = widget[0].widget_config || { shortcuts: [] };
    const filteredShortcuts = (currentConfig.shortcuts || []).filter(s => s.id !== shortcutId);
    await db.execute('UPDATE dashboard_layouts SET widget_config = ? WHERE user_id = ? AND widget_type = ?', [JSON.stringify({ ...currentConfig, shortcuts: filteredShortcuts }), userId, 'my_shortcuts']);
    res.json({ success: true, data: { shortcuts: filteredShortcuts } });
  } catch (err) {
    console.error('Error removing shortcut:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

router.post('/dashboard-widgets/remove-widget', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { widgetType } = req.body;
    if (!widgetType) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Widget type is required' } });
    const [result] = await db.execute('DELETE FROM dashboard_layouts WHERE user_id = ? AND widget_type = ? AND is_admin_locked = 0', [userId, widgetType]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Widget not found or cannot be removed' } });
    res.json({ success: true, message: 'Widget removed successfully' });
  } catch (err) {
    console.error('Error removing widget:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// ============================================================================
// SUPPORT TICKETS
// ============================================================================

async function generateTicketNumber() {
  const date = new Date();
  const prefix = `TKT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const [result] = await db.query(`SELECT ticket_number FROM support_tickets WHERE ticket_number LIKE ? ORDER BY ticket_number DESC LIMIT 1`, [`${prefix}-%`]);
  let nextNum = 1;
  if (result.length > 0) nextNum = parseInt(result[0].ticket_number.split('-')[2], 10) + 1;
  return `${prefix}-${String(nextNum).padStart(5, '0')}`;
}

router.post('/tickets', async (req, res) => {
  try {
    const { subject, message, ticket_type = 'general', priority = 'normal', guest_email, guest_name, related_type, related_id } = req.body;
    if (!subject || !message) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Subject and message are required' } });

    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (err) { /* continue as guest */ }
    }

    if (!userId && (!guest_email || !guest_name)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Guest email and name are required' } });
    }

    const ticketNumber = await generateTicketNumber();
    const [result] = await db.query(
      `INSERT INTO support_tickets (ticket_number, ticket_type, subject, user_id, guest_email, guest_name, status, priority, related_type, related_id) VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
      [ticketNumber, ticket_type, subject, userId, userId ? null : guest_email, userId ? null : guest_name, priority, related_type || null, related_id || null]
    );
    await db.query(
      `INSERT INTO support_ticket_messages (ticket_id, user_id, sender_type, sender_name, message_text, is_internal) VALUES (?, ?, ?, ?, ?, 0)`,
      [result.insertId, userId, userId ? 'customer' : 'guest', userId ? null : guest_name, message]
    );

    res.status(201).json({ success: true, data: { ticket_id: result.insertId, ticket_number: ticketNumber } });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

router.get('/tickets/my', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { status, limit = 20, offset = 0 } = req.query;
    let where = 'WHERE t.user_id = ?';
    const params = [userId];
    if (status && status !== 'all') { where += ' AND t.status = ?'; params.push(status); }

    const [tickets] = await db.query(`SELECT t.*, (SELECT COUNT(*) FROM support_ticket_messages WHERE ticket_id = t.id) as message_count, (SELECT MAX(created_at) FROM support_ticket_messages WHERE ticket_id = t.id) as last_message_at FROM support_tickets t ${where} ORDER BY t.updated_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), parseInt(offset)]);
    const [countResult] = await db.query(`SELECT COUNT(*) as total FROM support_tickets t ${where}`, params);

    res.json({ success: true, data: { tickets, pagination: { total: countResult[0].total, limit: parseInt(limit), offset: parseInt(offset) } } });
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

router.get('/tickets/my/notifications', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const [awaitingResponse] = await db.query('SELECT COUNT(*) as count FROM support_tickets WHERE user_id = ? AND status = ?', [userId, 'awaiting_customer']);
    const [openTickets] = await db.query('SELECT COUNT(*) as count FROM support_tickets WHERE user_id = ? AND status IN (?, ?, ?)', [userId, 'open', 'awaiting_customer', 'awaiting_support']);
    res.json({ success: true, data: { notifications: { awaiting_response: awaitingResponse[0]?.count || 0, open_tickets: openTickets[0]?.count || 0 } } });
  } catch (error) {
    console.error('Error fetching ticket notifications:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

router.get('/tickets/:id', requireAuth, async (req, res) => {
  try {
    const [tickets] = await db.query('SELECT t.* FROM support_tickets t WHERE t.id = ? AND t.user_id = ?', [req.params.id, req.userId]);
    if (tickets.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    const [messages] = await db.query('SELECT m.*, u.username as user_email FROM support_ticket_messages m LEFT JOIN users u ON m.user_id = u.id WHERE m.ticket_id = ? AND m.is_internal = 0 ORDER BY m.created_at ASC', [req.params.id]);
    res.json({ success: true, data: { ticket: tickets[0], messages } });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

router.post('/tickets/:id/messages', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Message is required' } });

    const [tickets] = await db.query('SELECT id, status FROM support_tickets WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (tickets.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });
    if (tickets[0].status === 'closed') return res.status(400).json({ success: false, error: { code: 'TICKET_CLOSED', message: 'Cannot add messages to closed tickets' } });

    const [result] = await db.query('INSERT INTO support_ticket_messages (ticket_id, user_id, sender_type, message_text, is_internal) VALUES (?, ?, ?, ?, 0)', [id, req.userId, 'customer', message.trim()]);
    await db.query("UPDATE support_tickets SET status = 'awaiting_support', updated_at = NOW() WHERE id = ? AND status != 'resolved'", [id]);
    res.status(201).json({ success: true, data: { message_id: result.insertId } });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

router.patch('/tickets/:id/close', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [tickets] = await db.query('SELECT id, status FROM support_tickets WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (tickets.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' } });

    await db.query("UPDATE support_tickets SET status = 'closed', closed_at = NOW(), updated_at = NOW() WHERE id = ?", [id]);
    await db.query('INSERT INTO support_ticket_status_log (ticket_id, field_changed, old_value, new_value, changed_by) VALUES (?, ?, ?, ?, ?)', [id, 'status', tickets[0].status, 'closed', req.userId]);
    res.json({ success: true, message: 'Ticket closed' });
  } catch (error) {
    console.error('Error closing ticket:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ============================================================================
// PUBLIC DEFAULT POLICIES
// ============================================================================

const POLICY_TABLES = {
  'shipping': 'shipping_policies',
  'returns': 'return_policies',
  'privacy': 'privacy_policies',
  'cookies': 'cookie_policies',
  'copyright': 'copyright_policies',
  'transparency': 'transparency_policies',
  'data-retention': 'data_retention_policies'
};

/**
 * GET /api/v2/system/policies/:type/default
 * Public endpoint for fetching platform default policies
 */
router.get('/policies/:type/default', async (req, res) => {
  try {
    const table = POLICY_TABLES[req.params.type];
    if (!table) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: `Unknown policy type: ${req.params.type}` } });
    }

    const db = require('../../../config/db');
    const [policies] = await db.query(
      `SELECT policy_text FROM ${table} WHERE user_id IS NULL AND status = ? ORDER BY created_at DESC LIMIT 1`,
      ['active']
    );

    if (policies.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Default ${req.params.type} policy not found` },
        data: { policy_text: `Default ${req.params.type} policy is currently unavailable. Please contact support@brakebee.com for assistance.` }
      });
    }

    res.json({ success: true, data: { policy_text: policies[0].policy_text } });
  } catch (error) {
    console.error(`Error fetching default ${req.params.type} policy:`, error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

module.exports = router;
