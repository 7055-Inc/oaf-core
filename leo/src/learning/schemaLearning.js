/**
 * Schema-Aware Learning System
 * Automatically learns data relationships from database structure and content
 */

const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [LEO-SCHEMA] ${level.toUpperCase()}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../logs/schema-learning.log') }),
    new winston.transports.Console()
  ]
});

class SchemaLearningSystem {
  constructor() {
    this.learnedRelationships = new Map();
    this.categoryPatterns = new Map();
    this.fieldSemantics = new Map();
  }

  /**
   * Automatically categorize data based on learned patterns
   */
  async smartCategorize(record) {
    const metadata = record.metadata || {};
    const content = record.content || '';
    
    // Learn from field patterns
    const category = this.inferCategoryFromStructure(metadata, content);
    
    // Update learning patterns
    this.updateLearningPatterns(record, category);
    
    return category;
  }

  /**
   * Infer category from data structure and content
   */
  inferCategoryFromStructure(metadata, content) {
    // Product indicators (foreign keys, pricing, inventory)
    if (this.hasProductIndicators(metadata, content)) {
      return 'products';
    }
    
    // User/Artist indicators (profiles, contact info, bio)
    if (this.hasUserIndicators(metadata, content)) {
      return 'artists';
    }
    
    // Content indicators (text, publishing, articles)
    if (this.hasContentIndicators(metadata, content)) {
      return 'articles';
    }
    
    // Event indicators (dates, locations, scheduling)
    if (this.hasEventIndicators(metadata, content)) {
      return 'events';
    }
    
    return 'other';
  }

  hasProductIndicators(metadata, content) {
    // Foreign key relationships to products
    if (metadata.product_id || metadata.vendor_id || metadata.category_id) {
      return true;
    }
    
    // Pricing/commerce fields
    if (metadata.price || metadata.cost || metadata.inventory || metadata.sku) {
      return true;
    }
    
    // Product attributes
    if (metadata.source_table && [
      'products', 'product_variations', 'user_variation_values', 
      'product_categories', 'inventory', 'pricing'
    ].includes(metadata.source_table)) {
      return true;
    }
    
    // Content patterns
    if (content && /\b(price|cost|\$|product|item|variation|color|size|material)\b/i.test(content)) {
      return true;
    }
    
    return false;
  }

  hasUserIndicators(metadata, content) {
    // User/profile fields
    if (metadata.user_id || metadata.artist_id || metadata.display_name || 
        metadata.business_name || metadata.email || metadata.phone) {
      return true;
    }
    
    // Profile tables
    if (metadata.source_table && [
      'users', 'artist_profiles', 'user_profiles', 'artists', 'vendors'
    ].includes(metadata.source_table)) {
      return true;
    }
    
    // Content patterns
    if (content && /\b(artist|profile|bio|contact|gallery|portfolio)\b/i.test(content)) {
      return true;
    }
    
    return false;
  }

  hasContentIndicators(metadata, content) {
    // Content fields
    if (metadata.title || metadata.body || metadata.excerpt || 
        metadata.published_at || metadata.author) {
      return true;
    }
    
    // Content tables
    if (metadata.source_table && [
      'articles', 'blog_posts', 'pages', 'content', 'posts'
    ].includes(metadata.source_table)) {
      return true;
    }
    
    // Exclude product variations that got miscategorized
    if (metadata.source_table === 'user_variation_values' || 
        metadata.source_table === 'product_variations') {
      return false;
    }
    
    // Content patterns (but not product attributes)
    if (content && content.length > 100 && 
        /\b(article|blog|post|content|story|news)\b/i.test(content) &&
        !/\b(product_id|variation|color|size|price)\b/i.test(content)) {
      return true;
    }
    
    return false;
  }

  hasEventIndicators(metadata, content) {
    // Event fields
    if (metadata.start_date || metadata.end_date || metadata.event_date || 
        metadata.location || metadata.venue || metadata.event_type) {
      return true;
    }
    
    // Event tables
    if (metadata.source_table && [
      'events', 'calendar', 'bookings', 'appointments', 'shows'
    ].includes(metadata.source_table)) {
      return true;
    }
    
    // Content patterns
    if (content && /\b(event|show|exhibition|workshop|class|booking|calendar)\b/i.test(content)) {
      return true;
    }
    
    return false;
  }

  /**
   * Update learning patterns based on successful categorizations
   */
  updateLearningPatterns(record, category) {
    const sourceTable = record.metadata?.source_table;
    
    if (sourceTable) {
      // Track which tables belong to which categories
      if (!this.categoryPatterns.has(category)) {
        this.categoryPatterns.set(category, new Set());
      }
      this.categoryPatterns.get(category).add(sourceTable);
      
      logger.info(`Learned: ${sourceTable} → ${category}`);
    }
    
    // Learn field semantics
    Object.keys(record.metadata || {}).forEach(field => {
      if (!this.fieldSemantics.has(field)) {
        this.fieldSemantics.set(field, new Map());
      }
      
      const fieldMap = this.fieldSemantics.get(field);
      fieldMap.set(category, (fieldMap.get(category) || 0) + 1);
    });
  }

  /**
   * Filter out low-quality results automatically
   */
  isQualityResult(record) {
    const metadata = record.metadata || {};
    const content = record.content || '';
    
    // Skip empty or very short content
    if (!content || content.trim().length < 10) {
      return false;
    }
    
    // Skip standalone variations without context
    if (metadata.source_table === 'user_variation_values' && 
        !metadata.product_id && content.length < 50) {
      return false;
    }
    
    // Skip technical/system records
    if (content.match(/^(id|uuid|token|hash):/i)) {
      return false;
    }
    
    // Skip records that are just IDs or numbers
    if (/^\d+$/.test(content.trim())) {
      return false;
    }
    
    return true;
  }

  /**
   * Get learned insights about data patterns
   */
  getLearningInsights() {
    const insights = {
      categoryPatterns: {},
      fieldSemantics: {},
      totalLearned: this.categoryPatterns.size
    };
    
    // Convert Maps to objects for JSON serialization
    this.categoryPatterns.forEach((tables, category) => {
      insights.categoryPatterns[category] = Array.from(tables);
    });
    
    this.fieldSemantics.forEach((categories, field) => {
      insights.fieldSemantics[field] = Object.fromEntries(categories);
    });
    
    return insights;
  }
}

module.exports = SchemaLearningSystem;
