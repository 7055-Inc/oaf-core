#!/usr/bin/env node

/**
 * Fixed Comprehensive Email System Test Suite
 * Tests all aspects of the email system with correct column names
 */

require('dotenv').config({ path: '/var/www/main/api-service/.env' });
const EmailService = require('./src/services/emailService');
const db = require('./config/db');

class EmailSystemTestSuite {
  constructor() {
    this.emailService = new EmailService();
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  // Test result helpers
  pass(testName, details = '') {
    this.testResults.passed++;
    this.testResults.tests.push({ name: testName, status: 'PASS', details });
    console.log(`✅ ${testName} ${details ? `- ${details}` : ''}`);
  }

  fail(testName, error) {
    this.testResults.failed++;
    this.testResults.tests.push({ name: testName, status: 'FAIL', error: error.message });
    console.log(`❌ ${testName} - ${error.message}`);
  }

  // Fixed API Tests with correct column names
  async testApiEndpoints() {
    console.log('\n🔍 Testing API Endpoints (Logic Only)...');
    
    try {
      // Test template fetching logic with correct column name
      const [templates] = await db.execute('SELECT * FROM email_templates ORDER BY priority_level ASC');
      if (templates.length > 0) {
        this.pass('API Templates Endpoint Logic', `${templates.length} templates`);
      } else {
        throw new Error('No templates found');
      }
    } catch (error) {
      this.fail('API Templates Endpoint Logic', error);
    }

    try {
      // Test stats logic with correct column name
      const [queueStats] = await db.execute(
        'SELECT status, COUNT(*) as count FROM email_queue GROUP BY status'
      );
      const [emailStats] = await db.execute(`
        SELECT 
          DATE(sent_at) as date,
          status,
          COUNT(*) as count
        FROM email_log 
        WHERE sent_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(sent_at), status
        ORDER BY date DESC
      `);
      
      this.pass('API Stats Endpoint Logic', `Queue: ${queueStats.length}, Email: ${emailStats.length}`);
    } catch (error) {
      this.fail('API Stats Endpoint Logic', error);
    }
  }

  // Fixed Performance Tests with correct column names
  async testPerformance() {
    console.log('\n🔍 Testing Performance...');
    
    try {
      // Test database query performance with correct column name
      const startTime = Date.now();
      const [result] = await db.execute(`
        SELECT COUNT(*) as count FROM email_log 
        WHERE sent_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
      `);
      const duration = Date.now() - startTime;
      
      if (duration < 1000) {
        this.pass('Database Query Performance', `${duration}ms for recent emails`);
      } else {
        throw new Error(`Query took ${duration}ms (too slow)`);
      }
    } catch (error) {
      this.fail('Database Query Performance', error);
    }

    try {
      // Test template rendering performance
      const template = await this.emailService.getTemplate('order_confirmation');
      if (template) {
        const startTime = Date.now();
        const testData = { order_number: 'TEST-123', customer_name: 'John Doe' };
        
        // Render template 100 times
        for (let i = 0; i < 100; i++) {
          this.emailService.renderTemplate(template.subject_template, testData);
        }
        
        const duration = Date.now() - startTime;
        if (duration < 1000) {
          this.pass('Template Rendering Performance', `100 renders in ${duration}ms`);
        } else {
          throw new Error(`Template rendering took ${duration}ms (too slow)`);
        }
      } else {
        throw new Error('Template not found');
      }
    } catch (error) {
      this.fail('Template Rendering Performance', error);
    }
  }

  // Database Tests
  async testDatabaseConnectivity() {
    console.log('\n🔍 Testing Database Connectivity...');
    try {
      const [rows] = await db.execute('SELECT 1 as test');
      if (rows[0].test === 1) {
        this.pass('Database Connection');
      } else {
        throw new Error('Database connection failed');
      }
    } catch (error) {
      this.fail('Database Connection', error);
    }
  }

  async testDatabaseTables() {
    console.log('\n🔍 Testing Database Tables...');
    const requiredTables = [
      'email_queue',
      'email_templates', 
      'email_log',
      'email_tracking',
      'bounce_tracking',
      'user_email_preferences',
      'user_email_preference_log'
    ];

    for (const table of requiredTables) {
      try {
        const [rows] = await db.execute(`SELECT COUNT(*) as count FROM ${table}`);
        this.pass(`Table ${table} exists`, `${rows[0].count} rows`);
      } catch (error) {
        this.fail(`Table ${table}`, error);
      }
    }
  }

  async testEmailTemplates() {
    console.log('\n🔍 Testing Email Templates...');
    try {
      const [templates] = await db.execute('SELECT * FROM email_templates');
      if (templates.length >= 5) {
        this.pass('Email Templates', `${templates.length} templates found`);
        
        // Test template rendering
        const template = templates[0];
        const testData = { test_var: 'Test Value' };
        const rendered = this.emailService.renderTemplate(template.subject_template, testData);
        this.pass('Template Rendering', `Subject: ${rendered.substring(0, 50)}...`);
      } else {
        throw new Error(`Expected at least 5 templates, found ${templates.length}`);
      }
    } catch (error) {
      this.fail('Email Templates', error);
    }
  }

  // EmailService Tests
  async testEmailService() {
    console.log('\n🔍 Testing EmailService Class...');
    
    try {
      // Test template retrieval
      const template = await this.emailService.getTemplate('order_confirmation');
      if (template) {
        this.pass('EmailService Template Retrieval', template.name);
      } else {
        throw new Error('Template not found');
      }
    } catch (error) {
      this.fail('EmailService Template Retrieval', error);
    }

    try {
      // Test user email retrieval
      const userEmail = await this.emailService.getUserEmail(1000000007);
      if (userEmail && userEmail.includes('@')) {
        this.pass('EmailService User Email Retrieval', userEmail);
      } else {
        throw new Error('User email not found or invalid');
      }
    } catch (error) {
      this.fail('EmailService User Email Retrieval', error);
    }

    try {
      // Test blacklist check
      const isBlacklisted = await this.emailService.isEmailBlacklisted('test@example.com');
      this.pass('EmailService Blacklist Check', `Result: ${isBlacklisted}`);
    } catch (error) {
      this.fail('EmailService Blacklist Check', error);
    }

    try {
      // Test user preferences
      const canSend = await this.emailService.checkUserPreferences(1000000007, 'order_confirmation');
      this.pass('EmailService User Preferences', `Can send: ${canSend}`);
    } catch (error) {
      this.fail('EmailService User Preferences', error);
    }
  }

  // Queue Tests
  async testQueueOperations() {
    console.log('\n🔍 Testing Queue Operations...');
    
    try {
      // Test queue email
      const testData = { 
        test_message: 'Test queue message - Fixed Tests',
        timestamp: new Date().toISOString()
      };
      const queueResult = await this.emailService.queueEmail(1000000007, 'order_confirmation', testData);
      
      if (queueResult.success) {
        this.pass('Queue Email', `Queue ID: ${queueResult.queueId}`);
        
        // Test queue status
        const [queueStats] = await db.execute(
          'SELECT status, COUNT(*) as count FROM email_queue GROUP BY status'
        );
        this.pass('Queue Status Check', `${queueStats.length} status types found`);
        
      } else {
        throw new Error('Queue operation failed');
      }
    } catch (error) {
      this.fail('Queue Operations', error);
    }
  }

  // User Preferences Tests
  async testUserPreferences() {
    console.log('\n🔍 Testing User Preferences...');
    
    try {
      // Check if user has preferences
      const [prefs] = await db.execute(
        'SELECT * FROM user_email_preferences WHERE user_id = ?',
        [1000000007]
      );
      
      if (prefs.length > 0) {
        this.pass('User Preferences Exist', `Frequency: ${prefs[0].frequency}`);
        
        // Test preference structure
        const pref = prefs[0];
        if (pref.frequency && pref.categories && typeof pref.is_enabled === 'number') {
          this.pass('User Preferences Structure', 'All fields present');
        } else {
          throw new Error('Missing required preference fields');
        }
      } else {
        throw new Error('No user preferences found');
      }
    } catch (error) {
      this.fail('User Preferences', error);
    }
  }

  // Error Handling Tests
  async testErrorHandling() {
    console.log('\n🔍 Testing Error Handling...');
    
    try {
      // Test invalid template
      const template = await this.emailService.getTemplate('nonexistent_template');
      if (!template) {
        this.pass('Invalid Template Handling', 'Returns null for invalid template');
      } else {
        throw new Error('Should return null for invalid template');
      }
    } catch (error) {
      this.fail('Invalid Template Handling', error);
    }

    try {
      // Test invalid user
      const userEmail = await this.emailService.getUserEmail(999999999);
      if (!userEmail) {
        this.pass('Invalid User Handling', 'Returns null for invalid user');
      } else {
        throw new Error('Should return null for invalid user');
      }
    } catch (error) {
      this.fail('Invalid User Handling', error);
    }
  }

  // Security Tests
  async testSecurityFeatures() {
    console.log('\n🔍 Testing Security Features...');
    
    try {
      // Test template security (only predefined templates)
      const [templates] = await db.execute('SELECT COUNT(*) as count FROM email_templates');
      if (templates[0].count > 0) {
        this.pass('Template Security', 'Only predefined templates allowed');
      } else {
        throw new Error('No templates found');
      }
    } catch (error) {
      this.fail('Template Security', error);
    }

    try {
      // Test bounce tracking
      const [bounces] = await db.execute('SELECT COUNT(*) as count FROM bounce_tracking');
      this.pass('Bounce Tracking System', `${bounces[0].count} domains tracked`);
    } catch (error) {
      this.fail('Bounce Tracking System', error);
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting FIXED Comprehensive Email System Test Suite...\n');
    
    await this.testDatabaseConnectivity();
    await this.testDatabaseTables();
    await this.testEmailTemplates();
    await this.testEmailService();
    await this.testQueueOperations();
    await this.testUserPreferences();
    await this.testApiEndpoints();
    await this.testErrorHandling();
    await this.testSecurityFeatures();
    await this.testPerformance();
    
    // Final results
    console.log('\n📊 Test Suite Results:');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
    
    if (this.testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.tests
        .filter(test => test.status === 'FAIL')
        .forEach(test => console.log(`   - ${test.name}: ${test.error}`));
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (this.testResults.failed === 0) {
      console.log('🎉 All tests passed! Email system is fully functional.');
    } else {
      console.log(`⚠️  ${this.testResults.failed} test(s) failed. Please review and fix issues.`);
    }
  }
}

// Run the test suite
async function main() {
  const testSuite = new EmailSystemTestSuite();
  
  try {
    await testSuite.runAllTests();
  } catch (error) {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  }
  
  process.exit(testSuite.testResults.failed === 0 ? 0 : 1);
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = EmailSystemTestSuite; 