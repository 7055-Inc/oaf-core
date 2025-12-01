const db = require('../../config/db');

/**
 * @fileoverview Cleanup Unclaimed Promoter Accounts
 * 
 * Weekly cron job to delete draft promoter accounts and events
 * that remain unclaimed after 180 days
 */

/**
 * Main cleanup function
 * Deletes unclaimed accounts and their associated events after 180 days
 */
async function cleanupUnclaimedAccounts() {
  console.log('[Cleanup] Starting unclaimed accounts cleanup...');
  
  const startTime = Date.now();
  const DAYS_THRESHOLD = 180; // 6 months
  let accountsDeleted = 0;
  let eventsDeleted = 0;
  let errors = 0;

  try {
    // Find unclaimed accounts older than threshold
    const [unclaimedAccounts] = await db.execute(`
      SELECT 
        u.id as user_id,
        u.username as email,
        e.id as event_id,
        e.title as event_title,
        e.created_at,
        DATEDIFF(NOW(), e.created_at) as days_old
      FROM users u
      JOIN events e ON e.promoter_id = u.id
      WHERE u.status = 'draft'
        AND u.created_by_admin_id IS NOT NULL
        AND e.claim_status = 'pending_claim'
        AND DATEDIFF(NOW(), e.created_at) > ?
      ORDER BY e.created_at ASC
    `, [DAYS_THRESHOLD]);

    console.log(`[Cleanup] Found ${unclaimedAccounts.length} unclaimed accounts older than ${DAYS_THRESHOLD} days`);

    for (const account of unclaimedAccounts) {
      const connection = await db.getConnection();
      
      try {
        await connection.beginTransaction();

        console.log(`[Cleanup] Deleting account: ${account.email} (${account.days_old} days old)`);

        // Delete claim tokens
        await connection.execute(
          'DELETE FROM promoter_claim_tokens WHERE event_id = ?',
          [account.event_id]
        );

        // Delete campaign enrollments
        await connection.execute(
          'DELETE FROM user_campaign_enrollments WHERE user_id = ?',
          [account.user_id]
        );

        // Delete campaign emails log
        await connection.execute(
          'DELETE FROM user_campaign_emails WHERE user_id = ?',
          [account.user_id]
        );

        // Delete event (CASCADE will handle related records)
        await connection.execute(
          'DELETE FROM events WHERE id = ?',
          [account.event_id]
        );

        // Delete user profiles
        await connection.execute(
          'DELETE FROM user_profiles WHERE user_id = ?',
          [account.user_id]
        );

        await connection.execute(
          'DELETE FROM promoter_profiles WHERE user_id = ?',
          [account.user_id]
        );

        // Delete user (no Firebase user exists yet for unclaimed accounts)
        await connection.execute(
          'DELETE FROM users WHERE id = ?',
          [account.user_id]
        );

        await connection.commit();
        
        accountsDeleted++;
        eventsDeleted++;
        
        console.log(`[Cleanup] Successfully deleted: ${account.email}`);

      } catch (error) {
        await connection.rollback();
        console.error(`[Cleanup] Error deleting account ${account.email}:`, error);
        errors++;
      } finally {
        connection.release();
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Cleanup] Completed in ${duration}s`);
    console.log(`[Cleanup] Stats: ${accountsDeleted} accounts deleted, ${eventsDeleted} events deleted, ${errors} errors`);

    // Log cleanup summary
    if (accountsDeleted > 0 || errors > 0) {
      await logCleanupSummary({
        accountsDeleted,
        eventsDeleted,
        errors,
        duration,
        threshold: DAYS_THRESHOLD
      });
    }

    return {
      success: true,
      accountsDeleted,
      eventsDeleted,
      errors,
      duration
    };

  } catch (error) {
    console.error('[Cleanup] Fatal error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Log cleanup summary for audit trail
 * @param {Object} summary - Cleanup summary stats
 */
async function logCleanupSummary(summary) {
  try {
    // You could log this to a dedicated cleanup_logs table
    // For now, just console log (cron output is usually logged)
    console.log('[Cleanup] Summary:', JSON.stringify(summary, null, 2));
    
    // Optional: Send notification to admins if there were errors
    if (summary.errors > 0) {
      console.warn(`[Cleanup] ⚠️ ${summary.errors} errors occurred during cleanup`);
    }
  } catch (error) {
    console.error('[Cleanup] Failed to log summary:', error);
  }
}

/**
 * Mark old unclaimed events as expired (alternative to deletion)
 * This function can be used instead of deletion if you want to keep records
 */
async function markExpiredUnclaimedEvents() {
  console.log('[Cleanup] Marking expired unclaimed events...');
  
  const DAYS_THRESHOLD = 180;

  try {
    const [result] = await db.execute(`
      UPDATE events e
      JOIN users u ON e.promoter_id = u.id
      SET e.claim_status = 'unclaimed_expired'
      WHERE u.status = 'draft'
        AND u.created_by_admin_id IS NOT NULL
        AND e.claim_status = 'pending_claim'
        AND DATEDIFF(NOW(), e.created_at) > ?
    `, [DAYS_THRESHOLD]);

    console.log(`[Cleanup] Marked ${result.affectedRows} events as expired`);

    return {
      success: true,
      eventsMarked: result.affectedRows
    };

  } catch (error) {
    console.error('[Cleanup] Error marking expired events:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run if called directly (for testing)
if (require.main === module) {
  console.log('Running unclaimed accounts cleanup...');
  
  // Parse command line args
  const args = process.argv.slice(2);
  const markOnly = args.includes('--mark-only');

  const runner = markOnly ? markExpiredUnclaimedEvents : cleanupUnclaimedAccounts;
  const action = markOnly ? 'Marking expired events' : 'Deleting unclaimed accounts';

  console.log(`[Cleanup] Action: ${action}`);

  runner()
    .then(result => {
      console.log('Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { 
  cleanupUnclaimedAccounts, 
  markExpiredUnclaimedEvents 
};

