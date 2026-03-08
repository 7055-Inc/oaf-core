/**
 * Applications Service - v2
 * Handles event application operations for artists
 */

const db = require('../../../../config/db');

// ============================================================================
// ARTIST APPLICATIONS
// ============================================================================

/**
 * Get all applications for an artist
 * @param {number} artistId - Artist user ID
 * @param {Object} options - Query options
 */
async function getArtistApplications(artistId, { status } = {}) {
  // Use same query structure as working old code
  let query = `
    SELECT 
      ea.*,
      e.title as event_title,
      e.start_date as event_start_date,
      e.end_date as event_end_date,
      e.venue_name as event_venue_name,
      e.venue_city as event_venue_city,
      e.venue_state as event_venue_state
    FROM event_applications ea
    JOIN events e ON ea.event_id = e.id
    WHERE ea.artist_id = ?
  `;
  const params = [artistId];

  if (status && status !== 'all') {
    query += ' AND ea.status = ?';
    params.push(status);
  }

  query += ' ORDER BY ea.submitted_at DESC';

  const [applications] = await db.execute(query, params);
  return applications;
}

/**
 * Get single application by ID
 * @param {number} applicationId - Application ID
 * @param {number} userId - Requesting user ID (for authorization)
 */
async function getApplicationById(applicationId, userId) {
  // Use same query structure as working old code
  const [rows] = await db.execute(`
    SELECT 
      ea.*,
      e.title as event_title,
      e.start_date as event_start_date,
      e.end_date as event_end_date,
      e.venue_name as event_venue_name,
      e.venue_city as event_venue_city,
      e.venue_state as event_venue_state,
      e.promoter_id,
      up.first_name as artist_first_name,
      up.last_name as artist_last_name,
      u.username as artist_email,
      ap.business_name as artist_business_name
    FROM event_applications ea
    JOIN events e ON ea.event_id = e.id
    JOIN users u ON ea.artist_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN artist_profiles ap ON u.id = ap.user_id
    WHERE ea.id = ?
  `, [applicationId]);

  if (!rows[0]) return null;

  // Check permissions - artist can see own applications, promoters can see applications to their events
  const hasPermission = rows[0].artist_id === userId || rows[0].promoter_id === userId;
  if (!hasPermission) return null;

  return rows[0];
}

/**
 * Delete a draft application
 * @param {number} applicationId - Application ID
 * @param {number} artistId - Artist user ID (must own the application)
 */
async function deleteApplication(applicationId, artistId) {
  // First verify the application exists, belongs to the artist, and is a draft
  const [check] = await db.execute(
    'SELECT id, status FROM event_applications WHERE id = ? AND artist_id = ?',
    [applicationId, artistId]
  );

  if (!check[0]) {
    throw new Error('Application not found');
  }

  if (check[0].status !== 'draft') {
    throw new Error('Only draft applications can be deleted');
  }

  // Delete related data first
  await db.execute('DELETE FROM application_responses WHERE application_id = ?', [applicationId]);
  await db.execute('DELETE FROM application_media WHERE application_id = ?', [applicationId]);
  
  // Delete the application
  await db.execute('DELETE FROM event_applications WHERE id = ?', [applicationId]);

  return { success: true };
}

/**
 * Get application stats for an artist
 * @param {number} artistId - Artist user ID
 */
async function getApplicationStats(artistId) {
  const [rows] = await db.execute(`
    SELECT 
      status,
      COUNT(*) as count
    FROM event_applications
    WHERE artist_id = ?
    GROUP BY status
  `, [artistId]);

  const stats = {
    total: 0,
    draft: 0,
    submitted: 0,
    under_review: 0,
    accepted: 0,
    rejected: 0,
    waitlisted: 0,
    confirmed: 0
  };

  rows.forEach(row => {
    stats[row.status] = row.count;
    stats.total += row.count;
  });

  return stats;
}

// ============================================================================
// ADMIN: ALL APPLICATIONS
// ============================================================================

/**
 * Get all applications (admin only), with sort, search, filter, pagination
 * @param {Object} options - status, search (artist name/email, event title), sort, order, limit, offset
 */
async function getAllApplicationsAdmin({ status, search, sort = 'submitted_at', order = 'desc', limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(parseInt(limit, 10) || 50, 200);
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);
  const validSort = ['submitted_at', 'event_title', 'artist_name', 'status', 'id'].includes(sort) ? sort : 'submitted_at';
  const validOrder = (order || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let whereClause = '';
  const params = [];

  if (status && status !== 'all') {
    whereClause += ' AND ea.status = ?';
    params.push(status);
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    whereClause += ' AND (e.title LIKE ? OR u.username LIKE ? OR up.first_name LIKE ? OR up.last_name LIKE ? OR ap.business_name LIKE ?)';
    params.push(term, term, term, term, term);
  }

  const baseFrom = `
    FROM event_applications ea
    JOIN events e ON ea.event_id = e.id
    JOIN users u ON ea.artist_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN artist_profiles ap ON u.id = ap.user_id
    WHERE 1=1
  `;
  const countSql = `SELECT COUNT(*) as total ${baseFrom}${whereClause}`;
  const [countResult] = await db.execute(countSql, params);
  const total = countResult[0]?.total ?? 0;

  const orderBy = validSort === 'artist_name'
    ? 'ORDER BY artist_name ' + validOrder
    : validSort === 'event_title'
    ? 'ORDER BY e.title ' + validOrder
    : `ORDER BY ea.${validSort} ${validOrder}`;

  const listSql = `
    SELECT 
      ea.id,
      ea.event_id,
      ea.artist_id,
      ea.status,
      ea.submitted_at,
      ea.submitted_at as applied_date,
      ea.jury_comments,
      ea.booth_fee_amount,
      ea.artist_statement,
      e.title as event_title,
      e.start_date as event_start_date,
      e.end_date as event_end_date,
      e.venue_name as event_venue_name,
      e.venue_city as event_venue_city,
      e.venue_state as event_venue_state,
      e.application_fee,
      e.jury_fee,
      (COALESCE(ea.booth_fee_amount, 0) + COALESCE(e.application_fee, 0) + COALESCE(e.jury_fee, 0)) as total_fees,
      TRIM(CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, ''))) as artist_name,
      u.username as artist_email,
      u.username as email,
      up.phone,
      ap.business_name as artist_business_name,
      ap.business_name as company_name,
      ap.art_categories,
      ap.art_mediums
    FROM event_applications ea
    JOIN events e ON ea.event_id = e.id
    JOIN users u ON ea.artist_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN artist_profiles ap ON u.id = ap.user_id
    WHERE 1=1
    ${whereClause} ${orderBy} LIMIT ${safeLimit} OFFSET ${safeOffset}
  `;
  const [applications] = await db.execute(listSql, params);
  return { applications, total };
}

/**
 * Get single application by ID (admin only, no permission check)
 */
async function getApplicationByIdAdmin(applicationId) {
  const [rows] = await db.execute(`
    SELECT 
      ea.*,
      ea.submitted_at as applied_date,
      ea.booth_fee_amount,
      e.title as event_title,
      e.start_date as event_start_date,
      e.end_date as event_end_date,
      e.venue_name as event_venue_name,
      e.venue_city as event_venue_city,
      e.venue_state as event_venue_state,
      e.promoter_id,
      e.application_fee,
      e.jury_fee,
      (COALESCE(ea.booth_fee_amount, 0) + COALESCE(e.application_fee, 0) + COALESCE(e.jury_fee, 0)) as total_fees,
      up.first_name as artist_first_name,
      up.last_name as artist_last_name,
      u.username as artist_email,
      u.username as email,
      ap.business_name as artist_business_name,
      ap.art_categories,
      ap.art_mediums
    FROM event_applications ea
    JOIN events e ON ea.event_id = e.id
    JOIN users u ON ea.artist_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN artist_profiles ap ON u.id = ap.user_id
    WHERE ea.id = ?
  `, [applicationId]);
  return rows[0] || null;
}

module.exports = {
  getArtistApplications,
  getApplicationById,
  deleteApplication,
  getApplicationStats,
  getAllApplicationsAdmin,
  getApplicationByIdAdmin
};
