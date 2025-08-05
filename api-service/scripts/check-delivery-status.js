#!/usr/bin/env node

/**
 * Automated Delivery Status Checker & Email Trigger
 * 
 * This script runs periodically to:
 * 1. Find all shipped orders that haven't been marked delivered
 * 2. Check tracking status with carrier APIs
 * 3. Send "order delivered" email when status changes to delivered
 * 4. Update order status in database
 * 
 * Usage:
 *   node check-delivery-status.js [--dry-run]
 * 
 * Cron example (run every 4 hours):
 *   0 4,8,12,16,20,0 * * * cd /var/www/main && node api-service/scripts/check-delivery-status.js
 */

const path = require('path');
const mysql = require('mysql2/promise');

// Import our services
const shippingService = require('../src/services/shippingService');
const EmailService = require('../src/services/emailService');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || '10.128.0.31',
  user: process.env.DB_USER || 'oafuser',
  password: process.env.DB_PASS || 'oafpass',
  database: process.env.DB_NAME || 'oaf',
  timezone: 'Z'
};

class DeliveryStatusChecker {
  constructor(dryRun = false) {
    this.dryRun = dryRun;
    this.shippingService = shippingService;
    this.emailService = null; // Initialize later in init()
    this.db = null;
    this.stats = {
      ordersChecked: 0,
      deliveredPackages: 0,
      emailsSent: 0,
      errors: 0
    };
  }

  async init() {
    try {
      // Connect to database
      this.db = await mysql.createConnection(dbConfig);
      console.log('✅ Connected to database');
      
      // Initialize email service only if not in dry-run mode
      if (!this.dryRun) {
        this.emailService = new EmailService();
        console.log('✅ Email service initialized');
      } else {
        console.log('🏃 Dry-run mode: Skipping email service initialization');
      }
      
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      throw error;
    }
  }

  async findOrdersToCheck() {
    const query = `
      SELECT DISTINCT
        o.id as order_id,
        o.user_id,
        oi.id as order_item_id,
        oi.vendor_id,
        oit.id as tracking_id,
        oit.tracking_number,
        oit.carrier,
        oit.package_sequence,
        oit.last_status,
        oit.last_status_check,
        p.name as product_name,
        u.username as customer_email,
        up.display_name as customer_name
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN order_item_tracking oit ON oi.id = oit.order_item_id
      JOIN products p ON oi.product_id = p.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE o.status IN ('shipped', 'paid')
        AND oit.tracking_number IS NOT NULL
        AND (oit.last_status != 'delivered' OR oit.last_status IS NULL)
        AND (oit.last_status_check IS NULL OR oit.last_status_check < DATE_SUB(NOW(), INTERVAL 2 HOUR))
      ORDER BY o.id, oi.id, oit.package_sequence
    `;

    const [rows] = await this.db.execute(query);
    console.log(`📦 Found ${rows.length} packages to check for delivery status`);
    return rows;
  }

  async checkPackageDelivery(packageInfo) {
    try {
      console.log(`🔍 Checking ${packageInfo.carrier.toUpperCase()} tracking: ${packageInfo.tracking_number}`);
      
      // Get live tracking info from carrier API
      const trackingData = await this.shippingService.getTrackingInfo(
        packageInfo.tracking_number, 
        packageInfo.carrier
      );

      // Update last status check time
      await this.updateLastStatusCheck(packageInfo.tracking_id, trackingData.status);

      // Check if status changed to delivered
      const isNewDelivery = this.isDeliveredStatus(trackingData.status) && 
                           !this.isDeliveredStatus(packageInfo.last_status);

      if (isNewDelivery) {
        console.log(`🎉 Package delivered! ${packageInfo.tracking_number} - ${trackingData.status}`);
        
        // Send delivery email
        await this.sendDeliveryEmail(packageInfo, trackingData);
        
        // Update order status if all items are delivered
        await this.updateOrderStatusIfFullyDelivered(packageInfo.order_id);
        
        this.stats.deliveredPackages++;
        this.stats.emailsSent++;
      }

      this.stats.ordersChecked++;
      return isNewDelivery;

    } catch (error) {
      console.error(`❌ Error checking package ${packageInfo.tracking_number}:`, error.message);
      this.stats.errors++;
      return false;
    }
  }

  isDeliveredStatus(status) {
    if (!status) return false;
    const statusLower = status.toLowerCase();
    return statusLower.includes('delivered') || statusLower.includes('delivered successfully');
  }

  async updateLastStatusCheck(trackingId, status) {
    if (this.dryRun) {
      console.log(`[DRY RUN] Would update tracking ${trackingId} status to: ${status}`);
      return;
    }

    const query = `
      UPDATE order_item_tracking 
      SET last_status = ?, last_status_check = NOW() 
      WHERE id = ?
    `;
    
    await this.db.execute(query, [status, trackingId]);
  }

  async sendDeliveryEmail(packageInfo, trackingData) {
    if (this.dryRun) {
      console.log(`[DRY RUN] Would send delivery email to: ${packageInfo.customer_email}`);
      return;
    }

    try {
      // Get all tracking info for this order item to include in email
      const allPackagesQuery = `
        SELECT 
          oit.tracking_number,
          oit.carrier,
          oit.package_sequence
        FROM order_item_tracking oit
        WHERE oit.order_item_id = ?
        ORDER BY oit.package_sequence
      `;
      
      const [allPackages] = await this.db.execute(allPackagesQuery, [packageInfo.order_item_id]);
      
      // Prepare email data
      const emailData = {
        customer_name: packageInfo.customer_name || 'Valued Customer',
        customer_email: packageInfo.customer_email,
        order_id: packageInfo.order_id,
        product_name: packageInfo.product_name,
        tracking_number: packageInfo.tracking_number,
        carrier: packageInfo.carrier.toUpperCase(),
        delivered_date: trackingData.deliveredDate || new Date().toLocaleDateString(),
        delivered_time: trackingData.deliveredTime || '',
        tracking_url: this.getTrackingUrl(packageInfo.carrier, packageInfo.tracking_number),
        package_list: allPackages.map(pkg => 
          `${this.getCarrierLogo(pkg.carrier)} ${pkg.carrier.toUpperCase()}: ${pkg.tracking_number}`
        ).join('\n')
      };

      // Send delivery confirmation email
      await this.emailService.sendEmail(
        packageInfo.customer_email,
        'order_delivered',
        emailData,
        true // High priority for delivery notifications
      );

      console.log(`📧 Delivery email sent to ${packageInfo.customer_email} for order ${packageInfo.order_id}`);

    } catch (error) {
      console.error(`❌ Failed to send delivery email:`, error);
      throw error;
    }
  }

  async updateOrderStatusIfFullyDelivered(orderId) {
    if (this.dryRun) {
      console.log(`[DRY RUN] Would check if order ${orderId} is fully delivered`);
      return;
    }

    // Check if all packages for this order are delivered
    const query = `
      SELECT 
        COUNT(*) as total_packages,
        SUM(CASE WHEN oit.last_status LIKE '%delivered%' THEN 1 ELSE 0 END) as delivered_packages
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN order_item_tracking oit ON oi.id = oit.order_item_id
      WHERE o.id = ?
    `;

    const [result] = await this.db.execute(query, [orderId]);
    const { total_packages, delivered_packages } = result[0];

    if (total_packages > 0 && total_packages === delivered_packages) {
      // All packages delivered - update order status
      await this.db.execute(
        'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
        ['delivered', orderId]
      );
      
      console.log(`📋 Order ${orderId} marked as fully delivered (${delivered_packages}/${total_packages} packages)`);
    }
  }

  getTrackingUrl(carrier, trackingNumber) {
    switch (carrier.toLowerCase()) {
      case 'ups':
        return `https://www.ups.com/track?tracknum=${trackingNumber}`;
      case 'fedex':
        return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
      case 'usps':
        return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
      default:
        return '#';
    }
  }

  getCarrierLogo(carrier) {
    switch (carrier?.toLowerCase()) {
      case 'ups': return '📦';
      case 'fedex': return '🚚';
      case 'usps': return '📮';
      default: return '📋';
    }
  }

  async run() {
    console.log('🚀 Starting delivery status check...');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}`);
    
    try {
      await this.init();
      
      const packagesToCheck = await this.findOrdersToCheck();
      
      if (packagesToCheck.length === 0) {
        console.log('✨ No packages need delivery status checking at this time');
        return;
      }

      // Process packages in batches to avoid overwhelming APIs
      const batchSize = 10;
      for (let i = 0; i < packagesToCheck.length; i += batchSize) {
        const batch = packagesToCheck.slice(i, i + batchSize);
        
        console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(packagesToCheck.length/batchSize)}`);
        
        // Process batch with some delay between requests
        for (const packageInfo of batch) {
          await this.checkPackageDelivery(packageInfo);
          
          // Small delay to be respectful to carrier APIs
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Longer delay between batches
        if (i + batchSize < packagesToCheck.length) {
          console.log('⏳ Waiting 5 seconds before next batch...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

    } catch (error) {
      console.error('❌ Delivery status check failed:', error);
      this.stats.errors++;
    }
  }

  async cleanup() {
    if (this.db) {
      await this.db.end();
      console.log('🔌 Database connection closed');
    }
  }

  printStats() {
    console.log('\n📊 Delivery Status Check Results:');
    console.log(`   Packages Checked: ${this.stats.ordersChecked}`);
    console.log(`   New Deliveries: ${this.stats.deliveredPackages}`);
    console.log(`   Emails Sent: ${this.stats.emailsSent}`);
    console.log(`   Errors: ${this.stats.errors}`);
    console.log(`   Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}`);
  }
}

// Main execution
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const checker = new DeliveryStatusChecker(dryRun);
  
  try {
    await checker.run();
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  } finally {
    await checker.cleanup();
    checker.printStats();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = DeliveryStatusChecker;