#!/usr/bin/env node
/**
 * Smoke Test: AI Campaign Generation Pipeline
 *
 * Runs the full pipeline end-to-end:
 *   1. Calls ContentGenerationService to gather context + send brief to Claude
 *   2. Claude generates post concepts
 *   3. MediaMatcher attempts to match library assets (will gracefully skip if none)
 *   4. MediaComposer queues image processing (will gracefully skip if no match)
 *   5. CampaignService saves the campaign record
 *   6. ContentService saves each post as a draft for review
 *
 * Usage:  node scripts/smoke-test-campaign.js
 * Result: Prints the campaign ID — go to
 *         /dashboard/marketing/social-central/campaigns/<ID>
 *         to review and approve posts.
 */

const path = require('path');

// Load env from api-service root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
if (!process.env.DB_HOST) {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
}

const { getContentGenerationService } = require('../src/modules/marketing/services/ai');
const { CampaignService, ContentService } = require('../src/modules/marketing/services');

// ── CONFIG ──────────────────────────────────────────────────────────────────
const ADMIN_USER_ID = 1000000007;
const OWNER_TYPE = 'admin';

const CAMPAIGN = {
  campaignName: 'Spring Collection Launch — Smoke Test',
  campaignGoal: 'Drive awareness and engagement for our new spring art collection. Showcase featured pieces, invite followers to explore the gallery, and build excitement for the upcoming launch event.',
  platforms: ['instagram', 'facebook', 'twitter'],
  startDate: '2026-02-16',
  endDate: '2026-02-28',
  postCount: 5,
  crmEmailEnabled: false,
  dripEnabled: false,
  collectionEnabled: false,
};
// ────────────────────────────────────────────────────────────────────────────

(async () => {
  const hr = () => console.log('─'.repeat(70));

  hr();
  console.log('  AI CAMPAIGN PIPELINE — SMOKE TEST');
  hr();
  console.log(`  User:       ${ADMIN_USER_ID} (admin)`);
  console.log(`  Campaign:   ${CAMPAIGN.campaignName}`);
  console.log(`  Platforms:  ${CAMPAIGN.platforms.join(', ')}`);
  console.log(`  Posts:      ${CAMPAIGN.postCount}`);
  console.log(`  Dates:      ${CAMPAIGN.startDate} → ${CAMPAIGN.endDate}`);
  hr();

  // ── Step 1: Check AI availability ──
  console.log('\n[1/4] Checking AI service availability...');
  const aiService = getContentGenerationService();
  if (!aiService.isAvailable()) {
    console.error('FAIL — Claude AI is not configured (missing ANTHROPIC_API_KEY)');
    process.exit(1);
  }
  console.log('  ✓ Claude AI service is available');

  // ── Step 2: Generate campaign content via Claude ──
  console.log('\n[2/4] Generating campaign content (Claude + Leo context)...');
  console.log('  Sending brief to Claude... (this may take 15-30 seconds)\n');

  const startTime = Date.now();
  let result;
  try {
    result = await aiService.generateCampaignContent({
      userId: ADMIN_USER_ID,
      ownerType: OWNER_TYPE,
      ...CAMPAIGN,
    });
  } catch (err) {
    console.error('FAIL — Content generation error:', err.message);
    if (err.message.includes('401') || err.message.includes('authentication')) {
      console.error('  → The ANTHROPIC_API_KEY may be invalid or expired.');
    }
    process.exit(1);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  ✓ Claude generated ${result.posts.length} posts in ${elapsed}s`);
  console.log(`    Brand data richness: ${result.dataRichness}/100`);
  console.log(`    Media assets available: ${result.mediaAssetsAvailable}`);
  console.log(`    Media match stats: ${JSON.stringify(result.mediaMatchStats)}`);

  // ── Step 3: Save campaign to DB ──
  console.log('\n[3/4] Saving campaign to database...');
  const campaignResult = await CampaignService.createCampaign({
    name: CAMPAIGN.campaignName,
    description: `Smoke test campaign. Goal: ${CAMPAIGN.campaignGoal.substring(0, 100)}...`,
    type: 'social',
    status: 'draft',
    owner_type: OWNER_TYPE,
    owner_id: ADMIN_USER_ID,
    start_date: CAMPAIGN.startDate,
    end_date: CAMPAIGN.endDate,
    goals: JSON.stringify({
      goal: CAMPAIGN.campaignGoal,
      platforms: CAMPAIGN.platforms,
      dataRichness: result.dataRichness,
      mediaMatchStats: result.mediaMatchStats,
    }),
  });

  if (!campaignResult.success) {
    console.error('FAIL — Could not save campaign:', campaignResult.error);
    process.exit(1);
  }

  const campaignId = campaignResult.campaign_id;
  console.log(`  ✓ Campaign saved — ID: ${campaignId}`);

  // ── Step 4: Save posts as draft content ──
  console.log('\n[4/4] Saving posts...');
  const savedPosts = [];
  for (const post of result.posts) {
    try {
      const contentPayload = {
        caption: post.caption || '',
        hashtags: post.hashtags || [],
        callToAction: post.callToAction || '',
        title: post.title || '',
        suggestedMediaDescription: post.suggestedMediaDescription || '',
        visualDirection: post.visualDirection || '',
        rationale: post.rationale || '',
        suggestedDay: post.suggestedDay,
        suggestedTime: post.suggestedTime,
        matchedMedia: post.matchedMedia || null,
        mediaCandidates: post.mediaCandidates || [],
        mediaSource: post.mediaSource || 'none',
        composition: post.composition || null,
      };

      const contentResult = await ContentService.createContent({
        campaign_id: campaignId,
        type: post.type || 'post',
        channel: post.platform || CAMPAIGN.platforms[0],
        content: contentPayload,
        status: 'draft',
        created_by: 'ai',
      });

        if (contentResult.success) {
          savedPosts.push({
            id: contentResult.content.id || contentResult.content_id,
            platform: post.platform,
            title: post.title,
            type: post.type,
          });
          console.log(`  ✓ Post #${savedPosts.length}: "${post.title}" (${post.platform}/${post.type})`);
        } else {
          console.error(`  ✗ Save failed for "${post.title}":`, JSON.stringify(contentResult));
        }
      } catch (err) {
        console.error(`  ✗ Failed to save "${post.title}":`, err.message, err.stack?.split('\n')[1]);
      }
  }

  // ── Summary ──
  hr();
  console.log('\n  SMOKE TEST COMPLETE');
  hr();
  console.log(`  Campaign ID:    ${campaignId}`);
  console.log(`  Posts created:   ${savedPosts.length}`);
  console.log(`  Status:          draft (ready for review)`);
  console.log('');
  console.log(`  Review your posts at:`);
  const frontendBase = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  console.log(`  ${frontendBase}/dashboard/marketing/social-central/campaigns/${campaignId}`);
  hr();

  // Print a mini preview of each post
  console.log('\n  POST PREVIEWS:\n');
  for (const post of result.posts) {
    console.log(`  ┌─ ${post.title} (${post.platform} / ${post.type})`);
    console.log(`  │  Day ${post.suggestedDay} at ${post.suggestedTime}`);
    const captionPreview = (post.caption || '').substring(0, 120).replace(/\n/g, ' ');
    console.log(`  │  "${captionPreview}${post.caption?.length > 120 ? '...' : ''}"`);
    if (post.hashtags?.length) {
      console.log(`  │  #${post.hashtags.slice(0, 5).join(' #')}${post.hashtags.length > 5 ? ` (+${post.hashtags.length - 5} more)` : ''}`);
    }
    console.log(`  └─ CTA: ${post.callToAction || '(none)'}`);
    console.log('');
  }

  process.exit(0);
})();
