/**
 * Leo AI - Product Ingestion Service
 * 
 * Ingests products with all related data into ChromaDB:
 * - Core product data (products table)
 * - Categories (categories table - JOINed for names)
 * - Inventory (product_inventory)
 * - Images (product_images)
 * - Variations (product_variations)
 * - Performance metrics (sales, views, favorites)
 * 
 * Classification:
 * - 101: Active products (customer shopping)
 * - 102: Deleted products (trend analysis)
 * - 103: Draft products (inventory prediction)
 * 
 * Uses shared database pool from api-service
 */

const pool = require('../../../../../config/db');
const { getVectorDB } = require('../vectorDB');
const logger = require('../logger');

class ProductIngestion {
  constructor() {
    this.vectorDB = null;
    this.stats = {
      total: 0,
      active: 0,
      deleted: 0,
      draft: 0,
      with_images: 0,
      with_inventory: 0,
      with_variations: 0,
      marketplace_enabled: 0
    };
  }

  async initialize() {
    try {
      logger.info('Initializing product ingestion...');
      
      this.vectorDB = getVectorDB();
      if (!this.vectorDB.isInitialized) {
        await this.vectorDB.initialize();
      }

      logger.info('Product ingestion initialized');
      return { success: true };
    } catch (error) {
      logger.error('Failed to initialize product ingestion:', error);
      throw error;
    }
  }

  /**
   * Get count of products to process
   */
  async getProductCount(lastRun = '1970-01-01 00:00:00') {
    const [[{ count }]] = await pool.execute(
      'SELECT COUNT(*) as count FROM products WHERE updated_at > ?',
      [lastRun]
    );
    return count;
  }

  /**
   * Get a batch of products with joined related data
   * @param {string} lastRun - ISO timestamp, only get products updated after this
   * @param {number} limit - Batch size
   * @param {number} offset - Offset for pagination
   */
  async getProductBatch(lastRun = '1970-01-01 00:00:00', limit = 1, offset = 0) {
    try {
      const [products] = await pool.execute(`
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
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `, [lastRun]);

      return products;
    } catch (error) {
      logger.error('Failed to fetch product batch:', error);
      throw error;
    }
  }

  /**
   * Small delay between batches to prevent overwhelming the system
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
   * Calculate popularity score (0-100)
   */
  calculatePopularityScore(product) {
    let score = 0;
    
    // Sales weight (max 40 points)
    const salesCount = product.sales_count || 0;
    score += Math.min(salesCount * 4, 40);
    
    // Favorites weight (max 30 points)
    const favoriteCount = product.favorite_count || 0;
    score += Math.min(favoriteCount * 3, 30);
    
    // Recent activity bonus (max 15 points)
    const daysSinceUpdate = this.daysSince(product.updated_at);
    if (daysSinceUpdate < 7) score += 15;
    else if (daysSinceUpdate < 30) score += 10;
    else if (daysSinceUpdate < 90) score += 5;
    
    // Completeness bonus (max 15 points)
    if (product.image_count > 0) score += 5;
    if (product.description) score += 5;
    if (product.category_name) score += 5;
    
    return Math.min(score, 100);
  }

  /**
   * Build product content for embedding (searchable text)
   */
  buildProductContent(product) {
    const parts = [];
    
    // Product name (most important)
    parts.push(product.name);
    
    // Category hierarchy
    if (product.parent_category_name && product.category_name) {
      parts.push(`Category: ${product.parent_category_name} > ${product.category_name}`);
    } else if (product.category_name) {
      parts.push(`Category: ${product.category_name}`);
    }
    
    // Description (truncated for embedding)
    if (product.short_description) {
      parts.push(product.short_description.substring(0, 300));
    } else if (product.description) {
      // Strip HTML tags and truncate
      const cleanDesc = product.description.replace(/<[^>]*>/g, ' ').trim();
      parts.push(cleanDesc.substring(0, 300));
    }
    
    // Artist
    if (product.artist_username) {
      parts.push(`By ${product.artist_username}`);
    }
    
    // Price
    parts.push(`Price: $${parseFloat(product.price || 0).toFixed(2)}`);
    
    // Marketplace category (if different from main category)
    if (product.marketplace_category && product.marketplace_category !== 'unsorted') {
      parts.push(`Marketplace: ${product.marketplace_category}`);
    }
    
    // Product type
    if (product.product_type) {
      parts.push(`Type: ${product.product_type}`);
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
      sku: product.sku || '',
      price: parseFloat(product.price || 0),
      status: product.status,
      vendor_id: product.vendor_id,
      category_id: product.category_id || 0,
      product_type: product.product_type || 'simple',
      marketplace_enabled: product.marketplace_enabled === 1 || product.marketplace_enabled === true,
      marketplace_category: product.marketplace_category || '',
      allow_returns: product.allow_returns === 1 || product.allow_returns === true,
      track_inventory: product.track_inventory === 1 || product.track_inventory === true,
      created_at: product.created_at ? new Date(product.created_at).toISOString() : null,
      updated_at: product.updated_at ? new Date(product.updated_at).toISOString() : null,
      
      // === LAYER 1: Category Data (JOINed) ===
      category_name: product.category_name || '',
      parent_category_name: product.parent_category_name || '',
      category_full: product.parent_category_name && product.category_name 
        ? `${product.parent_category_name} > ${product.category_name}`
        : (product.category_name || ''),
      
      // === LAYER 1: Artist Data ===
      artist_username: product.artist_username || '',
      artist_type: product.artist_type || '',
      
      // === LAYER 1: Inventory ===
      qty_on_hand: parseInt(product.qty_on_hand) || 0,
      qty_available: parseInt(product.qty_available) || 0,
      
      // === LAYER 1: Images ===
      primary_image_url: product.primary_image_url || '',
      image_count: parseInt(product.image_count) || 0,
      
      // === LAYER 1: Dimensions ===
      width: parseFloat(product.width) || 0,
      height: parseFloat(product.height) || 0,
      depth: parseFloat(product.depth) || 0,
      weight: parseFloat(product.weight) || 0,
      dimension_unit: product.dimension_unit || 'in',
      weight_unit: product.weight_unit || 'lb',
      
      // === LAYER 2: Classification ===
      classification: this.getClassification(product.status),
      
      // === LAYER 2: Performance Metrics ===
      sales_count: parseInt(product.sales_count) || 0,
      units_sold: parseInt(product.units_sold) || 0,
      favorite_count: parseInt(product.favorite_count) || 0,
      variation_count: parseInt(product.variation_count) || 0,
      popularity_score: this.calculatePopularityScore(product),
      
      // === LAYER 2: Calculated Flags ===
      in_stock: (parseInt(product.qty_available) || 0) > 0,
      has_images: (parseInt(product.image_count) || 0) > 0,
      has_variations: (parseInt(product.variation_count) || 0) > 0,
      is_popular: (parseInt(product.sales_count) || 0) >= 5,
      is_highly_favorited: (parseInt(product.favorite_count) || 0) >= 3,
      is_new_arrival: this.daysSince(product.created_at) < 30,
      
      // === LAYER 2: Availability ===
      days_since_created: this.daysSince(product.created_at),
      days_since_updated: this.daysSince(product.updated_at),
      
      // === LAYER 2: Pricing ===
      has_wholesale_price: !!product.wholesale_price && parseFloat(product.wholesale_price) > 0,
      wholesale_price: product.wholesale_price ? parseFloat(product.wholesale_price) : 0,
      
      // Price tier (for filtering)
      price_tier: this.getPriceTier(parseFloat(product.price || 0)),
      
      // Version control
      ingestion_version: 1,
      ingested_at: new Date().toISOString()
    };

    return this.sanitizeMetadata(metadata);
  }

  /**
   * Get price tier for filtering
   */
  getPriceTier(price) {
    if (price < 25) return 'budget';
    if (price < 50) return 'affordable';
    if (price < 100) return 'mid-range';
    if (price < 250) return 'premium';
    return 'luxury';
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
      if ((product.qty_available || 0) > 0) this.stats.with_inventory++;
      if ((product.variation_count || 0) > 0) this.stats.with_variations++;
      if (product.marketplace_enabled) this.stats.marketplace_enabled++;

    } catch (error) {
      logger.error(`Failed to ingest product ${product.id}:`, error);
      throw error;
    }
  }

  /**
   * Run the complete product ingestion - ONE AT A TIME
   * @param {string} lastRun - ISO timestamp, only ingest products updated after this
   * @param {number} batchSize - Products per batch (default 1 - one at a time!)
   * @param {number} delayMs - Delay between products in ms (default 200)
   */
  async run(lastRun = '1970-01-01 00:00:00', batchSize = 1, delayMs = 200) {
    try {
      // Initialize if needed
      if (!this.vectorDB) {
        await this.initialize();
      }

      logger.info(`Starting product ingestion (batch size: ${batchSize})...`);
      const startTime = Date.now();

      // Reset stats
      this.stats = {
        total: 0,
        active: 0,
        deleted: 0,
        draft: 0,
        with_images: 0,
        with_inventory: 0,
        with_variations: 0,
        marketplace_enabled: 0,
        batches_processed: 0
      };

      // Get total count first
      const totalCount = await this.getProductCount(lastRun);
      
      if (totalCount === 0) {
        logger.info('No products to ingest');
        return { success: true, stats: this.stats, duration: 0 };
      }

      logger.info(`Found ${totalCount} products to ingest in batches of ${batchSize}`);
      const totalBatches = Math.ceil(totalCount / batchSize);

      // Process in streaming batches
      let offset = 0;
      while (offset < totalCount) {
        // Fetch one batch
        const batch = await this.getProductBatch(lastRun, batchSize, offset);
        
        if (batch.length === 0) break;

        // Process each product in the batch
        for (const product of batch) {
          try {
            await this.ingestProduct(product);
          } catch (err) {
            logger.warn(`Skipping product ${product.id} due to error:`, err.message);
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
      logger.info('Product ingestion complete!', { 
        stats: this.stats, 
        duration_ms: duration 
      });

      return { success: true, stats: this.stats, duration };

    } catch (error) {
      logger.error('Product ingestion failed:', error);
      throw error;
    }
  }
}

// Singleton instance
let instance = null;

function getProductIngestion() {
  if (!instance) {
    instance = new ProductIngestion();
  }
  return instance;
}

module.exports = {
  ProductIngestion,
  getProductIngestion
};
