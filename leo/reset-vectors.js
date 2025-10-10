#!/usr/bin/env node

/**
 * Leo AI - Vector Database Reset
 * Completely wipes all vector collections clean
 */

require('dotenv').config();
const VectorDatabase = require('./src/core/vectorDatabase');

async function resetVectorDatabase() {
  console.log('🎨 [LEO] Resetting vector database...');
  
  let vectorDB;
  
  try {
    // Initialize vector database
    console.log('1. Initializing vector database...');
    vectorDB = new VectorDatabase();
    await vectorDB.initialize();
    console.log('✅ Vector database connected');

    // WIPE ALL COLLECTIONS CLEAN
    console.log('2. 🧹 Wiping all vector collections clean...');
    
    const collections = ['art_metadata', 'user_interactions', 'site_content', 'event_data', 'learning_feedback'];
    
    for (const collectionName of collections) {
      try {
        // Delete the collection entirely
        await vectorDB.client.deleteCollection({ name: collectionName });
        console.log(`   🗑️  Deleted collection: ${collectionName}`);
        
        // Recreate it empty
        const newCollection = await vectorDB.client.getOrCreateCollection({
          name: collectionName,
          metadata: { description: `Empty ${collectionName} collection` }
        });
        vectorDB.collections.set(collectionName, newCollection);
        console.log(`   ✨ Recreated empty collection: ${collectionName}`);
      } catch (error) {
        console.log(`   ⚠️  Collection ${collectionName} might not exist: ${error.message}`);
      }
    }

    console.log('✅ All collections wiped clean!');
    console.log('\n🎉 Vector database successfully RESET - completely empty and ready for new data!');

  } catch (error) {
    console.error('❌ Reset failed:', error);
    throw error;
  }
}

// Run the reset
if (require.main === module) {
  resetVectorDatabase()
    .then(() => {
      console.log('\n✅ Reset complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Reset failed:', error);
      process.exit(1);
    });
}

module.exports = { resetVectorDatabase };