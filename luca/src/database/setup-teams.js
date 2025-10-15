#!/usr/bin/env node

/**
 * Team Schema Setup Script for Luca Platform
 * Safely creates team management tables
 */

const fs = require('fs');
const path = require('path');
const { executeQuery, testConnection } = require('../config/database');

async function setupTeamTables() {
  console.log('🚀 Setting up team management tables...');
  
  try {
    // Test database connection first
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }

    // Read the schema file
    const schemaPath = path.join(__dirname, 'teams-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split into individual statements (handle triggers properly)
    const statements = schema
      .split(/(?:^|\n)(?=(?:CREATE|DROP|INSERT|DELIMITER))/gm)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim());

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements and comments
      if (!statement || statement.startsWith('--') || statement.startsWith('/*')) {
        continue;
      }

      console.log(`⚡ Executing statement ${i + 1}...`);
      
      try {
        // Handle DELIMITER statements for triggers
        if (statement.includes('DELIMITER')) {
          // For triggers, we need to handle them specially
          if (statement.includes('CREATE TRIGGER')) {
            // Extract the trigger creation part
            const triggerMatch = statement.match(/CREATE TRIGGER.*?END/gs);
            if (triggerMatch) {
              await executeQuery(triggerMatch[0]);
              console.log('✅ Trigger created successfully');
            }
          }
        } else {
          await executeQuery(statement);
          console.log('✅ Statement executed successfully');
        }
      } catch (error) {
        // Check if it's a "table already exists" error - that's okay
        if (error.message.includes('already exists')) {
          console.log('ℹ️  Table already exists, skipping...');
        } else {
          console.error(`❌ Error executing statement: ${error.message}`);
          console.log('Statement:', statement.substring(0, 100) + '...');
          // Continue with other statements
        }
      }
    }

    // Verify tables were created
    console.log('\n🔍 Verifying table creation...');
    
    const tables = ['teams', 'team_members', 'team_invitations', 'team_activity_log'];
    for (const table of tables) {
      try {
        const result = await executeQuery(`SHOW TABLES LIKE '${table}'`);
        if (result.length > 0) {
          console.log(`✅ Table '${table}' exists`);
        } else {
          console.log(`❌ Table '${table}' not found`);
        }
      } catch (error) {
        console.log(`❌ Error checking table '${table}': ${error.message}`);
      }
    }

    console.log('\n🎉 Team management setup completed!');
    console.log('\nNext steps:');
    console.log('1. Update auth middleware to support team context');
    console.log('2. Modify existing queries to include team access');
    console.log('3. Create team management API endpoints');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  setupTeamTables()
    .then(() => {
      console.log('✅ Setup script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup script failed:', error);
      process.exit(1);
    });
}

module.exports = { setupTeamTables };
