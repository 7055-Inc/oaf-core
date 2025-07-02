const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const authenticateToken = require('../middleware/jwt');

// Get artist's custom events
router.get('/my-events', authenticateToken, async (req, res) => {
    try {
        const artistId = req.user.id;
        const [events] = await db.execute(
            'SELECT * FROM artist_custom_events WHERE artist_id = ? ORDER BY event_date DESC',
            [artistId]
        );
        res.json(events);
    } catch (error) {
        console.error('Error fetching custom events:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new custom event
router.post('/', authenticateToken, async (req, res) => {
    try {
        const artistId = req.user.id;
        const { title, description, event_date, location, event_type } = req.body;
        
        const [result] = await db.execute(`
            INSERT INTO artist_custom_events (artist_id, title, description, event_date, location, event_type, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [artistId, title, description, event_date, location || null, event_type || 'other']);
        
        const [event] = await db.execute(
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

// Update custom event
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const artistId = req.user.id;
        const { title, description, event_date, location, event_type } = req.body;
        
        // Verify ownership
        const [existingEvent] = await db.execute(
            'SELECT * FROM artist_custom_events WHERE id = ? AND artist_id = ?',
            [id, artistId]
        );
        
        if (existingEvent.length === 0) {
            return res.status(404).json({ error: 'Custom event not found or access denied' });
        }
        
        await db.execute(`
            UPDATE artist_custom_events 
            SET title = ?, description = ?, event_date = ?, location = ?, event_type = ?, updated_at = NOW()
            WHERE id = ? AND artist_id = ?
        `, [title, description, event_date, location, event_type, id, artistId]);
        
        const [updatedEvent] = await db.execute(
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

// Delete custom event
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const artistId = req.user.id;
        
        // Verify ownership
        const [existingEvent] = await db.execute(
            'SELECT * FROM artist_custom_events WHERE id = ? AND artist_id = ?',
            [id, artistId]
        );
        
        if (existingEvent.length === 0) {
            return res.status(404).json({ error: 'Custom event not found or access denied' });
        }
        
        await db.execute('DELETE FROM artist_custom_events WHERE id = ? AND artist_id = ?', [id, artistId]);
        
        res.json({ message: 'Custom event deleted successfully' });
    } catch (error) {
        console.error('Error deleting custom event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 