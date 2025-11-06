/**
 * Helper Script: Prepare Order Items Data
 * Purpose: Create clean order items mapping table to bypass collation issues
 * This runs BEFORE the main migration script
 */

const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: '10.128.0.31',
  user: 'oafuser',
  password: 'oafpass'
};

async function prepareOrderItems() {
  let wpConn, oafConn;
  
  try {
    console.log('Preparing order items data...');
    
    wpConn = await mysql.createConnection({ ...DB_CONFIG, database: 'wordpress_import' });
    oafConn = await mysql.createConnection({ ...DB_CONFIG, database: 'oaf' });
    
    // Create clean lookup table
    await wpConn.execute(`DROP TABLE IF EXISTS order_items_clean`);
    await wpConn.execute(`
      CREATE TABLE order_items_clean (
        wp_order_item_id INT PRIMARY KEY,
        wp_order_id INT,
        oaf_order_id BIGINT,
        wp_product_id INT,
        oaf_product_id BIGINT,
        product_name VARCHAR(255),
        quantity INT,
        line_total DECIMAL(10,2),
        commission_rate DECIMAL(5,2),
        INDEX idx_oaf_order (oaf_order_id),
        INDEX idx_oaf_product (oaf_product_id)
      )
    `);
    
    // Get all order items with metadata
    const [orderItems] = await wpConn.execute(`
      SELECT 
        oi.order_item_id,
        oi.order_id,
        oi.order_item_name,
        MAX(CASE WHEN oim.meta_key = '_product_id' THEN oim.meta_value END) as product_id,
        MAX(CASE WHEN oim.meta_key = '_qty' THEN oim.meta_value END) as qty,
        MAX(CASE WHEN oim.meta_key = '_line_total' THEN oim.meta_value END) as line_total,
        MAX(CASE WHEN oim.meta_key = '_dokan_commission_rate' THEN oim.meta_value END) as commission_rate
      FROM wp_woocommerce_order_items oi
      LEFT JOIN wp_woocommerce_order_itemmeta oim ON oi.order_item_id = oim.order_item_id
      WHERE oi.order_item_type = 'line_item'
      GROUP BY oi.order_item_id, oi.order_id, oi.order_item_name
    `);
    
    console.log(`Found ${orderItems.length} order items to process`);
    
    let successCount = 0;
    let skippedCount = 0;
    
    for (const item of orderItems) {
      try {
        // Find OAF order ID
        const [oafOrder] = await oafConn.execute(
          `SELECT id FROM orders WHERE external_order_id = ?`,
          [`WP-${item.order_id}`]
        );
        
        if (oafOrder.length === 0) {
          skippedCount++;
          continue;
        }
        
        // Find OAF product ID
        const [oafProduct] = await oafConn.execute(
          `SELECT id FROM products WHERE sku LIKE ?`,
          [`%-${item.product_id}`]
        );
        
        if (oafProduct.length === 0) {
          skippedCount++;
          continue;
        }
        
        // Insert into clean table
        await wpConn.execute(`
          INSERT INTO order_items_clean 
          (wp_order_item_id, wp_order_id, oaf_order_id, wp_product_id, oaf_product_id, product_name, quantity, line_total, commission_rate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          item.order_item_id,
          item.order_id,
          oafOrder[0].id,
          item.product_id,
          oafProduct[0].id,
          item.order_item_name,
          parseInt(item.qty) || 1,
          parseFloat(item.line_total) || 0,
          parseFloat(item.commission_rate) || 15.00
        ]);
        
        successCount++;
      } catch (err) {
        console.log(`Warning: Could not process order_item_id ${item.order_item_id}: ${err.message}`);
      }
    }
    
    console.log(`✓ Prepared ${successCount} order items in clean lookup table`);
    console.log(`  Skipped ${skippedCount} items (order or product not found)`);
    
    // Show sample
    const [sample] = await wpConn.execute(`SELECT * FROM order_items_clean LIMIT 5`);
    console.log('\nSample data:');
    sample.forEach(row => {
      console.log(`  Order ${row.oaf_order_id}, Product ${row.oaf_product_id}: ${row.product_name} (${row.quantity}x $${row.line_total})`);
    });
    
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  } finally {
    if (wpConn) await wpConn.end();
    if (oafConn) await oafConn.end();
  }
}

prepareOrderItems()
  .then(() => {
    console.log('\nOrder items data preparation complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('Preparation failed:', err);
    process.exit(1);
  });

