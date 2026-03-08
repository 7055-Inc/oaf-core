#!/usr/bin/env node

/**
 * Marketing Publisher Cron Job
 * 
 * Processes scheduled content and publishes it when the time comes
 * Run every 5 minutes: */5 * * * *
 * 
 * Usage:
 *   node api-service/cron/marketing-publisher.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const db = require('../config/db');
const { publishContent } = require('../src/modules/marketing/publishers');

async function publishScheduledContent() {
  console.log(`[${new Date().toISOString()}] Marketing Publisher: Starting...`);

  try {
    // Get content ready to publish (scheduled time has passed)
    const [readyContent] = await db.execute(`
      SELECT 
        mc.id,
        mc.campaign_id,
        mc.type,
        mc.channel,
        mc.content,
        mc.scheduled_at,
        mcamp.name as campaign_name
      FROM marketing_content mc
      LEFT JOIN marketing_campaigns mcamp ON mc.campaign_id = mcamp.id
      WHERE mc.status = 'scheduled' 
        AND mc.scheduled_at <= NOW()
      ORDER BY mc.scheduled_at ASC
      LIMIT 50
    `);

    console.log(`Found ${readyContent.length} content items ready to publish`);

    if (readyContent.length === 0) {
      console.log('No content to publish at this time');
      await db.end();
      return;
    }

    let published = 0;
    let failed = 0;

    for (const content of readyContent) {
      try {
        console.log(`Publishing content ${content.id} to ${content.channel}...`);

        // Use real publisher from Sprint C1
        const result = await publishContent(content.id);

        if (result.success) {
          console.log(`✓ Content ${content.id} published successfully (External ID: ${result.externalId})`);
          published++;
        } else {
          console.error(`✗ Failed to publish content ${content.id}: ${result.error}`);
          failed++;
        }

      } catch (error) {
        console.error(`✗ Failed to publish content ${content.id}:`, error.message);
        failed++;

        // Update status to failed
        await db.execute(`
          UPDATE marketing_content 
          SET status = 'failed'
          WHERE id = ?
        `, [content.id]);

        // Log failure as feedback
        await db.execute(`
          INSERT INTO marketing_feedback 
          (content_id, action, feedback, created_by)
          VALUES (?, 'comment', ?, 0)
        `, [
          content.id, 
          `Publishing failed: ${error.message}`
        ]);
      }
    }

    console.log(`\nPublishing Summary:`);
    console.log(`  ✓ Published: ${published}`);
    console.log(`  ✗ Failed: ${failed}`);
    console.log(`  Total processed: ${readyContent.length}`);

  } catch (error) {
    console.error('Marketing Publisher Error:', error);
  } finally {
    await db.end();
    console.log(`[${new Date().toISOString()}] Marketing Publisher: Complete\n`);
  }
}

// Run if called directly
if (require.main === module) {
  publishScheduledContent().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = publishScheduledContent;
