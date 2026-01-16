#!/usr/bin/env node
/**
 * Migration: Update email templates to use "The Brakebee Team" branding
 * 
 * This replaces "Online Art Festival Team" with "The Brakebee Team" in all email templates
 * 
 * Run with: node api-service/migrations/update-email-branding-brakebee.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../config/db');

async function migrate() {
  console.log('Updating email templates with Brakebee branding...\n');
  
  try {
    // Get all email templates
    const [templates] = await db.execute(
      `SELECT id, template_key, subject_template, body_template FROM email_templates`
    );
    
    let updatedCount = 0;
    
    for (const template of templates) {
      let newSubject = template.subject_template || '';
      let newBody = template.body_template || '';
      let changed = false;
      
      // Replace team name variations
      const replacements = [
        ['Online Art Festival Team', 'Brakebee Team'],
        ['The Online Art Festival Team', 'The Brakebee Team'],
        ['OAF Team', 'Brakebee Team'],
        ['The OAF Team', 'The Brakebee Team'],
        ['Beemeeart Team', 'Brakebee Team'],
        ['The Beemeeart Team', 'The Brakebee Team'],
      ];
      
      for (const [oldText, newText] of replacements) {
        if (newSubject.includes(oldText)) {
          newSubject = newSubject.split(oldText).join(newText);
          changed = true;
        }
        if (newBody.includes(oldText)) {
          newBody = newBody.split(oldText).join(newText);
          changed = true;
        }
      }
      
      if (changed) {
        await db.execute(
          `UPDATE email_templates SET subject_template = ?, body_template = ? WHERE id = ?`,
          [newSubject, newBody, template.id]
        );
        console.log(`✓ Updated template: ${template.template_key}`);
        updatedCount++;
      }
    }
    
    if (updatedCount === 0) {
      console.log('No templates with old branding found.');
    } else {
      console.log(`\n✅ Updated ${updatedCount} template(s).`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.end();
    process.exit(0);
  }
}

migrate();

