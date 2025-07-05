const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  console.log('Verifying token for tags request:', req.method, req.url);
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

// GET /api/tags - List all tags
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    const [tags] = await db.query(`
      SELECT 
        t.id, t.name, t.slug, t.created_at,
        COUNT(atr.article_id) as article_count
      FROM article_tags t
      LEFT JOIN article_tag_relations atr ON t.id = atr.tag_id
      LEFT JOIN articles a ON atr.article_id = a.id AND a.status = 'published'
      GROUP BY t.id, t.name, t.slug, t.created_at
      ORDER BY article_count DESC, t.name ASC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);

    // Get total count
    const [total] = await db.query(`
      SELECT COUNT(*) as count FROM article_tags
    `);

    res.json({
      tags,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total[0].count,
        pages: Math.ceil(total[0].count / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching tags:', err);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// GET /api/tags/:slug - Get single tag
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const [tag] = await db.query(`
      SELECT t.id, t.name, t.slug, t.created_at
      FROM article_tags t
      WHERE t.slug = ?
    `, [slug]);

    if (!tag[0]) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Get article count
    const [articleCount] = await db.query(`
      SELECT COUNT(*) as count
      FROM articles a
      JOIN article_tag_relations atr ON a.id = atr.article_id
      WHERE atr.tag_id = ? AND a.status = 'published'
    `, [tag[0].id]);

    res.json({
      tag: {
        ...tag[0],
        article_count: articleCount[0].count
      }
    });
  } catch (err) {
    console.error('Error fetching tag:', err);
    res.status(500).json({ error: 'Failed to fetch tag' });
  }
});

// POST /api/tags - Create new tag (admin only)
router.post('/', verifyToken, checkArticlesPermissions('manage_articles_topics'), async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }
    
    // Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    
    // Check if tag already exists
    const [existing] = await db.query('SELECT id FROM article_tags WHERE slug = ?', [slug]);
    if (existing[0]) {
      return res.status(400).json({ error: 'Tag already exists' });
    }
    
    const [result] = await db.query(`
      INSERT INTO article_tags (name, slug)
      VALUES (?, ?)
    `, [name, slug]);
    
    res.status(201).json({
      message: 'Tag created successfully',
      tag: {
        id: result.insertId,
        name,
        slug
      }
    });
  } catch (err) {
    console.error('Error creating tag:', err);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// PUT /api/tags/:id - Update tag (admin only)
router.put('/:id', verifyToken, checkArticlesPermissions('manage_articles_topics'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }
    
    // Generate new slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    
    // Check if tag exists
    const [tag] = await db.query('SELECT id FROM article_tags WHERE id = ?', [id]);
    if (!tag[0]) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    // Check if new slug conflicts with existing tag
    const [existing] = await db.query('SELECT id FROM article_tags WHERE slug = ? AND id != ?', [slug, id]);
    if (existing[0]) {
      return res.status(400).json({ error: 'Tag with this name already exists' });
    }
    
    await db.query(`
      UPDATE article_tags SET name = ?, slug = ? WHERE id = ?
    `, [name, slug, id]);
    
    res.json({ message: 'Tag updated successfully' });
  } catch (err) {
    console.error('Error updating tag:', err);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// DELETE /api/tags/:id - Delete tag (admin only)
router.delete('/:id', verifyToken, checkArticlesPermissions('manage_articles_topics'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if tag exists
    const [tag] = await db.query('SELECT id FROM article_tags WHERE id = ?', [id]);
    if (!tag[0]) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    // Delete tag relations first
    await db.query('DELETE FROM article_tag_relations WHERE tag_id = ?', [id]);
    
    // Delete tag
    await db.query('DELETE FROM article_tags WHERE id = ?', [id]);
    
    res.json({ message: 'Tag deleted successfully' });
  } catch (err) {
    console.error('Error deleting tag:', err);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

module.exports = router; 