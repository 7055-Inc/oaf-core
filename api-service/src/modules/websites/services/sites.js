/**
 * Websites module - sites service
 * Business logic for site CRUD, customizations, templates, addons.
 */

const db = require('../../../../config/db');
const { getTierLimits } = require('../../../../../lib/websites/tierConfig');
const { sanitizeCSS } = require('../utils/cssSanitizer');
const { getCached, setCache, deleteCache, deleteCachePattern } = require('../../../../config/redis');

async function getMySites(userId) {
  const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
  const [permissions] = await db.query('SELECT sites FROM user_permissions WHERE user_id = ?', [userId]);
  const hasSitesPermission = permissions[0]?.sites === 1;
  const isArtistOrAdmin = user[0]?.user_type === 'artist' || user[0]?.user_type === 'admin';
  if (!hasSitesPermission && !isArtistOrAdmin) {
    const err = new Error('Access denied. Sites permission required.');
    err.statusCode = 403;
    throw err;
  }
  const [sites] = await db.query('SELECT * FROM sites WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  return sites;
}

async function createSite(userId, body) {
  const { site_name, subdomain, site_title, site_description, theme_name = 'default' } = body;
  const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
  if (!user[0] || (user[0].user_type !== 'artist' && user[0].user_type !== 'admin')) {
    const err = new Error('Only artists and admins can create sites');
    err.statusCode = 403;
    throw err;
  }
  if (!site_name || !subdomain) {
    const err = new Error('site_name and subdomain are required');
    err.statusCode = 400;
    throw err;
  }
  const subdomainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
  if (!subdomainRegex.test(subdomain) || subdomain.length < 3 || subdomain.length > 63) {
    const err = new Error('Invalid subdomain format');
    err.statusCode = 400;
    throw err;
  }
  const [existingSubdomain] = await db.query('SELECT id FROM sites WHERE subdomain = ?', [subdomain]);
  if (existingSubdomain.length > 0) {
    const err = new Error('Subdomain already exists');
    err.statusCode = 400;
    throw err;
  }
  if (user[0].user_type !== 'admin') {
    const [subscription] = await db.query(
      'SELECT tier FROM user_subscriptions WHERE user_id = ? AND subscription_type = "websites" AND status = "active" LIMIT 1',
      [userId]
    );
    const userTier = subscription[0]?.tier || 'free';
    const limits = getTierLimits(userTier);
    const siteLimit = limits.max_sites;
    const [existingSites] = await db.query('SELECT COUNT(*) as count FROM sites WHERE user_id = ?', [userId]);
    if (existingSites[0].count >= siteLimit) {
      const err = new Error(siteLimit === 1 ? 'Your current plan allows 1 site. Upgrade to professional plan for unlimited sites.' : `You've reached your site limit of ${siteLimit} sites.`);
      err.statusCode = 400;
      err.current_tier = userTier;
      err.site_limit = siteLimit;
      throw err;
    }
  }
  const [result] = await db.query(
    'INSERT INTO sites (user_id, site_name, subdomain, site_title, site_description, theme_name, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, site_name, subdomain, site_title, site_description, theme_name, 'draft']
  );
  const [newSite] = await db.query('SELECT * FROM sites WHERE id = ?', [result.insertId]);
  return newSite[0];
}

async function updateSite(userId, siteId, body) {
  const { site_name, site_title, site_description, theme_name, status, custom_domain } = body;
  const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
  if (!user[0] || (user[0].user_type !== 'artist' && user[0].user_type !== 'admin')) {
    const err = new Error('Only artists and admins can update sites');
    err.statusCode = 403;
    throw err;
  }
  const [site] = await db.query('SELECT user_id FROM sites WHERE id = ?', [siteId]);
  if (!site[0] || (site[0].user_id !== userId && user[0].user_type !== 'admin')) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  if (custom_domain) {
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(custom_domain)) {
      const err = new Error('Invalid custom domain format');
      err.statusCode = 400;
      throw err;
    }
  }
  if (status === 'active' && user[0].user_type !== 'admin') {
    const [currentSite] = await db.query('SELECT status FROM sites WHERE id = ?', [siteId]);
    if (currentSite[0]?.status !== 'active') {
      const [subscription] = await db.query(
        'SELECT tier FROM user_subscriptions WHERE user_id = ? AND subscription_type = "websites" AND status = "active" LIMIT 1',
        [userId]
      );
      const userTier = subscription[0]?.tier || 'free';
      const limits = getTierLimits(userTier);
      const siteLimit = limits.max_sites;
      const [activeSites] = await db.query(
        'SELECT COUNT(*) as count FROM sites WHERE user_id = ? AND status = "active"',
        [userId]
      );
      if (activeSites[0].count >= siteLimit) {
        const err = new Error(`Your ${userTier} plan allows ${siteLimit} active site${siteLimit === 1 ? '' : 's'}. Please deactivate another site first, or upgrade your plan.`);
        err.statusCode = 400;
        throw err;
      }
    }
  }
  const updateFields = [];
  const updateValues = [];
  if (site_name !== undefined) { updateFields.push('site_name = ?'); updateValues.push(site_name); }
  if (site_title !== undefined) { updateFields.push('site_title = ?'); updateValues.push(site_title); }
  if (site_description !== undefined) { updateFields.push('site_description = ?'); updateValues.push(site_description); }
  if (theme_name !== undefined) { updateFields.push('theme_name = ?'); updateValues.push(theme_name); }
  if (status !== undefined) { updateFields.push('status = ?'); updateValues.push(status); }
  if (custom_domain !== undefined) { updateFields.push('custom_domain = ?'); updateValues.push(custom_domain); }
  updateFields.push('updated_at = NOW()');
  if (updateFields.length === 1) {
    const err = new Error('No fields to update');
    err.statusCode = 400;
    throw err;
  }
  updateValues.push(siteId);
  await db.query(`UPDATE sites SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);
  const [updatedSite] = await db.query('SELECT * FROM sites WHERE id = ?', [siteId]);
  
  // Invalidate cache for this site
  if (updatedSite[0].subdomain) {
    await deleteCache(`site:resolve:${updatedSite[0].subdomain}`);
  }
  if (updatedSite[0].custom_domain) {
    await deleteCache(`site:domain:${updatedSite[0].custom_domain}`);
  }
  
  return updatedSite[0];
}

async function getSiteCustomizations(userId, siteId) {
  // Authorization checks must happen before cache lookup
  const [site] = await db.query('SELECT user_id FROM sites WHERE id = ?', [siteId]);
  if (!site[0]) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
  if (site[0].user_id !== userId && user[0]?.user_type !== 'admin') {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
  
  // Try cache after authorization (30 min TTL)
  const cacheKey = `site:customizations:${siteId}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - query database
  const [customizations] = await db.execute('SELECT * FROM site_customizations WHERE site_id = ?', [siteId]);
  const settings = customizations[0] || {
    text_color: '#374151',
    main_color: '#667eea',
    secondary_color: '#764ba2',
    accent_color: null,
    background_color: null,
    body_font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
    header_font: 'Georgia, "Times New Roman", Times, serif'
  };
  
  // Get template-specific data for the site's current template
  const [siteTemplate] = await db.query('SELECT template_id FROM sites WHERE id = ?', [siteId]);
  if (siteTemplate[0] && siteTemplate[0].template_id) {
    try {
      const templateData = await getTemplateDataForSite(siteId, siteTemplate[0].template_id);
      settings.template_data = templateData;
    } catch (err) {
      // If template data fails to load, just continue without it
      console.error('Failed to load template data:', err);
      settings.template_data = {};
    }
  } else {
    settings.template_data = {};
  }
  
  // Cache result for 30 minutes (1800 seconds)
  await setCache(cacheKey, settings, 1800);
  
  return settings;
}

async function updateSiteCustomizations(userId, siteId, body) {
  const [site] = await db.query('SELECT user_id FROM sites WHERE id = ?', [siteId]);
  if (!site[0]) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
  if (site[0].user_id !== userId && user[0]?.user_type !== 'admin') {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
  const [subscription] = await db.query(
    'SELECT tier FROM user_subscriptions WHERE user_id = ? AND subscription_type = "websites" AND status = "active" LIMIT 1',
    [userId]
  );
  const userTier = subscription[0]?.tier || 'free';
  const limits = getTierLimits(userTier);
  const isAdmin = user[0]?.user_type === 'admin';
  
  const canCustomizeBasic = isAdmin || limits.allow_basic_customization;
  const canCustomizeAdvanced = isAdmin || limits.allow_advanced_customization;
  const canCustomizeProfessional = isAdmin || limits.allow_custom_css;
  
  if (!canCustomizeBasic && !isAdmin) {
    const err = new Error('Your plan does not allow customization. Please upgrade to basic or professional plan.');
    err.statusCode = 403;
    throw err;
  }
  const updateFields = [];
  const updateValues = [];
  const allowed = [
    'text_color', 'main_color', 'secondary_color',
    ...(canCustomizeAdvanced ? [
      'accent_color', 'background_color', 'body_font', 'header_font',
      'button_style', 'button_color', 'border_radius', 'spacing_scale'
    ] : []),
    ...(canCustomizeProfessional ? [
      'h1_font', 'h2_font', 'h3_font', 'h4_font',
      'hero_style', 'navigation_style', 'footer_text', 'google_fonts_loaded'
    ] : [])
  ];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updateFields.push(`${key} = ?`);
      updateValues.push(body[key]);
    }
  }
  
  // Handle custom_css separately with sanitization
  if (body.custom_css !== undefined && canCustomizeProfessional) {
    try {
      const sanitizedCSS = await sanitizeCSS(body.custom_css);
      updateFields.push('custom_css = ?');
      updateValues.push(sanitizedCSS);
    } catch (error) {
      const err = new Error('Invalid CSS: ' + error.message);
      err.statusCode = 400;
      throw err;
    }
  }
  if (updateFields.length === 0) {
    const err = new Error('No valid fields to update');
    err.statusCode = 400;
    throw err;
  }
  const [existing] = await db.execute('SELECT id FROM site_customizations WHERE site_id = ?', [siteId]);
  if (existing.length > 0) {
    await db.execute(
      `UPDATE site_customizations SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE site_id = ?`,
      [...updateValues, siteId]
    );
  } else {
    await db.execute('INSERT INTO site_customizations (site_id) VALUES (?)', [siteId]);
    if (updateFields.length > 0) {
      await db.execute(
        `UPDATE site_customizations SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE site_id = ?`,
        [...updateValues, siteId]
      );
    }
  }
  const [updated] = await db.execute('SELECT * FROM site_customizations WHERE site_id = ?', [siteId]);
  
  // Invalidate customizations cache
  await deleteCache(`site:customizations:${siteId}`);
  
  // Also invalidate site resolution cache since it includes customization colors
  const [siteInfo] = await db.query('SELECT subdomain, custom_domain FROM sites WHERE id = ?', [siteId]);
  if (siteInfo[0]) {
    await deleteCache(`site:resolve:${siteInfo[0].subdomain}`);
    if (siteInfo[0].custom_domain) {
      await deleteCache(`site:domain:${siteInfo[0].custom_domain}`);
    }
  }
  
  return updated[0];
}

async function getTemplates() {
  const [templates] = await db.execute(
    'SELECT id, template_name, template_slug, description, preview_image_url, tier_required FROM website_templates WHERE is_active = 1 ORDER BY display_order ASC, template_name ASC'
  );
  return templates;
}

async function getAddons(userId) {
  const [addons] = await db.execute(`
    SELECT id, addon_name, addon_slug, description, tier_required, monthly_price, user_level, category,
      CASE WHEN user_level = 1 THEN 'user' ELSE 'site' END as addon_scope
    FROM website_addons WHERE is_active = 1 ORDER BY user_level DESC, display_order ASC, addon_name ASC
  `);
  const [userAddons] = await db.execute(
    'SELECT addon_slug FROM user_addons WHERE user_id = ? AND is_active = 1',
    [userId]
  );
  const userAddonSlugs = userAddons.map(ua => ua.addon_slug);
  return addons.map(addon => ({
    ...addon,
    user_already_has: addon.user_level === 1 ? userAddonSlugs.includes(addon.addon_slug) : false
  }));
}

async function enableSiteAddon(userId, siteId, addonId) {
  const [addon] = await db.execute(
    'SELECT id, addon_name, tier_required FROM website_addons WHERE id = ? AND is_active = 1',
    [addonId]
  );
  if (addon.length === 0) {
    const err = new Error('Addon not found');
    err.statusCode = 404;
    throw err;
  }
  const [site] = await db.execute('SELECT user_id FROM sites WHERE id = ?', [siteId]);
  if (!site[0] || site[0].user_id !== userId) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }

  // Tier enforcement: Check if user's subscription tier allows this addon
  const [userInfo] = await db.execute(
    'SELECT user_type FROM users WHERE id = ?',
    [userId]
  );
  
  const isAdmin = userInfo[0] && userInfo[0].user_type === 'admin';
  
  if (!isAdmin) {
    // Get user's current subscription tier
    const [subscription] = await db.execute(
      'SELECT tier FROM user_subscriptions WHERE user_id = ? AND subscription_type = ? AND status = ? LIMIT 1',
      [userId, 'websites', 'active']
    );
    
    const userTier = subscription[0]?.tier || 'free';
    const requiredTier = addon[0].tier_required;
    
    // Define tier hierarchy
    const tierHierarchy = { free: 0, basic: 1, professional: 2 };
    
    const userTierLevel = tierHierarchy[userTier] || 0;
    const requiredTierLevel = tierHierarchy[requiredTier] || 0;
    
    if (userTierLevel < requiredTierLevel) {
      const err = new Error(`This addon requires a ${requiredTier} subscription or higher. Your current tier: ${userTier}`);
      err.statusCode = 403;
      throw err;
    }
  }

  const [existing] = await db.execute(
    'SELECT id FROM site_addons WHERE site_id = ? AND addon_id = ? AND is_active = 1',
    [siteId, addonId]
  );
  if (existing.length > 0) {
    const err = new Error('Addon already active for this site');
    err.statusCode = 400;
    throw err;
  }
  await db.execute(
    'INSERT INTO site_addons (site_id, addon_id, is_active) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE is_active = 1, activated_at = CURRENT_TIMESTAMP',
    [siteId, addonId]
  );
  return { success: true, addon_id: addonId, message: `${addon[0].addon_name} addon activated successfully` };
}

async function disableSiteAddon(userId, siteId, addonId) {
  const [site] = await db.execute('SELECT user_id FROM sites WHERE id = ?', [siteId]);
  if (!site[0] || site[0].user_id !== userId) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  const [result] = await db.execute(
    'UPDATE site_addons SET is_active = 0, deactivated_at = CURRENT_TIMESTAMP WHERE site_id = ? AND addon_id = ?',
    [siteId, addonId]
  );
  if (result.affectedRows === 0) {
    const err = new Error('Addon not found for this site');
    err.statusCode = 404;
    throw err;
  }
  return { success: true, message: 'Addon deactivated successfully' };
}

async function enableUserAddon(userId, addonId) {
  const [addon] = await db.execute(
    'SELECT id, addon_name, addon_slug, user_level FROM website_addons WHERE id = ? AND is_active = 1 AND user_level = 1',
    [addonId]
  );
  if (addon.length === 0) {
    const err = new Error('User-level addon not found');
    err.statusCode = 404;
    throw err;
  }
  const [existing] = await db.execute(
    'SELECT id FROM user_addons WHERE user_id = ? AND addon_slug = ? AND is_active = 1',
    [userId, addon[0].addon_slug]
  );
  if (existing.length > 0) {
    const err = new Error('You already have this add-on activated');
    err.statusCode = 400;
    throw err;
  }
  await db.execute(
    `INSERT INTO user_addons (user_id, addon_slug, subscription_source) VALUES (?, ?, 'marketplace_subscription')
     ON DUPLICATE KEY UPDATE is_active = 1, activated_at = CURRENT_TIMESTAMP, deactivated_at = NULL, subscription_source = 'marketplace_subscription'`,
    [userId, addon[0].addon_slug]
  );
  return { success: true, addon_id: addonId, message: `${addon[0].addon_name} activated successfully` };
}

async function disableUserAddon(userId, addonId) {
  const [addon] = await db.execute(
    'SELECT addon_slug FROM website_addons WHERE id = ? AND is_active = 1 AND user_level = 1',
    [addonId]
  );
  if (addon.length === 0) {
    const err = new Error('User-level addon not found');
    err.statusCode = 404;
    throw err;
  }
  const [result] = await db.execute(
    'UPDATE user_addons SET is_active = 0, deactivated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND addon_slug = ?',
    [userId, addon[0].addon_slug]
  );
  if (result.affectedRows === 0) {
    const err = new Error('Addon not found');
    err.statusCode = 404;
    throw err;
  }
  return { success: true, message: 'Addon deactivated successfully' };
}

async function getAllSites(userId) {
  const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
  if (!user[0] || user[0].user_type !== 'admin') {
    const err = new Error('Admin access required');
    err.statusCode = 403;
    throw err;
  }
  const [sites] = await db.query(`
    SELECT
      s.*,
      u.username,
      up.first_name,
      up.last_name,
      up.display_name,
      COALESCE(up.display_name, NULLIF(TRIM(CONCAT(IFNULL(up.first_name,''), ' ', IFNULL(up.last_name,''))), ''), u.username) AS owner_name
    FROM sites s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE s.status != 'deleted'
    ORDER BY s.created_at DESC
  `);
  return sites;
}

async function enforceLimits(userId) {
  const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
  if (user[0]?.user_type === 'admin') {
    return { success: true, sites_deactivated: 0, tier: 'Admin', site_limit: 999, message: 'Admin accounts have unlimited sites' };
  }
  const [subscription] = await db.query(
    'SELECT tier FROM user_subscriptions WHERE user_id = ? AND subscription_type = "websites" AND status = "active" LIMIT 1',
    [userId]
  );
  const userTier = subscription[0]?.tier || 'free';
  const limits = getTierLimits(userTier);
  const siteLimit = limits.max_sites;
  const [activeSites] = await db.query(
    'SELECT COUNT(*) as count FROM sites WHERE user_id = ? AND status = "active"',
    [userId]
  );
  const activeSiteCount = activeSites[0].count;
  if (activeSiteCount <= siteLimit) {
    return { success: true, sites_deactivated: 0, tier: userTier, site_limit: siteLimit, active_sites: activeSiteCount };
  }
  const sitesToDeactivate = activeSiteCount - siteLimit;
  const [sitesToUpdate] = await db.query(
    'SELECT id FROM sites WHERE user_id = ? AND status = "active" ORDER BY created_at ASC LIMIT ?',
    [userId, sitesToDeactivate]
  );
  const siteIds = sitesToUpdate.map(s => s.id);
  if (siteIds.length > 0) {
    await db.query(
      `UPDATE sites SET status = 'draft' WHERE id IN (${siteIds.map(() => '?').join(',')})`,
      siteIds
    );
  }
  return {
    success: true,
    sites_deactivated: sitesToDeactivate,
    tier: userTier,
    site_limit: siteLimit,
    active_sites: siteLimit,
    message: `Deactivated ${sitesToDeactivate} site${sitesToDeactivate === 1 ? '' : 's'} to match tier limit`
  };
}

// ============================================================================
// DELETE SITE
// ============================================================================

async function deleteSite(userId, siteId) {
  const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
  if (!user[0] || (user[0].user_type !== 'artist' && user[0].user_type !== 'admin')) {
    const err = new Error('Only artists and admins can delete sites');
    err.statusCode = 403;
    throw err;
  }
  const [site] = await db.query('SELECT user_id, subdomain, custom_domain FROM sites WHERE id = ?', [siteId]);
  if (!site[0] || (site[0].user_id !== userId && user[0].user_type !== 'admin')) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  
  // Soft delete by setting status to 'deleted'
  await db.query('UPDATE sites SET status = ?, updated_at = NOW() WHERE id = ?', ['deleted', siteId]);
  
  // Invalidate all caches related to this site
  await deleteCache(`site:resolve:${site[0].subdomain}`);
  await deleteCache(`site:customizations:${siteId}`);
  if (site[0].custom_domain) {
    await deleteCache(`site:domain:${site[0].custom_domain}`);
  }
  
  return { success: true, message: 'Site deleted successfully' };
}

// ============================================================================
// MY SITE ADDONS (user's active addons for their site)
// ============================================================================

async function getMySiteAddons(userId) {
  const [userSite] = await db.execute('SELECT id FROM sites WHERE user_id = ?', [userId]);
  if (userSite.length === 0) {
    const err = new Error('User site not found');
    err.statusCode = 404;
    throw err;
  }
  const siteId = userSite[0].id;
  const [addons] = await db.execute(`
    SELECT wa.id, wa.addon_name, wa.addon_slug, wa.addon_script_path, 
           wa.monthly_price, sa.activated_at
    FROM site_addons sa
    JOIN website_addons wa ON sa.addon_id = wa.id
    WHERE sa.site_id = ? AND sa.is_active = 1 AND wa.is_active = 1
    ORDER BY wa.display_order ASC
  `, [siteId]);
  return addons;
}

// ============================================================================
// PUBLIC: Get site addons for artist storefronts
// ============================================================================

async function getSiteAddonsPublic(siteId) {
  const [site] = await db.execute('SELECT id, user_id FROM sites WHERE id = ? AND status = ?', [siteId, 'active']);
  if (site.length === 0) {
    const err = new Error('Site not found or not active');
    err.statusCode = 404;
    throw err;
  }
  
  // Get user's subscription tier for filtering
  const [subscription] = await db.execute(
    'SELECT tier FROM user_subscriptions WHERE user_id = ? AND subscription_type = ? AND status = ? LIMIT 1',
    [site[0].user_id, 'websites', 'active']
  );
  
  const userTier = subscription[0]?.tier || 'free';
  
  // Define tier hierarchy for filtering
  const tierHierarchy = { free: 0, basic: 1, professional: 2 };
  const userTierLevel = tierHierarchy[userTier] || 0;
  
  // Only show addons that the user's tier qualifies for
  const [addons] = await db.execute(`
    SELECT wa.id, wa.addon_name, wa.addon_slug, wa.addon_script_path, 
           wa.monthly_price, wa.tier_required, sa.activated_at, sa.addon_id, sa.is_active
    FROM site_addons sa
    JOIN website_addons wa ON sa.addon_id = wa.id
    WHERE sa.site_id = ? 
      AND sa.is_active = 1 
      AND wa.is_active = 1
      AND (
        (wa.tier_required = 'free' AND ? >= 0) OR
        (wa.tier_required = 'basic' AND ? >= 1) OR
        (wa.tier_required = 'professional' AND ? >= 2)
      )
    ORDER BY wa.display_order ASC
  `, [siteId, userTierLevel, userTierLevel, userTierLevel]);
  
  return { addons };
}

// ============================================================================
// PUBLIC: Resolve subdomain to site data
// ============================================================================

function getStatusMessage(status) {
  switch (status) {
    case 'draft': return 'This site is currently being set up and will be available soon.';
    case 'inactive': return 'This site is temporarily unavailable. Please check back later.';
    case 'suspended': return 'This site has been temporarily suspended.';
    case 'suspended_violation': return 'This site has been suspended due to policy violations.';
    case 'suspended_finance': return 'This site has been suspended due to payment issues.';
    case 'deleted': return 'This site no longer exists or has been removed.';
    default: return 'This site is currently unavailable.';
  }
}

async function resolveSubdomain(subdomain) {
  // Try cache first (15 min TTL)
  const cacheKey = `site:resolve:${subdomain}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - query database
  const [site] = await db.query(`
    SELECT s.*, u.username, u.user_type, up.first_name, up.last_name, up.bio, up.profile_image_path, up.header_image_path,
           sc.main_color as primary_color, sc.secondary_color, sc.text_color, sc.accent_color, sc.background_color,
           wt.template_slug, wt.template_name
    FROM sites s 
    JOIN users u ON s.user_id = u.id 
    LEFT JOIN user_profiles up ON u.id = up.user_id 
    LEFT JOIN site_customizations sc ON s.id = sc.site_id
    LEFT JOIN website_templates wt ON s.template_id = wt.id
    WHERE s.subdomain = ?
  `, [subdomain]);
  if (!site[0]) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  const siteData = site[0];
  
  // Get template-specific data if template is assigned
  let templateData = {};
  if (siteData.template_id) {
    try {
      templateData = await getTemplateDataForSite(siteData.id, siteData.template_id);
    } catch (err) {
      // If template data fails to load, just continue without it
      console.error('Failed to load template data for subdomain:', err);
    }
  }
  
  let result;
  if (siteData.status !== 'active') {
    result = {
      ...siteData,
      template_data: templateData,
      available: false,
      statusMessage: getStatusMessage(siteData.status)
    };
  } else {
    result = {
      ...siteData,
      template_data: templateData,
      available: true,
      is_promoter_site: siteData.user_type === 'promoter'
    };
  }
  
  // Cache result for 15 minutes (900 seconds)
  await setCache(cacheKey, result, 900);
  
  return result;
}

async function resolveSubdomainProducts(subdomain, query = {}) {
  const { limit = 20, offset = 0, category } = query;
  const [site] = await db.query('SELECT user_id FROM sites WHERE subdomain = ? AND status = ?', [subdomain, 'active']);
  if (!site[0]) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  const userId = site[0].user_id;
  let sql = `
    SELECT p.*, pi.image_path, pi.alt_text, pi.is_primary
    FROM products p
    LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
    WHERE p.vendor_id = ? AND p.status = 'active' AND p.website_catalog_enabled = 1 AND p.parent_id IS NULL
  `;
  const params = [userId];
  if (category) {
    sql += ' AND p.category_id = ?';
    params.push(category);
  }
  sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  const [products] = await db.query(sql, params);
  return products;
}

async function resolveSubdomainArticles(subdomain, query = {}) {
  const { type = 'all', limit = 10, offset = 0 } = query;
  const [site] = await db.query('SELECT user_id FROM sites WHERE subdomain = ? AND status = ?', [subdomain, 'active']);
  if (!site[0]) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  const userId = site[0].user_id;
  let sql = `
    SELECT a.*, ml.file_path as featured_image_path
    FROM articles a
    LEFT JOIN media_library ml ON a.featured_image_id = ml.id
    WHERE a.author_id = ? AND a.status = 'published'
  `;
  const params = [userId];
  if (type === 'menu') {
    sql += ' AND a.site_menu_display = "yes" ORDER BY a.menu_order ASC';
  } else if (type === 'blog') {
    sql += ' AND a.site_blog_display = "yes" ORDER BY a.published_at DESC';
  } else if (type === 'pages') {
    sql += ' AND a.page_type != "blog_post" ORDER BY a.menu_order ASC';
  } else {
    sql += ' ORDER BY a.published_at DESC';
  }
  sql += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  const [articles] = await db.query(sql, params);
  return articles;
}

async function resolveSubdomainCategories(subdomain) {
  const [site] = await db.query('SELECT id, user_id FROM sites WHERE subdomain = ? AND STATUS = ?', [subdomain, 'active']);
  if (!site[0]) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  
  // Use getSiteCategories to respect visibility settings
  const categories = await getSiteCategories(site[0].id);
  return categories;
}

// ============================================================================
// PUBLIC: Get social media links for a site
// ============================================================================

async function resolveSubdomainSocials(subdomain) {
  const [site] = await db.query('SELECT id, user_id FROM sites WHERE subdomain = ? AND status = ?', [subdomain, 'active']);
  if (!site[0]) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  
  const userId = site[0].user_id;
  
  // Try to get business socials from artist_profiles
  const [artistProfiles] = await db.query(
    `SELECT 
      business_social_facebook, 
      business_social_instagram, 
      business_social_tiktok, 
      business_social_twitter, 
      business_social_pinterest
    FROM artist_profiles 
    WHERE user_id = ?`,
    [userId]
  );
  
  // Try to get business socials from promoter_profiles if not found in artist
  const [promoterProfiles] = await db.query(
    `SELECT 
      business_social_facebook, 
      business_social_instagram, 
      business_social_tiktok, 
      business_social_twitter, 
      business_social_pinterest
    FROM promoter_profiles 
    WHERE user_id = ?`,
    [userId]
  );
  
  // Get personal socials from user_profiles as fallback
  const [userProfiles] = await db.query(
    `SELECT 
      social_facebook, 
      social_instagram, 
      social_tiktok, 
      social_twitter, 
      social_pinterest, 
      social_whatsapp
    FROM user_profiles 
    WHERE user_id = ?`,
    [userId]
  );
  
  // Determine which business profile to use (artist takes priority)
  const businessProfile = artistProfiles[0] || promoterProfiles[0];
  const personalProfile = userProfiles[0];
  
  // Build socials object - business first, fallback to personal
  const socials = {
    facebook: (businessProfile?.business_social_facebook || personalProfile?.social_facebook || null),
    instagram: (businessProfile?.business_social_instagram || personalProfile?.social_instagram || null),
    tiktok: (businessProfile?.business_social_tiktok || personalProfile?.social_tiktok || null),
    twitter: (businessProfile?.business_social_twitter || personalProfile?.social_twitter || null),
    pinterest: (businessProfile?.business_social_pinterest || personalProfile?.social_pinterest || null),
    whatsapp: (personalProfile?.social_whatsapp || null) // Only in personal
  };
  
  return { success: true, socials };
}

// ============================================================================
// PUBLIC: Get clipped note for a site
// ============================================================================

async function resolveSubdomainClippedNote(subdomain) {
  const [site] = await db.query('SELECT id FROM sites WHERE subdomain = ? AND status = ?', [subdomain, 'active']);
  if (!site[0]) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  
  const [notes] = await db.query(
    'SELECT title, message, position, background_color, text_color, action_type, action_value FROM site_clipped_notes WHERE site_id = ? AND is_active = 1',
    [site[0].id]
  );
  
  if (!notes[0]) {
    return { success: true, note: null };
  }
  
  return { success: true, note: notes[0] };
}

// ============================================================================
// AUTHENTICATED: Get clipped note for a site
// ============================================================================

async function getSiteClippedNote(userId, siteId) {
  // Verify site ownership
  const [site] = await db.query('SELECT user_id FROM sites WHERE id = ?', [siteId]);
  if (!site[0]) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  
  // Check authorization
  const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
  if (site[0].user_id !== userId && user[0]?.user_type !== 'admin') {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
  
  const [notes] = await db.query(
    'SELECT * FROM site_clipped_notes WHERE site_id = ?',
    [siteId]
  );
  
  return notes[0] || null;
}

// ============================================================================
// AUTHENTICATED: Create or update clipped note for a site
// ============================================================================

async function updateSiteClippedNote(userId, siteId, data) {
  // Verify site ownership
  const [site] = await db.query('SELECT user_id FROM sites WHERE id = ?', [siteId]);
  if (!site[0]) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  
  // Check authorization
  const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
  if (site[0].user_id !== userId && user[0]?.user_type !== 'admin') {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }
  
  const { title, message, position, background_color, text_color, action_type, action_value, is_active } = data;
  
  // Check if note exists
  const [existing] = await db.query('SELECT id FROM site_clipped_notes WHERE site_id = ?', [siteId]);
  
  if (existing[0]) {
    // Update existing note
    await db.query(
      `UPDATE site_clipped_notes 
       SET title = ?, message = ?, position = ?, background_color = ?, text_color = ?, 
           action_type = ?, action_value = ?, is_active = ?, updated_at = NOW()
       WHERE site_id = ?`,
      [title || 'Note', message, position || 'left', background_color || '#055474', 
       text_color || '#ffffff', action_type || 'none', action_value, 
       is_active !== undefined ? is_active : 1, siteId]
    );
  } else {
    // Insert new note
    await db.query(
      `INSERT INTO site_clipped_notes 
       (site_id, title, message, position, background_color, text_color, action_type, action_value, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [siteId, title || 'Note', message, position || 'left', background_color || '#055474',
       text_color || '#ffffff', action_type || 'none', action_value, 
       is_active !== undefined ? is_active : 1]
    );
  }
  
  // Return updated note
  return getSiteClippedNote(userId, siteId);
}

// ============================================================================
// PUBLIC: Check subdomain availability
// ============================================================================

async function checkSubdomainAvailability(subdomain) {
  const subdomainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
  if (!subdomainRegex.test(subdomain) || subdomain.length < 3 || subdomain.length > 63) {
    return { available: false, reason: 'Invalid format' };
  }
  const reserved = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog', 'shop', 'store', 'signup'];
  if (reserved.includes(subdomain.toLowerCase())) {
    return { available: false, reason: 'Reserved subdomain' };
  }
  const [existing] = await db.query('SELECT id FROM sites WHERE subdomain = ?', [subdomain]);
  return { available: existing.length === 0, reason: existing.length > 0 ? 'Already taken' : null };
}

// ============================================================================
// PUBLIC: Resolve custom domain to site
// ============================================================================

async function resolveCustomDomain(domain) {
  // Try cache first (1 hour TTL)
  const cacheKey = `site:domain:${domain}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - query database
  const [sites] = await db.execute(`
    SELECT s.subdomain, s.user_id, s.site_name, s.theme_name 
    FROM sites s 
    WHERE s.custom_domain = ? 
    AND s.domain_validation_status = 'verified' 
    AND s.custom_domain_active = 1
  `, [domain]);
  if (sites.length === 0) {
    const err = new Error('Custom domain not found or not active');
    err.statusCode = 404;
    throw err;
  }
  const site = sites[0];
  const result = {
    subdomain: site.subdomain,
    user_id: site.user_id,
    site_name: site.site_name,
    theme_name: site.theme_name
  };
  
  // Cache result for 1 hour (3600 seconds)
  await setCache(cacheKey, result, 3600);
  
  return result;
}

// ============================================================================
// USER CATEGORIES CRUD
// ============================================================================

/**
 * Check for circular reference in category hierarchy
 * Recursively walks up the parent chain to detect cycles
 * @param {number} userId - User ID for verification
 * @param {number} categoryId - The category being updated
 * @param {number} parentId - The proposed parent ID
 * @returns {Promise<boolean>} - True if circular reference detected
 */
async function checkCircularReference(userId, categoryId, parentId) {
  if (!parentId) return false;
  if (parentId == categoryId) return true;
  
  const [parent] = await db.query(
    'SELECT parent_id FROM user_categories WHERE id = ? AND user_id = ?',
    [parentId, userId]
  );
  
  if (!parent[0]) return false;
  if (!parent[0].parent_id) return false;
  
  // Recursively check up the parent chain
  return await checkCircularReference(userId, categoryId, parent[0].parent_id);
}

async function getUserCategories(userId) {
  const [categories] = await db.query(
    'SELECT * FROM user_categories WHERE user_id = ? ORDER BY display_order ASC, name ASC',
    [userId]
  );
  return categories;
}

async function createUserCategory(userId, body) {
  const { 
    name, 
    description, 
    parent_id, 
    display_order = 0,
    image_url,
    page_title,
    meta_description,
    slug,
    is_visible = true,
    sort_order = 0
  } = body;
  
  if (!name) {
    const err = new Error('Category name is required');
    err.statusCode = 400;
    throw err;
  }
  
  const [existing] = await db.query(
    'SELECT id FROM user_categories WHERE user_id = ? AND name = ?',
    [userId, name]
  );
  if (existing.length > 0) {
    const err = new Error('Category name already exists');
    err.statusCode = 400;
    throw err;
  }
  
  // Auto-generate slug from name if not provided
  let finalSlug = slug;
  if (!finalSlug) {
    finalSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  // Check slug uniqueness per user
  if (finalSlug) {
    const [existingSlug] = await db.query(
      'SELECT id FROM user_categories WHERE user_id = ? AND slug = ?',
      [userId, finalSlug]
    );
    if (existingSlug.length > 0) {
      const err = new Error('Category slug already exists. Please use a different slug.');
      err.statusCode = 400;
      throw err;
    }
  }
  
  if (parent_id) {
    const [parent] = await db.query('SELECT user_id FROM user_categories WHERE id = ?', [parent_id]);
    if (!parent[0] || parent[0].user_id !== userId) {
      const err = new Error('Invalid parent category');
      err.statusCode = 400;
      throw err;
    }
  }
  
  const [result] = await db.query(
    `INSERT INTO user_categories (
      user_id, name, description, parent_id, display_order,
      image_url, page_title, meta_description, slug, is_visible, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId, name, description, parent_id, display_order,
      image_url, page_title, meta_description, finalSlug, is_visible, sort_order
    ]
  );
  
  const [newCategory] = await db.query('SELECT * FROM user_categories WHERE id = ?', [result.insertId]);
  return newCategory[0];
}

async function updateUserCategory(userId, categoryId, body) {
  const { 
    name, 
    description, 
    parent_id, 
    display_order,
    image_url,
    page_title,
    meta_description,
    slug,
    is_visible,
    sort_order
  } = body;
  
  const [category] = await db.query('SELECT user_id FROM user_categories WHERE id = ?', [categoryId]);
  if (!category[0] || category[0].user_id !== userId) {
    const err = new Error('Category not found');
    err.statusCode = 404;
    throw err;
  }
  
  // Check for circular reference recursively
  if (parent_id) {
    const hasCircular = await checkCircularReference(userId, categoryId, parent_id);
    if (hasCircular) {
      const err = new Error('Cannot create circular category reference. This would create an infinite loop in the category hierarchy.');
      err.statusCode = 400;
      throw err;
    }
  }
  
  // Auto-generate slug from name if slug is empty and name is provided
  let finalSlug = slug;
  if (name && !slug && slug !== null) {
    finalSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  // Check slug uniqueness per user (excluding current category)
  if (finalSlug) {
    const [existingSlug] = await db.query(
      'SELECT id FROM user_categories WHERE user_id = ? AND slug = ? AND id != ?',
      [userId, finalSlug, categoryId]
    );
    if (existingSlug.length > 0) {
      const err = new Error('Category slug already exists. Please use a different slug.');
      err.statusCode = 400;
      throw err;
    }
  }
  
  // Build dynamic update query based on provided fields
  const updates = [];
  const values = [];
  
  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    values.push(description);
  }
  if (parent_id !== undefined) {
    updates.push('parent_id = ?');
    values.push(parent_id);
  }
  if (display_order !== undefined) {
    updates.push('display_order = ?');
    values.push(display_order);
  }
  if (image_url !== undefined) {
    updates.push('image_url = ?');
    values.push(image_url);
  }
  if (page_title !== undefined) {
    updates.push('page_title = ?');
    values.push(page_title);
  }
  if (meta_description !== undefined) {
    updates.push('meta_description = ?');
    values.push(meta_description);
  }
  if (finalSlug !== undefined) {
    updates.push('slug = ?');
    values.push(finalSlug);
  }
  if (is_visible !== undefined) {
    updates.push('is_visible = ?');
    values.push(is_visible);
  }
  if (sort_order !== undefined) {
    updates.push('sort_order = ?');
    values.push(sort_order);
  }
  
  updates.push('updated_at = NOW()');
  values.push(categoryId);
  
  await db.query(
    `UPDATE user_categories SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
  
  const [updatedCategory] = await db.query('SELECT * FROM user_categories WHERE id = ?', [categoryId]);
  return updatedCategory[0];
}

async function deleteUserCategory(userId, categoryId) {
  const [category] = await db.query('SELECT user_id FROM user_categories WHERE id = ?', [categoryId]);
  if (!category[0] || category[0].user_id !== userId) {
    const err = new Error('Category not found');
    err.statusCode = 404;
    throw err;
  }
  const [children] = await db.query('SELECT id FROM user_categories WHERE parent_id = ?', [categoryId]);
  if (children.length > 0) {
    const err = new Error('Cannot delete category with subcategories');
    err.statusCode = 400;
    throw err;
  }
  await db.query('DELETE FROM user_categories WHERE id = ?', [categoryId]);
  return { success: true, message: 'Category deleted successfully' };
}

/**
 * Get user categories as a hierarchical tree structure
 * @param {number} userId - User ID
 * @returns {Promise<Array>} - Array of root categories with nested children
 */
async function getUserCategoriesTree(userId) {
  const [categories] = await db.query(
    'SELECT * FROM user_categories WHERE user_id = ? ORDER BY sort_order ASC, display_order ASC, name ASC',
    [userId]
  );
  
  // Build tree structure
  const categoryMap = {};
  const rootCategories = [];
  
  // First pass: create map of all categories with empty children arrays
  categories.forEach(cat => {
    categoryMap[cat.id] = { ...cat, children: [] };
  });
  
  // Second pass: build parent-child relationships
  categories.forEach(cat => {
    if (cat.parent_id && categoryMap[cat.parent_id]) {
      categoryMap[cat.parent_id].children.push(categoryMap[cat.id]);
    } else {
      rootCategories.push(categoryMap[cat.id]);
    }
  });
  
  return rootCategories;
}

/**
 * Reorder categories by updating display_order
 * @param {number} userId - User ID
 * @param {Array} categoryOrders - Array of {id, display_order} objects
 * @returns {Promise<Object>} - Success response
 */
async function reorderCategories(userId, categoryOrders) {
  if (!Array.isArray(categoryOrders) || categoryOrders.length === 0) {
    const err = new Error('categoryOrders must be a non-empty array');
    err.statusCode = 400;
    throw err;
  }
  
  for (const cat of categoryOrders) {
    if (!cat.id || cat.display_order === undefined) {
      const err = new Error('Each category must have id and display_order');
      err.statusCode = 400;
      throw err;
    }
    
    // Verify ownership
    const [category] = await db.query(
      'SELECT id FROM user_categories WHERE id = ? AND user_id = ?',
      [cat.id, userId]
    );
    
    if (category[0]) {
      await db.query(
        'UPDATE user_categories SET display_order = ?, updated_at = NOW() WHERE id = ?',
        [cat.display_order, cat.id]
      );
    }
  }
  
  return { success: true, message: 'Categories reordered successfully' };
}

/**
 * Update which categories are visible on a specific site
 * @param {number} userId - User ID (for verification)
 * @param {number} siteId - Site ID
 * @param {Array} visibilityArray - Array of {category_id, is_visible} objects
 * @returns {Promise<Object>} - Success response
 */
async function updateSiteCategoryVisibility(userId, siteId, visibilityArray) {
  // Verify site ownership
  const [site] = await db.query('SELECT user_id FROM sites WHERE id = ?', [siteId]);
  if (!site[0] || site[0].user_id !== userId) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  
  if (!Array.isArray(visibilityArray)) {
    const err = new Error('visibilityArray must be an array');
    err.statusCode = 400;
    throw err;
  }
  
  for (const item of visibilityArray) {
    const { category_id, is_visible } = item;
    
    if (!category_id || is_visible === undefined) {
      const err = new Error('Each item must have category_id and is_visible');
      err.statusCode = 400;
      throw err;
    }
    
    // Verify category belongs to user
    const [category] = await db.query(
      'SELECT id FROM user_categories WHERE id = ? AND user_id = ?',
      [category_id, userId]
    );
    
    if (!category[0]) {
      continue; // Skip categories that don't belong to user
    }
    
    // Insert or update visibility record
    await db.query(
      `INSERT INTO site_categories_visible (site_id, category_id, is_visible) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE is_visible = ?, updated_at = NOW()`,
      [siteId, category_id, is_visible, is_visible]
    );
  }
  
  // Clear cache for this site
  await deleteCachePattern(`site:${siteId}:*`);
  
  return { success: true, message: 'Category visibility updated successfully' };
}

/**
 * Get categories for a specific site (filtered by visibility)
 * @param {number} siteId - Site ID
 * @returns {Promise<Array>} - Array of visible categories for this site
 */
async function getSiteCategories(siteId) {
  const [site] = await db.query('SELECT user_id FROM sites WHERE id = ?', [siteId]);
  if (!site[0]) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  
  // Get all user categories that are:
  // 1. Marked as visible (is_visible = TRUE)
  // 2. Either have no visibility rule for this site, or are marked visible for this site
  const [categories] = await db.query(
    `SELECT uc.* 
     FROM user_categories uc
     LEFT JOIN site_categories_visible scv ON uc.id = scv.category_id AND scv.site_id = ?
     WHERE uc.user_id = ? 
       AND uc.is_visible = TRUE
       AND (scv.id IS NULL OR scv.is_visible = TRUE)
     ORDER BY uc.sort_order ASC, uc.display_order ASC, uc.name ASC`,
    [siteId, site[0].user_id]
  );
  
  return categories;
}

// ============================================================================
// TEMPLATES (single get, apply, admin create)
// ============================================================================

async function getTemplate(templateId) {
  const [template] = await db.execute(
    'SELECT * FROM website_templates WHERE id = ? AND is_active = 1',
    [templateId]
  );
  if (template.length === 0) {
    const err = new Error('Template not found');
    err.statusCode = 404;
    throw err;
  }
  return template[0];
}

async function applyTemplate(userId, templateId) {
  const [template] = await db.execute(
    'SELECT id, tier_required FROM website_templates WHERE id = ? AND is_active = 1',
    [templateId]
  );
  if (template.length === 0) {
    const err = new Error('Template not found');
    err.statusCode = 404;
    throw err;
  }
  const [userSite] = await db.execute('SELECT id FROM sites WHERE user_id = ?', [userId]);
  if (userSite.length === 0) {
    const err = new Error('User site not found');
    err.statusCode = 404;
    throw err;
  }
  await db.execute('UPDATE sites SET template_id = ? WHERE user_id = ?', [templateId, userId]);
  return { success: true, message: 'Template applied successfully', template_id: templateId };
}

async function createTemplate(userId, body) {
  // Admin only - caller should verify
  const { template_name, template_slug, description, css_file_path, preview_image_url, tier_required = 'free', display_order = 0 } = body;
  if (!template_name || !template_slug || !css_file_path) {
    const err = new Error('Missing required fields');
    err.statusCode = 400;
    throw err;
  }
  try {
    const [result] = await db.execute(`
      INSERT INTO website_templates (template_name, template_slug, description, css_file_path, preview_image_url, tier_required, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [template_name, template_slug, description, css_file_path, preview_image_url, tier_required, display_order]);
    return { success: true, template_id: result.insertId, message: 'Template created successfully' };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      const err = new Error('Template slug already exists');
      err.statusCode = 400;
      throw err;
    }
    throw error;
  }
}

// ============================================================================
// TEMPLATE-SPECIFIC DATA FUNCTIONS
// ============================================================================

/**
 * Load and parse template schema.json file
 * @param {number} templateId - Template ID
 * @returns {object} Parsed schema or default empty schema
 */
async function getTemplateSchema(templateId) {
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    // Get template slug from database
    const [template] = await db.query(
      'SELECT template_slug FROM website_templates WHERE id = ?',
      [templateId]
    );
    
    if (!template[0]) {
      const err = new Error('Template not found');
      err.statusCode = 404;
      throw err;
    }
    
    const templateSlug = template[0].template_slug;
    const schemaPath = path.join(__dirname, '../../../../../public/templates', templateSlug, 'schema.json');
    
    // Try to read schema file
    try {
      const schemaContent = await fs.readFile(schemaPath, 'utf8');
      const schema = JSON.parse(schemaContent);
      return schema;
    } catch (fileError) {
      // File doesn't exist or invalid JSON - return default empty schema
      return {
        template_slug: templateSlug,
        template_name: template[0].template_name || templateSlug,
        description: '',
        version: '1.0.0',
        custom_fields: []
      };
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Get template-specific data for a site and template
 * @param {number} siteId - Site ID
 * @param {number} templateId - Template ID
 * @returns {object} Field key/value pairs
 */
async function getTemplateDataForSite(siteId, templateId) {
  const [rows] = await db.query(
    'SELECT field_key, field_value FROM site_template_data WHERE site_id = ? AND template_id = ?',
    [siteId, templateId]
  );
  
  // Convert array of rows to key-value object
  const data = {};
  rows.forEach(row => {
    data[row.field_key] = row.field_value;
  });
  
  return data;
}

/**
 * Update template-specific data for a site
 * @param {number} siteId - Site ID
 * @param {number} templateId - Template ID
 * @param {object} fieldData - Object with field_key: field_value pairs
 * @returns {object} Success response
 */
async function updateTemplateDataForSite(siteId, templateId, fieldData) {
  // Validate that site exists and get user_id for tier checking
  const [site] = await db.query('SELECT user_id FROM sites WHERE id = ?', [siteId]);
  if (!site[0]) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  
  // Get user's tier
  const userId = site[0].user_id;
  const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
  const isAdmin = user[0]?.user_type === 'admin';
  
  const [subscription] = await db.query(
    'SELECT tier FROM user_subscriptions WHERE user_id = ? AND subscription_type = "websites" AND status = "active" LIMIT 1',
    [userId]
  );
  const userTier = subscription[0]?.tier || 'free';
  
  // Get template schema for validation
  const schema = await getTemplateSchema(templateId);
  
  // Validate field data against schema
  await validateTemplateData(templateId, fieldData, userTier, isAdmin);
  
  // Perform batch upsert for all fields
  if (Object.keys(fieldData).length === 0) {
    return { success: true, message: 'No fields to update' };
  }
  
  // Use INSERT ... ON DUPLICATE KEY UPDATE for efficient upsert
  for (const [fieldKey, fieldValue] of Object.entries(fieldData)) {
    await db.query(
      `INSERT INTO site_template_data (site_id, template_id, field_key, field_value) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE field_value = ?, updated_at = CURRENT_TIMESTAMP`,
      [siteId, templateId, fieldKey, fieldValue, fieldValue]
    );
  }
  
  // Invalidate cache
  await deleteCache(`site:${siteId}:template-data:${templateId}`);
  await deleteCachePattern(`site:resolve:*`);
  
  return { success: true, message: 'Template data updated successfully' };
}

/**
 * Validate template data against schema
 * @param {number} templateId - Template ID
 * @param {object} fieldData - Field data to validate
 * @param {string} userTier - User's subscription tier
 * @param {boolean} isAdmin - Whether user is admin
 * @throws {Error} If validation fails
 */
async function validateTemplateData(templateId, fieldData, userTier, isAdmin) {
  const schema = await getTemplateSchema(templateId);
  
  if (!schema.custom_fields || schema.custom_fields.length === 0) {
    // No custom fields defined - allow empty updates but reject non-empty ones
    if (Object.keys(fieldData).length > 0) {
      const err = new Error('This template does not support custom fields');
      err.statusCode = 400;
      throw err;
    }
    return;
  }
  
  // Build field map for quick lookup
  const fieldMap = {};
  schema.custom_fields.forEach(field => {
    fieldMap[field.key] = field;
  });
  
  // Define tier hierarchy for enforcement
  const tierHierarchy = { free: 0, basic: 1, professional: 2 };
  const userTierLevel = tierHierarchy[userTier] || 0;
  
  // Validate each field in fieldData
  for (const [fieldKey, fieldValue] of Object.entries(fieldData)) {
    const fieldDef = fieldMap[fieldKey];
    
    // Check if field exists in schema
    if (!fieldDef) {
      const err = new Error(`Unknown field: ${fieldKey}`);
      err.statusCode = 400;
      throw err;
    }
    
    // Check tier requirement (skip for admins)
    if (!isAdmin && fieldDef.tier_required) {
      const requiredTierLevel = tierHierarchy[fieldDef.tier_required] || 0;
      if (userTierLevel < requiredTierLevel) {
        const err = new Error(`Field "${fieldDef.label}" requires ${fieldDef.tier_required} tier or higher`);
        err.statusCode = 403;
        throw err;
      }
    }
    
    // Check required fields
    if (fieldDef.required && (!fieldValue || fieldValue.trim() === '')) {
      const err = new Error(`Field "${fieldDef.label}" is required`);
      err.statusCode = 400;
      throw err;
    }
    
    // Type-specific validation
    if (fieldValue && fieldValue.trim() !== '') {
      switch (fieldDef.type) {
        case 'url':
        case 'video_url':
        case 'image_url':
          // Basic URL validation
          try {
            new URL(fieldValue);
          } catch (e) {
            const err = new Error(`Field "${fieldDef.label}" must be a valid URL`);
            err.statusCode = 400;
            throw err;
          }
          break;
        
        case 'number':
          if (isNaN(fieldValue)) {
            const err = new Error(`Field "${fieldDef.label}" must be a number`);
            err.statusCode = 400;
            throw err;
          }
          if (fieldDef.min !== undefined && parseFloat(fieldValue) < fieldDef.min) {
            const err = new Error(`Field "${fieldDef.label}" must be at least ${fieldDef.min}`);
            err.statusCode = 400;
            throw err;
          }
          if (fieldDef.max !== undefined && parseFloat(fieldValue) > fieldDef.max) {
            const err = new Error(`Field "${fieldDef.label}" must be at most ${fieldDef.max}`);
            err.statusCode = 400;
            throw err;
          }
          break;
        
        case 'color':
          // Validate hex color format
          if (!/^#[0-9A-Fa-f]{6}$/.test(fieldValue)) {
            const err = new Error(`Field "${fieldDef.label}" must be a valid hex color (e.g., #FF0000)`);
            err.statusCode = 400;
            throw err;
          }
          break;
        
        case 'select':
          // Validate that value matches one of the options
          if (fieldDef.options && Array.isArray(fieldDef.options)) {
            const validValues = fieldDef.options.map(opt => opt.value);
            if (!validValues.includes(fieldValue)) {
              const err = new Error(`Field "${fieldDef.label}" must be one of: ${validValues.join(', ')}`);
              err.statusCode = 400;
              throw err;
            }
          }
          break;
        
        case 'text':
        case 'textarea':
          // Check max length
          if (fieldDef.max_length && fieldValue.length > fieldDef.max_length) {
            const err = new Error(`Field "${fieldDef.label}" must be ${fieldDef.max_length} characters or less`);
            err.statusCode = 400;
            throw err;
          }
          break;
      }
    }
  }
  
  // Check for missing required fields
  for (const fieldDef of schema.custom_fields) {
    if (fieldDef.required && !fieldData.hasOwnProperty(fieldDef.key)) {
      const err = new Error(`Required field "${fieldDef.label}" is missing`);
      err.statusCode = 400;
      throw err;
    }
  }
}

async function createAddon(userId, body) {
  // Admin only - caller should verify
  const { addon_name, addon_slug, description, addon_script_path, tier_required = 'basic', monthly_price = 0, display_order = 0 } = body;
  if (!addon_name || !addon_slug || !addon_script_path) {
    const err = new Error('Missing required fields');
    err.statusCode = 400;
    throw err;
  }
  try {
    const [result] = await db.execute(`
      INSERT INTO website_addons (addon_name, addon_slug, description, addon_script_path, tier_required, monthly_price, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [addon_name, addon_slug, description, addon_script_path, tier_required, monthly_price, display_order]);
    return { success: true, addon_id: result.insertId, message: 'Addon created successfully' };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      const err = new Error('Addon slug already exists');
      err.statusCode = 400;
      throw err;
    }
    throw error;
  }
}

// ============================================================================
// DISCOUNTS MANAGEMENT
// ============================================================================

async function calculateDiscounts(userId, subscriptionType) {
  if (!subscriptionType) {
    const err = new Error('subscription_type is required');
    err.statusCode = 400;
    throw err;
  }
  const [discounts] = await db.execute(`
    SELECT * FROM discounts 
    WHERE user_id = ? 
    AND subscription_type = ?
    AND is_active = 1 
    AND valid_from <= NOW() 
    AND (valid_until IS NULL OR valid_until >= NOW())
    ORDER BY priority ASC
  `, [userId, subscriptionType]);
  let applicableDiscounts = [];
  let hasNoStackDiscount = false;
  for (const discount of discounts) {
    if (!discount.can_stack) {
      hasNoStackDiscount = true;
      applicableDiscounts = [discount];
      break;
    }
    applicableDiscounts.push(discount);
  }
  return {
    success: true,
    discounts: applicableDiscounts,
    stacking_applied: hasNoStackDiscount ? 'single_discount' : 'stacked_discounts'
  };
}

async function createDiscount(userId, body) {
  // Admin only - caller should verify
  const {
    user_id, subscription_type, discount_code, discount_type, discount_value,
    priority = 10, can_stack = 1, can_chain = 0, valid_from, valid_until
  } = body;
  if (!user_id || !subscription_type || !discount_code || !discount_type || discount_value === undefined) {
    const err = new Error('Missing required fields');
    err.statusCode = 400;
    throw err;
  }
  if (!can_chain) {
    const [existing] = await db.execute(`
      SELECT id FROM discounts 
      WHERE user_id = ? AND subscription_type = ? AND discount_type = ? AND is_active = 1
      AND (valid_until IS NULL OR valid_until >= NOW())
    `, [user_id, subscription_type, discount_type]);
    if (existing.length > 0) {
      const err = new Error('Cannot chain: discount of this type already exists for user');
      err.statusCode = 400;
      throw err;
    }
  }
  const [result] = await db.execute(`
    INSERT INTO discounts (user_id, subscription_type, discount_code, discount_type, discount_value,
      priority, can_stack, can_chain, valid_from, valid_until, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [user_id, subscription_type, discount_code, discount_type, discount_value,
      priority, can_stack, can_chain, valid_from, valid_until, userId]);
  return { success: true, discount_id: result.insertId, message: 'Discount created successfully' };
}

async function deleteDiscount(discountId) {
  // Admin only - caller should verify
  const [result] = await db.execute('DELETE FROM discounts WHERE id = ?', [discountId]);
  if (result.affectedRows === 0) {
    const err = new Error('Discount not found');
    err.statusCode = 404;
    throw err;
  }
  return { success: true, message: 'Discount deleted successfully' };
}

module.exports = {
  getMySites,
  getAllSites,
  createSite,
  updateSite,
  deleteSite,
  getSiteCustomizations,
  updateSiteCustomizations,
  getTemplates,
  getTemplate,
  applyTemplate,
  createTemplate,
  // Template-specific data
  getTemplateSchema,
  getTemplateDataForSite,
  updateTemplateDataForSite,
  validateTemplateData,
  getAddons,
  getMySiteAddons,
  getSiteAddonsPublic,
  enableSiteAddon,
  disableSiteAddon,
  enableUserAddon,
  disableUserAddon,
  createAddon,
  enforceLimits,
  // Public resolve
  resolveSubdomain,
  resolveSubdomainProducts,
  resolveSubdomainArticles,
  resolveSubdomainCategories,
  resolveSubdomainSocials,
  resolveSubdomainClippedNote,
  checkSubdomainAvailability,
  resolveCustomDomain,
  // Clipped notes
  getSiteClippedNote,
  updateSiteClippedNote,
  // User categories
  getUserCategories,
  createUserCategory,
  updateUserCategory,
  deleteUserCategory,
  getUserCategoriesTree,
  reorderCategories,
  updateSiteCategoryVisibility,
  getSiteCategories,
  checkCircularReference,
  // Discounts
  calculateDiscounts,
  createDiscount,
  deleteDiscount
};
