/**
 * Persona Service
 * Handles artist persona (sub-profile) operations
 */

const db = require('../../../../config/db');

/**
 * List all active personas for an artist
 * @param {number} artistId - Artist user ID
 * @returns {Promise<Array>} Personas
 */
async function list(artistId) {
  const [personas] = await db.execute(`
    SELECT id, persona_name, display_name, bio, specialty, 
           portfolio_url, website_url, instagram_handle, facebook_url, 
           profile_image_url, is_default, is_active, created_at, updated_at
    FROM artist_personas 
    WHERE artist_id = ? AND is_active = 1
    ORDER BY is_default DESC, persona_name ASC
  `, [artistId]);
  
  return personas;
}

/**
 * Get single persona by ID
 * @param {number} personaId - Persona ID
 * @param {number} artistId - Artist user ID (for ownership check)
 * @returns {Promise<Object|null>} Persona or null
 */
async function findById(personaId, artistId) {
  const [personas] = await db.execute(`
    SELECT * FROM artist_personas 
    WHERE id = ? AND artist_id = ? AND is_active = 1
  `, [personaId, artistId]);
  
  return personas[0] || null;
}

/**
 * Check if a persona name already exists for an artist
 * @param {number} artistId - Artist user ID
 * @param {string} personaName - Persona name to check
 * @param {number} excludeId - Persona ID to exclude (for updates)
 * @returns {Promise<boolean>} True if exists
 */
async function nameExists(artistId, personaName, excludeId = null) {
  let query = `
    SELECT id FROM artist_personas 
    WHERE artist_id = ? AND persona_name = ? AND is_active = 1
  `;
  const params = [artistId, personaName.trim()];
  
  if (excludeId) {
    query += ' AND id != ?';
    params.push(excludeId);
  }
  
  const [existing] = await db.execute(query, params);
  return existing.length > 0;
}

/**
 * Create a new persona
 * @param {number} artistId - Artist user ID
 * @param {Object} personaData - Persona data
 * @returns {Promise<Object>} Created persona
 */
async function create(artistId, personaData) {
  const {
    persona_name,
    display_name,
    bio,
    specialty,
    portfolio_url,
    website_url,
    instagram_handle,
    facebook_url,
    profile_image_url,
    is_default
  } = personaData;
  
  // Validate required fields
  if (!persona_name?.trim()) {
    throw new Error('Persona name is required');
  }
  if (!display_name?.trim()) {
    throw new Error('Display name is required');
  }
  
  // Check for duplicate name
  if (await nameExists(artistId, persona_name)) {
    throw new Error('You already have a persona with this name');
  }
  
  // If setting as default, unset existing defaults
  if (is_default) {
    await db.execute(`
      UPDATE artist_personas 
      SET is_default = 0 
      WHERE artist_id = ? AND is_active = 1
    `, [artistId]);
  }
  
  const [result] = await db.execute(`
    INSERT INTO artist_personas (
      artist_id, persona_name, display_name, bio, specialty, 
      portfolio_url, website_url, instagram_handle, facebook_url, 
      profile_image_url, is_default
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    artistId,
    persona_name.trim(),
    display_name.trim(),
    bio || null,
    specialty || null,
    portfolio_url || null,
    website_url || null,
    instagram_handle || null,
    facebook_url || null,
    profile_image_url || null,
    is_default || false
  ]);
  
  return {
    id: result.insertId,
    persona_name: persona_name.trim(),
    display_name: display_name.trim(),
    is_default: is_default || false,
  };
}

/**
 * Update a persona
 * @param {number} personaId - Persona ID
 * @param {number} artistId - Artist user ID (for ownership check)
 * @param {Object} personaData - Updated persona data
 * @returns {Promise<boolean>} Success
 */
async function update(personaId, artistId, personaData) {
  const {
    persona_name,
    display_name,
    bio,
    specialty,
    portfolio_url,
    website_url,
    instagram_handle,
    facebook_url,
    profile_image_url,
    is_default
  } = personaData;
  
  // Verify ownership
  const existing = await findById(personaId, artistId);
  if (!existing) {
    throw new Error('Persona not found');
  }
  
  // Validate required fields
  if (!persona_name?.trim()) {
    throw new Error('Persona name is required');
  }
  if (!display_name?.trim()) {
    throw new Error('Display name is required');
  }
  
  // Check for duplicate name (excluding current)
  if (await nameExists(artistId, persona_name, personaId)) {
    throw new Error('You already have another persona with this name');
  }
  
  // If setting as default, unset existing defaults
  if (is_default) {
    await db.execute(`
      UPDATE artist_personas 
      SET is_default = 0 
      WHERE artist_id = ? AND id != ? AND is_active = 1
    `, [artistId, personaId]);
  }
  
  const [result] = await db.execute(`
    UPDATE artist_personas 
    SET persona_name = ?, display_name = ?, bio = ?, specialty = ?, 
        portfolio_url = ?, website_url = ?, instagram_handle = ?, 
        facebook_url = ?, profile_image_url = ?, is_default = ?
    WHERE id = ? AND artist_id = ?
  `, [
    persona_name.trim(),
    display_name.trim(),
    bio || null,
    specialty || null,
    portfolio_url || null,
    website_url || null,
    instagram_handle || null,
    facebook_url || null,
    profile_image_url || null,
    is_default || false,
    personaId,
    artistId
  ]);
  
  return result.affectedRows > 0;
}

/**
 * Set a persona as default
 * @param {number} personaId - Persona ID
 * @param {number} artistId - Artist user ID
 * @returns {Promise<boolean>} Success
 */
async function setDefault(personaId, artistId) {
  // Verify ownership
  const existing = await findById(personaId, artistId);
  if (!existing) {
    throw new Error('Persona not found');
  }
  
  // Unset all defaults
  await db.execute(`
    UPDATE artist_personas 
    SET is_default = 0 
    WHERE artist_id = ? AND is_active = 1
  `, [artistId]);
  
  // Set this one as default
  const [result] = await db.execute(`
    UPDATE artist_personas 
    SET is_default = 1 
    WHERE id = ? AND artist_id = ?
  `, [personaId, artistId]);
  
  return result.affectedRows > 0;
}

/**
 * Check if persona is used in any applications
 * @param {number} personaId - Persona ID
 * @returns {Promise<boolean>} True if used
 */
async function isUsedInApplications(personaId) {
  const [apps] = await db.execute(`
    SELECT COUNT(*) as count FROM event_applications 
    WHERE persona_id = ?
  `, [personaId]);
  
  return apps[0].count > 0;
}

/**
 * Soft delete a persona
 * @param {number} personaId - Persona ID
 * @param {number} artistId - Artist user ID
 * @returns {Promise<boolean>} Success
 */
async function softDelete(personaId, artistId) {
  // Verify ownership
  const existing = await findById(personaId, artistId);
  if (!existing) {
    throw new Error('Persona not found');
  }
  
  // Check if used in applications
  if (await isUsedInApplications(personaId)) {
    throw new Error('Cannot delete persona that has been used in applications. You can deactivate it instead.');
  }
  
  const wasDefault = existing.is_default;
  
  // Soft delete
  await db.execute(`
    UPDATE artist_personas 
    SET is_active = 0, is_default = 0 
    WHERE id = ? AND artist_id = ?
  `, [personaId, artistId]);
  
  // If was default, make first active one default
  if (wasDefault) {
    await db.execute(`
      UPDATE artist_personas 
      SET is_default = 1 
      WHERE artist_id = ? AND is_active = 1 
      ORDER BY created_at ASC 
      LIMIT 1
    `, [artistId]);
  }
  
  return true;
}

/**
 * Get default persona for an artist
 * @param {number} artistId - Artist user ID
 * @returns {Promise<Object|null>} Default persona or null
 */
async function getDefault(artistId) {
  const [personas] = await db.execute(`
    SELECT * FROM artist_personas 
    WHERE artist_id = ? AND is_active = 1 AND is_default = 1
    LIMIT 1
  `, [artistId]);
  
  return personas[0] || null;
}

// =============================================================================
// ADMIN FUNCTIONS
// =============================================================================

/**
 * List all personas system-wide (admin only)
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (1-based)
 * @param {number} options.limit - Items per page
 * @param {string} options.search - Search term
 * @param {string} options.sortBy - Sort field
 * @param {string} options.sortOrder - Sort direction (asc/desc)
 * @param {number} options.artistId - Filter by artist ID
 * @param {boolean} options.includeInactive - Include inactive personas
 * @returns {Promise<Object>} { personas, meta }
 */
async function adminList(options = {}) {
  const {
    page = 1,
    limit = 20,
    search = '',
    sortBy = 'created_at',
    sortOrder = 'desc',
    artistId = null,
    includeInactive = false,
  } = options;
  
  const offset = (page - 1) * limit;
  const params = [];
  
  // Build WHERE clause
  let whereClause = includeInactive ? '1=1' : 'ap.is_active = 1';
  
  if (artistId) {
    whereClause += ' AND ap.artist_id = ?';
    params.push(artistId);
  }
  
  if (search) {
    whereClause += ` AND (
      ap.persona_name LIKE ? OR 
      ap.display_name LIKE ? OR 
      u.username LIKE ?
    )`;
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }
  
  // Validate sort field
  const allowedSortFields = ['created_at', 'updated_at', 'persona_name', 'display_name', 'artist_id'];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  
  // Get total count
  const [countResult] = await db.execute(`
    SELECT COUNT(*) as total 
    FROM artist_personas ap
    JOIN users u ON ap.artist_id = u.id
    WHERE ${whereClause}
  `, params);
  const total = countResult[0].total;
  
  // Safely convert limit/offset to integers (already validated above)
  const safeLimit = parseInt(limit, 10);
  const safeOffset = parseInt(offset, 10);
  
  // Get paginated results
  // Note: LIMIT/OFFSET as parameters can cause issues with some MySQL drivers,
  // so we interpolate them safely after validation
  const [personas] = await db.execute(`
    SELECT 
      ap.id,
      ap.artist_id,
      ap.persona_name,
      ap.display_name,
      ap.bio,
      ap.specialty,
      ap.portfolio_url,
      ap.website_url,
      ap.instagram_handle,
      ap.facebook_url,
      ap.profile_image_url,
      ap.is_default,
      ap.is_active,
      ap.created_at,
      ap.updated_at,
      u.username as artist_username,
      u.username as artist_email,
      CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')) as artist_name
    FROM artist_personas ap
    JOIN users u ON ap.artist_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE ${whereClause}
    ORDER BY ap.${safeSortBy} ${safeSortOrder}
    LIMIT ${safeLimit} OFFSET ${safeOffset}
  `, params);
  
  return {
    personas,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    }
  };
}

/**
 * Admin get persona by ID (includes artist info)
 * @param {number} personaId - Persona ID
 * @returns {Promise<Object|null>} Persona with artist info
 */
async function adminFindById(personaId) {
  const [personas] = await db.execute(`
    SELECT 
      ap.*,
      u.username as artist_username,
      u.username as artist_email,
      CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')) as artist_name
    FROM artist_personas ap
    JOIN users u ON ap.artist_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE ap.id = ?
  `, [personaId]);
  
  return personas[0] || null;
}

/**
 * Admin update persona (can update any persona)
 * @param {number} personaId - Persona ID
 * @param {Object} personaData - Updated data
 * @returns {Promise<boolean>} Success
 */
async function adminUpdate(personaId, personaData) {
  const {
    persona_name,
    display_name,
    bio,
    specialty,
    portfolio_url,
    website_url,
    instagram_handle,
    facebook_url,
    profile_image_url,
    is_default,
    is_active
  } = personaData;
  
  // Get existing persona to find artist_id
  const existing = await adminFindById(personaId);
  if (!existing) {
    throw new Error('Persona not found');
  }
  
  // Validate required fields
  if (persona_name !== undefined && !persona_name?.trim()) {
    throw new Error('Persona name is required');
  }
  if (display_name !== undefined && !display_name?.trim()) {
    throw new Error('Display name is required');
  }
  
  // Check for duplicate name (excluding current)
  if (persona_name && await nameExists(existing.artist_id, persona_name, personaId)) {
    throw new Error('This artist already has another persona with this name');
  }
  
  // Build update query dynamically
  const updates = [];
  const params = [];
  
  if (persona_name !== undefined) { updates.push('persona_name = ?'); params.push(persona_name.trim()); }
  if (display_name !== undefined) { updates.push('display_name = ?'); params.push(display_name.trim()); }
  if (bio !== undefined) { updates.push('bio = ?'); params.push(bio || null); }
  if (specialty !== undefined) { updates.push('specialty = ?'); params.push(specialty || null); }
  if (portfolio_url !== undefined) { updates.push('portfolio_url = ?'); params.push(portfolio_url || null); }
  if (website_url !== undefined) { updates.push('website_url = ?'); params.push(website_url || null); }
  if (instagram_handle !== undefined) { updates.push('instagram_handle = ?'); params.push(instagram_handle || null); }
  if (facebook_url !== undefined) { updates.push('facebook_url = ?'); params.push(facebook_url || null); }
  if (profile_image_url !== undefined) { updates.push('profile_image_url = ?'); params.push(profile_image_url || null); }
  if (is_default !== undefined) { updates.push('is_default = ?'); params.push(is_default); }
  if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }
  
  if (updates.length === 0) {
    return false;
  }
  
  // If setting as default, unset existing defaults for this artist
  if (is_default) {
    await db.execute(`
      UPDATE artist_personas 
      SET is_default = 0 
      WHERE artist_id = ? AND id != ? AND is_active = 1
    `, [existing.artist_id, personaId]);
  }
  
  params.push(personaId);
  const [result] = await db.execute(`
    UPDATE artist_personas 
    SET ${updates.join(', ')}
    WHERE id = ?
  `, params);
  
  return result.affectedRows > 0;
}

/**
 * Admin delete persona (hard delete, use with caution)
 * @param {number} personaId - Persona ID
 * @param {boolean} hard - If true, hard delete; otherwise soft delete
 * @returns {Promise<boolean>} Success
 */
async function adminDelete(personaId, hard = false) {
  const existing = await adminFindById(personaId);
  if (!existing) {
    throw new Error('Persona not found');
  }
  
  // Check if used in applications
  if (await isUsedInApplications(personaId)) {
    if (hard) {
      throw new Error('Cannot hard delete persona that has been used in applications');
    }
    // Soft delete only
    const [result] = await db.execute(`
      UPDATE artist_personas 
      SET is_active = 0, is_default = 0 
      WHERE id = ?
    `, [personaId]);
    return result.affectedRows > 0;
  }
  
  if (hard) {
    const [result] = await db.execute(`
      DELETE FROM artist_personas WHERE id = ?
    `, [personaId]);
    return result.affectedRows > 0;
  } else {
    const [result] = await db.execute(`
      UPDATE artist_personas 
      SET is_active = 0, is_default = 0 
      WHERE id = ?
    `, [personaId]);
    return result.affectedRows > 0;
  }
}

module.exports = {
  list,
  findById,
  nameExists,
  create,
  update,
  setDefault,
  isUsedInApplications,
  softDelete,
  getDefault,
  // Admin functions
  adminList,
  adminFindById,
  adminUpdate,
  adminDelete,
};
