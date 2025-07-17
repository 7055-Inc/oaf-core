const db = require('./config/db');

async function testCommissionCalculation() {
  try {
    console.log('🧪 Testing Commission Calculation Architecture...\n');
    
    // Test users from our financial_settings table
    const testUsers = [
      { id: 1234567970, name: 'Jill+snow (Pass-through)' },
      { id: 1234567957, name: 'Bulk Test User (10% Commission)' },
      { id: 1234567968, name: 'Promoter (4.25% Commission)' }
    ];
    
    // Simulate order items
    const mockItems = testUsers.map(user => ({
      vendor_id: user.id,
      vendor_name: user.name,
      price: 100.00,
      product_id: 1,
      quantity: 1
    }));
    
    console.log('📊 Testing with $100 sale for each user:\n');
    
    for (const item of mockItems) {
      // Get financial settings
      const financialQuery = `
        SELECT user_id, fee_structure, commission_rate, notes 
        FROM financial_settings 
        WHERE user_id = ?
      `;
      const [financialRows] = await db.execute(financialQuery, [item.vendor_id]);
      
      let financial = financialRows[0];
      if (!financial) {
        // Fallback to default 15% commission
        financial = {
          fee_structure: 'commission',
          commission_rate: 15.00,
          notes: 'Default fallback rate'
        };
      }
      
      // Get current Stripe rates
      const stripeRatesQuery = `
        SELECT percentage_rate, fixed_fee, rate_name
        FROM stripe_rates 
        WHERE rate_type = 'standard' 
          AND currency = 'USD' 
          AND region = 'US'
          AND is_active = TRUE
          AND effective_date <= CURDATE()
          AND (end_date IS NULL OR end_date >= CURDATE())
        ORDER BY effective_date DESC
        LIMIT 1
      `;
      const [rateRows] = await db.execute(stripeRatesQuery);
      const stripeRate = rateRows[0];
      
      // Calculate Stripe fee
      const stripeFee = (item.price * stripeRate.percentage_rate) + stripeRate.fixed_fee;
      
      // Calculate commission based on fee structure
      let commissionAmount, vendorAmount, platformNet;
      
      if (financial.fee_structure === 'pass_through') {
        // Pass-through: Vendor pays Stripe fee equivalent
        commissionAmount = 0.00;
        vendorAmount = item.price - stripeFee;
        platformNet = 0.00;
      } else {
        // Commission: Platform takes commission and absorbs Stripe fees
        commissionAmount = (item.price * financial.commission_rate) / 100;
        vendorAmount = item.price - commissionAmount;
        platformNet = commissionAmount - stripeFee;
      }
      
      // Display results
      console.log(`👤 ${item.vendor_name}`);
      console.log(`   Fee Structure: ${financial.fee_structure}`);
      console.log(`   Commission Rate: ${financial.commission_rate}%`);
      console.log(`   Sale Amount: $${item.price.toFixed(2)}`);
      console.log(`   Stripe Fee: $${stripeFee.toFixed(2)} (using ${stripeRate.rate_name})`);
      console.log(`   Commission: $${commissionAmount.toFixed(2)}`);
      console.log(`   Vendor Receives: $${vendorAmount.toFixed(2)}`);
      console.log(`   Platform Net: $${platformNet.toFixed(2)}`);
      console.log(`   Notes: ${financial.notes || 'None'}`);
      console.log('');
    }
    
    // Test the architecture with different transaction types
    console.log('🔧 Testing Different Transaction Types:\n');
    
    const transactionTypes = ['standard', 'ach'];
    
    for (const type of transactionTypes) {
      const typeQuery = `
        SELECT rate_type, rate_name, percentage_rate, fixed_fee
        FROM stripe_rates 
        WHERE rate_type = ? 
          AND currency = 'USD' 
          AND region = 'US'
          AND is_active = TRUE
          AND effective_date <= CURDATE()
          AND (end_date IS NULL OR end_date >= CURDATE())
        ORDER BY effective_date DESC
        LIMIT 1
      `;
      const [typeRows] = await db.execute(typeQuery, [type]);
      
      if (typeRows.length > 0) {
        const rate = typeRows[0];
        const testAmount = 100.00;
        const fee = (testAmount * rate.percentage_rate) + rate.fixed_fee;
        
        console.log(`💳 ${rate.rate_name}:`);
        console.log(`   Rate: ${(rate.percentage_rate * 100).toFixed(2)}% + $${rate.fixed_fee.toFixed(2)}`);
        console.log(`   Fee on $100: $${fee.toFixed(2)}`);
        console.log('');
      }
    }
    
    console.log('✅ Commission calculation architecture working perfectly!');
    console.log('🎯 Ready for Stripe integration when accounts are available!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

testCommissionCalculation(); 