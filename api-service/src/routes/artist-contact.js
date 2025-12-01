/**
 * Artist Contact Form Routes
 * Handles contact form submissions for artist profiles
 */

const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const EmailService = require('../services/emailService');

/**
 * Submit contact form to artist
 * @route POST /api/artist-contact
 * @access Public (no authentication required)
 * @param {Object} req.body
 * @param {number} req.body.artist_id - Artist user ID
 * @param {string} req.body.sender_name - Sender's name
 * @param {string} req.body.sender_email - Sender's email
 * @param {string} [req.body.sender_phone] - Sender's phone (optional)
 * @param {string} [req.body.subject] - Message subject (optional)
 * @param {string} req.body.message - Message content
 * @returns {Object} Success confirmation
 */
router.post('/', async (req, res) => {
    try {
        const {
            artist_id,
            sender_name,
            sender_email,
            sender_phone,
            subject,
            message
        } = req.body;

        // Validation
        if (!artist_id || !sender_name || !sender_email || !message) {
            return res.status(400).json({ 
                error: 'Artist ID, sender name, email, and message are required' 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sender_email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        // Get artist information
        const [artists] = await db.execute(`
            SELECT 
                u.id,
                u.username as email,
                up.display_name,
                up.first_name,
                up.last_name,
                ap.business_name
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN artist_profiles ap ON u.id = ap.user_id
            WHERE u.id = ? AND u.user_type = 'artist' AND u.status = 'active'
        `, [artist_id]);

        if (artists.length === 0) {
            return res.status(404).json({ error: 'Artist not found' });
        }

        const artist = artists[0];
        const artistName = artist.business_name || artist.display_name || 
                          `${artist.first_name} ${artist.last_name}`.trim() || 'Artist';

        // Get IP address and user agent
        const ip_address = req.ip || req.connection.remoteAddress;
        const user_agent = req.headers['user-agent'];

        // Store in database
        const [result] = await db.execute(`
            INSERT INTO artist_contact_messages (
                artist_id,
                sender_name,
                sender_email,
                sender_phone,
                subject,
                message,
                ip_address,
                user_agent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            artist_id,
            sender_name,
            sender_email,
            sender_phone || null,
            subject || 'Contact Form Message',
            message,
            ip_address,
            user_agent
        ]);

        const messageId = result.insertId;

        // Send email to artist using sendExternalEmail
        try {
            await EmailService.sendExternalEmail({
                to: artist.email,
                subject: `New Contact Form Message${subject ? `: ${subject}` : ''}`,
                template: 'artist-contact-notification',
                data: {
                    artistName: artistName,
                    senderName: sender_name,
                    senderEmail: sender_email,
                    senderPhone: sender_phone,
                    subject: subject || 'No subject',
                    message: message,
                    messageId: messageId,
                    profileUrl: `https://brakebee.com/profile/${artist_id}`
                }
            });
        } catch (emailError) {
            console.error('Error sending email to artist:', emailError);
            // Don't fail the request if email fails
        }

        // Send copy to admin
        try {
            await EmailService.sendExternalEmail({
                to: 'hello@onlineartfestival.com',
                subject: `Artist Contact Form: ${artistName} received a message`,
                template: 'artist-contact-admin-copy',
                data: {
                    artistName: artistName,
                    artistId: artist_id,
                    artistEmail: artist.email,
                    senderName: sender_name,
                    senderEmail: sender_email,
                    senderPhone: sender_phone,
                    subject: subject || 'No subject',
                    message: message,
                    messageId: messageId
                }
            });
        } catch (emailError) {
            console.error('Error sending email to admin:', emailError);
            // Don't fail the request if email fails
        }

        res.json({ 
            success: true, 
            message: 'Your message has been sent successfully!',
            messageId: messageId
        });

    } catch (error) {
        console.error('Error submitting contact form:', error);
        res.status(500).json({ error: 'Failed to send message. Please try again.' });
    }
});

/**
 * Get contact messages for an artist (admin/artist view)
 * @route GET /api/artist-contact/:artistId
 * @access Private (requires authentication)
 */
router.get('/:artistId', async (req, res) => {
    try {
        const { artistId } = req.params;
        
        const [messages] = await db.execute(`
            SELECT * FROM artist_contact_messages
            WHERE artist_id = ?
            ORDER BY created_at DESC
        `, [artistId]);

        res.json(messages);
    } catch (error) {
        console.error('Error fetching contact messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

module.exports = router;

