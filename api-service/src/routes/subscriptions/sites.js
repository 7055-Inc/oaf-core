const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const verifyToken = require('../../middleware/jwt');


// ============================================================================
// SITES SUBSCRIPTION ROUTES
// ============================================================================
// All routes for website/sites subscription management
// Modular approach - all sites subscription logic contained here

// GET /subscriptions/sites/terms-check - Check if user accepted latest sites terms
router.get('/terms-check', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get latest sites terms version
    const [latestTerms] = await db.execute(`
      SELECT id, title, content, version, created_at
      FROM terms_versions 
      WHERE subscription_type = 'sites' AND is_current = 1
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (latestTerms.length === 0) {
      return res.status(404).json({ error: 'No sites terms found' });
    }

    const terms = latestTerms[0];

    // Check if user has accepted these terms
    const [acceptance] = await db.execute(`
      SELECT id, accepted_at
      FROM user_terms_acceptance 
      WHERE user_id = ? AND subscription_type = 'sites' AND terms_version_id = ?
    `, [userId, terms.id]);

    const termsAccepted = acceptance.length > 0;

    res.json({
      success: true,
      termsAccepted,
      latestTerms: {
        id: terms.id,
        title: terms.title,
        content: terms.content,
        version: terms.version,
        created_at: terms.created_at
      }
    });

  } catch (error) {
    console.error('Error checking sites terms acceptance:', error);
    res.status(500).json({ error: 'Failed to check terms acceptance' });
  }
});

// POST /subscriptions/sites/terms-accept - Record terms acceptance
router.post('/terms-accept', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { terms_version_id } = req.body;

    if (!terms_version_id) {
      return res.status(400).json({ error: 'terms_version_id is required' });
    }

    // Verify the terms version exists and is for sites
    const [termsCheck] = await db.execute(`
      SELECT id FROM terms_versions 
      WHERE id = ? AND subscription_type = 'sites'
    `, [terms_version_id]);

    if (termsCheck.length === 0) {
      return res.status(404).json({ error: 'Invalid terms version' });
    }

    // Record acceptance (INSERT IGNORE to handle duplicate attempts)
    await db.execute(`
      INSERT IGNORE INTO user_terms_acceptance (user_id, subscription_type, terms_version_id, accepted_at)
      VALUES (?, 'sites', ?, NOW())
    `, [userId, terms_version_id]);

    res.json({
      success: true,
      message: 'Terms acceptance recorded successfully'
    });

  } catch (error) {
    console.error('Error recording sites terms acceptance:', error);
    res.status(500).json({ error: 'Failed to record terms acceptance' });
  }
});

// GET /subscriptions/sites/my-sites - Get user's websites for dashboard
router.get('/my-sites', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Get user's sites with template information
    const [sites] = await db.execute(`
      SELECT s.id, s.site_name, s.custom_domain, s.subdomain, s.status, s.created_at,
             wt.template_name, wt.template_slug
      FROM sites s
      LEFT JOIN website_templates wt ON s.template_id = wt.id
      WHERE s.user_id = ? AND s.status != 'deleted'
      ORDER BY s.created_at DESC
    `, [userId]);

    // Format sites data for frontend
    const formattedSites = sites.map(site => ({
      id: site.id,
      site_name: site.site_name,
      domain: site.custom_domain || `${site.subdomain}.onlineartfestival.com`,
      status: site.status,
      template_name: site.template_name || 'Default',
      created_at: site.created_at
    }));

    res.json({
      success: true,
      sites: formattedSites
    });

  } catch (error) {
    console.error('Error fetching user sites:', error);
    res.status(500).json({ error: 'Failed to fetch user sites' });
  }
});

// POST /subscriptions/sites/signup - Create subscription and grant sites permission
router.post('/signup', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { 
      plan_name, 
      permissions: requestedPermissions, 
      selected_addons, 
      pricing, 
      payment_method_id,
      auto_applied_discount
    } = req.body;

    if (!plan_name) {
      return res.status(400).json({ error: 'plan_name is required' });
    }

    // Validate plan name
    const validPlans = ['Starter Plan', 'Professional Plan', 'Business Plan', 'Promoter Plan'];
    if (!validPlans.includes(plan_name)) {
      return res.status(400).json({ error: 'Invalid plan name' });
    }

    // Check if user already has sites permission
    const [existingPermission] = await db.execute(`
      SELECT sites FROM user_permissions WHERE user_id = ?
    `, [userId]);

    if (existingPermission.length > 0 && existingPermission[0].sites) {
      return res.status(400).json({ error: 'User already has active sites subscription' });
    }

    // TODO: Integrate with Stripe for payment processing
    // For now, we'll simulate successful payment and grant permissions

    // Grant requested permissions
    const permissionsToGrant = requestedPermissions || ['sites'];
    
    if (existingPermission.length > 0) {
      // Update existing permission record
      const updateFields = [];
      const updateValues = [];
      
      if (permissionsToGrant.includes('sites')) {
        updateFields.push('sites = 1');
      }
      if (permissionsToGrant.includes('manage_sites')) {
        updateFields.push('manage_sites = 1');
      }
      
      if (updateFields.length > 0) {
        await db.execute(`
          UPDATE user_permissions SET ${updateFields.join(', ')} WHERE user_id = ?
        `, [userId]);
      }
    } else {
      // Create new permission record
      const sites = permissionsToGrant.includes('sites') ? 1 : 0;
      const manageSites = permissionsToGrant.includes('manage_sites') ? 1 : 0;
      
      await db.execute(`
        INSERT INTO user_permissions (user_id, sites, manage_sites) VALUES (?, ?, ?)
      `, [userId, sites, manageSites]);
    }

    // Add selected addons to user's sites (when they create their first site)
    if (selected_addons && selected_addons.length > 0) {
      // Store selected addons for when user creates their first site
      // For now, we'll skip logging - in full implementation, we'd store in a pending_addons table
    }

    // Apply discount if provided
    if (auto_applied_discount) {
      // TODO: Store discount application in database
    }

    // Get updated user permissions for response
    const [updatedPermissions] = await db.execute(`
      SELECT * FROM user_permissions WHERE user_id = ?
    `, [userId]);

    const permissions = [];
    if (updatedPermissions.length > 0) {
      const perms = updatedPermissions[0];
      if (perms.vendor) permissions.push('vendor');
      if (perms.events) permissions.push('events');
      if (perms.stripe_connect) permissions.push('stripe_connect');
      if (perms.manage_sites) permissions.push('manage_sites');
      if (perms.manage_content) permissions.push('manage_content');
      if (perms.manage_system) permissions.push('manage_system');
      if (perms.verified) permissions.push('verified');
      if (perms.sites) permissions.push('sites');
      if (perms.shipping) permissions.push('shipping');
    }

    res.json({
      success: true,
      message: `Successfully subscribed to ${plan_name}`,
      subscription_id: `sites_${userId}_${Date.now()}`, // Temporary ID until Stripe integration
      permissions: permissions,
      plan_name: plan_name,
      selected_addons: selected_addons || [],
      total_price: pricing?.total || 0,
      discount_applied: auto_applied_discount?.amount || 0
    });

  } catch (error) {
    console.error('Error creating sites subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// POST /subscriptions/sites/cancel - Cancel subscription and revoke sites permission
router.post('/cancel', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Check if user has sites permission
    const [existingPermission] = await db.execute(`
      SELECT sites FROM user_permissions WHERE user_id = ?
    `, [userId]);

    if (existingPermission.length === 0 || !existingPermission[0].sites) {
      return res.status(400).json({ error: 'No active sites subscription found' });
    }

    // TODO: Cancel Stripe subscription when integrated

    // Revoke sites permission
    await db.execute(`
      UPDATE user_permissions SET sites = 0 WHERE user_id = ?
    `, [userId]);

    res.json({
      success: true,
      message: 'Sites subscription cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling sites subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// GET /subscriptions/sites/status - Get current subscription status (bonus endpoint)
router.get('/status', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Check sites permission
    const [permission] = await db.execute(`
      SELECT sites FROM user_permissions WHERE user_id = ?
    `, [userId]);

    const hasSubscription = permission.length > 0 && permission[0].sites;

    // If has subscription, get sites count
    let sitesCount = 0;
    if (hasSubscription) {
      const [sites] = await db.execute(`
        SELECT COUNT(*) as count FROM sites WHERE user_id = ? AND status != 'deleted'
      `, [userId]);
      sitesCount = sites[0].count;
    }

    res.json({
      success: true,
      hasSubscription,
      sitesCount,
      status: hasSubscription ? 'active' : 'inactive'
    });

  } catch (error) {
    console.error('Error getting sites subscription status:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

module.exports = router;
