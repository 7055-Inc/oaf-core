#!/usr/bin/env node

/**
 * Subscription Cancellation Processor Cron Job
 * 
 * Runs daily to:
 * 1. Find subscriptions marked for cancellation where the billing period has ended
 * 2. Revoke associated permissions
 * 3. Update subscription status to 'canceled'
 * 
 * Usage: node api-service/scripts/process-subscription-cancellations.js
 * 
 * Add to crontab for daily execution at 2 AM:
 * 0 2 * * * /usr/bin/node /var/www/main/api-service/scripts/process-subscription-cancellations.js >> /var/log/subscription-cancellations.log 2>&1
 */

const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: '10.128.0.31',
  user: 'oafuser', 
  password: 'oafpass',
  database: 'oaf',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Mapping of subscription types to permission columns
const SUBSCRIPTION_PERMISSION_MAP = {
  'websites': 'sites',
  'shipping_labels': 'shipping',
  'verification': 'verified',
  'social': 'leo_social',
  'crm': 'crm'
};

async function processSubscriptionCancellations() {
  let connection;
  
  try {
    console.log(`[${new Date().toISOString()}] Starting subscription cancellation processor...`);
    
    connection = await mysql.createConnection(dbConfig);
    
    let totalSuccess = 0;
    let totalErrors = 0;

    // ========================================================================
    // PHASE 1: Process subscription cancellations
    // ========================================================================
    console.log('\n--- Phase 1: Subscription cancellations ---');

    const [subscriptions] = await connection.execute(`
      SELECT 
        us.id,
        us.user_id,
        us.subscription_type,
        us.tier,
        us.current_period_end,
        us.canceled_at
      FROM user_subscriptions us
      WHERE us.cancel_at_period_end = 1
        AND us.is_complimentary = 0
        AND us.status = 'active'
        AND us.current_period_end < NOW()
    `);
    
    console.log(`Found ${subscriptions.length} subscriptions to cancel`);
    
    for (const subscription of subscriptions) {
      try {
        console.log(`\nProcessing subscription ${subscription.id} (user ${subscription.user_id}, type: ${subscription.subscription_type})`);
        
        await connection.beginTransaction();
        
        await connection.execute(
          `UPDATE user_subscriptions SET status = 'canceled' WHERE id = ?`,
          [subscription.id]
        );
        console.log(`  - Set subscription status to 'canceled'`);
        
        // Revoke permissions based on subscription type
        if (subscription.subscription_type === 'verification') {
          if (subscription.tier === 'Marketplace Seller') {
            await connection.execute(
              `UPDATE user_permissions SET verified = 0, marketplace = 0 WHERE user_id = ?`,
              [subscription.user_id]
            );
            console.log(`  - Revoked 'verified' and 'marketplace' permissions`);
          } else {
            await connection.execute(
              `UPDATE user_permissions SET verified = 0 WHERE user_id = ?`,
              [subscription.user_id]
            );
            console.log(`  - Revoked 'verified' permission`);
          }
        } else {
          const permissionColumn = SUBSCRIPTION_PERMISSION_MAP[subscription.subscription_type];
          if (permissionColumn) {
            await connection.execute(
              `UPDATE user_permissions SET ${permissionColumn} = 0 WHERE user_id = ?`,
              [subscription.user_id]
            );
            console.log(`  - Revoked '${permissionColumn}' permission`);
          } else {
            console.log(`  ! Warning: No permission mapping for '${subscription.subscription_type}'`);
          }
        }

        // Websites-specific: deactivate sites and site addons
        if (subscription.subscription_type === 'websites') {
          const [sitesResult] = await connection.execute(
            `UPDATE sites SET status = 'draft' WHERE user_id = ? AND status = 'active'`,
            [subscription.user_id]
          );
          console.log(`  - Deactivated ${sitesResult.affectedRows} site(s)`);

          const [siteAddonsResult] = await connection.execute(
            `UPDATE site_addons sa
             JOIN sites s ON sa.site_id = s.id
             SET sa.is_active = 0, sa.deactivated_at = NOW(), sa.cancel_at_period_end = 0
             WHERE s.user_id = ? AND sa.is_active = 1`,
            [subscription.user_id]
          );
          console.log(`  - Disabled ${siteAddonsResult.affectedRows} site addon(s)`);

          const [userAddonsResult] = await connection.execute(
            `UPDATE user_addons SET is_active = 0, deactivated_at = NOW(), cancel_at_period_end = 0
             WHERE user_id = ? AND is_active = 1 AND is_complimentary = 0`,
            [subscription.user_id]
          );
          console.log(`  - Disabled ${userAddonsResult.affectedRows} user addon(s)`);
        }
        
        await connection.commit();
        console.log(`  OK: Subscription ${subscription.id} canceled`);
        totalSuccess++;
        
      } catch (error) {
        await connection.rollback();
        console.error(`  ERROR processing subscription ${subscription.id}:`, error.message);
        totalErrors++;
      }
    }

    // ========================================================================
    // PHASE 2: Process site addon cancellations
    // ========================================================================
    console.log('\n--- Phase 2: Site addon cancellations ---');

    const [siteAddons] = await connection.execute(`
      SELECT sa.id, sa.site_id, s.user_id
      FROM site_addons sa
      JOIN sites s ON sa.site_id = s.id
      WHERE sa.cancel_at_period_end = 1
        AND sa.is_complimentary = 0
        AND sa.is_active = 1
        AND sa.current_period_end IS NOT NULL
        AND sa.current_period_end < NOW()
    `);

    console.log(`Found ${siteAddons.length} site addons to deactivate`);

    for (const addon of siteAddons) {
      try {
        await connection.execute(
          `UPDATE site_addons SET is_active = 0, deactivated_at = NOW(), cancel_at_period_end = 0 WHERE id = ?`,
          [addon.id]
        );
        console.log(`  OK: Site addon ${addon.id} (user ${addon.user_id}) deactivated`);
        totalSuccess++;
      } catch (error) {
        console.error(`  ERROR deactivating site addon ${addon.id}:`, error.message);
        totalErrors++;
      }
    }

    // ========================================================================
    // PHASE 3: Process user addon cancellations
    // ========================================================================
    console.log('\n--- Phase 3: User addon cancellations ---');

    const [userAddons] = await connection.execute(`
      SELECT id, user_id, addon_slug
      FROM user_addons
      WHERE cancel_at_period_end = 1
        AND is_complimentary = 0
        AND is_active = 1
        AND current_period_end IS NOT NULL
        AND current_period_end < NOW()
    `);

    console.log(`Found ${userAddons.length} user addons to deactivate`);

    for (const addon of userAddons) {
      try {
        await connection.execute(
          `UPDATE user_addons SET is_active = 0, deactivated_at = NOW(), cancel_at_period_end = 0 WHERE id = ?`,
          [addon.id]
        );
        console.log(`  OK: User addon ${addon.id} (${addon.addon_slug}, user ${addon.user_id}) deactivated`);
        totalSuccess++;
      } catch (error) {
        console.error(`  ERROR deactivating user addon ${addon.id}:`, error.message);
        totalErrors++;
      }
    }

    // ========================================================================
    // PHASE 4: Process CRM addon cancellations
    // ========================================================================
    console.log('\n--- Phase 4: CRM addon cancellations ---');

    const [crmAddons] = await connection.execute(`
      SELECT id, user_id, addon_type
      FROM crm_subscription_addons
      WHERE cancel_at_period_end = 1
        AND is_complimentary = 0
        AND is_active = 1
        AND current_period_end IS NOT NULL
        AND current_period_end < NOW()
    `);

    console.log(`Found ${crmAddons.length} CRM addons to deactivate`);

    for (const addon of crmAddons) {
      try {
        await connection.execute(
          `UPDATE crm_subscription_addons SET is_active = 0, deactivated_at = NOW(), cancel_at_period_end = 0 WHERE id = ?`,
          [addon.id]
        );
        console.log(`  OK: CRM addon ${addon.id} (${addon.addon_type}, user ${addon.user_id}) deactivated`);
        totalSuccess++;
      } catch (error) {
        console.error(`  ERROR deactivating CRM addon ${addon.id}:`, error.message);
        totalErrors++;
      }
    }

    // ========================================================================
    // Summary
    // ========================================================================
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Cancellation Processor Summary`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Subscriptions:   ${subscriptions.length}`);
    console.log(`Site addons:     ${siteAddons.length}`);
    console.log(`User addons:     ${userAddons.length}`);
    console.log(`CRM addons:      ${crmAddons.length}`);
    console.log(`Successful:      ${totalSuccess}`);
    console.log(`Errors:          ${totalErrors}`);
    console.log(`${'='.repeat(60)}\n`);
    
  } catch (error) {
    console.error('Fatal error in subscription cancellation processor:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the cron job
processSubscriptionCancellations()
  .then(() => {
    console.log(`[${new Date().toISOString()}] Subscription cancellation processor completed successfully`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`[${new Date().toISOString()}] Subscription cancellation processor failed:`, error);
    process.exit(1);
  });

