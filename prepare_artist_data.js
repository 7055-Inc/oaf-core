/**
 * Helper Script: Prepare Artist Profile Data
 * Purpose: Deserialize PHP data and create a clean lookup table
 * This runs BEFORE the main migration script
 */

const mysql = require('mysql2/promise');
const phpUnserialize = require('php-unserialize');

const DB_CONFIG = {
  host: '10.128.0.31',
  user: 'oafuser',
  password: 'oafpass',
  database: 'wordpress_import'
};

async function prepareArtistData() {
  let conn;
  
  try {
    console.log('Preparing artist profile data...');
    
    conn = await mysql.createConnection(DB_CONFIG);
    
    // Create clean lookup table
    await conn.execute(`DROP TABLE IF EXISTS artist_profiles_clean`);
    await conn.execute(`
      CREATE TABLE artist_profiles_clean (
        wp_user_id INT PRIMARY KEY,
        business_name VARCHAR(255),
        street_1 VARCHAR(255),
        street_2 VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(50),
        zip VARCHAR(20),
        phone VARCHAR(50),
        website VARCHAR(255),
        facebook VARCHAR(255),
        instagram VARCHAR(255),
        twitter VARCHAR(255),
        pinterest VARCHAR(255),
        biography TEXT
      )
    `);
    
    // Get all dokan profile data
    const [profiles] = await conn.execute(`
      SELECT user_id, meta_value 
      FROM wp_usermeta 
      WHERE meta_key = 'dokan_profile_settings'
    `);
    
    console.log(`Found ${profiles.length} dokan profiles to process`);
    
    let successCount = 0;
    
    for (const profile of profiles) {
      try {
        const data = phpUnserialize.unserialize(profile.meta_value);
        const address = data.address || {};
        const social = data.social || {};
        
        await conn.execute(`
          INSERT INTO artist_profiles_clean VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          profile.user_id,
          data.store_name || '',
          address.street_1 || '',
          address.street_2 || '',
          address.city || '',
          address.state || '',
          address.zip || '',
          data.phone || '',
          social.gplus || '',
          social.fb || '',
          social.instagram || '',
          social.twitter || '',
          social.pinterest || '',
          data.vendor_biography || ''
        ]);
        
        successCount++;
      } catch (err) {
        console.log(`Warning: Could not process user_id ${profile.user_id}: ${err.message}`);
      }
    }
    
    console.log(`✓ Prepared ${successCount} artist profiles in clean lookup table`);
    
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

prepareArtistData()
  .then(() => {
    console.log('Artist data preparation complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('Preparation failed:', err);
    process.exit(1);
  });

