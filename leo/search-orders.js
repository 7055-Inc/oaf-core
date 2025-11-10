#!/usr/bin/env node

/**
 * Quick test to search orders
 */

const VectorDatabase = require('./src/core/vectorDatabase');

async function searchOrders() {
  const vectorDB = new VectorDatabase();
  await vectorDB.initialize();

  // Test queries
  const queries = [
    'weekend purchases',
    'multiple items in one order',
    'sculpture purchases'
  ];

  for (const query of queries) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Query: "${query}"`);
    console.log('='.repeat(60));

    const results = await vectorDB.semanticSearch(query, 'user_interactions', { limit: 3 });

    results.forEach((result, idx) => {
      console.log(`\n${idx + 1}. ${result.content}`);
      console.log(`   Relevance: ${result.similarity?.toFixed(3) || 'N/A'}`);
      console.log(`   Order ID: ${result.metadata.order_id}`);
      console.log(`   User: ${result.metadata.username} (${result.metadata.user_type})`);
      console.log(`   Status: ${result.metadata.status}`);
      console.log(`   Total: $${result.metadata.total_amount}`);
      console.log(`   Items: ${result.metadata.item_count} (${result.metadata.category_names})`);
      console.log(`   When: ${result.metadata.day_of_week} at ${result.metadata.hour_of_day}:00`);
      console.log(`   ${result.metadata.is_weekend ? '🎉 Weekend' : '📅 Weekday'} | ${result.metadata.is_business_hours ? '🏢 Business Hours' : '🌙 After Hours'}`);
    });
  }
}

searchOrders()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

