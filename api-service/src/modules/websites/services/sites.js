/**
 * Websites module - sites service
 * Business logic for site CRUD, customizations, templates, addons.
 */

const db = require('../../../../config/db');

const TIER_LIMITS = {
  'Starter Plan': 1,
  'Professional Plan': 1,
  'Business Plan': 999,
  'Promoter Plan': 1,
  'Promoter Business Plan': 999
};

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
    const userTier = subscription[0]?.tier || 'Starter Plan';
    const siteLimit = TIER_LIMITS[userTier] || 1;
    const [existingSites] = await db.query('SELECT COUNT(*) as count FROM sites WHERE user_id = ?', [userId]);
    if (existingSites[0].count >= siteLimit) {
      const err = new Error(siteLimit === 1 ? 'Your current plan allows 1 site. Upgrade to Business Plan or Promoter Business Plan for multiple sites.' : `You've reached your site limit of ${siteLimit} sites.`);
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
      const userTier = subscription[0]?.tier || 'Starter Plan';
      const siteLimit = TIER_LIMITS[userTier] || 1;
      const [activeSites] = await db.query(
        'SELECT COUNT(*) as count FROM sites WHERE user_id = ? AND status = "active"',
        [userId]
      );
      if (activeSites[0].count >= siteLimit) {
        const err = new Error(`Your ${userTier} allows ${siteLimit} active site${siteLimit === 1 ? '' : 's'}. Please deactivate another site first, or upgrade your plan.`);
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
  return updatedSite[0];
}

async function getSiteCustomizations(userId, siteId) {
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
  const [permissions] = await db.execute(
    'SELECT sites, manage_sites, professional_sites FROM user_permissions WHERE user_id = ?',
    [userId]
  );
  const userPerms = permissions[0] || {};
  const isAdmin = user[0]?.user_type === 'admin';
  const canCustomizeBasic = isAdmin || userPerms.sites;
  const canCustomizeAdvanced = isAdmin || userPerms.manage_sites;
  const canCustomizeProfessional = isAdmin || userPerms.professional_sites;
  if (!canCustomizeBasic) {
    const err = new Error('Sites permission required for customization');
    err.statusCode = 403;
    throw err;
  }
  const updateFields = [];
  const updateValues = [];
  const allowed = [
    'text_color', 'main_color', 'secondary_color',
    ...(canCustomizeAdvanced ? ['accent_color', 'background_color', 'body_font', 'header_font'] : []),
    ...(canCustomizeProfessional ? ['h1_font', 'h2_font', 'h3_font', 'h4_font', 'custom_css'] : [])
  ];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updateFields.push(`${key} = ?`);
      updateValues.push(body[key]);
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
  const userTier = subscription[0]?.tier || 'Starter Plan';
  const siteLimit = TIER_LIMITS[userTier] || 1;
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
  const [site] = await db.query('SELECT user_id FROM sites WHERE id = ?', [siteId]);
  if (!site[0] || (site[0].user_id !== userId && user[0].user_type !== 'admin')) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  // Soft delete by setting status to 'deleted'
  await db.query('UPDATE sites SET status = ?, updated_at = NOW() WHERE id = ?', ['deleted', siteId]);
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
  const [site] = await db.execute('SELECT id FROM sites WHERE id = ? AND status = ?', [siteId, 'active']);
  if (site.length === 0) {
    const err = new Error('Site not found or not active');
    err.statusCode = 404;
    throw err;
  }
  const [addons] = await db.execute(`
    SELECT wa.id, wa.addon_name, wa.addon_slug, wa.addon_script_path, 
           wa.monthly_price, sa.activated_at, sa.addon_id, sa.is_active
    FROM site_addons sa
    JOIN website_addons wa ON sa.addon_id = wa.id
    WHERE sa.site_id = ? AND sa.is_active = 1 AND wa.is_active = 1
    ORDER BY wa.display_order ASC
  `, [siteId]);
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
  const [site] = await db.query(`
    SELECT s.*, u.username, u.user_type, up.first_name, up.last_name, up.bio, up.profile_image_path, up.header_image_path,
           sc.main_color as primary_color, sc.secondary_color, sc.text_color, sc.accent_color, sc.background_color
    FROM sites s 
    JOIN users u ON s.user_id = u.id 
    LEFT JOIN user_profiles up ON u.id = up.user_id 
    LEFT JOIN site_customizations sc ON s.id = sc.site_id
    WHERE s.subdomain = ?
  `, [subdomain]);
  if (!site[0]) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  const siteData = site[0];
  if (siteData.status !== 'active') {
    return {
      ...siteData,
      available: false,
      statusMessage: getStatusMessage(siteData.status)
    };
  }
  return {
    ...siteData,
    available: true,
    is_promoter_site: siteData.user_type === 'promoter'
  };
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
    WHERE p.user_id = ? AND p.status = 'active' AND p.parent_id IS NULL
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
  const [site] = await db.query('SELECT user_id FROM sites WHERE subdomain = ? AND status = ?', [subdomain, 'active']);
  if (!site[0]) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  const [categories] = await db.query(
    'SELECT * FROM user_categories WHERE user_id = ? ORDER BY display_order ASC, name ASC',
    [site[0].user_id]
  );
  return categories;
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
  return {
    subdomain: site.subdomain,
    user_id: site.user_id,
    site_name: site.site_name,
    theme_name: site.theme_name
  };
}

// ============================================================================
// USER CATEGORIES CRUD
// ============================================================================

async function getUserCategories(userId) {
  const [categories] = await db.query(
    'SELECT * FROM user_categories WHERE user_id = ? ORDER BY display_order ASC, name ASC',
    [userId]
  );
  return categories;
}

async function createUserCategory(userId, body) {
  const { name, description, parent_id, display_order = 0 } = body;
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
  if (parent_id) {
    const [parent] = await db.query('SELECT user_id FROM user_categories WHERE id = ?', [parent_id]);
    if (!parent[0] || parent[0].user_id !== userId) {
      const err = new Error('Invalid parent category');
      err.statusCode = 400;
      throw err;
    }
  }
  const [result] = await db.query(
    'INSERT INTO user_categories (user_id, name, description, parent_id, display_order) VALUES (?, ?, ?, ?, ?)',
    [userId, name, description, parent_id, display_order]
  );
  const [newCategory] = await db.query('SELECT * FROM user_categories WHERE id = ?', [result.insertId]);
  return newCategory[0];
}

async function updateUserCategory(userId, categoryId, body) {
  const { name, description, parent_id, display_order } = body;
  const [category] = await db.query('SELECT user_id FROM user_categories WHERE id = ?', [categoryId]);
  if (!category[0] || category[0].user_id !== userId) {
    const err = new Error('Category not found');
    err.statusCode = 404;
    throw err;
  }
  if (parent_id && parent_id == categoryId) {
    const err = new Error('Category cannot be its own parent');
    err.statusCode = 400;
    throw err;
  }
  await db.query(
    'UPDATE user_categories SET name = ?, description = ?, parent_id = ?, display_order = ?, updated_at = NOW() WHERE id = ?',
    [name, description, parent_id, display_order, categoryId]
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
  checkSubdomainAvailability,
  resolveCustomDomain,
  // User categories
  getUserCategories,
  createUserCategory,
  updateUserCategory,
  deleteUserCategory,
  // Discounts
  calculateDiscounts,
  createDiscount,
  deleteDiscount
};
