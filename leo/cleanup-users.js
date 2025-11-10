const { ChromaClient } = require('chromadb');

async function cleanupUsers() {
  console.log('🧹 Cleaning up old user documents from vacuum ingestion...\n');
  
  const client = new ChromaClient({
    host: "localhost",
    port: 8000,
    ssl: false
  });

  const collection = await client.getCollection({ name: 'site_content' });
  
  // Get all user documents
  const results = await collection.get({ 
    where: { source_table: 'users' },
    limit: 500
  });
  
  console.log(`Found ${results.ids.length} user documents in site_content collection`);
  
  if (results.ids.length > 0) {
    console.log('Deleting these incomplete user documents...');
    
    await collection.delete({
      ids: results.ids
    });
    
    console.log(`✅ Deleted ${results.ids.length} old user documents`);
    console.log('\nThese will be replaced with proper user documents in user_profiles collection');
    console.log('with full profile joins and Layer 2 calculations.');
  } else {
    console.log('No user documents to clean up.');
  }
}

cleanupUsers().catch(console.error);

