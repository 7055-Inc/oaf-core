/**
 * Leo AI - Order Ingestion Service
 * 
 * Ingests orders with user and product correlation into ChromaDB:
 * - Core order data (orders table)
 * - Order items (order_items table - what was purchased)
 * - User context (username, type)
 * - Product context (names, categories, prices)
 * - Purchase patterns (day of week, time, basket composition)
 * 
 * Classification: 131 (User Purchase History)
 * Target Collection: user_interactions
 * 
 * Uses shared database pool from api-service
 */

const pool = require('../../../../../config/db');
const { getVectorDB } = require('../vectorDB');
const logger = require('../logger');

class OrderIngestion {
  constructor() {
    this.vectorDB = null;
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
      logger.info('Initializing order ingestion...');
      
      this.vectorDB = getVectorDB();
      if (!this.vectorDB.isInitialized) {
        await this.vectorDB.initialize();
      }

      logger.info('Order ingestion initialized');
      return { success: true };
    } catch (error) {
      logger.error('Failed to initialize order ingestion:', error);
      throw error;
    }
  }

  /**
   * Get count of orders to process
   */
  async getOrderCount(lastRun = '1970-01-01 00:00:00') {
    const [[{ count }]] = await pool.execute(
      'SELECT COUNT(*) as count FROM orders WHERE updated_at > ?',
      [lastRun]
    );
    return count;
  }

  /**
   * Get a batch of orders with user context
   * @param {string} lastRun - ISO timestamp, only get orders updated after this
   * @param {number} limit - Batch size
   * @param {number} offset - Offset for pagination
   */
  async getOrderBatch(lastRun = '1970-01-01 00:00:00', limit = 1, offset = 0) {
    try {
      const [orders] = await pool.execute(`
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
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `, [lastRun]);

      return orders;
    } catch (error) {
      logger.error('Failed to fetch order batch:', error);
      throw error;
    }
  }

  /**
   * Get items for a specific order with product details
   */
  async getOrderItems(orderId) {
    try {
      const [items] = await pool.execute(`
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
   * Small delay between batches to prevent overwhelming the system
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
   * Build order content for embedding (searchable text)
   */
  buildOrderContent(order, items) {
    const parts = [];
    
    // Order summary
    parts.push(`Order #${order.id}`);
    parts.push(`by ${order.username} (${order.user_type})`);
    parts.push(`Status: ${order.status}`);
    parts.push(`Total: $${parseFloat(order.total_amount || 0).toFixed(2)}`);
    
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
      total_amount: parseFloat(order.total_amount || 0),
      shipping_amount: parseFloat(order.shipping_amount || 0),
      tax_amount: parseFloat(order.tax_amount || 0),
      platform_fee_amount: parseFloat(order.platform_fee_amount || 0),
      currency: order.currency || 'USD',
      marketplace_source: order.marketplace_source || 'oaf',
      created_at: order.created_at ? new Date(order.created_at).toISOString() : null,
      updated_at: order.updated_at ? new Date(order.updated_at).toISOString() : null,
      
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
   * Run the complete order ingestion - ONE AT A TIME
   * @param {string} lastRun - ISO timestamp, only ingest orders updated after this
   * @param {number} batchSize - Orders per batch (default 1 - one at a time!)
   * @param {number} delayMs - Delay between orders in ms (default 200)
   */
  async run(lastRun = '1970-01-01 00:00:00', batchSize = 1, delayMs = 200) {
    try {
      // Initialize if needed
      if (!this.vectorDB) {
        await this.initialize();
      }

      logger.info(`Starting order ingestion (batch size: ${batchSize})...`);
      const startTime = Date.now();

      // Reset stats
      this.stats = {
        total: 0,
        paid: 0,
        pending: 0,
        cancelled: 0,
        with_multiple_items: 0,
        total_items: 0,
        batches_processed: 0
      };

      // Get total count first
      const totalCount = await this.getOrderCount(lastRun);
      
      if (totalCount === 0) {
        logger.info('No orders to ingest');
        return { success: true, stats: this.stats, duration: 0 };
      }

      logger.info(`Found ${totalCount} orders to ingest in batches of ${batchSize}`);
      const totalBatches = Math.ceil(totalCount / batchSize);

      // Process in streaming batches
      let offset = 0;
      while (offset < totalCount) {
        // Fetch one batch
        const batch = await this.getOrderBatch(lastRun, batchSize, offset);
        
        if (batch.length === 0) break;

        // Process each order in the batch
        for (const order of batch) {
          try {
            await this.ingestOrder(order);
          } catch (err) {
            logger.warn(`Skipping order ${order.id} due to error:`, err.message);
          }
        }

        this.stats.batches_processed++;
        offset += batchSize;

        // Progress logging
        const progress = Math.round((offset / totalCount) * 100);
        logger.info(`Progress: ${Math.min(offset, totalCount)}/${totalCount} (${progress}%) - Batch ${this.stats.batches_processed}/${totalBatches}`);

        // Small delay between batches to prevent overwhelming
        if (offset < totalCount) {
          await this.delay(delayMs);
        }
      }

      const duration = Date.now() - startTime;
      logger.info('Order ingestion complete!', { 
        stats: this.stats, 
        duration_ms: duration 
      });

      return { success: true, stats: this.stats, duration };

    } catch (error) {
      logger.error('Order ingestion failed:', error);
      throw error;
    }
  }
}

// Singleton instance
let instance = null;

function getOrderIngestion() {
  if (!instance) {
    instance = new OrderIngestion();
  }
  return instance;
}

module.exports = {
  OrderIngestion,
  getOrderIngestion
};
