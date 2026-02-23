const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');

// --- Artist Personas Management Endpoints ---

// Get artist's personas
router.get('/', verifyToken, async (req, res) => {
  try {
    const artistId = req.userId;
    
    const [personas] = await db.execute(`
      SELECT id, persona_name, display_name, bio, specialty, 
             portfolio_url, website_url, instagram_handle, facebook_url, 
             profile_image_url, is_default, is_active, created_at, updated_at
      FROM artist_personas 
      WHERE artist_id = ? AND is_active = 1
      ORDER BY is_default DESC, persona_name ASC
    `, [artistId]);
    
    res.json(personas);
  } catch (error) {
    console.error('Error fetching artist personas:', error);
    res.status(500).json({ error: 'Failed to fetch artist personas' });
  }
});

// Get single persona details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const artistId = req.userId;
    const personaId = req.params.id;
    
    const [persona] = await db.execute(`
      SELECT * FROM artist_personas 
      WHERE id = ? AND artist_id = ? AND is_active = 1
    `, [personaId, artistId]);
    
    if (persona.length === 0) {
      return res.status(404).json({ error: 'Persona not found' });
    }
    
    res.json(persona[0]);
  } catch (error) {
    console.error('Error fetching persona:', error);
    res.status(500).json({ error: 'Failed to fetch persona' });
  }
});

// Create new persona
router.post('/', verifyToken, async (req, res) => {
  try {
    const artistId = req.userId;
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
    } = req.body;
    
    if (!persona_name || !persona_name.trim()) {
      return res.status(400).json({ error: 'Persona name is required' });
    }
    
    if (!display_name || !display_name.trim()) {
      return res.status(400).json({ error: 'Display name is required' });
    }
    
    // Check if artist already has a persona with this name
    const [existingPersona] = await db.execute(`
      SELECT id FROM artist_personas 
      WHERE artist_id = ? AND persona_name = ? AND is_active = 1
    `, [artistId, persona_name.trim()]);
    
    if (existingPersona.length > 0) {
      return res.status(400).json({ error: 'You already have a persona with this name' });
    }
    
    // If this is set as default, unset any existing defaults
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
    
    res.json({ 
      id: result.insertId,
      persona_name: persona_name.trim(),
      display_name: display_name.trim(),
      is_default: is_default || false,
      message: 'Persona created successfully'
    });
  } catch (error) {
    console.error('Error creating persona:', error);
    res.status(500).json({ error: 'Failed to create persona' });
  }
});

// Update persona
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const artistId = req.userId;
    const personaId = req.params.id;
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
    } = req.body;
    
    // Verify persona belongs to artist
    const [existingPersona] = await db.execute(`
      SELECT id, persona_name FROM artist_personas 
      WHERE id = ? AND artist_id = ? AND is_active = 1
    `, [personaId, artistId]);
    
    if (existingPersona.length === 0) {
      return res.status(404).json({ error: 'Persona not found' });
    }
    
    if (!persona_name || !persona_name.trim()) {
      return res.status(400).json({ error: 'Persona name is required' });
    }
    
    if (!display_name || !display_name.trim()) {
      return res.status(400).json({ error: 'Display name is required' });
    }
    
    // Check for name conflicts (exclude current persona)
    const [nameConflict] = await db.execute(`
      SELECT id FROM artist_personas 
      WHERE artist_id = ? AND persona_name = ? AND id != ? AND is_active = 1
    `, [artistId, persona_name.trim(), personaId]);
    
    if (nameConflict.length > 0) {
      return res.status(400).json({ error: 'You already have another persona with this name' });
    }
    
    // If this is set as default, unset any existing defaults
    if (is_default) {
      await db.execute(`
        UPDATE artist_personas 
        SET is_default = 0 
        WHERE artist_id = ? AND id != ? AND is_active = 1
      `, [artistId, personaId]);
    }
    
    await db.execute(`
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
    
    res.json({ message: 'Persona updated successfully' });
  } catch (error) {
    console.error('Error updating persona:', error);
    res.status(500).json({ error: 'Failed to update persona' });
  }
});

// Set persona as default
router.patch('/:id/set-default', verifyToken, async (req, res) => {
  try {
    const artistId = req.userId;
    const personaId = req.params.id;
    
    // Verify persona belongs to artist
    const [existingPersona] = await db.execute(`
      SELECT id FROM artist_personas 
      WHERE id = ? AND artist_id = ? AND is_active = 1
    `, [personaId, artistId]);
    
    if (existingPersona.length === 0) {
      return res.status(404).json({ error: 'Persona not found' });
    }
    
    // Unset all defaults for this artist
    await db.execute(`
      UPDATE artist_personas 
      SET is_default = 0 
      WHERE artist_id = ? AND is_active = 1
    `, [artistId]);
    
    // Set this persona as default
    await db.execute(`
      UPDATE artist_personas 
      SET is_default = 1 
      WHERE id = ? AND artist_id = ?
    `, [personaId, artistId]);
    
    res.json({ message: 'Default persona updated successfully' });
  } catch (error) {
    console.error('Error setting default persona:', error);
    res.status(500).json({ error: 'Failed to set default persona' });
  }
});

// Delete persona (soft delete)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const artistId = req.userId;
    const personaId = req.params.id;
    
    // Verify persona belongs to artist
    const [existingPersona] = await db.execute(`
      SELECT id, is_default FROM artist_personas 
      WHERE id = ? AND artist_id = ? AND is_active = 1
    `, [personaId, artistId]);
    
    if (existingPersona.length === 0) {
      return res.status(404).json({ error: 'Persona not found' });
    }
    
    // Check if there are any applications using this persona
    const [applicationsUsingPersona] = await db.execute(`
      SELECT COUNT(*) as count FROM event_applications 
      WHERE persona_id = ?
    `, [personaId]);
    
    if (applicationsUsingPersona[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete persona that has been used in applications. You can deactivate it instead.' 
      });
    }
    
    // Soft delete persona
    await db.execute(`
      UPDATE artist_personas 
      SET is_active = 0, is_default = 0 
      WHERE id = ? AND artist_id = ?
    `, [personaId, artistId]);
    
    // If this was the default persona, make the first active one default
    if (existingPersona[0].is_default) {
      await db.execute(`
        UPDATE artist_personas 
        SET is_default = 1 
        WHERE artist_id = ? AND is_active = 1 
        ORDER BY created_at ASC 
        LIMIT 1
      `, [artistId]);
    }
    
    res.json({ message: 'Persona deleted successfully' });
  } catch (error) {
    console.error('Error deleting persona:', error);
    res.status(500).json({ error: 'Failed to delete persona' });
  }
});

module.exports = router; 