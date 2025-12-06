#!/usr/bin/env node
/**
 * Quick test script to verify Walmart API credentials
 * Run: node test-walmart-connection.js
 */

require('dotenv').config();

const walmartService = require('./src/services/walmartService');

async function test() {
  console.log('Testing Walmart API connection...');
  console.log(`Environment: ${process.env.WALMART_ENV || 'sandbox'}`);
  console.log('');
  
  const result = await walmartService.testConnection();
  
  if (result.success) {
    console.log('✅ SUCCESS:', result.message);
  } else {
    console.log('❌ FAILED:', result.message);
  }
  
  return result.success;
}

test()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('❌ ERROR:', err.message);
    process.exit(1);
  });

