const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  console.log('Verifying token for topics request:', req.method, req.url);
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

// Check if user has articles topic management permissions
const checkTopicPermissions = async (req, res, next) => {
  try {
    const [userPermissions] = await db.query('SELECT * FROM user_permissions WHERE user_id = ?', [req.userId]);
    
    if (req.roles.includes('admin')) {
      return next(); // Admin has all permissions
    }
    
    if (userPermissions[0] && userPermissions[0].manage_articles_topics) {
      return next();
    }
    
    return res.status(403).json({ error: 'Insufficient permissions for topic management' });
  } catch (err) {
    console.error('Error checking topic permissions:', err);
    return res.status(500).json({ error: 'Permission check failed' });
  }
};

// Check access to topic based on restrictions
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

// Generate slug from name
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
};

// GET /api/topics - List topics (public endpoint with access control)
router.get('/', async (req, res) => {
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

// GET /api/topics/:slug - Get single topic
router.get('/:slug', async (req, res) => {
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

// POST /api/topics - Create new topic
router.post('/', verifyToken, checkTopicPermissions, async (req, res) => {
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

// PUT /api/topics/:id - Update topic
router.put('/:id', verifyToken, checkTopicPermissions, async (req, res) => {
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
      await db.query('DELETE FROM topic_restrictions WHERE topic_id = ?', [id]);
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

// DELETE /api/topics/:id - Delete topic
router.delete('/:id', verifyToken, checkTopicPermissions, async (req, res) => {
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

// GET /api/topics/:id/articles - Get articles in topic
router.get('/:id/articles', async (req, res) => {
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

module.exports = router; 