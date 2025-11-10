#!/usr/bin/env node

/**
 * Leo AI - Product Ingestion Script
 * 
 * Ingests products with all related data:
 * - Core product data (products table)
 * - Categories (categories table - JOINed for names)
 * - Inventory (product_inventory)
 * - Images (product_images)
 * - Variations (product_variations)
 * - Performance metrics (sales, views from other tables)
 * 
 * Layer 1: Raw SQL data from all product-related tables
 * Layer 2: Computed metadata (sales counts, popularity, availability, classification)
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
      return `${timestamp} [PRODUCT-INGESTION] ${level.toUpperCase()}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '..', 'logs/product-ingestion.log') }),
    new winston.transports.Console()
  ]
});

class ProductIngestion {
  constructor() {
    this.vectorDB = new VectorDatabase();
    this.dbConnection = null;
    this.stats = {
      total: 0,
      active: 0,
      deleted: 0,
      draft: 0,
      with_images: 0,
      with_inventory: 0,
      with_variations: 0
    };
  }

  async initialize() {
    try {
      logger.info('🎨 Initializing product ingestion...');
      
      await this.vectorDB.initialize();
      
      this.dbConnection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'oaf'
      });

      logger.info('✅ Product ingestion initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize product ingestion:', error);
      throw error;
    }
  }

  /**
   * Get all products with joined related data
   */
  async getProductsWithRelatedData(lastRun = '1970-01-01 00:00:00') {
    try {
      const [products] = await this.dbConnection.execute(`
        SELECT 
          -- Core product data
          p.id,
          p.name,
          p.description,
          p.short_description,
          p.price,
          p.vendor_id,
          p.category_id,
          p.sku,
          p.status,
          p.created_at,
          p.updated_at,
          p.track_inventory,
          p.product_type,
          p.marketplace_enabled,
          p.marketplace_category,
          p.wholesale_price,
          p.allow_returns,
          
          -- Dimensions
          p.width,
          p.height,
          p.depth,
          p.weight,
          p.dimension_unit,
          p.weight_unit,
          
          -- Category info (JOINed)
          c.name as category_name,
          c.parent_id as category_parent_id,
          pc.name as parent_category_name,
          p.parent_id as product_parent_id,
          
          -- Vendor/Artist info
          u.username as artist_username,
          u.user_type as artist_type,
          
          -- Inventory info
          inv.qty_on_hand,
          inv.qty_available,
          
          -- Image info (primary image)
          (SELECT image_url FROM product_images 
           WHERE product_id = p.id AND is_primary = 1 
           LIMIT 1) as primary_image_url,
          (SELECT COUNT(*) FROM product_images 
           WHERE product_id = p.id) as image_count,
          
          -- Sales performance (from order_items)
          (SELECT COUNT(DISTINCT oi.order_id) 
           FROM order_items oi 
           JOIN orders o ON o.id = oi.order_id 
           WHERE oi.product_id = p.id AND o.status = 'paid') as sales_count,
          
          (SELECT SUM(oi.quantity) 
           FROM order_items oi 
           JOIN orders o ON o.id = oi.order_id 
           WHERE oi.product_id = p.id AND o.status = 'paid') as units_sold,
          
          -- Saved/favorite count
          (SELECT COUNT(*) FROM saved_items 
           WHERE product_id = p.id) as favorite_count,
          
          -- Variation info
          (SELECT COUNT(*) FROM product_variations pv
           WHERE pv.product_id = p.id) as variation_count
          
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN categories pc ON pc.id = c.parent_id
        LEFT JOIN users u ON u.id = p.vendor_id
        LEFT JOIN product_inventory inv ON inv.product_id = p.id
        WHERE p.updated_at > ?
        ORDER BY p.id
      `, [lastRun]);

      logger.info(`📊 Found ${products.length} products to ingest`);
      return products;
    } catch (error) {
      logger.error('Failed to fetch products:', error);
      throw error;
    }
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
   * Determine classification based on status
   */
  getClassification(status) {
    switch(status) {
      case 'active':
        return '101'; // Active products (customer shopping)
      case 'deleted':
      case 'terminated':
        return '102'; // Deleted products (trend analysis)
      case 'draft':
        return '103'; // Draft products (inventory prediction)
      default:
        return '101';
    }
  }

  /**
   * Build product content for embedding
   */
  buildProductContent(product) {
    const parts = [];
    
    // Product name
    parts.push(product.name);
    
    // Category
    if (product.category_name) {
      parts.push(`Category: ${product.category_name}`);
    }
    
    // Description
    if (product.short_description) {
      parts.push(product.short_description.substring(0, 200));
    } else if (product.description) {
      parts.push(product.description.substring(0, 200));
    }
    
    // Artist
    if (product.artist_username) {
      parts.push(`By ${product.artist_username}`);
    }
    
    // Price
    parts.push(`Price: $${product.price}`);
    
    // Key attributes
    if (product.marketplace_category && product.marketplace_category !== 'unsorted') {
      parts.push(`Marketplace: ${product.marketplace_category}`);
    }
    
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
  buildProductMetadata(product) {
    const metadata = {
      // === LAYER 1: Core Product Data ===
      product_id: product.id,
      name: product.name,
      sku: product.sku,
      price: parseFloat(product.price),
      status: product.status,
      vendor_id: product.vendor_id,
      category_id: product.category_id,
      product_type: product.product_type,
      marketplace_enabled: !!product.marketplace_enabled,
      marketplace_category: product.marketplace_category,
      allow_returns: !!product.allow_returns,
      track_inventory: !!product.track_inventory,
      created_at: product.created_at ? product.created_at.toISOString() : null,
      updated_at: product.updated_at ? product.updated_at.toISOString() : null,
      
      // === LAYER 1: Category Data (JOINed) ===
      category_name: product.category_name,
      parent_category_name: product.parent_category_name,
      
      // === LAYER 1: Artist Data ===
      artist_username: product.artist_username,
      artist_type: product.artist_type,
      
      // === LAYER 1: Inventory ===
      qty_on_hand: product.qty_on_hand || 0,
      qty_available: product.qty_available || 0,
      
      // === LAYER 1: Images ===
      primary_image_url: product.primary_image_url,
      image_count: product.image_count || 0,
      
      // === LAYER 1: Dimensions ===
      width: product.width,
      height: product.height,
      depth: product.depth,
      weight: product.weight,
      dimension_unit: product.dimension_unit,
      weight_unit: product.weight_unit,
      
      // === LAYER 2: Classification ===
      classification: this.getClassification(product.status),
      
      // === LAYER 2: Performance Metrics ===
      sales_count: product.sales_count || 0,
      units_sold: product.units_sold || 0,
      favorite_count: product.favorite_count || 0,
      variation_count: product.variation_count || 0,
      
      // === LAYER 2: Calculated Flags ===
      in_stock: (product.qty_available || 0) > 0,
      has_images: (product.image_count || 0) > 0,
      has_variations: (product.variation_count || 0) > 0,
      is_popular: (product.sales_count || 0) >= 5,
      is_highly_favorited: (product.favorite_count || 0) >= 3,
      is_new_arrival: this.daysSince(product.created_at) < 30,
      
      // === LAYER 2: Availability ===
      days_since_created: this.daysSince(product.created_at),
      days_since_updated: this.daysSince(product.updated_at),
      
      // === LAYER 2: Pricing ===
      has_wholesale_price: !!product.wholesale_price,
      wholesale_price: product.wholesale_price ? parseFloat(product.wholesale_price) : null,
      
      // Version control
      ingestion_version: 1,
      ingested_at: new Date().toISOString()
    };

    // Sanitize to ensure ChromaDB compatibility
    return this.sanitizeMetadata(metadata);
  }

  /**
   * Ingest a single product into vector database
   */
  async ingestProduct(product) {
    try {
      const content = this.buildProductContent(product);
      const metadata = this.buildProductMetadata(product);

      await this.vectorDB.addDocuments('art_metadata', [{
        id: `product_${product.id}`,
        content,
        metadata,
        source: 'product_ingestion'
      }]);

      // Update stats
      this.stats.total++;
      if (product.status === 'active') this.stats.active++;
      if (product.status === 'deleted' || product.status === 'terminated') this.stats.deleted++;
      if (product.status === 'draft') this.stats.draft++;
      if (product.image_count > 0) this.stats.with_images++;
      if (product.qty_available > 0) this.stats.with_inventory++;
      if (product.variation_count > 0) this.stats.with_variations++;

    } catch (error) {
      logger.error(`Failed to ingest product ${product.id}:`, error);
      throw error;
    }
  }

  /**
   * Run the complete product ingestion
   */
  async run(lastRun = '1970-01-01 00:00:00') {
    try {
      logger.info('🚀 Starting product ingestion...');
      const startTime = Date.now();

      // Get all products with related data
      const products = await this.getProductsWithRelatedData(lastRun);

      if (products.length === 0) {
        logger.info('✅ No products to ingest');
        return { success: true, stats: this.stats };
      }

      // Ingest each product
      for (const product of products) {
        await this.ingestProduct(product);
        
        if (this.stats.total % 100 === 0) {
          logger.info(`Progress: ${this.stats.total}/${products.length} products ingested`);
        }
      }

      const duration = Date.now() - startTime;
      logger.info('✅ Product ingestion complete!');
      logger.info('📊 Stats:', this.stats);
      logger.info(`⏱️  Duration: ${duration}ms (${(duration/1000).toFixed(2)}s)`);

      return { success: true, stats: this.stats, duration };

    } catch (error) {
      logger.error('❌ Product ingestion failed:', error);
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
  const ingestion = new ProductIngestion();
  
  // Get last run timestamp from command line arg or use default
  const lastRun = process.argv[2] || '1970-01-01 00:00:00';
  
  ingestion.initialize()
    .then(() => ingestion.run(lastRun))
    .then(result => {
      console.log('✅ Product ingestion completed:', result);
      return ingestion.cleanup();
    })
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Product ingestion failed:', error);
      ingestion.cleanup().finally(() => process.exit(1));
    });
}

module.exports = ProductIngestion;

