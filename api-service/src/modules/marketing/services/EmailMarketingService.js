/**
 * Email Marketing Service
 * 
 * Manages marketing email campaigns, templates, and sends
 * Integrates with existing emailService.js for actual email delivery
 */

const db = require('../../../../config/db');
const EmailService = require('../../../services/emailService');

class EmailMarketingService {
  constructor() {
    // Initialize email service (will use existing transactional email system)
    try {
      this.emailService = new EmailService();
    } catch (error) {
      console.warn('EmailService not available:', error.message);
      this.emailService = null;
    }
  }

  // ============================================================================
  // EMAIL CAMPAIGNS
  // ============================================================================

  /**
   * Create email campaign
   * @param {object} campaignData - Campaign data
   * @returns {Promise<object>}
   */
  async createCampaign(campaignData) {
    try {
      const [result] = await db.execute(
        `INSERT INTO email_campaigns 
         (marketing_campaign_id, name, subject, template_id, html_content, text_content,
          from_name, from_email, reply_to, status, scheduled_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          campaignData.marketing_campaign_id || null,
          campaignData.name,
          campaignData.subject,
          campaignData.template_id || null,
          campaignData.html_content || null,
          campaignData.text_content || null,
          campaignData.from_name || process.env.SMTP_FROM_NAME || 'Brakebee',
          campaignData.from_email || process.env.SMTP_FROM_EMAIL,
          campaignData.reply_to || null,
          campaignData.status || 'draft',
          campaignData.scheduled_at || null
        ]
      );

      return {
        success: true,
        campaignId: result.insertId
      };
    } catch (error) {
      console.error('Create email campaign error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get email campaigns
   * @param {object} filters - Filter options
   * @returns {Promise<object>}
   */
  async getCampaigns(filters = {}) {
    try {
      let query = 'SELECT * FROM email_campaigns WHERE 1=1';
      const params = [];

      if (filters.marketing_campaign_id) {
        query += ' AND marketing_campaign_id = ?';
        params.push(filters.marketing_campaign_id);
      }

      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      query += ' ORDER BY created_at DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(parseInt(filters.limit));
      }

      const [campaigns] = await db.execute(query, params);

      return {
        success: true,
        campaigns
      };
    } catch (error) {
      console.error('Get email campaigns error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get campaign by ID
   * @param {number} campaignId - Campaign ID
   * @returns {Promise<object>}
   */
  async getCampaignById(campaignId) {
    try {
      const [campaigns] = await db.execute(
        'SELECT * FROM email_campaigns WHERE id = ?',
        [campaignId]
      );

      if (campaigns.length === 0) {
        return {
          success: false,
          error: 'Campaign not found'
        };
      }

      return {
        success: true,
        campaign: campaigns[0]
      };
    } catch (error) {
      console.error('Get campaign error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update email campaign
   * @param {number} campaignId - Campaign ID
   * @param {object} updates - Fields to update
   * @returns {Promise<object>}
   */
  async updateCampaign(campaignId, updates) {
    try {
      const fields = [];
      const values = [];

      const allowedFields = [
        'name', 'subject', 'template_id', 'html_content', 'text_content',
        'from_name', 'from_email', 'reply_to', 'status', 'scheduled_at'
      ];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          fields.push(`${field} = ?`);
          values.push(updates[field]);
        }
      }

      if (fields.length === 0) {
        return {
          success: false,
          error: 'No valid fields to update'
        };
      }

      values.push(campaignId);

      await db.execute(
        `UPDATE email_campaigns SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      return {
        success: true
      };
    } catch (error) {
      console.error('Update campaign error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send email campaign
   * @param {number} campaignId - Campaign ID
   * @param {object} options - Send options (test: boolean, recipients: array)
   * @returns {Promise<object>}
   */
  async sendCampaign(campaignId, options = {}) {
    try {
      // Get campaign details
      const campaignResult = await this.getCampaignById(campaignId);
      if (!campaignResult.success) {
        return campaignResult;
      }

      const campaign = campaignResult.campaign;

      // Check if email service is available
      if (!this.emailService) {
        return {
          success: false,
          error: 'Email service not configured'
        };
      }

      // Update status to sending
      await this.updateCampaign(campaignId, { status: 'sending' });

      let recipients = [];
      
      if (options.test && options.recipients) {
        // Test send to specific recipients
        recipients = options.recipients;
      } else {
        // Get subscriber list
        const listResult = await this.getSubscriberList(options.listId);
        if (!listResult.success) {
          await this.updateCampaign(campaignId, { status: 'draft' });
          return listResult;
        }
        recipients = listResult.subscribers.map(s => s.email);
      }

      // Prepare email content
      let htmlContent = campaign.html_content;
      let textContent = campaign.text_content;

      // If using template, render it
      if (campaign.template_id) {
        const templateResult = await this.getTemplate(campaign.template_id);
        if (templateResult.success) {
          htmlContent = this.renderTemplate(templateResult.template.html_content, {});
          textContent = this.renderTemplate(templateResult.template.text_content, {});
        }
      }

      // Send emails
      const sendResults = [];
      let sentCount = 0;

      for (const recipientEmail of recipients) {
        try {
          // Personalize content for each recipient
          const personalizedHtml = this.personalizeContent(htmlContent, recipientEmail);
          const personalizedText = this.personalizeContent(textContent, recipientEmail);

          // Send via SMTP
          const result = await this.emailService.sendSMTPEmail({
            to: recipientEmail,
            subject: campaign.subject,
            html: personalizedHtml,
            text: personalizedText,
            replyTo: campaign.reply_to
          });

          if (result.messageId) {
            sentCount++;
            sendResults.push({ email: recipientEmail, success: true });
          }
        } catch (error) {
          console.error(`Failed to send to ${recipientEmail}:`, error);
          sendResults.push({ email: recipientEmail, success: false, error: error.message });
        }

        // Add small delay to avoid rate limiting
        await this.sleep(100);
      }

      // Update campaign stats
      await db.execute(
        `UPDATE email_campaigns 
         SET status = 'sent',
             sent_at = NOW(),
             total_recipients = ?,
             total_sent = ?
         WHERE id = ?`,
        [recipients.length, sentCount, campaignId]
      );

      return {
        success: true,
        totalRecipients: recipients.length,
        totalSent: sentCount,
        results: sendResults
      };
    } catch (error) {
      console.error('Send campaign error:', error);
      
      // Update status back to draft
      await this.updateCampaign(campaignId, { status: 'draft' });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get campaign statistics
   * @param {number} campaignId - Campaign ID
   * @returns {Promise<object>}
   */
  async getCampaignStats(campaignId) {
    try {
      const [campaigns] = await db.execute(
        `SELECT total_recipients, total_sent, total_opened, total_clicked, 
                total_unsubscribed, sent_at
         FROM email_campaigns 
         WHERE id = ?`,
        [campaignId]
      );

      if (campaigns.length === 0) {
        return {
          success: false,
          error: 'Campaign not found'
        };
      }

      const campaign = campaigns[0];

      const stats = {
        totalRecipients: campaign.total_recipients || 0,
        totalSent: campaign.total_sent || 0,
        totalOpened: campaign.total_opened || 0,
        totalClicked: campaign.total_clicked || 0,
        totalUnsubscribed: campaign.total_unsubscribed || 0,
        openRate: campaign.total_sent > 0 
          ? ((campaign.total_opened / campaign.total_sent) * 100).toFixed(2) 
          : 0,
        clickRate: campaign.total_sent > 0 
          ? ((campaign.total_clicked / campaign.total_sent) * 100).toFixed(2) 
          : 0,
        unsubscribeRate: campaign.total_sent > 0 
          ? ((campaign.total_unsubscribed / campaign.total_sent) * 100).toFixed(2) 
          : 0,
        sentAt: campaign.sent_at
      };

      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('Get campaign stats error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // EMAIL TEMPLATES
  // ============================================================================

  /**
   * Create email template
   * @param {object} templateData - Template data
   * @returns {Promise<object>}
   */
  async createTemplate(templateData) {
    try {
      const [result] = await db.execute(
        `INSERT INTO marketing_email_templates 
         (name, category, html_content, text_content, variables, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          templateData.name,
          templateData.category || null,
          templateData.html_content,
          templateData.text_content || null,
          JSON.stringify(templateData.variables || {}),
          templateData.created_by || null
        ]
      );

      return {
        success: true,
        templateId: result.insertId
      };
    } catch (error) {
      console.error('Create template error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get email templates
   * @param {object} filters - Filter options
   * @returns {Promise<object>}
   */
  async getTemplates(filters = {}) {
    try {
      let query = 'SELECT * FROM marketing_email_templates WHERE 1=1';
      const params = [];

      if (filters.category) {
        query += ' AND category = ?';
        params.push(filters.category);
      }

      query += ' ORDER BY created_at DESC';

      const [templates] = await db.execute(query, params);

      // Parse JSON fields
      templates.forEach(template => {
        if (template.variables && typeof template.variables === 'string') {
          template.variables = JSON.parse(template.variables);
        }
      });

      return {
        success: true,
        templates
      };
    } catch (error) {
      console.error('Get templates error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get template by ID
   * @param {number} templateId - Template ID
   * @returns {Promise<object>}
   */
  async getTemplate(templateId) {
    try {
      const [templates] = await db.execute(
        'SELECT * FROM marketing_email_templates WHERE id = ?',
        [templateId]
      );

      if (templates.length === 0) {
        return {
          success: false,
          error: 'Template not found'
        };
      }

      const template = templates[0];

      // Parse JSON fields
      if (template.variables && typeof template.variables === 'string') {
        template.variables = JSON.parse(template.variables);
      }

      return {
        success: true,
        template
      };
    } catch (error) {
      console.error('Get template error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // SUBSCRIBER LISTS
  // ============================================================================

  /**
   * Get subscriber list
   * @param {number} listId - List ID (optional, returns all active users if not specified)
   * @returns {Promise<object>}
   */
  async getSubscriberList(listId) {
    try {
      // For now, return all users who haven't unsubscribed
      // In production, this would support custom lists/segments
      const [subscribers] = await db.execute(
        `SELECT u.id, u.username as email, up.first_name, up.last_name
         FROM users u
         LEFT JOIN user_profiles up ON u.id = up.user_id
         LEFT JOIN user_email_preferences ep ON u.id = ep.user_id
         WHERE (ep.is_enabled IS NULL OR ep.is_enabled = 1)
           AND u.status = 'active'`
      );

      return {
        success: true,
        subscribers
      };
    } catch (error) {
      console.error('Get subscriber list error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle unsubscribe
   * @param {string} email - Email address
   * @param {number} campaignId - Campaign ID (optional)
   * @returns {Promise<object>}
   */
  async handleUnsubscribe(email, campaignId = null) {
    try {
      // Get user ID
      const [users] = await db.execute(
        'SELECT id FROM users WHERE username = ?',
        [email]
      );

      if (users.length === 0) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      const userId = users[0].id;

      // Update user preferences
      await db.execute(
        `INSERT INTO user_email_preferences (user_id, is_enabled, categories)
         VALUES (?, 0, '{"all": false}')
         ON DUPLICATE KEY UPDATE is_enabled = 0, categories = '{"all": false}'`,
        [userId]
      );

      // Update campaign stats if provided
      if (campaignId) {
        await db.execute(
          'UPDATE email_campaigns SET total_unsubscribed = total_unsubscribed + 1 WHERE id = ?',
          [campaignId]
        );
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Handle unsubscribe error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Render template with variables
   * @param {string} template - Template string
   * @param {object} variables - Variable values
   * @returns {string}
   */
  renderTemplate(template, variables) {
    if (!template) return '';
    
    let rendered = template;
    
    // Replace {{variable}} patterns
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, value || '');
    }
    
    return rendered;
  }

  /**
   * Personalize content for recipient
   * @param {string} content - Email content
   * @param {string} email - Recipient email
   * @returns {string}
   */
  personalizeContent(content, email) {
    if (!content) return '';
    
    // Add tracking pixels and unsubscribe links
    let personalized = content;
    
    // Add unsubscribe link if not present
    if (!personalized.includes('{{unsubscribe_link}}')) {
      const unsubscribeUrl = `${process.env.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
      personalized = personalized.replace(
        '</body>',
        `<div style="text-align: center; margin-top: 40px; font-size: 12px; color: #999;">
          <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe from this list</a>
        </div></body>`
      );
    }
    
    return personalized;
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
module.exports = new EmailMarketingService();
