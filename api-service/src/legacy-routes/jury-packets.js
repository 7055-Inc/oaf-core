const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const upload = require('../config/multer');

/**
 * @fileoverview Jury packet management routes
 * 
 * Handles comprehensive jury packet functionality including:
 * - Jury packet CRUD operations with ownership validation
 * - Artist persona integration and validation
 * - Packet data and photo management with JSON storage
 * - Secure packet access with artist authentication
 * - Packet organization and listing with persona information
 * 
 * Jury packets are used by artists to organize and submit their work
 * for jury review processes in events and applications. Each packet
 * can be associated with an artist persona and contains structured
 * data about the artist's work, photos, and submission materials.
 * 
 * @author Beemeeart Development Team
 * @version 1.0.0
 */

// --- Jury Packets Management Endpoints ---

/**
 * Get artist's jury packets
 * @route GET /api/jury-packets
 * @access Private (requires authentication)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Array} List of artist's jury packets with persona information
 * @description Retrieves all jury packets for authenticated artist with associated persona details
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const artistId = req.userId;
    
    const [packets] = await db.execute(`
      SELECT jp.id, jp.packet_name, jp.packet_data, jp.persona_id, jp.created_at, jp.updated_at,
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

/**
 * Upload image for jury packet
 * @route POST /api/jury-packets/upload
 * @access Private (requires authentication)
 */
router.post('/upload', verifyToken, upload.array('images'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const urls = req.files.map(file => `/temp_images/jury/${file.filename}`);
    res.json({ urls });
  } catch (error) {
    console.error('Error uploading jury packet images:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

/**
 * Get single jury packet details
 * @route GET /api/jury-packets/:id
 * @access Private (requires authentication and ownership)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Jury packet ID
 * @param {Object} res - Express response object
 * @returns {Object} Complete jury packet details
 * @description Retrieves detailed information for specific jury packet with ownership validation
 */
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

/**
 * Create new jury packet
 * @route POST /api/jury-packets
 * @access Private (requires authentication)
 * @param {Object} req - Express request object
 * @param {string} req.body.packet_name - Packet name (required)
 * @param {Object} req.body.packet_data - Packet data object (optional)
 * @param {Array} req.body.photos_data - Photos data array (optional)
 * @param {number} req.body.persona_id - Artist persona ID (optional)
 * @param {Object} res - Express response object
 * @returns {Object} Created jury packet details
 * @description Creates new jury packet with persona validation and JSON data storage
 */
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

/**
 * Update jury packet
 * @route PUT /api/jury-packets/:id
 * @access Private (requires authentication and ownership)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Jury packet ID
 * @param {string} req.body.packet_name - Packet name (required)
 * @param {Object} req.body.packet_data - Packet data object (optional)
 * @param {Array} req.body.photos_data - Photos data array (optional)
 * @param {number} req.body.persona_id - Artist persona ID (optional)
 * @param {Object} res - Express response object
 * @returns {Object} Update success message
 * @description Updates jury packet with ownership and persona validation
 */
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

/**
 * Delete jury packet
 * @route DELETE /api/jury-packets/:id
 * @access Private (requires authentication and ownership)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Jury packet ID
 * @param {Object} res - Express response object
 * @returns {Object} Deletion success message
 * @description Deletes jury packet with ownership validation (hard delete)
 */
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