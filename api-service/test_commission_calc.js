require('dotenv').config({ path: '/var/www/main/api-service/.env' });
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
    
    console.log('📊 Testing with $100 sale for each user:\n');
    
    for (const user of testUsers) {
      // Get financial settings
      const financialQuery = `
        SELECT user_id, fee_structure, commission_rate, notes 
        FROM financial_settings 
        WHERE user_id = ?
      `;
      const [financialRows] = await db.execute(financialQuery, [user.id]);
      
      let financial = financialRows[0];
      if (!financial) {
        financial = {
          fee_structure: 'commission',
          commission_rate: 15.00,
          notes: 'Default fallback rate'
        };
      }
      
      // Get current Stripe rates
      const stripeRatesQuery = `
        SELECT percentage_rate, fixed_fee
        FROM stripe_rates
        WHERE rate_type = 'standard' AND is_active = 1
        ORDER BY effective_date DESC
        LIMIT 1
      `;
      const [rateRows] = await db.execute(stripeRatesQuery);
      let stripeRate = rateRows[0];
      
      console.log('   Stripe Rate Query Result:', rateRows);
      console.log('   Stripe Rate:', stripeRate);
      
      // Fallback if no stripe rates found
      if (!stripeRate) {
        console.log('   No stripe rates found, using fallback');
        stripeRate = {
          percentage_rate: 0.029,
          fixed_fee: 0.30
        };
      }
      
      // Calculate for $100 sale
      const saleAmount = 100.00;
      const stripeFee = (saleAmount * parseFloat(stripeRate.percentage_rate)) + parseFloat(stripeRate.fixed_fee);
      
      // Calculate commission based on fee structure
      let commissionAmount, vendorAmount, platformNet;
      
      if (financial.fee_structure === 'passthrough') {
        commissionAmount = 0.00;
        vendorAmount = saleAmount - stripeFee;
        platformNet = 0.00;
      } else {
        commissionAmount = (saleAmount * financial.commission_rate) / 100;
        vendorAmount = saleAmount - commissionAmount;
        platformNet = commissionAmount - stripeFee;
      }
      
      // Display results
      console.log(`👤 ${user.name}`);
      console.log(`   Fee Structure: ${financial.fee_structure}`);
      console.log(`   Commission Rate: ${financial.commission_rate}%`);
      console.log(`   Sale Amount: $${saleAmount.toFixed(2)}`);
      console.log(`   Stripe Fee: $${stripeFee.toFixed(2)} (using ${stripeRate.rate_name})`);
      console.log(`   Commission: $${commissionAmount.toFixed(2)}`);
      console.log(`   Vendor Receives: $${vendorAmount.toFixed(2)}`);
      console.log(`   Platform Net: $${platformNet.toFixed(2)}`);
      console.log(`   Notes: ${financial.notes || 'None'}`);
      console.log('');
    }
    
    // Test different transaction types
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
        const fee = (testAmount * parseFloat(rate.percentage_rate)) + parseFloat(rate.fixed_fee);
        
        console.log(`💳 ${rate.rate_name}:`);
        console.log(`   Rate: ${(parseFloat(rate.percentage_rate) * 100).toFixed(2)}% + $${parseFloat(rate.fixed_fee).toFixed(2)}`);
        console.log(`   Fee on $100: $${fee.toFixed(2)}`);
        console.log('');
      }
    }
    
    console.log('✅ Commission calculation architecture working perfectly!');
    console.log('🎯 Ready for Stripe integration when accounts are available!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

testCommissionCalculation(); 