#!/usr/bin/env node

/**
 * Event Booth Fee Reminder Cron Job
 * Runs every 6 hours to process automated reminders and auto-decline overdue applications
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const EventEmailService = require('../src/services/eventEmailService');

async function main() {
  console.log(`[${new Date().toISOString()}] Event reminder cron job started`);
  
  try {
    const emailService = new EventEmailService();
    
    // Process automated reminders
    console.log('Processing automated reminders...');
    const reminderResults = await emailService.processAutomatedReminders();
    
    console.log('Reminder results:', {
      total_processed: reminderResults.total_processed,
      due_soon: reminderResults.results.due_soon.length,
      overdue: reminderResults.results.overdue.length,
      final_notice: reminderResults.results.final_notice.length
    });
    
    // Process auto-decline for applications overdue beyond grace period
    console.log('Processing auto-decline...');
    const autoDeclineResults = await emailService.processAutoDecline();
    
    console.log('Auto-decline results:', {
      total_processed: autoDeclineResults.total_processed,
      declined: autoDeclineResults.declined,
      failed: autoDeclineResults.failed
    });
    
    console.log(`[${new Date().toISOString()}] Event reminder cron job completed successfully`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Event reminder cron job failed:`, error);
    process.exit(1);
  }
}

// Run the job
main().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error in event reminder cron job:', error);
  process.exit(1);
}); 