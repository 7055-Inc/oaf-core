#!/usr/bin/env node
/**
 * Migration: Update email templates to use Brakebee branding
 * 
 * This script:
 * 1. Updates the promoter_event_notification subject line from "Online Art Festival LLC" to "Brakebee"
 * 2. Removes the navigation menu from the default email layout header
 * 
 * Run with: node api-service/migrations/update-email-templates-brakebee.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../config/db');

async function migrate() {
  console.log('Starting email template migration...\n');
  
  try {
    // =========================================================================
    // STEP 1: Update subject line for promoter_event_notification
    // =========================================================================
    console.log('1. Checking promoter_event_notification template...');
    
    const [templates] = await db.execute(
      `SELECT id, template_key, subject_template FROM email_templates WHERE template_key = 'promoter_event_notification'`
    );
    
    if (templates.length > 0) {
      const template = templates[0];
      console.log(`   Found template ID ${template.id}`);
      console.log(`   Current subject: "${template.subject_template}"`);
      
      // Update subject line - replace "Online Art Festival LLC" with "Brakebee"
      // Also handle any other variations
      let newSubject = template.subject_template
        .replace(/Online Art Festival LLC/gi, 'Brakebee')
        .replace(/Online Art Festival/gi, 'Brakebee')
        .replace(/Beemeeart/gi, 'Brakebee');
      
      if (newSubject !== template.subject_template) {
        await db.execute(
          `UPDATE email_templates SET subject_template = ? WHERE id = ?`,
          [newSubject, template.id]
        );
        console.log(`   ✓ Updated subject to: "${newSubject}"`);
      } else {
        console.log('   Subject already correct, no changes needed.');
      }
    } else {
      console.log('   Template not found. Skipping...');
    }
    
    // =========================================================================
    // STEP 2: Check and update ALL templates with old branding in subject
    // =========================================================================
    console.log('\n2. Checking all email templates for old branding...');
    
    const [allTemplates] = await db.execute(
      `SELECT id, template_key, subject_template FROM email_templates 
       WHERE subject_template LIKE '%Online Art Festival%' 
          OR subject_template LIKE '%Beemeeart%'`
    );
    
    for (const template of allTemplates) {
      let newSubject = template.subject_template
        .replace(/Online Art Festival LLC/gi, 'Brakebee')
        .replace(/Online Art Festival/gi, 'Brakebee')
        .replace(/Beemeeart/gi, 'Brakebee');
      
      if (newSubject !== template.subject_template) {
        await db.execute(
          `UPDATE email_templates SET subject_template = ? WHERE id = ?`,
          [newSubject, template.id]
        );
        console.log(`   ✓ Updated "${template.template_key}" subject`);
      }
    }
    
    if (allTemplates.length === 0) {
      console.log('   No templates with old branding found.');
    }
    
    // =========================================================================
    // STEP 3: Update email layout to remove menu from header
    // =========================================================================
    console.log('\n3. Checking default email layout...');
    
    const [layouts] = await db.execute(
      `SELECT id, layout_key, layout_template FROM email_layouts WHERE layout_key = 'default'`
    );
    
    if (layouts.length > 0) {
      const layout = layouts[0];
      console.log(`   Found default layout ID ${layout.id}`);
      
      let layoutHtml = layout.layout_template;
      
      // Show current layout size
      console.log(`   Current layout size: ${layoutHtml.length} characters`);
      
      // Look for common menu patterns and remove them
      // Pattern 1: Table row with menu links
      const menuPatterns = [
        // Menu in header table
        /<tr[^>]*>[\s\S]*?(?:Browse Events|My Account|Apply|Dashboard)[\s\S]*?<\/tr>/gi,
        // Navigation div
        /<div[^>]*(?:nav|menu|header-links)[^>]*>[\s\S]*?<\/div>/gi,
        // Header nav element
        /<nav[^>]*>[\s\S]*?<\/nav>/gi,
      ];
      
      let updated = false;
      for (const pattern of menuPatterns) {
        if (pattern.test(layoutHtml)) {
          layoutHtml = layoutHtml.replace(pattern, '');
          updated = true;
        }
      }
      
      // Also update any "Online Art Festival" or "Beemeeart" text in layout
      const brandingUpdated = layoutHtml.includes('Online Art Festival') || 
                              layoutHtml.includes('Beemeeart');
      layoutHtml = layoutHtml
        .replace(/Online Art Festival LLC/gi, 'Brakebee')
        .replace(/Online Art Festival/gi, 'Brakebee')
        .replace(/Beemeeart/gi, 'Brakebee');
      
      if (updated || brandingUpdated) {
        await db.execute(
          `UPDATE email_layouts SET layout_template = ? WHERE id = ?`,
          [layoutHtml, layout.id]
        );
        console.log('   ✓ Updated layout template');
        if (updated) console.log('     - Removed menu elements');
        if (brandingUpdated) console.log('     - Updated branding to Brakebee');
      } else {
        console.log('   No menu patterns found to remove.');
        console.log('   You may need to manually edit the layout in the database.');
        console.log('\n   To view current layout, run:');
        console.log('   SELECT layout_template FROM email_layouts WHERE layout_key = "default";');
      }
    } else {
      console.log('   Default layout not found.');
    }
    
    // =========================================================================
    // STEP 4: Update company data if present
    // =========================================================================
    console.log('\n4. Checking company data...');
    
    const [companyData] = await db.execute(
      `SELECT id, company_name FROM schema_company_data WHERE is_active = 1`
    );
    
    if (companyData.length > 0) {
      const company = companyData[0];
      if (company.company_name !== 'Brakebee') {
        await db.execute(
          `UPDATE schema_company_data SET company_name = 'Brakebee' WHERE id = ?`,
          [company.id]
        );
        console.log(`   ✓ Updated company name from "${company.company_name}" to "Brakebee"`);
      } else {
        console.log('   Company name already set to Brakebee.');
      }
    }
    
    console.log('\n✅ Migration completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    process.exit(0);
  }
}

migrate();

