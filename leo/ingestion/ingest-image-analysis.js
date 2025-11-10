#!/usr/bin/env node

/**
 * Leo AI - Image Analysis Ingestion Script
 * 
 * Fetches AI analysis data from the Media Processing VM and enriches:
 * - Products with visual metadata (colors, style, mood)
 * - User profiles with visual preference signals
 * 
 * This creates Layer 2 visual intelligence metadata for semantic search
 * and Layer 3 pattern discovery (color preferences, style correlations)
 * 
 * Data Sources:
 * - pending_images table (links temp paths to media IDs)
 * - Media VM: /analysis/:mediaId endpoint
 * - Existing vector database records (products, users)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const axios = require('axios');
const VectorDatabase = require('../src/core/vectorDatabase');
const winston = require('winston');
const path = require('path');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [IMAGE-ANALYSIS] ${level.toUpperCase()}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '..', 'logs/image-analysis-ingestion.log') }),
    new winston.transports.Console()
  ]
});

// Media VM configuration (from media.js)
const MEDIA_BACKEND_URL = process.env.MEDIA_BACKEND_URL || 'http://10.128.0.29:3001';
const MEDIA_API_KEY = 'media_20074c47e0d2af1a90b1d9ba1d001648:eb7d555c29ce59c6202f3975b37a45cdc2e7a21eb09c6d684e982ebee5cc9e6a';

class ImageAnalysisIngestion {
  constructor() {
    this.vectorDB = new VectorDatabase();
    this.dbConnection = null;
    this.stats = {
      total_images: 0,
      with_analysis: 0,
      products_enriched: 0,
      profiles_enriched: 0,
      failed: 0
    };
  }

  async initialize() {
    try {
      logger.info('🎨 Initializing image analysis ingestion...');
      
      await this.vectorDB.initialize();
      
      this.dbConnection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'oaf'
      });

      logger.info('✅ Image analysis ingestion initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Get all processed images with their media IDs
   */
  async getProcessedImages() {
    try {
      const [images] = await this.dbConnection.execute(`
        SELECT 
          id,
          user_id,
          image_path,
          permanent_url as media_id,
          original_name,
          mime_type,
          status,
          created_at
        FROM pending_images
        WHERE status = 'complete'
        AND permanent_url IS NOT NULL
        AND permanent_url REGEXP '^[0-9]+$'
        ORDER BY id
      `);

      logger.info(`📊 Found ${images.length} processed images with AI analysis`);
      return images;
    } catch (error) {
      logger.error('Failed to fetch processed images:', error);
      throw error;
    }
  }

  /**
   * Fetch AI analysis from Media VM
   */
  async fetchAIAnalysis(mediaId) {
    try {
      const response = await axios.get(`${MEDIA_BACKEND_URL}/analysis/${mediaId}`, {
        headers: {
          'Authorization': MEDIA_API_KEY
        },
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 404) {
        return null;
      }

      if (response.status >= 400) {
        logger.warn(`Failed to fetch analysis for media ${mediaId}: ${response.status}`);
        return null;
      }

      return response.data;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        logger.error('Media VM is unavailable');
      } else {
        logger.warn(`Error fetching analysis for media ${mediaId}:`, error.message);
      }
      return null;
    }
  }

  /**
   * Determine what entity this image belongs to
   */
  parseImagePath(imagePath) {
    // Example paths:
    // /temp_images/products/1000000007-new-1752259798126.jpg → product
    // /temp_images/profiles/123-profile-1752259798126.jpg → user profile
    // /temp_images/profiles/123-header-1752259798126.jpg → user header
    // /temp_images/profiles/123-logo-1752259798126.jpg → user logo
    
    if (imagePath.includes('/products/')) {
      const match = imagePath.match(/\/products\/(\d+)/);
      return {
        entity_type: 'product',
        vendor_id: match ? parseInt(match[1]) : null,
        image_type: 'product'
      };
    }
    
    if (imagePath.includes('/profiles/')) {
      const match = imagePath.match(/\/profiles\/(\d+)-(profile|header|logo)/);
      return {
        entity_type: 'user',
        user_id: match ? parseInt(match[1]) : null,
        image_type: match ? match[2] : 'profile'
      };
    }
    
    if (imagePath.includes('/sites/')) {
      const match = imagePath.match(/\/sites\/(\d+)/);
      return {
        entity_type: 'site',
        site_id: match ? parseInt(match[1]) : null,
        image_type: 'site'
      };
    }
    
    return { entity_type: 'unknown', image_type: 'unknown' };
  }

  /**
   * Extract dominant colors as comma-separated string
   */
  extractColors(analysis) {
    if (!analysis.dominant_colors) return '';
    
    try {
      const colors = Array.isArray(analysis.dominant_colors) 
        ? analysis.dominant_colors 
        : JSON.parse(analysis.dominant_colors);
      return colors.slice(0, 5).join(','); // Top 5 colors
    } catch (e) {
      return '';
    }
  }

  /**
   * Extract mood keywords as comma-separated string
   */
  extractMoodKeywords(analysis) {
    if (!analysis.mood_keywords) return '';
    
    try {
      const moods = Array.isArray(analysis.mood_keywords)
        ? analysis.mood_keywords
        : JSON.parse(analysis.mood_keywords);
      return moods.join(',');
    } catch (e) {
      return '';
    }
  }

  /**
   * Find the product this image belongs to
   */
  async findProductForImage(imagePath, vendorId) {
    try {
      // Extract product ID from image path or query product_images table
      const [products] = await this.dbConnection.execute(`
        SELECT DISTINCT p.id, p.name
        FROM products p
        JOIN product_images pi ON pi.product_id = p.id
        WHERE pi.image_url LIKE ?
        AND p.vendor_id = ?
        LIMIT 1
      `, [`%${path.basename(imagePath)}%`, vendorId]);

      return products[0] || null;
    } catch (error) {
      logger.warn('Error finding product:', error.message);
      return null;
    }
  }

  /**
   * Enrich a product document with visual analysis
   */
  async enrichProduct(product, analysis) {
    try {
      // Add visual metadata to existing product document
      const visualMetadata = {
        // Visual Layer 2 data
        visual_dominant_colors: this.extractColors(analysis),
        visual_style: analysis.style_classification || '',
        visual_medium: analysis.medium_detected || '',
        visual_subject: analysis.subject_matter || '',
        visual_quality_score: analysis.quality_score || 0,
        visual_mood: this.extractMoodKeywords(analysis),
        visual_confidence: analysis.confidence_score || 0,
        has_visual_analysis: true,
        visual_analysis_date: new Date().toISOString()
      };

      // Update the product document in vector DB
      await this.vectorDB.updateDocumentMetadata(
        'art_metadata',
        `product_${product.id}`,
        visualMetadata
      );

      this.stats.products_enriched++;
      return true;
    } catch (error) {
      logger.warn(`Failed to enrich product ${product.id}:`, error.message);
      return false;
    }
  }

  /**
   * Process a single image
   */
  async processImage(image) {
    try {
      this.stats.total_images++;
      
      // Fetch AI analysis from Media VM
      const analysis = await this.fetchAIAnalysis(image.media_id);
      
      if (!analysis) {
        this.stats.failed++;
        return;
      }
      
      this.stats.with_analysis++;
      
      // Determine what this image is for
      const parsed = this.parseImagePath(image.image_path);
      
      // Handle product images
      if (parsed.entity_type === 'product' && parsed.vendor_id) {
        const product = await this.findProductForImage(image.image_path, parsed.vendor_id);
        
        if (product) {
          await this.enrichProduct(product, analysis);
          logger.info(`✅ Enriched product ${product.id} (${product.name}) with visual analysis`);
        }
      }
      
      // TODO: Handle user profile images (for future user visual preferences)
      // TODO: Handle site images
      
    } catch (error) {
      logger.error(`Failed to process image ${image.media_id}:`, error);
      this.stats.failed++;
    }
  }

  /**
   * Run the complete image analysis ingestion
   */
  async run() {
    try {
      logger.info('🚀 Starting image analysis ingestion...');
      const startTime = Date.now();

      // Get all processed images
      const images = await this.getProcessedImages();

      if (images.length === 0) {
        logger.info('✅ No processed images to analyze');
        return { success: true, stats: this.stats };
      }

      // Process each image
      for (const image of images) {
        await this.processImage(image);
        
        if (this.stats.total_images % 10 === 0) {
          logger.info(`Progress: ${this.stats.total_images}/${images.length} images processed`);
        }
      }

      const duration = Date.now() - startTime;
      logger.info('✅ Image analysis ingestion complete!');
      logger.info('📊 Stats:', this.stats);
      logger.info(`⏱️  Duration: ${duration}ms (${(duration/1000).toFixed(2)}s)`);

      return { success: true, stats: this.stats, duration };

    } catch (error) {
      logger.error('❌ Image analysis ingestion failed:', error);
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
  const ingestion = new ImageAnalysisIngestion();
  
  ingestion.initialize()
    .then(() => ingestion.run())
    .then(result => {
      console.log('✅ Image analysis ingestion completed:', result);
      return ingestion.cleanup();
    })
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Image analysis ingestion failed:', error);
      ingestion.cleanup().finally(() => process.exit(1));
    });
}

module.exports = ImageAnalysisIngestion;

