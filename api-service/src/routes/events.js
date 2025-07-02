const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');
const upload = require('../config/multer');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.roles = decoded.roles;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
// TODO: Import authentication and role middleware
// const { requireAdminOrPromoter } = require('../middleware/auth');

// --- Event CRUD Endpoints ---

// List/search events (with filters)
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

// Get single event details
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

// Create new event (admin/promoter only)
router.post('/', /* requireAdminOrPromoter, */ async (req, res) => {
  try {
    const {
      promoter_id, event_type_id, title, description, short_description, start_date, end_date,
      venue_name, venue_address, venue_city, venue_state, venue_zip, venue_country,
      event_status, allow_applications, application_status, application_deadline,
      jury_date, notification_date, admission_fee, parking_fee, parking_info, parking_details,
      accessibility_info, application_fee, booth_fee, jury_fee, max_applications, max_artists,
      seo_title, meta_description, created_by, updated_by
    } = req.body;

    const [result] = await db.execute(`
      INSERT INTO events (
        promoter_id, event_type_id, title, description, short_description, start_date, end_date,
        venue_name, venue_address, venue_city, venue_state, venue_zip, venue_country,
        event_status, allow_applications, application_status, application_deadline,
        jury_date, notification_date, admission_fee, parking_fee, parking_info, parking_details,
        accessibility_info, application_fee, booth_fee, jury_fee, max_applications, max_artists,
        seo_title, meta_description, created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      promoter_id, event_type_id, title, description, short_description || null, start_date, end_date,
      venue_name, venue_address || null, venue_city, venue_state, venue_zip || null, venue_country || 'USA',
      event_status || 'draft', allow_applications || 0, application_status || 'not_accepting', application_deadline || null,
      jury_date || null, notification_date || null, admission_fee || null, parking_fee || null, parking_info || null, parking_details || null,
      accessibility_info || null, application_fee || null, booth_fee || null, jury_fee || null, max_applications || null, max_artists || null,
      seo_title || null, meta_description || null, created_by, updated_by || created_by
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
    res.status(500).json({ error: 'Failed to create event', details: err.message });
  }
});

// Update event (admin/promoter only)
router.put('/:id', /* requireAdminOrPromoter, */ async (req, res) => {
  try {
    const {
      title, description, start_date, end_date, venue_name, venue_address,
      venue_city, venue_state, venue_zip, event_status, allow_applications,
      application_status, application_deadline, application_fee, booth_fee,
      jury_fee, max_applications
    } = req.body;

    await db.execute(`
      UPDATE events SET 
        title = ?, description = ?, start_date = ?, end_date = ?,
        venue_name = ?, venue_address = ?, venue_city = ?, venue_state = ?, venue_zip = ?,
        event_status = ?, allow_applications = ?, application_status = ?, application_deadline = ?,
        application_fee = ?, booth_fee = ?, jury_fee = ?, max_applications = ?, updated_at = NOW()
      WHERE id = ?
    `, [
      title, description, start_date, end_date, venue_name, venue_address,
      venue_city, venue_state, venue_zip, event_status, allow_applications,
      application_status, application_deadline, application_fee, booth_fee,
      jury_fee, max_applications, req.params.id
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

// Archive event (soft delete)
router.delete('/:id', /* requireAdminOrPromoter, */ async (req, res) => {
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

// Renew event for next year
router.post('/:id/renew', /* requireAdminOrPromoter, */ async (req, res) => {
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

// List artists for event
router.get('/:id/artists', (req, res) => {
  // TODO: Implement list artists for event
  res.send('List artists for event');
});

// Add artist manually
router.post('/:id/artists', /* requireAdminOrPromoter, */ (req, res) => {
  // TODO: Implement manual artist addition
  res.send('Add artist manually');
});

// Update artist status
router.put('/:id/artists/:artistId', /* requireAdminOrPromoter, */ (req, res) => {
  // TODO: Implement update artist status
  res.send('Update artist status');
});

// Remove artist
router.delete('/:id/artists/:artistId', /* requireAdminOrPromoter, */ (req, res) => {
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
        
        // Insert into pending_images
        await db.execute(
          'INSERT INTO pending_images (user_id, image_path, status) VALUES (?, ?, ?)',
          [req.userId, imagePath, 'pending']
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

module.exports = router; 