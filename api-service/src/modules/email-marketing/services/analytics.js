/**
 * Analytics Service
 * Handles email marketing analytics and tracking
 */

const db = require('../../../../config/db');

class AnalyticsService {
  /**
   * Get overview analytics for user
   * 
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Overview statistics
   */
  async getOverview(userId) {
    // Total subscribers
    const [subscriberStats] = await db.execute(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'subscribed' THEN 1 ELSE 0 END) as subscribed,
        SUM(CASE WHEN status = 'unsubscribed' THEN 1 ELSE 0 END) as unsubscribed
      FROM user_email_lists
      WHERE user_id = ?`,
      [userId]
    );
    
    // Email campaign stats
    const [campaignStats] = await db.execute(
      `SELECT 
        COUNT(DISTINCT eca.id) as total_emails_sent,
        SUM(eca.opened) as total_opens,
        SUM(eca.clicked) as total_clicks,
        SUM(eca.bounced) as total_bounces,
        SUM(eca.spam_complaint) as total_spam
      FROM email_campaign_analytics eca
      JOIN drip_campaigns dc ON eca.campaign_id = dc.id
      WHERE dc.created_by = ?`,
      [userId]
    );
    
    const stats = campaignStats[0];
    const totalSent = stats.total_emails_sent || 0;
    
    return {
      subscribers: {
        total: subscriberStats[0].total || 0,
        subscribed: subscriberStats[0].subscribed || 0,
        unsubscribed: subscriberStats[0].unsubscribed || 0
      },
      campaigns: {
        total_emails_sent: totalSent,
        total_opens: stats.total_opens || 0,
        total_clicks: stats.total_clicks || 0,
        total_bounces: stats.total_bounces || 0,
        total_spam: stats.total_spam || 0,
        open_rate: totalSent > 0 ? ((stats.total_opens / totalSent) * 100).toFixed(2) : 0,
        click_rate: totalSent > 0 ? ((stats.total_clicks / totalSent) * 100).toFixed(2) : 0,
        bounce_rate: totalSent > 0 ? ((stats.total_bounces / totalSent) * 100).toFixed(2) : 0
      }
    };
  }

  /**
   * Get campaign-specific analytics
   * 
   * @param {number} userId - User ID
   * @param {number} campaignId - Campaign ID
   * @returns {Promise<Object>} Campaign statistics
   */
  async getCampaignAnalytics(userId, campaignId) {
    // Verify ownership
    const [campaigns] = await db.execute(
      'SELECT * FROM drip_campaigns WHERE id = ? AND created_by = ?',
      [campaignId, userId]
    );
    
    if (campaigns.length === 0) {
      throw new Error('Campaign not found');
    }
    
    const campaign = campaigns[0];
    
    // Get analytics
    const [stats] = await db.execute(
      `SELECT 
        COUNT(*) as total_sent,
        SUM(opened) as total_opens,
        SUM(clicked) as total_clicks,
        SUM(bounced) as total_bounces,
        SUM(spam_complaint) as total_spam,
        SUM(unsubscribed) as total_unsubscribed,
        COUNT(DISTINCT CASE WHEN opened = 1 THEN subscriber_id END) as unique_opens,
        COUNT(DISTINCT CASE WHEN clicked = 1 THEN subscriber_id END) as unique_clicks
      FROM email_campaign_analytics
      WHERE campaign_id = ?`,
      [campaignId]
    );
    
    const result = stats[0];
    const totalSent = result.total_sent || 0;
    
    // Get device breakdown
    const [devices] = await db.execute(
      `SELECT device_type, COUNT(*) as count
      FROM email_campaign_analytics
      WHERE campaign_id = ? AND device_type IS NOT NULL
      GROUP BY device_type`,
      [campaignId]
    );
    
    // Get email client breakdown
    const [clients] = await db.execute(
      `SELECT email_client, COUNT(*) as count
      FROM email_campaign_analytics
      WHERE campaign_id = ? AND email_client IS NOT NULL
      GROUP BY email_client
      LIMIT 10`,
      [campaignId]
    );
    
    return {
      campaign,
      stats: {
        total_sent: totalSent,
        total_opens: result.total_opens || 0,
        total_clicks: result.total_clicks || 0,
        total_bounces: result.total_bounces || 0,
        total_spam: result.total_spam || 0,
        total_unsubscribed: result.total_unsubscribed || 0,
        unique_opens: result.unique_opens || 0,
        unique_clicks: result.unique_clicks || 0,
        open_rate: totalSent > 0 ? ((result.total_opens / totalSent) * 100).toFixed(2) : 0,
        click_rate: totalSent > 0 ? ((result.total_clicks / totalSent) * 100).toFixed(2) : 0,
        unique_open_rate: totalSent > 0 ? ((result.unique_opens / totalSent) * 100).toFixed(2) : 0,
        unique_click_rate: totalSent > 0 ? ((result.unique_clicks / totalSent) * 100).toFixed(2) : 0,
        bounce_rate: totalSent > 0 ? ((result.total_bounces / totalSent) * 100).toFixed(2) : 0,
        unsubscribe_rate: totalSent > 0 ? ((result.total_unsubscribed / totalSent) * 100).toFixed(2) : 0
      },
      devices,
      email_clients: clients
    };
  }

  /**
   * Get list growth over time
   * 
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Growth data
   */
  async getListGrowth(userId, options = {}) {
    const { start_date, end_date, interval = 'day' } = options;
    
    let dateFormat;
    switch (interval) {
      case 'hour':
        dateFormat = '%Y-%m-%d %H:00:00';
        break;
      case 'week':
        dateFormat = '%Y-%U';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }
    
    let whereClause = 'WHERE user_id = ?';
    let params = [userId];
    
    if (start_date && end_date) {
      whereClause += ' AND DATE(subscribed_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }
    
    const [growth] = await db.execute(
      `SELECT 
        DATE_FORMAT(subscribed_at, ?) as period,
        COUNT(*) as new_subscribers,
        SUM(CASE WHEN status = 'subscribed' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'unsubscribed' THEN 1 ELSE 0 END) as unsubscribed
      FROM user_email_lists
      ${whereClause}
      GROUP BY period
      ORDER BY period ASC`,
      [dateFormat, ...params]
    );
    
    return growth;
  }

  /**
   * Get top engaged subscribers
   * 
   * @param {number} userId - User ID
   * @param {number} limit - Number of subscribers to return
   * @returns {Promise<Array>} Top engaged subscribers
   */
  async getTopEngaged(userId, limit = 50) {
    const [subscribers] = await db.execute(
      `SELECT 
        es.email,
        es.first_name,
        es.last_name,
        uel.total_opens,
        uel.total_clicks,
        uel.last_open_at,
        uel.last_click_at
      FROM user_email_lists uel
      JOIN email_subscribers es ON uel.subscriber_id = es.id
      WHERE uel.user_id = ?
        AND uel.status = 'subscribed'
        AND (uel.total_opens > 0 OR uel.total_clicks > 0)
      ORDER BY (uel.total_opens + uel.total_clicks * 2) DESC
      LIMIT ?`,
      [userId, limit]
    );
    
    return subscribers;
  }

  /**
   * Track email open
   * 
   * @param {number} analyticsId - email_campaign_analytics.id
   * @param {Object} trackingData - Tracking metadata
   * @returns {Promise<void>}
   */
  async trackOpen(analyticsId, trackingData = {}) {
    const { user_agent, ip_address, device_type, email_client } = trackingData;
    
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Update analytics record
      await connection.execute(
        `UPDATE email_campaign_analytics
        SET opened = 1,
            open_count = open_count + 1,
            first_opened_at = COALESCE(first_opened_at, NOW()),
            last_opened_at = NOW(),
            user_agent = COALESCE(?, user_agent),
            ip_address = COALESCE(?, ip_address),
            device_type = COALESCE(?, device_type),
            email_client = COALESCE(?, email_client),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [user_agent || null, ip_address || null, device_type || null, email_client || null, analyticsId]
      );
      
      // Update user_email_lists engagement
      await connection.execute(
        `UPDATE user_email_lists
        SET total_opens = total_opens + 1,
            last_open_at = NOW(),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT user_list_id FROM email_campaign_analytics WHERE id = ?)`,
        [analyticsId]
      );
      
      // Update global subscriber activity
      await connection.execute(
        `UPDATE email_subscribers
        SET last_activity_at = NOW(),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT subscriber_id FROM email_campaign_analytics WHERE id = ?)`,
        [analyticsId]
      );
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Track link click
   * 
   * @param {number} analyticsId - email_campaign_analytics.id
   * @param {Object} trackingData - Tracking metadata
   * @returns {Promise<void>}
   */
  async trackClick(analyticsId, trackingData = {}) {
    const { url, user_agent, ip_address } = trackingData;
    
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Get current clicked links
      const [analytics] = await connection.execute(
        'SELECT clicked_links FROM email_campaign_analytics WHERE id = ?',
        [analyticsId]
      );
      
      let clickedLinks = [];
      if (analytics[0] && analytics[0].clicked_links) {
        try {
          clickedLinks = JSON.parse(analytics[0].clicked_links);
        } catch (error) {
          clickedLinks = [];
        }
      }
      
      if (url && !clickedLinks.includes(url)) {
        clickedLinks.push(url);
      }
      
      // Update analytics record
      await connection.execute(
        `UPDATE email_campaign_analytics
        SET clicked = 1,
            click_count = click_count + 1,
            first_clicked_at = COALESCE(first_clicked_at, NOW()),
            last_clicked_at = NOW(),
            clicked_links = ?,
            user_agent = COALESCE(?, user_agent),
            ip_address = COALESCE(?, ip_address),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [JSON.stringify(clickedLinks), user_agent || null, ip_address || null, analyticsId]
      );
      
      // Update user_email_lists engagement
      await connection.execute(
        `UPDATE user_email_lists
        SET total_clicks = total_clicks + 1,
            last_click_at = NOW(),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT user_list_id FROM email_campaign_analytics WHERE id = ?)`,
        [analyticsId]
      );
      
      // Update global subscriber activity
      await connection.execute(
        `UPDATE email_subscribers
        SET last_activity_at = NOW(),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT subscriber_id FROM email_campaign_analytics WHERE id = ?)`,
        [analyticsId]
      );
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Track bounce
   * 
   * @param {number} analyticsId - email_campaign_analytics.id
   * @param {Object} bounceData - Bounce metadata
   * @returns {Promise<void>}
   */
  async trackBounce(analyticsId, bounceData = {}) {
    const { bounce_type = 'soft', bounce_reason } = bounceData;
    
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Update analytics record
      await connection.execute(
        `UPDATE email_campaign_analytics
        SET bounced = 1,
            bounce_type = ?,
            bounced_at = NOW(),
            bounce_reason = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [bounce_type, bounce_reason, analyticsId]
      );
      
      // Update user_email_lists status if hard bounce
      if (bounce_type === 'hard') {
        await connection.execute(
          `UPDATE user_email_lists
          SET status = 'bounced',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = (SELECT user_list_id FROM email_campaign_analytics WHERE id = ?)`,
          [analyticsId]
        );
        
        // Update global bounce flag
        await connection.execute(
          `UPDATE email_subscribers
          SET global_bounce = 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = (SELECT subscriber_id FROM email_campaign_analytics WHERE id = ?)`,
          [analyticsId]
        );
      }
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Track spam complaint
   * 
   * @param {number} analyticsId - email_campaign_analytics.id
   * @returns {Promise<void>}
   */
  async trackSpam(analyticsId) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Update analytics record
      await connection.execute(
        `UPDATE email_campaign_analytics
        SET spam_complaint = 1,
            spam_complaint_at = NOW(),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [analyticsId]
      );
      
      // Update user_email_lists status
      await connection.execute(
        `UPDATE user_email_lists
        SET status = 'spam_complaint',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT user_list_id FROM email_campaign_analytics WHERE id = ?)`,
        [analyticsId]
      );
      
      // Update global spam flag
      await connection.execute(
        `UPDATE email_subscribers
        SET global_spam_complaint = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT subscriber_id FROM email_campaign_analytics WHERE id = ?)`,
        [analyticsId]
      );
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new AnalyticsService();
