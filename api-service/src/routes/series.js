const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');

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

// GET /api/series - List all series
router.get('/', async (req, res) => {
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

// GET /api/series/:slug - Get single series with articles
router.get('/:slug', async (req, res) => {
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

module.exports = router; 