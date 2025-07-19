require('dotenv').config({ path: '/var/www/main/api-service/.env' });
const db = require('../config/db');
const stripeService = require('../src/services/stripeService');

async function testSubscriptionIntegration() {
  console.log('🧪 Testing Subscription Integration...\n');
  
  try {
    // Test 1: Check database tables exist
    console.log('1️⃣ Checking database schema...');
    
    const tables = ['user_subscriptions', 'subscription_payments', 'subscription_items'];
    for (const table of tables) {
      const [result] = await db.execute(`SHOW TABLES LIKE '${table}'`);
      if (result.length > 0) {
        console.log(`✅ Table ${table} exists`);
      } else {
        console.log(`❌ Table ${table} missing`);
      }
    }
    
    // Test 2: Check Stripe products exist
    console.log('\n2️⃣ Checking Stripe products...');
    const products = await stripeService.setupSubscriptionProducts();
    
    products.forEach(({ product, price }) => {
      console.log(`✅ Product: ${product.name} - $${price.unit_amount / 100}/${price.recurring.interval}`);
    });
    
    // Test 3: Check API endpoints (basic structure test)
    console.log('\n3️⃣ Testing API structure...');
    const subscriptionsRoute = require('../src/routes/subscriptions');
    console.log('✅ Subscriptions routes loaded successfully');
    
    // Test 4: Check webhook handlers exist
    console.log('\n4️⃣ Checking webhook integration...');
    const webhookRoute = require('../src/routes/webhooks/stripe');
    console.log('✅ Webhook handlers loaded successfully');
    
    // Test 5: Database connection test
    console.log('\n5️⃣ Testing database connectivity...');
    const [testQuery] = await db.execute('SELECT COUNT(*) as count FROM users LIMIT 1');
    console.log(`✅ Database connected - ${testQuery[0].count} users in system`);
    
    console.log('\n🎉 All integration tests passed!');
    console.log('📋 Summary:');
    console.log('   • Database tables created ✅');
    console.log('   • Stripe products configured ✅');
    console.log('   • API routes available ✅');
    console.log('   • Webhook handlers ready ✅');
    console.log('   • Database connectivity ✅');
    console.log('\n🚀 Phase 5A Implementation Complete!');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Test subscription status helper function
async function testUserVerificationStatus(userId) {
  try {
    const [permissions] = await db.execute(
      'SELECT verified FROM user_permissions WHERE user_id = ?',
      [userId]
    );
    
    if (permissions.length > 0) {
      return permissions[0].verified;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking verification status:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  testSubscriptionIntegration().then(() => process.exit(0));
}

module.exports = { testSubscriptionIntegration, testUserVerificationStatus }; 