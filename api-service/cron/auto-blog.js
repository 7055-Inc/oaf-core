#!/usr/bin/env node

/**
 * Auto-Blog Generator Cron Job
 * 
 * Checks each enabled magazine config and generates articles if the daily quota
 * has not been met. Designed to run every 4 hours (6 runs/day).
 * 
 * Schedule: 0 */4 * * *
 * Usage:   node api-service/cron/auto-blog.js [--dry-run]
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../config/db');
const { getBlogGenerationService } = require('../src/modules/marketing/services/ai/BlogGenerationService');

const DRY_RUN = process.argv.includes('--dry-run');

async function runAutoBlog() {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [AUTO-BLOG] Starting scheduled generation${DRY_RUN ? ' (DRY RUN)' : ''}...`);

  try {
    const blogService = getBlogGenerationService();

    if (!blogService.isAvailable()) {
      console.log('[AUTO-BLOG] Claude API not configured — skipping');
      return;
    }

    const [configs] = await db.query('SELECT * FROM auto_blog_config WHERE enabled = 1');
    console.log(`[AUTO-BLOG] Found ${configs.length} enabled config(s)`);

    if (configs.length === 0) return;

    let generated = 0;
    let skipped = 0;
    let failed = 0;

    for (const config of configs) {
      try {
        // Count articles generated today for this config
        const [todayCount] = await db.query(`
          SELECT COUNT(*) as count FROM auto_blog_jobs
          WHERE config_id = ? AND status IN ('generated', 'published')
          AND DATE(created_at) = CURDATE()
        `, [config.id]);

        const todayGenerated = todayCount[0]?.count || 0;
        const quota = config.posts_per_day || 1;

        if (todayGenerated >= quota) {
          console.log(`[AUTO-BLOG] ${config.magazine}: quota met (${todayGenerated}/${quota}) — skipping`);
          skipped++;
          continue;
        }

        console.log(`[AUTO-BLOG] ${config.magazine}: ${todayGenerated}/${quota} — generating...`);

        if (DRY_RUN) {
          console.log(`[AUTO-BLOG] DRY RUN — would generate for ${config.magazine}`);
          continue;
        }

        const result = await blogService.generateArticle(config.id);
        console.log(`[AUTO-BLOG] ${config.magazine}: generated "${result.title}" (article #${result.articleId})`);
        generated++;

      } catch (error) {
        console.error(`[AUTO-BLOG] ${config.magazine}: generation failed —`, error.message);
        failed++;
      }
    }

    console.log(`\n[AUTO-BLOG] Summary: generated=${generated}, skipped=${skipped}, failed=${failed}`);

  } catch (error) {
    console.error('[AUTO-BLOG] Fatal error:', error);
  } finally {
    await db.end();
    console.log(`[${new Date().toISOString()}] [AUTO-BLOG] Complete\n`);
  }
}

if (require.main === module) {
  runAutoBlog().catch(error => {
    console.error('[AUTO-BLOG] Fatal error:', error);
    process.exit(1);
  });
}

module.exports = runAutoBlog;
