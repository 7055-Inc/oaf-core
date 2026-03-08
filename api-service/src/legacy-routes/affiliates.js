const express = require('express');
const crypto = require('crypto');
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission, hasPermission, requireAllAccess } = require('../middleware/permissions');
const router = express.Router();

/**
 * @fileoverview Affiliate program management routes
 * 
 * Handles affiliate operations including:
 * - Affiliate enrollment and account management
 * - Commission tracking and reporting
 * - Payout management (Stripe and site credit)
 * - Referral link generation and resolution
 * - Admin settings and rate management
 * 
 * Commission Model:
 * - Affiliates earn a percentage of the platform's commission (not sale price)
 * - Default: 20% of platform commission
 * - Attribution: Locked per-item at cart-add time
 * - Payout delay: 30 days for returns/disputes
 * 
 * User Types:
 * - Promoters: Auto-enrolled, Stripe payouts
 * - Artists: Opt-in, Stripe payouts (uses existing vendor account)
 * - Community: Opt-in, site credit (unless professional_affiliate permission)
 * 
 * @author Beemeeart Development Team
 * @version 1.0.0
 */

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Generate a unique affiliate code
 * @returns {string} 8-character alphanumeric code
 */
function generateAffiliateCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

/**
 * Determine payout method based on user type and permissions
 * @param {string} userType - User type (artist, promoter, community)
 * @param {boolean} hasProfessionalAffiliate - Has professional_affiliate permission
 * @returns {string} 'stripe' or 'site_credit'
 */
function determinePayoutMethod(userType, hasProfessionalAffiliate) {
  if (userType === 'community' && !hasProfessionalAffiliate) {
    return 'site_credit';
  }
  return 'stripe';
}

/**
 * Get affiliate type from user type
 * @param {string} userType - User type from users table
 * @returns {string} Affiliate type enum value
 */
function getAffiliateType(userType) {
  if (userType === 'promoter') return 'promoter';
  if (userType === 'artist') return 'artist';
  return 'community';
}

// =====================================================
// PUBLIC ENDPOINTS
// =====================================================

/**
 * Resolve affiliate code to affiliate ID
 * @route GET /api/affiliates/resolve/:code
 * @access Public
 * @param {string} code - Affiliate code to resolve
 * @returns {Object} Affiliate ID and basic info for attribution
 */
router.get('/resolve/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code || code.length < 4) {
      return res.status(400).json({ error: 'Invalid affiliate code' });
    }
    
    const [affiliates] = await db.execute(`
      SELECT a.id, a.affiliate_code, a.affiliate_type, a.status,
             u.id as user_id
      FROM affiliates a
      JOIN users u ON a.user_id = u.id
      WHERE a.affiliate_code = ? AND a.status = 'active'
    `, [code.toUpperCase()]);
    
    if (affiliates.length === 0) {
      return res.status(404).json({ error: 'Affiliate not found or inactive' });
    }
    
    const affiliate = affiliates[0];
    
    res.json({
      affiliate_id: affiliate.id,
      affiliate_code: affiliate.affiliate_code,
      affiliate_type: affiliate.affiliate_type,
      source: 'link'
    });
    
  } catch (error) {
    console.error('Error resolving affiliate code:', error);
    res.status(500).json({ error: 'Failed to resolve affiliate code' });
  }
});

/**
 * Resolve promoter site to affiliate (for promoter site attribution)
 * @route GET /api/affiliates/resolve-site/:siteId
 * @access Public
 * @param {number} siteId - Site ID to resolve
 * @returns {Object} Affiliate ID for the site owner
 */
router.get('/resolve-site/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    
    // Get site owner and their affiliate account
    const [results] = await db.execute(`
      SELECT a.id as affiliate_id, a.affiliate_code, a.affiliate_type, a.status,
             s.id as site_id, s.user_id
      FROM sites s
      JOIN affiliates a ON s.user_id = a.user_id
      WHERE s.id = ? AND a.status = 'active'
    `, [siteId]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Site affiliate not found' });
    }
    
    const result = results[0];
    
    res.json({
      affiliate_id: result.affiliate_id,
      affiliate_code: result.affiliate_code,
      affiliate_type: result.affiliate_type,
      promoter_site_id: result.site_id,
      source: 'promoter_site'
    });
    
  } catch (error) {
    console.error('Error resolving site affiliate:', error);
    res.status(500).json({ error: 'Failed to resolve site affiliate' });
  }
});

// =====================================================
// AUTHENTICATED USER ENDPOINTS
// =====================================================

/**
 * Get current user's affiliate account
 * @route GET /api/affiliates/me
 * @access Private
 * @returns {Object} Affiliate account details or null if not enrolled
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    const [affiliates] = await db.execute(`
      SELECT a.*, 
             u.user_type,
             (SELECT COUNT(*) FROM affiliate_commissions WHERE affiliate_id = a.id) as total_commissions,
             (SELECT COUNT(*) FROM affiliate_commissions WHERE affiliate_id = a.id AND status = 'pending') as pending_commissions,
             (SELECT COUNT(*) FROM affiliate_referrals WHERE affiliate_id = a.id) as total_referrals
      FROM affiliates a
      JOIN users u ON a.user_id = u.id
      WHERE a.user_id = ?
    `, [userId]);
    
    if (affiliates.length === 0) {
      // User not enrolled - return enrollment info
      const [userInfo] = await db.execute(`
        SELECT u.user_type, 
               COALESCE(up.professional_affiliate, 0) as professional_affiliate
        FROM users u
        LEFT JOIN user_permissions up ON u.id = up.user_id
        WHERE u.id = ?
      `, [userId]);
      
      if (userInfo.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      return res.json({
        enrolled: false,
        can_enroll: true,
        user_type: userInfo[0].user_type,
        payout_method: determinePayoutMethod(
          userInfo[0].user_type, 
          userInfo[0].professional_affiliate === 1
        )
      });
    }
    
    const affiliate = affiliates[0];
    
    res.json({
      enrolled: true,
      ...affiliate
    });
    
  } catch (error) {
    console.error('Error getting affiliate account:', error);
    res.status(500).json({ error: 'Failed to get affiliate account' });
  }
});

/**
 * Enroll as an affiliate
 * @route POST /api/affiliates/enroll
 * @access Private
 * @returns {Object} New affiliate account details
 */
router.post('/enroll', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Check if already enrolled
    const [existing] = await db.execute(
      'SELECT id FROM affiliates WHERE user_id = ?',
      [userId]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already enrolled as affiliate' });
    }
    
    // Get user info for enrollment
    const [userInfo] = await db.execute(`
      SELECT u.user_type, u.status as user_status,
             COALESCE(up.professional_affiliate, 0) as professional_affiliate,
             vs.stripe_account_id
      FROM users u
      LEFT JOIN user_permissions up ON u.id = up.user_id
      LEFT JOIN vendor_settings vs ON u.id = vs.vendor_id
      WHERE u.id = ?
    `, [userId]);
    
    if (userInfo.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userInfo[0];
    
    if (user.user_status !== 'active') {
      return res.status(400).json({ error: 'Account must be active to enroll' });
    }
    
    // Get default commission rate from settings
    const [settings] = await db.execute(
      'SELECT default_commission_rate FROM affiliate_settings WHERE id = 1'
    );
    const defaultRate = settings.length > 0 ? settings[0].default_commission_rate : 20.00;
    
    // Determine affiliate type and payout method
    const affiliateType = getAffiliateType(user.user_type);
    const payoutMethod = determinePayoutMethod(user.user_type, user.professional_affiliate === 1);
    
    // Generate unique code
    let affiliateCode;
    let attempts = 0;
    while (attempts < 10) {
      affiliateCode = generateAffiliateCode();
      const [existingCode] = await db.execute(
        'SELECT id FROM affiliates WHERE affiliate_code = ?',
        [affiliateCode]
      );
      if (existingCode.length === 0) break;
      attempts++;
    }
    
    if (attempts >= 10) {
      return res.status(500).json({ error: 'Failed to generate unique affiliate code' });
    }
    
    // Create affiliate account
    const [result] = await db.execute(`
      INSERT INTO affiliates (
        user_id, affiliate_code, affiliate_type, commission_rate,
        status, payout_method, stripe_account_id
      ) VALUES (?, ?, ?, ?, 'active', ?, ?)
    `, [
      userId,
      affiliateCode,
      affiliateType,
      defaultRate,
      payoutMethod,
      user.stripe_account_id || null
    ]);
    
    // Fetch the created affiliate
    const [newAffiliate] = await db.execute(
      'SELECT * FROM affiliates WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json({
      success: true,
      message: 'Successfully enrolled as affiliate',
      affiliate: newAffiliate[0]
    });
    
  } catch (error) {
    console.error('Error enrolling as affiliate:', error);
    res.status(500).json({ error: 'Failed to enroll as affiliate' });
  }
});

/**
 * Get affiliate dashboard stats
 * @route GET /api/affiliates/stats
 * @access Private
 * @returns {Object} Earnings summary, recent activity, performance metrics
 */
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get affiliate account
    const [affiliates] = await db.execute(
      'SELECT * FROM affiliates WHERE user_id = ?',
      [userId]
    );
    
    if (affiliates.length === 0) {
      return res.status(404).json({ error: 'Not enrolled as affiliate' });
    }
    
    const affiliate = affiliates[0];
    
    // Get commission stats
    const [commissionStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_commissions,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN gross_amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN net_amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN status IN ('pending', 'eligible') THEN gross_amount ELSE 0 END), 0) as upcoming_amount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count
      FROM affiliate_commissions
      WHERE affiliate_id = ?
    `, [affiliate.id]);
    
    // Get referral stats
    const [referralStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_clicks,
        COUNT(CASE WHEN converted = 1 THEN 1 END) as conversions,
        COUNT(DISTINCT DATE(created_at)) as active_days
      FROM affiliate_referrals
      WHERE affiliate_id = ?
    `, [affiliate.id]);
    
    // Get recent commissions
    const [recentCommissions] = await db.execute(`
      SELECT ac.*, o.created_at as order_date
      FROM affiliate_commissions ac
      JOIN orders o ON ac.order_id = o.id
      WHERE ac.affiliate_id = ?
      ORDER BY ac.created_at DESC
      LIMIT 10
    `, [affiliate.id]);
    
    // Get monthly trend (last 6 months)
    const [monthlyTrend] = await db.execute(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as commission_count,
        SUM(gross_amount) as total_earned
      FROM affiliate_commissions
      WHERE affiliate_id = ?
        AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month DESC
    `, [affiliate.id]);
    
    res.json({
      affiliate: {
        id: affiliate.id,
        code: affiliate.affiliate_code,
        type: affiliate.affiliate_type,
        commission_rate: affiliate.commission_rate,
        payout_method: affiliate.payout_method,
        status: affiliate.status
      },
      earnings: {
        total_earnings: affiliate.total_earnings,
        pending_balance: affiliate.pending_balance,
        paid_balance: affiliate.paid_balance,
        ...commissionStats[0]
      },
      referrals: referralStats[0],
      recent_commissions: recentCommissions,
      monthly_trend: monthlyTrend
    });
    
  } catch (error) {
    console.error('Error getting affiliate stats:', error);
    res.status(500).json({ error: 'Failed to get affiliate stats' });
  }
});

/**
 * Get commission history
 * @route GET /api/affiliates/commissions
 * @access Private
 * @query {string} status - Filter by status (pending, paid, cancelled)
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 20)
 * @returns {Object} Paginated commission history
 */
router.get('/commissions', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { status, page = 1, limit = 20 } = req.query;
    
    // Get affiliate
    const [affiliates] = await db.execute(
      'SELECT id FROM affiliates WHERE user_id = ?',
      [userId]
    );
    
    if (affiliates.length === 0) {
      return res.status(404).json({ error: 'Not enrolled as affiliate' });
    }
    
    const affiliateId = affiliates[0].id;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    let whereClause = 'WHERE ac.affiliate_id = ?';
    const params = [affiliateId];
    
    if (status) {
      whereClause += ' AND ac.status = ?';
      params.push(status);
    }
    
    // Get total count
    const [countResult] = await db.execute(`
      SELECT COUNT(*) as total
      FROM affiliate_commissions ac
      ${whereClause}
    `, params);
    
    // Get commissions with order details
    const [commissions] = await db.execute(`
      SELECT 
        ac.*,
        o.created_at as order_date,
        o.status as order_status
      FROM affiliate_commissions ac
      JOIN orders o ON ac.order_id = o.id
      ${whereClause}
      ORDER BY ac.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);
    
    res.json({
      commissions,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error getting commissions:', error);
    res.status(500).json({ error: 'Failed to get commissions' });
  }
});

/**
 * Get payout history
 * @route GET /api/affiliates/payouts
 * @access Private
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 20)
 * @returns {Object} Paginated payout history
 */
router.get('/payouts', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;
    
    // Get affiliate
    const [affiliates] = await db.execute(
      'SELECT id FROM affiliates WHERE user_id = ?',
      [userId]
    );
    
    if (affiliates.length === 0) {
      return res.status(404).json({ error: 'Not enrolled as affiliate' });
    }
    
    const affiliateId = affiliates[0].id;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count
    const [countResult] = await db.execute(`
      SELECT COUNT(*) as total
      FROM affiliate_payouts
      WHERE affiliate_id = ?
    `, [affiliateId]);
    
    // Get payouts
    const [payouts] = await db.execute(`
      SELECT *
      FROM affiliate_payouts
      WHERE affiliate_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [affiliateId, parseInt(limit), offset]);
    
    res.json({
      payouts,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error getting payouts:', error);
    res.status(500).json({ error: 'Failed to get payouts' });
  }
});

/**
 * Get shareable affiliate links
 * @route GET /api/affiliates/links
 * @access Private
 * @returns {Object} Shareable links for different pages
 */
router.get('/links', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get affiliate
    const [affiliates] = await db.execute(
      'SELECT affiliate_code FROM affiliates WHERE user_id = ? AND status = "active"',
      [userId]
    );
    
    if (affiliates.length === 0) {
      return res.status(404).json({ error: 'Not enrolled as affiliate or account inactive' });
    }
    
    const code = affiliates[0].affiliate_code;
    const baseUrl = process.env.FRONTEND_URL || 'https://brakebee.com';
    
    res.json({
      affiliate_code: code,
      links: {
        homepage: `${baseUrl}?ref=${code}`,
        products: `${baseUrl}/products?ref=${code}`,
        events: `${baseUrl}/events?ref=${code}`,
        artists: `${baseUrl}/artists?ref=${code}`
      },
      usage: 'Add ?ref=' + code + ' to any product, event, or page URL to get credit for referrals'
    });
    
  } catch (error) {
    console.error('Error getting affiliate links:', error);
    res.status(500).json({ error: 'Failed to get affiliate links' });
  }
});

/**
 * Record a referral visit (called by frontend on affiliate link detection)
 * @route POST /api/affiliates/track-visit
 * @access Public (but validates affiliate code)
 * @body {string} affiliate_code - Affiliate code from URL
 * @body {string} landing_url - Page user landed on
 * @body {string} referrer_url - Where user came from
 * @body {string} session_id - Browser session ID
 * @returns {Object} Confirmation of tracking
 */
router.post('/track-visit', async (req, res) => {
  try {
    const { affiliate_code, landing_url, referrer_url, session_id, source_type = 'link', promoter_site_id } = req.body;
    
    if (!affiliate_code && !promoter_site_id) {
      return res.status(400).json({ error: 'affiliate_code or promoter_site_id required' });
    }
    
    let affiliateId;
    let sourceType = source_type;
    
    if (promoter_site_id) {
      // Get affiliate from site
      const [siteAffiliates] = await db.execute(`
        SELECT a.id FROM affiliates a
        JOIN sites s ON s.user_id = a.user_id
        WHERE s.id = ? AND a.status = 'active'
      `, [promoter_site_id]);
      
      if (siteAffiliates.length === 0) {
        return res.status(404).json({ error: 'Site affiliate not found' });
      }
      affiliateId = siteAffiliates[0].id;
      sourceType = 'promoter_site';
    } else {
      // Get affiliate from code
      const [affiliates] = await db.execute(
        'SELECT id FROM affiliates WHERE affiliate_code = ? AND status = "active"',
        [affiliate_code.toUpperCase()]
      );
      
      if (affiliates.length === 0) {
        return res.status(404).json({ error: 'Affiliate not found' });
      }
      affiliateId = affiliates[0].id;
    }
    
    // Hash IP for privacy
    const ipHash = req.ip ? 
      crypto.createHash('sha256').update(req.ip).digest('hex').substring(0, 16) : null;
    
    // Record the visit
    await db.execute(`
      INSERT INTO affiliate_referrals (
        affiliate_id, session_id, source_type, promoter_site_id,
        landing_url, referrer_url, user_agent, ip_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      affiliateId,
      session_id || null,
      sourceType,
      promoter_site_id || null,
      landing_url?.substring(0, 500) || null,
      referrer_url?.substring(0, 500) || null,
      req.headers['user-agent']?.substring(0, 500) || null,
      ipHash
    ]);
    
    res.json({ success: true, tracked: true });
    
  } catch (error) {
    console.error('Error tracking affiliate visit:', error);
    // Don't fail the user experience for tracking errors
    res.json({ success: true, tracked: false });
  }
});

// =====================================================
// ADMIN ENDPOINTS
// =====================================================

/**
 * Get global affiliate settings
 * @route GET /api/affiliates/admin/settings
 * @access Admin only
 * @returns {Object} Global affiliate program settings
 */
router.get('/admin/settings', verifyToken, requireAllAccess, async (req, res) => {
  try {
    const [settings] = await db.execute(
      'SELECT * FROM affiliate_settings WHERE id = 1'
    );
    
    if (settings.length === 0) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    
    res.json(settings[0]);
    
  } catch (error) {
    console.error('Error getting affiliate settings:', error);
    res.status(500).json({ error: 'Failed to get affiliate settings' });
  }
});

/**
 * Update global affiliate settings
 * @route PATCH /api/affiliates/admin/settings
 * @access Admin only
 * @body {number} default_commission_rate - Default % of platform commission
 * @body {number} payout_delay_days - Days before payout eligibility
 * @body {boolean} auto_enroll_promoters - Auto-enroll promoters
 * @returns {Object} Updated settings
 */
router.patch('/admin/settings', verifyToken, requireAllAccess, async (req, res) => {
  try {
    const {
      default_commission_rate,
      payout_delay_days,
      min_payout_amount,
      auto_enroll_promoters,
      auto_enroll_artists,
      auto_enroll_community
    } = req.body;
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    
    if (default_commission_rate !== undefined) {
      updates.push('default_commission_rate = ?');
      params.push(parseFloat(default_commission_rate));
    }
    if (payout_delay_days !== undefined) {
      updates.push('payout_delay_days = ?');
      params.push(parseInt(payout_delay_days));
    }
    if (min_payout_amount !== undefined) {
      updates.push('min_payout_amount = ?');
      params.push(parseFloat(min_payout_amount));
    }
    if (auto_enroll_promoters !== undefined) {
      updates.push('auto_enroll_promoters = ?');
      params.push(auto_enroll_promoters ? 1 : 0);
    }
    if (auto_enroll_artists !== undefined) {
      updates.push('auto_enroll_artists = ?');
      params.push(auto_enroll_artists ? 1 : 0);
    }
    if (auto_enroll_community !== undefined) {
      updates.push('auto_enroll_community = ?');
      params.push(auto_enroll_community ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    updates.push('updated_by = ?');
    params.push(req.userId);
    
    await db.execute(`
      UPDATE affiliate_settings 
      SET ${updates.join(', ')}
      WHERE id = 1
    `, params);
    
    // Return updated settings
    const [settings] = await db.execute(
      'SELECT * FROM affiliate_settings WHERE id = 1'
    );
    
    res.json({
      success: true,
      message: 'Settings updated',
      settings: settings[0]
    });
    
  } catch (error) {
    console.error('Error updating affiliate settings:', error);
    res.status(500).json({ error: 'Failed to update affiliate settings' });
  }
});

/**
 * List all affiliates (admin view)
 * @route GET /api/affiliates/admin/list
 * @access Admin only
 * @query {string} status - Filter by status
 * @query {string} type - Filter by affiliate type
 * @query {string} search - Search by code or user
 * @query {number} page - Page number
 * @query {number} limit - Items per page
 * @returns {Object} Paginated affiliate list
 */
router.get('/admin/list', verifyToken, requireAllAccess, async (req, res) => {
  try {
    const { status, type, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = '1=1';
    const params = [];
    
    if (status) {
      whereClause += ' AND a.status = ?';
      params.push(status);
    }
    if (type) {
      whereClause += ' AND a.affiliate_type = ?';
      params.push(type);
    }
    if (search) {
      whereClause += ' AND (a.affiliate_code LIKE ? OR u.username LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    // Get total count
    const [countResult] = await db.execute(`
      SELECT COUNT(*) as total
      FROM affiliates a
      JOIN users u ON a.user_id = u.id
      WHERE ${whereClause}
    `, params);
    
    // Get affiliates with user info
    // Note: LIMIT/OFFSET must be integers, not placeholders for mysql2
    const [affiliates] = await db.execute(`
      SELECT 
        a.*,
        u.username,
        u.user_type,
        up.first_name,
        up.last_name,
        (SELECT COUNT(*) FROM affiliate_commissions WHERE affiliate_id = a.id) as total_commissions,
        (SELECT SUM(gross_amount) FROM affiliate_commissions WHERE affiliate_id = a.id AND status = 'paid') as total_paid
      FROM affiliates a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `, params);
    
    res.json({
      affiliates,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error listing affiliates:', error);
    res.status(500).json({ error: 'Failed to list affiliates' });
  }
});

/**
 * Get single affiliate details (admin view)
 * @route GET /api/affiliates/admin/:id
 * @access Admin only
 * @returns {Object} Full affiliate details with stats
 */
router.get('/admin/:id', verifyToken, requireAllAccess, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [affiliates] = await db.execute(`
      SELECT 
        a.*,
        u.username,
        u.user_type,
        up.first_name,
        up.last_name,
        vs.stripe_account_id as vendor_stripe_account
      FROM affiliates a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN vendor_settings vs ON u.id = vs.vendor_id
      WHERE a.id = ?
    `, [id]);
    
    if (affiliates.length === 0) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }
    
    const affiliate = affiliates[0];
    
    // Get commission summary
    const [commissionSummary] = await db.execute(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(gross_amount) as total_amount
      FROM affiliate_commissions
      WHERE affiliate_id = ?
      GROUP BY status
    `, [id]);
    
    // Get recent activity
    const [recentCommissions] = await db.execute(`
      SELECT ac.*, o.created_at as order_date
      FROM affiliate_commissions ac
      JOIN orders o ON ac.order_id = o.id
      WHERE ac.affiliate_id = ?
      ORDER BY ac.created_at DESC
      LIMIT 20
    `, [id]);
    
    res.json({
      affiliate,
      commission_summary: commissionSummary,
      recent_commissions: recentCommissions
    });
    
  } catch (error) {
    console.error('Error getting affiliate details:', error);
    res.status(500).json({ error: 'Failed to get affiliate details' });
  }
});

/**
 * Get affiliate stats (admin view)
 * @route GET /api/affiliates/admin/:id/stats
 * @access Admin only
 * @returns {Object} Affiliate performance stats
 */
router.get('/admin/:id/stats', verifyToken, requireAllAccess, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get affiliate
    const [affiliates] = await db.execute(
      'SELECT * FROM affiliates WHERE id = ?',
      [id]
    );
    
    if (affiliates.length === 0) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }
    
    const affiliate = affiliates[0];
    
    // Get commission stats
    const [commissionStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_commissions,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN net_amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN net_amount ELSE 0 END), 0) as paid_amount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count
      FROM affiliate_commissions
      WHERE affiliate_id = ?
    `, [id]);
    
    // Get referral stats
    const [referralStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_referrals,
        COUNT(CASE WHEN converted = 1 THEN 1 END) as total_conversions
      FROM affiliate_referrals
      WHERE affiliate_id = ?
    `, [id]);
    
    const stats = commissionStats[0] || {};
    const referrals = referralStats[0] || {};
    
    res.json({
      total_earnings: affiliate.total_earnings,
      pending_balance: affiliate.pending_balance,
      paid_balance: affiliate.paid_balance,
      total_commissions: stats.total_commissions || 0,
      pending_count: stats.pending_count || 0,
      paid_count: stats.paid_count || 0,
      total_referrals: referrals.total_referrals || 0,
      total_conversions: referrals.total_conversions || 0,
      conversion_rate: referrals.total_referrals > 0 
        ? referrals.total_conversions / referrals.total_referrals 
        : 0
    });
    
  } catch (error) {
    console.error('Error fetching affiliate stats:', error);
    res.status(500).json({ error: 'Failed to fetch affiliate stats' });
  }
});

/**
 * Update affiliate (admin)
 * @route PATCH /api/affiliates/admin/:id
 * @access Admin only
 * @body {number} commission_rate - Custom commission rate
 * @body {string} status - Account status
 * @returns {Object} Updated affiliate
 */
router.patch('/admin/:id', verifyToken, requireAllAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { commission_rate, status } = req.body;
    
    const updates = [];
    const params = [];
    
    if (commission_rate !== undefined) {
      updates.push('commission_rate = ?');
      params.push(parseFloat(commission_rate));
    }
    if (status) {
      if (!['active', 'suspended', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updates.push('status = ?');
      params.push(status);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    params.push(id);
    
    await db.execute(`
      UPDATE affiliates 
      SET ${updates.join(', ')}
      WHERE id = ?
    `, params);
    
    // Return updated affiliate
    const [affiliate] = await db.execute(
      'SELECT * FROM affiliates WHERE id = ?',
      [id]
    );
    
    res.json({
      success: true,
      message: 'Affiliate updated',
      affiliate: affiliate[0]
    });
    
  } catch (error) {
    console.error('Error updating affiliate:', error);
    res.status(500).json({ error: 'Failed to update affiliate' });
  }
});

/**
 * Get affiliate program report (admin)
 * @route GET /api/affiliates/admin/report
 * @access Admin only
 * @query {string} period - Report period (e.g., '2026-01')
 * @returns {Object} Program-wide statistics
 */
router.get('/admin/report', verifyToken, requireAllAccess, async (req, res) => {
  try {
    const { period } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (period) {
      dateFilter = 'AND DATE_FORMAT(ac.created_at, "%Y-%m") = ?';
      params.push(period);
    }
    
    // Overall stats
    const [overallStats] = await db.execute(`
      SELECT 
        COUNT(DISTINCT a.id) as total_affiliates,
        COUNT(DISTINCT CASE WHEN a.status = 'active' THEN a.id END) as active_affiliates,
        (SELECT COUNT(*) FROM affiliate_commissions ac WHERE 1=1 ${dateFilter}) as total_commissions,
        (SELECT COALESCE(SUM(gross_amount), 0) FROM affiliate_commissions ac WHERE 1=1 ${dateFilter}) as total_commission_value,
        (SELECT COALESCE(SUM(gross_amount), 0) FROM affiliate_commissions ac WHERE status = 'paid' ${dateFilter}) as total_paid_out,
        (SELECT COALESCE(SUM(gross_amount), 0) FROM affiliate_commissions ac WHERE status = 'pending' ${dateFilter}) as total_pending
      FROM affiliates a
    `, params.length > 0 ? [params[0], params[0], params[0]] : []);
    
    // Top affiliates
    const [topAffiliates] = await db.execute(`
      SELECT 
        a.id,
        a.affiliate_code,
        a.affiliate_type,
        u.username,
        up.first_name,
        up.last_name,
        COUNT(ac.id) as commission_count,
        COALESCE(SUM(ac.gross_amount), 0) as total_earned
      FROM affiliates a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN affiliate_commissions ac ON a.id = ac.affiliate_id
      WHERE a.status = 'active'
      GROUP BY a.id
      ORDER BY total_earned DESC
      LIMIT 10
    `);
    
    // By type breakdown
    const [byType] = await db.execute(`
      SELECT 
        a.affiliate_type,
        COUNT(DISTINCT a.id) as affiliate_count,
        COUNT(ac.id) as commission_count,
        COALESCE(SUM(ac.gross_amount), 0) as total_value
      FROM affiliates a
      LEFT JOIN affiliate_commissions ac ON a.id = ac.affiliate_id
      GROUP BY a.affiliate_type
    `);
    
    res.json({
      period: period || 'all_time',
      overall: overallStats[0],
      top_affiliates: topAffiliates,
      by_type: byType
    });
    
  } catch (error) {
    console.error('Error generating affiliate report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;
