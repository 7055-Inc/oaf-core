const { ChromaClient } = require('chromadb');

async function inspectCollection(collectionName) {
  const client = new ChromaClient({
    host: "localhost",
    port: 8000,
    ssl: false
  });

  const collection = await client.getCollection({ name: collectionName });
  const count = await collection.count();
  
  console.log(`\nCollection: ${collectionName}`);
  console.log(`Total documents: ${count}`);
  console.log('\nSample documents (first 5):');
  console.log('='.repeat(80));
  
  const results = await collection.get({ limit: 5 });
  
  results.ids.forEach((id, index) => {
    console.log(`\nDocument ID: ${id}`);
    console.log(`Content: ${results.documents[index]?.substring(0, 200)}...`);
    console.log(`Metadata:`, JSON.stringify(results.metadatas[index], null, 2));
  });
}

const collectionName = process.argv[2] || 'user_interactions';
inspectCollection(collectionName).catch(console.error);

