/**
 * Campaign Service
 * Handles single blast email campaigns
 */

const db = require('../../../../config/db');
const EmailService = require('../../../services/emailService');

class CampaignService {
  /**
   * Create single blast campaign
   * 
   * @param {number} userId - User ID
   * @param {Object} campaignData - Campaign configuration
   * @returns {Promise<Object>} Created campaign
   */
  async createSingleBlast(userId, campaignData) {
    const {
      name,
      description,
      template_key,
      subject_line,
      target_list_filter = {},
      scheduled_send_at
    } = campaignData;
    
    const [result] = await db.execute(
      `INSERT INTO drip_campaigns (
        campaign_key, name, description, category,
        campaign_type, template_key,
        scheduled_send_at, send_status,
        target_list_filter,
        created_by, is_system, is_active
      ) VALUES (?, ?, ?, 'marketing', 'single_blast', ?, ?, 'draft', ?, ?, 0, 1)`,
      [
        `single-blast-${Date.now()}`,
        name,
        description,
        template_key,
        scheduled_send_at || null,
        JSON.stringify(target_list_filter),
        userId
      ]
    );
    
    const [campaign] = await db.execute(
      'SELECT * FROM drip_campaigns WHERE id = ?',
      [result.insertId]
    );
    
    return campaign[0];
  }

  /**
   * Schedule campaign send
   * 
   * @param {number} userId - User ID
   * @param {number} campaignId - Campaign ID
   * @param {string} scheduledAt - ISO datetime
   * @returns {Promise<Object>} Updated campaign
   */
  async scheduleCampaign(userId, campaignId, scheduledAt) {
    await db.execute(
      `UPDATE drip_campaigns
      SET scheduled_send_at = ?,
          send_status = 'scheduled',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND created_by = ? AND campaign_type = 'single_blast'`,
      [scheduledAt, campaignId, userId]
    );
    
    const [campaign] = await db.execute(
      'SELECT * FROM drip_campaigns WHERE id = ?',
      [campaignId]
    );
    
    return campaign[0];
  }

  /**
   * Send campaign immediately
   * 
   * @param {number} userId - User ID
   * @param {number} campaignId - Campaign ID
   * @returns {Promise<Object>} Send result
   */
  async sendNow(userId, campaignId) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Get campaign
      const [campaigns] = await connection.execute(
        `SELECT * FROM drip_campaigns
        WHERE id = ? AND created_by = ? AND campaign_type = 'single_blast'`,
        [campaignId, userId]
      );
      
      if (campaigns.length === 0) {
        throw new Error('Campaign not found');
      }
      
      const campaign = campaigns[0];
      
      if (campaign.send_status === 'sent') {
        throw new Error('Campaign already sent');
      }
      
      // Get recipients
      const recipients = await this.getRecipients(userId, campaignId);
      
      if (recipients.length === 0) {
        throw new Error('No recipients match the target list filter');
      }
      
      // Update campaign status
      await connection.execute(
        `UPDATE drip_campaigns
        SET send_status = 'sending',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [campaignId]
      );
      
      // Send emails (in background, don't wait)
      const emailService = new EmailService();
      let sent = 0;
      let errors = 0;
      
      for (const recipient of recipients) {
        try {
          await emailService.sendEmail(
            userId,
            campaign.template_key,
            {
              email: recipient.email,
              first_name: recipient.first_name || '',
              last_name: recipient.last_name || ''
            }
          );
          
          // Record analytics
          await connection.execute(
            `INSERT INTO email_campaign_analytics (
              campaign_id, user_list_id, subscriber_id,
              sent_at, email_subject
            ) VALUES (?, ?, ?, NOW(), ?)`,
            [
              campaignId,
              recipient.user_list_id,
              recipient.subscriber_id,
              campaign.name
            ]
          );
          
          sent++;
        } catch (error) {
          console.error(`Error sending to ${recipient.email}:`, error);
          errors++;
        }
      }
      
      // Update campaign status
      await connection.execute(
        `UPDATE drip_campaigns
        SET send_status = 'sent',
            sent_at = NOW(),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [campaignId]
      );
      
      await connection.commit();
      
      return {
        campaign_id: campaignId,
        total_recipients: recipients.length,
        sent,
        errors
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get recipients for campaign (preview)
   * 
   * @param {number} userId - User ID
   * @param {number} campaignId - Campaign ID
   * @returns {Promise<Array>} Recipients
   */
  async getRecipients(userId, campaignId) {
    // Get campaign
    const [campaigns] = await db.execute(
      'SELECT target_list_filter FROM drip_campaigns WHERE id = ? AND created_by = ?',
      [campaignId, userId]
    );
    
    if (campaigns.length === 0) {
      return [];
    }
    
    const campaign = campaigns[0];
    const filter = campaign.target_list_filter ? JSON.parse(campaign.target_list_filter) : {};
    
    // Build query based on filter
    let whereClause = ['uel.user_id = ?', 'uel.status = \'subscribed\''];
    let params = [userId];
    
    // Tag filter
    if (filter.tags && filter.tags.length > 0) {
      const tagConditions = filter.tags.map(() => 'JSON_CONTAINS(uel.tags, ?)').join(' OR ');
      whereClause.push(`(${tagConditions})`);
      filter.tags.forEach(tag => {
        params.push(JSON.stringify(tag));
      });
    }
    
    // Source filter
    if (filter.source) {
      whereClause.push('uel.source = ?');
      params.push(filter.source);
    }
    
    // Exclude global unsubscribe/bounce/spam
    whereClause.push('es.global_unsubscribe = 0');
    whereClause.push('es.global_bounce = 0');
    whereClause.push('es.global_spam_complaint = 0');
    
    const where = whereClause.join(' AND ');
    
    const [recipients] = await db.execute(
      `SELECT 
        uel.id as user_list_id,
        uel.subscriber_id,
        es.email,
        es.first_name,
        es.last_name
      FROM user_email_lists uel
      JOIN email_subscribers es ON uel.subscriber_id = es.id
      WHERE ${where}`,
      params
    );
    
    return recipients;
  }

  /**
   * Cancel scheduled campaign
   * 
   * @param {number} userId - User ID
   * @param {number} campaignId - Campaign ID
   * @returns {Promise<Object>} Updated campaign
   */
  async cancelCampaign(userId, campaignId) {
    await db.execute(
      `UPDATE drip_campaigns
      SET send_status = 'cancelled',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND created_by = ? AND send_status = 'scheduled'`,
      [campaignId, userId]
    );
    
    const [campaign] = await db.execute(
      'SELECT * FROM drip_campaigns WHERE id = ?',
      [campaignId]
    );
    
    return campaign[0];
  }

  /**
   * List user's single blast campaigns
   * 
   * @param {number} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Campaigns
   */
  async listCampaigns(userId, filters = {}) {
    const { send_status, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;
    
    let whereClause = ['created_by = ?', 'campaign_type = \'single_blast\''];
    let params = [userId];
    
    if (send_status) {
      whereClause.push('send_status = ?');
      params.push(send_status);
    }
    
    const where = whereClause.join(' AND ');
    
    const [campaigns] = await db.execute(
      `SELECT * FROM drip_campaigns
      WHERE ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    return campaigns;
  }
}

module.exports = new CampaignService();
