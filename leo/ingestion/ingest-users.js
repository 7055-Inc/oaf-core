#!/usr/bin/env node

/**
 * Leo AI - User Ingestion Script
 * 
 * Ingests users with all profile data:
 * - Core user data (users table)
 * - Main profile (user_profiles)
 * - Type-specific profiles (artist_profiles, promoter_profiles, community_profiles)
 * - Foundation for future behavior calculations (orders, favorites, reviews)
 * 
 * Layer 1: Raw SQL data from all user tables
 * Layer 2: Computed metadata (to be added: order stats, preference calculations, etc.)
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
      return `${timestamp} [USER-INGESTION] ${level.toUpperCase()}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '..', 'logs/user-ingestion.log') }),
    new winston.transports.Console()
  ]
});

class UserIngestion {
  constructor() {
    this.vectorDB = new VectorDatabase();
    this.dbConnection = null;
    this.stats = {
      total: 0,
      artists: 0,
      promoters: 0,
      community: 0,
      admins: 0,
      with_main_profile: 0,
      with_type_profile: 0
    };
  }

  async initialize() {
    try {
      logger.info('🎨 Initializing user ingestion...');
      
      await this.vectorDB.initialize();
      
      this.dbConnection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'oaf'
      });

      logger.info('✅ User ingestion initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize user ingestion:', error);
      throw error;
    }
  }

  /**
   * Get all users with joined profile data
   */
  async getUsersWithProfiles(lastRun = '1970-01-01 00:00:00') {
    try {
      const [users] = await this.dbConnection.execute(`
        SELECT 
          -- Core user data
          u.id,
          u.username,
          u.email_verified,
          u.user_type,
          u.status,
          u.created_at,
          u.updated_at,
          u.last_login,
          u.onboarding_completed,
          u.marketplace_auto_sort,
          
          -- Main profile data
          up.first_name,
          up.last_name,
          up.phone,
          up.city,
          up.state,
          up.postal_code,
          up.country,
          up.display_name,
          up.website,
          up.bio,
          up.birth_date,
          up.gender,
          up.nationality,
          up.timezone,
          
          -- Social links
          up.social_facebook,
          up.social_instagram,
          up.social_tiktok,
          up.social_twitter,
          up.social_pinterest,
          
          -- Profile images
          up.profile_image_path,
          up.header_image_path,
          
          -- Artist-specific data
          ap.art_categories as artist_art_categories,
          ap.art_mediums as artist_art_mediums,
          ap.business_name as artist_business_name,
          ap.studio_city as artist_studio_city,
          ap.studio_state as artist_studio_state,
          ap.artist_biography,
          ap.does_custom,
          
          -- Promoter-specific data
          pp.business_name as promoter_business_name,
          pp.office_city as promoter_office_city,
          pp.office_state as promoter_office_state,
          pp.is_non_profit,
          pp.organization_size,
          
          -- Community-specific data (preferences!)
          cp.art_style_preferences,
          cp.favorite_colors,
          cp.art_interests,
          cp.wishlist
          
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id = u.id
        LEFT JOIN artist_profiles ap ON ap.user_id = u.id AND u.user_type = 'artist'
        LEFT JOIN promoter_profiles pp ON pp.user_id = u.id AND u.user_type = 'promoter'
        LEFT JOIN community_profiles cp ON cp.user_id = u.id AND u.user_type = 'community'
        WHERE u.updated_at > ?
        ORDER BY u.id
      `, [lastRun]);

      logger.info(`📊 Found ${users.length} users to ingest`);
      return users;
    } catch (error) {
      logger.error('Failed to fetch users:', error);
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
   * Safely parse JSON field
   */
  parseJSON(jsonString) {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      logger.warn('Failed to parse JSON:', jsonString);
      return null;
    }
  }

  /**
   * Build user content for embedding
   */
  buildUserContent(user) {
    const parts = [];
    
    // Basic identity
    const displayName = user.display_name || user.username;
    parts.push(displayName);
    
    // Location
    if (user.city && user.state) {
      parts.push(`from ${user.city}, ${user.state}`);
    }
    
    // User type
    parts.push(`${user.user_type} member`);
    
    // Bio
    if (user.bio) {
      parts.push(user.bio.substring(0, 200));
    }
    
    // Artist-specific
    if (user.user_type === 'artist') {
      if (user.artist_biography) {
        parts.push(user.artist_biography.substring(0, 200));
      }
      const categories = this.parseJSON(user.artist_art_categories);
      if (categories && categories.length) {
        parts.push(`Categories: ${categories.join(', ')}`);
      }
    }
    
    // Community preferences
    if (user.user_type === 'community') {
      const interests = this.parseJSON(user.art_interests);
      if (interests && interests.length) {
        parts.push(`Interests: ${interests.join(', ')}`);
      }
      const colors = this.parseJSON(user.favorite_colors);
      if (colors && colors.length) {
        parts.push(`Favorite colors: ${colors.join(', ')}`);
      }
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
  buildUserMetadata(user) {
    const metadata = {
      // === LAYER 1: Core User Data ===
      user_id: user.id,
      username: user.username,
      user_type: user.user_type,
      status: user.status,
      email_verified: user.email_verified === 'yes',
      onboarding_completed: user.onboarding_completed === 'yes',
      created_at: user.created_at ? user.created_at.toISOString() : null,
      last_login: user.last_login ? user.last_login.toISOString() : null,
      
      // === LAYER 1: Main Profile Data ===
      first_name: user.first_name,
      last_name: user.last_name,
      display_name: user.display_name || user.username,
      phone: user.phone,
      city: user.city,
      state: user.state,
      postal_code: user.postal_code,
      country: user.country || 'USA',
      bio: user.bio,
      website: user.website,
      
      // Social presence
      has_facebook: !!user.social_facebook,
      has_instagram: !!user.social_instagram,
      has_tiktok: !!user.social_tiktok,
      has_twitter: !!user.social_twitter,
      
      // Profile completeness
      has_profile_image: !!user.profile_image_path,
      has_bio: !!user.bio,
      
      // === LAYER 2: Computed Fields ===
      classification: '141', // User preferences (per DATA_CLASSIFICATION.md)
      days_since_signup: this.daysSince(user.created_at),
      days_since_last_login: this.daysSince(user.last_login),
      is_active_user: this.daysSince(user.last_login) < 90,
      
      // Version control
      ingestion_version: 1,
      ingested_at: new Date().toISOString()
    };

    // === Type-Specific Data ===
    if (user.user_type === 'artist') {
      const artCategories = this.parseJSON(user.artist_art_categories);
      const artMediums = this.parseJSON(user.artist_art_mediums);
      
      metadata.artist_business_name = user.artist_business_name;
      metadata.artist_studio_city = user.artist_studio_city;
      metadata.artist_studio_state = user.artist_studio_state;
      metadata.artist_does_custom = user.does_custom === 'yes';
      // Convert arrays to comma-separated strings for ChromaDB
      metadata.artist_categories = artCategories ? artCategories.join(', ') : '';
      metadata.artist_mediums = artMediums ? artMediums.join(', ') : '';
      metadata.has_artist_profile = !!user.artist_business_name;
    }
    
    if (user.user_type === 'promoter') {
      metadata.promoter_business_name = user.promoter_business_name;
      metadata.promoter_office_city = user.promoter_office_city;
      metadata.promoter_office_state = user.promoter_office_state;
      metadata.promoter_is_non_profit = user.is_non_profit === 'yes';
      metadata.promoter_organization_size = user.organization_size;
      metadata.has_promoter_profile = !!user.promoter_business_name;
    }
    
    if (user.user_type === 'community') {
      const stylePrefs = this.parseJSON(user.art_style_preferences);
      const favoriteColors = this.parseJSON(user.favorite_colors);
      const artInterests = this.parseJSON(user.art_interests);
      const wishlist = this.parseJSON(user.wishlist);
      
      // Convert arrays to comma-separated strings for ChromaDB
      metadata.art_style_preferences = stylePrefs ? stylePrefs.join(', ') : '';
      metadata.favorite_colors = favoriteColors ? favoriteColors.join(', ') : '';
      metadata.art_interests = artInterests ? artInterests.join(', ') : '';
      metadata.has_wishlist = !!(wishlist && wishlist.length);
      metadata.has_community_profile = !!(stylePrefs || favoriteColors || artInterests);
      
      // LAYER 2: Preference signals (foundation for future intelligence)
      metadata.has_color_preferences = !!(favoriteColors && favoriteColors.length > 0);
      metadata.has_style_preferences = !!(stylePrefs && stylePrefs.length > 0);
      metadata.has_interest_data = !!(artInterests && artInterests.length > 0);
    }

    // Sanitize metadata to ensure ChromaDB compatibility
    return this.sanitizeMetadata(metadata);
  }

  /**
   * Ingest a single user into vector database
   */
  async ingestUser(user) {
    try {
      const content = this.buildUserContent(user);
      const metadata = this.buildUserMetadata(user);

      await this.vectorDB.addDocuments('user_profiles', [{
        id: `user_${user.id}`,
        content,
        metadata,
        source: 'user_ingestion'
      }]);

      // Update stats
      this.stats.total++;
      this.stats[user.user_type]++;
      if (user.first_name) this.stats.with_main_profile++;
      if (user.artist_business_name || user.promoter_business_name || user.art_style_preferences) {
        this.stats.with_type_profile++;
      }

    } catch (error) {
      logger.error(`Failed to ingest user ${user.id}:`, error);
      throw error;
    }
  }

  /**
   * Run the complete user ingestion
   */
  async run(lastRun = '1970-01-01 00:00:00') {
    try {
      logger.info('🚀 Starting user ingestion...');
      const startTime = Date.now();

      // Get all users with profiles
      const users = await this.getUsersWithProfiles(lastRun);

      if (users.length === 0) {
        logger.info('✅ No users to ingest');
        return { success: true, stats: this.stats };
      }

      // Ingest each user
      for (const user of users) {
        await this.ingestUser(user);
        
        if (this.stats.total % 50 === 0) {
          logger.info(`Progress: ${this.stats.total}/${users.length} users ingested`);
        }
      }

      const duration = Date.now() - startTime;
      logger.info('✅ User ingestion complete!');
      logger.info('📊 Stats:', this.stats);
      logger.info(`⏱️  Duration: ${duration}ms (${(duration/1000).toFixed(2)}s)`);

      return { success: true, stats: this.stats, duration };

    } catch (error) {
      logger.error('❌ User ingestion failed:', error);
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
  const ingestion = new UserIngestion();
  
  // Get last run timestamp from command line arg or use default
  const lastRun = process.argv[2] || '1970-01-01 00:00:00';
  
  ingestion.initialize()
    .then(() => ingestion.run(lastRun))
    .then(result => {
      console.log('✅ User ingestion completed:', result);
      return ingestion.cleanup();
    })
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 User ingestion failed:', error);
      ingestion.cleanup().finally(() => process.exit(1));
    });
}

module.exports = UserIngestion;

