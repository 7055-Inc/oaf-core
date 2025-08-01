require('dotenv').config();
const stripeService = require('./src/services/stripeService');
const db = require('./config/db');

async function testPhase2Services() {
  console.log('🧪 Testing Phase 2: Enhanced Tax Tracking & Reporting Services\n');

  try {
    // Test 1: Backfill existing orders with order tax summaries
    console.log('1️⃣ Testing backfill of order tax summaries...');
    const backfillResult = await stripeService.backfillOrderTaxSummaries();
    console.log('Backfill result:', backfillResult);
    console.log('✅ Backfill test completed\n');

    // Test 2: Get a vendor ID for testing
    console.log('2️⃣ Getting test vendor ID...');
    const [vendorRows] = await db.execute(`
      SELECT DISTINCT p.vendor_id, u.username
      FROM products p
      JOIN users u ON p.vendor_id = u.id
      WHERE p.vendor_id IS NOT NULL
      LIMIT 1
    `);
    
    if (vendorRows.length === 0) {
      console.log('❌ No vendors found for testing');
      return;
    }
    
    const testVendor = vendorRows[0];
    console.log(`Using vendor: ${testVendor.username} (ID: ${testVendor.vendor_id})\n`);

    // Test 3: Generate vendor tax summary for current month
    console.log('3️⃣ Testing vendor tax summary generation...');
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const vendorSummary = await stripeService.generateVendorTaxSummary(testVendor.vendor_id, currentMonth);
    console.log('Vendor tax summary:', vendorSummary);
    console.log('✅ Vendor tax summary test completed\n');

    // Test 4: Get vendor tax summary
    console.log('4️⃣ Testing get vendor tax summary...');
    const retrievedSummary = await stripeService.getVendorTaxSummary(testVendor.vendor_id, currentMonth);
    console.log('Retrieved vendor tax summary:', retrievedSummary);
    console.log('✅ Get vendor tax summary test completed\n');

    // Test 5: Get state-by-state breakdown
    console.log('5️⃣ Testing state-by-state tax breakdown...');
    const stateBreakdown = await stripeService.getVendorStateTaxBreakdown(testVendor.vendor_id, currentMonth);
    console.log('State breakdown:', stateBreakdown);
    console.log('✅ State breakdown test completed\n');

    // Test 6: Test with a different period (last month)
    console.log('6️⃣ Testing with different period (last month)...');
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().slice(0, 7);
    
    const lastMonthSummary = await stripeService.generateVendorTaxSummary(testVendor.vendor_id, lastMonthStr);
    console.log('Last month vendor summary:', lastMonthSummary);
    console.log('✅ Different period test completed\n');

    console.log('🎉 All Phase 2 service tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await db.end();
  }
}

// Run the test
testPhase2Services(); 