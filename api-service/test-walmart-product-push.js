#!/usr/bin/env node
/**
 * Test pushing a product to Walmart Sandbox
 */

require('dotenv').config();

const walmartService = require('./src/services/walmartService');
const db = require('./config/db');

async function test() {
  console.log('=== Walmart Product Push Test ===\n');
  console.log(`Environment: ${process.env.WALMART_ENV || 'sandbox'}\n`);
  
  // 1. Get a sample product
  console.log('1. Fetching sample product...');
  const [products] = await db.query(`
    SELECT 
      p.id,
      p.name,
      p.sku,
      p.description,
      p.short_description,
      p.price,
      p.wholesale_price,
      p.width,
      p.height,
      p.depth,
      p.weight
    FROM products p
    WHERE p.status = 'active' 
      AND p.price > 0
    LIMIT 1
  `);
  
  if (!products.length) {
    console.log('❌ No active products found');
    return false;
  }
  
  const product = products[0];
  console.log(`   Found: ${product.name} (SKU: ${product.sku})`);
  console.log(`   Price: $${product.price}\n`);
  
  // 2. Calculate Walmart price
  const basePrice = product.wholesale_price || product.price;
  const walmartPrice = product.wholesale_price 
    ? basePrice * 2  // Double wholesale
    : basePrice * 1.2; // Add 20% to retail
  
  console.log(`2. Walmart pricing:`);
  console.log(`   Base: $${basePrice} (${product.wholesale_price ? 'wholesale' : 'retail'})`);
  console.log(`   Walmart price: $${walmartPrice.toFixed(2)}\n`);
  
  // 3. Format for Walmart's Item Feed
  // Note: Walmart requires specific category-based attributes
  // For sandbox testing, we'll use a simplified item structure
  const walmartItem = {
    sku: `TEST-${product.sku}`, // Prefix for sandbox testing
    productName: product.name,
    shortDescription: product.short_description || product.description?.substring(0, 200),
    mainImageUrl: 'https://via.placeholder.com/1000x1000', // Placeholder for test
    price: walmartPrice.toFixed(2),
    productIdentifiers: {
      productIdType: 'GTIN',
      productId: '00000000000000' // Placeholder - real products need UPC/GTIN
    },
    shippingWeight: product.weight || 1,
    brand: 'Brakebee Marketplace'
  };
  
  console.log('3. Formatted item for Walmart:');
  console.log(JSON.stringify(walmartItem, null, 2));
  console.log('');
  
  // 4. Test the API call
  console.log('4. Testing Walmart API...');
  
  try {
    // First verify we can authenticate
    const token = await walmartService.getAccessToken();
    console.log('   ✅ Authentication successful');
    
    // Try to get current items (to verify API works)
    console.log('   Checking current catalog...');
    try {
      const items = await walmartService.getItems({ limit: 5 });
      console.log(`   ✅ API responding - found ${items.totalItems || 0} items in catalog`);
    } catch (catalogError) {
      // This might fail if no items exist yet, which is fine
      console.log(`   ⚠️  Catalog check: ${catalogError.message}`);
    }
    
    // For actual product push, Walmart uses XML feeds
    // The sandbox allows testing the feed submission endpoint
    console.log('\n5. Submitting test feed...');
    console.log('   Note: Walmart requires XML feeds with category-specific attributes');
    console.log('   For full integration, we need to map products to Walmart\'s taxonomy');
    
    // We won't actually push yet - need proper XML formatting
    console.log('\n📋 NEXT STEPS:');
    console.log('   1. Products need UPC/GTIN codes for Walmart');
    console.log('   2. Need to map to Walmart category taxonomy');
    console.log('   3. Need category-specific required attributes');
    console.log('   4. Images must be hosted on accessible URLs');
    
    return true;
    
  } catch (error) {
    console.log(`   ❌ API Error: ${error.message}`);
    return false;
  }
}

test()
  .then(success => {
    console.log('\n' + (success ? '✅ Test completed' : '❌ Test failed'));
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('❌ ERROR:', err.message);
    process.exit(1);
  })
  .finally(() => {
    db.end();
  });

