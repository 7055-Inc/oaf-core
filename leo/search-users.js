#!/usr/bin/env node

/**
 * Test script to search user profiles
 * Usage: node search-users.js "artists in texas"
 */

const VectorDatabase = require('./src/core/vectorDatabase');

async function searchUsers(query) {
  console.log(`\n🔍 Searching for: "${query}"\n`);
  
  const vectorDB = new VectorDatabase();
  await vectorDB.initialize();
  
  // Semantic search in user_profiles collection
  const results = await vectorDB.semanticSearch(
    query, 
    'user_profiles',
    { 
      limit: 10,
      // Optional: Add filters if you want
      // filter: { user_type: 'artist' }
    }
  );
  
  console.log(`Found ${results.length} results:\n`);
  console.log('=' .repeat(80));
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.metadata.display_name || result.metadata.username}`);
    console.log(`   Type: ${result.metadata.user_type}`);
    console.log(`   Location: ${result.metadata.city || 'N/A'}, ${result.metadata.state || 'N/A'}`);
    console.log(`   Similarity: ${(result.similarity * 100).toFixed(1)}%`);
    
    // Show user-specific details
    if (result.metadata.user_type === 'artist' && result.metadata.artist_categories) {
      console.log(`   Categories: ${result.metadata.artist_categories}`);
    }
    if (result.metadata.user_type === 'community' && result.metadata.favorite_colors) {
      console.log(`   Favorite Colors: ${result.metadata.favorite_colors}`);
    }
    if (result.metadata.user_type === 'promoter' && result.metadata.promoter_business_name) {
      console.log(`   Business: ${result.metadata.promoter_business_name}`);
    }
    
    console.log(`   Active: ${result.metadata.is_active_user ? 'Yes' : 'No'}`);
  });
  
  console.log('\n' + '='.repeat(80) + '\n');
}

// Get query from command line or use default
const query = process.argv[2] || 'artists who make paintings';

searchUsers(query)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Search failed:', error);
    process.exit(1);
  });

