/**
 * Article Management Routes
 * Comprehensive content management system for the Beemeeart platform
 * Handles articles, tags, topics, series, and access control with advanced permissions
 * Supports hierarchical topics, article series, SEO optimization, and social media integration
 */

const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const jwt = require('jsonwebtoken');
const upload = require('../config/multer');
const path = require('path');
const fs = require('fs');

/**
 * Middleware: Check if user has content management permissions
 * Validates user permissions for content creation, editing, and management
 * 
 * @middleware checkContentPermissions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void} Calls next() if authorized, returns 403 if unauthorized
 */
const checkContentPermissions = async (req, res, next) => {
  try {
    const [userPermissions] = await db.query('SELECT * FROM user_permissions WHERE user_id = ?', [req.userId]);
    
    if (req.roles.includes('admin')) {
      return next(); // Admin has all permissions
    }
    
    if (userPermissions[0] && userPermissions[0].manage_content) {
      return next();
    }
    
    return res.status(403).json({ error: 'Content management permission required' });
  } catch (err) {
    console.error('Error checking permissions:', err);
    return res.status(500).json({ error: 'Permission check failed' });
  }
};

/**
 * Check access to article based on restrictions
 * Implements fine-grained access control for articles based on user roles, permissions, and specific restrictions
 * 
 * @function checkArticleAccess
 * @param {number} userId - User ID requesting access
 * @param {Array} roles - User roles array
 * @param {Array} permissions - User permissions array
 * @param {number} articleId - Article ID to check access for
 * @returns {Promise<boolean>} True if user has access, false otherwise
 */
const checkArticleAccess = async (userId, roles, permissions, articleId) => {
  try {
    // Get article restrictions
    const [restrictions] = await db.query(
      'SELECT * FROM article_restrictions WHERE article_id = ?',
      [articleId]
    );
    
    // If no restrictions, it's public
    if (!restrictions.length) {
      return true;
    }
    
    // Check if user meets any restrictions
    for (const restriction of restrictions) {
      if (restriction.restriction_type === 'user_type') {
        if (roles.includes(restriction.restriction_value)) {
          return true;
        }
      } else if (restriction.restriction_type === 'permission') {
        if (permissions.includes(restriction.restriction_value)) {
          return true;
        }
      } else if (restriction.restriction_type === 'specific_user') {
        if (userId.toString() === restriction.restriction_value) {
          return true;
        }
      }
    }
    
    return false;
  } catch (err) {
    console.error('Error checking article access:', err);
    return false;
  }
};

/**
 * Generate URL-friendly slug from title
 * Creates SEO-friendly slugs for articles with proper character handling
 * 
 * @function generateSlug
 * @param {string} title - Article title to convert to slug
 * @returns {string} URL-friendly slug (max 100 characters)
 */
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
};

// Calculate reading time
const calculateReadingTime = (content) => {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
};

/**
 * GET /api/articles
 * List articles with pagination and access control
 * Public endpoint that respects user authentication and role-based filtering
 * 
 * @route GET /api/articles
 * @param {number} [page=1] - Page number for pagination
 * @param {number} [limit=10] - Number of articles per page
 * @returns {Object} Paginated list of articles with metadata
 * @note Automatically filters to published articles for non-admin users
 */
router.get('/', async (req, res) => {
  console.log('GET /articles request received');
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    let userId = null;
    let roles = [];
    
    // Check if user is authenticated
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
        roles = decoded.roles || [];
      } catch (err) {
        console.log('Token verification failed:', err.message);
      }
    }
    
    let query = `
      SELECT 
        a.id,
        a.title,
        a.content,
        a.excerpt,
        a.author_id,
        a.published_at,
        a.status,
        a.slug,
        a.page_type,
        a.featured_image_id,
        a.created_at,
        a.updated_at,
        u.username as author_username
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
    `;
    
    const params = [];
    
    // If user is not admin, only show published articles
    if (!roles.includes('admin')) {
      query += ` WHERE a.status = 'published'`;
    }
    
    // Add ordering and pagination
    query += ` ORDER BY a.published_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    console.log('Executing query:', query);
    const [articles] = await db.query(query, params);
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM articles a`;
    if (!roles.includes('admin')) {
      countQuery += ` WHERE a.status = 'published'`;
    }
    
    const [countResult] = await db.query(countQuery);
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);
    
    res.json({
      articles,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
    
// =============================================
// TAGS ROUTES (must come before /:slug route)
// =============================================

/**
 * GET /api/articles/tags
 * List all article tags with article counts
 * Public endpoint that shows tags with published article statistics
 * 
 * @route GET /api/articles/tags
 * @returns {Array} List of tags with article counts and metadata
 */
router.get('/tags', async (req, res) => {
  try {
    const [tags] = await db.query(`
      SELECT t.id, t.name, t.slug, t.created_at, 
             COUNT(DISTINCT atr.article_id) as article_count
      FROM article_tags t
      LEFT JOIN article_tag_relations atr ON t.id = atr.tag_id
      LEFT JOIN articles a ON atr.article_id = a.id AND a.status = 'published'
      GROUP BY t.id, t.name, t.slug, t.created_at
      ORDER BY t.name ASC
    `);
    res.json(tags);
  } catch (err) {
    console.error('Error fetching tags:', err);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

/**
 * GET /api/articles/tags/:slug
 * Get single tag with associated articles
 * Returns tag information and paginated list of articles with that tag
 * 
 * @route GET /api/articles/tags/:slug
 * @param {string} slug - Tag slug identifier
 * @param {number} [page=1] - Page number for article pagination
 * @param {number} [limit=10] - Number of articles per page
 * @returns {Object} Tag details with associated articles
 */
router.get('/tags/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Get tag info
    const [tag] = await db.query(`
      SELECT t.id, t.name, t.slug, t.created_at
      FROM article_tags t
      WHERE t.slug = ?
    `, [slug]);

    if (!tag[0]) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    // Get articles with this tag
    const [articles] = await db.query(`
      SELECT a.id, a.title, a.slug, a.excerpt, a.author_id, a.published_at, a.created_at,
             u.username as author_username, up.display_name as author_display_name,
             aa.view_count, aa.reading_time_minutes
      FROM articles a
      JOIN article_tag_relations atr ON a.id = atr.article_id
      JOIN users u ON a.author_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN article_analytics aa ON a.id = aa.article_id
      WHERE atr.tag_id = ? AND a.status = 'published'
      ORDER BY a.published_at DESC
      LIMIT ? OFFSET ?
    `, [tag[0].id, parseInt(limit), parseInt(offset)]);

    res.json({
      tag: tag[0],
      articles
    });
  } catch (err) {
    console.error('Error fetching tag:', err);
    res.status(500).json({ error: 'Failed to fetch tag' });
  }
});

// =============================================
// SERIES ROUTES (must come before /:slug route)
// =============================================

/**
 * GET /api/articles/series
 * List all article series with pagination
 * Shows article series with article counts and metadata
 * 
 * @route GET /api/articles/series
 * @param {number} [page=1] - Page number for pagination
 * @param {number} [limit=10] - Number of series per page
 * @returns {Object} Paginated list of article series with counts
 */
router.get('/series', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const [series] = await db.query(`
      SELECT 
        s.id, s.series_name, s.slug, s.description, s.created_at, s.updated_at,
        COUNT(asr.article_id) as article_count
      FROM article_series s
      LEFT JOIN article_series_relations asr ON s.id = asr.series_id
      LEFT JOIN articles a ON asr.article_id = a.id AND a.status = 'published'
      GROUP BY s.id, s.series_name, s.slug, s.description, s.created_at, s.updated_at
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);

    // Get total count
    const [total] = await db.query(`
      SELECT COUNT(*) as count FROM article_series
    `);

    res.json({
      series,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total[0].count,
        pages: Math.ceil(total[0].count / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching series:', err);
    res.status(500).json({ error: 'Failed to fetch series' });
  }
});

/**
 * GET /api/articles/series/:slug
 * Get single series with all articles in order
 * Returns series information and ordered list of articles with access control
 * 
 * @route GET /api/articles/series/:slug
 * @param {string} slug - Series slug identifier
 * @returns {Object} Series details with ordered articles (access-controlled)
 */
router.get('/series/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Get series info
    const [series] = await db.query(`
      SELECT s.id, s.series_name, s.slug, s.description, s.created_at, s.updated_at
      FROM article_series s
      WHERE s.slug = ?
    `, [slug]);

    if (!series[0]) {
      return res.status(404).json({ error: 'Series not found' });
    }

    // Get articles in series with access control
    const [articles] = await db.query(`
      SELECT 
        a.id, a.title, a.slug, a.excerpt, a.author_id, a.status, a.published_at, a.created_at,
        u.username as author_username, up.display_name as author_display_name,
        aa.view_count, aa.reading_time_minutes,
        asr.position_in_series
      FROM articles a
      JOIN article_series_relations asr ON a.id = asr.article_id
      JOIN users u ON a.author_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN article_analytics aa ON a.id = aa.article_id
      WHERE asr.series_id = ? AND a.status = 'published'
      ORDER BY asr.position_in_series ASC
    `, [series[0].id]);
    
    // Filter articles based on access control
    const accessibleArticles = [];
    const token = req.headers.authorization?.split(' ')[1];
    let userId = null, roles = [], permissions = [];
    
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
        roles = decoded.roles || [];
        permissions = decoded.permissions || [];
      } catch (err) {
        // Invalid token, continue as anonymous user
      }
    }
    
    for (const article of articles) {
      const hasAccess = await checkArticleAccess(userId, roles, permissions, article.id);
      if (hasAccess) {
        accessibleArticles.push(article);
      }
    }
    
    res.json({
      series: series[0],
      articles: accessibleArticles
    });
  } catch (err) {
    console.error('Error fetching series:', err);
    res.status(500).json({ error: 'Failed to fetch series' });
  }
});

// /:slug route moved to end of file after all specific routes

/**
 * POST /api/articles
 * Create new article with comprehensive metadata
 * Supports topics, tags, series, SEO data, social media data, and connections
 * 
 * @route POST /api/articles
 * @middleware verifyToken - Requires user authentication
 * @middleware checkContentPermissions - Requires content management permissions
 * @param {Object} req.body - Article creation data
 * @param {string} req.body.title - Article title (required)
 * @param {string} req.body.content - Article content (required)
 * @param {string} [req.body.excerpt] - Article excerpt
 * @param {string} [req.body.status=draft] - Article status (draft/published)
 * @param {Array} [req.body.topics] - Topic IDs array
 * @param {Array} [req.body.tags] - Tag IDs array
 * @param {number} [req.body.series_id] - Series ID if part of series
 * @param {number} [req.body.position_in_series] - Position in series
 * @param {Array} [req.body.connections] - Related content connections
 * @param {Object} [req.body.seo] - SEO metadata
 * @param {Object} [req.body.social] - Social media metadata
 * @returns {Object} Created article confirmation with ID and slug
 */
router.post('/', verifyToken, checkContentPermissions, async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      status = 'draft',
      topics = [],
      tags = [],
      series_id,
      position_in_series,
      connections = [],
      seo = {},
      social = {}
    } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    // Generate slug
    const baseSlug = generateSlug(title);
    let slug = baseSlug;
    let counter = 1;
    
    // Ensure slug is unique
    while (true) {
      const [existing] = await db.query('SELECT id FROM articles WHERE slug = ?', [slug]);
      if (!existing[0]) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    // Calculate reading time
    const readingTime = calculateReadingTime(content);
    
    // Create article
    const [result] = await db.query(`
      INSERT INTO articles (title, slug, content, excerpt, author_id, status, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      title,
      slug,
      content,
      excerpt,
      req.userId,
      status,
      status === 'published' ? new Date() : null
    ]);
    
    const articleId = result.insertId;
    
    // Create analytics record
    await db.query(`
      INSERT INTO article_analytics (article_id, reading_time_minutes)
      VALUES (?, ?)
    `, [articleId, readingTime]);
    
    // Add SEO data if provided
    if (Object.keys(seo).length > 0) {
      await db.query(`
        INSERT INTO article_seo (article_id, meta_title, meta_description, meta_keywords, focus_keyword)
        VALUES (?, ?, ?, ?, ?)
      `, [
        articleId,
        seo.meta_title || null,
        seo.meta_description || null,
        seo.meta_keywords || null,
        seo.focus_keyword || null
      ]);
    }
    
    // Add social data if provided
    if (Object.keys(social).length > 0) {
      await db.query(`
        INSERT INTO article_social (article_id, og_title, og_description, twitter_card_type)
        VALUES (?, ?, ?, ?)
      `, [
        articleId,
        social.og_title || null,
        social.og_description || null,
        social.twitter_card_type || 'summary'
      ]);
    }
    
    // Add topics
    for (const topicId of topics) {
      await db.query(`
        INSERT INTO article_topic_relations (article_id, topic_id)
        VALUES (?, ?)
      `, [articleId, topicId]);
    }
    
    // Add to series if specified
    if (series_id && position_in_series) {
      await db.query(`
        INSERT INTO article_series_relations (article_id, series_id, position_in_series)
        VALUES (?, ?, ?)
      `, [articleId, series_id, position_in_series]);
    }
    
    // Add connections
    for (const connection of connections) {
      await db.query(`
        INSERT INTO article_connections (article_id, connection_type, connection_id)
        VALUES (?, ?, ?)
      `, [articleId, connection.type, connection.id]);
    }
    
    res.status(201).json({
      message: 'Article created successfully',
      article: {
        id: articleId,
        slug,
        title,
        status
      }
    });
  } catch (err) {
    console.error('Error creating article:', err);
    res.status(500).json({ error: 'Failed to create article' });
  }
});

/**
 * PUT /api/articles/:id
 * Update existing article with comprehensive permission checking
 * Supports updating all article metadata including topics, series, SEO, and social data
 * 
 * @route PUT /api/articles/:id
 * @middleware verifyToken - Requires user authentication
 * @param {string} id - Article ID to update
 * @param {Object} req.body - Article update data (same structure as POST)
 * @returns {Object} Update confirmation message
 * @note Authors can edit their own articles, content managers can edit any article
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      excerpt,
      status,
      topics = [],
      tags = [],
      series_id,
      position_in_series,
      connections = [],
      seo = {},
      social = {}
    } = req.body;
    
    // Check if article exists and user has permission
    const [article] = await db.query('SELECT * FROM articles WHERE id = ?', [id]);
    if (!article[0]) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Check permissions
    const [userPermissions] = await db.query('SELECT * FROM user_permissions WHERE user_id = ?', [req.userId]);
    const isAdmin = req.roles.includes('admin');
    const isAuthor = article[0].author_id === req.userId;
    const canManageContent = userPermissions[0]?.manage_content || isAdmin;
    const canEdit = canManageContent;
    
    if (!isAuthor && !canEdit) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // If changing status to published, check content management permission
    if (status === 'published' && !canManageContent) {
      return res.status(403).json({ error: 'Permission denied: Cannot publish articles' });
    }
    
    // Update article
    let updateFields = [];
    let updateValues = [];
    
    if (title) {
      updateFields.push('title = ?');
      updateValues.push(title);
    }
    
    if (content) {
      updateFields.push('content = ?');
      updateValues.push(content);
      
      // Recalculate reading time
      const readingTime = calculateReadingTime(content);
      await db.query(`
        UPDATE article_analytics SET reading_time_minutes = ? WHERE article_id = ?
      `, [readingTime, id]);
    }
    
    if (excerpt !== undefined) {
      updateFields.push('excerpt = ?');
      updateValues.push(excerpt);
    }
    
    if (status) {
      updateFields.push('status = ?');
      updateValues.push(status);
      
      if (status === 'published') {
        updateFields.push('published_at = ?');
        updateValues.push(new Date());
      }
    }
    
    if (updateFields.length > 0) {
      updateValues.push(id);
      await db.query(`
        UPDATE articles SET ${updateFields.join(', ')} WHERE id = ?
      `, updateValues);
    }
    
    // Update topics
    if (topics.length > 0) {
      await db.query('DELETE FROM article_topic_relations WHERE article_id = ?', [id]);
      for (const topicId of topics) {
        await db.query(`
          INSERT INTO article_topic_relations (article_id, topic_id)
          VALUES (?, ?)
        `, [id, topicId]);
      }
    }
    
    // Update series
    if (series_id && position_in_series) {
      await db.query('DELETE FROM article_series_relations WHERE article_id = ?', [id]);
      await db.query(`
        INSERT INTO article_series_relations (article_id, series_id, position_in_series)
        VALUES (?, ?, ?)
      `, [id, series_id, position_in_series]);
    }
    
    // Update connections
    if (connections.length > 0) {
      await db.query('DELETE FROM article_connections WHERE article_id = ?', [id]);
      for (const connection of connections) {
        await db.query(`
          INSERT INTO article_connections (article_id, connection_type, connection_id)
          VALUES (?, ?, ?)
        `, [id, connection.type, connection.id]);
      }
    }
    
    // Update SEO data
    if (Object.keys(seo).length > 0) {
      await db.query(`
        INSERT INTO article_seo (article_id, meta_title, meta_description, meta_keywords, focus_keyword)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          meta_title = VALUES(meta_title),
          meta_description = VALUES(meta_description),
          meta_keywords = VALUES(meta_keywords),
          focus_keyword = VALUES(focus_keyword)
      `, [
        id,
        seo.meta_title || null,
        seo.meta_description || null,
        seo.meta_keywords || null,
        seo.focus_keyword || null
      ]);
    }
    
    // Update social data
    if (Object.keys(social).length > 0) {
      await db.query(`
        INSERT INTO article_social (article_id, og_title, og_description, twitter_card_type)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          og_title = VALUES(og_title),
          og_description = VALUES(og_description),
          twitter_card_type = VALUES(twitter_card_type)
      `, [
        id,
        social.og_title || null,
        social.og_description || null,
        social.twitter_card_type || 'summary'
      ]);
    }
    
    res.json({ message: 'Article updated successfully' });
  } catch (err) {
    console.error('Error updating article:', err);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

/**
 * DELETE /api/articles/:id
 * Delete article with permission validation
 * Only authors and admins can delete articles
 * 
 * @route DELETE /api/articles/:id
 * @middleware verifyToken - Requires user authentication
 * @param {string} id - Article ID to delete
 * @returns {Object} Deletion confirmation message
 * @note Cascade deletion handles related records automatically
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if article exists and user has permission
    const [article] = await db.query('SELECT * FROM articles WHERE id = ?', [id]);
    if (!article[0]) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    const isAdmin = req.roles.includes('admin');
    const isAuthor = article[0].author_id === req.userId;
    
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // Delete article (cascade will handle related records)
    await db.query('DELETE FROM articles WHERE id = ?', [id]);
    
    res.json({ message: 'Article deleted successfully' });
  } catch (err) {
    console.error('Error deleting article:', err);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

/**
 * POST /api/articles/:id/view
 * Update view count for article analytics
 * Public endpoint for tracking article engagement
 * 
 * @route POST /api/articles/:id/view
 * @param {string} id - Article ID to track view for
 * @returns {Object} Success confirmation
 * @note Updates view count and last viewed timestamp
 */
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Update view count
    await db.query(`
      INSERT INTO article_analytics (article_id, view_count, last_viewed)
      VALUES (?, 1, NOW())
      ON DUPLICATE KEY UPDATE 
        view_count = view_count + 1,
        last_viewed = NOW()
    `, [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating view count:', error);
    res.status(500).json({ error: 'Failed to update view count' });
  }
});

/**
 * POST /api/articles/tags
 * Create new article tag
 * Restricted to users with content management permissions
 * 
 * @route POST /api/articles/tags
 * @middleware verifyToken - Requires user authentication
 * @middleware checkContentPermissions - Requires content management permissions
 * @param {Object} req.body - Tag creation data
 * @param {string} req.body.tag_name - Tag name (required)
 * @param {string} [req.body.description] - Tag description
 * @returns {Object} Created tag data with generated slug
 */
router.post('/tags', verifyToken, checkContentPermissions, async (req, res) => {
  try {
    const { tag_name, description } = req.body;
    
    if (!tag_name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    // Generate slug
    const slug = tag_name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if tag already exists
    const [existing] = await db.query('SELECT id FROM article_tags WHERE slug = ?', [slug]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Tag with this name already exists' });
    }

    const [result] = await db.query(`
      INSERT INTO article_tags (name, slug) 
      VALUES (?, ?)
    `, [tag_name, slug]);

    const [newTag] = await db.query('SELECT * FROM article_tags WHERE id = ?', [result.insertId]);
    res.status(201).json(newTag[0]);
  } catch (err) {
    console.error('Error creating tag:', err);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

/**
 * PUT /api/articles/tags/:id
 * Update existing article tag
 * Restricted to users with content management permissions
 * 
 * @route PUT /api/articles/tags/:id
 * @middleware verifyToken - Requires user authentication
 * @middleware checkContentPermissions - Requires content management permissions
 * @param {string} id - Tag ID to update
 * @param {Object} req.body - Tag update data
 * @param {string} req.body.tag_name - Updated tag name (required)
 * @param {string} [req.body.description] - Updated tag description
 * @returns {Object} Updated tag data
 */
router.put('/tags/:id', verifyToken, checkContentPermissions, async (req, res) => {
  try {
    const { id } = req.params;
    const { tag_name, description } = req.body;

    if (!tag_name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    // Generate new slug if name changed
    const slug = tag_name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if tag exists
    const [existing] = await db.query('SELECT id FROM article_tags WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    await db.query(`
      UPDATE article_tags 
      SET name = ?, slug = ?
      WHERE id = ?
    `, [tag_name, slug, id]);

    const [updatedTag] = await db.query('SELECT * FROM article_tags WHERE id = ?', [id]);
    res.json(updatedTag[0]);
  } catch (err) {
    console.error('Error updating tag:', err);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

/**
 * DELETE /api/articles/tags/:id
 * Delete article tag and all relationships
 * Restricted to users with content management permissions
 * 
 * @route DELETE /api/articles/tags/:id
 * @middleware verifyToken - Requires user authentication
 * @middleware checkContentPermissions - Requires content management permissions
 * @param {string} id - Tag ID to delete
 * @returns {Object} Deletion confirmation message
 * @note Removes all tag-article relationships before deletion
 */
router.delete('/tags/:id', verifyToken, checkContentPermissions, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if tag exists
    const [existing] = await db.query('SELECT id FROM article_tags WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Delete tag relationships first
    await db.query('DELETE FROM article_tag_relations WHERE tag_id = ?', [id]);
    
    // Delete the tag
    await db.query('DELETE FROM article_tags WHERE id = ?', [id]);

    res.json({ message: 'Tag deleted successfully' });
  } catch (err) {
    console.error('Error deleting tag:', err);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// ===== TOPICS ENDPOINTS =====

/**
 * Middleware: Check if user has topic management permissions
 * Validates user permissions for topic creation, editing, and management
 * 
 * @middleware checkTopicPermissions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {void} Calls next() if authorized, returns 403 if unauthorized
 */
const checkTopicPermissions = async (req, res, next) => {
  try {
    const [userPermissions] = await db.query('SELECT * FROM user_permissions WHERE user_id = ?', [req.userId]);
    
    if (req.roles.includes('admin')) {
      return next(); // Admin has all permissions
    }
    
    if (userPermissions[0] && userPermissions[0].manage_content) {
      return next();
    }
    
    return res.status(403).json({ error: 'Content management permission required' });
  } catch (err) {
    console.error('Error checking topic permissions:', err);
    return res.status(500).json({ error: 'Permission check failed' });
  }
};

/**
 * Check access to topic based on restrictions
 * Implements fine-grained access control for topics based on user roles, permissions, and specific restrictions
 * 
 * @function checkTopicAccess
 * @param {number} userId - User ID requesting access
 * @param {Array} roles - User roles array
 * @param {Array} permissions - User permissions array
 * @param {number} topicId - Topic ID to check access for
 * @returns {Promise<boolean>} True if user has access, false otherwise
 */
const checkTopicAccess = async (userId, roles, permissions, topicId) => {
  try {
    // Get topic restrictions
    const [restrictions] = await db.query(
      'SELECT * FROM topic_restrictions WHERE topic_id = ?',
      [topicId]
    );
    
    // If no restrictions, it's public
    if (!restrictions.length) {
      return true;
    }
    
    // Check if user meets any restrictions
    for (const restriction of restrictions) {
      if (restriction.restriction_type === 'user_type') {
        if (roles.includes(restriction.restriction_value)) {
          return true;
        }
      } else if (restriction.restriction_type === 'permission') {
        if (permissions.includes(restriction.restriction_value)) {
          return true;
        }
      } else if (restriction.restriction_type === 'specific_user') {
        if (userId.toString() === restriction.restriction_value) {
          return true;
        }
      }
    }
    
    return false;
  } catch (err) {
    console.error('Error checking topic access:', err);
    return false;
  }
};

/**
 * GET /api/articles/topics
 * List topics with hierarchical structure and access control
 * Public endpoint that respects topic restrictions and user permissions
 * 
 * @route GET /api/articles/topics
 * @param {number} [parent_id] - Filter by parent topic ID for hierarchical browsing
 * @param {string} [include_articles=false] - Include article counts for each topic
 * @returns {Object} List of accessible topics with optional article counts
 */
router.get('/topics', async (req, res) => {
  try {
    const { parent_id, include_articles = 'false' } = req.query;
    
    let query = `
      SELECT 
        t.id, t.name, t.slug, t.description, t.parent_id, t.product_category_id,
        t.meta_title, t.meta_description, t.sort_order, t.created_at, t.updated_at,
        parent.name as parent_name
      FROM article_topics t
      LEFT JOIN article_topics parent ON t.parent_id = parent.id
    `;
    
    const queryParams = [];
    
    if (parent_id) {
      query += ` WHERE t.parent_id = ?`;
      queryParams.push(parent_id);
    }
    
    query += ` ORDER BY t.sort_order ASC, t.name ASC`;
    
    const [topics] = await db.query(query, queryParams);
    
    // Filter topics based on access control
    const accessibleTopics = [];
    const token = req.headers.authorization?.split(' ')[1];
    let userId = null, roles = [], permissions = [];
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
        roles = decoded.roles || [];
        permissions = decoded.permissions || [];
      } catch (err) {
        // Invalid token, continue as anonymous user
      }
    }
    
    for (const topic of topics) {
      const hasAccess = await checkTopicAccess(userId, roles, permissions, topic.id);
      if (hasAccess) {
        // Include article count if requested
        if (include_articles === 'true') {
          const [articleCount] = await db.query(`
            SELECT COUNT(*) as count
            FROM articles a
            JOIN article_topic_relations atr ON a.id = atr.article_id
            WHERE atr.topic_id = ? AND a.status = 'published'
          `, [topic.id]);
          topic.article_count = articleCount[0].count;
        }
        
        accessibleTopics.push(topic);
      }
    }
    
    res.json({ topics: accessibleTopics });
  } catch (err) {
    console.error('Error fetching topics:', err);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

/**
 * GET /api/articles/topics/:slug
 * Get single topic with comprehensive details and access control
 * Returns topic information, child topics, and recent articles
 * 
 * @route GET /api/articles/topics/:slug
 * @param {string} slug - Topic slug identifier
 * @returns {Object} Topic details with child topics, article count, and recent articles
 */
router.get('/topics/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Get topic with related data
    const [topic] = await db.query(`
      SELECT 
        t.*,
        parent.name as parent_name,
        parent.slug as parent_slug
      FROM article_topics t
      LEFT JOIN article_topics parent ON t.parent_id = parent.id
      WHERE t.slug = ?
    `, [slug]);
    
    if (!topic[0]) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    // Check access control
    const token = req.headers.authorization?.split(' ')[1];
    let userId = null, roles = [], permissions = [];
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
        roles = decoded.roles || [];
        permissions = decoded.permissions || [];
      } catch (err) {
        // Invalid token, continue as anonymous user
      }
    }
    
    const hasAccess = await checkTopicAccess(userId, roles, permissions, topic[0].id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get child topics
    const [childTopics] = await db.query(`
      SELECT id, name, slug, description
      FROM article_topics
      WHERE parent_id = ?
      ORDER BY sort_order ASC, name ASC
    `, [topic[0].id]);
    
    // Get article count
    const [articleCount] = await db.query(`
      SELECT COUNT(*) as count
      FROM articles a
      JOIN article_topic_relations atr ON a.id = atr.article_id
      WHERE atr.topic_id = ? AND a.status = 'published'
    `, [topic[0].id]);
    
    // Get recent articles in this topic
    const [recentArticles] = await db.query(`
      SELECT 
        a.id, a.title, a.slug, a.excerpt, a.published_at,
        u.username as author_username, up.display_name as author_display_name
      FROM articles a
      JOIN article_topic_relations atr ON a.id = atr.article_id
      JOIN users u ON a.author_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE atr.topic_id = ? AND a.status = 'published'
      ORDER BY a.published_at DESC
      LIMIT 5
    `, [topic[0].id]);
    
    res.json({
      topic: {
        ...topic[0],
        child_topics: childTopics,
        article_count: articleCount[0].count,
        recent_articles: recentArticles
      }
    });
  } catch (err) {
    console.error('Error fetching topic:', err);
    res.status(500).json({ error: 'Failed to fetch topic' });
  }
});

/**
 * POST /api/articles/topics
 * Create new topic with hierarchical support and access restrictions
 * Supports parent-child relationships and fine-grained access control
 * 
 * @route POST /api/articles/topics
 * @middleware verifyToken - Requires user authentication
 * @middleware checkTopicPermissions - Requires topic management permissions
 * @param {Object} req.body - Topic creation data
 * @param {string} req.body.name - Topic name (required)
 * @param {string} [req.body.description] - Topic description
 * @param {number} [req.body.parent_id] - Parent topic ID for hierarchy
 * @param {number} [req.body.product_category_id] - Related product category
 * @param {string} [req.body.meta_title] - SEO meta title
 * @param {string} [req.body.meta_description] - SEO meta description
 * @param {number} [req.body.sort_order=0] - Display sort order
 * @param {Array} [req.body.restrictions] - Access restriction rules
 * @returns {Object} Created topic confirmation with ID and slug
 */
router.post('/topics', verifyToken, checkTopicPermissions, async (req, res) => {
  try {
    const {
      name,
      description,
      parent_id,
      product_category_id,
      meta_title,
      meta_description,
      sort_order = 0,
      restrictions = []
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Topic name is required' });
    }
    
    // Generate slug
    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let counter = 1;
    
    // Ensure slug is unique
    while (true) {
      const [existing] = await db.query('SELECT id FROM article_topics WHERE slug = ?', [slug]);
      if (!existing[0]) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    // Create topic
    const [result] = await db.query(`
      INSERT INTO article_topics (
        name, slug, description, parent_id, product_category_id,
        meta_title, meta_description, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name,
      slug,
      description,
      parent_id,
      product_category_id,
      meta_title,
      meta_description,
      sort_order
    ]);
    
    const topicId = result.insertId;
    
    // Add restrictions if provided
    for (const restriction of restrictions) {
      await db.query(`
        INSERT INTO topic_restrictions (topic_id, restriction_type, restriction_value, logic_operator)
        VALUES (?, ?, ?, ?)
      `, [
        topicId,
        restriction.type,
        restriction.value,
        restriction.logic_operator || 'any_of'
      ]);
    }
    
    res.status(201).json({
      message: 'Topic created successfully',
      topic: {
        id: topicId,
        name,
        slug
      }
    });
  } catch (err) {
    console.error('Error creating topic:', err);
    res.status(500).json({ error: 'Failed to create topic' });
  }
});

/**
 * PUT /api/articles/topics/:id
 * Update existing topic with full metadata support
 * Supports updating hierarchy, SEO data, and access restrictions
 * 
 * @route PUT /api/articles/topics/:id
 * @middleware verifyToken - Requires user authentication
 * @middleware checkTopicPermissions - Requires topic management permissions
 * @param {string} id - Topic ID to update
 * @param {Object} req.body - Topic update data (same structure as POST)
 * @returns {Object} Update confirmation message
 */
router.put('/topics/:id', verifyToken, checkTopicPermissions, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      parent_id,
      product_category_id,
      meta_title,
      meta_description,
      sort_order,
      restrictions = []
    } = req.body;
    
    // Check if topic exists
    const [topic] = await db.query('SELECT * FROM article_topics WHERE id = ?', [id]);
    if (!topic[0]) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    // Update topic
    let updateFields = [];
    let updateValues = [];
    
    if (name) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    
    if (parent_id !== undefined) {
      updateFields.push('parent_id = ?');
      updateValues.push(parent_id);
    }
    
    if (product_category_id !== undefined) {
      updateFields.push('product_category_id = ?');
      updateValues.push(product_category_id);
    }
    
    if (meta_title !== undefined) {
      updateFields.push('meta_title = ?');
      updateValues.push(meta_title);
    }
    
    if (meta_description !== undefined) {
      updateFields.push('meta_description = ?');
      updateValues.push(meta_description);
    }
    
    if (sort_order !== undefined) {
      updateFields.push('sort_order = ?');
      updateValues.push(sort_order);
    }
    
    if (updateFields.length > 0) {
      updateValues.push(id);
      await db.query(`
        UPDATE article_topics SET ${updateFields.join(', ')} WHERE id = ?
      `, updateValues);
    }
    
    // Update restrictions
    if (restrictions.length > 0) {
      // Delete existing restrictions
      await db.query('DELETE FROM topic_restrictions WHERE topic_id = ?', [id]);
      
      // Add new restrictions
      for (const restriction of restrictions) {
        await db.query(`
          INSERT INTO topic_restrictions (topic_id, restriction_type, restriction_value, logic_operator)
          VALUES (?, ?, ?, ?)
        `, [
          id,
          restriction.type,
          restriction.value,
          restriction.logic_operator || 'any_of'
        ]);
      }
    }
    
    res.json({ message: 'Topic updated successfully' });
  } catch (err) {
    console.error('Error updating topic:', err);
    res.status(500).json({ error: 'Failed to update topic' });
  }
});

/**
 * DELETE /api/articles/topics/:id
 * Delete topic with validation for articles and child topics
 * Prevents deletion if topic has associated articles or child topics
 * 
 * @route DELETE /api/articles/topics/:id
 * @middleware verifyToken - Requires user authentication
 * @middleware checkTopicPermissions - Requires topic management permissions
 * @param {string} id - Topic ID to delete
 * @returns {Object} Deletion confirmation or error if topic has dependencies
 */
router.delete('/topics/:id', verifyToken, checkTopicPermissions, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if topic exists
    const [topic] = await db.query('SELECT * FROM article_topics WHERE id = ?', [id]);
    if (!topic[0]) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    // Check if topic has articles
    const [articleCount] = await db.query(`
      SELECT COUNT(*) as count
      FROM article_topic_relations
      WHERE topic_id = ?
    `, [id]);
    
    if (articleCount[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete topic with articles. Please reassign articles first.' 
      });
    }
    
    // Check if topic has child topics
    const [childCount] = await db.query(`
      SELECT COUNT(*) as count
      FROM article_topics
      WHERE parent_id = ?
    `, [id]);
    
    if (childCount[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete topic with child topics. Please reassign child topics first.' 
      });
    }
    
    // Delete topic (cascade will handle related records)
    await db.query('DELETE FROM article_topics WHERE id = ?', [id]);
    
    res.json({ message: 'Topic deleted successfully' });
  } catch (err) {
    console.error('Error deleting topic:', err);
    res.status(500).json({ error: 'Failed to delete topic' });
  }
});

/**
 * GET /api/articles/topics/:id/articles
 * Get paginated list of articles in specific topic
 * Includes access control validation for both topic and articles
 * 
 * @route GET /api/articles/topics/:id/articles
 * @param {string} id - Topic ID
 * @param {number} [page=1] - Page number for pagination
 * @param {number} [limit=10] - Number of articles per page
 * @param {string} [status=published] - Article status filter
 * @returns {Object} Paginated list of articles in topic with metadata
 */
router.get('/topics/:id/articles', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, status = 'published' } = req.query;
    const offset = (page - 1) * limit;
    
    // Check if topic exists and user has access
    const [topic] = await db.query('SELECT * FROM article_topics WHERE id = ?', [id]);
    if (!topic[0]) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    
    const token = req.headers.authorization?.split(' ')[1];
    let userId = null, roles = [], permissions = [];
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
        roles = decoded.roles || [];
        permissions = decoded.permissions || [];
      } catch (err) {
        // Invalid token, continue as anonymous user
      }
    }
    
    const hasAccess = await checkTopicAccess(userId, roles, permissions, id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get articles in topic
    const [articles] = await db.query(`
      SELECT 
        a.id, a.title, a.slug, a.excerpt, a.author_id, a.status, a.published_at, a.created_at,
        u.username as author_username, up.display_name as author_display_name,
        aa.view_count, aa.reading_time_minutes
      FROM articles a
      JOIN article_topic_relations atr ON a.id = atr.article_id
      JOIN users u ON a.author_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN article_analytics aa ON a.id = aa.article_id
      WHERE atr.topic_id = ? AND a.status = ?
      ORDER BY a.published_at DESC
      LIMIT ? OFFSET ?
    `, [id, status, parseInt(limit), parseInt(offset)]);
    
    // Get total count
    const [total] = await db.query(`
      SELECT COUNT(*) as count
      FROM articles a
      JOIN article_topic_relations atr ON a.id = atr.article_id
      WHERE atr.topic_id = ? AND a.status = ?
    `, [id, status]);
    
    res.json({
      articles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total[0].count,
        pages: Math.ceil(total[0].count / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching topic articles:', err);
    res.status(500).json({ error: 'Failed to fetch topic articles' });
  }
});

/**
 * GET /api/articles/by-id/:id
 * Get single article by ID with comprehensive metadata and access control
 * Returns complete article data including topics, tags, series navigation, and analytics
 * 
 * @route GET /api/articles/by-id/:id
 * @param {string} id - Article ID identifier
 * @returns {Object} Complete article data with metadata, navigation, and analytics
 * @note Used by Leo AI search system which returns article IDs
 */
router.get('/by-id/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get article with related data
    const [article] = await db.query(`
      SELECT 
        a.*,
        u.username as author_username, up.display_name as author_display_name,
        aseo.meta_title, aseo.meta_description, aseo.meta_keywords,
        asoc.og_title, asoc.og_description, asoc.twitter_card_type,
        aa.view_count, aa.reading_time_minutes
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN article_seo aseo ON a.id = aseo.article_id
      LEFT JOIN article_social asoc ON a.id = asoc.article_id
      LEFT JOIN article_analytics aa ON a.id = aa.article_id
      WHERE a.id = ?
    `, [id]);
    
    if (!article[0]) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Check access control
    const token = req.headers.authorization?.split(' ')[1];
    let userId = null, roles = [], permissions = [];
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
        roles = decoded.roles || [];
        permissions = decoded.permissions || [];
      } catch (err) {
        // Invalid token, continue as anonymous user
      }
    }
    
    const hasAccess = await checkArticleAccess(userId, roles, permissions, article[0].id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get topics
    const [topics] = await db.query(`
      SELECT t.id, t.name, t.slug
      FROM article_topics t
      JOIN article_topic_relations atr ON t.id = atr.topic_id
      WHERE atr.article_id = ?
    `, [article[0].id]);
    
    // Get tags
    const [tags] = await db.query(`
      SELECT t.id, t.name, t.slug
      FROM article_tags t
      JOIN article_tag_relations atr ON t.id = atr.tag_id
      WHERE atr.article_id = ?
    `, [article[0].id]);
    
    // Get series info
    const [series] = await db.query(`
      SELECT s.id, s.series_name, s.slug, asr.position_in_series
      FROM article_series s
      JOIN article_series_relations asr ON s.id = asr.series_id
      WHERE asr.article_id = ?
    `, [article[0].id]);

    // Get series navigation if article is part of a series
    let seriesNavigation = null;
    if (series[0]) {
      const seriesId = series[0].id;
      const currentPosition = series[0].position_in_series;
      
      // Get previous article
      const [prevArticle] = await db.query(`
        SELECT a.id, a.title, a.slug
        FROM articles a
        JOIN article_series_relations asr ON a.id = asr.article_id
        WHERE asr.series_id = ? AND asr.position_in_series = ? AND a.status = 'published'
        LIMIT 1
      `, [seriesId, currentPosition - 1]);
      
      // Get next article
      const [nextArticle] = await db.query(`
        SELECT a.id, a.title, a.slug
        FROM articles a
        JOIN article_series_relations asr ON a.id = asr.article_id
        WHERE asr.series_id = ? AND asr.position_in_series = ? AND a.status = 'published'
        LIMIT 1
      `, [seriesId, currentPosition + 1]);
      
      // Get total articles in series
      const [totalCount] = await db.query(`
        SELECT COUNT(*) as total
        FROM articles a
        JOIN article_series_relations asr ON a.id = asr.article_id
        WHERE asr.series_id = ? AND a.status = 'published'
      `, [seriesId]);
      
      seriesNavigation = {
        ...series[0],
        total_articles: totalCount[0].total,
        prev_article: prevArticle[0] || null,
        next_article: nextArticle[0] || null
      };
    }
    
    // Get connections
    const [connections] = await db.query(`
      SELECT connection_type, connection_id
      FROM article_connections
      WHERE article_id = ?
    `, [article[0].id]);
    
    // Update view count
    await db.query(`
      INSERT INTO article_analytics (article_id, view_count, last_viewed)
      VALUES (?, 1, NOW())
      ON DUPLICATE KEY UPDATE 
        view_count = view_count + 1,
        last_viewed = NOW()
    `, [article[0].id]);
    
    res.json({
      article: {
        ...article[0],
        topics,
        tags,
        series: seriesNavigation || null,
        connections
      }
    });
  } catch (err) {
    console.error('Error fetching article by ID:', err);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

/**
 * GET /api/articles/:slug
 * Get single article with comprehensive metadata and access control
 * Returns complete article data including topics, tags, series navigation, and analytics
 * 
 * @route GET /api/articles/:slug
 * @param {string} slug - Article slug identifier
 * @returns {Object} Complete article data with metadata, navigation, and analytics
 * @note MUST come after ALL specific routes to avoid route conflicts
 * @note Automatically updates view count when article is accessed
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Get article with related data
    const [article] = await db.query(`
      SELECT 
        a.*,
        u.username as author_username, up.display_name as author_display_name,
        aseo.meta_title, aseo.meta_description, aseo.meta_keywords,
        asoc.og_title, asoc.og_description, asoc.twitter_card_type,
        aa.view_count, aa.reading_time_minutes
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN article_seo aseo ON a.id = aseo.article_id
      LEFT JOIN article_social asoc ON a.id = asoc.article_id
      LEFT JOIN article_analytics aa ON a.id = aa.article_id
      WHERE a.slug = ?
    `, [slug]);
    
    if (!article[0]) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Check access control
    const token = req.headers.authorization?.split(' ')[1];
    let userId = null, roles = [], permissions = [];
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
        roles = decoded.roles || [];
        permissions = decoded.permissions || [];
      } catch (err) {
        // Invalid token, continue as anonymous user
      }
    }
    
    const hasAccess = await checkArticleAccess(userId, roles, permissions, article[0].id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get topics
    const [topics] = await db.query(`
      SELECT t.id, t.name, t.slug
      FROM article_topics t
      JOIN article_topic_relations atr ON t.id = atr.topic_id
      WHERE atr.article_id = ?
    `, [article[0].id]);
    
    // Get tags
    const [tags] = await db.query(`
      SELECT t.id, t.name, t.slug
      FROM article_tags t
      JOIN article_tag_relations atr ON t.id = atr.tag_id
      WHERE atr.article_id = ?
    `, [article[0].id]);
    
    // Get series info
    const [series] = await db.query(`
      SELECT s.id, s.series_name, s.slug, asr.position_in_series
      FROM article_series s
      JOIN article_series_relations asr ON s.id = asr.series_id
      WHERE asr.article_id = ?
    `, [article[0].id]);

    // Get series navigation if article is part of a series
    let seriesNavigation = null;
    if (series[0]) {
      const seriesId = series[0].id;
      const currentPosition = series[0].position_in_series;
      
      // Get previous article
      const [prevArticle] = await db.query(`
        SELECT a.id, a.title, a.slug
        FROM articles a
        JOIN article_series_relations asr ON a.id = asr.article_id
        WHERE asr.series_id = ? AND asr.position_in_series = ? AND a.status = 'published'
        LIMIT 1
      `, [seriesId, currentPosition - 1]);
      
      // Get next article
      const [nextArticle] = await db.query(`
        SELECT a.id, a.title, a.slug
        FROM articles a
        JOIN article_series_relations asr ON a.id = asr.article_id
        WHERE asr.series_id = ? AND asr.position_in_series = ? AND a.status = 'published'
        LIMIT 1
      `, [seriesId, currentPosition + 1]);
      
      // Get total articles in series
      const [totalCount] = await db.query(`
        SELECT COUNT(*) as total
        FROM articles a
        JOIN article_series_relations asr ON a.id = asr.article_id
        WHERE asr.series_id = ? AND a.status = 'published'
      `, [seriesId]);
      
      seriesNavigation = {
        ...series[0],
        total_articles: totalCount[0].total,
        prev_article: prevArticle[0] || null,
        next_article: nextArticle[0] || null
      };
    }
    
    // Get connections
    const [connections] = await db.query(`
      SELECT connection_type, connection_id
      FROM article_connections
      WHERE article_id = ?
    `, [article[0].id]);
    
    // Update view count
    await db.query(`
      INSERT INTO article_analytics (article_id, view_count, last_viewed)
      VALUES (?, 1, NOW())
      ON DUPLICATE KEY UPDATE 
        view_count = view_count + 1,
        last_viewed = NOW()
    `, [article[0].id]);
    
    res.json({
      article: {
        ...article[0],
        topics,
        tags,
        series: seriesNavigation || null,
        connections
      }
    });
  } catch (err) {
    console.error('Error fetching article:', err);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

module.exports = router; 