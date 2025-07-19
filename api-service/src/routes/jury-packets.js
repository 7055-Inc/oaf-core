const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');

// --- Jury Packets Management Endpoints ---

// Get artist's jury packets
router.get('/', verifyToken, async (req, res) => {
  try {
    const artistId = req.userId;
    
    const [packets] = await db.execute(`
      SELECT jp.id, jp.packet_name, jp.persona_id, jp.created_at, jp.updated_at,
             p.persona_name, p.display_name as persona_display_name
      FROM artist_jury_packets jp
      LEFT JOIN artist_personas p ON jp.persona_id = p.id AND p.is_active = 1
      WHERE jp.artist_id = ? 
      ORDER BY jp.updated_at DESC
    `, [artistId]);
    
    res.json(packets);
  } catch (error) {
    console.error('Error fetching jury packets:', error);
    res.status(500).json({ error: 'Failed to fetch jury packets' });
  }
});

// Get single jury packet details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const artistId = req.userId;
    const packetId = req.params.id;
    
    const [packet] = await db.execute(`
      SELECT * FROM artist_jury_packets 
      WHERE id = ? AND artist_id = ?
    `, [packetId, artistId]);
    
    if (packet.length === 0) {
      return res.status(404).json({ error: 'Jury packet not found' });
    }
    
    res.json(packet[0]);
  } catch (error) {
    console.error('Error fetching jury packet:', error);
    res.status(500).json({ error: 'Failed to fetch jury packet' });
  }
});

// Create new jury packet
router.post('/', verifyToken, async (req, res) => {
  try {
    const artistId = req.userId;
    const { packet_name, packet_data, photos_data, persona_id } = req.body;
    
    if (!packet_name || !packet_name.trim()) {
      return res.status(400).json({ error: 'Packet name is required' });
    }
    
    // Verify persona belongs to artist if provided
    if (persona_id) {
      const [personaCheck] = await db.execute(`
        SELECT id FROM artist_personas 
        WHERE id = ? AND artist_id = ? AND is_active = 1
      `, [persona_id, artistId]);
      
      if (personaCheck.length === 0) {
        return res.status(400).json({ error: 'Invalid persona selected' });
      }
    }
    
    const [result] = await db.execute(`
      INSERT INTO artist_jury_packets (artist_id, packet_name, packet_data, photos_data, persona_id)
      VALUES (?, ?, ?, ?, ?)
    `, [artistId, packet_name.trim(), JSON.stringify(packet_data || {}), JSON.stringify(photos_data || []), persona_id || null]);
    
    res.json({ 
      id: result.insertId,
      packet_name: packet_name.trim(),
      persona_id: persona_id || null,
      packet_data: packet_data || {},
      photos_data: photos_data || [],
      message: 'Jury packet created successfully'
    });
  } catch (error) {
    console.error('Error creating jury packet:', error);
    res.status(500).json({ error: 'Failed to create jury packet' });
  }
});

// Update jury packet
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const artistId = req.userId;
    const packetId = req.params.id;
    const { packet_name, packet_data, photos_data, persona_id } = req.body;
    
    // Verify packet belongs to artist
    const [existingPacket] = await db.execute(`
      SELECT id FROM artist_jury_packets 
      WHERE id = ? AND artist_id = ?
    `, [packetId, artistId]);
    
    if (existingPacket.length === 0) {
      return res.status(404).json({ error: 'Jury packet not found' });
    }
    
    if (!packet_name || !packet_name.trim()) {
      return res.status(400).json({ error: 'Packet name is required' });
    }
    
    // Verify persona belongs to artist if provided
    if (persona_id) {
      const [personaCheck] = await db.execute(`
        SELECT id FROM artist_personas 
        WHERE id = ? AND artist_id = ? AND is_active = 1
      `, [persona_id, artistId]);
      
      if (personaCheck.length === 0) {
        return res.status(400).json({ error: 'Invalid persona selected' });
      }
    }
    
    await db.execute(`
      UPDATE artist_jury_packets 
      SET packet_name = ?, packet_data = ?, photos_data = ?, persona_id = ?
      WHERE id = ? AND artist_id = ?
    `, [packet_name.trim(), JSON.stringify(packet_data || {}), JSON.stringify(photos_data || []), persona_id || null, packetId, artistId]);
    
    res.json({ message: 'Jury packet updated successfully' });
  } catch (error) {
    console.error('Error updating jury packet:', error);
    res.status(500).json({ error: 'Failed to update jury packet' });
  }
});

// Delete jury packet
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const artistId = req.userId;
    const packetId = req.params.id;
    
    // Verify packet belongs to artist
    const [existingPacket] = await db.execute(`
      SELECT id FROM artist_jury_packets 
      WHERE id = ? AND artist_id = ?
    `, [packetId, artistId]);
    
    if (existingPacket.length === 0) {
      return res.status(404).json({ error: 'Jury packet not found' });
    }
    
    await db.execute('DELETE FROM artist_jury_packets WHERE id = ? AND artist_id = ?', [packetId, artistId]);
    
    res.json({ message: 'Jury packet deleted successfully' });
  } catch (error) {
    console.error('Error deleting jury packet:', error);
    res.status(500).json({ error: 'Failed to delete jury packet' });
  }
});

module.exports = router; 