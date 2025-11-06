/**
 * Helper Script: Prepare Artist Profile Data v2
 * Purpose: Extract key string values manually from PHP serialized data
 * This bypasses the object deserialization issues
 */

const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: '10.128.0.31',
  user: 'oafuser',
  password: 'oafpass',
  database: 'wordpress_import'
};

// Extract a PHP string value from serialized data
function extractString(data, key) {
  const pattern = `s:${key.length}:"${key}";s:`;
  const idx = data.indexOf(pattern);
  if (idx === -1) return '';
  
  const start = idx + pattern.length;
  const lengthEnd = data.indexOf(':"', start);
  if (lengthEnd === -1) return '';
  
  const length = parseInt(data.substring(start, lengthEnd));
  if (isNaN(length)) return '';
  
  const valueStart = lengthEnd + 2;
  const value = data.substring(valueStart, valueStart + length);
  
  // Decode HTML entities
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

async function prepareArtistData() {
  let conn;
  
  try {
    console.log('Preparing artist profile data (v2 - manual extraction)...');
    
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
        const data = profile.meta_value;
        
        // Extract values manually
        const businessName = extractString(data, 'store_name');
        const street1 = extractString(data, 'street_1');
        const street2 = extractString(data, 'street_2');
        const city = extractString(data, 'city');
        const state = extractString(data, 'state');
        const zip = extractString(data, 'zip');
        const phone = extractString(data, 'phone');
        const website = extractString(data, 'gplus'); // WordPress used gplus field for website
        const facebook = extractString(data, 'fb');
        const instagram = extractString(data, 'instagram');
        const twitter = extractString(data, 'twitter');
        const pinterest = extractString(data, 'pinterest');
        const biography = extractString(data, 'vendor_biography');
        
        await conn.execute(`
          INSERT INTO artist_profiles_clean VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          profile.user_id,
          businessName,
          street1,
          street2,
          city,
          state,
          zip,
          phone,
          website,
          facebook,
          instagram,
          twitter,
          pinterest,
          biography
        ]);
        
        successCount++;
      } catch (err) {
        console.log(`Warning: Could not process user_id ${profile.user_id}: ${err.message}`);
      }
    }
    
    console.log(`✓ Prepared ${successCount} artist profiles in clean lookup table`);
    
    // Show sample
    const [sample] = await conn.execute(`SELECT * FROM artist_profiles_clean LIMIT 3`);
    console.log('\nSample data:');
    sample.forEach(row => {
      console.log(`  ${row.business_name} - ${row.city}, ${row.state}`);
    });
    
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

prepareArtistData()
  .then(() => {
    console.log('\nArtist data preparation complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('Preparation failed:', err);
    process.exit(1);
  });

