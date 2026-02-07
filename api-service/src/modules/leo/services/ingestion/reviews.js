/**
 * Leo AI - Reviews Ingestion Service
 * 
 * Ingests reviews from the polymorphic reviews table into ChromaDB.
 * Reviews are valuable for semantic search - finding events/products/artists
 * based on what people say about them.
 * 
 * Classification:
 * - 161: Event reviews (artists reviewing events)
 * - 162: Product reviews (customers reviewing products)
 * - 163: Artist reviews (community reviewing artists)
 * - 164: Promoter reviews (artists reviewing promoters)
 * 
 * Target Collection: reviews
 * Uses shared database pool from api-service
 */

const pool = require('../../../../../config/db');
const { getVectorDB } = require('../vectorDB');
const logger = require('../logger');

class ReviewIngestion {
  constructor() {
    this.vectorDB = null;
    this.stats = {
      total: 0,
      event_reviews: 0,
      product_reviews: 0,
      artist_reviews: 0,
      promoter_reviews: 0,
      community_reviews: 0,
      verified: 0,
      avg_rating: 0
    };
  }

  async initialize() {
    try {
      logger.info('Initializing review ingestion...');
      
      this.vectorDB = getVectorDB();
      if (!this.vectorDB.isInitialized) {
        await this.vectorDB.initialize();
      }

      logger.info('Review ingestion initialized');
      return { success: true };
    } catch (error) {
      logger.error('Failed to initialize review ingestion:', error);
      throw error;
    }
  }

  /**
   * Get count of reviews to process
   */
  async getReviewCount(lastRun = '1970-01-01 00:00:00') {
    const [[{ count }]] = await pool.execute(
      "SELECT COUNT(*) as count FROM reviews WHERE updated_at > ? AND status = 'active'",
      [lastRun]
    );
    return count;
  }

  /**
   * Get a batch of reviews with context
   * @param {string} lastRun - ISO timestamp, only get reviews updated after this
   * @param {number} limit - Batch size
   * @param {number} offset - Offset for pagination
   */
  async getReviewBatch(lastRun = '1970-01-01 00:00:00', limit = 1, offset = 0) {
    try {
      const [reviews] = await pool.execute(`
        SELECT 
          r.id,
          r.reviewable_type,
          r.reviewable_id,
          r.reviewer_id,
          r.rating,
          r.title,
          r.review_text,
          r.display_as_anonymous,
          r.reviewer_type,
          r.verified_transaction,
          r.weight_factor,
          r.helpful_count,
          r.not_helpful_count,
          r.status,
          r.created_at,
          r.updated_at,
          
          -- Reviewer info
          u.username as reviewer_username,
          u.user_type as reviewer_user_type
          
        FROM reviews r
        LEFT JOIN users u ON u.id = r.reviewer_id
        WHERE r.updated_at > ? AND r.status = 'active'
        ORDER BY r.id
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `, [lastRun]);

      return reviews;
    } catch (error) {
      logger.error('Failed to fetch review batch:', error);
      throw error;
    }
  }

  /**
   * Get context for the reviewed entity
   */
  async getReviewableContext(reviewableType, reviewableId) {
    try {
      let context = { name: '', extra: {} };
      
      switch (reviewableType) {
        case 'event': {
          const [[event]] = await pool.execute(
            'SELECT title, venue_city, venue_state, start_date FROM events WHERE id = ?',
            [reviewableId]
          );
          if (event) {
            context.name = event.title;
            context.extra = {
              venue_city: event.venue_city,
              venue_state: event.venue_state,
              start_date: event.start_date
            };
          }
          break;
        }
        case 'product': {
          const [[product]] = await pool.execute(
            'SELECT name, price, vendor_id FROM products WHERE id = ?',
            [reviewableId]
          );
          if (product) {
            context.name = product.name;
            context.extra = {
              price: product.price,
              vendor_id: product.vendor_id
            };
          }
          break;
        }
        case 'artist':
        case 'promoter':
        case 'community': {
          const [[user]] = await pool.execute(
            'SELECT username, user_type FROM users WHERE id = ?',
            [reviewableId]
          );
          if (user) {
            context.name = user.username;
            context.extra = {
              user_type: user.user_type
            };
          }
          break;
        }
      }
      
      return context;
    } catch (error) {
      logger.error(`Failed to get context for ${reviewableType} ${reviewableId}:`, error);
      return { name: '', extra: {} };
    }
  }

  /**
   * Small delay between batches to prevent overwhelming the system
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate days since a date
   */
  daysSince(date) {
    if (!date) return null;
    const now = new Date();
    const then = new Date(date);
    return Math.floor((now - then) / (1000 * 60 * 60 * 24));
  }

  /**
   * Determine classification based on reviewable type
   */
  getClassification(reviewableType) {
    switch (reviewableType) {
      case 'event':
        return '161'; // Event reviews
      case 'product':
        return '162'; // Product reviews
      case 'artist':
        return '163'; // Artist reviews
      case 'promoter':
        return '164'; // Promoter reviews
      case 'community':
        return '165'; // Community reviews
      default:
        return '160'; // Unknown
    }
  }

  /**
   * Build review content for embedding (searchable text)
   * The review text is the most valuable part for semantic search
   */
  buildReviewContent(review, context) {
    const parts = [];
    
    // Review title
    if (review.title) {
      parts.push(review.title);
    }
    
    // What's being reviewed
    if (context.name) {
      parts.push(`Review of: ${context.name}`);
    }
    
    // Review type context
    parts.push(`${review.reviewable_type} review`);
    
    // Rating
    parts.push(`Rating: ${review.rating}/5`);
    
    // The actual review text (most important for semantic search)
    if (review.review_text) {
      // Include full review text (truncated if very long)
      const cleanText = review.review_text.replace(/<[^>]*>/g, ' ').trim();
      parts.push(cleanText.substring(0, 1000));
    }
    
    // Verified badge
    if (review.verified_transaction) {
      parts.push('Verified');
    }
    
    // Reviewer context (if not anonymous)
    if (!review.display_as_anonymous && review.reviewer_username) {
      parts.push(`By ${review.reviewer_username}`);
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
  buildReviewMetadata(review, context) {
    const metadata = {
      // === LAYER 1: Core Review Data ===
      review_id: review.id,
      reviewable_type: review.reviewable_type,
      reviewable_id: review.reviewable_id,
      reviewer_id: review.reviewer_id,
      rating: parseFloat(review.rating),
      title: review.title || '',
      
      // === LAYER 1: Reviewer Info ===
      reviewer_username: review.display_as_anonymous ? 'Anonymous' : (review.reviewer_username || ''),
      reviewer_type: review.reviewer_type || '',
      reviewer_user_type: review.reviewer_user_type || '',
      display_as_anonymous: review.display_as_anonymous === 1 || review.display_as_anonymous === true,
      
      // === LAYER 1: Reviewable Context ===
      reviewable_name: context.name || '',
      
      // === LAYER 1: Verification & Weight ===
      verified_transaction: review.verified_transaction === 1 || review.verified_transaction === true,
      weight_factor: parseFloat(review.weight_factor) || 1.0,
      
      // === LAYER 1: Helpfulness ===
      helpful_count: parseInt(review.helpful_count) || 0,
      not_helpful_count: parseInt(review.not_helpful_count) || 0,
      
      // === LAYER 1: Timestamps ===
      created_at: review.created_at ? new Date(review.created_at).toISOString() : null,
      updated_at: review.updated_at ? new Date(review.updated_at).toISOString() : null,
      
      // === LAYER 2: Classification ===
      classification: this.getClassification(review.reviewable_type),
      
      // === LAYER 2: Computed Flags ===
      is_positive: parseFloat(review.rating) >= 4.0,
      is_negative: parseFloat(review.rating) <= 2.0,
      is_verified: review.verified_transaction === 1 || review.verified_transaction === true,
      is_helpful: (parseInt(review.helpful_count) || 0) > (parseInt(review.not_helpful_count) || 0),
      has_title: !!review.title,
      
      // === LAYER 2: Rating Tier ===
      rating_tier: this.getRatingTier(parseFloat(review.rating)),
      
      // === LAYER 2: Age ===
      days_since_created: this.daysSince(review.created_at),
      
      // Version control
      ingestion_version: 1,
      ingested_at: new Date().toISOString()
    };

    // Add reviewable-specific context
    if (review.reviewable_type === 'event' && context.extra) {
      metadata.event_city = context.extra.venue_city || '';
      metadata.event_state = context.extra.venue_state || '';
    } else if (review.reviewable_type === 'product' && context.extra) {
      metadata.product_price = parseFloat(context.extra.price) || 0;
      metadata.product_vendor_id = context.extra.vendor_id || 0;
    }

    return this.sanitizeMetadata(metadata);
  }

  /**
   * Get rating tier for filtering
   */
  getRatingTier(rating) {
    if (rating >= 4.5) return 'excellent';
    if (rating >= 4.0) return 'great';
    if (rating >= 3.0) return 'good';
    if (rating >= 2.0) return 'fair';
    return 'poor';
  }

  /**
   * Ingest a single review into vector database
   */
  async ingestReview(review) {
    try {
      // Get context for the reviewed entity
      const context = await this.getReviewableContext(review.reviewable_type, review.reviewable_id);
      
      const content = this.buildReviewContent(review, context);
      const metadata = this.buildReviewMetadata(review, context);

      await this.vectorDB.addDocuments('reviews', [{
        id: `review_${review.id}`,
        content,
        metadata,
        source: 'review_ingestion'
      }]);

      // Update stats
      this.stats.total++;
      this.stats.avg_rating = ((this.stats.avg_rating * (this.stats.total - 1)) + parseFloat(review.rating)) / this.stats.total;
      
      switch (review.reviewable_type) {
        case 'event':
          this.stats.event_reviews++;
          break;
        case 'product':
          this.stats.product_reviews++;
          break;
        case 'artist':
          this.stats.artist_reviews++;
          break;
        case 'promoter':
          this.stats.promoter_reviews++;
          break;
        case 'community':
          this.stats.community_reviews++;
          break;
      }
      
      if (review.verified_transaction) {
        this.stats.verified++;
      }

    } catch (error) {
      logger.error(`Failed to ingest review ${review.id}:`, error);
      throw error;
    }
  }

  /**
   * Run the complete review ingestion - ONE AT A TIME
   * @param {string} lastRun - ISO timestamp, only ingest reviews updated after this
   * @param {number} batchSize - Reviews per batch (default 1 - one at a time!)
   * @param {number} delayMs - Delay between reviews in ms (default 200)
   */
  async run(lastRun = '1970-01-01 00:00:00', batchSize = 1, delayMs = 200) {
    try {
      // Initialize if needed
      if (!this.vectorDB) {
        await this.initialize();
      }

      logger.info(`Starting review ingestion (batch size: ${batchSize})...`);
      const startTime = Date.now();

      // Reset stats
      this.stats = {
        total: 0,
        event_reviews: 0,
        product_reviews: 0,
        artist_reviews: 0,
        promoter_reviews: 0,
        community_reviews: 0,
        verified: 0,
        avg_rating: 0,
        batches_processed: 0
      };

      // Get total count first
      const totalCount = await this.getReviewCount(lastRun);
      
      if (totalCount === 0) {
        logger.info('No reviews to ingest');
        return { success: true, stats: this.stats, duration: 0 };
      }

      logger.info(`Found ${totalCount} reviews to ingest in batches of ${batchSize}`);
      const totalBatches = Math.ceil(totalCount / batchSize);

      // Process in streaming batches
      let offset = 0;
      while (offset < totalCount) {
        // Fetch one batch
        const batch = await this.getReviewBatch(lastRun, batchSize, offset);
        
        if (batch.length === 0) break;

        // Process each review in the batch
        for (const review of batch) {
          try {
            await this.ingestReview(review);
          } catch (err) {
            logger.warn(`Skipping review ${review.id} due to error:`, err.message);
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
      
      // Round avg_rating for display
      this.stats.avg_rating = Math.round(this.stats.avg_rating * 100) / 100;
      
      logger.info('Review ingestion complete!', { 
        stats: this.stats, 
        duration_ms: duration 
      });

      return { success: true, stats: this.stats, duration };

    } catch (error) {
      logger.error('Review ingestion failed:', error);
      throw error;
    }
  }
}

// Singleton instance
let instance = null;

function getReviewIngestion() {
  if (!instance) {
    instance = new ReviewIngestion();
  }
  return instance;
}

module.exports = {
  ReviewIngestion,
  getReviewIngestion
};
