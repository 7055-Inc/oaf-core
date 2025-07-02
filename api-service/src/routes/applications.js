const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');

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

// Artist submits application to an event
router.post('/events/:eventId/apply', verifyToken, async (req, res) => {
    try {
        const { eventId } = req.params;
        const artistId = req.userId;
        const { artist_statement, portfolio_url, booth_preferences, additional_info } = req.body;

        // Check if artist already applied to this event
        const [existingApp] = await db.execute(
            'SELECT id, status FROM event_applications WHERE event_id = ? AND artist_id = ?',
            [eventId, artistId]
        );
        if (existingApp.length > 0) {
            return res.status(400).json({ 
                error: 'You have already applied to this event' 
            });
        }

        // Verify event exists and is accepting applications
        const [event] = await db.execute(
            'SELECT id, title, promoter_id, allow_applications, application_status, application_deadline FROM events WHERE id = ?',
            [eventId]
        );
        if (event.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        if (!event[0].allow_applications || event[0].application_status !== 'accepting') {
            return res.status(400).json({ 
                error: 'This event is not currently accepting applications' 
            });
        }

        // Create application
        const [result] = await db.execute(`
            INSERT INTO event_applications 
            (event_id, artist_id, artist_statement, portfolio_url, booth_preferences, additional_info, status, submitted_at)
            VALUES (?, ?, ?, ?, ?, ?, 'submitted', NOW())
        `, [
            eventId,
            artistId,
            artist_statement || null,
            portfolio_url || null,
            booth_preferences ? JSON.stringify(booth_preferences) : null,
            additional_info || null
        ]);

        // Get the created application
        const [application] = await db.execute(`
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
            WHERE ea.id = ?
        `, [result.insertId]);

        res.status(201).json({
            message: 'Application submitted successfully',
            application: application[0]
        });
    } catch (error) {
        console.error('Error submitting application:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get artist's own applications
router.get('/my-applications', verifyToken, async (req, res) => {
    try {
        const artistId = req.userId;
        const { status, limit, offset } = req.query;

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

        if (status) {
            query += ` AND ea.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY ea.submitted_at DESC`;

        const [applications] = await db.execute(query, params);

        res.json({
            applications,
            total: applications.length
        });
    } catch (error) {
        console.error('Error fetching artist applications:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single application details
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const [application] = await db.execute(`
            SELECT 
                ea.*,
                e.title as event_title,
                e.start_date as event_start_date,
                e.end_date as event_end_date,
                e.venue_name as event_venue_name,
                e.venue_city as event_venue_city,
                e.venue_state as event_venue_state,
                e.promoter_id,
                u.first_name as artist_first_name,
                u.last_name as artist_last_name,
                u.email as artist_email,
                ap.business_name as artist_business_name
            FROM event_applications ea
            JOIN events e ON ea.event_id = e.id
            JOIN users u ON ea.artist_id = u.id
            LEFT JOIN artist_profiles ap ON u.id = ap.user_id
            WHERE ea.id = ?
        `, [id]);

        if (application.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        // Check permissions - artist can see own applications, promoters can see applications to their events
        const hasPermission = application[0].artist_id === userId || application[0].promoter_id === userId;

        if (!hasPermission) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({ application: application[0] });
    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Artist updates their own application (only if draft status)
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const artistId = req.userId;
        const { artist_statement, portfolio_url, booth_preferences, additional_info } = req.body;

        const [application] = await db.execute('SELECT * FROM event_applications WHERE id = ?', [id]);
        if (application.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        // Only artist can update their own application
        if (application[0].artist_id !== artistId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Only allow updates if application is in draft status
        if (application[0].status !== 'draft') {
            return res.status(400).json({ 
                error: 'Cannot update application after submission' 
            });
        }

        await db.execute(`
            UPDATE event_applications 
            SET 
                artist_statement = ?,
                portfolio_url = ?,
                booth_preferences = ?,
                additional_info = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [
            artist_statement || null,
            portfolio_url || null,
            booth_preferences ? JSON.stringify(booth_preferences) : null,
            additional_info || null,
            id
        ]);

        // Get updated application
        const [updatedApp] = await db.execute(`
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
            WHERE ea.id = ?
        `, [id]);

        res.json({
            message: 'Application updated successfully',
            application: updatedApp[0]
        });
    } catch (error) {
        console.error('Error updating application:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Artist deletes their own application (only if draft status)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const artistId = req.userId;

        const [application] = await db.execute('SELECT * FROM event_applications WHERE id = ?', [id]);
        if (application.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        // Only artist can delete their own application
        if (application[0].artist_id !== artistId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Only allow deletion if application is in draft status
        if (application[0].status !== 'draft') {
            return res.status(400).json({ 
                error: 'Cannot delete application after submission' 
            });
        }

        await db.execute('DELETE FROM event_applications WHERE id = ?', [id]);

        res.json({ message: 'Application deleted successfully' });
    } catch (error) {
        console.error('Error deleting application:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all applications for a specific event (promoter only)
router.get('/events/:eventId/applications', verifyToken, async (req, res) => {
    try {
        const { eventId } = req.params;
        const promoterId = req.userId;
        const { status, limit, offset } = req.query;

        // Verify promoter owns this event
        const [event] = await db.execute('SELECT promoter_id FROM events WHERE id = ?', [eventId]);
        if (event.length === 0 || event[0].promoter_id !== promoterId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        let query = `
            SELECT 
                ea.*,
                u.first_name as artist_first_name,
                u.last_name as artist_last_name,
                u.email as artist_email,
                ap.business_name as artist_business_name,
                ap.art_categories,
                ap.art_mediums
            FROM event_applications ea
            JOIN users u ON ea.artist_id = u.id
            LEFT JOIN artist_profiles ap ON u.id = ap.user_id
            WHERE ea.event_id = ?
        `;

        const params = [eventId];

        if (status) {
            query += ` AND ea.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY ea.submitted_at ASC`;

        const [applications] = await db.execute(query, params);

        res.json({
            applications,
            total: applications.length
        });
    } catch (error) {
        console.error('Error fetching event applications:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Promoter updates application status (accept/decline/waitlist)
router.put('/:id/status', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const promoterId = req.userId;
        const { status, jury_comments } = req.body;

        const [application] = await db.execute(`
            SELECT ea.*, e.promoter_id 
            FROM event_applications ea
            JOIN events e ON ea.event_id = e.id
            WHERE ea.id = ?
        `, [id]);

        if (application.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        // Verify promoter owns this event
        if (application[0].promoter_id !== promoterId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Validate status transition
        const validStatuses = ['under_review', 'accepted', 'rejected', 'waitlisted'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        await db.execute(`
            UPDATE event_applications 
            SET 
                status = ?,
                jury_comments = ?,
                jury_reviewed_by = ?,
                jury_reviewed_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        `, [status, jury_comments || null, promoterId, id]);

        // Get updated application
        const [updatedApp] = await db.execute(`
            SELECT 
                ea.*,
                e.title as event_title,
                u.first_name as artist_first_name,
                u.last_name as artist_last_name,
                u.email as artist_email
            FROM event_applications ea
            JOIN events e ON ea.event_id = e.id
            JOIN users u ON ea.artist_id = u.id
            WHERE ea.id = ?
        `, [id]);

        res.json({
            message: 'Application status updated successfully',
            application: updatedApp[0]
        });
    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get public application stats for an event (for event pages)
router.get('/events/:eventId/stats', async (req, res) => {
    try {
        const { eventId } = req.params;

        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) as total_applications,
                SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
                SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review,
                SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN status = 'waitlisted' THEN 1 ELSE 0 END) as waitlisted,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed
            FROM event_applications 
            WHERE event_id = ?
        `, [eventId]);

        res.json({ stats: stats[0] || {
            total_applications: 0,
            submitted: 0,
            under_review: 0,
            accepted: 0,
            rejected: 0,
            waitlisted: 0,
            confirmed: 0
        }});
    } catch (error) {
        console.error('Error fetching application stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 