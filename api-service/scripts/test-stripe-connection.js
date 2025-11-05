/**
 * Test Stripe Connection and Card Setup
 * Verifies Stripe API key and tests creating setup intents
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testStripeConnection() {
  console.log('\n=== Testing Stripe Configuration ===\n');

  try {
    // Test 1: Check if Stripe key is configured
    console.log('1. Checking Stripe API Key...');
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
      return;
    }
    
    const keyPrefix = process.env.STRIPE_SECRET_KEY.substring(0, 7);
    console.log(`✅ Stripe key found: ${keyPrefix}...`);
    console.log(`   Mode: ${keyPrefix.includes('test') ? 'TEST' : 'LIVE'}`);

    // Test 2: Verify API key by making a simple API call
    console.log('\n2. Verifying API key validity...');
    const balance = await stripe.balance.retrieve();
    console.log('✅ API key is valid');
    console.log(`   Available balance: $${(balance.available[0]?.amount || 0) / 100}`);
    console.log(`   Pending balance: $${(balance.pending[0]?.amount || 0) / 100}`);

    // Test 3: Create a test customer
    console.log('\n3. Creating test customer...');
    const customer = await stripe.customers.create({
      email: 'test@example.com',
      description: 'Test customer for connection verification',
      metadata: {
        test: 'true',
        created_by: 'test-stripe-connection.js'
      }
    });
    console.log(`✅ Customer created: ${customer.id}`);

    // Test 4: Create a setup intent
    console.log('\n4. Creating setup intent for card setup...');
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        test: 'true',
        created_by: 'test-stripe-connection.js'
      }
    });
    console.log(`✅ Setup intent created: ${setupIntent.id}`);
    console.log(`   Status: ${setupIntent.status}`);
    console.log(`   Client secret: ${setupIntent.client_secret.substring(0, 20)}...`);

    // Test 5: Retrieve the setup intent
    console.log('\n5. Retrieving setup intent...');
    const retrieved = await stripe.setupIntents.retrieve(setupIntent.id);
    console.log(`✅ Setup intent retrieved successfully`);
    console.log(`   Status: ${retrieved.status}`);

    // Test 6: List payment methods for customer
    console.log('\n6. Listing payment methods for customer...');
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card',
    });
    console.log(`✅ Payment methods retrieved: ${paymentMethods.data.length} cards`);

    // Cleanup: Delete test customer
    console.log('\n7. Cleaning up test data...');
    await stripe.customers.del(customer.id);
    console.log('✅ Test customer deleted');

    console.log('\n=== ✅ All Stripe Tests Passed ===\n');
    console.log('Your Stripe configuration is working correctly!');
    console.log('Card setup functionality is operational.\n');

  } catch (error) {
    console.error('\n❌ Stripe Test Failed:');
    console.error(`Error: ${error.message}`);
    
    if (error.type === 'StripeAuthenticationError') {
      console.error('\nPossible causes:');
      console.error('- Invalid API key');
      console.error('- API key may be expired or revoked');
      console.error('- Check your Stripe dashboard for key status');
    } else if (error.type === 'StripePermissionError') {
      console.error('\nPossible causes:');
      console.error('- API key doesn\'t have required permissions');
      console.error('- Restricted key may need additional scopes');
    } else if (error.type === 'StripeConnectionError') {
      console.error('\nPossible causes:');
      console.error('- Network connectivity issues');
      console.error('- Firewall blocking Stripe API');
    }
    
    console.error('\nFull error details:', error);
  }
}

// Run the test
testStripeConnection().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

