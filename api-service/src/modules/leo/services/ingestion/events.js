/**
 * Leo AI - Event Ingestion Service
 * 
 * Ingests events with related data into ChromaDB:
 * - Core event data (events table)
 * - Event type (event_types table)
 * - Categories (event_categories → categories)
 * - Images (event_images)
 * - Promoter info (users)
 * - Application stats (event_applications counts)
 * - Review aggregates (avg rating, count)
 * 
 * Classification:
 * - 151: Active/upcoming events (discovery, applications)
 * - 152: Past/archived events (historical, trend analysis)
 * - 153: Draft/unclaimed events (admin review)
 * 
 * Target Collection: event_data
 * Uses shared database pool from api-service
 */

const pool = require('../../../../../config/db');
const { getVectorDB } = require('../vectorDB');
const logger = require('../logger');

class EventIngestion {
  constructor() {
    this.vectorDB = null;
    this.stats = {
      total: 0,
      active: 0,
      past: 0,
      draft: 0,
      with_images: 0,
      with_applications: 0,
      with_reviews: 0,
      accepting_applications: 0
    };
  }

  async initialize() {
    try {
      logger.info('Initializing event ingestion...');
      
      this.vectorDB = getVectorDB();
      if (!this.vectorDB.isInitialized) {
        await this.vectorDB.initialize();
      }

      logger.info('Event ingestion initialized');
      return { success: true };
    } catch (error) {
      logger.error('Failed to initialize event ingestion:', error);
      throw error;
    }
  }

  /**
   * Get count of events to process
   */
  async getEventCount(lastRun = '1970-01-01 00:00:00') {
    const [[{ count }]] = await pool.execute(
      'SELECT COUNT(*) as count FROM events WHERE updated_at > ?',
      [lastRun]
    );
    return count;
  }

  /**
   * Get a batch of events with joined related data
   * @param {string} lastRun - ISO timestamp, only get events updated after this
   * @param {number} limit - Batch size
   * @param {number} offset - Offset for pagination
   */
  async getEventBatch(lastRun = '1970-01-01 00:00:00', limit = 1, offset = 0) {
    try {
      const [events] = await pool.execute(`
        SELECT 
          -- Core event data
          e.id,
          e.title,
          e.description,
          e.short_description,
          e.event_status,
          e.application_status,
          e.allow_applications,
          e.start_date,
          e.end_date,
          e.application_deadline,
          e.jury_date,
          e.notification_date,
          
          -- Venue info
          e.venue_name,
          e.venue_address,
          e.venue_city,
          e.venue_state,
          e.venue_zip,
          e.venue_country,
          e.venue_capacity,
          e.latitude,
          e.longitude,
          
          -- Event details
          e.age_restrictions,
          e.has_rsvp,
          e.has_tickets,
          e.rsvp_url,
          e.parking_info,
          e.accessibility_info,
          
          -- Fees
          e.admission_fee,
          e.parking_fee,
          e.application_fee,
          e.jury_fee,
          e.booth_fee,
          
          -- Limits
          e.max_artists,
          e.max_applications,
          
          -- SEO
          e.seo_title,
          e.meta_description,
          e.event_keywords,
          
          -- Timestamps
          e.created_at,
          e.updated_at,
          e.promoter_id,
          
          -- Event type (JOINed)
          et.name as event_type_name,
          et.id as event_type_id,
          
          -- Promoter info (JOINed)
          u.username as promoter_username,
          u.user_type as promoter_type,
          
          -- Primary image
          (SELECT image_url FROM event_images 
           WHERE event_id = e.id AND is_primary = 1 
           LIMIT 1) as primary_image_url,
          (SELECT COUNT(*) FROM event_images 
           WHERE event_id = e.id) as image_count,
          
          -- Application stats
          (SELECT COUNT(*) FROM event_applications 
           WHERE event_id = e.id) as total_applications,
          (SELECT COUNT(*) FROM event_applications 
           WHERE event_id = e.id AND status = 'accepted') as accepted_applications,
          (SELECT COUNT(*) FROM event_applications 
           WHERE event_id = e.id AND status = 'submitted') as pending_applications,
          
          -- Review stats (polymorphic reviews table)
          (SELECT AVG(rating) FROM reviews 
           WHERE reviewable_type = 'event' AND reviewable_id = e.id 
           AND status = 'active') as avg_rating,
          (SELECT COUNT(*) FROM reviews 
           WHERE reviewable_type = 'event' AND reviewable_id = e.id 
           AND status = 'active') as review_count,
          (SELECT COUNT(*) FROM reviews 
           WHERE reviewable_type = 'event' AND reviewable_id = e.id 
           AND status = 'active' AND verified_transaction = 1) as verified_review_count
          
        FROM events e
        LEFT JOIN event_types et ON et.id = e.event_type_id
        LEFT JOIN users u ON u.id = e.promoter_id
        WHERE e.updated_at > ?
        ORDER BY e.id
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `, [lastRun]);

      return events;
    } catch (error) {
      logger.error('Failed to fetch event batch:', error);
      throw error;
    }
  }

  /**
   * Get categories for a specific event
   */
  async getEventCategories(eventId) {
    try {
      const [categories] = await pool.execute(`
        SELECT c.id, c.name, c.parent_id, pc.name as parent_name
        FROM event_categories ec
        JOIN categories c ON c.id = ec.category_id
        LEFT JOIN categories pc ON pc.id = c.parent_id
        WHERE ec.event_id = ?
      `, [eventId]);

      return categories;
    } catch (error) {
      logger.error(`Failed to fetch categories for event ${eventId}:`, error);
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
   * Calculate days until a date (negative if past)
   */
  daysUntil(date) {
    if (!date) return null;
    const now = new Date();
    const target = new Date(date);
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
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
   * Determine classification based on status and dates
   */
  getClassification(event) {
    const now = new Date();
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    
    // Draft or unclaimed events
    if (['draft', 'unclaimed', 'pre-draft'].includes(event.event_status)) {
      return '153'; // Draft events
    }
    
    // Past events (ended)
    if (endDate < now || event.event_status === 'archived') {
      return '152'; // Past events
    }
    
    // Active/upcoming events
    return '151'; // Active events
  }

  /**
   * Build event content for embedding (searchable text)
   */
  buildEventContent(event, categories) {
    const parts = [];
    
    // Event title (most important)
    parts.push(event.title);
    
    // Event type
    if (event.event_type_name) {
      parts.push(`Type: ${event.event_type_name}`);
    }
    
    // Location
    const locationParts = [event.venue_city, event.venue_state, event.venue_country].filter(Boolean);
    if (locationParts.length > 0) {
      parts.push(`Location: ${locationParts.join(', ')}`);
    }
    if (event.venue_name) {
      parts.push(`Venue: ${event.venue_name}`);
    }
    
    // Categories
    if (categories.length > 0) {
      const categoryNames = categories.map(c => c.name);
      parts.push(`Categories: ${categoryNames.join(', ')}`);
    }
    
    // Dates
    if (event.start_date) {
      const startStr = new Date(event.start_date).toLocaleDateString('en-US', { 
        month: 'long', day: 'numeric', year: 'numeric' 
      });
      parts.push(`Date: ${startStr}`);
    }
    
    // Description (truncated)
    if (event.short_description) {
      parts.push(event.short_description.substring(0, 300));
    } else if (event.description) {
      const cleanDesc = event.description.replace(/<[^>]*>/g, ' ').trim();
      parts.push(cleanDesc.substring(0, 300));
    }
    
    // Promoter
    if (event.promoter_username) {
      parts.push(`Hosted by ${event.promoter_username}`);
    }
    
    // Application status
    if (event.application_status === 'accepting') {
      parts.push('Currently accepting applications');
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
  buildEventMetadata(event, categories) {
    const categoryNames = categories.map(c => c.name);
    const categoryIds = categories.map(c => c.id);
    
    const metadata = {
      // === LAYER 1: Core Event Data ===
      event_id: event.id,
      title: event.title,
      event_status: event.event_status,
      application_status: event.application_status,
      allow_applications: event.allow_applications === 1 || event.allow_applications === true,
      promoter_id: event.promoter_id,
      event_type_id: event.event_type_id || 0,
      event_type_name: event.event_type_name || '',
      
      // === LAYER 1: Dates ===
      start_date: event.start_date ? new Date(event.start_date).toISOString() : null,
      end_date: event.end_date ? new Date(event.end_date).toISOString() : null,
      application_deadline: event.application_deadline ? new Date(event.application_deadline).toISOString() : null,
      created_at: event.created_at ? new Date(event.created_at).toISOString() : null,
      updated_at: event.updated_at ? new Date(event.updated_at).toISOString() : null,
      
      // === LAYER 1: Venue/Location ===
      venue_name: event.venue_name || '',
      venue_city: event.venue_city || '',
      venue_state: event.venue_state || '',
      venue_zip: event.venue_zip || '',
      venue_country: event.venue_country || 'USA',
      venue_capacity: parseInt(event.venue_capacity) || 0,
      latitude: event.latitude ? parseFloat(event.latitude) : 0,
      longitude: event.longitude ? parseFloat(event.longitude) : 0,
      has_geo: !!(event.latitude && event.longitude),
      
      // === LAYER 1: Fees ===
      admission_fee: parseFloat(event.admission_fee) || 0,
      application_fee: parseFloat(event.application_fee) || 0,
      jury_fee: parseFloat(event.jury_fee) || 0,
      booth_fee: parseFloat(event.booth_fee) || 0,
      
      // === LAYER 1: Limits ===
      max_artists: parseInt(event.max_artists) || 0,
      max_applications: parseInt(event.max_applications) || 0,
      
      // === LAYER 1: Categories (as strings) ===
      category_names: categoryNames.join(','),
      category_ids: categoryIds.join(','),
      category_count: categories.length,
      
      // === LAYER 1: Promoter ===
      promoter_username: event.promoter_username || '',
      
      // === LAYER 1: Images ===
      primary_image_url: event.primary_image_url || '',
      image_count: parseInt(event.image_count) || 0,
      
      // === LAYER 2: Classification ===
      classification: this.getClassification(event),
      
      // === LAYER 2: Application Stats ===
      total_applications: parseInt(event.total_applications) || 0,
      accepted_applications: parseInt(event.accepted_applications) || 0,
      pending_applications: parseInt(event.pending_applications) || 0,
      
      // === LAYER 2: Review Stats ===
      avg_rating: event.avg_rating ? parseFloat(event.avg_rating) : 0,
      review_count: parseInt(event.review_count) || 0,
      verified_review_count: parseInt(event.verified_review_count) || 0,
      
      // === LAYER 2: Computed Flags ===
      is_upcoming: this.daysUntil(event.start_date) > 0,
      is_past: this.daysUntil(event.end_date) < 0,
      is_accepting: event.application_status === 'accepting',
      is_free_admission: parseFloat(event.admission_fee) === 0,
      is_free_to_apply: parseFloat(event.application_fee) === 0,
      has_images: (parseInt(event.image_count) || 0) > 0,
      has_reviews: (parseInt(event.review_count) || 0) > 0,
      is_highly_rated: (event.avg_rating ? parseFloat(event.avg_rating) : 0) >= 4.0,
      has_capacity: (parseInt(event.max_artists) || 0) > 0,
      
      // === LAYER 2: Temporal ===
      days_until_start: this.daysUntil(event.start_date),
      days_until_deadline: this.daysUntil(event.application_deadline),
      days_since_created: this.daysSince(event.created_at),
      
      // Version control
      ingestion_version: 1,
      ingested_at: new Date().toISOString()
    };

    return this.sanitizeMetadata(metadata);
  }

  /**
   * Ingest a single event into vector database
   */
  async ingestEvent(event) {
    try {
      // Get categories for this event
      const categories = await this.getEventCategories(event.id);
      
      const content = this.buildEventContent(event, categories);
      const metadata = this.buildEventMetadata(event, categories);

      await this.vectorDB.addDocuments('event_data', [{
        id: `event_${event.id}`,
        content,
        metadata,
        source: 'event_ingestion'
      }]);

      // Update stats
      this.stats.total++;
      const classification = this.getClassification(event);
      if (classification === '151') this.stats.active++;
      if (classification === '152') this.stats.past++;
      if (classification === '153') this.stats.draft++;
      if ((event.image_count || 0) > 0) this.stats.with_images++;
      if ((event.total_applications || 0) > 0) this.stats.with_applications++;
      if ((event.review_count || 0) > 0) this.stats.with_reviews++;
      if (event.application_status === 'accepting') this.stats.accepting_applications++;

    } catch (error) {
      logger.error(`Failed to ingest event ${event.id}:`, error);
      throw error;
    }
  }

  /**
   * Run the complete event ingestion - ONE AT A TIME
   * @param {string} lastRun - ISO timestamp, only ingest events updated after this
   * @param {number} batchSize - Events per batch (default 1 - one at a time!)
   * @param {number} delayMs - Delay between events in ms (default 200)
   */
  async run(lastRun = '1970-01-01 00:00:00', batchSize = 1, delayMs = 200) {
    try {
      // Initialize if needed
      if (!this.vectorDB) {
        await this.initialize();
      }

      logger.info(`Starting event ingestion (batch size: ${batchSize})...`);
      const startTime = Date.now();

      // Reset stats
      this.stats = {
        total: 0,
        active: 0,
        past: 0,
        draft: 0,
        with_images: 0,
        with_applications: 0,
        with_reviews: 0,
        accepting_applications: 0,
        batches_processed: 0
      };

      // Get total count first
      const totalCount = await this.getEventCount(lastRun);
      
      if (totalCount === 0) {
        logger.info('No events to ingest');
        return { success: true, stats: this.stats, duration: 0 };
      }

      logger.info(`Found ${totalCount} events to ingest in batches of ${batchSize}`);
      const totalBatches = Math.ceil(totalCount / batchSize);

      // Process in streaming batches
      let offset = 0;
      while (offset < totalCount) {
        // Fetch one batch
        const batch = await this.getEventBatch(lastRun, batchSize, offset);
        
        if (batch.length === 0) break;

        // Process each event in the batch
        for (const event of batch) {
          try {
            await this.ingestEvent(event);
          } catch (err) {
            logger.warn(`Skipping event ${event.id} due to error:`, err.message);
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
      logger.info('Event ingestion complete!', { 
        stats: this.stats, 
        duration_ms: duration 
      });

      return { success: true, stats: this.stats, duration };

    } catch (error) {
      logger.error('Event ingestion failed:', error);
      throw error;
    }
  }
}

// Singleton instance
let instance = null;

function getEventIngestion() {
  if (!instance) {
    instance = new EventIngestion();
  }
  return instance;
}

module.exports = {
  EventIngestion,
  getEventIngestion
};
