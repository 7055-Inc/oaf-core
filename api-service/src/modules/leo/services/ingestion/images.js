/**
 * Leo AI - Image Analysis Ingestion Service
 * 
 * Pulls AI analysis from the Media VM for all completed images and enriches
 * the appropriate ChromaDB records:
 * 
 *   Product images  → art_metadata (product record)
 *   Event images    → event_data (event record)
 *   Profile images  → user_profiles (user record)
 *   Media library   → user_profiles (user record, general media content)
 *   Article images  → site_content (article record)
 * 
 * Every image also contributes to the uploading artist's visual fingerprint
 * on their user_profiles record (aggregated colors, styles, moods).
 * 
 * Data flow:
 *   pending_images (status=complete) → Media VM /analysis/:mediaId → ChromaDB enrichment
 */

const pool = require('../../../../../config/db');
const { getVectorDB } = require('../vectorDB');
const logger = require('../logger');
const { fetchAnalysisFromBackend } = require('../../../media/services/analysis');

class ImageIngestion {
  constructor() {
    this.vectorDB = null;
    this.stats = {
      total: 0,
      with_analysis: 0,
      products_enriched: 0,
      events_enriched: 0,
      profiles_enriched: 0,
      articles_enriched: 0,
      user_visuals_updated: 0,
      skipped_no_analysis: 0,
      skipped_not_in_vectordb: 0,
      failed: 0
    };
    this.userVisualAccumulator = new Map();
  }

  async initialize() {
    try {
      logger.info('Initializing image analysis ingestion...');

      this.vectorDB = getVectorDB();
      if (!this.vectorDB.isInitialized) {
        await this.vectorDB.initialize();
      }

      logger.info('Image analysis ingestion initialized');
      return { success: true };
    } catch (error) {
      logger.error('Failed to initialize image analysis ingestion:', error);
      throw error;
    }
  }

  async getImageCount(lastRun = '1970-01-01 00:00:00') {
    const [[{ count }]] = await pool.execute(
      `SELECT COUNT(*) as count FROM pending_images 
       WHERE status = 'complete' 
       AND permanent_url IS NOT NULL 
       AND permanent_url REGEXP '^[0-9]+$'
       AND created_at > ?`,
      [lastRun]
    );
    return count;
  }

  async getImageBatch(lastRun = '1970-01-01 00:00:00', limit = 10, offset = 0) {
    try {
      const [images] = await pool.execute(`
        SELECT 
          pi.id,
          pi.user_id,
          pi.image_path,
          pi.permanent_url as media_id,
          pi.original_name,
          pi.mime_type,
          pi.created_at
        FROM pending_images pi
        WHERE pi.status = 'complete'
        AND pi.permanent_url IS NOT NULL
        AND pi.permanent_url REGEXP '^[0-9]+$'
        AND pi.created_at > ?
        ORDER BY pi.id
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `, [lastRun]);

      return images;
    } catch (error) {
      logger.error('Failed to fetch image batch:', error);
      throw error;
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchAnalysis(mediaId) {
    try {
      const { status, data } = await fetchAnalysisFromBackend(mediaId);
      if (status === 404) return null;
      if (status >= 400) {
        logger.warn(`Media VM returned ${status} for media ${mediaId}`);
        return null;
      }
      return data;
    } catch (error) {
      if (error.code === 'CONFIG_MISSING') {
        logger.error('MEDIA_API_KEY not configured - cannot fetch analysis');
      } else if (error.code === 'ECONNREFUSED') {
        logger.error('Media VM is unavailable');
      } else {
        logger.warn(`Error fetching analysis for media ${mediaId}:`, error.message);
      }
      return null;
    }
  }

  // ==========================================
  // Entity finders - match images to records
  // ==========================================

  async findProductByImagePath(imagePath) {
    try {
      const [rows] = await pool.execute(`
        SELECT p.id, p.name, p.vendor_id
        FROM products p
        JOIN product_images pi ON pi.product_id = p.id
        WHERE pi.image_url = ?
        LIMIT 1
      `, [imagePath]);
      return rows[0] || null;
    } catch (error) {
      logger.warn('Error finding product for image:', error.message);
      return null;
    }
  }

  async findEventByImagePath(imagePath) {
    try {
      const [rows] = await pool.execute(`
        SELECT e.id, e.name, e.promoter_id
        FROM events e
        JOIN event_images ei ON ei.event_id = e.id
        WHERE ei.image_url = ?
        LIMIT 1
      `, [imagePath]);
      return rows[0] || null;
    } catch (error) {
      logger.warn('Error finding event for image:', error.message);
      return null;
    }
  }

  async findMediaSubmission(pendingImageId) {
    try {
      const [rows] = await pool.execute(`
        SELECT id, user_id, description
        FROM user_media_submissions
        WHERE pending_image_id = ?
        LIMIT 1
      `, [pendingImageId]);
      return rows[0] || null;
    } catch (error) {
      logger.warn('Error finding media submission:', error.message);
      return null;
    }
  }

  async findArticleByMediaId(mediaId) {
    try {
      const [rows] = await pool.execute(`
        SELECT a.id, a.title
        FROM articles a
        JOIN article_media_seo ams ON ams.article_id = a.id
        WHERE ams.media_id = ?
        LIMIT 1
      `, [mediaId]);
      return rows[0] || null;
    } catch (error) {
      logger.warn('Error finding article for media:', error.message);
      return null;
    }
  }

  // ==========================================
  // Analysis helpers
  // ==========================================

  extractColors(analysis) {
    if (!analysis.dominant_colors) return '';
    try {
      const colors = Array.isArray(analysis.dominant_colors)
        ? analysis.dominant_colors
        : JSON.parse(analysis.dominant_colors);
      return colors.slice(0, 5).join(',');
    } catch (e) {
      return '';
    }
  }

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

  buildVisualMetadata(analysis) {
    return {
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
  }

  // ==========================================
  // Entity enrichment
  // ==========================================

  async enrichProduct(product, analysis) {
    try {
      const result = await this.vectorDB.updateDocumentMetadata(
        'art_metadata',
        `product_${product.id}`,
        this.buildVisualMetadata(analysis)
      );
      if (!result.success) {
        this.stats.skipped_not_in_vectordb++;
        return false;
      }
      this.stats.products_enriched++;
      logger.info(`Enriched product ${product.id} (${product.name})`);
      return true;
    } catch (error) {
      logger.warn(`Failed to enrich product ${product.id}:`, error.message);
      return false;
    }
  }

  async enrichEvent(event, analysis) {
    try {
      const result = await this.vectorDB.updateDocumentMetadata(
        'event_data',
        `event_${event.id}`,
        this.buildVisualMetadata(analysis)
      );
      if (!result.success) {
        this.stats.skipped_not_in_vectordb++;
        return false;
      }
      this.stats.events_enriched++;
      logger.info(`Enriched event ${event.id} (${event.name})`);
      return true;
    } catch (error) {
      logger.warn(`Failed to enrich event ${event.id}:`, error.message);
      return false;
    }
  }

  async enrichArticle(article, analysis) {
    try {
      const result = await this.vectorDB.updateDocumentMetadata(
        'site_content',
        `article_${article.id}`,
        this.buildVisualMetadata(analysis)
      );
      if (!result.success) {
        this.stats.skipped_not_in_vectordb++;
        return false;
      }
      this.stats.articles_enriched++;
      logger.info(`Enriched article ${article.id} (${article.title})`);
      return true;
    } catch (error) {
      logger.warn(`Failed to enrich article ${article.id}:`, error.message);
      return false;
    }
  }

  // ==========================================
  // User visual profile accumulation
  // ==========================================

  /**
   * Accumulate analysis data per user across all their images.
   * After all images are processed, flushUserVisuals() writes
   * the aggregated fingerprint to each user's ChromaDB profile.
   */
  accumulateUserVisual(userId, analysis, source) {
    if (!this.userVisualAccumulator.has(userId)) {
      this.userVisualAccumulator.set(userId, {
        colors: [],
        styles: [],
        mediums: [],
        moods: [],
        subjects: [],
        quality_scores: [],
        sources: { product: 0, event: 0, profile: 0, media_library: 0, article: 0 }
      });
    }

    const acc = this.userVisualAccumulator.get(userId);

    if (analysis.dominant_colors) {
      const colors = Array.isArray(analysis.dominant_colors)
        ? analysis.dominant_colors
        : (() => { try { return JSON.parse(analysis.dominant_colors); } catch(e) { return []; } })();
      acc.colors.push(...colors);
    }
    if (analysis.style_classification) acc.styles.push(analysis.style_classification);
    if (analysis.medium_detected) acc.mediums.push(analysis.medium_detected);
    if (analysis.subject_matter) acc.subjects.push(analysis.subject_matter);
    if (analysis.quality_score) acc.quality_scores.push(analysis.quality_score);
    if (analysis.mood_keywords) {
      const moods = Array.isArray(analysis.mood_keywords)
        ? analysis.mood_keywords
        : (() => { try { return JSON.parse(analysis.mood_keywords); } catch(e) { return []; } })();
      acc.moods.push(...moods);
    }

    if (acc.sources[source] !== undefined) acc.sources[source]++;
  }

  /**
   * Count occurrences and return top N items.
   */
  topN(arr, n = 5) {
    const freq = {};
    arr.forEach(item => { freq[item] = (freq[item] || 0) + 1; });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(e => e[0]);
  }

  /**
   * Write aggregated visual fingerprint to each user's ChromaDB profile.
   */
  async flushUserVisuals() {
    for (const [userId, acc] of this.userVisualAccumulator) {
      try {
        const totalImages = Object.values(acc.sources).reduce((a, b) => a + b, 0);
        const avgQuality = acc.quality_scores.length
          ? Math.round(acc.quality_scores.reduce((a, b) => a + b, 0) / acc.quality_scores.length)
          : 0;

        const visualProfile = {
          visual_top_colors: this.topN(acc.colors, 8).join(','),
          visual_top_styles: this.topN(acc.styles, 5).join(','),
          visual_top_mediums: this.topN(acc.mediums, 5).join(','),
          visual_top_moods: this.topN(acc.moods, 8).join(','),
          visual_top_subjects: this.topN(acc.subjects, 5).join(','),
          visual_avg_quality: avgQuality,
          visual_total_images: totalImages,
          visual_product_images: acc.sources.product,
          visual_event_images: acc.sources.event,
          visual_profile_images: acc.sources.profile,
          visual_media_library_images: acc.sources.media_library,
          visual_article_images: acc.sources.article,
          has_visual_analysis: true,
          visual_analysis_date: new Date().toISOString()
        };

        const result = await this.vectorDB.updateDocumentMetadata(
          'user_profiles',
          `user_${userId}`,
          visualProfile
        );

        if (result.success) {
          this.stats.user_visuals_updated++;
          logger.info(`Updated visual profile for user ${userId} (${totalImages} images across ${Object.entries(acc.sources).filter(e => e[1] > 0).map(e => e[0]).join(', ')})`);
        }
      } catch (error) {
        logger.warn(`Failed to update visual profile for user ${userId}:`, error.message);
      }
    }
  }

  // ==========================================
  // Main processing
  // ==========================================

  /**
   * Determine image source from path, find the entity, enrich it,
   * and accumulate visual data for the user's profile.
   */
  async processImage(image) {
    try {
      this.stats.total++;

      const analysis = await this.fetchAnalysis(image.media_id);
      if (!analysis) {
        this.stats.skipped_no_analysis++;
        return;
      }

      this.stats.with_analysis++;
      const imagePath = image.image_path || '';

      if (imagePath.includes('/products/')) {
        const product = await this.findProductByImagePath(imagePath);
        if (product) {
          await this.enrichProduct(product, analysis);
        }
        this.accumulateUserVisual(image.user_id, analysis, 'product');

      } else if (imagePath.includes('/events/')) {
        const event = await this.findEventByImagePath(imagePath);
        if (event) {
          await this.enrichEvent(event, analysis);
        }
        this.accumulateUserVisual(image.user_id, analysis, 'event');

      } else if (imagePath.includes('/profiles/')) {
        this.accumulateUserVisual(image.user_id, analysis, 'profile');

      } else if (imagePath.includes('/marketing/')) {
        const submission = await this.findMediaSubmission(image.id);
        if (submission) {
          this.accumulateUserVisual(submission.user_id, analysis, 'media_library');
        } else {
          this.accumulateUserVisual(image.user_id, analysis, 'media_library');
        }

      } else if (imagePath.includes('/articles/')) {
        const article = await this.findArticleByMediaId(image.media_id);
        if (article) {
          await this.enrichArticle(article, analysis);
        }
        this.accumulateUserVisual(image.user_id, analysis, 'article');

      } else {
        this.accumulateUserVisual(image.user_id, analysis, 'media_library');
      }

    } catch (error) {
      logger.error(`Failed to process image ${image.media_id}:`, error);
      this.stats.failed++;
    }
  }

  /**
   * @param {string} lastRun - ISO timestamp, only process images created after this
   * @param {number} batchSize - Images per batch (default 10)
   * @param {number} delayMs - Delay between batches in ms (default 300)
   */
  async run(lastRun = '1970-01-01 00:00:00', batchSize = 10, delayMs = 300) {
    try {
      if (!this.vectorDB) {
        await this.initialize();
      }

      logger.info(`Starting image analysis ingestion (batch size: ${batchSize})...`);
      const startTime = Date.now();

      this.stats = {
        total: 0,
        with_analysis: 0,
        products_enriched: 0,
        events_enriched: 0,
        profiles_enriched: 0,
        articles_enriched: 0,
        user_visuals_updated: 0,
        skipped_no_analysis: 0,
        skipped_not_in_vectordb: 0,
        failed: 0,
        batches_processed: 0
      };
      this.userVisualAccumulator.clear();

      const totalCount = await this.getImageCount(lastRun);

      if (totalCount === 0) {
        logger.info('No completed images to process');
        return { success: true, stats: this.stats, duration: 0 };
      }

      logger.info(`Found ${totalCount} completed images to process`);
      const totalBatches = Math.ceil(totalCount / batchSize);

      let offset = 0;
      while (offset < totalCount) {
        const batch = await this.getImageBatch(lastRun, batchSize, offset);
        if (batch.length === 0) break;

        for (const image of batch) {
          try {
            await this.processImage(image);
          } catch (err) {
            logger.warn(`Skipping image ${image.id} due to error:`, err.message);
          }
        }

        this.stats.batches_processed++;
        offset += batchSize;

        const progress = Math.round((offset / totalCount) * 100);
        logger.info(`Progress: ${Math.min(offset, totalCount)}/${totalCount} (${progress}%) - Batch ${this.stats.batches_processed}/${totalBatches}`);

        if (offset < totalCount) {
          await this.delay(delayMs);
        }
      }

      logger.info('Flushing aggregated user visual profiles...');
      await this.flushUserVisuals();

      const duration = Date.now() - startTime;
      logger.info('Image analysis ingestion complete!', {
        stats: this.stats,
        duration_ms: duration
      });

      return { success: true, stats: this.stats, duration };

    } catch (error) {
      logger.error('Image analysis ingestion failed:', error);
      throw error;
    }
  }
}

let instance = null;

function getImageIngestion() {
  if (!instance) {
    instance = new ImageIngestion();
  }
  return instance;
}

module.exports = {
  ImageIngestion,
  getImageIngestion
};
