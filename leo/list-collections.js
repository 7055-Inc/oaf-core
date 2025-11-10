const { ChromaClient } = require('chromadb');

async function listCollections() {
  const client = new ChromaClient({
    host: "localhost",
    port: 8000,
    ssl: false
  });

  const collections = await client.listCollections();
  
  console.log('Current collections in ChromaDB:');
  console.log('================================');
  for (const collection of collections) {
    const count = await collection.count();
    console.log(`- ${collection.name} (${count} documents)`);
  }
}

listCollections().catch(console.error);

