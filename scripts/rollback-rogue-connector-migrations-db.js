require('dotenv').config({ path: 'api-service/.env' });
const mysql = require('mysql2/promise');

const statements = [
  "DELETE sa FROM site_addons sa INNER JOIN website_addons wa ON wa.id = sa.addon_id WHERE wa.addon_slug IN ('amazon-connector','faire-connector','ebay-connector','meta-connector')",
  "DELETE FROM website_addons WHERE addon_slug IN ('amazon-connector','faire-connector','ebay-connector','meta-connector')",

  'DROP TABLE IF EXISTS marketplace_activity_log',
  'DROP TABLE IF EXISTS marketplace_product_mappings',
  'DROP TABLE IF EXISTS amazon_inventory_allocations',
  'DROP TABLE IF EXISTS amazon_corporate_products',
  'DROP TABLE IF EXISTS faire_inventory_allocations',
  'DROP TABLE IF EXISTS faire_corporate_products',
  'DROP TABLE IF EXISTS ebay_inventory_allocations',
  'DROP TABLE IF EXISTS ebay_corporate_products',
  'DROP TABLE IF EXISTS meta_inventory_allocations',
  'DROP TABLE IF EXISTS meta_corporate_products',

  // Column drops for existing tables are handled dynamically below
];

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  try {
    for (const sql of statements) {
      // Print each statement so the rollback execution is auditable.
      console.log(`RUN: ${sql}`);
      await connection.query(sql);
    }

    // Drop rogue-added columns only if they currently exist.
    const dropMap = {
      walmart_corporate_products: [
        'walmart_origin_country',
        'walmart_prop65_warning',
        'walmart_compliance_notes',
        'walmart_custom_fields'
      ],
      wayfair_corporate_products: [
        'wayfair_room_type',
        'wayfair_collection',
        'wayfair_in_house_brand',
        'wayfair_custom_fields'
      ],
      tiktok_product_data: [
        'tiktok_size_chart_id',
        'tiktok_seller_warranty',
        'tiktok_custom_fields',
        'inventory_synced_at',
        'api_inventory_pushed_at'
      ],
      tiktok_corporate_products: [
        'corporate_size_chart_id',
        'corporate_custom_fields'
      ],
      etsy_product_data: [
        'etsy_personalization_enabled',
        'etsy_occasion',
        'etsy_custom_fields'
      ],
      tiktok_orders: [
        'tracking_synced_at',
        'api_tracking_pushed_at'
      ],
      tiktok_user_shops: [
        'last_order_sync',
        'last_return_sync'
      ]
    };

    for (const [table, columns] of Object.entries(dropMap)) {
      for (const column of columns) {
        const [rows] = await connection.query(
          `SELECT COUNT(*) AS count
           FROM information_schema.columns
           WHERE table_schema = DATABASE()
             AND table_name = ?
             AND column_name = ?`,
          [table, column]
        );

        if (rows[0].count > 0) {
          const sql = `ALTER TABLE ${table} DROP COLUMN ${column}`;
          console.log(`RUN: ${sql}`);
          await connection.query(sql);
        } else {
          console.log(`SKIP: ${table}.${column} not present`);
        }
      }
    }

    console.log('Rollback complete.');
  } finally {
    await connection.end();
  }
}

run().catch((err) => {
  console.error('Rollback failed:', err.message);
  process.exit(1);
});
