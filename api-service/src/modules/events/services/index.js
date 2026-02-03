/**
 * Events Service - v2
 * Handles event CRUD operations, types, images, application fields, and add-ons
 */

const db = require('../../../../config/db');
const geocodingService = require('../../../services/geocodingService');
const eventSchemaService = require('../../../services/eventSchemaService');
const crypto = require('crypto');

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Get all active event types
 */
async function getEventTypes() {
  const [rows] = await db.query('SELECT * FROM event_types WHERE is_active = TRUE ORDER BY name');
  return rows;
}

// ============================================================================
// EVENT CRUD
// ============================================================================

/**
 * Get event by ID
 */
async function getEventById(eventId) {
  const [event] = await db.execute(`
    SELECT 
      e.*,
      et.name as event_type_name,
      et.description as event_type_description
    FROM events e
    LEFT JOIN event_types et ON e.event_type_id = et.id
    WHERE e.id = ?
  `, [eventId]);
  
  return event[0] || null;
}

/**
 * Get event with images
 */
async function getEventWithImages(eventId) {
  const event = await getEventById(eventId);
  if (!event) return null;

  const [images] = await db.execute(
    'SELECT image_url FROM event_images WHERE event_id = ? ORDER BY order_index ASC',
    [eventId]
  );
  
  event.images = images.map(img => img.image_url);
  return event;
}

/**
 * Create new event
 */
async function createEvent(promoterId, eventData) {
  const {
    event_type_id, title, description, short_description, start_date, end_date,
    venue_name, venue_address, venue_city, venue_state, venue_zip, venue_country,
    venue_capacity, age_restrictions, age_minimum, dress_code,
    has_rsvp, has_tickets, rsvp_url,
    allow_applications, application_status, application_deadline,
    jury_date, notification_date, admission_fee, parking_fee, parking_info, parking_details,
    accessibility_info, application_fee, booth_fee, jury_fee, max_applications, max_artists,
    seo_title, meta_description, event_keywords, images
  } = eventData;

  const event_status = 'active';

  // Geocode the venue address
  let latitude = null;
  let longitude = null;
  try {
    const coords = await geocodingService.geocodeAddress(
      venue_address, venue_city, venue_state, venue_zip
    );
    latitude = coords.latitude;
    longitude = coords.longitude;
  } catch (err) {
    // Silent fail - geocoding is optional
  }

  const [result] = await db.execute(`
    INSERT INTO events (
      promoter_id, event_type_id, parent_id, series_id, title, description, short_description, 
      event_status, application_status, allow_applications, start_date, end_date, 
      application_deadline, jury_date, notification_date, venue_name, venue_address, 
      venue_city, venue_state, venue_zip, venue_country, venue_capacity,
      age_restrictions, age_minimum, dress_code, has_rsvp, has_tickets, rsvp_url,
      latitude, longitude, parking_info, accessibility_info, admission_fee, parking_fee, parking_details, 
      application_fee, jury_fee, booth_fee, max_artists, max_applications, 
      seo_title, meta_description, event_keywords, event_schema, event_tags, 
      created_at, updated_at, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?)
  `, [
    promoterId, event_type_id || null, null, null, title || null, description || null, short_description || null,
    event_status, application_status || 'not_accepting', allow_applications || 0, start_date, end_date,
    application_deadline || null, jury_date || null, notification_date || null, venue_name || null, venue_address || null,
    venue_city || null, venue_state || null, venue_zip || null, venue_country || 'USA', venue_capacity || null,
    age_restrictions || 'all_ages', age_minimum || null, dress_code || null, has_rsvp || false, has_tickets || false, rsvp_url || null,
    latitude, longitude, parking_info || null, accessibility_info || null, admission_fee || null, parking_fee || null, parking_details || null,
    application_fee || null, jury_fee || null, booth_fee || null, max_artists || null, max_applications || null,
    seo_title || null, meta_description || null, event_keywords || null, null, null,
    promoterId, promoterId
  ]);

  const eventId = result.insertId;

  // Get the created event with related data for schema generation
  const [newEvent] = await db.execute(`
    SELECT 
      e.*,
      et.name as event_type_name,
      up.first_name, up.last_name, u.username as email,
      pp.business_name, pp.business_website, pp.business_phone,
      pp.business_social_facebook, pp.business_social_instagram, pp.business_social_twitter
    FROM events e
    LEFT JOIN event_types et ON e.event_type_id = et.id
    LEFT JOIN users u ON e.promoter_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN promoter_profiles pp ON u.id = pp.user_id
    WHERE e.id = ?
  `, [eventId]);

  const event = newEvent[0];
  
  // Generate and store Schema.org JSON-LD
  const promoterData = {
    first_name: event.first_name,
    last_name: event.last_name,
    email: event.email,
    business_name: event.business_name,
    business_website: event.business_website,
    business_phone: event.business_phone,
    business_social_facebook: event.business_social_facebook,
    business_social_instagram: event.business_social_instagram,
    business_social_twitter: event.business_social_twitter
  };

  const eventImages = images || [];
  const completeSchema = eventSchemaService.generateCompleteSchema(event, promoterData, eventImages);
  
  // Save uploaded images to event_images table
  if (eventImages && eventImages.length > 0) {
    for (let i = 0; i < eventImages.length; i++) {
      const imageUrl = eventImages[i];
      await db.execute(`
        INSERT INTO event_images (event_id, image_url, friendly_name, is_primary, alt_text, order_index)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [eventId, imageUrl, `Event Image ${i + 1}`, i === 0 ? 1 : 0, event.title, i]);
    }
  }

  // Update the event with the generated schema
  await db.execute(`
    UPDATE events 
    SET event_schema = ? 
    WHERE id = ?
  `, [JSON.stringify(completeSchema), eventId]);

  // Generate review token
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const validFrom = start_date;
  const validUntil = new Date(end_date);
  validUntil.setMonth(validUntil.getMonth() + 6);
  const validUntilStr = validUntil.toISOString().split('T')[0];
  
  await db.execute(`
    INSERT INTO event_review_tokens (event_id, token, valid_from, valid_until)
    VALUES (?, ?, ?, ?)
  `, [eventId, token, validFrom, validUntilStr]);

  return {
    id: eventId,
    title: event.title,
    description: event.description,
    short_description: event.short_description,
    event_type_name: event.event_type_name,
    event_status: event.event_status,
    start_date: event.start_date,
    end_date: event.end_date,
    venue_name: event.venue_name,
    venue_city: event.venue_city,
    venue_state: event.venue_state,
    latitude: event.latitude,
    longitude: event.longitude,
    created_at: event.created_at
  };
}

/**
 * Update event (partial update)
 */
async function updateEvent(eventId, promoterId, eventData, isAdmin = false) {
  // Verify ownership
  const [eventCheck] = await db.execute('SELECT promoter_id FROM events WHERE id = ?', [eventId]);
  if (eventCheck.length === 0) {
    throw new Error('Event not found');
  }
  if (!isAdmin && eventCheck[0].promoter_id !== promoterId) {
    throw new Error('Access denied');
  }

  const updates = [];
  const values = [];
  
  // Integer fields that should be null if empty
  const integerFields = [
    'event_type_id', 'venue_capacity', 'age_minimum', 'max_applications', 'max_artists'
  ];
  
  // Decimal/money fields that should be 0 or null if empty
  const decimalFields = [
    'application_fee', 'booth_fee', 'jury_fee', 'admission_fee', 'parking_fee'
  ];
  
  // Date fields that should be null if empty
  const dateFields = [
    'application_deadline', 'jury_date', 'notification_date'
  ];
  
  // Build dynamic UPDATE query based on provided fields
  const allowedFields = [
    'title', 'description', 'short_description', 'event_type_id', 'start_date', 'end_date',
    'venue_name', 'venue_address', 'venue_city', 'venue_state', 'venue_zip',
    'venue_capacity', 'age_restrictions', 'age_minimum', 'dress_code',
    'has_rsvp', 'has_tickets', 'rsvp_url', 'event_status', 'allow_applications',
    'application_status', 'application_deadline', 'jury_date', 'notification_date',
    'admission_fee', 'parking_fee', 'parking_info', 'parking_details', 'accessibility_info',
    'application_fee', 'booth_fee', 'jury_fee', 'max_artists', 'max_applications', 
    'seo_title', 'meta_description', 'event_keywords'
  ];
  
  for (const field of allowedFields) {
    if (eventData[field] !== undefined) {
      updates.push(`${field} = ?`);
      
      let value = eventData[field];
      
      if (integerFields.includes(field) && value === '') {
        value = null;
      }
      if (decimalFields.includes(field) && value === '') {
        value = 0;
      }
      if (dateFields.includes(field) && value === '') {
        value = null;
      }
      
      values.push(value);
    }
  }
  
  if (updates.length === 0 && !eventData.images) {
    throw new Error('No fields to update');
  }
  
  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    updates.push('updated_by = ?');
    values.push(promoterId);
    values.push(eventId);
    
    await db.execute(
      `UPDATE events SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }

  // Handle images if provided
  if (eventData.images && Array.isArray(eventData.images)) {
    await db.execute('DELETE FROM event_images WHERE event_id = ?', [eventId]);
    
    for (let i = 0; i < eventData.images.length; i++) {
      const imageUrl = eventData.images[i];
      if (imageUrl) {
        await db.execute(`
          INSERT INTO event_images (event_id, image_url, friendly_name, is_primary, alt_text, order_index)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [eventId, imageUrl, `Event Image ${i + 1}`, i === 0 ? 1 : 0, '', i]);
      }
    }
  }

  return getEventWithImages(eventId);
}

/**
 * Archive event (soft delete)
 */
async function archiveEvent(eventId, promoterId, isAdmin = false) {
  const [eventCheck] = await db.execute('SELECT promoter_id FROM events WHERE id = ?', [eventId]);
  if (eventCheck.length === 0) {
    throw new Error('Event not found');
  }
  if (!isAdmin && eventCheck[0].promoter_id !== promoterId) {
    throw new Error('Access denied');
  }

  await db.execute(
    'UPDATE events SET event_status = ?, updated_at = NOW() WHERE id = ?',
    ['archived', eventId]
  );
  
  return { success: true };
}

// ============================================================================
// APPLICATION FIELDS
// ============================================================================

/**
 * Get application fields for an event
 */
async function getApplicationFields(eventId) {
  const [fields] = await db.execute(`
    SELECT * FROM event_application_fields 
    WHERE event_id = ? 
    ORDER BY display_order ASC, field_name ASC
  `, [eventId]);
  return fields;
}

/**
 * Add application field to an event
 */
async function addApplicationField(eventId, promoterId, fieldData, isAdmin = false) {
  const [eventCheck] = await db.execute('SELECT promoter_id FROM events WHERE id = ?', [eventId]);
  if (eventCheck.length === 0) {
    throw new Error('Event not found');
  }
  if (!isAdmin && eventCheck[0].promoter_id !== promoterId) {
    throw new Error('Access denied');
  }

  const { field_type, field_name, field_description, is_required, verified_can_skip, display_order, is_basic_field } = fieldData;
  
  const [result] = await db.execute(`
    INSERT INTO event_application_fields (event_id, field_type, field_name, field_description, is_required, verified_can_skip, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [eventId, field_type, field_name, field_description || null, is_required || false, verified_can_skip || false, display_order || 0]);
  
  return { 
    id: result.insertId, 
    event_id: eventId, 
    field_type,
    field_name, 
    field_description, 
    is_required: is_required || false,
    verified_can_skip: verified_can_skip || false,
    display_order: display_order || 0
  };
}

/**
 * Delete all application fields for an event (for reset before re-adding)
 */
async function clearApplicationFields(eventId, promoterId, isAdmin = false) {
  const [eventCheck] = await db.execute('SELECT promoter_id FROM events WHERE id = ?', [eventId]);
  if (eventCheck.length === 0) {
    throw new Error('Event not found');
  }
  if (!isAdmin && eventCheck[0].promoter_id !== promoterId) {
    throw new Error('Access denied');
  }

  await db.execute('DELETE FROM event_application_fields WHERE event_id = ?', [eventId]);
  return { success: true };
}

// ============================================================================
// AVAILABLE ADD-ONS
// ============================================================================

/**
 * Get available add-ons for an event
 */
async function getAvailableAddons(eventId) {
  const [addons] = await db.execute(`
    SELECT * FROM event_available_addons 
    WHERE event_id = ? AND is_active = 1 
    ORDER BY display_order ASC, addon_name ASC
  `, [eventId]);
  return addons;
}

/**
 * Add available add-on to an event
 */
async function addAvailableAddon(eventId, promoterId, addonData, isAdmin = false) {
  const [eventCheck] = await db.execute('SELECT promoter_id FROM events WHERE id = ?', [eventId]);
  if (eventCheck.length === 0) {
    throw new Error('Event not found');
  }
  if (!isAdmin && eventCheck[0].promoter_id !== promoterId) {
    throw new Error('Access denied');
  }

  const { addon_name, addon_description, addon_price, display_order } = addonData;
  
  const [result] = await db.execute(`
    INSERT INTO event_available_addons (event_id, addon_name, addon_description, addon_price, display_order)
    VALUES (?, ?, ?, ?, ?)
  `, [eventId, addon_name, addon_description, addon_price, display_order || 0]);
  
  return { 
    id: result.insertId, 
    event_id: eventId, 
    addon_name, 
    addon_description, 
    addon_price, 
    display_order: display_order || 0,
    is_active: true
  };
}

/**
 * Delete all add-ons for an event (for reset before re-adding)
 */
async function clearAvailableAddons(eventId, promoterId, isAdmin = false) {
  const [eventCheck] = await db.execute('SELECT promoter_id FROM events WHERE id = ?', [eventId]);
  if (eventCheck.length === 0) {
    throw new Error('Event not found');
  }
  if (!isAdmin && eventCheck[0].promoter_id !== promoterId) {
    throw new Error('Access denied');
  }

  await db.execute('DELETE FROM event_available_addons WHERE event_id = ?', [eventId]);
  return { success: true };
}

// ============================================================================
// IMAGES
// ============================================================================

/**
 * Get event images
 */
async function getEventImages(eventId) {
  const [images] = await db.execute(
    'SELECT * FROM event_images WHERE event_id = ? ORDER BY order_index ASC',
    [eventId]
  );
  return images;
}

/**
 * Get event categories (public)
 */
async function getEventCategories(eventId) {
  const [rows] = await db.execute(`
    SELECT c.id, c.name, c.slug
    FROM event_categories ec
    JOIN categories c ON ec.category_id = c.id
    WHERE ec.event_id = ?
    ORDER BY c.name ASC
  `, [eventId]);
  return rows;
}

/**
 * Get exhibiting artists for event (public)
 */
async function getEventArtists(eventId) {
  const [rows] = await db.execute(`
    SELECT
      ea.id,
      ea.artist_id,
      ea.status,
      ea.application_id,
      u.username,
      COALESCE(up.display_name, up.first_name, up.last_name, u.username) as display_name
    FROM event_artists ea
    JOIN users u ON ea.artist_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE ea.event_id = ?
    ORDER BY ea.added_at ASC
  `, [eventId]);
  return rows;
}

// ============================================================================
// PROMOTER EVENTS (My Events)
// ============================================================================

/**
 * Get events owned by promoter
 */
async function getPromoterEvents(promoterId) {
  const [events] = await db.execute(`
    SELECT 
      e.*,
      et.name as event_type_name
    FROM events e
    LEFT JOIN event_types et ON e.event_type_id = et.id
    WHERE e.promoter_id = ?
    ORDER BY e.start_date DESC
  `, [promoterId]);
  return events;
}

// ============================================================================
// UPCOMING EVENTS (public)
// ============================================================================

/**
 * Get upcoming (future) active events for browse/carousel/sitemap.
 * end_date >= today, event_status = 'active', ordered by start_date ASC.
 */
async function getUpcomingEvents(limit = 20, offset = 0) {
  const safeLimit = Math.min(parseInt(limit, 10) || 20, 100);
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);
  const [events] = await db.execute(`
    SELECT 
      e.*,
      et.name as event_type_name,
      COALESCE(pp.business_name, CONCAT(up.first_name, ' ', up.last_name), u.username) as promoter_name
    FROM events e
    LEFT JOIN event_types et ON e.event_type_id = et.id
    LEFT JOIN users u ON e.promoter_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN promoter_profiles pp ON u.id = pp.user_id
    WHERE e.end_date >= CURDATE()
      AND e.event_status = 'active'
    ORDER BY e.start_date ASC
    LIMIT ? OFFSET ?
  `, [safeLimit, safeOffset]);
  return events;
}

/**
 * Get artist's event applications (public profile display)
 * Returns events the artist has applied to with application status.
 */
async function getArtistEventApplications(artistId) {
  const [applications] = await db.execute(`
    SELECT 
      e.id as event_id,
      e.title as event_title,
      e.start_date,
      e.end_date,
      e.venue_name,
      e.venue_city,
      e.venue_state,
      ea.status,
      ea.submitted_at,
      ea.reviewed_at
    FROM event_applications ea
    JOIN events e ON ea.event_id = e.id
    WHERE ea.artist_id = ?
    ORDER BY e.start_date DESC
  `, [artistId]);
  return applications;
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/**
 * Get all events (admin only)
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by status
 * @param {number} options.limit - Max results
 * @param {number} options.offset - Offset for pagination
 * @param {string} options.search - Search term
 */
async function getAllEvents({ status, limit = 50, offset = 0, search } = {}) {
  // Ensure limit and offset are integers
  const safeLimit = parseInt(limit, 10) || 50;
  const safeOffset = parseInt(offset, 10) || 0;
  
  let query = `
    SELECT 
      e.*,
      et.name as event_type_name,
      u.username as promoter_email
    FROM events e
    LEFT JOIN event_types et ON e.event_type_id = et.id
    LEFT JOIN users u ON e.promoter_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'all') {
    query += ' AND e.event_status = ?';
    params.push(status);
  }

  if (search) {
    query += ' AND (e.title LIKE ? OR e.venue_city LIKE ? OR u.username LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  // LIMIT/OFFSET must be embedded directly for MySQL prepared statements
  query += ` ORDER BY e.created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;

  const [events] = await db.query(query, params);
  return events;
}

/**
 * Get total event count (admin only)
 * @param {Object} options - Query options
 */
async function getEventCount({ status, search } = {}) {
  let query = `
    SELECT COUNT(*) as total
    FROM events e
    LEFT JOIN users u ON e.promoter_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'all') {
    query += ' AND e.event_status = ?';
    params.push(status);
  }

  if (search) {
    query += ' AND (e.title LIKE ? OR e.venue_city LIKE ? OR u.username LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const [result] = await db.execute(query, params);
  return result[0].total;
}

// ============================================================================
// JURY PACKETS (artist-owned application templates)
// ============================================================================

/**
 * Get artist's jury packets
 */
async function getJuryPackets(artistId) {
  const [packets] = await db.execute(`
    SELECT jp.id, jp.packet_name, jp.packet_data, jp.persona_id, jp.created_at, jp.updated_at,
           p.persona_name, p.display_name as persona_display_name
    FROM artist_jury_packets jp
    LEFT JOIN artist_personas p ON jp.persona_id = p.id AND p.is_active = 1
    WHERE jp.artist_id = ?
    ORDER BY jp.updated_at DESC
  `, [artistId]);
  return packets;
}

/**
 * Get single jury packet by id (ownership check)
 */
async function getJuryPacketById(packetId, artistId) {
  const [packet] = await db.execute(`
    SELECT * FROM artist_jury_packets
    WHERE id = ? AND artist_id = ?
  `, [packetId, artistId]);
  return packet[0] || null;
}

/**
 * Create jury packet
 */
async function createJuryPacket(artistId, body) {
  const { packet_name, packet_data, photos_data, persona_id } = body;
  if (!packet_name || !String(packet_name).trim()) {
    throw new Error('Packet name is required');
  }
  if (persona_id) {
    const [personaCheck] = await db.execute(
      'SELECT id FROM artist_personas WHERE id = ? AND artist_id = ? AND is_active = 1',
      [persona_id, artistId]
    );
    if (personaCheck.length === 0) {
      throw new Error('Invalid persona selected');
    }
  }
  const [result] = await db.execute(`
    INSERT INTO artist_jury_packets (artist_id, packet_name, packet_data, photos_data, persona_id)
    VALUES (?, ?, ?, ?, ?)
  `, [artistId, String(packet_name).trim(), JSON.stringify(packet_data || {}), JSON.stringify(photos_data || []), persona_id || null]);
  return {
    id: result.insertId,
    packet_name: String(packet_name).trim(),
    persona_id: persona_id || null,
    packet_data: packet_data || {},
    photos_data: photos_data || [],
    message: 'Jury packet created successfully'
  };
}

/**
 * Update jury packet
 */
async function updateJuryPacket(packetId, artistId, body) {
  const existing = await getJuryPacketById(packetId, artistId);
  if (!existing) {
    throw new Error('Jury packet not found');
  }
  const { packet_name, packet_data, photos_data, persona_id } = body;
  if (!packet_name || !String(packet_name).trim()) {
    throw new Error('Packet name is required');
  }
  if (persona_id) {
    const [personaCheck] = await db.execute(
      'SELECT id FROM artist_personas WHERE id = ? AND artist_id = ? AND is_active = 1',
      [persona_id, artistId]
    );
    if (personaCheck.length === 0) {
      throw new Error('Invalid persona selected');
    }
  }
  await db.execute(`
    UPDATE artist_jury_packets
    SET packet_name = ?, packet_data = ?, photos_data = ?, persona_id = ?
    WHERE id = ? AND artist_id = ?
  `, [String(packet_name).trim(), JSON.stringify(packet_data || {}), JSON.stringify(photos_data || []), persona_id || null, packetId, artistId]);
  return { message: 'Jury packet updated successfully' };
}

/**
 * Delete jury packet
 */
async function deleteJuryPacket(packetId, artistId) {
  const existing = await getJuryPacketById(packetId, artistId);
  if (!existing) {
    throw new Error('Jury packet not found');
  }
  await db.execute('DELETE FROM artist_jury_packets WHERE id = ? AND artist_id = ?', [packetId, artistId]);
  return { message: 'Jury packet deleted successfully' };
}

// ============================================================================
// ARTIST CUSTOM EVENTS (personal calendar)
// ============================================================================

/**
 * Get artist's custom personal events
 */
async function getCustomEvents(artistId) {
  const [rows] = await db.execute(
    'SELECT * FROM artist_custom_events WHERE artist_id = ? ORDER BY event_start_date DESC',
    [artistId]
  );
  return rows;
}

/**
 * Create custom artist event (optionally send promoter claim email)
 */
async function createCustomEvent(artistId, eventData) {
  const EmailService = require('../../../../services/emailService');
  const crypto = require('crypto');
  const emailService = new EmailService();

  const {
    event_name, event_start_date, event_end_date, venue_name,
    city, state, website, promoter_name, promoter_email, notify_promoter
  } = eventData;

  const [result] = await db.execute(`
    INSERT INTO artist_custom_events (
      artist_id, event_name, event_start_date, event_end_date,
      venue_name, city, state, website, promoter_name, promoter_email
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    artistId,
    event_name,
    event_start_date,
    event_end_date,
    venue_name || null,
    city || null,
    state || null,
    website || null,
    promoter_name || null,
    promoter_email || null
  ]);

  const [rows] = await db.execute('SELECT * FROM artist_custom_events WHERE id = ?', [result.insertId]);
  const created = rows[0];

  if (notify_promoter && promoter_email) {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      await db.execute(`
        INSERT INTO event_claim_tokens
        (artist_custom_event_id, token, promoter_email, expires_at)
        VALUES (?, ?, ?, ?)
      `, [result.insertId, token, promoter_email, expiresAt]);

      const [artistDetails] = await db.execute(`
        SELECT u.username as email,
               COALESCE(up.first_name, u.username) as first_name,
               COALESCE(up.last_name, '') as last_name,
               COALESCE(up.display_name, '') as display_name,
               ap.business_name
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN artist_profiles ap ON u.id = ap.user_id
        WHERE u.id = ?
      `, [artistId]);
      const artist = artistDetails[0];
      const artistName = artist.business_name || artist.display_name ||
        `${artist.first_name} ${artist.last_name}`.trim() || artist.email;
      const startDate = new Date(event_start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const endDate = new Date(event_end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const claimUrl = `${process.env.FRONTEND_URL}/events/claim/${token}`;
      const templateData = {
        promoter_name: promoter_name || 'Event Organizer',
        event_name: event_name,
        artist_name: artistName,
        artist_email: artist.email,
        event_start_date: startDate,
        event_end_date: endDate,
        venue_name: venue_name || 'Not specified',
        city: city || '',
        state: state || '',
        website: website || '',
        event_location: [city, state].filter(Boolean).join(', ') || 'Location TBD',
        claim_url: claimUrl
      };
      await emailService.sendExternalEmail(promoter_email, 'promoter_event_notification', templateData, { replyTo: artist.email });
    } catch (emailError) {
      console.error('Failed to send promoter notification email:', emailError);
    }
  }

  return created;
}

/**
 * Update custom artist event (ownership validated)
 */
async function updateCustomEvent(artistId, id, eventData) {
  const [existing] = await db.execute(
    'SELECT * FROM artist_custom_events WHERE id = ? AND artist_id = ?',
    [id, artistId]
  );
  if (!existing.length) {
    throw new Error('Custom event not found or access denied');
  }
  const {
    event_name, event_start_date, event_end_date, venue_name,
    city, state, website, promoter_name, promoter_email
  } = eventData;
  await db.execute(`
    UPDATE artist_custom_events
    SET event_name = ?, event_start_date = ?, event_end_date = ?,
        venue_name = ?, city = ?, state = ?, website = ?,
        promoter_name = ?, promoter_email = ?, updated_at = NOW()
    WHERE id = ? AND artist_id = ?
  `, [
    event_name, event_start_date, event_end_date,
    venue_name || null, city || null, state || null, website || null,
    promoter_name || null, promoter_email || null,
    id, artistId
  ]);
  const [rows] = await db.execute('SELECT * FROM artist_custom_events WHERE id = ?', [id]);
  return rows[0];
}

/**
 * Delete custom artist event (ownership validated)
 */
async function deleteCustomEvent(artistId, id) {
  const [existing] = await db.execute(
    'SELECT * FROM artist_custom_events WHERE id = ? AND artist_id = ?',
    [id, artistId]
  );
  if (!existing.length) {
    throw new Error('Custom event not found or access denied');
  }
  await db.execute('DELETE FROM artist_custom_events WHERE id = ? AND artist_id = ?', [id, artistId]);
}

// ============================================================================
// EVENT CLAIM (artist custom event → promoter claims)
// ============================================================================

/**
 * Verify claim token and return artist custom event details (public).
 */
async function verifyClaimToken(token) {
  const [rows] = await db.execute(`
    SELECT ect.*, ace.*,
           u.username as artist_email,
           COALESCE(up.first_name, u.username) as artist_first_name,
           COALESCE(up.last_name, '') as artist_last_name,
           ap.business_name as artist_business_name
    FROM event_claim_tokens ect
    JOIN artist_custom_events ace ON ect.artist_custom_event_id = ace.id
    JOIN users u ON ace.artist_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN artist_profiles ap ON u.id = ap.user_id
    WHERE ect.token = ? AND ect.claimed = 0 AND ect.expires_at > NOW()
  `, [token]);
  if (!rows.length) return null;
  const data = rows[0];
  const artistName = data.artist_business_name ||
    `${(data.artist_first_name || '')} ${(data.artist_last_name || '')}`.trim() || data.artist_email;
  return {
    valid: true,
    event: {
      id: data.artist_custom_event_id,
      event_name: data.event_name,
      event_start_date: data.event_start_date,
      event_end_date: data.event_end_date,
      venue_name: data.venue_name,
      address_line1: data.address_line1,
      address_line2: data.address_line2,
      city: data.city,
      state: data.state,
      zip: data.zip,
      website: data.website,
      promoter_name: data.promoter_name,
      promoter_email: data.promoter_email,
      artist_name: artistName,
      artist_email: data.artist_email,
      artist_id: data.artist_id
    }
  };
}

/**
 * Claim artist custom event as new draft event (promoter).
 */
async function claimNew(token, promoterId) {
  const EmailService = require('../../../../services/emailService');
  const emailService = new EmailService();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [tokenData] = await connection.execute(`
      SELECT ect.*, ace.*,
             u.username as artist_email,
             COALESCE(up.first_name, u.username) as artist_first_name,
             COALESCE(up.last_name, '') as artist_last_name,
             ap.business_name as artist_business_name
      FROM event_claim_tokens ect
      JOIN artist_custom_events ace ON ect.artist_custom_event_id = ace.id
      JOIN users u ON ace.artist_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN artist_profiles ap ON u.id = ap.user_id
      WHERE ect.token = ? AND ect.claimed = 0 AND ect.expires_at > NOW()
      FOR UPDATE
    `, [token]);
    if (!tokenData.length) {
      await connection.rollback();
      throw new Error('Invalid or expired claim token');
    }
    const eventData = tokenData[0];
    const [newEvent] = await connection.execute(`
      INSERT INTO events (
        promoter_id, event_type_id, title, start_date, end_date,
        venue_name, venue_address, venue_city, venue_state, venue_zip,
        venue_country, event_status, allow_applications, application_status,
        created_at, updated_at, created_by, updated_by
      ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, 'USA', 'draft', 1, 'not_accepting', NOW(), NOW(), ?, ?)
    `, [
      promoterId, eventData.event_name, eventData.event_start_date, eventData.event_end_date,
      eventData.venue_name, eventData.address_line1, eventData.city, eventData.state, eventData.zip,
      promoterId, promoterId
    ]);
    const newEventId = newEvent.insertId;
    await connection.execute(`
      INSERT INTO event_applications (event_id, artist_id, status, created_at)
      VALUES (?, ?, 'submitted', NOW())
    `, [newEventId, eventData.artist_id]);
    await connection.execute(`
      UPDATE artist_custom_events SET associated_promoter_event = ? WHERE id = ?
    `, [newEventId, eventData.artist_custom_event_id]);
    await connection.execute(`
      UPDATE event_claim_tokens SET claimed = 1, claimed_at = NOW(), claimed_by = ? WHERE token = ?
    `, [promoterId, token]);
    await connection.commit();

    try {
      const artistName = eventData.artist_business_name ||
        `${(eventData.artist_first_name || '')} ${(eventData.artist_last_name || '')}`.trim() || eventData.artist_email;
      await emailService.queueEmail(eventData.artist_id, 'artist_event_claimed_confirmation', {
        artist_name: artistName,
        promoter_name: eventData.promoter_name || 'Event Organizer',
        event_name: eventData.event_name,
        event_start_date: new Date(eventData.event_start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        event_end_date: new Date(eventData.event_end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        event_location: [eventData.city, eventData.state].filter(Boolean).join(', ') || 'Location TBD',
        event_url: `${process.env.FRONTEND_URL}/events/${newEventId}`,
        action_type: 'claimed',
        action_type_title: 'Claimed',
        action_description: 'claimed and created an official listing for',
        action_explanation: 'The promoter has created an official event page on Brakebee. Your calendar will now display their complete event details, and you have been added as an applicant to the event.'
      }, { priority: 2 });
    } catch (e) { /* non-fatal */ }

    return { event_id: newEventId, redirect_url: `/events/new?claimed_event_id=${newEventId}` };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Link artist custom event to existing promoter event.
 */
async function linkExisting(token, promoterId, eventId) {
  const EmailService = require('../../../../services/emailService');
  const emailService = new EmailService();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [tokenData] = await connection.execute(`
      SELECT ect.*, ace.*,
             u.username as artist_email,
             COALESCE(up.first_name, u.username) as artist_first_name,
             COALESCE(up.last_name, '') as artist_last_name,
             ap.business_name as artist_business_name
      FROM event_claim_tokens ect
      JOIN artist_custom_events ace ON ect.artist_custom_event_id = ace.id
      JOIN users u ON ace.artist_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN artist_profiles ap ON u.id = ap.user_id
      WHERE ect.token = ? AND ect.claimed = 0 AND ect.expires_at > NOW()
      FOR UPDATE
    `, [token]);
    if (!tokenData.length) {
      await connection.rollback();
      throw new Error('Invalid or expired claim token');
    }
    const eventData = tokenData[0];
    const [existingEvent] = await connection.execute(
      'SELECT id, title FROM events WHERE id = ? AND promoter_id = ?',
      [eventId, promoterId]
    );
    if (!existingEvent.length) {
      await connection.rollback();
      throw new Error('Event not found or you do not have permission');
    }
    const [existingApp] = await connection.execute(
      'SELECT id FROM event_applications WHERE event_id = ? AND artist_id = ?',
      [eventId, eventData.artist_id]
    );
    if (!existingApp.length) {
      await connection.execute(`
        INSERT INTO event_applications (event_id, artist_id, status, created_at)
        VALUES (?, ?, 'submitted', NOW())
      `, [eventId, eventData.artist_id]);
    }
    await connection.execute(
      'UPDATE artist_custom_events SET associated_promoter_event = ? WHERE id = ?',
      [eventId, eventData.artist_custom_event_id]
    );
    await connection.execute(
      'UPDATE event_claim_tokens SET claimed = 1, claimed_at = NOW(), claimed_by = ? WHERE token = ?',
      [promoterId, token]
    );
    await connection.commit();

    try {
      const artistName = eventData.artist_business_name ||
        `${(eventData.artist_first_name || '')} ${(eventData.artist_last_name || '')}`.trim() || eventData.artist_email;
      await emailService.queueEmail(eventData.artist_id, 'artist_event_claimed_confirmation', {
        artist_name: artistName,
        promoter_name: eventData.promoter_name || 'Event Organizer',
        event_name: existingEvent[0].title,
        event_start_date: new Date(eventData.event_start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        event_end_date: new Date(eventData.event_end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        event_location: [eventData.city, eventData.state].filter(Boolean).join(', ') || 'Location TBD',
        event_url: `${process.env.FRONTEND_URL}/events/${eventId}`,
        action_type: 'linked',
        action_type_title: 'Linked',
        action_description: 'linked your suggested event to their existing listing for',
        action_explanation: 'The promoter has connected your calendar entry to their official event page. Your calendar will now display their complete event details, and you have been added as an applicant to the event.'
      }, { priority: 2 });
    } catch (e) { /* non-fatal */ }

    return { event_id: eventId, event_title: existingEvent[0].title };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

// ============================================================================
// ADMIN: UNCLAIMED EVENTS (Promoter Onboarding)
// ============================================================================

/**
 * Get unclaimed events created by admin (pending promoter claim)
 */
async function getUnclaimedEvents() {
  const [events] = await db.execute(`
    SELECT 
      e.id as event_id,
      e.title as event_title,
      e.start_date as event_start_date,
      e.end_date as event_end_date,
      e.venue_name,
      e.venue_city,
      e.venue_state,
      e.created_at,
      u.id as user_id,
      u.username as promoter_email,
      CONCAT(up.first_name, ' ', up.last_name) as promoter_name,
      pct.token,
      pct.expires_at,
      admin_user.username as created_by_admin_email
    FROM events e
    JOIN users u ON e.promoter_id = u.id
    JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN promoter_claim_tokens pct ON e.id = pct.event_id AND pct.claimed = 0
    LEFT JOIN users admin_user ON e.created_by_admin_id = admin_user.id
    WHERE e.claim_status = 'pending_claim'
      AND u.status = 'draft'
    ORDER BY e.created_at DESC
  `);
  return events;
}

/**
 * Resend claim email for an unclaimed event
 */
async function resendClaimEmail(eventId, adminUserId) {
  const EmailService = require('../../../services/emailService');
  const emailService = new EmailService();
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Get event and promoter details
    const [eventData] = await connection.execute(`
      SELECT 
        e.id as event_id,
        e.title as event_title,
        e.start_date,
        e.end_date,
        e.venue_name,
        e.venue_city,
        e.venue_state,
        u.id as user_id,
        u.username as promoter_email,
        up.first_name,
        up.last_name,
        pct.id as token_id,
        pct.token
      FROM events e
      JOIN users u ON e.promoter_id = u.id
      JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN promoter_claim_tokens pct ON e.id = pct.event_id AND pct.claimed = 0
      WHERE e.id = ? AND e.claim_status = 'pending_claim'
      FOR UPDATE
    `, [eventId]);

    if (eventData.length === 0) {
      await connection.rollback();
      throw new Error('Event not found or already claimed');
    }

    const event = eventData[0];
    let token = event.token;

    // If no unclaimed token exists, generate a new one
    if (!token) {
      token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 6);

      await connection.execute(`
        INSERT INTO promoter_claim_tokens (
          user_id, event_id, token, promoter_email,
          expires_at, created_by_admin_id
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [event.user_id, eventId, token, event.promoter_email, expiresAt, adminUserId]);
    }

    await connection.commit();

    // Send claim email
    const claimUrl = `${process.env.FRONTEND_URL}/promoters/claim/${token}`;

    const templateData = {
      promoter_name: `${event.first_name} ${event.last_name}`,
      promoter_first_name: event.first_name,
      event_title: event.event_title,
      event_start_date: new Date(event.start_date).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      }),
      event_end_date: new Date(event.end_date).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      }),
      venue_name: event.venue_name || 'TBD',
      venue_city: event.venue_city || '',
      venue_state: event.venue_state || '',
      claim_url: claimUrl,
      expires_days: 180
    };

    await emailService.sendExternalEmail(
      event.promoter_email,
      'promoter_claim_invitation',
      templateData
    );

    return { success: true, message: 'Claim email resent successfully' };

  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Delete unclaimed event and its draft promoter
 */
async function deleteUnclaimedEvent(eventId) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Get event and user details
    const [eventData] = await connection.execute(`
      SELECT e.id, e.promoter_id, u.status
      FROM events e
      JOIN users u ON e.promoter_id = u.id
      WHERE e.id = ? AND e.claim_status = 'pending_claim' AND u.status = 'draft'
      FOR UPDATE
    `, [eventId]);

    if (eventData.length === 0) {
      await connection.rollback();
      throw new Error('Event not found or already claimed');
    }

    const event = eventData[0];

    // Delete claim tokens
    await connection.execute(
      'DELETE FROM promoter_claim_tokens WHERE event_id = ?',
      [eventId]
    );

    // Delete event (CASCADE will handle related records)
    await connection.execute(
      'DELETE FROM events WHERE id = ?',
      [eventId]
    );

    // Delete user profiles
    await connection.execute(
      'DELETE FROM user_profiles WHERE user_id = ?',
      [event.promoter_id]
    );

    await connection.execute(
      'DELETE FROM promoter_profiles WHERE user_id = ?',
      [event.promoter_id]
    );

    // Delete user permissions
    await connection.execute(
      'DELETE FROM user_permissions WHERE user_id = ?',
      [event.promoter_id]
    );

    // Delete user
    await connection.execute(
      'DELETE FROM users WHERE id = ?',
      [event.promoter_id]
    );

    await connection.commit();

    return { success: true, message: 'Event and draft promoter deleted successfully' };

  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  // Event types
  getEventTypes,
  
  // Event CRUD
  getEventById,
  getEventWithImages,
  createEvent,
  updateEvent,
  archiveEvent,
  
  // Application fields
  getApplicationFields,
  addApplicationField,
  clearApplicationFields,
  
  // Available add-ons
  getAvailableAddons,
  addAvailableAddon,
  clearAvailableAddons,
  
  // Images
  getEventImages,
  getEventCategories,
  getEventArtists,

  // Promoter events
  getPromoterEvents,

  // Upcoming (public)
  getUpcomingEvents,

  // Artist applications (public profile)
  getArtistEventApplications,

  // Admin
  getAllEvents,
  getEventCount,

  // Jury packets
  getJuryPackets,
  getJuryPacketById,
  createJuryPacket,
  updateJuryPacket,
  deleteJuryPacket,

  // Artist custom events
  getCustomEvents,
  createCustomEvent,
  updateCustomEvent,
  deleteCustomEvent,

  // Event claim (artist custom event → promoter claims)
  verifyClaimToken,
  claimNew,
  linkExisting,

  // Admin: Unclaimed events (promoter onboarding)
  getUnclaimedEvents,
  resendClaimEmail,
  deleteUnclaimedEvent
};
