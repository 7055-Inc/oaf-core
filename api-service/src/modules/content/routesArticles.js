const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const jwt = require('jsonwebtoken');
const upload = require('../../config/multer');
const { requireAuth, requirePermission } = require('../auth/middleware');

function optionalAuth(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return { userId: null, roles: [], permissions: [] };
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { userId: decoded.userId, roles: decoded.roles || [], permissions: decoded.permissions || [] };
  } catch { return { userId: null, roles: [], permissions: [] }; }
}

const checkArticleAccess = async (userId, roles, permissions, articleId) => {
  try {
    const [restrictions] = await db.query('SELECT * FROM article_restrictions WHERE article_id = ?', [articleId]);
    if (!restrictions.length) return true;
    for (const r of restrictions) {
      if (r.restriction_type === 'user_type' && roles.includes(r.restriction_value)) return true;
      if (r.restriction_type === 'permission' && permissions.includes(r.restriction_value)) return true;
      if (r.restriction_type === 'specific_user' && String(userId) === r.restriction_value) return true;
    }
    return false;
  } catch { return false; }
};

const checkTopicAccess = async (userId, roles, permissions, topicId) => {
  try {
    const [restrictions] = await db.query('SELECT * FROM topic_restrictions WHERE topic_id = ?', [topicId]);
    if (!restrictions.length) return true;
    for (const r of restrictions) {
      if (r.restriction_type === 'user_type' && roles.includes(r.restriction_value)) return true;
      if (r.restriction_type === 'permission' && permissions.includes(r.restriction_value)) return true;
      if (r.restriction_type === 'specific_user' && String(userId) === r.restriction_value) return true;
    }
    return false;
  } catch { return false; }
};

const generateSlug = (title) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 100);

const calculateReadingTime = (content) => Math.ceil(content.split(/\s+/).length / 200);

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const fail = (res, code, message, status) => res.status(status).json({ success: false, error: { code, message, status } });

const hasManageContent = (roles, permissions) =>
  roles.includes('admin') || permissions.includes('manage_content');

const canAssignTaxonomy = async (userId, roles, permissions, table, id) => {
  const [rows] = await db.query(`SELECT visibility, owner_id FROM \`${table}\` WHERE id = ?`, [id]);
  if (!rows[0]) return false;
  const { visibility, owner_id } = rows[0];
  if (visibility === 'admin') return hasManageContent(roles, permissions);
  if (visibility === 'all_users') return true;
  if (visibility === 'private') return String(owner_id) === String(userId);
  return false;
};

const filterByVisibility = (items, userId, roles, permissions, forEditor) => {
  const canManage = hasManageContent(roles, permissions);
  return items.filter(item => {
    if (forEditor) {
      if (item.visibility === 'admin') return canManage;
      if (item.visibility === 'all_users') return true;
      if (item.visibility === 'private') return String(item.owner_id) === String(userId);
      return false;
    }
    if (item.visibility === 'admin' || item.visibility === 'all_users') return true;
    if (item.visibility === 'private') return String(item.owner_id) === String(userId);
    return false;
  });
};

// ============ ARTICLES ============

router.get('/', async (req, res) => {
  try {
    const { userId, roles } = optionalAuth(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let query = `
      SELECT a.id, a.title, a.content, a.excerpt, a.author_id, a.published_at, a.status,
             a.slug, a.page_type, a.section, a.featured_image_id, a.created_at, a.updated_at,
             u.username as author_username, COALESCE(up.display_name, u.username) as author_display_name
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
    `;
    const params = [];
    const conditions = [];

    const scopeMine = req.query.scope === 'mine' || (!roles.includes('admin') && userId);
    if (userId && scopeMine) { conditions.push('a.author_id = ?'); params.push(userId); }
    if (!userId) { conditions.push('a.status = ?'); params.push('published'); }
    else if (req.query.status && req.query.status !== 'all') { conditions.push('a.status = ?'); params.push(req.query.status); }
    if (req.query.page_type) { conditions.push('a.page_type = ?'); params.push(req.query.page_type); }
    if (req.query.section) { conditions.push('(a.section IS NOT NULL AND JSON_CONTAINS(a.section, ?))'); params.push(JSON.stringify(req.query.section)); }
    if (req.query.topic) {
      const topicSlugs = req.query.topic.split(',');
      conditions.push(`a.id IN (SELECT atr.article_id FROM article_topic_relations atr JOIN article_topics t ON atr.topic_id = t.id WHERE t.slug IN (${topicSlugs.map(() => '?').join(',')}))`);
      params.push(...topicSlugs);
    }
    if (req.query.tag) {
      conditions.push('a.id IN (SELECT atr2.article_id FROM article_tag_relations atr2 JOIN article_tags t2 ON atr2.tag_id = t2.id WHERE t2.slug = ?)');
      params.push(req.query.tag);
    }
    if (req.query.author) {
      conditions.push('u.username = ?');
      params.push(req.query.author);
    }
    if (req.query.year && req.query.month) {
      conditions.push('YEAR(a.published_at) = ? AND MONTH(a.published_at) = ?');
      params.push(parseInt(req.query.year), parseInt(req.query.month));
    }

    if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
    query += ' ORDER BY a.published_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [articles] = await db.query(query, params);

    for (const article of articles) {
      const [images] = await db.query(
        'SELECT id, image_url as url, friendly_name, is_primary, alt_text, `order`, category FROM article_images WHERE article_id = ? ORDER BY `order` ASC',
        [article.id]
      );
      article.images = images;
      const primaryImage = images.find(img => img.is_primary) || images[0];
      article.featured_image = primaryImage?.url || null;
    }

    let countQuery = 'SELECT COUNT(*) as total FROM articles a LEFT JOIN users u ON a.author_id = u.id';
    const countParams = params.slice(0, -2);
    if (conditions.length > 0) countQuery += ` WHERE ${conditions.join(' AND ')}`;
    const [countResult] = await db.query(countQuery, countParams);
    const totalItems = countResult[0].total;

    ok(res, {
      articles,
      pagination: { currentPage: page, totalPages: Math.ceil(totalItems / limit), totalItems, itemsPerPage: limit, hasNext: page < Math.ceil(totalItems / limit), hasPrev: page > 1 }
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    fail(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

// ============ TAGS ============

router.get('/tags', async (req, res) => {
  try {
    const { for_editor } = req.query;
    const { userId, roles, permissions } = optionalAuth(req);
    const [tags] = await db.query(`
      SELECT t.id, t.name, t.slug, t.visibility, t.owner_id, t.created_at, COUNT(DISTINCT atr.article_id) as article_count
      FROM article_tags t
      LEFT JOIN article_tag_relations atr ON t.id = atr.tag_id
      LEFT JOIN articles a ON atr.article_id = a.id AND a.status = 'published'
      GROUP BY t.id, t.name, t.slug, t.visibility, t.owner_id, t.created_at ORDER BY t.name ASC
    `);
    const filtered = filterByVisibility(tags, userId, roles, permissions, for_editor === 'true');
    ok(res, filtered);
  } catch (err) { console.error('Error fetching tags:', err); fail(res, 'INTERNAL_ERROR', err.message, 500); }
});

router.get('/tags/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const [tag] = await db.query('SELECT t.id, t.name, t.slug, t.created_at FROM article_tags t WHERE t.slug = ?', [slug]);
    if (!tag[0]) return fail(res, 'NOT_FOUND', 'Tag not found', 404);
    const [articles] = await db.query(`
      SELECT a.id, a.title, a.slug, a.excerpt, a.author_id, a.published_at, a.created_at,
             u.username as author_username, up.display_name as author_display_name, aa.view_count, aa.reading_time_minutes
      FROM articles a JOIN article_tag_relations atr ON a.id = atr.article_id
      JOIN users u ON a.author_id = u.id LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN article_analytics aa ON a.id = aa.article_id
      WHERE atr.tag_id = ? AND a.status = 'published' ORDER BY a.published_at DESC LIMIT ? OFFSET ?
    `, [tag[0].id, parseInt(limit), parseInt(offset)]);
    ok(res, { tag: tag[0], articles });
  } catch (err) { console.error('Error fetching tag:', err); fail(res, 'INTERNAL_ERROR', err.message, 500); }
});

router.post('/tags', requireAuth, async (req, res) => {
  try {
    const { tag_name, description, visibility: reqVisibility } = req.body;
    if (!tag_name) return fail(res, 'BAD_REQUEST', 'Tag name is required', 400);

    const canManage = hasManageContent(req.roles || [], req.permissions || []);
    const visibility = canManage ? (reqVisibility || 'admin') : 'private';
    if (!canManage && reqVisibility && reqVisibility !== 'private') return fail(res, 'FORBIDDEN', 'You can only create private tags', 403);

    const ownerId = visibility === 'private' ? req.userId : null;
    const slug = tag_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const [existing] = await db.query('SELECT id FROM article_tags WHERE slug = ?', [slug]);
    if (existing.length > 0) return fail(res, 'CONFLICT', 'Tag with this name already exists', 409);
    const [result] = await db.query('INSERT INTO article_tags (name, slug, visibility, owner_id) VALUES (?, ?, ?, ?)', [tag_name, slug, visibility, ownerId]);
    const [newTag] = await db.query('SELECT * FROM article_tags WHERE id = ?', [result.insertId]);
    ok(res, newTag[0], 201);
  } catch (err) { console.error('Error creating tag:', err); fail(res, 'INTERNAL_ERROR', err.message, 500); }
});

router.put('/tags/:id', requireAuth, requirePermission('manage_content'), async (req, res) => {
  try {
    const { id } = req.params;
    const { tag_name } = req.body;
    if (!tag_name) return fail(res, 'BAD_REQUEST', 'Tag name is required', 400);
    const slug = tag_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const [existing] = await db.query('SELECT id FROM article_tags WHERE id = ?', [id]);
    if (!existing.length) return fail(res, 'NOT_FOUND', 'Tag not found', 404);
    await db.query('UPDATE article_tags SET name = ?, slug = ? WHERE id = ?', [tag_name, slug, id]);
    const [updated] = await db.query('SELECT * FROM article_tags WHERE id = ?', [id]);
    ok(res, updated[0]);
  } catch (err) { console.error('Error updating tag:', err); fail(res, 'INTERNAL_ERROR', err.message, 500); }
});

router.delete('/tags/:id', requireAuth, requirePermission('manage_content'), async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await db.query('SELECT id FROM article_tags WHERE id = ?', [id]);
    if (!existing.length) return fail(res, 'NOT_FOUND', 'Tag not found', 404);
    await db.query('DELETE FROM article_tag_relations WHERE tag_id = ?', [id]);
    await db.query('DELETE FROM article_tags WHERE id = ?', [id]);
    ok(res, { message: 'Tag deleted successfully' });
  } catch (err) { console.error('Error deleting tag:', err); fail(res, 'INTERNAL_ERROR', err.message, 500); }
});

// ============ SERIES ============

router.get('/series', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const [series] = await db.query(`
      SELECT s.id, s.series_name, s.slug, s.description, s.created_at, s.updated_at, COUNT(asr.article_id) as article_count
      FROM article_series s LEFT JOIN article_series_relations asr ON s.id = asr.series_id
      LEFT JOIN articles a ON asr.article_id = a.id AND a.status = 'published'
      GROUP BY s.id, s.series_name, s.slug, s.description, s.created_at, s.updated_at
      ORDER BY s.created_at DESC LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);
    const [total] = await db.query('SELECT COUNT(*) as count FROM article_series');
    ok(res, { series, pagination: { page: parseInt(page), limit: parseInt(limit), total: total[0].count, pages: Math.ceil(total[0].count / limit) } });
  } catch (err) { console.error('Error fetching series:', err); fail(res, 'INTERNAL_ERROR', err.message, 500); }
});

router.get('/series/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const [series] = await db.query('SELECT s.id, s.series_name, s.slug, s.description, s.created_at, s.updated_at FROM article_series s WHERE s.slug = ?', [slug]);
    if (!series[0]) return fail(res, 'NOT_FOUND', 'Series not found', 404);
    const [articles] = await db.query(`
      SELECT a.id, a.title, a.slug, a.excerpt, a.author_id, a.status, a.published_at, a.created_at,
             u.username as author_username, up.display_name as author_display_name, aa.view_count, aa.reading_time_minutes, asr.position_in_series
      FROM articles a JOIN article_series_relations asr ON a.id = asr.article_id
      JOIN users u ON a.author_id = u.id LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN article_analytics aa ON a.id = aa.article_id
      WHERE asr.series_id = ? AND a.status = 'published' ORDER BY asr.position_in_series ASC
    `, [series[0].id]);

    const { userId, roles, permissions } = optionalAuth(req);
    const accessibleArticles = [];
    for (const article of articles) {
      if (await checkArticleAccess(userId, roles, permissions, article.id)) accessibleArticles.push(article);
    }
    ok(res, { series: series[0], articles: accessibleArticles });
  } catch (err) { console.error('Error fetching series:', err); fail(res, 'INTERNAL_ERROR', err.message, 500); }
});

router.post('/series', requireAuth, requirePermission('manage_content'), async (req, res) => {
  try {
    const { series_name, description } = req.body;
    if (!series_name) return fail(res, 'BAD_REQUEST', 'Series name is required', 400);
    const baseSlug = generateSlug(series_name);
    let slug = baseSlug, counter = 1;
    while (true) { const [ex] = await db.query('SELECT id FROM article_series WHERE slug = ?', [slug]); if (!ex[0]) break; slug = `${baseSlug}-${counter++}`; }
    const [result] = await db.query('INSERT INTO article_series (series_name, slug, description) VALUES (?, ?, ?)', [series_name, slug, description || null]);
    ok(res, { id: result.insertId, series_name, slug }, 201);
  } catch (err) { console.error('Error creating series:', err); fail(res, 'INTERNAL_ERROR', err.message, 500); }
});

// ============ TOPICS ============

router.get('/topics', async (req, res) => {
  try {
    const { parent_id, include_articles = 'false', for_editor } = req.query;
    let query = `SELECT t.id, t.name, t.slug, t.description, t.parent_id, t.product_category_id,
      t.meta_title, t.meta_description, t.sort_order, t.visibility, t.owner_id, t.created_at, t.updated_at, parent.name as parent_name
      FROM article_topics t LEFT JOIN article_topics parent ON t.parent_id = parent.id`;
    const qp = [];
    if (parent_id) { query += ' WHERE t.parent_id = ?'; qp.push(parent_id); }
    query += ' ORDER BY t.sort_order ASC, t.name ASC';
    const [topics] = await db.query(query, qp);

    const { userId, roles, permissions } = optionalAuth(req);
    const visibilityFiltered = filterByVisibility(topics, userId, roles, permissions, for_editor === 'true');
    const accessible = [];
    for (const topic of visibilityFiltered) {
      if (await checkTopicAccess(userId, roles, permissions, topic.id)) {
        if (include_articles === 'true') {
          const [ac] = await db.query('SELECT COUNT(*) as count FROM articles a JOIN article_topic_relations atr ON a.id = atr.article_id WHERE atr.topic_id = ? AND a.status = ?', [topic.id, 'published']);
          topic.article_count = ac[0].count;
        }
        accessible.push(topic);
      }
    }
    ok(res, { topics: accessible });
  } catch (err) { console.error('Error fetching topics:', err); fail(res, 'INTERNAL_ERROR', err.message, 500); }
});

router.get('/topics/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const [topic] = await db.query(`SELECT t.*, parent.name as parent_name, parent.slug as parent_slug
      FROM article_topics t LEFT JOIN article_topics parent ON t.parent_id = parent.id WHERE t.slug = ?`, [slug]);
    if (!topic[0]) return fail(res, 'NOT_FOUND', 'Topic not found', 404);

    const { userId, roles, permissions } = optionalAuth(req);
    if (!(await checkTopicAccess(userId, roles, permissions, topic[0].id))) return fail(res, 'FORBIDDEN', 'Access denied', 403);

    const [childTopics] = await db.query('SELECT id, name, slug, description FROM article_topics WHERE parent_id = ? ORDER BY sort_order ASC, name ASC', [topic[0].id]);
    const [articleCount] = await db.query('SELECT COUNT(*) as count FROM articles a JOIN article_topic_relations atr ON a.id = atr.article_id WHERE atr.topic_id = ? AND a.status = ?', [topic[0].id, 'published']);
    const [recentArticles] = await db.query(`
      SELECT a.id, a.title, a.slug, a.excerpt, a.published_at, u.username as author_username, up.display_name as author_display_name
      FROM articles a JOIN article_topic_relations atr ON a.id = atr.article_id
      JOIN users u ON a.author_id = u.id LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE atr.topic_id = ? AND a.status = 'published' ORDER BY a.published_at DESC LIMIT 5
    `, [topic[0].id]);

    ok(res, { topic: { ...topic[0], child_topics: childTopics, article_count: articleCount[0].count, recent_articles: recentArticles } });
  } catch (err) { console.error('Error fetching topic:', err); fail(res, 'INTERNAL_ERROR', err.message, 500); }
});

router.post('/topics', requireAuth, async (req, res) => {
  try {
    const { name, description, parent_id, product_category_id, meta_title, meta_description, sort_order = 0, restrictions = [], visibility: reqVisibility } = req.body;
    if (!name) return fail(res, 'BAD_REQUEST', 'Topic name is required', 400);

    const canManage = hasManageContent(req.roles || [], req.permissions || []);
    const visibility = canManage ? (reqVisibility || 'admin') : 'private';
    if (!canManage && reqVisibility && reqVisibility !== 'private') return fail(res, 'FORBIDDEN', 'You can only create private topics', 403);

    const ownerId = visibility === 'private' ? req.userId : null;
    const baseSlug = generateSlug(name);
    let slug = baseSlug, counter = 1;
    while (true) { const [ex] = await db.query('SELECT id FROM article_topics WHERE slug = ?', [slug]); if (!ex[0]) break; slug = `${baseSlug}-${counter++}`; }
    const [result] = await db.query('INSERT INTO article_topics (name, slug, description, parent_id, product_category_id, meta_title, meta_description, sort_order, visibility, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, slug, description, parent_id, product_category_id, meta_title, meta_description, sort_order, visibility, ownerId]);
    if (canManage) {
      for (const r of restrictions) { await db.query('INSERT INTO topic_restrictions (topic_id, restriction_type, restriction_value, logic_operator) VALUES (?, ?, ?, ?)', [result.insertId, r.type, r.value, r.logic_operator || 'any_of']); }
    }
    ok(res, { id: result.insertId, name, slug, visibility }, 201);
  } catch (err) { console.error('Error creating topic:', err); fail(res, 'INTERNAL_ERROR', err.message, 500); }
});

router.put('/topics/:id', requireAuth, requirePermission('manage_content'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, parent_id, product_category_id, meta_title, meta_description, sort_order, restrictions = [] } = req.body;
    const [topic] = await db.query('SELECT * FROM article_topics WHERE id = ?', [id]);
    if (!topic[0]) return fail(res, 'NOT_FOUND', 'Topic not found', 404);
    const fields = [], vals = [];
    if (name) { fields.push('name = ?'); vals.push(name); }
    if (description !== undefined) { fields.push('description = ?'); vals.push(description); }
    if (parent_id !== undefined) { fields.push('parent_id = ?'); vals.push(parent_id); }
    if (product_category_id !== undefined) { fields.push('product_category_id = ?'); vals.push(product_category_id); }
    if (meta_title !== undefined) { fields.push('meta_title = ?'); vals.push(meta_title); }
    if (meta_description !== undefined) { fields.push('meta_description = ?'); vals.push(meta_description); }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); vals.push(sort_order); }
    if (fields.length) { vals.push(id); await db.query(`UPDATE article_topics SET ${fields.join(', ')} WHERE id = ?`, vals); }
    if (restrictions.length) {
      await db.query('DELETE FROM topic_restrictions WHERE topic_id = ?', [id]);
      for (const r of restrictions) { await db.query('INSERT INTO topic_restrictions (topic_id, restriction_type, restriction_value, logic_operator) VALUES (?, ?, ?, ?)', [id, r.type, r.value, r.logic_operator || 'any_of']); }
    }
    ok(res, { message: 'Topic updated successfully' });
  } catch (err) { console.error('Error updating topic:', err); fail(res, 'INTERNAL_ERROR', err.message, 500); }
});

router.delete('/topics/:id', requireAuth, requirePermission('manage_content'), async (req, res) => {
  try {
    const { id } = req.params;
    const [topic] = await db.query('SELECT * FROM article_topics WHERE id = ?', [id]);
    if (!topic[0]) return fail(res, 'NOT_FOUND', 'Topic not found', 404);
    const [ac] = await db.query('SELECT COUNT(*) as count FROM article_topic_relations WHERE topic_id = ?', [id]);
    if (ac[0].count > 0) return fail(res, 'BAD_REQUEST', 'Cannot delete topic with articles. Please reassign articles first.', 400);
    const [cc] = await db.query('SELECT COUNT(*) as count FROM article_topics WHERE parent_id = ?', [id]);
    if (cc[0].count > 0) return fail(res, 'BAD_REQUEST', 'Cannot delete topic with child topics.', 400);
    await db.query('DELETE FROM article_topics WHERE id = ?', [id]);
    ok(res, { message: 'Topic deleted successfully' });
  } catch (err) { console.error('Error deleting topic:', err); fail(res, 'INTERNAL_ERROR', err.message, 500); }
});

router.get('/topics/:id/articles', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, status = 'published' } = req.query;
    const offset = (page - 1) * limit;
    const [topic] = await db.query('SELECT * FROM article_topics WHERE id = ?', [id]);
    if (!topic[0]) return fail(res, 'NOT_FOUND', 'Topic not found', 404);

    const { userId, roles, permissions } = optionalAuth(req);
    if (!(await checkTopicAccess(userId, roles, permissions, id))) return fail(res, 'FORBIDDEN', 'Access denied', 403);

    const [articles] = await db.query(`
      SELECT a.id, a.title, a.slug, a.excerpt, a.author_id, a.status, a.published_at, a.created_at,
             u.username as author_username, up.display_name as author_display_name, aa.view_count, aa.reading_time_minutes
      FROM articles a JOIN article_topic_relations atr ON a.id = atr.article_id
      JOIN users u ON a.author_id = u.id LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN article_analytics aa ON a.id = aa.article_id
      WHERE atr.topic_id = ? AND a.status = ? ORDER BY a.published_at DESC LIMIT ? OFFSET ?
    `, [id, status, parseInt(limit), parseInt(offset)]);
    const [total] = await db.query('SELECT COUNT(*) as count FROM articles a JOIN article_topic_relations atr ON a.id = atr.article_id WHERE atr.topic_id = ? AND a.status = ?', [id, status]);
    ok(res, { articles, pagination: { page: parseInt(page), limit: parseInt(limit), total: total[0].count, pages: Math.ceil(total[0].count / limit) } });
  } catch (err) { console.error('Error fetching topic articles:', err); fail(res, 'INTERNAL_ERROR', err.message, 500); }
});

// ============ ARTICLE CRUD ============

router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, content, excerpt, status = 'draft', page_type = 'article', section = null, images = [], topics = [], tags = [], series_id, position_in_series, connections = [], seo = {}, social = {}, restrictions = [] } = req.body;
    if (!title || !content) return fail(res, 'BAD_REQUEST', 'Title and content are required', 400);

    const canManage = hasManageContent(req.roles || [], req.permissions || []);
    if (status === 'published' && !canManage) return fail(res, 'FORBIDDEN', 'Only content managers can publish articles', 403);

    for (const topicId of topics) {
      if (!(await canAssignTaxonomy(req.userId, req.roles || [], req.permissions || [], 'article_topics', topicId)))
        return fail(res, 'FORBIDDEN', `You do not have permission to assign topic ${topicId}`, 403);
    }
    for (const tagId of tags) {
      if (!(await canAssignTaxonomy(req.userId, req.roles || [], req.permissions || [], 'article_tags', tagId)))
        return fail(res, 'FORBIDDEN', `You do not have permission to assign tag ${tagId}`, 403);
    }

    const baseSlug = generateSlug(title);
    let slug = baseSlug, counter = 1;
    while (true) { const [ex] = await db.query('SELECT id FROM articles WHERE slug = ?', [slug]); if (!ex[0]) break; slug = `${baseSlug}-${counter++}`; }
    const readingTime = calculateReadingTime(content);
    const sectionJson = Array.isArray(section) && section.length > 0 ? JSON.stringify(section) : null;
    const [result] = await db.query('INSERT INTO articles (title, slug, content, excerpt, author_id, status, page_type, section, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, slug, content, excerpt, req.userId, status, page_type, sectionJson, status === 'published' ? new Date() : null]);
    const articleId = result.insertId;
    await db.query('INSERT INTO article_analytics (article_id, reading_time_minutes) VALUES (?, ?)', [articleId, readingTime]);
    if (Object.keys(seo).length) await db.query('INSERT INTO article_seo (article_id, meta_title, meta_description, meta_keywords, focus_keyword) VALUES (?, ?, ?, ?, ?)', [articleId, seo.meta_title || null, seo.meta_description || null, seo.meta_keywords || null, seo.focus_keyword || null]);
    if (Object.keys(social).length) await db.query('INSERT INTO article_social (article_id, og_title, og_description, twitter_card_type) VALUES (?, ?, ?, ?)', [articleId, social.og_title || null, social.og_description || null, social.twitter_card_type || 'summary']);
    for (let i = 0; i < images.length; i++) { const img = images[i]; await db.query('INSERT INTO article_images (article_id, image_url, friendly_name, is_primary, alt_text, `order`, category) VALUES (?, ?, ?, ?, ?, ?, ?)', [articleId, img.url, img.friendly_name || null, img.is_primary ? 1 : 0, img.alt_text || null, img.order ?? i, img.category || 'content']); }
    for (const topicId of topics) await db.query('INSERT INTO article_topic_relations (article_id, topic_id) VALUES (?, ?)', [articleId, topicId]);
    for (const tagId of tags) await db.query('INSERT INTO article_tag_relations (article_id, tag_id) VALUES (?, ?)', [articleId, tagId]);
    if (series_id && position_in_series) await db.query('INSERT INTO article_series_relations (article_id, series_id, position_in_series) VALUES (?, ?, ?)', [articleId, series_id, position_in_series]);
    for (const c of connections) await db.query('INSERT INTO article_connections (article_id, connection_type, connection_id) VALUES (?, ?, ?)', [articleId, c.type, c.id]);
    if (canManage && restrictions.length) {
      for (const r of restrictions) await db.query('INSERT INTO article_restrictions (article_id, restriction_type, restriction_value, logic_operator) VALUES (?, ?, ?, ?)', [articleId, r.type, r.value, r.logic_operator || 'any_of']);
    }
    ok(res, { id: articleId, slug, title, status }, 201);
  } catch (err) { console.error('Error creating article:', err); fail(res, 'INTERNAL_ERROR', err.message, 500); }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, excerpt, status, page_type, section, images, topics = [], tags = [], series_id, position_in_series, connections = [], seo = {}, social = {}, restrictions = [] } = req.body;
    const [article] = await db.query('SELECT * FROM articles WHERE id = ?', [id]);
    if (!article[0]) return fail(res, 'NOT_FOUND', 'Article not found', 404);
    const [userPerm] = await db.query('SELECT * FROM user_permissions WHERE user_id = ?', [req.userId]);
    const isAdmin = (req.roles || []).includes('admin');
    const isAuthor = article[0].author_id === req.userId;
    const canManageContent = userPerm[0]?.manage_content || isAdmin;
    if (!isAuthor && !canManageContent) return fail(res, 'FORBIDDEN', 'Permission denied', 403);
    if (status === 'published' && !canManageContent) return fail(res, 'FORBIDDEN', 'Cannot publish articles', 403);

    for (const topicId of topics) {
      if (!(await canAssignTaxonomy(req.userId, req.roles || [], req.permissions || [], 'article_topics', topicId)))
        return fail(res, 'FORBIDDEN', `You do not have permission to assign topic ${topicId}`, 403);
    }
    for (const tagId of tags) {
      if (!(await canAssignTaxonomy(req.userId, req.roles || [], req.permissions || [], 'article_tags', tagId)))
        return fail(res, 'FORBIDDEN', `You do not have permission to assign tag ${tagId}`, 403);
    }

    const fields = [], vals = [];
    if (title) { fields.push('title = ?'); vals.push(title); }
    if (content) { fields.push('content = ?'); vals.push(content); await db.query('UPDATE article_analytics SET reading_time_minutes = ? WHERE article_id = ?', [calculateReadingTime(content), id]); }
    if (excerpt !== undefined) { fields.push('excerpt = ?'); vals.push(excerpt); }
    if (status) { fields.push('status = ?'); vals.push(status); if (status === 'published') { fields.push('published_at = ?'); vals.push(new Date()); } }
    if (page_type) { fields.push('page_type = ?'); vals.push(page_type); }
    if (section !== undefined) { fields.push('section = ?'); vals.push(Array.isArray(section) && section.length > 0 ? JSON.stringify(section) : null); }
    if (fields.length) { vals.push(id); await db.query(`UPDATE articles SET ${fields.join(', ')} WHERE id = ?`, vals); }

    if (images !== undefined) {
      await db.query('DELETE FROM article_images WHERE article_id = ?', [id]);
      if (images?.length) { for (let i = 0; i < images.length; i++) { const img = images[i]; await db.query('INSERT INTO article_images (article_id, image_url, friendly_name, is_primary, alt_text, `order`, category) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, img.url, img.friendly_name || null, img.is_primary ? 1 : 0, img.alt_text || null, img.order ?? i, img.category || 'content']); } }
    }
    if (topics.length) { await db.query('DELETE FROM article_topic_relations WHERE article_id = ?', [id]); for (const tid of topics) await db.query('INSERT INTO article_topic_relations (article_id, topic_id) VALUES (?, ?)', [id, tid]); }
    if (tags.length) { await db.query('DELETE FROM article_tag_relations WHERE article_id = ?', [id]); for (const tagId of tags) await db.query('INSERT INTO article_tag_relations (article_id, tag_id) VALUES (?, ?)', [id, tagId]); }
    if (series_id && position_in_series) { await db.query('DELETE FROM article_series_relations WHERE article_id = ?', [id]); await db.query('INSERT INTO article_series_relations (article_id, series_id, position_in_series) VALUES (?, ?, ?)', [id, series_id, position_in_series]); }
    if (connections.length) { await db.query('DELETE FROM article_connections WHERE article_id = ?', [id]); for (const c of connections) await db.query('INSERT INTO article_connections (article_id, connection_type, connection_id) VALUES (?, ?, ?)', [id, c.type, c.id]); }
    if (Object.keys(seo).length) await db.query('INSERT INTO article_seo (article_id, meta_title, meta_description, meta_keywords, focus_keyword) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE meta_title = VALUES(meta_title), meta_description = VALUES(meta_description), meta_keywords = VALUES(meta_keywords), focus_keyword = VALUES(focus_keyword)', [id, seo.meta_title || null, seo.meta_description || null, seo.meta_keywords || null, seo.focus_keyword || null]);
    if (Object.keys(social).length) await db.query('INSERT INTO article_social (article_id, og_title, og_description, twitter_card_type) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE og_title = VALUES(og_title), og_description = VALUES(og_description), twitter_card_type = VALUES(twitter_card_type)', [id, social.og_title || null, social.og_description || null, social.twitter_card_type || 'summary']);
    if (canManageContent && restrictions.length) {
      await db.query('DELETE FROM article_restrictions WHERE article_id = ?', [id]);
      for (const r of restrictions) await db.query('INSERT INTO article_restrictions (article_id, restriction_type, restriction_value, logic_operator) VALUES (?, ?, ?, ?)', [id, r.type, r.value, r.logic_operator || 'any_of']);
    }

    const [updated] = await db.query('SELECT a.*, u.username as author_username FROM articles a LEFT JOIN users u ON a.author_id = u.id WHERE a.id = ?', [id]);
    const [articleImages] = await db.query("SELECT id, image_url as url, friendly_name, is_primary, alt_text, `order`, category FROM article_images WHERE article_id = ? ORDER BY `order`", [id]);
    const [topicRels] = await db.query('SELECT topic_id FROM article_topic_relations WHERE article_id = ?', [id]);
    const [tagRels] = await db.query('SELECT tag_id FROM article_tag_relations WHERE article_id = ?', [id]);
    ok(res, { ...updated[0], images: articleImages, topic_ids: topicRels.map(r => r.topic_id), tag_ids: tagRels.map(r => r.tag_id) });
  } catch (err) { console.error('Error updating article:', err); fail(res, 'INTERNAL_ERROR', err.message, 500); }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [article] = await db.query('SELECT * FROM articles WHERE id = ?', [id]);
    if (!article[0]) return fail(res, 'NOT_FOUND', 'Article not found', 404);
    const isAdmin = (req.roles || []).includes('admin');
    if (article[0].author_id !== req.userId && !isAdmin) return fail(res, 'FORBIDDEN', 'Permission denied', 403);
    await db.query('DELETE FROM articles WHERE id = ?', [id]);
    ok(res, { message: 'Article deleted successfully' });
  } catch (err) { console.error('Error deleting article:', err); fail(res, 'INTERNAL_ERROR', err.message, 500); }
});

router.post('/:id/view', async (req, res) => {
  try {
    await db.query('INSERT INTO article_analytics (article_id, view_count, last_viewed) VALUES (?, 1, NOW()) ON DUPLICATE KEY UPDATE view_count = view_count + 1, last_viewed = NOW()', [req.params.id]);
    ok(res, { success: true });
  } catch (error) { console.error('Error updating view count:', error); fail(res, 'INTERNAL_ERROR', error.message, 500); }
});

// ============ BY-ID + SLUG (must be last) ============

router.get('/by-id/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [article] = await db.query(`
      SELECT a.*, u.username as author_username, up.display_name as author_display_name,
             aseo.meta_title, aseo.meta_description, aseo.meta_keywords,
             asoc.og_title, asoc.og_description, asoc.twitter_card_type, aa.view_count, aa.reading_time_minutes
      FROM articles a LEFT JOIN users u ON a.author_id = u.id LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN article_seo aseo ON a.id = aseo.article_id LEFT JOIN article_social asoc ON a.id = asoc.article_id
      LEFT JOIN article_analytics aa ON a.id = aa.article_id WHERE a.id = ?
    `, [id]);
    if (!article[0]) return fail(res, 'NOT_FOUND', 'Article not found', 404);

    const { userId, roles, permissions } = optionalAuth(req);
    if (!(await checkArticleAccess(userId, roles, permissions, article[0].id))) return fail(res, 'FORBIDDEN', 'Access denied', 403);

    const [topics] = await db.query('SELECT t.id, t.name, t.slug FROM article_topics t JOIN article_topic_relations atr ON t.id = atr.topic_id WHERE atr.article_id = ?', [article[0].id]);
    const [tags] = await db.query('SELECT t.id, t.name, t.slug FROM article_tags t JOIN article_tag_relations atr ON t.id = atr.tag_id WHERE atr.article_id = ?', [article[0].id]);
    const [series] = await db.query('SELECT s.id, s.series_name, s.slug, asr.position_in_series FROM article_series s JOIN article_series_relations asr ON s.id = asr.series_id WHERE asr.article_id = ?', [article[0].id]);
    let seriesNavigation = null;
    if (series[0]) {
      const [prev] = await db.query("SELECT a.id, a.title, a.slug FROM articles a JOIN article_series_relations asr ON a.id = asr.article_id WHERE asr.series_id = ? AND asr.position_in_series = ? AND a.status = 'published' LIMIT 1", [series[0].id, series[0].position_in_series - 1]);
      const [next] = await db.query("SELECT a.id, a.title, a.slug FROM articles a JOIN article_series_relations asr ON a.id = asr.article_id WHERE asr.series_id = ? AND asr.position_in_series = ? AND a.status = 'published' LIMIT 1", [series[0].id, series[0].position_in_series + 1]);
      const [total] = await db.query("SELECT COUNT(*) as total FROM articles a JOIN article_series_relations asr ON a.id = asr.article_id WHERE asr.series_id = ? AND a.status = 'published'", [series[0].id]);
      seriesNavigation = { ...series[0], total_articles: total[0].total, prev_article: prev[0] || null, next_article: next[0] || null };
    }
    const [connections] = await db.query('SELECT connection_type, connection_id FROM article_connections WHERE article_id = ?', [article[0].id]);
    await db.query('INSERT INTO article_analytics (article_id, view_count, last_viewed) VALUES (?, 1, NOW()) ON DUPLICATE KEY UPDATE view_count = view_count + 1, last_viewed = NOW()', [article[0].id]);
    ok(res, { article: { ...article[0], topics, tags, series: seriesNavigation, connections } });
  } catch (err) { console.error('Error fetching article by ID:', err); fail(res, 'INTERNAL_ERROR', err.message, 500); }
});

router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const [article] = await db.query(`
      SELECT a.*, u.username as author_username, up.display_name as author_display_name,
             aseo.meta_title, aseo.meta_description, aseo.meta_keywords,
             asoc.og_title, asoc.og_description, asoc.twitter_card_type, aa.view_count, aa.reading_time_minutes
      FROM articles a LEFT JOIN users u ON a.author_id = u.id LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN article_seo aseo ON a.id = aseo.article_id LEFT JOIN article_social asoc ON a.id = asoc.article_id
      LEFT JOIN article_analytics aa ON a.id = aa.article_id WHERE a.slug = ?
    `, [slug]);
    if (!article[0]) return fail(res, 'NOT_FOUND', 'Article not found', 404);

    const { userId, roles, permissions } = optionalAuth(req);
    if (!(await checkArticleAccess(userId, roles, permissions, article[0].id))) return fail(res, 'FORBIDDEN', 'Access denied', 403);

    const [topics] = await db.query('SELECT t.id, t.name, t.slug FROM article_topics t JOIN article_topic_relations atr ON t.id = atr.topic_id WHERE atr.article_id = ?', [article[0].id]);
    const [tags] = await db.query('SELECT t.id, t.name, t.slug FROM article_tags t JOIN article_tag_relations atr ON t.id = atr.tag_id WHERE atr.article_id = ?', [article[0].id]);
    const [series] = await db.query('SELECT s.id, s.series_name, s.slug, asr.position_in_series FROM article_series s JOIN article_series_relations asr ON s.id = asr.series_id WHERE asr.article_id = ?', [article[0].id]);
    let seriesNavigation = null;
    if (series[0]) {
      const [prev] = await db.query("SELECT a.id, a.title, a.slug FROM articles a JOIN article_series_relations asr ON a.id = asr.article_id WHERE asr.series_id = ? AND asr.position_in_series = ? AND a.status = 'published' LIMIT 1", [series[0].id, series[0].position_in_series - 1]);
      const [next] = await db.query("SELECT a.id, a.title, a.slug FROM articles a JOIN article_series_relations asr ON a.id = asr.article_id WHERE asr.series_id = ? AND asr.position_in_series = ? AND a.status = 'published' LIMIT 1", [series[0].id, series[0].position_in_series + 1]);
      const [total] = await db.query("SELECT COUNT(*) as total FROM articles a JOIN article_series_relations asr ON a.id = asr.article_id WHERE asr.series_id = ? AND a.status = 'published'", [series[0].id]);
      seriesNavigation = { ...series[0], total_articles: total[0].total, prev_article: prev[0] || null, next_article: next[0] || null };
    }
    const [connections] = await db.query('SELECT connection_type, connection_id FROM article_connections WHERE article_id = ?', [article[0].id]);
    await db.query('INSERT INTO article_analytics (article_id, view_count, last_viewed) VALUES (?, 1, NOW()) ON DUPLICATE KEY UPDATE view_count = view_count + 1, last_viewed = NOW()', [article[0].id]);
    const [images] = await db.query("SELECT id, image_url as url, friendly_name, is_primary, alt_text, `order`, category FROM article_images WHERE article_id = ? ORDER BY `order` ASC", [article[0].id]);
    ok(res, { article: { ...article[0], topics, tags, series: seriesNavigation, connections, images } });
  } catch (err) { console.error('Error fetching article:', err); fail(res, 'INTERNAL_ERROR', err.message, 500); }
});

// ============ UPLOAD ============

router.post('/upload', requireAuth, requirePermission('manage_content'), upload.array('images'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return fail(res, 'BAD_REQUEST', 'No files uploaded', 400);
    const { article_id } = req.query;
    if (article_id && article_id !== 'new') {
      const [article] = await db.query('SELECT * FROM articles WHERE id = ?', [article_id]);
      if (!article.length) return fail(res, 'NOT_FOUND', 'Article not found', 404);
      const [userPerm] = await db.query('SELECT * FROM user_permissions WHERE user_id = ?', [req.userId]);
      const isAdmin = userPerm[0]?.manage_system || false;
      const canManage = userPerm[0]?.manage_content || false;
      if (!isAdmin && !canManage && article[0].author_id !== req.userId) return fail(res, 'FORBIDDEN', 'Not authorized', 403);
    }
    const urls = [];
    for (const file of req.files) {
      const imagePath = `/temp_images/articles/${file.filename}`;
      await db.query('INSERT INTO pending_images (user_id, image_path, original_name, mime_type, status) VALUES (?, ?, ?, ?, ?)', [req.userId, imagePath, file.originalname, file.mimetype, 'pending']);
      urls.push(imagePath);
    }
    ok(res, { urls, message: `${urls.length} image(s) uploaded successfully` });
  } catch (err) { console.error('Error uploading article images:', err); fail(res, 'INTERNAL_ERROR', err.message, 500); }
});

module.exports = router;
