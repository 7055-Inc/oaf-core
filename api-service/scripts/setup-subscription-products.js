require('dotenv').config({ path: '/var/www/main/api-service/.env' });
const stripeService = require('../src/services/stripeService');

async function setupSubscriptionProducts() {
  console.log('🔧 Setting up Stripe subscription products...\n');
  
  try {
    const products = await stripeService.setupSubscriptionProducts();
    
    console.log('✅ Subscription products set up successfully:');
    console.log('');
    
    products.forEach(({ product, price }) => {
      console.log(`📦 Product: ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Description: ${product.description}`);
      console.log(`   Price: $${(price.unit_amount / 100).toFixed(2)}/${price.recurring.interval}`);
      console.log(`   Price ID: ${price.id}`);
      console.log('');
    });
    
    console.log('🎯 Products ready for subscription management!');
    console.log('Base Verification: $50/year');
    console.log('Additional Persona: $10/year');
    
  } catch (error) {
    console.error('❌ Error setting up subscription products:', error.message);
    console.error('Full error:', error);
  }
}

// Run if called directly
if (require.main === module) {
  setupSubscriptionProducts().then(() => process.exit(0));
}

module.exports = setupSubscriptionProducts; 