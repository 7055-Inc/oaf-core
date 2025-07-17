const nodemailer = require('nodemailer');
const db = require('../../config/db');

class EmailService {
  constructor() {
    // Check if required environment variables are set
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USERNAME || !process.env.SMTP_PASSWORD) {
      console.error('Missing required SMTP environment variables:', {
        SMTP_HOST: process.env.SMTP_HOST ? 'SET' : 'NOT SET',
        SMTP_PORT: process.env.SMTP_PORT ? 'SET' : 'NOT SET',
        SMTP_USERNAME: process.env.SMTP_USERNAME ? 'SET' : 'NOT SET',
        SMTP_PASSWORD: process.env.SMTP_PASSWORD ? 'SET' : 'NOT SET'
      });
      throw new Error('Missing required SMTP environment variables');
    }

    // Configure SMTP transport
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  // ===== CORE EMAIL SENDING =====

  /**
   * Send email using template
   */
  async sendEmail(userId, templateKey, templateData = {}, options = {}) {
    try {
      // Get user email address
      const userEmail = await this.getUserEmail(userId);
      if (!userEmail) {
        throw new Error('User email not found');
      }

      // Check if user is blacklisted
      const isBlacklisted = await this.isEmailBlacklisted(userEmail);
      if (isBlacklisted) {
        throw new Error('Email address is blacklisted due to bounces');
      }

      // Get template
      const template = await this.getTemplate(templateKey);
      if (!template) {
        throw new Error(`Template '${templateKey}' not found`);
      }

      // Check user preferences for non-transactional emails
      if (!template.is_transactional) {
        const canSend = await this.checkUserPreferences(userId, templateKey);
        if (!canSend) {
          // Email blocked by user preferences
          return { success: false, reason: 'blocked_by_preferences' };
        }
      }

      // Render template
      const renderedSubject = this.renderTemplate(template.subject_template, templateData);
      const renderedBodyContent = this.renderTemplate(template.body_template, templateData);
      const renderedBody = await this.renderEmailWithLayout(renderedBodyContent, templateData);

      // Send email
      const result = await this.sendSMTPEmail({
        to: userEmail,
        subject: renderedSubject,
        html: renderedBody,
        ...options
      });

      // Log successful send
      await this.logEmailSend(userId, userEmail, template.id, renderedSubject, 'sent', 1);

      // Track send event
      await this.trackEmailEvent(result.logId, userId, userEmail, 'sent');

      return { success: true, messageId: result.messageId, logId: result.logId };

    } catch (error) {
      console.error('Email send error:', error);
      
      // Log failed send
      if (userId && templateKey) {
        const template = await this.getTemplate(templateKey);
        if (template) {
          const userEmail = await this.getUserEmail(userId);
          await this.logEmailSend(
            userId, 
            userEmail, 
            template.id, 
            'Failed to render', 
            'failed', 
            1, 
            error.message
          );
        }
      }

      throw error;
    }
  }

  /**
   * Queue email for later sending
   */
  async queueEmail(userId, templateKey, templateData = {}, options = {}) {
    try {
      // Get template to determine priority
      const template = await this.getTemplate(templateKey);
      if (!template) {
        throw new Error(`Template '${templateKey}' not found`);
      }

      // Determine when to send based on user preferences
      const scheduledFor = await this.calculateScheduledTime(userId, template);

      // Insert into queue
      const [result] = await db.execute(
        'INSERT INTO email_queue (user_id, template_id, priority, data, scheduled_for) VALUES (?, ?, ?, ?, ?)',
        [userId, template.id, options.priority || template.priority_level, JSON.stringify(templateData), scheduledFor]
      );

      return { success: true, queueId: result.insertId };

    } catch (error) {
      console.error('Email queue error:', error);
      throw error;
    }
  }

  // ===== TEMPLATE MANAGEMENT =====

  /**
   * Get template by key
   */
  async getTemplate(templateKey) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM email_templates WHERE template_key = ?',
        [templateKey]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Template fetch error:', error);
      throw error;
    }
  }

  /**
   * Render template with data
   */
  renderTemplate(template, data) {
    let rendered = template;
    
    // Simple template variable replacement: #{variable}
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`#{${key}}`, 'g');
      rendered = rendered.replace(regex, value || '');
    }
    
    return rendered;
  }

  /**
   * Wrap content in master email template
   */
  async renderEmailWithLayout(bodyContent, templateData) {
    // Get company data from database
    const companyData = await this.getCompanyData();
    
    // Master template HTML
    const masterTemplate = `<table width="600" cellpadding="0" cellspacing="0" border="0" align="center">
      <tr>
        <td>
          <!-- ROW 1: HEADER TABLE -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td bgcolor="#ffffff" align="center" valign="middle" height="120">
                <img src="https://main.onlineartfestival.com/static_media/logo.png" 
                     alt="Online Art Festival" 
                     width="auto" 
                     height="100" 
                     style="display: block; max-height: 100px; height: 100px;">
              </td>
            </tr>
            <tr>
              <td bgcolor="#ffffff" align="center">
                <!-- FAUX MENU TABLE -->
                <table cellpadding="8" cellspacing="0" border="0">
                  <tr>
                    <td width="20">&nbsp;</td>
                    <td bgcolor="#055474" align="center">
                      <font face="Helvetica Neue, Segoe UI, Tahoma, Arial, sans-serif" color="#ffffff" size="2">
                        <b>MY ACCOUNT</b>
                      </font>
                    </td>
                    <td width="10">&nbsp;</td>
                    <td bgcolor="#055474" align="center">
                      <font face="Helvetica Neue, Segoe UI, Tahoma, Arial, sans-serif" color="#ffffff" size="2">
                        <b>SHOP</b>
                      </font>
                    </td>
                    <td width="10">&nbsp;</td>
                    <td bgcolor="#055474" align="center">
                      <font face="Helvetica Neue, Segoe UI, Tahoma, Arial, sans-serif" color="#ffffff" size="2">
                        <b>EVENTS</b>
                      </font>
                    </td>
                    <td width="10">&nbsp;</td>
                    <td bgcolor="#055474" align="center">
                      <font face="Helvetica Neue, Segoe UI, Tahoma, Arial, sans-serif" color="#ffffff" size="2">
                        <b>HELP & INFO</b>
                      </font>
                    </td>
                    <td width="20">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td>
          <!-- ROW 2: BODY CONTENT -->
          <table width="100%" cellpadding="20" cellspacing="0" border="0">
            <tr>
              <td bgcolor="#ffffff">
                #{email_content}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td>
          <!-- ROW 3: FOOTER TABLE -->
          <table width="100%" cellpadding="20" cellspacing="0" border="0">
            <tr>
              <td bgcolor="#f8f8f8" align="center">
                <font face="Helvetica Neue, Segoe UI, Tahoma, Arial, sans-serif" color="#666666" size="2">
                  You received this email as a result of actions taken on OnlineArtFestival.com<br>
                  If you'd like to change your preferences or frequency, you may click here: 
                  <a href="#{preferences_link}" style="color: #055474;">Manage Email Preferences</a>
                  <br><br>
                  
                  This email was sent by #{company_name}<br>
                  #{company_address_city}, #{company_address_state} #{company_address_postal_code}<br>
                  Contact us: <a href="mailto:#{company_contact_email}" style="color: #055474;">#{company_contact_email}</a>
                  <br><br>
                  
                  <font color="#999999" size="1">
                    All images and content © 2020-2025 #{company_name} LLC.<br>
                    Images, content and likenesses may not be used or reproduced without permission.
                  </font>
                </font>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;

    // Combine template data with company data
    const allData = {
      ...templateData,
      email_content: bodyContent,
      preferences_link: 'https://main.onlineartfestival.com/dashboard/email-preferences',
      company_name: companyData.company_name,
      company_contact_email: companyData.contact_email,
      company_address_city: companyData.address_city,
      company_address_state: companyData.address_state,
      company_address_postal_code: companyData.address_postal_code
    };

    return this.renderTemplate(masterTemplate, allData);
  }

  /**
   * Get company data from database
   */
  async getCompanyData() {
    try {
      const [rows] = await db.execute(
        'SELECT company_name, contact_info, address_info FROM schema_company_data WHERE is_active = 1 LIMIT 1'
      );
      
      if (rows.length === 0) {
        throw new Error('Company data not found');
      }
      
      const company = rows[0];
      const contactInfo = typeof company.contact_info === 'string' 
        ? JSON.parse(company.contact_info) 
        : company.contact_info;
      const addressInfo = typeof company.address_info === 'string'
        ? JSON.parse(company.address_info)
        : company.address_info;
      
      return {
        company_name: company.company_name,
        contact_email: contactInfo.email,
        address_city: addressInfo.city,
        address_state: addressInfo.state,
        address_postal_code: addressInfo.postal_code
      };
    } catch (error) {
      console.error('Error fetching company data:', error);
      // Return defaults if company data fails
      return {
        company_name: 'Online Art Festival',
        contact_email: 'hello@onlineartfestival.com',
        address_city: 'Harris',
        address_state: 'Iowa',
        address_postal_code: '51345'
      };
    }
  }

  // ===== USER PREFERENCES =====

  /**
   * Check if user preferences allow this email
   */
  async checkUserPreferences(userId, templateKey) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM user_email_preferences WHERE user_id = ?',
        [userId]
      );

      const preferences = rows[0];
      if (!preferences || !preferences.is_enabled) {
        return false;
      }

      // Check categories if specified
      if (preferences.categories) {
        const categories = typeof preferences.categories === 'string' 
          ? JSON.parse(preferences.categories) 
          : preferences.categories;
        // For now, assume all emails are in 'all' category
        // This can be expanded based on template categorization
        return categories.all !== false;
      }

      return true;
    } catch (error) {
      console.error('User preferences check error:', error);
      return false;
    }
  }

  /**
   * Calculate when to send email based on user frequency preference
   */
  async calculateScheduledTime(userId, template) {
    try {
      // Transactional emails always send immediately
      if (template.is_transactional) {
        return new Date();
      }

      const [rows] = await db.execute(
        'SELECT frequency FROM user_email_preferences WHERE user_id = ?',
        [userId]
      );

      const frequency = rows[0]?.frequency || 'live';
      const now = new Date();

      switch (frequency) {
        case 'live':
          return now;
        case 'hourly':
          // Send at the top of the next hour
          const nextHour = new Date(now);
          nextHour.setHours(now.getHours() + 1, 0, 0, 0);
          return nextHour;
        case 'daily':
          // Send at 8 AM next day
          const nextDay = new Date(now);
          nextDay.setDate(now.getDate() + 1);
          nextDay.setHours(8, 0, 0, 0);
          return nextDay;
        case 'weekly':
          // Send at 8 AM next Monday
          const nextWeek = new Date(now);
          const daysUntilMonday = (1 + 7 - now.getDay()) % 7 || 7;
          nextWeek.setDate(now.getDate() + daysUntilMonday);
          nextWeek.setHours(8, 0, 0, 0);
          return nextWeek;
        default:
          return now;
      }
    } catch (error) {
      console.error('Scheduled time calculation error:', error);
      return new Date(); // Default to immediate
    }
  }

  // ===== BOUNCE MANAGEMENT =====

  /**
   * Check if email address is blacklisted
   */
  async isEmailBlacklisted(emailAddress) {
    try {
      const [rows] = await db.execute(
        'SELECT is_blacklisted FROM bounce_tracking WHERE email_address = ?',
        [emailAddress]
      );
      return rows[0]?.is_blacklisted || false;
    } catch (error) {
      console.error('Blacklist check error:', error);
      return false;
    }
  }

  /**
   * Handle email bounce
   */
  async handleBounce(emailAddress, bounceType, error) {
    try {
      // Get current bounce info
      const [rows] = await db.execute(
        'SELECT * FROM bounce_tracking WHERE email_address = ?',
        [emailAddress]
      );

      let bounceCount = 1;
      let isBlacklisted = false;

      if (rows.length > 0) {
        const existing = rows[0];
        bounceCount = existing.bounce_count + 1;
        
        // Blacklist logic
        if (bounceType === 'hard' && bounceCount >= 3) {
          isBlacklisted = true;
        } else if (bounceType === 'soft' && bounceCount >= 5) {
          isBlacklisted = true;
        }

        // Update existing record
        await db.execute(
          'UPDATE bounce_tracking SET bounce_count = ?, last_bounce_date = NOW(), bounce_type = ?, is_blacklisted = ?, last_error = ? WHERE email_address = ?',
          [bounceCount, bounceType, isBlacklisted, error, emailAddress]
        );
      } else {
        // Create new bounce record
        await db.execute(
          'INSERT INTO bounce_tracking (email_address, bounce_count, last_bounce_date, bounce_type, is_blacklisted, last_error) VALUES (?, ?, NOW(), ?, ?, ?)',
          [emailAddress, bounceCount, bounceType, isBlacklisted, error]
        );
      }

      return { bounceCount, isBlacklisted };
    } catch (error) {
      console.error('Bounce handling error:', error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Get user email address
   */
  async getUserEmail(userId) {
    try {
      const [rows] = await db.execute(
        'SELECT username as email FROM users WHERE id = ?',
        [userId]
      );
      return rows[0]?.email || null;
    } catch (error) {
      console.error('User email fetch error:', error);
      return null;
    }
  }

  /**
   * Send email via SMTP
   */
  async sendSMTPEmail(options) {
    try {
      const mailOptions = {
        from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      };

      const info = await this.transporter.sendMail(mailOptions);
      return { messageId: info.messageId, logId: null };
    } catch (error) {
      console.error('SMTP send error:', error);
      throw error;
    }
  }

  /**
   * Log email send attempt
   */
  async logEmailSend(userId, emailAddress, templateId, subject, status, attemptCount, errorMessage = null) {
    try {
      const [result] = await db.execute(
        'INSERT INTO email_log (user_id, email_address, template_id, subject, status, attempt_count, error_message) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, emailAddress, templateId, subject, status, attemptCount, errorMessage]
      );
      return result.insertId;
    } catch (error) {
      console.error('Email log error:', error);
      throw error;
    }
  }

  /**
   * Track email event
   */
  async trackEmailEvent(logId, userId, emailAddress, eventType, eventData = null) {
    try {
      await db.execute(
        'INSERT INTO email_tracking (email_log_id, user_id, email_address, event_type, event_data) VALUES (?, ?, ?, ?, ?)',
        [logId, userId, emailAddress, eventType, JSON.stringify(eventData)]
      );
    } catch (error) {
      console.error('Email tracking error:', error);
    }
  }

  // ===== QUEUE PROCESSING =====

  /**
   * Process email queue (for cron job)
   */
  async processQueue(batchSize = 10) {
    try {
      // Get pending emails ordered by priority and scheduled time
      const [rows] = await db.execute(
        'SELECT * FROM email_queue WHERE status = "pending" AND scheduled_for <= NOW() ORDER BY priority ASC, scheduled_for ASC LIMIT ?',
        [batchSize]
      );

      const results = [];
      for (const queueItem of rows) {
        try {
          // Mark as processing
          await db.execute(
            'UPDATE email_queue SET status = "processing" WHERE id = ?',
            [queueItem.id]
          );

          // Send email
          const templateData = JSON.parse(queueItem.data);
          const template = await this.getTemplateById(queueItem.template_id);
          
          const result = await this.sendEmail(
            queueItem.user_id,
            template.template_key,
            templateData,
            { priority: queueItem.priority }
          );

          // Mark as sent
          await db.execute(
            'UPDATE email_queue SET status = "sent" WHERE id = ?',
            [queueItem.id]
          );

          results.push({ id: queueItem.id, success: true });
        } catch (error) {
          console.error(`Queue processing error for item ${queueItem.id}:`, error);
          
          // Mark as failed
          await db.execute(
            'UPDATE email_queue SET status = "failed" WHERE id = ?',
            [queueItem.id]
          );

          results.push({ id: queueItem.id, success: false, error: error.message });
        }
      }

      return results;
    } catch (error) {
      console.error('Queue processing error:', error);
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM email_templates WHERE id = ?',
        [templateId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Template fetch by ID error:', error);
      throw error;
    }
  }
}

module.exports = EmailService; 