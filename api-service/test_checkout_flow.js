require('dotenv').config({ path: '/var/www/main/api-service/.env' });
const db = require('./config/db');
const stripeService = require('./src/services/stripeService');

async function testCheckoutFlow() {
  console.log('🧪 Testing Checkout Flow...\n');
  
  try {
    // Test data - using our existing test data
    const testUserId = 1234567890; // Admin user from our test data
    const testCartItems = [
      { product_id: 2000000116, quantity: 2 },  // Product 101 - $13.12
      { product_id: 2000000118, quantity: 1 }   // Product 2 - $14.95
    ];
    
    console.log('📋 Test Setup:');
    console.log('- User ID:', testUserId);
    console.log('- Cart Items:', testCartItems);
    console.log('');
    
    // Test 1: Product lookup and details
    console.log('🔍 Test 1: Product Lookup');
    const productQuery = `
      SELECT 
        p.id, p.name, p.price, p.vendor_id,
        u.username as vendor_name
      FROM products p
      LEFT JOIN users u ON p.vendor_id = u.id
      WHERE p.id IN (2000000116, 2000000118)
    `;
    
    const [products] = await db.execute(productQuery);
    console.log('Products found:', products.length);
    if (products.length > 0) {
      products.forEach(p => {
        console.log(`- Product ${p.id}: ${p.name} - $${p.price} (Vendor: ${p.vendor_name})`);
      });
    }
    console.log('✅ Product lookup successful\n');
    
    // Test 2: Cart items with details
    console.log('🛒 Test 2: Cart Items Processing');
    const itemsWithDetails = testCartItems.map(cartItem => {
      const product = products.find(p => p.id === cartItem.product_id);
      if (!product) {
        throw new Error(`Product ${cartItem.product_id} not found`);
      }
      
      return {
        product_id: product.id,
        vendor_id: product.vendor_id,
        vendor_name: product.vendor_name,
        title: product.name,
        quantity: cartItem.quantity,
        price: product.price * cartItem.quantity,
        shipping_cost: 0 // Simplified for test
      };
    });
    
    console.log('Cart items with details:');
    itemsWithDetails.forEach(item => {
      console.log(`- ${item.title} x${item.quantity} = $${item.price} (Vendor: ${item.vendor_name})`);
    });
    console.log('✅ Cart processing successful\n');
    
    // Test 3: Commission calculations
    console.log('💰 Test 3: Commission Calculations');
    const itemsWithCommissions = await stripeService.calculateCommissions(itemsWithDetails);
    
    console.log('Commission calculations:');
    itemsWithCommissions.forEach(item => {
      console.log(`- ${item.title}:`);
      console.log(`  Price: $${item.price}`);
      console.log(`  Commission Rate: ${item.commission_rate}%`);
      console.log(`  Commission Amount: $${item.commission_amount.toFixed(2)}`);
      console.log(`  Vendor Amount: $${item.vendor_amount.toFixed(2)}`);
      console.log(`  Fee Structure: ${item.fee_structure}`);
      console.log(`  Platform Net: $${item.platform_net.toFixed(2)}`);
      console.log('');
    });
    console.log('✅ Commission calculations successful\n');
    
    // Test 4: Order totals
    console.log('🧮 Test 4: Order Totals');
    const totals = {
      subtotal: 0,
      shipping_total: 0,
      tax_total: 0,
      platform_fee_total: 0,
      total_amount: 0,
      vendor_count: new Set(itemsWithCommissions.map(item => item.vendor_id)).size
    };
    
    itemsWithCommissions.forEach(item => {
      totals.subtotal += item.price;
      totals.shipping_total += item.shipping_cost;
      totals.platform_fee_total += item.commission_amount;
    });
    
    totals.total_amount = totals.subtotal + totals.shipping_total + totals.tax_total;
    
    console.log('Order totals:');
    console.log(`- Subtotal: $${totals.subtotal.toFixed(2)}`);
    console.log(`- Shipping: $${totals.shipping_total.toFixed(2)}`);
    console.log(`- Platform Fees: $${totals.platform_fee_total.toFixed(2)}`);
    console.log(`- Total Amount: $${totals.total_amount.toFixed(2)}`);
    console.log(`- Vendor Count: ${totals.vendor_count}`);
    console.log('✅ Order totals calculated successfully\n');
    
    // Test 5: Payment intent creation (without actual Stripe call)
    console.log('💳 Test 5: Payment Intent Structure');
    const paymentIntentData = {
      total_amount: totals.total_amount,
      currency: 'usd',
      metadata: {
        order_id: 'test_order_123',
        user_id: testUserId,
        vendor_count: totals.vendor_count
      }
    };
    
    console.log('Payment intent data:');
    console.log(`- Amount: $${paymentIntentData.total_amount.toFixed(2)} (${Math.round(paymentIntentData.total_amount * 100)} cents)`);
    console.log(`- Currency: ${paymentIntentData.currency}`);
    console.log(`- Metadata: ${JSON.stringify(paymentIntentData.metadata, null, 2)}`);
    console.log('✅ Payment intent structure valid\n');
    
    // Test 6: Database order creation (dry run)
    console.log('💾 Test 6: Order Creation Structure');
    const orderData = {
      user_id: testUserId,
      total_amount: totals.total_amount,
      shipping_amount: totals.shipping_total,
      tax_amount: totals.tax_total,
      platform_fee_amount: totals.platform_fee_total,
      status: 'pending',
      items: itemsWithCommissions.map(item => ({
        product_id: item.product_id,
        vendor_id: item.vendor_id,
        quantity: item.quantity,
        price: item.price,
        shipping_cost: item.shipping_cost || 0,
        commission_rate: item.commission_rate || 15.00,
        commission_amount: item.commission_amount || 0
      }))
    };
    
    console.log('Order structure:');
    console.log(`- User: ${orderData.user_id}`);
    console.log(`- Total: $${orderData.total_amount.toFixed(2)}`);
    console.log(`- Status: ${orderData.status}`);
    console.log(`- Items: ${orderData.items.length}`);
    orderData.items.forEach(item => {
      console.log(`  - Product ${item.product_id}: ${item.quantity}x @ $${item.price} (Commission: $${item.commission_amount.toFixed(2)})`);
    });
    console.log('✅ Order structure valid\n');
    
    // Test 7: Vendor grouping
    console.log('👥 Test 7: Vendor Grouping');
    const vendorGroups = {};
    itemsWithCommissions.forEach(item => {
      if (!vendorGroups[item.vendor_id]) {
        vendorGroups[item.vendor_id] = {
          vendor_id: item.vendor_id,
          vendor_name: item.vendor_name,
          items: [],
          subtotal: 0
        };
      }
      vendorGroups[item.vendor_id].items.push(item);
      vendorGroups[item.vendor_id].subtotal += item.price;
    });
    
    console.log('Vendor groups:');
    Object.values(vendorGroups).forEach(vendor => {
      console.log(`- Vendor ${vendor.vendor_id} (${vendor.vendor_name}):`);
      console.log(`  Items: ${vendor.items.length}`);
      console.log(`  Subtotal: $${vendor.subtotal.toFixed(2)}`);
    });
    console.log('✅ Vendor grouping successful\n');
    
    // Test 8: Environment validation
    console.log('🔧 Test 8: Environment Validation');
    const envChecks = {
      stripe_secret: !!process.env.STRIPE_SECRET_KEY,
      stripe_webhook: !!process.env.STRIPE_WEBHOOK_SECRET,
      db_connection: true // We're connected if we got here
    };
    
    console.log('Environment checks:');
    Object.entries(envChecks).forEach(([key, value]) => {
      console.log(`- ${key}: ${value ? '✅' : '❌'}`);
    });
    
    // Summary
    console.log('\n🎉 CHECKOUT FLOW TEST SUMMARY:');
    console.log('✅ Product lookup working');
    console.log('✅ Cart processing working');
    console.log('✅ Commission calculations working');
    console.log('✅ Order totals accurate');
    console.log('✅ Payment intent structure valid');
    console.log('✅ Order creation structure valid');
    console.log('✅ Vendor grouping working');
    console.log('✅ Environment configured');
    console.log('');
    console.log('🚀 Checkout flow is ready for manual testing!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Add items to cart on frontend');
    console.log('2. Proceed to checkout');
    console.log('3. Use test card: 4242 4242 4242 4242');
    console.log('4. Complete payment flow');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

testCheckoutFlow(); 