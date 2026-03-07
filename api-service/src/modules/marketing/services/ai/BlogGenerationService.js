/**
 * BlogGenerationService - Auto-Blog Article Generation Orchestrator
 * 
 * Coordinates the full article generation pipeline:
 * 1. Topic selection (weighted, dedup-aware)
 * 2. Platform context gathering (ChromaDB + SQL)
 * 3. Claude article generation (Editor.js blocks)
 * 4. Article creation (articles table + SEO + schema)
 * 5. Social draft generation on publish
 */

const db = require('../../../../../config/db');
const { getClaudeService } = require('./ClaudeService');
const { getVectorDB } = require('../../../leo/services/vectorDB');

let instance = null;

const DEFAULT_AUTHOR_ID = parseInt(process.env.AUTO_BLOG_AUTHOR_ID) || 1000000007;

const DEFAULT_RATIOS = {
  'how-to': 25,
  'faq': 15,
  'pillar': 15,
  'news': 15,
  'listicle': 10,
  'spotlight': 10,
  'comparison': 5,
  'roundup': 5,
};

class BlogGenerationService {
  constructor() {
    this.claude = getClaudeService();
  }

  isAvailable() {
    return this.claude.isAvailable();
  }

  // ---------------------------------------------------------------------------
  // Main entry point
  // ---------------------------------------------------------------------------

  async generateArticle(configId, overrides = {}) {
    const startTime = Date.now();
    let jobId = null;

    try {
      const config = await this._getConfig(configId);
      if (!config) throw new Error(`Config ${configId} not found`);
      if (!config.enabled && !overrides.force) throw new Error(`Config ${configId} is disabled`);

      // Create pending job record
      jobId = await this._createJob(config.id, config.magazine);

      await this._updateJobStatus(jobId, 'generating');

      const { topic, contentType, angle } = overrides.topic
        ? { topic: overrides.topic, contentType: overrides.contentType || 'how-to', angle: overrides.angle || '' }
        : await this._pickTopic(config);

      await db.query(
        'UPDATE auto_blog_jobs SET topic_used = ?, content_type_used = ?, angle_used = ? WHERE id = ?',
        [topic, contentType, angle, jobId]
      );

      const context = await this._gatherPlatformContext(topic, config.magazine);
      const linkableEntities = await this._gatherLinkableEntities(topic, config.magazine);

      const existingTitles = await this._getRecentTitles(config.magazine, 30);

      const targetWordCount = contentType === 'pillar'
        ? Math.max(config.target_word_count_max || 1500, 2000)
        : Math.round(((config.target_word_count_min || 800) + (config.target_word_count_max || 1500)) / 2);

      const result = await this.claude.generateBlogArticle({
        magazine: config.magazine,
        topic,
        contentType,
        angle,
        context,
        linkableEntities,
        tone: config.tone || 'informative and engaging',
        targetWordCount,
        existingTitles,
      });

      const articleId = await this._createArticle(result, config.magazine);

      if ((contentType === 'faq' && result.faqPairs?.length > 0) ||
          (contentType === 'how-to' && result.howToSteps?.length > 0)) {
        await this._createArticleSchema(articleId, contentType, result);
      }

      const elapsed = Date.now() - startTime;
      await db.query(
        'UPDATE auto_blog_jobs SET status = ?, article_id = ?, model_used = ?, generation_time_ms = ? WHERE id = ?',
        ['generated', articleId, this.claude.model, elapsed, jobId]
      );

      console.log(`[AUTO-BLOG] Generated article ${articleId} for ${config.magazine}: "${result.title}" (${elapsed}ms)`);
      return { articleId, jobId, title: result.title, slug: result.slug };

    } catch (error) {
      console.error(`[AUTO-BLOG] Generation failed:`, error.message);
      if (jobId) {
        await db.query(
          'UPDATE auto_blog_jobs SET status = ?, error = ? WHERE id = ?',
          ['failed', error.message, jobId]
        ).catch(() => {});
      }
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Topic picker
  // ---------------------------------------------------------------------------

  async _pickTopic(config) {
    const topics = typeof config.topics === 'string' ? JSON.parse(config.topics) : config.topics;
    if (!topics || topics.length === 0) {
      throw new Error(`No topics configured for ${config.magazine}`);
    }

    const ratios = typeof config.content_type_ratios === 'string'
      ? JSON.parse(config.content_type_ratios)
      : config.content_type_ratios || DEFAULT_RATIOS;

    const recentJobs = await this._getRecentJobs(config.id, 30);
    const recentTopics = new Set(recentJobs.map(j => j.topic_used?.toLowerCase()));
    const recentContentTypes = recentJobs.reduce((acc, j) => {
      acc[j.content_type_used] = (acc[j.content_type_used] || 0) + 1;
      return acc;
    }, {});
    const totalRecent = recentJobs.length || 1;

    // Score each candidate: base weight + ratio-correction bonus + freshness bonus
    const scored = topics.map(t => {
      const currentRatio = ((recentContentTypes[t.content_type] || 0) / totalRecent) * 100;
      const targetRatio = ratios[t.content_type] || 10;
      const ratioGap = Math.max(0, targetRatio - currentRatio);

      const freshness = recentTopics.has(t.topic?.toLowerCase()) ? 0 : 2;

      const score = (t.weight || 1) + (ratioGap / 10) + freshness;
      return { ...t, score };
    });

    // Weighted random selection
    const totalScore = scored.reduce((sum, t) => sum + t.score, 0);
    let rand = Math.random() * totalScore;
    let selected = scored[0];
    for (const t of scored) {
      rand -= t.score;
      if (rand <= 0) { selected = t; break; }
    }

    const angle = await this._generateAngle(selected.topic, config.magazine);

    return {
      topic: selected.topic,
      contentType: selected.content_type || 'how-to',
      angle,
    };
  }

  async _generateAngle(topic, magazine) {
    try {
      const vectorDB = getVectorDB();
      const results = await vectorDB.semanticSearch(
        `${topic} for ${magazine.replace(/-/g, ' ')}`,
        'site_content',
        { limit: 3 }
      );

      const covered = (results?.documents?.[0] || [])
        .filter(Boolean)
        .map(d => {
          try { const p = JSON.parse(d); return p.title || ''; } catch { return ''; }
        })
        .filter(Boolean);

      if (covered.length > 0) {
        return `Fresh angle — avoid overlapping with: ${covered.slice(0, 3).join(', ')}`;
      }
    } catch (err) {
      console.warn('[AUTO-BLOG] Vector search for angle failed:', err.message);
    }
    return '';
  }

  // ---------------------------------------------------------------------------
  // Platform context gathering
  // ---------------------------------------------------------------------------

  async _gatherPlatformContext(topic, magazine) {
    const context = { recentArticles: [], products: [], events: [] };

    try {
      const vectorDB = getVectorDB();

      // Recent articles for dedup and context
      const articleResults = await vectorDB.semanticSearch(topic, 'site_content', { limit: 10 });
      if (articleResults?.documents?.[0]) {
        context.recentArticles = articleResults.documents[0]
          .filter(Boolean)
          .map(d => {
            try { const p = JSON.parse(d); return p.title || d.substring(0, 100); } catch { return d.substring(0, 100); }
          });
      }

      // Products for linking
      const productResults = await vectorDB.semanticSearch(topic, 'art_metadata', { limit: 10 });
      if (productResults?.metadatas?.[0]) {
        context.products = productResults.metadatas[0]
          .filter(Boolean)
          .map(m => ({ name: m.name || m.title || 'Product', price: m.price, category: m.category }));
      }

      // Events for timely hooks
      const eventResults = await vectorDB.semanticSearch(topic, 'event_data', { limit: 5 });
      if (eventResults?.metadatas?.[0]) {
        context.events = eventResults.metadatas[0]
          .filter(Boolean)
          .map(m => ({ name: m.name || m.title || 'Event', date: m.date || m.start_date, location: m.location || m.city }));
      }
    } catch (err) {
      console.warn('[AUTO-BLOG] Platform context gathering partial failure:', err.message);
    }

    return context;
  }

  async _gatherLinkableEntities(topic, magazine) {
    const entities = [];

    try {
      // Products with slugs
      const [products] = await db.query(`
        SELECT p.id, p.name, p.slug, c.name as category
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'active' AND p.name IS NOT NULL
        ORDER BY p.view_count DESC
        LIMIT 15
      `);
      for (const p of products) {
        entities.push({ name: p.name, url: `/products/${p.slug || p.id}`, type: 'product' });
      }

      // Artists with profiles
      const [artists] = await db.query(`
        SELECT u.id, u.username, up.display_name
        FROM users u
        JOIN user_profiles up ON u.id = up.user_id
        WHERE u.status = 'active' AND u.user_type = 'artist'
        ORDER BY RAND()
        LIMIT 10
      `);
      for (const a of artists) {
        entities.push({ name: a.display_name || a.username, url: `/artists/${a.username}`, type: 'artist' });
      }

      // Events
      const [events] = await db.query(`
        SELECT id, name, slug
        FROM events
        WHERE status = 'active' AND start_date >= NOW()
        ORDER BY start_date ASC
        LIMIT 10
      `);
      for (const e of events) {
        entities.push({ name: e.name, url: `/events/${e.slug || e.id}`, type: 'event' });
      }

      // Recent articles in same magazine for cross-linking
      const [articles] = await db.query(`
        SELECT id, title, slug
        FROM articles
        WHERE status = 'published' AND JSON_CONTAINS(section, ?)
        ORDER BY published_at DESC
        LIMIT 5
      `, [JSON.stringify(magazine)]);
      for (const a of articles) {
        entities.push({ name: a.title, url: `/articles/${a.slug}`, type: 'article' });
      }
    } catch (err) {
      console.warn('[AUTO-BLOG] Linkable entities gathering partial failure:', err.message);
    }

    return entities;
  }

  // ---------------------------------------------------------------------------
  // Article creation
  // ---------------------------------------------------------------------------

  async _createArticle(result, magazine) {
    const slug = await this._ensureUniqueSlug(result.slug || this._generateSlug(result.title));
    const content = typeof result.content === 'object' ? JSON.stringify(result.content) : result.content;
    const readingTime = this._calculateReadingTime(content);
    const sectionJson = JSON.stringify([magazine]);

    const [insertResult] = await db.query(`
      INSERT INTO articles (title, slug, content, excerpt, author_id, status, page_type, section, published_at)
      VALUES (?, ?, ?, ?, ?, 'draft', 'article', ?, NULL)
    `, [result.title, slug, content, result.excerpt || '', DEFAULT_AUTHOR_ID, sectionJson]);

    const articleId = insertResult.insertId;

    // Analytics record
    await db.query(
      'INSERT INTO article_analytics (article_id, reading_time_minutes) VALUES (?, ?)',
      [articleId, readingTime]
    );

    // SEO data
    if (result.seoTitle || result.seoDescription || result.focusKeyword) {
      await db.query(`
        INSERT INTO article_seo (article_id, meta_title, meta_description, meta_keywords, focus_keyword)
        VALUES (?, ?, ?, ?, ?)
      `, [
        articleId,
        result.seoTitle || result.title,
        result.seoDescription || result.excerpt || '',
        (result.suggestedTags || []).join(', '),
        result.focusKeyword || '',
      ]);
    }

    // Social metadata (pre-fill OG from SEO)
    await db.query(`
      INSERT INTO article_social (article_id, og_title, og_description, twitter_card_type)
      VALUES (?, ?, ?, 'summary_large_image')
    `, [articleId, result.seoTitle || result.title, result.seoDescription || result.excerpt || '']);

    // Tags
    if (result.suggestedTags?.length > 0) {
      for (const tagName of result.suggestedTags) {
        try {
          const [existing] = await db.query('SELECT id FROM article_tags WHERE name = ?', [tagName]);
          let tagId;
          if (existing[0]) {
            tagId = existing[0].id;
          } else {
            const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            const [tagResult] = await db.query(
              'INSERT INTO article_tags (name, slug) VALUES (?, ?)', [tagName, tagSlug]
            );
            tagId = tagResult.insertId;
          }
          await db.query(
            'INSERT IGNORE INTO article_tag_relations (article_id, tag_id) VALUES (?, ?)',
            [articleId, tagId]
          );
        } catch {
          // Tag creation is best-effort
        }
      }
    }

    return articleId;
  }

  async _createArticleSchema(articleId, contentType, result) {
    let schemaMarkup = null;

    if (contentType === 'faq' && result.faqPairs?.length > 0) {
      schemaMarkup = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': result.faqPairs.map(pair => ({
          '@type': 'Question',
          'name': pair.question,
          'acceptedAnswer': { '@type': 'Answer', 'text': pair.answer },
        })),
      };
    } else if (contentType === 'how-to' && result.howToSteps?.length > 0) {
      schemaMarkup = {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        'name': result.title,
        'step': result.howToSteps.map((step, i) => ({
          '@type': 'HowToStep',
          'position': i + 1,
          'name': step.name,
          'text': step.text,
        })),
      };
    }

    if (schemaMarkup) {
      await db.query(
        'INSERT INTO article_schema (article_id, schema_markup) VALUES (?, ?) ON DUPLICATE KEY UPDATE schema_markup = VALUES(schema_markup)',
        [articleId, JSON.stringify(schemaMarkup)]
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Social draft generation (called on publish)
  // ---------------------------------------------------------------------------

  async generateSocialDrafts(articleId) {
    try {
      const [articles] = await db.query(`
        SELECT a.id, a.title, a.content, a.excerpt, a.slug, a.section,
               aseo.focus_keyword
        FROM articles a
        LEFT JOIN article_seo aseo ON a.id = aseo.article_id
        WHERE a.id = ?
      `, [articleId]);

      if (!articles[0]) throw new Error(`Article ${articleId} not found`);
      const article = articles[0];

      const articleUrl = `/articles/${article.slug}`;
      const platforms = ['instagram', 'facebook', 'twitter'];

      const posts = await this.claude.generateCampaignPosts({
        campaignName: `Auto-Blog: ${article.title}`,
        campaignGoal: `Drive traffic to new article: ${article.title}`,
        platforms,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        brandContext: {
          name: 'Brakebee',
          style: 'creative community platform',
          audience: 'artists, event promoters, and art enthusiasts',
          industry: 'art and events marketplace',
        },
        postCount: 3,
      });

      let created = 0;
      for (const post of (Array.isArray(posts) ? posts : [])) {
        const contentJson = JSON.stringify({
          caption: post.caption || '',
          hashtags: post.hashtags || [],
          callToAction: post.callToAction || `Read more: ${articleUrl}`,
          title: post.title || article.title,
          suggestedMediaDescription: post.suggestedMediaDescription || '',
          visualDirection: post.visualDirection || '',
          rationale: post.rationale || '',
          articleId,
          articleUrl,
        });

        await db.query(`
          INSERT INTO marketing_content (campaign_id, type, channel, status, content, created_by)
          VALUES (NULL, 'post', ?, 'draft', ?, 'leo')
        `, [post.platform || 'instagram', contentJson]);
        created++;
      }

      console.log(`[AUTO-BLOG] Created ${created} social drafts for article ${articleId}`);
      return { created };
    } catch (error) {
      console.error(`[AUTO-BLOG] Social draft generation failed for article ${articleId}:`, error.message);
      return { created: 0, error: error.message };
    }
  }

  // ---------------------------------------------------------------------------
  // Queue & stats helpers
  // ---------------------------------------------------------------------------

  async getQueueItems({ magazine, status, page = 1, limit = 20 } = {}) {
    let where = 'WHERE 1=1';
    const params = [];

    if (magazine) { where += ' AND j.magazine = ?'; params.push(magazine); }
    if (status) { where += ' AND j.status = ?'; params.push(status); }

    const offset = (page - 1) * limit;

    const [rows] = await db.query(`
      SELECT 
        j.id as job_id, j.config_id, j.article_id, j.status as job_status,
        j.magazine, j.topic_used, j.content_type_used, j.angle_used,
        j.model_used, j.generation_time_ms, j.created_at as generated_at,
        a.title, a.slug, a.content, a.excerpt, a.status as article_status,
        a.published_at,
        aa.reading_time_minutes,
        aseo.meta_title, aseo.meta_description, aseo.focus_keyword
      FROM auto_blog_jobs j
      LEFT JOIN articles a ON j.article_id = a.id
      LEFT JOIN article_analytics aa ON a.id = aa.article_id
      LEFT JOIN article_seo aseo ON a.id = aseo.article_id
      ${where}
      ORDER BY j.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM auto_blog_jobs j ${where}`, params
    );

    return {
      items: rows.map(row => ({
        ...row,
        word_count: row.content ? this._countWords(row.content) : 0,
      })),
      pagination: { page, limit, total: countResult[0]?.total || 0 },
    };
  }

  async getStats() {
    const [overall] = await db.query(`
      SELECT 
        COUNT(*) as total_jobs,
        SUM(CASE WHEN status = 'generated' THEN 1 ELSE 0 END) as pending_review,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        AVG(generation_time_ms) as avg_generation_ms
      FROM auto_blog_jobs
    `);

    const [thisWeek] = await db.query(`
      SELECT COUNT(*) as count
      FROM auto_blog_jobs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND status IN ('generated', 'published')
    `);

    const [thisMonth] = await db.query(`
      SELECT COUNT(*) as count
      FROM auto_blog_jobs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND status IN ('generated', 'published')
    `);

    const [byMagazine] = await db.query(`
      SELECT magazine, COUNT(*) as count,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published
      FROM auto_blog_jobs
      GROUP BY magazine
    `);

    const [byContentType] = await db.query(`
      SELECT content_type_used, COUNT(*) as count
      FROM auto_blog_jobs
      WHERE status IN ('generated', 'published') AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY content_type_used
    `);

    const stats = overall[0] || {};
    return {
      total: stats.total_jobs || 0,
      pendingReview: stats.pending_review || 0,
      published: stats.published || 0,
      failed: stats.failed || 0,
      rejected: stats.rejected || 0,
      avgGenerationMs: Math.round(stats.avg_generation_ms || 0),
      thisWeek: thisWeek[0]?.count || 0,
      thisMonth: thisMonth[0]?.count || 0,
      byMagazine: byMagazine || [],
      byContentType: byContentType || [],
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  async _getConfig(configId) {
    const [rows] = await db.query('SELECT * FROM auto_blog_config WHERE id = ?', [configId]);
    return rows[0] || null;
  }

  async _createJob(configId, magazine) {
    const [result] = await db.query(
      'INSERT INTO auto_blog_jobs (config_id, magazine, status) VALUES (?, ?, ?)',
      [configId, magazine, 'pending']
    );
    return result.insertId;
  }

  async _updateJobStatus(jobId, status) {
    await db.query('UPDATE auto_blog_jobs SET status = ? WHERE id = ?', [status, jobId]);
  }

  async _getRecentJobs(configId, days) {
    const [rows] = await db.query(
      `SELECT topic_used, content_type_used FROM auto_blog_jobs
       WHERE config_id = ? AND status IN ('generated', 'published')
       AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [configId, days]
    );
    return rows;
  }

  async _getRecentTitles(magazine, days) {
    const [rows] = await db.query(
      `SELECT a.title FROM articles a
       JOIN auto_blog_jobs j ON a.id = j.article_id
       WHERE j.magazine = ? AND j.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [magazine, days]
    );
    return rows.map(r => r.title);
  }

  async _ensureUniqueSlug(baseSlug) {
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const [existing] = await db.query('SELECT id FROM articles WHERE slug = ?', [slug]);
      if (!existing[0]) return slug;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  _generateSlug(title) {
    return (title || 'untitled')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }

  _calculateReadingTime(content) {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    const words = text.replace(/<[^>]*>/g, '').split(/\s+/).length;
    return Math.ceil(words / 200);
  }

  _countWords(content) {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    return text.replace(/<[^>]*>/g, '').replace(/[{}[\]",:]/g, ' ').split(/\s+/).filter(Boolean).length;
  }
}

function getBlogGenerationService() {
  if (!instance) {
    instance = new BlogGenerationService();
  }
  return instance;
}

module.exports = { BlogGenerationService, getBlogGenerationService };
