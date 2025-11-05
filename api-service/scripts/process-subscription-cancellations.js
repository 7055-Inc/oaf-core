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
  'verification': 'verified' // Special handling for marketplace
};

async function processSubscriptionCancellations() {
  let connection;
  
  try {
    console.log(`[${new Date().toISOString()}] Starting subscription cancellation processor...`);
    
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    
    // Find subscriptions that should be canceled
    console.log('Finding subscriptions to cancel...');
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
        AND us.status = 'active'
        AND us.current_period_end < NOW()
    `);
    
    console.log(`Found ${subscriptions.length} subscriptions to cancel`);
    
    if (subscriptions.length === 0) {
      console.log('No subscriptions to process. Exiting.');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each subscription
    for (const subscription of subscriptions) {
      try {
        console.log(`\nProcessing subscription ${subscription.id} (user ${subscription.user_id}, type: ${subscription.subscription_type})`);
        
        // Start transaction
        await connection.beginTransaction();
        
        // 1. Update subscription status to canceled
        await connection.execute(`
          UPDATE user_subscriptions 
          SET status = 'canceled'
          WHERE id = ?
        `, [subscription.id]);
        
        console.log(`  ✓ Set subscription status to 'canceled'`);
        
        // 2. Revoke permissions based on subscription type
        const permissionColumn = SUBSCRIPTION_PERMISSION_MAP[subscription.subscription_type];
        
        if (subscription.subscription_type === 'verification') {
          // Special handling for verification - check tier
          // If tier is "Marketplace Seller", remove both verified and marketplace
          // If tier is "Verified Artist", remove only verified
          
          if (subscription.tier === 'Marketplace Seller') {
            await connection.execute(`
              UPDATE user_permissions 
              SET verified = 0, marketplace = 0
              WHERE user_id = ?
            `, [subscription.user_id]);
            console.log(`  ✓ Revoked 'verified' and 'marketplace' permissions`);
          } else {
            await connection.execute(`
              UPDATE user_permissions 
              SET verified = 0
              WHERE user_id = ?
            `, [subscription.user_id]);
            console.log(`  ✓ Revoked 'verified' permission`);
          }
        } else if (permissionColumn) {
          // Standard permission revocation
          await connection.execute(`
            UPDATE user_permissions 
            SET ${permissionColumn} = 0
            WHERE user_id = ?
          `, [subscription.user_id]);
          console.log(`  ✓ Revoked '${permissionColumn}' permission`);
        } else {
          console.log(`  ⚠ Warning: No permission mapping for subscription type '${subscription.subscription_type}'`);
        }
        
        // Commit transaction
        await connection.commit();
        
        console.log(`  ✅ Successfully canceled subscription ${subscription.id}`);
        successCount++;
        
      } catch (error) {
        // Rollback transaction on error
        await connection.rollback();
        console.error(`  ❌ Error processing subscription ${subscription.id}:`, error.message);
        errorCount++;
      }
    }
    
    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Subscription Cancellation Summary`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total found:     ${subscriptions.length}`);
    console.log(`Successful:      ${successCount}`);
    console.log(`Errors:          ${errorCount}`);
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

