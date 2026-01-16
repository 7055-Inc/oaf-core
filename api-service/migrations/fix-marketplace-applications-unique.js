require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../config/db');

async function fixMarketplaceApplicationsUnique() {
  console.log('Fixing marketplace_applications table...\n');

  try {
    // Check if unique constraint already exists
    const [constraints] = await db.execute(
      `SELECT COUNT(*) as count FROM information_schema.TABLE_CONSTRAINTS 
       WHERE CONSTRAINT_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'marketplace_applications' 
       AND CONSTRAINT_TYPE = 'UNIQUE'`
    );

    if (constraints[0].count > 0) {
      console.log('Unique constraint already exists on marketplace_applications table');
    } else {
      // Check for duplicate user_ids before adding constraint
      const [duplicates] = await db.execute(
        `SELECT user_id, COUNT(*) as count 
         FROM marketplace_applications 
         GROUP BY user_id 
         HAVING count > 1`
      );

      if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} users with duplicate applications:`);
        for (const dup of duplicates) {
          console.log(`  - User ID ${dup.user_id}: ${dup.count} applications`);
        }
        
        // Keep only the most recent application per user
        console.log('\nKeeping only the most recent application per user...');
        
        await db.execute(
          `DELETE ma1 FROM marketplace_applications ma1
           INNER JOIN marketplace_applications ma2
           WHERE ma1.user_id = ma2.user_id 
           AND ma1.id < ma2.id`
        );
        
        console.log('Duplicate applications cleaned up');
      }

      // Now add the unique constraint
      console.log('\nAdding unique constraint on user_id...');
      await db.execute(
        `ALTER TABLE marketplace_applications 
         ADD UNIQUE KEY unique_user_application (user_id)`
      );
      console.log('Unique constraint added successfully!');
    }

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await db.end();
    process.exit(0);
  }
}

fixMarketplaceApplicationsUnique();
