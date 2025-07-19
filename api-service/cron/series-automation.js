#!/usr/bin/env node

/**
 * Series Automation Cron Job
 * Runs event series automation including:
 * - Auto-generating recurring events
 * - Processing email automation sequences
 * - Managing series lifecycle
 * 
 * Schedule: Run daily at 2 AM
 * Usage: node api-service/cron/series-automation.js
 */

const SeriesAutomationService = require('../src/services/seriesAutomationService');

async function main() {
  console.log(`🚀 Starting Series Automation - ${new Date().toISOString()}`);
  
  try {
    const automationService = new SeriesAutomationService();
    await automationService.runAutomation();
    
    console.log(`✅ Series Automation Completed Successfully - ${new Date().toISOString()}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Series Automation Failed:', error);
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('📨 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('📨 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the automation
main(); 