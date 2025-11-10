#!/usr/bin/env node

/**
 * Leo AI - Order Ingestion Script
 * 
 * Ingests orders with user and product correlation:
 * - Core order data (orders table)
 * - Order items (order_items table - what was purchased)
 * - User context (username, type)
 * - Product context (names, categories, prices)
 * - Purchase patterns (day of week, time, basket composition)
 * 
 * Layer 1: Raw SQL data from orders + order_items + users + products
 * Layer 2: Computed metadata (basket analysis, temporal patterns, user behavior)
 * 
 * Classification: 131 (User Purchase History)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const VectorDatabase = require('../src/core/vectorDatabase');
const winston = require('winston');
const path = require('path');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [ORDER-INGESTION] ${level.toUpperCase()}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '..', 'logs/order-ingestion.log') }),
    new winston.transports.Console()
  ]
});

class OrderIngestion {
  constructor() {
    this.vectorDB = new VectorDatabase();
    this.dbConnection = null;
    this.stats = {
      total: 0,
      paid: 0,
      pending: 0,
      cancelled: 0,
      with_multiple_items: 0,
      total_items: 0
    };
  }

  async initialize() {
    try {
      logger.info('🎨 Initializing order ingestion...');
      
      await this.vectorDB.initialize();
      
      this.dbConnection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'oaf'
      });

      logger.info('✅ Order ingestion initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize order ingestion:', error);
      throw error;
    }
  }

  /**
   * Get all orders with items, user, and product context
   */
  async getOrdersWithContext(lastRun = '1970-01-01 00:00:00') {
    try {
      const [orders] = await this.dbConnection.execute(`
        SELECT 
          -- Core order data
          o.id,
          o.user_id,
          o.status,
          o.total_amount,
          o.shipping_amount,
          o.tax_amount,
          o.platform_fee_amount,
          o.currency,
          o.created_at,
          o.updated_at,
          o.marketplace_source,
          
          -- User context
          u.username,
          u.user_type,
          
          -- Order items count
          (SELECT COUNT(*) FROM order_items 
           WHERE order_id = o.id) as item_count
          
        FROM orders o
        JOIN users u ON u.id = o.user_id
        WHERE o.updated_at > ?
        ORDER BY o.id
      `, [lastRun]);

      logger.info(`📊 Found ${orders.length} orders to ingest`);
      return orders;
    } catch (error) {
      logger.error('Failed to fetch orders:', error);
      throw error;
    }
  }

  /**
   * Get items for a specific order with product details
   */
  async getOrderItems(orderId) {
    try {
      const [items] = await this.dbConnection.execute(`
        SELECT 
          oi.id,
          oi.product_id,
          oi.quantity,
          oi.price,
          oi.product_name,
          
          -- Product details (if product still exists)
          p.name as current_product_name,
          p.status as product_status,
          p.category_id,
          c.name as category_name,
          p.vendor_id
          
        FROM order_items oi
        LEFT JOIN products p ON p.id = oi.product_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE oi.order_id = ?
      `, [orderId]);

      return items;
    } catch (error) {
      logger.error(`Failed to fetch items for order ${orderId}:`, error);
      return [];
    }
  }

  /**
   * Get day of week from date
   */
  getDayOfWeek(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date(date).getDay()];
  }

  /**
   * Get hour of day from date
   */
  getHourOfDay(date) {
    return new Date(date).getHours();
  }

  /**
   * Calculate days since date
   */
  daysSince(date) {
    if (!date) return null;
    const now = new Date();
    const then = new Date(date);
    return Math.floor((now - then) / (1000 * 60 * 60 * 24));
  }

  /**
   * Build order content for embedding
   */
  buildOrderContent(order, items) {
    const parts = [];
    
    // Order summary
    parts.push(`Order #${order.id}`);
    parts.push(`by ${order.username} (${order.user_type})`);
    parts.push(`Status: ${order.status}`);
    parts.push(`Total: $${order.total_amount}`);
    
    // Items
    if (items.length > 0) {
      const itemNames = items.map(item => 
        item.current_product_name || item.product_name
      ).filter(Boolean);
      if (itemNames.length > 0) {
        parts.push(`Items: ${itemNames.join(', ')}`);
      }
      
      // Categories
      const categories = [...new Set(items.map(item => item.category_name).filter(Boolean))];
      if (categories.length > 0) {
        parts.push(`Categories: ${categories.join(', ')}`);
      }
    }
    
    // When
    parts.push(`${this.getDayOfWeek(order.created_at)} at ${this.getHourOfDay(order.created_at)}:00`);
    
    return parts.join(' | ');
  }

  /**
   * Sanitize metadata to only include scalar values ChromaDB accepts
   */
  sanitizeMetadata(metadata) {
    const sanitized = {};
    
    Object.entries(metadata).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return; // Skip null/undefined
      } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value instanceof Date) {
        sanitized[key] = value.toISOString();
      } else if (typeof value === 'object') {
        sanitized[key] = JSON.stringify(value);
      } else {
        sanitized[key] = String(value);
      }
    });
    
    return sanitized;
  }

  /**
   * Build metadata for vector storage
   */
  buildOrderMetadata(order, items) {
    // Extract product and category info from items
    const productIds = items.map(item => item.product_id);
    const categories = [...new Set(items.map(item => item.category_name).filter(Boolean))];
    const vendorIds = [...new Set(items.map(item => item.vendor_id).filter(Boolean))];
    
    // Calculate basket metrics
    const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const avgItemPrice = items.length > 0 
      ? items.reduce((sum, item) => sum + parseFloat(item.price || 0), 0) / items.length
      : 0;

    const metadata = {
      // === LAYER 1: Core Order Data ===
      order_id: order.id,
      user_id: order.user_id,
      status: order.status,
      total_amount: parseFloat(order.total_amount),
      shipping_amount: parseFloat(order.shipping_amount || 0),
      tax_amount: parseFloat(order.tax_amount || 0),
      platform_fee_amount: parseFloat(order.platform_fee_amount || 0),
      currency: order.currency || 'USD',
      marketplace_source: order.marketplace_source || 'oaf',
      created_at: order.created_at ? order.created_at.toISOString() : null,
      updated_at: order.updated_at ? order.updated_at.toISOString() : null,
      
      // === LAYER 1: User Context ===
      username: order.username,
      user_type: order.user_type,
      
      // === LAYER 1: Items Data (as strings for ChromaDB) ===
      product_ids: productIds.join(','),
      category_names: categories.join(','),
      vendor_ids: vendorIds.join(','),
      
      // === LAYER 2: Classification ===
      classification: '131', // User Purchase History
      interaction_type: 'purchase',
      
      // === LAYER 2: Basket Analysis ===
      item_count: items.length,
      total_items: totalItems, // Accounts for quantity
      avg_item_price: avgItemPrice,
      has_multiple_items: items.length > 1,
      unique_categories: categories.length,
      unique_vendors: vendorIds.length,
      
      // === LAYER 2: Temporal Patterns ===
      day_of_week: this.getDayOfWeek(order.created_at),
      hour_of_day: this.getHourOfDay(order.created_at),
      is_weekend: ['Saturday', 'Sunday'].includes(this.getDayOfWeek(order.created_at)),
      is_business_hours: this.getHourOfDay(order.created_at) >= 9 && this.getHourOfDay(order.created_at) <= 17,
      
      // === LAYER 2: Order Age ===
      days_since_order: this.daysSince(order.created_at),
      
      // === LAYER 2: Status Flags ===
      is_paid: order.status === 'paid',
      is_complete: ['paid', 'shipped', 'accepted'].includes(order.status),
      is_cancelled: order.status === 'cancelled',
      
      // Version control
      ingestion_version: 1,
      ingested_at: new Date().toISOString()
    };

    // Sanitize to ensure ChromaDB compatibility
    return this.sanitizeMetadata(metadata);
  }

  /**
   * Ingest a single order into vector database
   */
  async ingestOrder(order) {
    try {
      // Get items for this order
      const items = await this.getOrderItems(order.id);
      
      const content = this.buildOrderContent(order, items);
      const metadata = this.buildOrderMetadata(order, items);

      await this.vectorDB.addDocuments('user_interactions', [{
        id: `order_${order.id}`,
        content,
        metadata,
        source: 'order_ingestion'
      }]);

      // Update stats
      this.stats.total++;
      this.stats.total_items += items.length;
      if (order.status === 'paid') this.stats.paid++;
      if (order.status === 'pending') this.stats.pending++;
      if (order.status === 'cancelled') this.stats.cancelled++;
      if (items.length > 1) this.stats.with_multiple_items++;

    } catch (error) {
      logger.error(`Failed to ingest order ${order.id}:`, error);
      throw error;
    }
  }

  /**
   * Run the complete order ingestion
   */
  async run(lastRun = '1970-01-01 00:00:00') {
    try {
      logger.info('🚀 Starting order ingestion...');
      const startTime = Date.now();

      // Get all orders
      const orders = await this.getOrdersWithContext(lastRun);

      if (orders.length === 0) {
        logger.info('✅ No orders to ingest');
        return { success: true, stats: this.stats };
      }

      // Ingest each order
      for (const order of orders) {
        await this.ingestOrder(order);
        
        if (this.stats.total % 50 === 0) {
          logger.info(`Progress: ${this.stats.total}/${orders.length} orders ingested`);
        }
      }

      const duration = Date.now() - startTime;
      logger.info('✅ Order ingestion complete!');
      logger.info('📊 Stats:', this.stats);
      logger.info(`⏱️  Duration: ${duration}ms (${(duration/1000).toFixed(2)}s)`);

      return { success: true, stats: this.stats, duration };

    } catch (error) {
      logger.error('❌ Order ingestion failed:', error);
      throw error;
    }
  }

  async cleanup() {
    if (this.dbConnection) {
      await this.dbConnection.end();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const ingestion = new OrderIngestion();
  
  // Get last run timestamp from command line arg or use default
  const lastRun = process.argv[2] || '1970-01-01 00:00:00';
  
  ingestion.initialize()
    .then(() => ingestion.run(lastRun))
    .then(result => {
      console.log('✅ Order ingestion completed:', result);
      return ingestion.cleanup();
    })
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Order ingestion failed:', error);
      ingestion.cleanup().finally(() => process.exit(1));
    });
}

module.exports = OrderIngestion;

