#!/usr/bin/env node

/**
 * Tier Enforcement Cron Job
 * 
 * Automatically enforces tier limits for BOTH sites AND addons across all subscription types.
 * 
 * Features:
 * - Site Enforcement: Deactivates excess sites when users exceed their tier limit
 * - Addon Enforcement: Disables addons that require higher tiers than user's current tier
 * - System-Wide: Checks ALL subscription types, not just websites
 * - Idempotent: Safe to run multiple times
 * 
 * Site Enforcement Logic:
 * - Query all users with 'websites' subscription
 * - Get their current tier (or null if cancelled)
 * - Use getTierLimits() to get max_sites for their tier
 * - Count active sites per user
 * - If active count > limit, deactivate oldest sites (keep newest based on created_at)
 * 
 * Addon Enforcement Logic:
 * - For each user with active sites, query their site addons
 * - Check each addon's tier_required against user's tier
 * - Use tier hierarchy: { free: 0, basic: 1, professional: 2 }
 * - If user tier level < addon required tier level, deactivate addon
 * 
 * Usage:
 *   node enforce-tier-limits.js [--dry-run]
 * 
 * Cron example (run daily at 2:30 AM):
 *   30 2 * * * cd /var/www/staging && /usr/bin/node api-service/cron/enforce-tier-limits.js >> /var/log/tier-enforcement.log 2>&1
 */

const mysql = require('mysql2/promise');
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || '10.128.0.31',
  user: process.env.DB_USER || 'oafuser',
  password: process.env.DB_PASS || 'oafpass',
  database: process.env.DB_NAME || 'oaf',
  timezone: 'Z'
};

// Tier hierarchy for comparison
const TIER_HIERARCHY = {
  free: 0,
  basic: 1,
  professional: 2
};

// Tier limits (synced with /lib/websites/tierConfig.js)
const TIER_LIMITS = {
  free: { max_sites: 1 },
  basic: { max_sites: 3 },
  professional: { max_sites: 999 }
};

class TierEnforcement {
  constructor(dryRun = false) {
    this.dryRun = dryRun;
    this.db = null;
    this.stats = {
      usersProcessed: 0,
      sitesDeactivated: 0,
      addonsDisabled: 0,
      errors: 0,
      bySubscriptionType: {}
    };
  }

  async connect() {
    this.db = await mysql.createConnection(dbConfig);
    console.log(`✓ Connected to database: ${dbConfig.database}`);
  }

  async disconnect() {
    if (this.db) {
      await this.db.end();
      console.log('✓ Database connection closed');
    }
  }

  /**
   * Get tier level for comparison
   */
  getTierLevel(tier) {
    if (!tier || tier === 'null' || tier === '') return TIER_HIERARCHY.free;
    const normalizedTier = tier.toLowerCase().trim();
    return TIER_HIERARCHY[normalizedTier] ?? TIER_HIERARCHY.free;
  }

  /**
   * Get max sites for a tier
   */
  getMaxSites(tier) {
    if (!tier || tier === 'null' || tier === '') return TIER_LIMITS.free.max_sites;
    const normalizedTier = tier.toLowerCase().trim();
    return TIER_LIMITS[normalizedTier]?.max_sites ?? TIER_LIMITS.free.max_sites;
  }

  /**
   * Enforce site limits for a single user
   */
  async enforceSiteLimits(userId, userTier) {
    try {
      // Check if user is admin (unlimited sites)
      const [adminCheck] = await this.db.query(
        'SELECT user_type FROM users WHERE id = ?',
        [userId]
      );
      
      if (adminCheck[0]?.user_type === 'admin') {
        return { sitesDeactivated: 0, reason: 'admin_unlimited' };
      }

      const maxSites = this.getMaxSites(userTier);
      
      // Get active sites count
      const [activeSites] = await this.db.query(
        'SELECT COUNT(*) as count FROM sites WHERE user_id = ? AND status = "active"',
        [userId]
      );
      
      const activeCount = activeSites[0].count;
      
      if (activeCount <= maxSites) {
        return { sitesDeactivated: 0, activeCount, maxSites };
      }

      // Need to deactivate excess sites (keep newest, deactivate oldest)
      const sitesToDeactivate = activeCount - maxSites;
      
      const [sitesToUpdate] = await this.db.query(
        'SELECT id, site_name FROM sites WHERE user_id = ? AND status = "active" ORDER BY created_at ASC LIMIT ?',
        [userId, sitesToDeactivate]
      );

      if (sitesToUpdate.length > 0 && !this.dryRun) {
        const siteIds = sitesToUpdate.map(s => s.id);
        await this.db.query(
          `UPDATE sites SET status = 'draft' WHERE id IN (${siteIds.map(() => '?').join(',')})`,
          siteIds
        );
      }

      return {
        sitesDeactivated: sitesToUpdate.length,
        activeCount,
        maxSites,
        deactivatedSites: sitesToUpdate.map(s => ({ id: s.id, name: s.site_name }))
      };
    } catch (error) {
      console.error(`  ✗ Error enforcing site limits for user ${userId}:`, error.message);
      this.stats.errors++;
      return { sitesDeactivated: 0, error: error.message };
    }
  }

  /**
   * Enforce addon tier requirements for a single user
   */
  async enforceAddonLimits(userId, userTier) {
    try {
      const userTierLevel = this.getTierLevel(userTier);

      // Get all active addons for this user's sites
      const [activeAddons] = await this.db.query(`
        SELECT 
          sa.id as site_addon_id,
          sa.site_id,
          sa.addon_id,
          wa.addon_name,
          wa.tier_required,
          s.site_name
        FROM site_addons sa
        JOIN website_addons wa ON sa.addon_id = wa.id
        JOIN sites s ON sa.site_id = s.id
        WHERE s.user_id = ? AND sa.is_active = 1
      `, [userId]);

      const addonsToDisable = [];

      for (const addon of activeAddons) {
        const requiredTierLevel = this.getTierLevel(addon.tier_required);
        
        // If user's tier is lower than required tier, disable addon
        if (userTierLevel < requiredTierLevel) {
          addonsToDisable.push(addon);
        }
      }

      if (addonsToDisable.length > 0 && !this.dryRun) {
        const siteAddonIds = addonsToDisable.map(a => a.site_addon_id);
        await this.db.query(
          `UPDATE site_addons SET is_active = 0, deactivated_at = CURRENT_TIMESTAMP WHERE id IN (${siteAddonIds.map(() => '?').join(',')})`,
          siteAddonIds
        );
      }

      return {
        addonsDisabled: addonsToDisable.length,
        disabledAddons: addonsToDisable.map(a => ({
          site_addon_id: a.site_addon_id,
          addon_name: a.addon_name,
          site_name: a.site_name,
          tier_required: a.tier_required
        }))
      };
    } catch (error) {
      console.error(`  ✗ Error enforcing addon limits for user ${userId}:`, error.message);
      this.stats.errors++;
      return { addonsDisabled: 0, error: error.message };
    }
  }

  /**
   * Process website subscriptions
   */
  async processWebsiteSubscriptions() {
    console.log('\n=== Processing Website Subscriptions ===');
    
    const [users] = await this.db.query(`
      SELECT 
        us.user_id,
        us.tier,
        us.status,
        u.email,
        u.user_type
      FROM user_subscriptions us
      JOIN users u ON us.user_id = u.id
      WHERE us.subscription_type = 'websites'
      ORDER BY us.user_id
    `);

    console.log(`Found ${users.length} users with website subscriptions`);

    let websiteStats = {
      usersProcessed: 0,
      sitesDeactivated: 0,
      addonsDisabled: 0
    };

    for (const user of users) {
      const userTier = user.tier || 'free';
      console.log(`\nProcessing user ${user.user_id} (${user.email}): tier=${userTier}, status=${user.status}`);

      // Enforce site limits
      const siteResult = await this.enforceSiteLimits(user.user_id, userTier);
      
      if (siteResult.sitesDeactivated > 0) {
        console.log(`  → Deactivated ${siteResult.sitesDeactivated} site(s) (limit: ${siteResult.maxSites})`);
        siteResult.deactivatedSites?.forEach(site => {
          console.log(`     - ${site.name} (ID: ${site.id})`);
        });
        websiteStats.sitesDeactivated += siteResult.sitesDeactivated;
      }

      // Enforce addon limits
      const addonResult = await this.enforceAddonLimits(user.user_id, userTier);
      
      if (addonResult.addonsDisabled > 0) {
        console.log(`  → Disabled ${addonResult.addonsDisabled} addon(s)`);
        addonResult.disabledAddons?.forEach(addon => {
          console.log(`     - ${addon.addon_name} on ${addon.site_name} (requires: ${addon.tier_required})`);
        });
        websiteStats.addonsDisabled += addonResult.addonsDisabled;
      }

      websiteStats.usersProcessed++;
    }

    this.stats.bySubscriptionType['websites'] = websiteStats;
    this.stats.usersProcessed += websiteStats.usersProcessed;
    this.stats.sitesDeactivated += websiteStats.sitesDeactivated;
    this.stats.addonsDisabled += websiteStats.addonsDisabled;

    console.log(`\n✓ Website subscriptions processed: ${websiteStats.usersProcessed} users, ${websiteStats.sitesDeactivated} sites deactivated, ${websiteStats.addonsDisabled} addons disabled`);
  }

  /**
   * Process other subscription types (placeholder for future expansion)
   */
  async processOtherSubscriptions() {
    console.log('\n=== Processing Other Subscription Types ===');
    
    const [subscriptionTypes] = await this.db.query(`
      SELECT DISTINCT subscription_type, COUNT(*) as count
      FROM user_subscriptions
      WHERE subscription_type != 'websites'
      GROUP BY subscription_type
    `);

    if (subscriptionTypes.length === 0) {
      console.log('No other subscription types found');
      return;
    }

    for (const subType of subscriptionTypes) {
      console.log(`Found ${subType.count} users with '${subType.subscription_type}' subscriptions`);
      console.log(`  (No enforcement logic defined for '${subType.subscription_type}' yet)`);
      
      this.stats.bySubscriptionType[subType.subscription_type] = {
        usersProcessed: 0,
        note: 'No enforcement logic defined'
      };
    }
  }

  /**
   * Main execution
   */
  async run() {
    const startTime = Date.now();
    console.log('========================================');
    console.log('Tier Enforcement Cron Job');
    console.log(`Started: ${new Date().toISOString()}`);
    console.log(`Mode: ${this.dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
    console.log('========================================');

    try {
      await this.connect();
      
      // Process website subscriptions (sites + addons enforcement)
      await this.processWebsiteSubscriptions();
      
      // Process other subscription types (future expansion)
      await this.processOtherSubscriptions();
      
      // Print summary
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log('\n========================================');
      console.log('SUMMARY');
      console.log('========================================');
      console.log(`Total users processed: ${this.stats.usersProcessed}`);
      console.log(`Total sites deactivated: ${this.stats.sitesDeactivated}`);
      console.log(`Total addons disabled: ${this.stats.addonsDisabled}`);
      console.log(`Total errors: ${this.stats.errors}`);
      console.log(`Duration: ${duration}s`);
      console.log('========================================');

      if (this.dryRun) {
        console.log('\n⚠️  DRY RUN MODE: No changes were made to the database');
      }

      await this.disconnect();
      
      // Exit with appropriate code
      process.exit(this.stats.errors > 0 ? 1 : 0);
      
    } catch (error) {
      console.error('\n✗ FATAL ERROR:', error);
      await this.disconnect();
      process.exit(1);
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Run the enforcement
const enforcement = new TierEnforcement(dryRun);
enforcement.run();
