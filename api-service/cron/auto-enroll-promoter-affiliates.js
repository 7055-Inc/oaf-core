#!/usr/bin/env node

/**
 * Auto-Enroll Promoter Affiliates
 * 
 * Automatically enrolls promoters as affiliates based on affiliate_settings.
 * Runs hourly to catch new promoters.
 * 
 * Schedule: 0 * * * * (hourly)
 * 
 * Logic:
 * 1. Check if auto_enroll_promoters is enabled
 * 2. Find active promoters without affiliate accounts
 * 3. Create affiliate accounts with default settings
 * 4. Copy Stripe account from vendor_settings if available
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const crypto = require('crypto');

/**
 * Generate unique affiliate code
 */
function generateAffiliateCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

/**
 * Generate unique code with collision check
 */
async function generateUniqueCode() {
  let attempts = 0;
  while (attempts < 10) {
    const code = generateAffiliateCode();
    const [existing] = await db.execute(
      'SELECT id FROM affiliates WHERE affiliate_code = ?',
      [code]
    );
    if (existing.length === 0) {
      return code;
    }
    attempts++;
  }
  throw new Error('Failed to generate unique affiliate code after 10 attempts');
}

async function autoEnrollPromoterAffiliates() {
  const startTime = Date.now();
  console.log(`[Auto-Enroll] Starting promoter affiliate enrollment at ${new Date().toISOString()}`);
  
  try {
    // Check if auto-enrollment is enabled
    const [settings] = await db.execute(
      'SELECT auto_enroll_promoters, default_commission_rate FROM affiliate_settings WHERE id = 1'
    );
    
    if (settings.length === 0 || !settings[0].auto_enroll_promoters) {
      console.log('[Auto-Enroll] Auto-enrollment for promoters is disabled. Exiting.');
      return { success: true, enrolled: 0, skipped: 'disabled' };
    }
    
    const defaultRate = settings[0].default_commission_rate;
    
    // Find active promoters without affiliate accounts
    const [unenrolledPromoters] = await db.execute(`
      SELECT 
        u.id as user_id,
        u.username,
        vs.stripe_account_id
      FROM users u
      LEFT JOIN affiliates a ON u.id = a.user_id
      LEFT JOIN vendor_settings vs ON u.id = vs.vendor_id
      WHERE u.user_type = 'promoter'
        AND u.status = 'active'
        AND a.id IS NULL
    `);
    
    if (unenrolledPromoters.length === 0) {
      console.log('[Auto-Enroll] No unenrolled promoters found.');
      return { success: true, enrolled: 0, message: 'No unenrolled promoters' };
    }
    
    console.log(`[Auto-Enroll] Found ${unenrolledPromoters.length} promoters to enroll`);
    
    let enrolledCount = 0;
    let errorCount = 0;
    
    for (const promoter of unenrolledPromoters) {
      try {
        const affiliateCode = await generateUniqueCode();
        
        await db.execute(`
          INSERT INTO affiliates (
            user_id, affiliate_code, affiliate_type, commission_rate,
            status, payout_method, stripe_account_id
          ) VALUES (?, ?, 'promoter', ?, 'active', 'stripe', ?)
        `, [
          promoter.user_id,
          affiliateCode,
          defaultRate,
          promoter.stripe_account_id || null
        ]);
        
        enrolledCount++;
        console.log(`[Auto-Enroll] ✅ Enrolled promoter ${promoter.username} with code ${affiliateCode}`);
        
      } catch (error) {
        errorCount++;
        console.error(`[Auto-Enroll] ❌ Failed to enroll promoter ${promoter.user_id}:`, error.message);
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Auto-Enroll] Completed: ${enrolledCount} enrolled, ${errorCount} errors in ${duration}s`);
    
    return { 
      success: true, 
      enrolled: enrolledCount, 
      errors: errorCount,
      duration: `${duration}s`
    };
    
  } catch (error) {
    console.error('[Auto-Enroll] Fatal error:', error);
    return { success: false, error: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  autoEnrollPromoterAffiliates()
    .then(result => {
      console.log('[Auto-Enroll] Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('[Auto-Enroll] Unexpected error:', err);
      process.exit(1);
    });
}

module.exports = autoEnrollPromoterAffiliates;
