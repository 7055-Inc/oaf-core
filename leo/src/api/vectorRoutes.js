/**
 * Leo AI Platform - Vector Database API Routes
 * RESTful endpoints for vector operations and semantic search
 */

const express = require('express');
const VectorDatabase = require('../core/vectorDatabase');
const winston = require('winston');
const path = require('path');

const router = express.Router();

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [LEO-API] ${level.toUpperCase()}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../logs/api.log') }),
    new winston.transports.Console()
  ]
});

// Initialize vector database instance
const vectorDB = new VectorDatabase();

// Middleware to ensure vector DB is initialized
const ensureVectorDB = async (req, res, next) => {
  try {
    if (!vectorDB.isInitialized) {
      await vectorDB.initialize();
    }
    next();
  } catch (error) {
    logger.error('Vector DB initialization failed:', error);
    res.status(500).json({
      error: 'Vector database unavailable',
      message: error.message
    });
  }
};

/**
 * POST /api/vector/documents
 * Add documents to a collection
 */
router.post('/documents', ensureVectorDB, async (req, res) => {
  try {
    const { collection, documents } = req.body;

    if (!collection || !documents || !Array.isArray(documents)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Collection name and documents array required'
      });
    }

    const result = await vectorDB.addDocuments(collection, documents);
    
    logger.info(`Added ${result.count} documents to collection '${collection}'`);
    res.json({
      success: true,
      collection,
      ...result
    });

  } catch (error) {
    logger.error('Failed to add documents:', error);
    res.status(500).json({
      error: 'Failed to add documents',
      message: error.message
    });
  }
});

/**
 * POST /api/vector/search
 * Semantic search within a collection
 */
router.post('/search', ensureVectorDB, async (req, res) => {
  try {
    const { query, collection, options = {} } = req.body;

    if (!query || !collection) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Query and collection required'
      });
    }

    const results = await vectorDB.semanticSearch(query, collection, options);
    
    logger.info(`Search completed: ${results.length} results for "${query}" in '${collection}'`);
    res.json({
      success: true,
      query,
      collection,
      results,
      count: results.length
    });

  } catch (error) {
    logger.error('Search failed:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

/**
 * POST /api/vector/multi-search
 * Search across multiple collections
 */
router.post('/multi-search', ensureVectorDB, async (req, res) => {
  try {
    const { query, collections = [], options = {} } = req.body;

    if (!query) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Query required'
      });
    }

    // Default to all collections if none specified
    const searchCollections = collections.length > 0 
      ? collections 
      : ['art_metadata', 'site_content', 'user_interactions', 'event_data'];

    const results = await vectorDB.multiSearch(query, searchCollections, options);
    
    logger.info(`Multi-search completed: ${results.length} total results across ${searchCollections.length} collections`);
    res.json({
      success: true,
      query,
      collections: searchCollections,
      results,
      count: results.length
    });

  } catch (error) {
    logger.error('Multi-search failed:', error);
    res.status(500).json({
      error: 'Multi-search failed',
      message: error.message
    });
  }
});

/**
 * POST /api/vector/learn
 * Add learning feedback for AI improvement
 */
router.post('/learn', ensureVectorDB, async (req, res) => {
  try {
    const interaction = req.body;

    if (!interaction.query || !interaction.response) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Query and response required for learning'
      });
    }

    await vectorDB.addLearningFeedback(interaction);
    
    logger.info('Learning feedback recorded successfully');
    res.json({
      success: true,
      message: 'Learning feedback recorded'
    });

  } catch (error) {
    logger.error('Failed to record learning feedback:', error);
    res.status(500).json({
      error: 'Failed to record learning feedback',
      message: error.message
    });
  }
});

/**
 * GET /api/vector/stats
 * Get vector database statistics
 */
router.get('/stats', ensureVectorDB, async (req, res) => {
  try {
    const stats = await vectorDB.getAllStats();
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get stats:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/vector/stats/:collection
 * Get specific collection statistics
 */
router.get('/stats/:collection', ensureVectorDB, async (req, res) => {
  try {
    const { collection } = req.params;
    const stats = await vectorDB.getCollectionStats(collection);
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Failed to get stats for '${req.params.collection}':`, error);
    res.status(500).json({
      error: 'Failed to get collection statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/vector/health
 * Vector database health check
 */
router.get('/health', async (req, res) => {
  try {
    const health = await vectorDB.healthCheck();
    
    const statusCode = health.healthy ? 200 : 503;
    res.status(statusCode).json(health);

  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      healthy: false,
      error: error.message
    });
  }
});

/**
 * POST /api/vector/ingest/art
 * Specialized endpoint for ingesting art metadata
 */
router.post('/ingest/art', ensureVectorDB, async (req, res) => {
  try {
    const { artworks } = req.body;

    if (!artworks || !Array.isArray(artworks)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Artworks array required'
      });
    }

    // Format artworks for vector storage
    const documents = artworks.map(artwork => ({
      id: artwork.id || `art_${Date.now()}_${Math.random()}`,
      content: `${artwork.title || ''} ${artwork.description || ''} ${artwork.medium || ''} ${artwork.style || ''}`.trim(),
      metadata: {
        type: 'artwork',
        title: artwork.title,
        artist: artwork.artist,
        medium: artwork.medium,
        style: artwork.style,
        price: artwork.price,
        dimensions: artwork.dimensions,
        year: artwork.year,
        tags: artwork.tags || [],
        user_id: artwork.user_id
      },
      source: 'art_ingestion'
    }));

    const result = await vectorDB.addDocuments('art_metadata', documents);
    
    logger.info(`Ingested ${result.count} artworks into vector database`);
    res.json({
      success: true,
      message: `Successfully ingested ${result.count} artworks`,
      ...result
    });

  } catch (error) {
    logger.error('Art ingestion failed:', error);
    res.status(500).json({
      error: 'Art ingestion failed',
      message: error.message
    });
  }
});

/**
 * POST /api/vector/ingest/content
 * Specialized endpoint for ingesting site content
 */
router.post('/ingest/content', ensureVectorDB, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !Array.isArray(content)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Content array required'
      });
    }

    // Format content for vector storage
    const documents = content.map(item => ({
      id: item.id || `content_${Date.now()}_${Math.random()}`,
      content: `${item.title || ''} ${item.body || ''} ${item.excerpt || ''}`.trim(),
      metadata: {
        type: 'site_content',
        title: item.title,
        url: item.url,
        category: item.category,
        tags: item.tags || [],
        author: item.author,
        published_date: item.published_date
      },
      source: 'content_ingestion'
    }));

    const result = await vectorDB.addDocuments('site_content', documents);
    
    logger.info(`Ingested ${result.count} content items into vector database`);
    res.json({
      success: true,
      message: `Successfully ingested ${result.count} content items`,
      ...result
    });

  } catch (error) {
    logger.error('Content ingestion failed:', error);
    res.status(500).json({
      error: 'Content ingestion failed',
      message: error.message
    });
  }
});

module.exports = router;
