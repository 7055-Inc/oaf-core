#!/usr/bin/env node
/**
 * Utility: View current email layout HTML
 * 
 * Run with: node api-service/migrations/view-email-layout.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../config/db');

async function viewLayout() {
  try {
    console.log('Fetching default email layout...\n');
    console.log('='.repeat(80));
    
    const [layouts] = await db.execute(
      `SELECT * FROM email_layouts WHERE layout_key = 'default'`
    );
    
    if (layouts.length > 0) {
      console.log('Layout columns:', Object.keys(layouts[0]).join(', '));
      console.log('\nLAYOUT TEMPLATE:\n');
      console.log(layouts[0].layout_template);
    } else {
      console.log('Default layout not found.');
    }
    
    console.log('\n' + '='.repeat(80));
    
    // Also show the promoter_event_notification template
    console.log('\nFetching promoter_event_notification template...\n');
    console.log('='.repeat(80));
    
    const [templates] = await db.execute(
      `SELECT * FROM email_templates WHERE template_key = 'promoter_event_notification'`
    );
    
    if (templates.length > 0) {
      console.log('Template columns:', Object.keys(templates[0]).join(', '));
      console.log('\nSUBJECT:', templates[0].subject_template);
      console.log('\nBODY:\n');
      console.log(templates[0].body_template);
    } else {
      console.log('Template not found.');
    }
    
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

viewLayout();

