/**
 * Leo AI Platform - Data Ingestion Service
 * Automated data collection and vector database population
 */

const mysql = require('mysql2/promise');
const axios = require('axios');
const VectorDatabase = require('../core/vectorDatabase');
const winston = require('winston');
const path = require('path');
const cron = require('node-cron');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [LEO-INGESTION] ${level.toUpperCase()}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../logs/ingestion.log') }),
    new winston.transports.Console()
  ]
});

class DataIngestionService {
  constructor() {
    this.vectorDB = new VectorDatabase();
    this.dbConnection = null;
    this.isRunning = false;
  }

  /**
   * Initialize database connections
   */
  async initialize() {
    try {
      // Initialize vector database
      await this.vectorDB.initialize();

      // Initialize MySQL connection
      this.dbConnection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'oaf_media'
      });

      logger.info('Data ingestion service initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize data ingestion service:', error);
      throw error;
    }
  }

  /**
   * Ingest art/product data from main database
   */
  async ingestArtData() {
    try {
      logger.info('Starting art data ingestion...');

      // Query art/product data from your main database
      const [artworks] = await this.dbConnection.execute(`
        SELECT 
          id,
          title,
          description,
          artist_name as artist,
          medium,
          style,
          price,
          dimensions,
          year_created as year,
          tags,
          user_id,
          created_at,
          updated_at
        FROM products 
        WHERE status = 'active' 
        AND updated_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY updated_at DESC
        LIMIT 1000
      `);

      if (artworks.length === 0) {
        logger.info('No new artworks to ingest');
        return { success: true, count: 0 };
      }

      // Format for vector database
      const documents = artworks.map(artwork => ({
        id: `art_${artwork.id}`,
        content: this.formatArtworkContent(artwork),
        metadata: {
          type: 'artwork',
          original_id: artwork.id,
          title: artwork.title,
          artist: artwork.artist,
          medium: artwork.medium,
          style: artwork.style,
          price: artwork.price,
          dimensions: artwork.dimensions,
          year: artwork.year,
          tags: artwork.tags ? artwork.tags.split(',') : [],
          user_id: artwork.user_id,
          last_updated: artwork.updated_at
        },
        source: 'database_ingestion'
      }));

      // Add to vector database
      const result = await this.vectorDB.addDocuments('art_metadata', documents);
      
      logger.info(`Successfully ingested ${result.count} artworks`);
      return result;

    } catch (error) {
      logger.error('Art data ingestion failed:', error);
      throw error;
    }
  }

  /**
   * Ingest user interaction data for personalization
   */
  async ingestUserInteractions() {
    try {
      logger.info('Starting user interaction ingestion...');

      // Query recent user interactions
      const [interactions] = await this.dbConnection.execute(`
        SELECT 
          ui.id,
          ui.user_id,
          ui.action_type,
          ui.target_id,
          ui.target_type,
          ui.metadata,
          ui.created_at,
          u.username,
          u.preferences
        FROM user_interactions ui
        JOIN users u ON ui.user_id = u.id
        WHERE ui.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY ui.created_at DESC
        LIMIT 5000
      `);

      if (interactions.length === 0) {
        logger.info('No new user interactions to ingest');
        return { success: true, count: 0 };
      }

      // Format for vector database
      const documents = interactions.map(interaction => ({
        id: `interaction_${interaction.id}`,
        content: this.formatInteractionContent(interaction),
        metadata: {
          type: 'user_interaction',
          original_id: interaction.id,
          user_id: interaction.user_id,
          username: interaction.username,
          action_type: interaction.action_type,
          target_id: interaction.target_id,
          target_type: interaction.target_type,
          preferences: interaction.preferences,
          timestamp: interaction.created_at
        },
        source: 'interaction_ingestion'
      }));

      const result = await this.vectorDB.addDocuments('user_interactions', documents);
      
      logger.info(`Successfully ingested ${result.count} user interactions`);
      return result;

    } catch (error) {
      logger.error('User interaction ingestion failed:', error);
      throw error;
    }
  }

  /**
   * Ingest site content (help articles, pages, etc.)
   */
  async ingestSiteContent() {
    try {
      logger.info('Starting site content ingestion...');

      // Query help articles and content
      const [content] = await this.dbConnection.execute(`
        SELECT 
          id,
          title,
          content as body,
          excerpt,
          category,
          tags,
          author,
          published_date,
          updated_at,
          url_slug
        FROM help_articles 
        WHERE status = 'published'
        AND updated_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY updated_at DESC
        LIMIT 500
      `);

      if (content.length === 0) {
        logger.info('No new site content to ingest');
        return { success: true, count: 0 };
      }

      // Format for vector database
      const documents = content.map(item => ({
        id: `content_${item.id}`,
        content: this.formatContentText(item),
        metadata: {
          type: 'site_content',
          original_id: item.id,
          title: item.title,
          category: item.category,
          tags: item.tags ? item.tags.split(',') : [],
          author: item.author,
          published_date: item.published_date,
          url: `/help/${item.url_slug}`,
          last_updated: item.updated_at
        },
        source: 'content_ingestion'
      }));

      const result = await this.vectorDB.addDocuments('site_content', documents);
      
      logger.info(`Successfully ingested ${result.count} content items`);
      return result;

    } catch (error) {
      logger.error('Site content ingestion failed:', error);
      throw error;
    }
  }

  /**
   * Ingest event data for recommendations
   */
  async ingestEventData() {
    try {
      logger.info('Starting event data ingestion...');

      // Query recent events
      const [events] = await this.dbConnection.execute(`
        SELECT 
          id,
          title,
          description,
          location,
          event_date,
          category,
          tags,
          organizer_id,
          attendee_count,
          created_at,
          updated_at
        FROM events 
        WHERE status = 'active'
        AND updated_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY updated_at DESC
        LIMIT 1000
      `);

      if (events.length === 0) {
        logger.info('No new events to ingest');
        return { success: true, count: 0 };
      }

      // Format for vector database
      const documents = events.map(event => ({
        id: `event_${event.id}`,
        content: this.formatEventContent(event),
        metadata: {
          type: 'event',
          original_id: event.id,
          title: event.title,
          location: event.location,
          event_date: event.event_date,
          category: event.category,
          tags: event.tags ? event.tags.split(',') : [],
          organizer_id: event.organizer_id,
          attendee_count: event.attendee_count,
          last_updated: event.updated_at
        },
        source: 'event_ingestion'
      }));

      const result = await this.vectorDB.addDocuments('event_data', documents);
      
      logger.info(`Successfully ingested ${result.count} events`);
      return result;

    } catch (error) {
      logger.error('Event data ingestion failed:', error);
      throw error;
    }
  }

  /**
   * Run full data ingestion cycle
   */
  async runFullIngestion() {
    if (this.isRunning) {
      logger.warn('Ingestion already running, skipping...');
      return;
    }

    try {
      this.isRunning = true;
      logger.info('🎨 [LEO] Starting full data ingestion cycle...');

      const results = await Promise.allSettled([
        this.ingestArtData(),
        this.ingestUserInteractions(),
        this.ingestSiteContent(),
        this.ingestEventData()
      ]);

      // Log results
      const summary = {
        art: results[0].status === 'fulfilled' ? results[0].value.count : 0,
        interactions: results[1].status === 'fulfilled' ? results[1].value.count : 0,
        content: results[2].status === 'fulfilled' ? results[2].value.count : 0,
        events: results[3].status === 'fulfilled' ? results[3].value.count : 0
      };

      const totalIngested = Object.values(summary).reduce((sum, count) => sum + count, 0);
      
      logger.info(`🎨 [LEO] Ingestion cycle completed: ${totalIngested} total items`, summary);

      // Log any failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const types = ['art', 'interactions', 'content', 'events'];
          logger.error(`${types[index]} ingestion failed:`, result.reason);
        }
      });

      return { success: true, summary, totalIngested };

    } catch (error) {
      logger.error('Full ingestion cycle failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Format artwork content for embeddings
   */
  formatArtworkContent(artwork) {
    const parts = [
      artwork.title,
      `by ${artwork.artist}`,
      artwork.description,
      artwork.medium,
      artwork.style,
      artwork.dimensions,
      artwork.year ? `created in ${artwork.year}` : '',
      artwork.tags
    ].filter(Boolean);

    return parts.join(' ').trim();
  }

  /**
   * Format user interaction content for embeddings
   */
  formatInteractionContent(interaction) {
    const metadata = interaction.metadata ? JSON.parse(interaction.metadata) : {};
    
    const parts = [
      `User ${interaction.username}`,
      `performed ${interaction.action_type}`,
      `on ${interaction.target_type}`,
      `ID ${interaction.target_id}`,
      JSON.stringify(metadata)
    ].filter(Boolean);

    return parts.join(' ').trim();
  }

  /**
   * Format content text for embeddings
   */
  formatContentText(content) {
    const parts = [
      content.title,
      content.excerpt,
      content.body,
      content.category,
      content.tags
    ].filter(Boolean);

    return parts.join(' ').trim();
  }

  /**
   * Format event content for embeddings
   */
  formatEventContent(event) {
    const parts = [
      event.title,
      event.description,
      `at ${event.location}`,
      `on ${event.event_date}`,
      event.category,
      event.tags
    ].filter(Boolean);

    return parts.join(' ').trim();
  }

  /**
   * Start scheduled ingestion
   */
  startScheduledIngestion() {
    // Run every 4 hours
    cron.schedule('0 */4 * * *', async () => {
      try {
        logger.info('🎨 [LEO] Scheduled ingestion starting...');
        await this.runFullIngestion();
      } catch (error) {
        logger.error('Scheduled ingestion failed:', error);
      }
    });

    logger.info('🎨 [LEO] Scheduled ingestion started (every 4 hours)');
  }

  /**
   * Health check for ingestion service
   */
  async healthCheck() {
    try {
      const vectorHealth = await this.vectorDB.healthCheck();
      const dbConnected = this.dbConnection && this.dbConnection.connection;

      return {
        status: vectorHealth.healthy && dbConnected ? 'healthy' : 'unhealthy',
        vector_db: vectorHealth,
        mysql_connected: !!dbConnected,
        is_running: this.isRunning,
        last_check: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        last_check: new Date().toISOString()
      };
    }
  }
}

module.exports = DataIngestionService;
