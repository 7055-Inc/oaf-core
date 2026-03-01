#!/usr/bin/env node

/**
 * Data Retention Cleanup Cron
 * 
 * Enforces data retention policy by purging expired/stale data.
 * Each cleanup task is independent — a failure in one does not block others.
 * 
 * Usage:
 *   node api-service/cron/data-retention-cleanup.js [--dry-run] [--json]
 * 
 * Flags:
 *   --dry-run   Show what would be deleted without actually deleting
 *   --json      Output results as JSON (for API endpoint consumption)
 * 
 * Cron schedule (daily at 3 AM):
 *   0 3 * * * cd /var/www/staging && node api-service/cron/data-retention-cleanup.js >> /var/log/data-retention-cleanup.log 2>&1
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mysql = require('mysql2/promise');

const dryRun = process.argv.includes('--dry-run');
const jsonOutput = process.argv.includes('--json');

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  timezone: '-07:00'
};

const CLEANUP_TASKS = [
  {
    name: 'Expired refresh tokens (30+ days past expiry)',
    countQuery: 'SELECT COUNT(*) as cnt FROM refresh_tokens WHERE expires_at < DATE_SUB(NOW(), INTERVAL 30 DAY)',
    deleteQuery: 'DELETE FROM refresh_tokens WHERE expires_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
  },
  {
    name: 'Stale email queue (unsent, 7+ days old)',
    countQuery: "SELECT COUNT(*) as cnt FROM email_queue WHERE status != 'sent' AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)",
    deleteQuery: "DELETE FROM email_queue WHERE status != 'sent' AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)"
  },
  {
    name: 'Error logs (90+ days old)',
    countQuery: 'SELECT COUNT(*) as cnt FROM error_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)',
    deleteQuery: 'DELETE FROM error_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)'
  },
  {
    name: 'Email logs (90+ days old)',
    countQuery: 'SELECT COUNT(*) as cnt FROM email_log WHERE sent_at < DATE_SUB(NOW(), INTERVAL 90 DAY)',
    deleteQuery: 'DELETE FROM email_log WHERE sent_at < DATE_SUB(NOW(), INTERVAL 90 DAY)'
  },
  {
    name: 'Search queries (90+ days old)',
    countQuery: 'SELECT COUNT(*) as cnt FROM search_queries WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)',
    deleteQuery: 'DELETE FROM search_queries WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)'
  },
  {
    name: 'Etsy sync logs (90+ days old)',
    countQuery: 'SELECT COUNT(*) as cnt FROM etsy_sync_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)',
    deleteQuery: 'DELETE FROM etsy_sync_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)'
  },
  {
    name: 'TikTok sync logs (90+ days old)',
    countQuery: 'SELECT COUNT(*) as cnt FROM tiktok_sync_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)',
    deleteQuery: 'DELETE FROM tiktok_sync_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)'
  },
  {
    name: 'Walmart sync logs (90+ days old)',
    countQuery: 'SELECT COUNT(*) as cnt FROM walmart_sync_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)',
    deleteQuery: 'DELETE FROM walmart_sync_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)'
  },
  {
    name: 'Wayfair sync logs (90+ days old)',
    countQuery: 'SELECT COUNT(*) as cnt FROM wayfair_sync_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)',
    deleteQuery: 'DELETE FROM wayfair_sync_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)'
  },
  {
    name: 'Failed pending images (30+ days old)',
    countQuery: "SELECT COUNT(*) as cnt FROM pending_images WHERE status = 'failed' AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)",
    deleteQuery: "DELETE FROM pending_images WHERE status = 'failed' AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)"
  },
  {
    name: 'Admin impersonation logs (1+ year old)',
    countQuery: 'SELECT COUNT(*) as cnt FROM admin_impersonation_log WHERE started_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)',
    deleteQuery: 'DELETE FROM admin_impersonation_log WHERE started_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)'
  },
  {
    name: 'Bounce tracking (90+ days old)',
    countQuery: 'SELECT COUNT(*) as cnt FROM bounce_tracking WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)',
    deleteQuery: 'DELETE FROM bounce_tracking WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)'
  }
];

/**
 * Run all standard cleanup tasks (log/token purges).
 */
async function runCleanupTasks(db) {
  const results = [];

  for (const task of CLEANUP_TASKS) {
    try {
      const [[{ cnt }]] = await db.execute(task.countQuery);

      if (cnt === 0) {
        results.push({ name: task.name, count: 0, status: 'skipped' });
        continue;
      }

      if (dryRun) {
        results.push({ name: task.name, count: cnt, status: 'dry-run' });
      } else {
        const [result] = await db.execute(task.deleteQuery);
        results.push({ name: task.name, count: result.affectedRows, status: 'deleted' });
      }
    } catch (err) {
      results.push({ name: task.name, count: 0, status: 'error', error: err.message });
    }
  }

  return results;
}

/**
 * Handle admin-approved user deletions (GDPR right-to-erasure).
 * Users with status='deleted' AND deletion_approved_at IS NOT NULL.
 */
async function runUserDeletions(db) {
  const results = [];

  try {
    const [users] = await db.execute(
      "SELECT id, username FROM users WHERE status = 'deleted' AND deletion_approved_at IS NOT NULL"
    );

    if (users.length === 0) {
      results.push({ name: 'User account deletions', count: 0, status: 'skipped' });
      return results;
    }

    for (const user of users) {
      if (dryRun) {
        results.push({ name: `Delete user ${user.id} (${user.username})`, count: 1, status: 'dry-run' });
        continue;
      }

      try {
        const tables = [
          'user_profiles', 'artist_profiles', 'promoter_profiles',
          'community_profiles', 'admin_profiles',
          'user_logins', 'refresh_tokens',
          'user_email_preferences', 'user_email_preference_log',
          'user_drip_preferences', 'user_campaign_enrollments',
          'user_campaign_emails', 'user_addons',
          'user_terms_acceptance', 'user_acknowledgments',
          'saved_items', 'user_permissions'
        ];

        let totalDeleted = 0;
        for (const table of tables) {
          try {
            const [r] = await db.execute(`DELETE FROM ${table} WHERE user_id = ?`, [user.id]);
            totalDeleted += r.affectedRows;
          } catch (e) {
            // Table may not have user_id column or row may not exist
          }
        }

        // Anonymize the user record (keep for financial FK integrity)
        await db.execute(
          "UPDATE users SET username = ?, password = NULL, google_uid = NULL, meta_title = NULL, meta_description = NULL, brand_voice = NULL, updated_at = NOW() WHERE id = ?",
          [`deleted_user_${user.id}@removed`, user.id]
        );

        results.push({
          name: `Delete user ${user.id} (${user.username})`,
          count: totalDeleted + 1,
          status: 'deleted'
        });
      } catch (err) {
        results.push({
          name: `Delete user ${user.id} (${user.username})`,
          count: 0,
          status: 'error',
          error: err.message
        });
      }
    }
  } catch (err) {
    results.push({ name: 'User account deletions', count: 0, status: 'error', error: err.message });
  }

  return results;
}

/**
 * Get preview counts only (for admin dashboard).
 */
async function getPreviewCounts(db) {
  const results = [];

  for (const task of CLEANUP_TASKS) {
    try {
      const [[{ cnt }]] = await db.execute(task.countQuery);
      results.push({ name: task.name, count: cnt });
    } catch (err) {
      results.push({ name: task.name, count: 0, error: err.message });
    }
  }

  // User deletions pending
  try {
    const [[{ cnt }]] = await db.execute(
      "SELECT COUNT(*) as cnt FROM users WHERE status = 'deleted' AND deletion_approved_at IS NOT NULL"
    );
    results.push({ name: 'Admin-approved user deletions', count: cnt });
  } catch (err) {
    results.push({ name: 'Admin-approved user deletions', count: 0, error: err.message });
  }

  return results;
}

async function main() {
  const startTime = Date.now();

  if (!jsonOutput) {
    console.log(`[${new Date().toISOString()}] === Data Retention Cleanup ===`);
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  }

  const db = await mysql.createConnection(dbConfig);

  try {
    const cleanupResults = await runCleanupTasks(db);
    const userResults = await runUserDeletions(db);
    const allResults = [...cleanupResults, ...userResults];
    const elapsed = Date.now() - startTime;

    if (jsonOutput) {
      console.log(JSON.stringify({
        success: true,
        dryRun,
        results: allResults,
        elapsed_ms: elapsed,
        timestamp: new Date().toISOString()
      }));
    } else {
      console.log('');
      for (const r of allResults) {
        const icon = r.status === 'deleted' ? 'CLEANED' :
                     r.status === 'dry-run' ? 'WOULD DELETE' :
                     r.status === 'skipped' ? 'NONE' : 'ERROR';
        console.log(`  [${icon}] ${r.name}: ${r.count}${r.error ? ' - ' + r.error : ''}`);
      }
      console.log(`\nCompleted in ${elapsed}ms`);
    }
  } catch (err) {
    if (jsonOutput) {
      console.log(JSON.stringify({ success: false, error: err.message }));
    } else {
      console.error('FATAL ERROR:', err.message);
    }
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Allow requiring as a module (for API endpoint) or running directly
if (require.main === module) {
  main();
} else {
  module.exports = { getPreviewCounts, runCleanupTasks, runUserDeletions, dbConfig };
}
