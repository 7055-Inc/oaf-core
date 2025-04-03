const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');

let db;

// Initialize function that sets up the database connection
const initialize = (database) => {
  db = database;
  return router;
};

// Configure nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Send verification email
 * POST /api/send-verification
 */
router.post('/send-verification', async (req, res) => {
  const { email, userId } = req.body;
  
  try {
    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration time - 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Save verification token to database
    await db.query(
      'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expiresAt]
    );
    
    // Create verification URL
    const verificationUrl = `${process.env.APP_URL}/verify/${token}`;
    
    // Send verification email
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Verify your email address',
      html: `
        <h1>Welcome to Online Art Festival!</h1>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't request this verification, you can safely ignore this email.</p>
      `
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending verification email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send verification email',
      details: error.message 
    });
  }
});

/**
 * Check email verification status
 * GET /api/check-verification/:userId
 */
router.get('/check-verification/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Check if user has verified their email
    const [result] = await db.query(
      'SELECT email_verified FROM users WHERE id = ?',
      [userId]
    );
    
    if (result.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    res.json({ 
      success: true, 
      verified: result[0].email_verified === 1 
    });
  } catch (error) {
    console.error('Error checking verification status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check verification status',
      details: error.message 
    });
  }
});

module.exports = { initialize }; 