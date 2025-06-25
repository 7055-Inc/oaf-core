#!/usr/bin/env node

/**
 * Simple test script for the search system
 * Run with: node test-search.js
 */

const axios = require('axios');

const API_BASE = 'https://api2.onlineartfestival.com';

async function testSearchSystem() {
  console.log('🔍 Testing Search System...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing health check endpoint...');
    const healthResponse = await axios.get(`${API_BASE}/search/test`);
    console.log('✅ Health check passed:', healthResponse.data);
    console.log('');

    // Test 2: Basic Search
    console.log('2. Testing basic search...');
    const searchResponse = await axios.get(`${API_BASE}/search?q=art&limit=5`);
    console.log('✅ Search response:', {
      query: searchResponse.data.query,
      totalResults: searchResponse.data.metadata.totalResults,
      responseTime: searchResponse.data.metadata.responseTime + 'ms',
      hasResults: Object.values(searchResponse.data.results).some(arr => arr.length > 0)
    });
    console.log('');

    // Test 3: Autocomplete
    console.log('3. Testing autocomplete...');
    const autocompleteResponse = await axios.get(`${API_BASE}/search/autocomplete?q=art&limit=5`);
    console.log('✅ Autocomplete response:', {
      suggestions: autocompleteResponse.data.length,
      types: [...new Set(autocompleteResponse.data.map(s => s.type))]
    });
    console.log('');

    // Test 4: Filters
    console.log('4. Testing filters...');
    const filtersResponse = await axios.get(`${API_BASE}/search/filters?category=products`);
    console.log('✅ Filters response:', {
      hasProductFilters: !!filtersResponse.data.products,
      hasCategories: filtersResponse.data.products?.categories?.length > 0
    });
    console.log('');

    // Test 5: Popular Searches
    console.log('5. Testing popular searches...');
    const popularResponse = await axios.get(`${API_BASE}/search/popular?limit=5`);
    console.log('✅ Popular searches response:', {
      count: popularResponse.data.length,
      hasData: popularResponse.data.length > 0
    });
    console.log('');

    console.log('🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check if the API server is running');
    console.log('2. Verify the API_BASE URL is correct');
    console.log('3. Check server logs for database connection issues');
    console.log('4. Ensure all required database tables exist');
  }
}

// Run the test
testSearchSystem(); 