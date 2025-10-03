const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const upload = require('../config/multer');
const { requirePermission } = require('../middleware/permissions');
const geocodingService = require('../services/geocodingService');
const eventSchemaService = require('../services/eventSchemaService');

/**
 * @fileoverview Comprehensive event management routes
 * 
 * Handles complete event lifecycle management including:
 * - Event CRUD operations with comprehensive filtering and search
 * - Event types management and categorization
 * - Artist management and application processing
 * - Custom artist events and personal event management
 * - Event image upload and management with temporary storage
 * - Event categories and classification system
 * - Event add-ons and additional services management
 * - Application fields customization and configuration
 * - Ticket sales system with Stripe payment integration
 * - Schema.org JSON-LD generation for SEO optimization
 * - Geocoding integration for venue location services
 * - Permission-based access control for different user roles
 * 
 * This system supports multi-tenant event management with role-based permissions,
 * comprehensive application workflows, and integrated payment processing.
 * 
 * @author Beemeeart Development Team
 * @version 1.0.0
 */

// --- Event CRUD Endpoints ---

/**
 * List and search events with comprehensive filtering
 * @route GET /api/events
 * @access Public
 * @param {Object} req - Express request object
 * @param {string} req.query.promoter_id - Filter by promoter ID (optional)
 * @param {string} req.query.event_status - Filter by event status (comma-separated) (optional)
 * @param {string} req.query.allow_applications - Filter by application acceptance (optional)
 * @param {string} req.query.application_status - Filter by application status (optional)
 * @param {Object} res - Express response object
 * @returns {Array} List of events with event type information
 * @description Retrieves events with flexible filtering options and event type details
 */
router.get('/', async (req, res) => {
  try {
    const { promoter_id, event_status, allow_applications, application_status } = req.query;
    let query = `
      SELECT 
        e.*,
        et.name as event_type_name
      FROM events e
      LEFT JOIN event_types et ON e.event_type_id = et.id
      WHERE 1=1
    `;
    const params = [];

    if (promoter_id) {
      query += ' AND e.promoter_id = ?';
      params.push(promoter_id);
    }
    if (event_status) {
      const statuses = event_status.split(',');
      query += ` AND e.event_status IN (${statuses.map(() => '?').join(',')})`;
      params.push(...statuses);
    }
    if (allow_applications) {
      query += ' AND e.allow_applications = ?';
      params.push(allow_applications === '1' ? 1 : 0);
    }
    if (application_status) {
      query += ' AND e.application_status = ?';
      params.push(application_status);
    }

    query += ' ORDER BY e.start_date DESC';

    const [events] = await db.execute(query, params);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list events', details: err.message });
  }
});

/**
 * Get artist's custom personal events
 * @route GET /api/events/my-events
 * @access Private (requires authentication)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Array} List of artist's custom events
 * @description Retrieves personal events created by the authenticated artist
 */
router.get('/my-events', verifyToken, async (req, res) => {
    try {
        const artistId = req.userId;
        const [events] = await db.query(
            'SELECT * FROM artist_custom_events WHERE artist_id = ? ORDER BY event_date DESC',
            [artistId]
        );
        res.json(events);
    } catch (error) {
        console.error('Error fetching custom events:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Get available event types
 * @route GET /api/events/types
 * @access Public
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Array} List of active event types
 * @description Retrieves all active event types for event categorization
 */
router.get('/types', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM event_types WHERE is_active = TRUE ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch event types', details: err.message });
  }
});

/**
 * Get single event details
 * @route GET /api/events/:id
 * @access Public
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Event ID
 * @param {Object} res - Express response object
 * @returns {Object} Complete event details with type information
 * @description Retrieves detailed information for a specific event
 */
router.get('/:id', async (req, res) => {
  try {
    const [event] = await db.execute(`
      SELECT 
        e.*,
        et.name as event_type_name,
        et.description as event_type_description
      FROM events e
      LEFT JOIN event_types et ON e.event_type_id = et.id
      WHERE e.id = ?
    `, [req.params.id]);
    
    if (event.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(event[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get event', details: err.message });
  }
});

/**
 * Create new event
 * @route POST /api/events
 * @access Private (requires authentication and events permission)
 * @param {Object} req - Express request object
 * @param {Object} req.body - Event creation data
 * @param {Object} res - Express response object
 * @returns {Object} Created event details
 * @description Creates new event with geocoding, schema generation, and image processing
 */
router.post('/', verifyToken, requirePermission('events'), async (req, res) => {
  try {
    const {
      event_type_id, title, description, short_description, start_date, end_date,
      venue_name, venue_address, venue_city, venue_state, venue_zip, venue_country,
      venue_capacity, age_restrictions, age_minimum, dress_code,
      has_rsvp, has_tickets, rsvp_url,
      allow_applications, application_status, application_deadline,
      jury_date, notification_date, admission_fee, parking_fee, parking_info, parking_details,
      accessibility_info, application_fee, booth_fee, jury_fee, max_applications, max_artists,
      seo_title, meta_description, event_keywords
    } = req.body;

    // Use user ID from JWT token
    const promoter_id = req.userId;
    const created_by = req.userId;
    const event_status = 'active'; // Auto-set to active

    // Geocode the venue address
    const { latitude, longitude } = await geocodingService.geocodeAddress(
      venue_address, venue_city, venue_state, venue_zip
    );

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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?)
    `, [
      promoter_id, event_type_id, null, null, title, description, short_description || null,
      event_status, application_status || 'not_accepting', allow_applications || 0, start_date, end_date,
      application_deadline || null, jury_date || null, notification_date || null, venue_name, venue_address || null,
      venue_city, venue_state, venue_zip || null, 'USA', venue_capacity || null,
      age_restrictions || 'all_ages', age_minimum || null, dress_code || null, has_rsvp || false, has_tickets || false, rsvp_url || null,
      latitude, longitude, parking_info || null, accessibility_info || null, admission_fee || null, parking_fee || null, parking_details || null,
      application_fee || null, jury_fee || null, booth_fee || null, max_artists || null, max_applications || null,
      seo_title || null, meta_description || null, event_keywords || null, null, null,
      created_by, created_by
    ]);

    // Get the created event with related data
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
    `, [result.insertId]);

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

    const eventImages = req.body.images || [];
    const completeSchema = eventSchemaService.generateCompleteSchema(event, promoterData, eventImages);
    
    // Save uploaded images to event_images table
    if (eventImages && eventImages.length > 0) {
      for (let i = 0; i < eventImages.length; i++) {
        const imageUrl = eventImages[i];
        await db.execute(`
          INSERT INTO event_images (event_id, image_url, friendly_name, is_primary, alt_text, order_index)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [result.insertId, imageUrl, `Event Image ${i + 1}`, i === 0 ? 1 : 0, event.title, i]);
      }
    }

    // Update the event with the generated schema
    await db.execute(`
      UPDATE events 
      SET event_schema = ? 
      WHERE id = ?
    `, [JSON.stringify(completeSchema), result.insertId]);

    // Return the event (clean up the response)
    const responseEvent = {
      id: event.id,
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

    res.status(201).json(responseEvent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create event', details: err.message });
  }
});

/**
 * Update existing event
 * @route PUT /api/events/:id
 * @access Private (requires authentication and events permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Event ID
 * @param {Object} req.body - Event update data
 * @param {Object} res - Express response object
 * @returns {Object} Updated event details
 * @description Updates event information with comprehensive field support
 */
router.put('/:id', verifyToken, requirePermission('events'), async (req, res) => {
  try {
    const {
      title, description, start_date, end_date, venue_name, venue_address,
      venue_city, venue_state, venue_zip, venue_capacity, age_restrictions, age_minimum,
      dress_code, has_rsvp, has_tickets, rsvp_url, event_status, allow_applications,
      application_status, application_deadline, application_fee, booth_fee,
      jury_fee, max_applications, seo_title, meta_description, event_keywords
    } = req.body;

    await db.execute(`
      UPDATE events SET 
        title = ?, description = ?, start_date = ?, end_date = ?,
        venue_name = ?, venue_address = ?, venue_city = ?, venue_state = ?, venue_zip = ?,
        venue_capacity = ?, age_restrictions = ?, age_minimum = ?, dress_code = ?,
        has_rsvp = ?, has_tickets = ?, rsvp_url = ?,
        event_status = ?, allow_applications = ?, application_status = ?, application_deadline = ?,
        application_fee = ?, booth_fee = ?, jury_fee = ?, max_applications = ?, 
        seo_title = ?, meta_description = ?, event_keywords = ?, updated_at = NOW()
      WHERE id = ?
    `, [
      title, description, start_date, end_date, venue_name, venue_address,
      venue_city, venue_state, venue_zip, venue_capacity || null, age_restrictions || 'all_ages', age_minimum || null,
      dress_code || null, has_rsvp || false, has_tickets || false, rsvp_url || null,
      event_status, allow_applications, application_status, application_deadline, application_fee, booth_fee,
      jury_fee, max_applications, seo_title || null, meta_description || null, event_keywords || null, req.params.id
    ]);

    const [updatedEvent] = await db.execute(`
      SELECT 
        e.*,
        et.name as event_type_name
      FROM events e
      LEFT JOIN event_types et ON e.event_type_id = et.id
      WHERE e.id = ?
    `, [req.params.id]);

    res.json(updatedEvent[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update event', details: err.message });
  }
});

/**
 * Archive event (soft delete)
 * @route DELETE /api/events/:id
 * @access Private (requires authentication and events permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Event ID
 * @param {Object} res - Express response object
 * @returns {Object} Success confirmation
 * @description Archives event by setting status to 'archived' (soft delete)
 */
router.delete('/:id', verifyToken, requirePermission('events'), async (req, res) => {
  try {
    await db.execute(
      'UPDATE events SET event_status = ?, updated_at = NOW() WHERE id = ?',
      ['archived', req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive event', details: err.message });
  }
});

/**
 * Renew event for next year
 * @route POST /api/events/:id/renew
 * @access Private (requires authentication and events permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Event ID to renew
 * @param {Object} res - Express response object
 * @returns {Object} New event details for next year
 * @description Creates new event for next year based on existing event template
 */
router.post('/:id/renew', verifyToken, requirePermission('events'), async (req, res) => {
  try {
    const [originalEvent] = await db.execute('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (originalEvent.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = originalEvent[0];
    
    // Create new event with updated dates (add 1 year)
    const newStartDate = new Date(event.start_date);
    const newEndDate = new Date(event.end_date);
    newStartDate.setFullYear(newStartDate.getFullYear() + 1);
    newEndDate.setFullYear(newEndDate.getFullYear() + 1);

    const [result] = await db.execute(`
      INSERT INTO events (
        promoter_id, event_type_id, title, description, start_date, end_date,
        venue_name, venue_address, venue_city, venue_state, venue_zip,
        event_status, allow_applications, application_status, application_deadline,
        application_fee, booth_fee, jury_fee, max_applications, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      event.promoter_id, event.event_type_id, `${event.title} ${newStartDate.getFullYear()}`, 
      event.description, newStartDate, newEndDate, event.venue_name, event.venue_address,
      event.venue_city, event.venue_state, event.venue_zip, 'draft', event.allow_applications,
      'closed', null, event.application_fee, event.booth_fee, event.jury_fee, event.max_applications
    ]);

    const [newEvent] = await db.execute(`
      SELECT 
        e.*,
        et.name as event_type_name
      FROM events e
      LEFT JOIN event_types et ON e.event_type_id = et.id
      WHERE e.id = ?
    `, [result.insertId]);

    res.status(201).json(newEvent[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to renew event', details: err.message });
  }
});

// --- Artist Management Endpoints ---

/**
 * List artists for event (public view)
 * @route GET /api/events/:id/artists
 * @access Public
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Event ID
 * @param {Object} res - Express response object
 * @returns {Object} List of accepted/confirmed artists with profiles
 * @description Retrieves public list of artists participating in the event
 */
router.get('/:id/artists', async (req, res) => {
  try {
    const eventId = req.params.id;
    
    const [artists] = await db.execute(`
      SELECT 
        ea.status as application_status,
        ea.artist_statement,
        ea.portfolio_url,
        u.id as artist_id,
        u.username,
        up.first_name,
        up.last_name,
        up.bio,
        up.profile_image_path,
        ap.business_name,
        ap.artist_biography,
        ap.studio_city,
        ap.studio_state,
        ap.art_categories,
        ap.art_mediums,
        ap.business_website,
        ap.business_social_instagram,
        ap.business_social_facebook
      FROM event_applications ea
      JOIN users u ON ea.artist_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN artist_profiles ap ON u.id = ap.user_id
      WHERE ea.event_id = ? 
        AND ea.status IN ('accepted', 'confirmed')
      ORDER BY ea.status DESC, ea.submitted_at ASC
    `, [eventId]);

    // Transform data for public display
    const transformedArtists = artists.map(artist => ({
      artist_id: artist.artist_id,
      name: artist.business_name || `${artist.first_name} ${artist.last_name}`,
      display_name: artist.business_name || artist.first_name,
      bio: artist.artist_biography || artist.bio,
      location: artist.studio_city && artist.studio_state ? 
        `${artist.studio_city}, ${artist.studio_state}` : null,
      profile_image: artist.profile_image_path,
      portfolio_url: artist.portfolio_url,
      website: artist.business_website,
      social_instagram: artist.business_social_instagram,
      social_facebook: artist.business_social_facebook,
      art_categories: artist.art_categories,
      art_mediums: artist.art_mediums,
      status_label: artist.application_status === 'confirmed' ? 'Exhibiting' : 'Invited',
      application_status: artist.application_status
    }));

    res.json({ 
      artists: transformedArtists,
      total: transformedArtists.length,
      event_id: eventId 
    });
  } catch (err) {
    console.error('Error fetching event artists:', err);
    res.status(500).json({ error: 'Failed to fetch event artists', details: err.message });
  }
});

/**
 * Add artist manually to event
 * @route POST /api/events/:id/artists
 * @access Private (requires authentication and events permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Event ID
 * @param {Object} res - Express response object
 * @returns {Object} Success confirmation
 * @description Manually adds artist to event (TODO: Implementation needed)
 */
router.post('/:id/artists', verifyToken, requirePermission('events'), (req, res) => {
  // TODO: Implement manual artist addition
  res.send('Add artist manually');
});

// Update artist status (events permission required)
router.put('/:id/artists/:artistId', verifyToken, requirePermission('events'), (req, res) => {
  // TODO: Implement update artist status
  res.send('Update artist status');
});

// Remove artist (events permission required)
router.delete('/:id/artists/:artistId', verifyToken, requirePermission('events'), (req, res) => {
  // TODO: Implement remove artist from event
  res.send('Remove artist from event');
});

// --- Application Endpoints ---

// List applications for event
router.get('/:id/applications', (req, res) => {
  // TODO: Implement list applications for event
  res.send('List applications for event');
});

// Submit application
router.post('/:id/applications', (req, res) => {
  // TODO: Implement submit application
  res.send('Submit application');
});

// Update application
router.put('/:id/applications/:appId', (req, res) => {
  // TODO: Implement update application
  res.send('Update application');
});

// List applications for current user
router.get('/applications/my', (req, res) => {
  // TODO: Implement list applications for current user
  res.send('List my applications');
});

// --- Event Images Endpoints ---

// Upload event images
router.post('/upload', 
  verifyToken,
  upload.array('images'),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const { event_id } = req.query;
      
      // If event_id is provided, verify it belongs to the user
              if (event_id && event_id !== 'new') {
          const [event] = await db.execute(
            'SELECT id FROM events WHERE id = ? AND (promoter_id = ? OR created_by = ?)', 
            [event_id, req.userId, req.userId]
          );
        if (!event.length) {
          return res.status(404).json({ error: 'Event not found or not authorized' });
        }
      }

      const urls = [];
      
      // Record temp image URLs 
      for (const file of req.files) {
        const imagePath = `/temp_images/events/${file.filename}`;
        
        // Insert into pending_images with original name and mime type
        await db.execute(
          'INSERT INTO pending_images (user_id, image_path, original_name, mime_type, status) VALUES (?, ?, ?, ?, ?)',
          [req.userId, imagePath, file.originalname, file.mimetype, 'pending']
        );
        
        urls.push(imagePath);
      }

      res.json({ urls });
    } catch (err) {
      console.error('Event image upload error:', err);
      res.status(500).json({ error: err.message || 'Failed to upload images' });
    }
  }
);

// Get event images
router.get('/:id/images', async (req, res) => {
  try {
    const [images] = await db.execute(
      'SELECT * FROM event_images WHERE event_id = ? ORDER BY order_index ASC',
      [req.params.id]
    );
    res.json({ success: true, images });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get event images', details: err.message });
  }
});

// --- Event Categories Endpoints ---

// Get event categories
router.get('/:id/categories', async (req, res) => {
  try {
    const [categories] = await db.execute(`
      SELECT c.* FROM event_categories ec
      JOIN categories c ON ec.category_id = c.id
      WHERE ec.event_id = ?
      ORDER BY c.name ASC
    `, [req.params.id]);
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get event categories', details: err.message });
  }
});

// ============================================================================
// CUSTOM EVENTS (Artist Personal Events)
// ============================================================================

/**
 * Create new custom artist event
 * @route POST /api/events/custom
 * @access Private (requires authentication)
 * @param {Object} req - Express request object
 * @param {Object} req.body - Custom event data
 * @param {Object} res - Express response object
 * @returns {Object} Created custom event details
 * @description Creates personal event for authenticated artist
 */
router.post('/custom', verifyToken, async (req, res) => {
    try {
        const artistId = req.userId;
        const { title, description, event_date, location, event_type } = req.body;
        
        const [result] = await db.query(`
            INSERT INTO artist_custom_events (artist_id, title, description, event_date, location, event_type, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [artistId, title, description, event_date, location || null, event_type || 'other']);
        
        const [event] = await db.query(
            'SELECT * FROM artist_custom_events WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json({
            message: 'Custom event created successfully',
            event: event[0]
        });
    } catch (error) {
        console.error('Error creating custom event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Update custom artist event
 * @route PUT /api/events/custom/:id
 * @access Private (requires authentication and ownership)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Custom event ID
 * @param {Object} req.body - Update data
 * @param {Object} res - Express response object
 * @returns {Object} Updated custom event details
 * @description Updates personal event with ownership validation
 */
router.put('/custom/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const artistId = req.userId;
        const { title, description, event_date, location, event_type } = req.body;
        
        // Verify ownership
        const [existingEvent] = await db.query(
            'SELECT * FROM artist_custom_events WHERE id = ? AND artist_id = ?',
            [id, artistId]
        );
        
        if (existingEvent.length === 0) {
            return res.status(404).json({ error: 'Custom event not found or access denied' });
        }
        
        await db.query(`
            UPDATE artist_custom_events 
            SET title = ?, description = ?, event_date = ?, location = ?, event_type = ?, updated_at = NOW()
            WHERE id = ? AND artist_id = ?
        `, [title, description, event_date, location, event_type, id, artistId]);
        
        const [updatedEvent] = await db.query(
            'SELECT * FROM artist_custom_events WHERE id = ?',
            [id]
        );
        
        res.json({
            message: 'Custom event updated successfully',
            event: updatedEvent[0]
        });
    } catch (error) {
        console.error('Error updating custom event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Delete custom artist event
 * @route DELETE /api/events/custom/:id
 * @access Private (requires authentication and ownership)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Custom event ID
 * @param {Object} res - Express response object
 * @returns {Object} Success confirmation
 * @description Deletes personal event with ownership validation
 */
router.delete('/custom/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const artistId = req.userId;
        
        // Verify ownership
        const [existingEvent] = await db.query(
            'SELECT * FROM artist_custom_events WHERE id = ? AND artist_id = ?',
            [id, artistId]
        );
        
        if (existingEvent.length === 0) {
            return res.status(404).json({ error: 'Custom event not found or access denied' });
        }
        
        await db.query('DELETE FROM artist_custom_events WHERE id = ? AND artist_id = ?', [id, artistId]);
        
        res.json({ message: 'Custom event deleted successfully' });
    } catch (error) {
        console.error('Error deleting custom event:', error);
        res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Event Add-on Management Endpoints ---

// Get available add-ons for an event
router.get('/:id/available-addons', verifyToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    
    const [addons] = await db.execute(`
      SELECT * FROM event_available_addons 
      WHERE event_id = ? AND is_active = 1 
      ORDER BY display_order ASC, addon_name ASC
    `, [eventId]);
    
    res.json(addons);
  } catch (error) {
    console.error('Error fetching event add-ons:', error);
    res.status(500).json({ error: 'Failed to fetch event add-ons' });
  }
});

// Add available add-on to an event (events permission required)
router.post('/:id/available-addons', verifyToken, requirePermission('events'), async (req, res) => {
  try {
    const eventId = req.params.id;
    const { addon_name, addon_description, addon_price, display_order } = req.body;
    
    // Verify event exists and user has access
    const [eventCheck] = await db.execute('SELECT promoter_id FROM events WHERE id = ?', [eventId]);
    if (eventCheck.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Admin users can modify any event, others need to own it
    if (!req.roles.includes('admin') && eventCheck[0].promoter_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const [result] = await db.execute(`
      INSERT INTO event_available_addons (event_id, addon_name, addon_description, addon_price, display_order)
      VALUES (?, ?, ?, ?, ?)
    `, [eventId, addon_name, addon_description, addon_price, display_order || 0]);
    
    res.json({ 
      id: result.insertId, 
      event_id: eventId, 
      addon_name, 
      addon_description, 
      addon_price, 
      display_order: display_order || 0,
      is_active: true
    });
  } catch (error) {
    console.error('Error adding event add-on:', error);
    res.status(500).json({ error: 'Failed to add event add-on' });
  }
});

// Update available add-on (events permission required)
router.put('/:id/available-addons/:addon_id', verifyToken, requirePermission('events'), async (req, res) => {
  try {
    const eventId = req.params.id;
    const addonId = req.params.addon_id;
    const { addon_name, addon_description, addon_price, display_order, is_active } = req.body;
    
    // Verify event exists and user has access
    const [eventCheck] = await db.execute('SELECT promoter_id FROM events WHERE id = ?', [eventId]);
    if (eventCheck.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Admin users can modify any event, others need to own it
    if (!req.roles.includes('admin') && eventCheck[0].promoter_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Verify add-on belongs to this event
    const [addonCheck] = await db.execute('SELECT id FROM event_available_addons WHERE id = ? AND event_id = ?', [addonId, eventId]);
    if (addonCheck.length === 0) {
      return res.status(404).json({ error: 'Add-on not found' });
    }
    
    await db.execute(`
      UPDATE event_available_addons 
      SET addon_name = ?, addon_description = ?, addon_price = ?, display_order = ?, is_active = ?
      WHERE id = ? AND event_id = ?
    `, [addon_name, addon_description, addon_price, display_order || 0, is_active !== undefined ? is_active : true, addonId, eventId]);
    
    res.json({ message: 'Add-on updated successfully' });
  } catch (error) {
    console.error('Error updating event add-on:', error);
    res.status(500).json({ error: 'Failed to update event add-on' });
  }
});

// Delete available add-on (events permission required)
router.delete('/:id/available-addons/:addon_id', verifyToken, requirePermission('events'), async (req, res) => {
  try {
    const eventId = req.params.id;
    const addonId = req.params.addon_id;
    
    // Verify event exists and user has access
    const [eventCheck] = await db.execute('SELECT promoter_id FROM events WHERE id = ?', [eventId]);
    if (eventCheck.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Admin users can modify any event, others need to own it
    if (!req.roles.includes('admin') && eventCheck[0].promoter_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Verify add-on belongs to this event
    const [addonCheck] = await db.execute('SELECT id FROM event_available_addons WHERE id = ? AND event_id = ?', [addonId, eventId]);
    if (addonCheck.length === 0) {
      return res.status(404).json({ error: 'Add-on not found' });
    }
    
    await db.execute('DELETE FROM event_available_addons WHERE id = ? AND event_id = ?', [addonId, eventId]);
    
    res.json({ message: 'Add-on deleted successfully' });
  } catch (error) {
    console.error('Error deleting event add-on:', error);
    res.status(500).json({ error: 'Failed to delete event add-on' });
  }
});

// --- Application Fields Management Endpoints ---

// Get application fields for an event
router.get('/:id/application-fields', verifyToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    
    const [fields] = await db.execute(`
      SELECT * FROM event_application_fields 
      WHERE event_id = ? 
      ORDER BY display_order ASC, field_name ASC
    `, [eventId]);
    
    res.json(fields);
  } catch (error) {
    console.error('Error fetching event application fields:', error);
    res.status(500).json({ error: 'Failed to fetch event application fields' });
  }
});

// Add application field to an event (events permission required)
router.post('/:id/application-fields', verifyToken, requirePermission('events'), async (req, res) => {
  try {
    const eventId = req.params.id;
    const { field_type, field_name, field_description, is_required, verified_can_skip, display_order } = req.body;
    
    // Verify event exists and user has access
    const [eventCheck] = await db.execute('SELECT promoter_id FROM events WHERE id = ?', [eventId]);
    if (eventCheck.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Admin users can modify any event, others need to own it
    if (!req.roles.includes('admin') && eventCheck[0].promoter_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const [result] = await db.execute(`
      INSERT INTO event_application_fields (event_id, field_type, field_name, field_description, is_required, verified_can_skip, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [eventId, field_type, field_name, field_description || null, is_required || false, verified_can_skip || false, display_order || 0]);
    
    res.json({ 
      id: result.insertId, 
      event_id: eventId, 
      field_type,
      field_name, 
      field_description, 
      is_required: is_required || false,
      verified_can_skip: verified_can_skip || false,
      display_order: display_order || 0
    });
  } catch (error) {
    console.error('Error adding event application field:', error);
    res.status(500).json({ error: 'Failed to add event application field' });
  }
});

// Update application field (events permission required)
router.put('/:id/application-fields/:field_id', verifyToken, requirePermission('events'), async (req, res) => {
  try {
    const eventId = req.params.id;
    const fieldId = req.params.field_id;
    const { field_type, field_name, field_description, is_required, verified_can_skip, display_order } = req.body;
    
    // Verify event exists and user has access
    const [eventCheck] = await db.execute('SELECT promoter_id FROM events WHERE id = ?', [eventId]);
    if (eventCheck.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Admin users can modify any event, others need to own it
    if (!req.roles.includes('admin') && eventCheck[0].promoter_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Verify field belongs to this event
    const [fieldCheck] = await db.execute('SELECT id FROM event_application_fields WHERE id = ? AND event_id = ?', [fieldId, eventId]);
    if (fieldCheck.length === 0) {
      return res.status(404).json({ error: 'Application field not found' });
    }
    
    await db.execute(`
      UPDATE event_application_fields 
      SET field_type = ?, field_name = ?, field_description = ?, is_required = ?, verified_can_skip = ?, display_order = ?
      WHERE id = ? AND event_id = ?
    `, [field_type, field_name, field_description || null, is_required || false, verified_can_skip || false, display_order || 0, fieldId, eventId]);
    
    res.json({ message: 'Application field updated successfully' });
  } catch (error) {
    console.error('Error updating event application field:', error);
    res.status(500).json({ error: 'Failed to update event application field' });
  }
});

// Delete application field (events permission required)
router.delete('/:id/application-fields/:field_id', verifyToken, requirePermission('events'), async (req, res) => {
  try {
    const eventId = req.params.id;
    const fieldId = req.params.field_id;
    
    // Verify event exists and user has access
    const [eventCheck] = await db.execute('SELECT promoter_id FROM events WHERE id = ?', [eventId]);
    if (eventCheck.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Admin users can modify any event, others need to own it
    if (!req.roles.includes('admin') && eventCheck[0].promoter_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Verify field belongs to this event
    const [fieldCheck] = await db.execute('SELECT id FROM event_application_fields WHERE id = ? AND event_id = ?', [fieldId, eventId]);
    if (fieldCheck.length === 0) {
      return res.status(404).json({ error: 'Application field not found' });
    }
    
    await db.execute('DELETE FROM event_application_fields WHERE id = ? AND event_id = ?', [fieldId, eventId]);
    
    res.json({ message: 'Application field deleted successfully' });
  } catch (error) {
    console.error('Error deleting event application field:', error);
    res.status(500).json({ error: 'Failed to delete event application field' });
  }
});

// ============================================================================
// TICKET SALES SYSTEM
// ============================================================================

/**
 * Get tickets for event (public)
 * @route GET /api/events/:id/tickets
 * @access Public
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Event ID
 * @param {Object} res - Express response object
 * @returns {Object} Available tickets for the event
 * @description Retrieves public ticket information for event
 */
router.get('/:id/tickets', async (req, res) => {
  try {
    const eventId = req.params.id;
    
    const [tickets] = await db.execute(`
      SELECT id, ticket_type, price, quantity_available, quantity_sold, description
      FROM event_tickets 
      WHERE event_id = ? AND is_active = TRUE
      ORDER BY price ASC
    `, [eventId]);

    res.json({ 
      success: true,
      tickets,
      event_id: eventId 
    });
  } catch (err) {
    console.error('Error fetching event tickets:', err);
    res.status(500).json({ error: 'Failed to fetch tickets', details: err.message });
  }
});

/**
 * Create tickets for event
 * @route POST /api/events/:id/tickets
 * @access Private (requires authentication, ownership, and tickets permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Event ID
 * @param {Object} req.body - Ticket creation data
 * @param {Object} res - Express response object
 * @returns {Object} Created ticket details
 * @description Creates new ticket type for event with permission validation
 */
router.post('/:id/tickets', verifyToken, async (req, res) => {
  try {
    const eventId = req.params.id;
    const promoterId = req.userId;
    const { ticket_type, price, quantity_available, description } = req.body;

    // Verify promoter owns this event AND has tickets permission
    const [event] = await db.execute(`
      SELECT e.promoter_id, up.tickets
      FROM events e
      JOIN user_permissions up ON e.promoter_id = up.user_id
      WHERE e.id = ?
    `, [eventId]);

    if (event.length === 0 || event[0].promoter_id !== promoterId) {
      return res.status(403).json({ error: 'Access denied - not your event' });
    }

    if (!event[0].tickets) {
      return res.status(403).json({ error: 'Access denied - tickets permission required' });
    }

    const [result] = await db.execute(`
      INSERT INTO event_tickets (event_id, ticket_type, price, quantity_available, description)
      VALUES (?, ?, ?, ?, ?)
    `, [eventId, ticket_type, parseFloat(price), parseInt(quantity_available), description || null]);

    res.status(201).json({ 
      success: true,
      ticket: {
        id: result.insertId,
        event_id: eventId,
        ticket_type,
        price: parseFloat(price),
        quantity_available: parseInt(quantity_available),
        description
      }
    });
  } catch (err) {
    console.error('Error creating ticket:', err);
    res.status(500).json({ error: 'Failed to create ticket', details: err.message });
  }
});

// Update ticket (promoter only)  
router.put('/:id/tickets/:ticketId', verifyToken, async (req, res) => {
  try {
    const { id: eventId, ticketId } = req.params;
    const promoterId = req.userId;
    const { ticket_type, price, quantity_available, description } = req.body;

    // Verify ownership and permissions
    const [verification] = await db.execute(`
      SELECT e.promoter_id, up.tickets
      FROM events e
      JOIN event_tickets et ON e.id = et.event_id
      JOIN user_permissions up ON e.promoter_id = up.user_id
      WHERE e.id = ? AND et.id = ?
    `, [eventId, ticketId]);

    if (verification.length === 0 || verification[0].promoter_id !== promoterId || !verification[0].tickets) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.execute(`
      UPDATE event_tickets 
      SET ticket_type = ?, price = ?, quantity_available = ?, description = ?, updated_at = NOW()
      WHERE id = ? AND event_id = ?
    `, [ticket_type, parseFloat(price), parseInt(quantity_available), description || null, ticketId, eventId]);

    res.json({ success: true, message: 'Ticket updated successfully' });
  } catch (err) {
    console.error('Error updating ticket:', err);
    res.status(500).json({ error: 'Failed to update ticket', details: err.message });
  }
});

// Delete ticket (promoter only)
router.delete('/:id/tickets/:ticketId', verifyToken, async (req, res) => {
  try {
    const { id: eventId, ticketId } = req.params;
    const promoterId = req.userId;

    // Verify ownership and permissions
    const [verification] = await db.execute(`
      SELECT e.promoter_id, up.tickets, et.quantity_sold
      FROM events e
      JOIN event_tickets et ON e.id = et.event_id
      JOIN user_permissions up ON e.promoter_id = up.user_id
      WHERE e.id = ? AND et.id = ?
    `, [eventId, ticketId]);

    if (verification.length === 0 || verification[0].promoter_id !== promoterId || !verification[0].tickets) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Don't delete if tickets have been sold
    if (verification[0].quantity_sold > 0) {
      return res.status(400).json({ error: 'Cannot delete ticket type with existing sales' });
    }

    await db.execute('DELETE FROM event_tickets WHERE id = ? AND event_id = ?', [ticketId, eventId]);
    res.json({ success: true, message: 'Ticket deleted successfully' });
  } catch (err) {
    console.error('Error deleting ticket:', err);
    res.status(500).json({ error: 'Failed to delete ticket', details: err.message });
  }
});

/**
 * Purchase tickets for event
 * @route POST /api/events/:id/tickets/:ticketId/purchase
 * @access Public
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Event ID
 * @param {string} req.params.ticketId - Ticket ID
 * @param {Object} req.body - Purchase data (buyer_email, buyer_name, quantity)
 * @param {Object} res - Express response object
 * @returns {Object} Payment intent and ticket information
 * @description Processes ticket purchase with Stripe payment integration
 */
router.post('/:id/tickets/:ticketId/purchase', async (req, res) => {
  try {
    const { id: eventId, ticketId } = req.params;
    const { buyer_email, buyer_name, quantity = 1 } = req.body;

    if (!buyer_email || quantity < 1) {
      return res.status(400).json({ error: 'Valid buyer email and quantity required' });
    }

    // Get ticket and event info
    const [ticketInfo] = await db.execute(`
      SELECT 
        et.*, e.title as event_title, e.start_date, e.venue_name, e.venue_city, e.venue_state
      FROM event_tickets et
      JOIN events e ON et.event_id = e.id
      WHERE et.id = ? AND et.event_id = ? AND et.is_active = TRUE
    `, [ticketId, eventId]);

    if (ticketInfo.length === 0) {
      return res.status(404).json({ error: 'Ticket not found or not available' });
    }

    const ticket = ticketInfo[0];

    // Check availability
    if (ticket.quantity_available && (ticket.quantity_sold + quantity > ticket.quantity_available)) {
      return res.status(400).json({ error: 'Not enough tickets available' });
    }

    // Calculate pricing
    const unitPrice = parseFloat(ticket.price);
    const totalPrice = unitPrice * quantity;

    // Generate unique ticket codes
    const ticketCodes = [];
    for (let i = 0; i < quantity; i++) {
      const uniqueCode = generateUniqueTicketCode();
      ticketCodes.push(uniqueCode);
    }

    // Create Stripe payment intent
    const stripeService = require('../services/stripeService');
    const paymentIntent = await stripeService.createPaymentIntent({
      total_amount: totalPrice,
      currency: 'usd',
      metadata: {
        event_id: eventId.toString(),
        ticket_id: ticketId.toString(),
        event_title: ticket.event_title,
        buyer_email: buyer_email,
        buyer_name: buyer_name || '',
        quantity: quantity.toString(),
        ticket_codes: ticketCodes.join(',')
      }
    });

    // Create pending purchase records
    for (let i = 0; i < quantity; i++) {
      await db.execute(`
        INSERT INTO ticket_purchases (
          event_id, ticket_id, buyer_email, buyer_name, quantity, unit_price, total_price,
          unique_code, stripe_payment_intent_id, status
        ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, 'pending')
      `, [
        eventId, ticketId, buyer_email, buyer_name || null, 
        unitPrice, unitPrice, ticketCodes[i], paymentIntent.id
      ]);
    }

    res.json({
      success: true,
      payment_intent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount
      },
      ticket_info: {
        event_title: ticket.event_title,
        ticket_type: ticket.ticket_type,
        quantity: quantity,
        unit_price: unitPrice,
        total_price: totalPrice
      }
    });
  } catch (err) {
    console.error('Error processing ticket purchase:', err);
    res.status(500).json({ error: 'Failed to process purchase', details: err.message });
  }
});

/**
 * Generate unique ticket code
 * @returns {string} Unique ticket code in format TKT-XXXXXXXX
 * @description Generates unique 8-character alphanumeric ticket code with TKT prefix
 */
function generateUniqueTicketCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return `TKT-${result}`;
}

module.exports = router; 