#!/usr/bin/env node

/**
 * Marketing Analytics Fetcher Cron Job
 * 
 * Fetches analytics data from social platforms for published content
 * Run every hour: 0 * * * *
 * 
 * Usage:
 *   node api-service/cron/marketing-analytics.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const db = require('../config/db');

async function fetchAnalytics() {
  console.log(`[${new Date().toISOString()}] Marketing Analytics: Starting...`);

  try {
    // Get published content that needs analytics update
    // Focus on content published in the last 30 days
    const [publishedContent] = await db.execute(`
      SELECT 
        mc.id,
        mc.campaign_id,
        mc.type,
        mc.channel,
        mc.external_id,
        mc.published_at,
        mcamp.name as campaign_name
      FROM marketing_content mc
      LEFT JOIN marketing_campaigns mcamp ON mc.campaign_id = mcamp.id
      WHERE mc.status = 'published'
        AND mc.external_id IS NOT NULL
        AND mc.published_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY mc.published_at DESC
      LIMIT 100
    `);

    console.log(`Found ${publishedContent.length} published content items to fetch analytics for`);

    if (publishedContent.length === 0) {
      console.log('No published content to fetch analytics for');
      await db.end();
      return;
    }

    let updated = 0;
    let failed = 0;

    for (const content of publishedContent) {
      try {
        console.log(`Fetching analytics for content ${content.id} (${content.channel})...`);

        // In Sprint C, this is where we'll call the actual platform APIs
        // For now, we'll just generate simulated analytics
        
        // TODO Sprint C: Replace with actual API calls
        // const publisher = PublisherFactory.getPublisher(content.channel);
        // const analytics = await publisher.getAnalytics(content.external_id);

        // Simulate analytics data
        const daysSincePublished = Math.floor(
          (Date.now() - new Date(content.published_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        const baseMultiplier = Math.max(1, daysSincePublished);
        
        const analytics = {
          impressions: Math.floor(Math.random() * 1000 * baseMultiplier),
          reach: Math.floor(Math.random() * 800 * baseMultiplier),
          engagements: Math.floor(Math.random() * 100 * baseMultiplier),
          clicks: Math.floor(Math.random() * 50 * baseMultiplier),
          shares: Math.floor(Math.random() * 20),
          saves: Math.floor(Math.random() * 15),
          comments: Math.floor(Math.random() * 10),
          conversions: Math.floor(Math.random() * 5),
          spend_cents: 0
        };

        // Check if we already have an analytics record for today
        const today = new Date().toISOString().split('T')[0];
        const [existingToday] = await db.execute(`
          SELECT id FROM marketing_analytics 
          WHERE content_id = ? 
            AND DATE(recorded_at) = ?
        `, [content.id, today]);

        if (existingToday.length > 0) {
          // Update existing record
          await db.execute(`
            UPDATE marketing_analytics 
            SET impressions = ?,
                reach = ?,
                engagements = ?,
                clicks = ?,
                shares = ?,
                saves = ?,
                comments = ?,
                conversions = ?,
                spend_cents = ?,
                raw_data = ?
            WHERE id = ?
          `, [
            analytics.impressions,
            analytics.reach,
            analytics.engagements,
            analytics.clicks,
            analytics.shares,
            analytics.saves,
            analytics.comments,
            analytics.conversions,
            analytics.spend_cents,
            JSON.stringify(analytics),
            existingToday[0].id
          ]);
          console.log(`✓ Updated analytics for content ${content.id}`);
        } else {
          // Insert new record
          await db.execute(`
            INSERT INTO marketing_analytics 
            (content_id, recorded_at, impressions, reach, engagements, clicks, 
             shares, saves, comments, conversions, spend_cents, raw_data)
            VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            content.id,
            analytics.impressions,
            analytics.reach,
            analytics.engagements,
            analytics.clicks,
            analytics.shares,
            analytics.saves,
            analytics.comments,
            analytics.conversions,
            analytics.spend_cents,
            JSON.stringify(analytics)
          ]);
          console.log(`✓ Recorded analytics for content ${content.id}`);
        }

        updated++;

      } catch (error) {
        console.error(`✗ Failed to fetch analytics for content ${content.id}:`, error.message);
        failed++;
      }
    }

    console.log(`\nAnalytics Summary:`);
    console.log(`  ✓ Updated: ${updated}`);
    console.log(`  ✗ Failed: ${failed}`);
    console.log(`  Total processed: ${publishedContent.length}`);

  } catch (error) {
    console.error('Marketing Analytics Error:', error);
  } finally {
    await db.end();
    console.log(`[${new Date().toISOString()}] Marketing Analytics: Complete\n`);
  }
}

// Run if called directly
if (require.main === module) {
  fetchAnalytics().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = fetchAnalytics;
