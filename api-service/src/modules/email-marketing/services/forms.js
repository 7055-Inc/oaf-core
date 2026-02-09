/**
 * Form Service
 * Handles email collection forms and public submissions
 */

const db = require('../../../../config/db');
const { generateEmailHash, normalizeEmail } = require('../utils/emailHash');
const { isValidEmail, sanitizeString, parseTags } = require('../utils/validation');
const EmailService = require('../../../services/emailService');

class FormService {
  /**
   * List user's forms
   * 
   * @param {number} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Forms
   */
  async listForms(userId, filters = {}) {
    const { site_id, is_active, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;
    
    let whereClause = ['user_id = ?'];
    let params = [userId];
    
    if (site_id) {
      whereClause.push('site_id = ?');
      params.push(site_id);
    }
    
    if (is_active !== undefined) {
      whereClause.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }
    
    const where = whereClause.join(' AND ');
    
    const [forms] = await db.execute(
      `SELECT * FROM email_collection_forms
      WHERE ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    return forms;
  }

  /**
   * Get form by ID
   * 
   * @param {number} userId - User ID
   * @param {number} formId - Form ID
   * @returns {Promise<Object>} Form
   */
  async getForm(userId, formId) {
    const [forms] = await db.execute(
      'SELECT * FROM email_collection_forms WHERE id = ? AND user_id = ?',
      [formId, userId]
    );
    
    return forms[0] || null;
  }

  /**
   * Create form
   * 
   * @param {number} userId - User ID
   * @param {Object} formData - Form configuration
   * @returns {Promise<Object>} Created form
   */
  async createForm(userId, formData) {
    const {
      site_id,
      form_name,
      form_type = 'inline',
      collect_first_name = 1,
      collect_last_name = 0,
      collect_custom_fields,
      form_title,
      form_description,
      submit_button_text = 'Subscribe',
      success_message,
      auto_tags = [],
      require_double_optin = 1,
      confirmation_template_key,
      redirect_url,
      custom_css,
      primary_color = '#055474',
      is_active = 1
    } = formData;
    
    const [result] = await db.execute(
      `INSERT INTO email_collection_forms (
        user_id, site_id, form_name, form_type,
        collect_first_name, collect_last_name, collect_custom_fields,
        form_title, form_description, submit_button_text, success_message,
        auto_tags, require_double_optin, confirmation_template_key,
        redirect_url, custom_css, primary_color, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        site_id || null,
        sanitizeString(form_name),
        form_type,
        collect_first_name ? 1 : 0,
        collect_last_name ? 1 : 0,
        collect_custom_fields ? JSON.stringify(collect_custom_fields) : null,
        sanitizeString(form_title),
        form_description,
        sanitizeString(submit_button_text, 100),
        success_message,
        JSON.stringify(parseTags(auto_tags)),
        require_double_optin ? 1 : 0,
        confirmation_template_key || null,
        redirect_url,
        custom_css,
        primary_color,
        is_active ? 1 : 0
      ]
    );
    
    const [form] = await db.execute(
      'SELECT * FROM email_collection_forms WHERE id = ?',
      [result.insertId]
    );
    
    return form[0];
  }

  /**
   * Update form
   * 
   * @param {number} userId - User ID
   * @param {number} formId - Form ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated form
   */
  async updateForm(userId, formId, updates) {
    const allowedFields = [
      'form_name', 'form_type', 'collect_first_name', 'collect_last_name',
      'collect_custom_fields', 'form_title', 'form_description',
      'submit_button_text', 'success_message', 'auto_tags',
      'require_double_optin', 'confirmation_template_key',
      'redirect_url', 'custom_css', 'primary_color', 'is_active'
    ];
    
    const setClause = [];
    const params = [];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (['auto_tags', 'collect_custom_fields'].includes(field) && updates[field]) {
          setClause.push(`${field} = ?`);
          params.push(JSON.stringify(field === 'auto_tags' ? parseTags(updates[field]) : updates[field]));
        } else {
          setClause.push(`${field} = ?`);
          params.push(updates[field]);
        }
      }
    }
    
    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    params.push(formId, userId);
    
    await db.execute(
      `UPDATE email_collection_forms
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?`,
      params
    );
    
    const [form] = await db.execute(
      'SELECT * FROM email_collection_forms WHERE id = ?',
      [formId]
    );
    
    return form[0];
  }

  /**
   * Delete form
   * 
   * @param {number} userId - User ID
   * @param {number} formId - Form ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteForm(userId, formId) {
    const [result] = await db.execute(
      'DELETE FROM email_collection_forms WHERE id = ? AND user_id = ?',
      [formId, userId]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Generate embed code for form
   * 
   * @param {number} formId - Form ID
   * @param {string} apiBaseUrl - API base URL
   * @returns {Promise<Object>} Embed code snippets
   */
  async getEmbedCode(formId, apiBaseUrl) {
    const embedCode = `<!-- Brakebee Email Collection Form -->
<div id="brakebee-form-${formId}"></div>
<script>
(function() {
  var formId = ${formId};
  var apiUrl = '${apiBaseUrl}/api/v2/email-marketing/public/subscribe/' + formId;
  
  // Load form styling
  var style = document.createElement('style');
  style.textContent = '.brakebee-form { max-width: 400px; margin: 0 auto; padding: 20px; }';
  document.head.appendChild(style);
  
  // Create form HTML
  var container = document.getElementById('brakebee-form-' + formId);
  container.innerHTML = '<form class="brakebee-form" id="form-' + formId + '">' +
    '<input type="email" name="email" placeholder="Email" required />' +
    '<input type="text" name="first_name" placeholder="First Name" />' +
    '<button type="submit">Subscribe</button>' +
    '</form><div id="message-' + formId + '"></div>';
  
  // Handle submission
  document.getElementById('form-' + formId).addEventListener('submit', function(e) {
    e.preventDefault();
    var data = {
      email: this.email.value,
      first_name: this.first_name.value
    };
    
    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(data => {
      document.getElementById('message-' + formId).innerHTML = 
        '<p>' + (data.message || 'Subscribed!') + '</p>';
      this.reset();
    })
    .catch(err => {
      document.getElementById('message-' + formId).innerHTML = 
        '<p>Error: ' + err.message + '</p>';
    });
  });
})();
</script>`;
    
    const iframeCode = `<iframe src="${apiBaseUrl}/forms/${formId}/embed" width="100%" height="400" frameborder="0"></iframe>`;
    
    return {
      embed_code: embedCode,
      iframe_code: iframeCode
    };
  }

  /**
   * Handle public form submission (no auth)
   * 
   * @param {number} formId - Form ID
   * @param {Object} submissionData - Submission data
   * @returns {Promise<Object>} Submission result
   */
  async handlePublicSubmission(formId, submissionData) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Get form
      const [forms] = await connection.execute(
        'SELECT * FROM email_collection_forms WHERE id = ? AND is_active = 1',
        [formId]
      );
      
      if (forms.length === 0) {
        throw new Error('Form not found or inactive');
      }
      
      const form = forms[0];
      const { email, first_name, last_name, custom_fields } = submissionData;
      
      // Validate email
      if (!isValidEmail(email)) {
        throw new Error('Invalid email address');
      }
      
      const normalizedEmail = normalizeEmail(email);
      const emailHash = generateEmailHash(normalizedEmail);
      
      // Check/create email_subscribers entry
      let subscriberId;
      
      const [existingSubscriber] = await connection.execute(
        'SELECT id, global_unsubscribe FROM email_subscribers WHERE email_hash = ?',
        [emailHash]
      );
      
      if (existingSubscriber.length > 0) {
        subscriberId = existingSubscriber[0].id;
        
        if (existingSubscriber[0].global_unsubscribe) {
          throw new Error('Email has unsubscribed globally');
        }
      } else {
        // Create new subscriber
        const [result] = await connection.execute(
          `INSERT INTO email_subscribers (
            email, email_hash, first_name, last_name,
            original_source, original_user_id
          ) VALUES (?, ?, ?, ?, 'form-submission', ?)`,
          [
            normalizedEmail,
            emailHash,
            sanitizeString(first_name, 100),
            sanitizeString(last_name, 100),
            form.user_id
          ]
        );
        
        subscriberId = result.insertId;
      }
      
      // Parse auto tags
      const autoTags = form.auto_tags ? JSON.parse(form.auto_tags) : [];
      
      // Create/update user_email_lists entry
      const [existing] = await connection.execute(
        'SELECT id FROM user_email_lists WHERE user_id = ? AND subscriber_id = ?',
        [form.user_id, subscriberId]
      );
      
      if (existing.length === 0) {
        await connection.execute(
          `INSERT INTO user_email_lists (
            user_id, subscriber_id, status, tags, custom_fields, source, source_site_id
          ) VALUES (?, ?, ?, ?, ?, 'form-submission', ?)`,
          [
            form.user_id,
            subscriberId,
            form.require_double_optin ? 'unsubscribed' : 'subscribed',
            JSON.stringify(autoTags),
            custom_fields ? JSON.stringify(custom_fields) : null,
            form.site_id
          ]
        );
      }
      
      // Increment form submissions
      await connection.execute(
        'UPDATE email_collection_forms SET total_submissions = total_submissions + 1 WHERE id = ?',
        [formId]
      );
      
      // Send double opt-in email if required
      if (form.require_double_optin) {
        try {
          const emailService = new EmailService();
          await emailService.sendEmail(
            form.user_id,
            form.confirmation_template_key || 'email-confirmation',
            {
              email: normalizedEmail,
              first_name: first_name || '',
              confirmation_link: `${process.env.FRONTEND_URL}/confirm-subscription?token=${emailHash}`
            }
          );
        } catch (error) {
          console.error('Error sending confirmation email:', error);
          // Don't fail the subscription
        }
      }
      
      await connection.commit();
      
      return {
        success: true,
        message: form.require_double_optin
          ? form.success_message || 'Please check your email to confirm your subscription.'
          : form.success_message || 'Successfully subscribed!',
        require_confirmation: form.require_double_optin
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new FormService();
