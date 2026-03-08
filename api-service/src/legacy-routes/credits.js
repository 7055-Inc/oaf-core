const express = require('express');
const crypto = require('crypto');
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requireAllAccess } = require('../middleware/permissions');
const EmailService = require('../services/emailService');
const router = express.Router();

// Initialize email service
let emailService;
try {
  emailService = new EmailService();
} catch (err) {
  console.warn('EmailService not initialized:', err.message);
}

/**
 * @fileoverview Site Credits & Gift Card API Routes
 * 
 * Handles:
 * - User credit balance and transaction history
 * - Gift card redemption
 * - Admin gift card/credit issuance
 * - Gift card management
 * 
 * @author Brakebee Development Team
 * @version 1.0.0
 */

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Generate a unique gift card code
 * Format: GIFT-XXXX-XXXX (16 chars with dashes)
 * @returns {string} Gift card code
 */
function generateGiftCardCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars (0/O, 1/I/L)
  let code = 'GIFT-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate unique code with collision check
 */
async function generateUniqueGiftCardCode() {
  let attempts = 0;
  while (attempts < 10) {
    const code = generateGiftCardCode();
    const [existing] = await db.execute(
      'SELECT id FROM gift_cards WHERE code = ?',
      [code]
    );
    if (existing.length === 0) {
      return code;
    }
    attempts++;
  }
  throw new Error('Failed to generate unique gift card code');
}

/**
 * Ensure user_credits record exists for a user
 */
async function ensureUserCreditsRecord(connection, userId) {
  await connection.execute(`
    INSERT INTO user_credits (user_id, balance, lifetime_earned, lifetime_spent)
    VALUES (?, 0, 0, 0)
    ON DUPLICATE KEY UPDATE user_id = user_id
  `, [userId]);
}

/**
 * Add credit to user balance and record transaction
 */
async function addCreditToUser(connection, userId, amount, transactionType, referenceType, referenceId, description, createdBy = null) {
  // Ensure user_credits record exists
  await ensureUserCreditsRecord(connection, userId);
  
  // Update balance
  await connection.execute(`
    UPDATE user_credits 
    SET balance = balance + ?,
        lifetime_earned = lifetime_earned + ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `, [amount, amount, userId]);
  
  // Get new balance
  const [balanceRow] = await connection.execute(
    'SELECT balance FROM user_credits WHERE user_id = ?',
    [userId]
  );
  const newBalance = balanceRow[0]?.balance || amount;
  
  // Record transaction
  await connection.execute(`
    INSERT INTO user_credit_transactions 
    (user_id, amount, balance_after, transaction_type, reference_type, reference_id, description, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [userId, amount, newBalance, transactionType, referenceType, referenceId, description, createdBy]);
  
  return newBalance;
}

// =====================================================
// PUBLIC ENDPOINTS
// =====================================================

/**
 * Get gift card details by code (for printable page)
 * Only returns non-sensitive info (amount, names, message)
 * @route GET /api/credits/gift-card/:code
 * @access Public
 */
router.get('/gift-card/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code) {
      return res.status(400).json({ error: 'Gift card code is required' });
    }
    
    const [giftCards] = await db.execute(`
      SELECT 
        code, original_amount, current_balance, status,
        recipient_name, sender_name, personal_message,
        expires_at, created_at
      FROM gift_cards
      WHERE code = ?
    `, [code.toUpperCase()]);
    
    if (giftCards.length === 0) {
      return res.status(404).json({ error: 'Gift card not found' });
    }
    
    const gc = giftCards[0];
    
    // Return safe info for display
    res.json({
      code: gc.code,
      original_amount: parseFloat(gc.original_amount),
      current_balance: parseFloat(gc.current_balance),
      status: gc.status,
      recipient_name: gc.recipient_name,
      sender_name: gc.sender_name,
      personal_message: gc.personal_message,
      expires_at: gc.expires_at,
      created_at: gc.created_at
    });
    
  } catch (error) {
    console.error('Error fetching gift card:', error);
    res.status(500).json({ error: 'Failed to fetch gift card' });
  }
});

// =====================================================
// USER ENDPOINTS
// =====================================================

/**
 * Get user's credit balance and recent transactions
 * @route GET /api/credits
 * @access Private
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get or create user credits record
    const [credits] = await db.execute(`
      SELECT balance, lifetime_earned, lifetime_spent, created_at, updated_at
      FROM user_credits
      WHERE user_id = ?
    `, [userId]);
    
    let creditData = credits[0];
    
    // If no record exists, return zeros
    if (!creditData) {
      creditData = {
        balance: 0,
        lifetime_earned: 0,
        lifetime_spent: 0,
        created_at: null,
        updated_at: null
      };
    }
    
    // Get recent transactions (last 10)
    const [recentTransactions] = await db.execute(`
      SELECT id, amount, balance_after, transaction_type, description, created_at
      FROM user_credit_transactions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);
    
    res.json({
      balance: parseFloat(creditData.balance) || 0,
      lifetime_earned: parseFloat(creditData.lifetime_earned) || 0,
      lifetime_spent: parseFloat(creditData.lifetime_spent) || 0,
      recent_transactions: recentTransactions
    });
    
  } catch (error) {
    console.error('Error getting user credits:', error);
    res.status(500).json({ error: 'Failed to get credit balance' });
  }
});

/**
 * Get user's credit transaction history with pagination
 * @route GET /api/credits/transactions
 * @access Private
 */
router.get('/transactions', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20, type } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    let whereClause = 'WHERE user_id = ?';
    const params = [userId];
    
    if (type) {
      whereClause += ' AND transaction_type = ?';
      params.push(type);
    }
    
    // Get total count
    const [countResult] = await db.execute(`
      SELECT COUNT(*) as total
      FROM user_credit_transactions
      ${whereClause}
    `, params);
    
    // Get transactions
    const [transactions] = await db.execute(`
      SELECT id, amount, balance_after, transaction_type, reference_type, reference_id, description, created_at
      FROM user_credit_transactions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `, params);
    
    res.json({
      transactions,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error getting credit transactions:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

/**
 * Redeem a gift card code
 * @route POST /api/credits/redeem
 * @access Private
 * @body {string} code - Gift card code to redeem
 */
router.post('/redeem', verifyToken, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const userId = req.userId;
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Gift card code is required' });
    }
    
    // Normalize code (uppercase, trim)
    const normalizedCode = code.toUpperCase().trim();
    
    await connection.beginTransaction();
    
    // Find the gift card
    const [giftCards] = await connection.execute(`
      SELECT * FROM gift_cards WHERE code = ? FOR UPDATE
    `, [normalizedCode]);
    
    if (giftCards.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Invalid gift card code' });
    }
    
    const giftCard = giftCards[0];
    
    // Check status
    if (giftCard.status !== 'active') {
      await connection.rollback();
      const statusMessages = {
        'redeemed': 'This gift card has already been redeemed',
        'expired': 'This gift card has expired',
        'cancelled': 'This gift card has been cancelled'
      };
      return res.status(400).json({ 
        error: statusMessages[giftCard.status] || 'Gift card is not valid' 
      });
    }
    
    // Check expiration
    if (giftCard.expires_at && new Date(giftCard.expires_at) < new Date()) {
      await connection.execute(
        'UPDATE gift_cards SET status = "expired" WHERE id = ?',
        [giftCard.id]
      );
      await connection.commit();
      return res.status(400).json({ error: 'This gift card has expired' });
    }
    
    // Add credit to user
    const amount = parseFloat(giftCard.current_balance);
    const newBalance = await addCreditToUser(
      connection,
      userId,
      amount,
      'gift_card_load',
      'gift_cards',
      giftCard.id,
      `Gift card redeemed: ${normalizedCode}`
    );
    
    // Mark gift card as redeemed
    await connection.execute(`
      UPDATE gift_cards 
      SET status = 'redeemed',
          current_balance = 0,
          redeemed_by = ?,
          redeemed_at = NOW()
      WHERE id = ?
    `, [userId, giftCard.id]);
    
    await connection.commit();
    
    // Send redemption confirmation email
    if (emailService) {
      try {
        await emailService.queueEmail(userId, 'gift_card_redeemed', {
          amount: amount.toFixed(2),
          gift_card_code: normalizedCode,
          new_balance: parseFloat(newBalance).toFixed(2)
        });
      } catch (emailError) {
        console.error('Failed to send redemption email:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    res.json({
      success: true,
      amount_added: amount,
      new_balance: parseFloat(newBalance),
      gift_card: {
        code: giftCard.code,
        original_amount: parseFloat(giftCard.original_amount),
        sender_name: giftCard.sender_name,
        personal_message: giftCard.personal_message
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error redeeming gift card:', error);
    res.status(500).json({ error: 'Failed to redeem gift card' });
  } finally {
    connection.release();
  }
});

/**
 * Redeem gift card via token (from email link)
 * @route POST /api/credits/redeem-token
 * @access Private
 * @body {string} token - Redemption token from email
 */
router.post('/redeem-token', verifyToken, async (req, res) => {
  // For now, redirect to standard redeem - token validation can be added later
  // The token would be a JWT containing the gift card code
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  
  // Decode token to get code (simplified - in production use JWT)
  try {
    // For MVP, token is just base64 encoded code
    const code = Buffer.from(token, 'base64').toString('utf8');
    req.body.code = code;
    
    // Call the regular redeem endpoint logic
    // (In production, you'd extract this to a shared function)
    return router.handle(req, res);
  } catch (error) {
    return res.status(400).json({ error: 'Invalid token' });
  }
});

// =====================================================
// ADMIN ENDPOINTS
// =====================================================

/**
 * Issue a gift card or site credit to a user
 * @route POST /api/credits/admin/issue
 * @access Admin only
 */
router.post('/admin/issue', verifyToken, requireAllAccess, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const adminUserId = req.userId;
    const {
      recipient_user_id,
      recipient_email,
      amount,
      reason,
      sender_name,
      recipient_name,
      personal_message,
      admin_notes,
      send_email = true,
      expires_in_days
    } = req.body;
    
    // Validation
    if (!recipient_user_id && !recipient_email) {
      return res.status(400).json({ error: 'recipient_user_id or recipient_email is required' });
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    const creditAmount = parseFloat(amount);
    
    await connection.beginTransaction();
    
    // Generate unique code
    const code = await generateUniqueGiftCardCode();
    
    // Calculate expiration if specified
    let expiresAt = null;
    if (expires_in_days) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expires_in_days));
    }
    
    // Look up recipient user if email provided
    let recipientUserId = recipient_user_id;
    if (!recipientUserId && recipient_email) {
      const [users] = await connection.execute(
        'SELECT id FROM users WHERE username = ?',
        [recipient_email]
      );
      if (users.length > 0) {
        recipientUserId = users[0].id;
      }
    }
    
    // Create gift card record
    const [result] = await connection.execute(`
      INSERT INTO gift_cards (
        code, original_amount, current_balance, status,
        issued_by, issued_to_user_id, issued_to_email,
        sender_name, recipient_name, personal_message,
        issue_reason, admin_notes, expires_at
      ) VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      code,
      creditAmount,
      creditAmount,
      adminUserId,
      recipientUserId || null,
      recipient_email || null,
      sender_name || 'Brakebee',
      recipient_name || null,
      personal_message || null,
      reason || 'admin_issued',
      admin_notes || null,
      expiresAt
    ]);
    
    const giftCardId = result.insertId;
    
    await connection.commit();
    
    // Send email notification
    if (send_email && emailService && (recipient_email || recipientUserId)) {
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'https://brakebee.com';
        const redeemUrl = `${frontendUrl}/redeem?code=${code}`;
        const printUrl = `${frontendUrl}/gift-card/${code}`;
        
        // Build personal message block for template
        const personalMessageBlock = personal_message 
          ? `<div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 24px 0; font-style: italic; border-left: 4px solid #667eea;">
              <p style="margin: 0; font-size: 16px; color: #333;">"${personal_message}"</p>
              <p style="margin: 16px 0 0 0; text-align: right; color: #667eea; font-weight: 500;">— ${sender_name || 'A Friend'}</p>
             </div>`
          : '';
        
        // Build expiration notice
        const expirationNotice = expiresAt 
          ? `<div style="font-size: 12px; opacity: 0.8; margin-top: 8px;">Expires: ${expiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>`
          : '';
        
        // Send to recipient if we have their user ID
        if (recipientUserId) {
          await emailService.queueEmail(recipientUserId, 'gift_card_received', {
            sender_name: sender_name || 'A Friend',
            amount: creditAmount.toFixed(2),
            gift_card_code: code,
            redeem_link: redeemUrl,
            print_link: printUrl,
            personal_message_block: personalMessageBlock,
            expiration_notice: expirationNotice
          });
        }
        
        // Send confirmation to admin/sender
        await emailService.queueEmail(adminUserId, 'gift_card_sent_confirmation', {
          sender_name: sender_name || 'Brakebee Admin',
          recipient_email: recipient_email || 'direct credit',
          recipient_name: recipient_name || 'User',
          amount: creditAmount.toFixed(2),
          gift_card_code: code,
          print_link: printUrl,
          expiration_row: expiresAt 
            ? `<tr><td style="padding: 10px 0;"><strong>Expires:</strong></td><td style="padding: 10px 0; text-align: right;">${expiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>`
            : '',
          personal_message_block: personal_message 
            ? `<div style="background: #f0f0f0; padding: 16px; border-radius: 8px; margin: 16px 0;"><strong>Your Message:</strong><p style="margin: 8px 0 0 0; font-style: italic;">"${personal_message}"</p></div>`
            : ''
        });
      } catch (emailError) {
        console.error('Failed to send gift card emails:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    // Fetch created gift card
    const [giftCards] = await db.execute(
      'SELECT * FROM gift_cards WHERE id = ?',
      [giftCardId]
    );
    
    res.status(201).json({
      success: true,
      message: 'Gift card issued successfully',
      gift_card: giftCards[0],
      code: code,
      redemption_url: `${process.env.FRONTEND_URL}/redeem?code=${code}`
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error issuing gift card:', error);
    res.status(500).json({ error: 'Failed to issue gift card' });
  } finally {
    connection.release();
  }
});

/**
 * List all gift cards (admin)
 * @route GET /api/credits/admin/gift-cards
 * @access Admin only
 */
router.get('/admin/gift-cards', verifyToken, requireAllAccess, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = '1=1';
    const params = [];
    
    if (status) {
      whereClause += ' AND gc.status = ?';
      params.push(status);
    }
    
    if (search) {
      whereClause += ' AND (gc.code LIKE ? OR gc.issued_to_email LIKE ? OR gc.recipient_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    // Get total count
    const [countResult] = await db.execute(`
      SELECT COUNT(*) as total
      FROM gift_cards gc
      WHERE ${whereClause}
    `, params);
    
    // Get gift cards with issuer info
    const [giftCards] = await db.execute(`
      SELECT 
        gc.*,
        issuer.username as issued_by_email,
        recipient.username as recipient_user_email,
        redeemer.username as redeemed_by_email
      FROM gift_cards gc
      LEFT JOIN users issuer ON gc.issued_by = issuer.id
      LEFT JOIN users recipient ON gc.issued_to_user_id = recipient.id
      LEFT JOIN users redeemer ON gc.redeemed_by = redeemer.id
      WHERE ${whereClause}
      ORDER BY gc.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `, params);
    
    res.json({
      gift_cards: giftCards,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error listing gift cards:', error);
    res.status(500).json({ error: 'Failed to list gift cards' });
  }
});

/**
 * Get single gift card details (admin)
 * @route GET /api/credits/admin/gift-cards/:id
 * @access Admin only
 */
router.get('/admin/gift-cards/:id', verifyToken, requireAllAccess, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [giftCards] = await db.execute(`
      SELECT 
        gc.*,
        issuer.username as issued_by_email,
        recipient.username as recipient_user_email,
        redeemer.username as redeemed_by_email
      FROM gift_cards gc
      LEFT JOIN users issuer ON gc.issued_by = issuer.id
      LEFT JOIN users recipient ON gc.issued_to_user_id = recipient.id
      LEFT JOIN users redeemer ON gc.redeemed_by = redeemer.id
      WHERE gc.id = ?
    `, [id]);
    
    if (giftCards.length === 0) {
      return res.status(404).json({ error: 'Gift card not found' });
    }
    
    res.json(giftCards[0]);
    
  } catch (error) {
    console.error('Error getting gift card:', error);
    res.status(500).json({ error: 'Failed to get gift card' });
  }
});

/**
 * Cancel a gift card (admin)
 * @route POST /api/credits/admin/gift-cards/:id/cancel
 * @access Admin only
 */
router.post('/admin/gift-cards/:id/cancel', verifyToken, requireAllAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Check gift card exists and is active
    const [giftCards] = await db.execute(
      'SELECT * FROM gift_cards WHERE id = ?',
      [id]
    );
    
    if (giftCards.length === 0) {
      return res.status(404).json({ error: 'Gift card not found' });
    }
    
    if (giftCards[0].status !== 'active') {
      return res.status(400).json({ error: 'Only active gift cards can be cancelled' });
    }
    
    // Cancel the gift card
    await db.execute(`
      UPDATE gift_cards 
      SET status = 'cancelled',
          admin_notes = CONCAT(COALESCE(admin_notes, ''), '\nCancelled: ', ?)
      WHERE id = ?
    `, [reason || 'No reason provided', id]);
    
    res.json({
      success: true,
      message: 'Gift card cancelled'
    });
    
  } catch (error) {
    console.error('Error cancelling gift card:', error);
    res.status(500).json({ error: 'Failed to cancel gift card' });
  }
});

/**
 * Resend gift card email (admin)
 * @route POST /api/credits/admin/gift-cards/:id/resend
 * @access Admin only
 */
router.post('/admin/gift-cards/:id/resend', verifyToken, requireAllAccess, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [giftCards] = await db.execute(
      'SELECT * FROM gift_cards WHERE id = ?',
      [id]
    );
    
    if (giftCards.length === 0) {
      return res.status(404).json({ error: 'Gift card not found' });
    }
    
    const giftCard = giftCards[0];
    
    if (giftCard.status !== 'active') {
      return res.status(400).json({ error: 'Can only resend email for active gift cards' });
    }
    
    if (!giftCard.issued_to_email && !giftCard.issued_to_user_id) {
      return res.status(400).json({ error: 'No recipient email on file' });
    }
    
    // TODO: Implement email sending (Phase 5)
    // await sendGiftCardEmail(giftCard.id);
    
    res.json({
      success: true,
      message: 'Email resend queued (email sending not yet implemented)',
      sent_to: giftCard.issued_to_email
    });
    
  } catch (error) {
    console.error('Error resending gift card email:', error);
    res.status(500).json({ error: 'Failed to resend email' });
  }
});

/**
 * Manual credit adjustment (admin)
 * @route POST /api/credits/admin/adjust
 * @access Admin only
 */
router.post('/admin/adjust', verifyToken, requireAllAccess, async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const adminUserId = req.userId;
    const { user_id, amount, reason, description } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    
    if (!amount || parseFloat(amount) === 0) {
      return res.status(400).json({ error: 'Non-zero amount is required' });
    }
    
    const adjustmentAmount = parseFloat(amount);
    
    await connection.beginTransaction();
    
    // Ensure user exists
    const [users] = await connection.execute(
      'SELECT id FROM users WHERE id = ?',
      [user_id]
    );
    
    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Ensure user_credits record exists
    await ensureUserCreditsRecord(connection, user_id);
    
    // Get current balance
    const [currentCredit] = await connection.execute(
      'SELECT balance FROM user_credits WHERE user_id = ?',
      [user_id]
    );
    
    const currentBalance = parseFloat(currentCredit[0]?.balance || 0);
    const newBalance = currentBalance + adjustmentAmount;
    
    // Prevent negative balance
    if (newBalance < 0) {
      await connection.rollback();
      return res.status(400).json({ 
        error: `Cannot reduce balance below zero. Current balance: $${currentBalance.toFixed(2)}` 
      });
    }
    
    // Update balance
    if (adjustmentAmount > 0) {
      await connection.execute(`
        UPDATE user_credits 
        SET balance = balance + ?,
            lifetime_earned = lifetime_earned + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [adjustmentAmount, adjustmentAmount, user_id]);
    } else {
      await connection.execute(`
        UPDATE user_credits 
        SET balance = balance + ?,
            lifetime_spent = lifetime_spent + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [adjustmentAmount, Math.abs(adjustmentAmount), user_id]);
    }
    
    // Record transaction
    await connection.execute(`
      INSERT INTO user_credit_transactions 
      (user_id, amount, balance_after, transaction_type, description, created_by)
      VALUES (?, ?, ?, 'admin_adjustment', ?, ?)
    `, [user_id, adjustmentAmount, newBalance, description || reason || 'Admin adjustment', adminUserId]);
    
    await connection.commit();
    
    res.json({
      success: true,
      previous_balance: currentBalance,
      adjustment: adjustmentAmount,
      new_balance: newBalance
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error adjusting credit:', error);
    res.status(500).json({ error: 'Failed to adjust credit' });
  } finally {
    connection.release();
  }
});

/**
 * Get credit summary for a specific user (admin)
 * @route GET /api/credits/admin/user/:userId
 * @access Admin only
 */
router.get('/admin/user/:userId', verifyToken, requireAllAccess, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user info
    const [users] = await db.execute(`
      SELECT id, username, user_type 
      FROM users WHERE id = ?
    `, [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get credit balance
    const [credits] = await db.execute(`
      SELECT balance, lifetime_earned, lifetime_spent
      FROM user_credits WHERE user_id = ?
    `, [userId]);
    
    // Get recent transactions
    const [transactions] = await db.execute(`
      SELECT * FROM user_credit_transactions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `, [userId]);
    
    // Get gift cards issued to user
    const [giftCards] = await db.execute(`
      SELECT * FROM gift_cards
      WHERE issued_to_user_id = ? OR redeemed_by = ?
      ORDER BY created_at DESC
    `, [userId, userId]);
    
    res.json({
      user: users[0],
      credits: credits[0] || { balance: 0, lifetime_earned: 0, lifetime_spent: 0 },
      recent_transactions: transactions,
      gift_cards: giftCards
    });
    
  } catch (error) {
    console.error('Error getting user credits:', error);
    res.status(500).json({ error: 'Failed to get user credits' });
  }
});

module.exports = router;
