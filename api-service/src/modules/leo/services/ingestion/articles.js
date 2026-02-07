/**
 * Leo AI - Articles Ingestion Service
 * 
 * Ingests articles/pages/help content into ChromaDB:
 * - Core article data (articles table)
 * - Tags (article_tags via article_tag_relations)
 * - Topics (article_topics via article_topic_relations)
 * - SEO metadata (article_seo)
 * - Author info (users)
 * 
 * Classification:
 * - 171: Published articles (blog posts)
 * - 172: Help articles (knowledge base)
 * - 173: Static pages (about, contact, services)
 * - 174: Draft/unpublished content
 * 
 * Target Collection: site_content
 * Uses shared database pool from api-service
 */

const pool = require('../../../../../config/db');
const { getVectorDB } = require('../vectorDB');
const logger = require('../logger');

class ArticleIngestion {
  constructor() {
    this.vectorDB = null;
    this.stats = {
      total: 0,
      published: 0,
      draft: 0,
      articles: 0,
      help_articles: 0,
      pages: 0,
      with_tags: 0,
      with_topics: 0
    };
  }

  async initialize() {
    try {
      logger.info('Initializing article ingestion...');
      
      this.vectorDB = getVectorDB();
      if (!this.vectorDB.isInitialized) {
        await this.vectorDB.initialize();
      }

      logger.info('Article ingestion initialized');
      return { success: true };
    } catch (error) {
      logger.error('Failed to initialize article ingestion:', error);
      throw error;
    }
  }

  /**
   * Get count of articles to process
   */
  async getArticleCount(lastRun = '1970-01-01 00:00:00') {
    const [[{ count }]] = await pool.execute(
      'SELECT COUNT(*) as count FROM articles WHERE updated_at > ?',
      [lastRun]
    );
    return count;
  }

  /**
   * Get a batch of articles with joined related data
   * @param {string} lastRun - ISO timestamp, only get articles updated after this
   * @param {number} limit - Batch size
   * @param {number} offset - Offset for pagination
   */
  async getArticleBatch(lastRun = '1970-01-01 00:00:00', limit = 1, offset = 0) {
    try {
      const [articles] = await pool.execute(`
        SELECT 
          -- Core article data
          a.id,
          a.title,
          a.slug,
          a.content,
          a.excerpt,
          a.author_id,
          a.status,
          a.site_menu_display,
          a.site_blog_display,
          a.menu_order,
          a.page_type,
          a.published_at,
          a.created_at,
          a.updated_at,
          
          -- Author info (JOINed)
          u.username as author_username,
          u.user_type as author_type,
          
          -- SEO data (JOINed)
          seo.meta_title,
          seo.meta_description,
          seo.meta_keywords,
          seo.focus_keyword,
          seo.readability_score,
          
          -- Featured image
          m.file_path as featured_image_url
          
        FROM articles a
        LEFT JOIN users u ON u.id = a.author_id
        LEFT JOIN article_seo seo ON seo.article_id = a.id
        LEFT JOIN media_library m ON m.id = a.featured_image_id
        WHERE a.updated_at > ?
        ORDER BY a.id
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `, [lastRun]);

      return articles;
    } catch (error) {
      logger.error('Failed to fetch article batch:', error);
      throw error;
    }
  }

  /**
   * Get tags for a specific article
   */
  async getArticleTags(articleId) {
    try {
      const [tags] = await pool.execute(`
        SELECT t.id, t.name, t.slug
        FROM article_tags t
        JOIN article_tag_relations atr ON atr.tag_id = t.id
        WHERE atr.article_id = ?
      `, [articleId]);

      return tags;
    } catch (error) {
      logger.error(`Failed to fetch tags for article ${articleId}:`, error);
      return [];
    }
  }

  /**
   * Get topics for a specific article
   */
  async getArticleTopics(articleId) {
    try {
      const [topics] = await pool.execute(`
        SELECT t.id, t.name, t.slug, t.parent_id
        FROM article_topics t
        JOIN article_topic_relations atr ON atr.topic_id = t.id
        WHERE atr.article_id = ?
      `, [articleId]);

      return topics;
    } catch (error) {
      logger.error(`Failed to fetch topics for article ${articleId}:`, error);
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
   * Calculate days since a date
   */
  daysSince(date) {
    if (!date) return null;
    const now = new Date();
    const then = new Date(date);
    return Math.floor((now - then) / (1000 * 60 * 60 * 24));
  }

  /**
   * Determine classification based on status and page_type
   */
  getClassification(article) {
    // Draft content
    if (article.status !== 'published') {
      return '174'; // Draft/unpublished
    }
    
    // By page type
    switch (article.page_type) {
      case 'help_article':
        return '172'; // Help articles
      case 'page':
      case 'about':
      case 'services':
      case 'contact':
        return '173'; // Static pages
      case 'article':
      default:
        return '171'; // Published articles (blog)
    }
  }

  /**
   * Strip HTML tags from content
   */
  stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Build article content for embedding (searchable text)
   */
  buildArticleContent(article, tags, topics) {
    const parts = [];
    
    // Title (most important)
    parts.push(article.title);
    
    // Page type context
    if (article.page_type === 'help_article') {
      parts.push('Help Article');
    } else if (article.page_type === 'article') {
      parts.push('Blog Post');
    } else if (['page', 'about', 'services', 'contact'].includes(article.page_type)) {
      parts.push('Page');
    }
    
    // Excerpt or content summary
    if (article.excerpt) {
      parts.push(article.excerpt.substring(0, 300));
    } else if (article.content) {
      const cleanContent = this.stripHtml(article.content);
      parts.push(cleanContent.substring(0, 300));
    }
    
    // Topics
    if (topics.length > 0) {
      const topicNames = topics.map(t => t.name);
      parts.push(`Topics: ${topicNames.join(', ')}`);
    }
    
    // Tags
    if (tags.length > 0) {
      const tagNames = tags.map(t => t.name);
      parts.push(`Tags: ${tagNames.join(', ')}`);
    }
    
    // Author
    if (article.author_username) {
      parts.push(`By ${article.author_username}`);
    }
    
    // SEO focus keyword
    if (article.focus_keyword) {
      parts.push(`Focus: ${article.focus_keyword}`);
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
  buildArticleMetadata(article, tags, topics) {
    const tagNames = tags.map(t => t.name);
    const tagIds = tags.map(t => t.id);
    const topicNames = topics.map(t => t.name);
    const topicIds = topics.map(t => t.id);
    
    // Estimate reading time (avg 200 words per minute)
    const wordCount = article.content ? this.stripHtml(article.content).split(/\s+/).length : 0;
    const readingTimeMinutes = Math.ceil(wordCount / 200);

    const metadata = {
      // === LAYER 1: Core Article Data ===
      article_id: article.id,
      title: article.title,
      slug: article.slug,
      status: article.status,
      page_type: article.page_type || 'article',
      author_id: article.author_id,
      
      // === LAYER 1: Display Settings ===
      site_menu_display: article.site_menu_display === 'yes',
      site_blog_display: article.site_blog_display === 'yes',
      menu_order: parseInt(article.menu_order) || 0,
      
      // === LAYER 1: Timestamps ===
      published_at: article.published_at ? new Date(article.published_at).toISOString() : null,
      created_at: article.created_at ? new Date(article.created_at).toISOString() : null,
      updated_at: article.updated_at ? new Date(article.updated_at).toISOString() : null,
      
      // === LAYER 1: Author ===
      author_username: article.author_username || '',
      author_type: article.author_type || '',
      
      // === LAYER 1: SEO ===
      meta_title: article.meta_title || '',
      meta_description: article.meta_description || '',
      meta_keywords: article.meta_keywords || '',
      focus_keyword: article.focus_keyword || '',
      readability_score: parseInt(article.readability_score) || 0,
      
      // === LAYER 1: Featured Image ===
      featured_image_url: article.featured_image_url || '',
      has_featured_image: !!article.featured_image_url,
      
      // === LAYER 1: Tags & Topics (as strings) ===
      tag_names: tagNames.join(','),
      tag_ids: tagIds.join(','),
      tag_count: tags.length,
      topic_names: topicNames.join(','),
      topic_ids: topicIds.join(','),
      topic_count: topics.length,
      
      // === LAYER 2: Classification ===
      classification: this.getClassification(article),
      
      // === LAYER 2: Content Metrics ===
      word_count: wordCount,
      reading_time_minutes: readingTimeMinutes,
      has_excerpt: !!article.excerpt,
      
      // === LAYER 2: Computed Flags ===
      is_published: article.status === 'published',
      is_blog_post: article.page_type === 'article' && article.site_blog_display === 'yes',
      is_help_article: article.page_type === 'help_article',
      is_menu_item: article.site_menu_display === 'yes',
      has_tags: tags.length > 0,
      has_topics: topics.length > 0,
      
      // === LAYER 2: Age ===
      days_since_published: this.daysSince(article.published_at),
      days_since_updated: this.daysSince(article.updated_at),
      
      // Version control
      ingestion_version: 1,
      ingested_at: new Date().toISOString()
    };

    return this.sanitizeMetadata(metadata);
  }

  /**
   * Ingest a single article into vector database
   */
  async ingestArticle(article) {
    try {
      // Get tags and topics for this article
      const tags = await this.getArticleTags(article.id);
      const topics = await this.getArticleTopics(article.id);
      
      const content = this.buildArticleContent(article, tags, topics);
      const metadata = this.buildArticleMetadata(article, tags, topics);

      await this.vectorDB.addDocuments('site_content', [{
        id: `article_${article.id}`,
        content,
        metadata,
        source: 'article_ingestion'
      }]);

      // Update stats
      this.stats.total++;
      if (article.status === 'published') this.stats.published++;
      else this.stats.draft++;
      
      switch (article.page_type) {
        case 'article':
          this.stats.articles++;
          break;
        case 'help_article':
          this.stats.help_articles++;
          break;
        default:
          this.stats.pages++;
      }
      
      if (tags.length > 0) this.stats.with_tags++;
      if (topics.length > 0) this.stats.with_topics++;

    } catch (error) {
      logger.error(`Failed to ingest article ${article.id}:`, error);
      throw error;
    }
  }

  /**
   * Run the complete article ingestion - ONE AT A TIME
   * @param {string} lastRun - ISO timestamp, only ingest articles updated after this
   * @param {number} batchSize - Articles per batch (default 1 - one at a time!)
   * @param {number} delayMs - Delay between articles in ms (default 200)
   */
  async run(lastRun = '1970-01-01 00:00:00', batchSize = 1, delayMs = 200) {
    try {
      // Initialize if needed
      if (!this.vectorDB) {
        await this.initialize();
      }

      logger.info(`Starting article ingestion (batch size: ${batchSize})...`);
      const startTime = Date.now();

      // Reset stats
      this.stats = {
        total: 0,
        published: 0,
        draft: 0,
        articles: 0,
        help_articles: 0,
        pages: 0,
        with_tags: 0,
        with_topics: 0,
        batches_processed: 0
      };

      // Get total count first
      const totalCount = await this.getArticleCount(lastRun);
      
      if (totalCount === 0) {
        logger.info('No articles to ingest');
        return { success: true, stats: this.stats, duration: 0 };
      }

      logger.info(`Found ${totalCount} articles to ingest in batches of ${batchSize}`);
      const totalBatches = Math.ceil(totalCount / batchSize);

      // Process in streaming batches
      let offset = 0;
      while (offset < totalCount) {
        // Fetch one batch
        const batch = await this.getArticleBatch(lastRun, batchSize, offset);
        
        if (batch.length === 0) break;

        // Process each article in the batch
        for (const article of batch) {
          try {
            await this.ingestArticle(article);
          } catch (err) {
            logger.warn(`Skipping article ${article.id} due to error:`, err.message);
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
      logger.info('Article ingestion complete!', { 
        stats: this.stats, 
        duration_ms: duration 
      });

      return { success: true, stats: this.stats, duration };

    } catch (error) {
      logger.error('Article ingestion failed:', error);
      throw error;
    }
  }
}

// Singleton instance
let instance = null;

function getArticleIngestion() {
  if (!instance) {
    instance = new ArticleIngestion();
  }
  return instance;
}

module.exports = {
  ArticleIngestion,
  getArticleIngestion
};
