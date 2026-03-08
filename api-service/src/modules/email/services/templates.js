/**
 * Email Templates Service
 * Handles template CRUD operations for email management
 */

const db = require('../../../../config/db');

/**
 * Get all email templates
 */
async function getAllTemplates() {
  const [templates] = await db.execute(
    `SELECT id, template_key, name, priority_level, can_compile, 
            is_transactional, subject_template, body_template, 
            layout_key, created_at
     FROM email_templates
     ORDER BY name ASC`
  );
  return templates;
}

/**
 * Get a single template by ID
 */
async function getTemplateById(id) {
  const [templates] = await db.execute(
    `SELECT * FROM email_templates WHERE id = ?`,
    [id]
  );
  return templates.length > 0 ? templates[0] : null;
}

/**
 * Get a single template by key
 */
async function getTemplateByKey(templateKey) {
  const [templates] = await db.execute(
    `SELECT * FROM email_templates WHERE template_key = ?`,
    [templateKey]
  );
  return templates.length > 0 ? templates[0] : null;
}

/**
 * Update template content
 */
async function updateTemplate(id, updates) {
  const allowedFields = ['name', 'subject_template', 'body_template', 'priority_level', 'is_transactional', 'layout_key'];
  const fields = [];
  const values = [];
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key) && value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  
  if (fields.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  values.push(id);
  
  await db.execute(
    `UPDATE email_templates SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  
  return getTemplateById(id);
}

/**
 * Create a new template
 */
async function createTemplate(templateData) {
  const {
    template_key,
    name,
    subject_template,
    body_template,
    priority_level = 3,
    is_transactional = false,
    can_compile = true,
    layout_key = 'default'
  } = templateData;
  
  const [result] = await db.execute(
    `INSERT INTO email_templates 
     (template_key, name, subject_template, body_template, priority_level, is_transactional, can_compile, layout_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [template_key, name, subject_template, body_template, priority_level, is_transactional ? 1 : 0, can_compile ? 1 : 0, layout_key]
  );
  
  return getTemplateById(result.insertId);
}

/**
 * Delete a template
 */
async function deleteTemplate(id) {
  await db.execute('DELETE FROM email_templates WHERE id = ?', [id]);
}

/**
 * Get email layouts for template selection
 */
async function getLayouts() {
  const [layouts] = await db.execute(
    `SELECT * FROM email_layouts ORDER BY name ASC`
  );
  return layouts;
}

/**
 * Get template usage statistics
 */
async function getTemplateStats(templateId) {
  const [stats] = await db.execute(
    `SELECT 
       COUNT(*) as total_sent,
       SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as successful,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
       SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced
     FROM email_log
     WHERE template_id = ?`,
    [templateId]
  );
  return stats[0];
}

/**
 * Reset template to config defaults
 * Sets body_template and subject_template to NULL to use config defaults
 */
async function resetTemplateToDefault(id) {
  await db.execute(
    `UPDATE email_templates 
     SET body_template = NULL, subject_template = NULL 
     WHERE id = ?`,
    [id]
  );
  return getTemplateById(id);
}

module.exports = {
  getAllTemplates,
  getTemplateById,
  getTemplateByKey,
  updateTemplate,
  createTemplate,
  deleteTemplate,
  getLayouts,
  getTemplateStats,
  resetTemplateToDefault
};
