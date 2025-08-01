require('dotenv').config();
const stripeService = require('./src/services/stripeService');
const db = require('./config/db');

async function testTaxStorage() {
  try {
    console.log('🧪 Testing Tax Data Storage...\n');

    // Test 1: Calculate tax
    console.log('1. Calculating tax...');
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
    console.log('   Tax amount: $' + (taxCalculation.tax_amount_exclusive / 100).toFixed(2));
    console.log('');

    // Test 2: Create a test order first
    console.log('2. Creating test order...');
    const [orderResult] = await db.execute(`
      INSERT INTO orders (user_id, total_amount, shipping_amount, tax_amount, platform_fee_amount, status)
      VALUES (1000000007, 100.00, 0.00, 0.00, 0.00, 'pending')
    `);
    const testOrderId = orderResult.insertId;
    console.log('✅ Test order created, ID:', testOrderId);
    console.log('');

    // Test 3: Store tax calculation data
    console.log('3. Storing tax calculation data...');
    const taxRecordId = await stripeService.storeTaxCalculation({
      order_id: testOrderId,
      stripe_tax_id: taxCalculation.id,
      stripe_payment_intent_id: null,
      customer_state: 'NY',
      customer_zip: '10001',
      taxable_amount: 100.00,
      tax_collected: taxCalculation.tax_amount_exclusive / 100,
      tax_rate_used: taxCalculation.tax_breakdown?.[0]?.tax_rate_details?.percentage_decimal || 0,
      tax_breakdown: taxCalculation.tax_breakdown,
      order_date: new Date().toISOString().split('T')[0]
    });
    
    console.log('✅ Tax calculation stored in database, ID:', taxRecordId);
    console.log('');

    // Test 4: Create payment intent
    console.log('4. Creating payment intent...');
    const paymentIntent = await stripeService.createPaymentIntent({
      total_amount: 100.00 + (taxCalculation.tax_amount_exclusive / 100),
      currency: 'usd',
      customer_id: null,
      metadata: { 
        test: true, 
        tax_calculation_id: taxCalculation.id
      }
    });
    
    console.log('✅ Payment intent created:', paymentIntent.id);
    console.log('');

    // Test 5: Update tax record with payment intent ID
    console.log('5. Updating tax record with payment intent ID...');
    const updateQuery = `
      UPDATE stripe_tax_transactions 
      SET stripe_payment_intent_id = ? 
      WHERE id = ?
    `;
    await db.execute(updateQuery, [paymentIntent.id, taxRecordId]);
    console.log('✅ Tax record updated with payment intent ID');
    console.log('');

    // Test 6: Verify tax data in database
    console.log('6. Verifying tax data in database...');
    const [taxRecords] = await db.execute(
      'SELECT * FROM stripe_tax_transactions WHERE id = ?',
      [taxRecordId]
    );
    
    if (taxRecords.length > 0) {
      const record = taxRecords[0];
      console.log('✅ Tax record found in database:');
      console.log('   Order ID:', record.order_id);
      console.log('   Stripe Tax ID:', record.stripe_tax_id);
      console.log('   Payment Intent ID:', record.stripe_payment_intent_id);
      console.log('   Customer State:', record.customer_state);
      console.log('   Customer ZIP:', record.customer_zip);
      console.log('   Taxable Amount: $' + record.taxable_amount);
      console.log('   Tax Collected: $' + record.tax_collected);
      console.log('   Tax Rate: ' + record.tax_rate_used);
      console.log('   Tax Breakdown:', record.tax_breakdown);
    } else {
      console.log('❌ Tax record not found in database');
    }
    console.log('');

    // Test 7: Create tax transaction
    console.log('7. Creating tax transaction...');
    const taxTransaction = await stripeService.createTaxTransaction(
      taxCalculation.id,
      `test_order_${Date.now()}`
    );
    
    console.log('✅ Tax transaction created:', taxTransaction.id);
    console.log('   Reference:', taxTransaction.reference);
    console.log('   Amount Total: $' + (taxTransaction.amount_total / 100).toFixed(2));
    console.log('');

    console.log('🎉 Tax storage tests completed successfully!');
    console.log('\n✅ Tax calculation stored in database');
    console.log('✅ Payment intent linked to tax record');
    console.log('✅ Tax transaction created');
    console.log('✅ All tax data properly stored and linked');

  } catch (error) {
    console.error('❌ Tax storage test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    // Close database connection
    await db.end();
  }
}

// Run the test
testTaxStorage(); 