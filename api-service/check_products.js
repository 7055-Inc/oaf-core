require('dotenv').config({ path: '/var/www/main/api-service/.env' });
const db = require('./config/db');

async function checkProducts() {
  try {
    console.log('🔍 Checking products in database...\n');
    
    const [rows] = await db.execute('SELECT id, name, price, vendor_id FROM products LIMIT 10');
    
    console.log(`Found ${rows.length} products:`);
    rows.forEach(p => {
      console.log(`- ID: ${p.id}, Name: ${p.name}, Price: $${p.price}, Vendor: ${p.vendor_id}`);
    });
    
    if (rows.length > 0) {
      console.log('\n✅ Products found! We can use these IDs for testing.');
      console.log('First two products for testing:');
      console.log(`- Product 1: ID ${rows[0].id}`);
      if (rows[1]) {
        console.log(`- Product 2: ID ${rows[1].id}`);
      }
    } else {
      console.log('\n❌ No products found in database.');
    }
    
  } catch (error) {
    console.error('❌ Error checking products:', error.message);
  }
  
  process.exit(0);
}

checkProducts(); 