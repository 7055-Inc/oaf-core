require('dotenv').config();
const stripeService = require('./src/services/stripeService');

async function testTaxIntegration() {
  try {
    console.log('🧪 Testing Stripe Tax API Integration...\n');

    // Test 1: Basic payment intent creation
    console.log('1. Testing basic payment intent creation...');
    const basicPaymentIntent = await stripeService.createPaymentIntent({
      total_amount: 100.00,
      currency: 'usd',
      customer_id: null,
      metadata: { test: true, basic: true }
    });
    
    console.log('✅ Basic Payment Intent created:', basicPaymentIntent.id);
    console.log('   Amount:', basicPaymentIntent.amount / 100);
    console.log('');

    // Test 2: Tax calculation using Tax API
    console.log('2. Testing tax calculation with Tax API...');
    const taxCalculation = await stripeService.calculateTax({
      line_items: [
        {
          amount: 10000, // $100.00 in cents
          reference: 'L1'
        }
      ],
      customer_address: {
        line1: '123 Test Street',
        line2: 'Apt 4B',
        city: 'New York',
        state: 'NY',
        postal_code: '10001',
        country: 'US'
      },
      currency: 'usd'
    });
    
    console.log('✅ Tax calculation successful:', taxCalculation.id);
    console.log('   Subtotal: $100.00');
    console.log('   Tax amount: $' + (taxCalculation.tax_amount_exclusive / 100).toFixed(2));
    console.log('   Total with tax: $' + (taxCalculation.amount_total / 100).toFixed(2));
    console.log('   Tax breakdown:', taxCalculation.tax_breakdown);
    console.log('');

    // Test 3: Create customer with address
    console.log('3. Testing customer creation with address...');
    const customer = await stripeService.createOrGetCustomer(999999, 'test@example.com', 'Test Customer');
    console.log('✅ Customer created:', customer.id);
    
    // Test 4: Update customer address
    console.log('4. Testing customer address update...');
    await stripeService.updateCustomerAddress(customer.id, {
      line1: '123 Test Street',
      line2: 'Apt 4B',
      city: 'New York',
      state: 'NY',
      postal_code: '10001',
      country: 'US'
    });
    console.log('✅ Customer address updated');
    console.log('');

    // Test 5: Payment intent with calculated tax
    console.log('5. Testing payment intent with calculated tax...');
    const totalWithTax = 100.00 + (taxCalculation.tax_amount_exclusive / 100);
    const paymentIntentWithTax = await stripeService.createPaymentIntent({
      total_amount: totalWithTax,
      currency: 'usd',
      customer_id: customer.id,
      metadata: { 
        test: true, 
        with_tax: true,
        tax_calculation_id: taxCalculation.id
      }
    });
    
    console.log('✅ Payment Intent with tax created:', paymentIntentWithTax.id);
    console.log('   Customer ID:', paymentIntentWithTax.customer);
    console.log('   Amount with tax:', paymentIntentWithTax.amount / 100);
    console.log('');

    console.log('🎉 Stripe Tax API integration tests passed!');
    console.log('\n✅ Tax calculation working correctly');
    console.log('✅ Payment intents created successfully');
    console.log('✅ Customer address management working');
    console.log('\nNext steps:');
    console.log('1. Test with real checkout flow');
    console.log('2. Implement tax transaction recording after payment');
    console.log('3. Add tax data storage in database');

  } catch (error) {
    console.error('❌ Tax integration test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testTaxIntegration(); 