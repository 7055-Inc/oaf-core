const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');
const upload = require('../config/multer');
const path = require('path');
const fs = require('fs');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  console.log('Verifying token for articles request:', req.method, req.url);
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.roles = decoded.roles;
    req.permissions = decoded.permissions || [];
    console.log('Token verified, userId:', req.userId, 'roles:', req.roles, 'permissions:', req.permissions);
    next();
  } catch (err) {
    console.log('Invalid token:', err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Check if user has articles permissions
const checkArticlesPermissions = (permission) => {
  return async (req, res, next) => {
    try {
      const [userPermissions] = await db.query('SELECT * FROM user_permissions WHERE user_id = ?', [req.userId]);
      
      if (req.roles.includes('admin')) {
        return next(); // Admin has all permissions
      }
      
      if (userPermissions[0] && userPermissions[0][permission]) {
        return next();
      }
      
      return res.status(403).json({ error: 'Insufficient permissions for this action' });
    } catch (err) {
      console.error('Error checking permissions:', err);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Check access to article based on restrictions
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

// Generate slug from title
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

// GET /api/articles - List articles (public endpoint with access control)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, topic, author, tag, year, month, status = 'published' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        a.id, a.title, a.slug, a.excerpt, a.author_id, a.status, a.published_at, a.created_at,
        u.username as author_username, up.display_name as author_display_name,
        GROUP_CONCAT(DISTINCT t.name) as topics,
        aa.view_count, aa.reading_time_minutes
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN article_topic_relations atr ON a.id = atr.article_id
      LEFT JOIN article_topics t ON atr.topic_id = t.id
      LEFT JOIN article_analytics aa ON a.id = aa.article_id
    `;
    
    // Handle tag filtering with separate join
    if (tag) {
      query += `
        LEFT JOIN article_tag_relations atagr ON a.id = atagr.article_id
        LEFT JOIN article_tags atag ON atagr.tag_id = atag.id
      `;
    }
    
    query += ` WHERE a.status = ?`;
    const queryParams = [status];
    
    if (topic) {
      query += ` AND t.slug = ?`;
      queryParams.push(topic);
    }
    
    if (author) {
      query += ` AND u.username = ?`;
      queryParams.push(author);
    }
    
    if (tag) {
      query += ` AND atag.slug = ?`;
      queryParams.push(tag);
    }
    
    if (year) {
      query += ` AND YEAR(a.published_at) = ?`;
      queryParams.push(parseInt(year));
    }
    
    if (month) {
      query += ` AND MONTH(a.published_at) = ?`;
      queryParams.push(parseInt(month));
    }
    
    query += ` GROUP BY a.id ORDER BY a.published_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const [articles] = await db.query(query, queryParams);
    
    // Filter articles based on access control
    const accessibleArticles = [];
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
    
    for (const article of articles) {
      const hasAccess = await checkArticleAccess(userId, roles, permissions, article.id);
      if (hasAccess) {
        accessibleArticles.push(article);
      }
    }
    
    res.json({
      articles: accessibleArticles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: accessibleArticles.length
      }
    });
  } catch (err) {
    console.error('Error fetching articles:', err);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// GET /api/articles/:slug - Get single article
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

// POST /api/articles - Create new article
router.post('/', verifyToken, checkArticlesPermissions('create_articles'), async (req, res) => {
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

// PUT /api/articles/:id - Update article
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
    const canPublish = userPermissions[0]?.publish_articles || isAdmin;
    const canEdit = userPermissions[0]?.create_articles || userPermissions[0]?.publish_articles || isAdmin;
    
    if (!isAuthor && !canEdit) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // If changing status to published, check publish permission
    if (status === 'published' && !canPublish && !isAdmin) {
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

// DELETE /api/articles/:id - Delete article
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

// POST /api/articles/:id/view - Update view count for an article
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

module.exports = router; 