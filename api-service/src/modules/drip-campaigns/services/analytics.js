/**
 * Analytics Service
 * Handles metrics aggregation, conversion tracking, and reporting
 */

const db = require('../../../../config/db');

class AnalyticsService {
  /**
   * Aggregate metrics for campaign and optional step
   * 
   * @param {number} campaignId - Campaign ID
   * @param {number} stepNumber - Step number (optional)
   * @returns {Promise<Object>} Aggregated metrics
   */
  async aggregateMetrics(campaignId, stepNumber = null) {
    const connection = await db.getConnection();
    
    try {
      // Build filters
      let stepFilter = '';
      const params = [campaignId];
      
      if (stepNumber !== null) {
        stepFilter = 'AND step_number = ?';
        params.push(stepNumber);
      }
      
      // Get enrollment counts
      const [enrollmentStats] = await connection.execute(
        `SELECT 
          COUNT(DISTINCT id) as enrollments_count,
          COUNT(DISTINCT CASE WHEN status = 'active' THEN id END) as active_count,
          COUNT(DISTINCT CASE WHEN status = 'completed' THEN id END) as completed_count,
          COUNT(DISTINCT CASE WHEN status = 'exited' THEN id END) as exited_count
        FROM drip_enrollments
        WHERE campaign_id = ?`,
        [campaignId]
      );
      
      // Get event stats
      const [eventStats] = await connection.execute(
        `SELECT 
          COUNT(CASE WHEN event_type = 'sent' THEN 1 END) as emails_sent,
          COUNT(CASE WHEN event_type = 'delivered' THEN 1 END) as emails_delivered,
          COUNT(CASE WHEN event_type = 'opened' THEN 1 END) as emails_opened,
          COUNT(CASE WHEN event_type = 'clicked' THEN 1 END) as emails_clicked,
          COUNT(CASE WHEN event_type = 'bounced' THEN 1 END) as emails_bounced,
          COUNT(CASE WHEN event_type = 'unsubscribed' THEN 1 END) as unsubscribes,
          COUNT(CASE WHEN event_type = 'suppressed' THEN 1 END) as suppressions,
          COUNT(CASE WHEN event_type = 'expired' THEN 1 END) as expirations
        FROM drip_events
        WHERE campaign_id = ? ${stepFilter}`,
        params
      );
      
      // Calculate rates
      const emailsSent = eventStats[0].emails_sent || 0;
      const emailsDelivered = eventStats[0].emails_delivered || emailsSent;
      const emailsOpened = eventStats[0].emails_opened || 0;
      const emailsClicked = eventStats[0].emails_clicked || 0;
      
      const openRate = emailsDelivered > 0 ? (emailsOpened / emailsDelivered * 100).toFixed(2) : 0;
      const clickRate = emailsDelivered > 0 ? (emailsClicked / emailsDelivered * 100).toFixed(2) : 0;
      const clickToOpenRate = emailsOpened > 0 ? (emailsClicked / emailsOpened * 100).toFixed(2) : 0;
      
      // Get conversion stats
      const [conversionStats] = await connection.execute(
        `SELECT 
          COUNT(*) as conversions_count,
          SUM(conversion_value) as revenue_attributed
        FROM drip_conversions
        WHERE campaign_id = ?`,
        [campaignId]
      );
      
      const conversionRate = enrollmentStats[0].enrollments_count > 0
        ? (conversionStats[0].conversions_count / enrollmentStats[0].enrollments_count * 100).toFixed(2)
        : 0;
      
      // Get timing metrics
      const [timingStats] = await connection.execute(
        `SELECT 
          AVG(TIMESTAMPDIFF(MINUTE, enrolled_at, completed_at)) as avg_completion_time_minutes,
          AVG(TIMESTAMPDIFF(MINUTE, enrolled_at, exited_at)) as avg_exit_time_minutes
        FROM drip_enrollments
        WHERE campaign_id = ? AND (status = 'completed' OR status = 'exited')`,
        [campaignId]
      );
      
      return {
        enrollments_count: enrollmentStats[0].enrollments_count || 0,
        active_count: enrollmentStats[0].active_count || 0,
        completed_count: enrollmentStats[0].completed_count || 0,
        exited_count: enrollmentStats[0].exited_count || 0,
        completion_rate: enrollmentStats[0].enrollments_count > 0
          ? (enrollmentStats[0].completed_count / enrollmentStats[0].enrollments_count * 100).toFixed(2)
          : 0,
        
        emails_sent: emailsSent,
        emails_delivered: emailsDelivered,
        emails_opened: emailsOpened,
        emails_clicked: emailsClicked,
        emails_bounced: eventStats[0].emails_bounced || 0,
        
        open_rate: parseFloat(openRate),
        click_rate: parseFloat(clickRate),
        click_to_open_rate: parseFloat(clickToOpenRate),
        
        unsubscribes: eventStats[0].unsubscribes || 0,
        suppressions: eventStats[0].suppressions || 0,
        expirations: eventStats[0].expirations || 0,
        
        conversions_count: conversionStats[0].conversions_count || 0,
        revenue_attributed: parseFloat(conversionStats[0].revenue_attributed || 0),
        conversion_rate: parseFloat(conversionRate),
        
        avg_completion_time_minutes: timingStats[0].avg_completion_time_minutes || 0,
        avg_exit_time_minutes: timingStats[0].avg_exit_time_minutes || 0
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Get comprehensive campaign analytics
   * 
   * @param {number} campaignId - Campaign ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Analytics data
   */
  async getCampaignAnalytics(campaignId, options = {}) {
    const { start_date, end_date, breakdown } = options;
    
    // Get overview metrics
    const overview = await this.aggregateMetrics(campaignId);
    
    // Get by-step breakdown if requested
    let byStep = [];
    if (!breakdown || breakdown === 'step') {
      const [steps] = await db.execute(
        'SELECT step_number, step_name, template_key FROM drip_steps WHERE campaign_id = ? ORDER BY step_number ASC',
        [campaignId]
      );
      
      for (const step of steps) {
        const stepMetrics = await this.aggregateMetrics(campaignId, step.step_number);
        byStep.push({
          step_number: step.step_number,
          step_name: step.step_name,
          template_key: step.template_key,
          ...stepMetrics
        });
      }
    }
    
    // Get timeline data if date range provided
    let timeline = [];
    if (start_date && end_date) {
      timeline = await this.getTimelineData(campaignId, start_date, end_date);
    }
    
    return {
      overview,
      by_step: byStep,
      timeline
    };
  }

  /**
   * Get conversion report
   * 
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Conversion report
   */
  async getConversionReport(filters = {}) {
    const { campaign_id, conversion_type, start_date, end_date, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;
    
    let whereClause = [];
    let params = [];
    
    if (campaign_id) {
      whereClause.push('dc.campaign_id = ?');
      params.push(campaign_id);
    }
    
    if (conversion_type) {
      whereClause.push('dc.conversion_type = ?');
      params.push(conversion_type);
    }
    
    if (start_date && end_date) {
      whereClause.push('dc.converted_at BETWEEN ? AND ?');
      params.push(start_date, end_date);
    }
    
    const where = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';
    
    // Get total count
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM drip_conversions dc ${where}`,
      params
    );
    const total = countResult[0].total;
    
    // Get conversions
    const [conversions] = await db.execute(
      `SELECT 
        dc.*,
        camp.name as campaign_name,
        camp.campaign_key,
        u.username,
        u.username as email,
        de.event_type as attributed_event
      FROM drip_conversions dc
      LEFT JOIN drip_campaigns camp ON dc.campaign_id = camp.id
      LEFT JOIN users u ON dc.user_id = u.id
      LEFT JOIN drip_events de ON dc.attributed_event_id = de.id
      ${where}
      ORDER BY dc.converted_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    // Get summary stats
    const [summary] = await db.execute(
      `SELECT 
        COUNT(*) as total_conversions,
        COUNT(DISTINCT user_id) as unique_converters,
        SUM(conversion_value) as total_revenue,
        AVG(conversion_value) as avg_conversion_value,
        COUNT(DISTINCT campaign_id) as campaigns_with_conversions
      FROM drip_conversions dc ${where}`,
      params
    );
    
    return {
      conversions,
      summary: summary[0] || {},
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get frequency analytics
   * 
   * @returns {Promise<Object>} Frequency statistics
   */
  async getFrequencyAnalytics() {
    const today = new Date().toISOString().split('T')[0];
    
    const [stats] = await db.execute(
      `SELECT 
        COUNT(DISTINCT user_id) as total_users_tracked,
        SUM(drip_emails_sent_today) as total_emails_sent_today,
        AVG(drip_emails_sent_today) as avg_emails_per_user,
        SUM(CASE WHEN drip_emails_sent_today >= 6 THEN 1 ELSE 0 END) as users_at_daily_limit,
        SUM(CASE WHEN is_paused = 1 THEN 1 ELSE 0 END) as users_currently_paused,
        SUM(pause_count) as total_pauses_today
      FROM drip_frequency_tracking
      WHERE tracking_date = ?`,
      [today]
    );
    
    // Get suppression stats from events
    const [suppressionStats] = await db.execute(
      `SELECT 
        COUNT(*) as total_suppressions,
        JSON_EXTRACT(event_data, '$.reason') as suppression_reason,
        COUNT(*) as count
      FROM drip_events
      WHERE event_type = 'suppressed'
        AND DATE(created_at) = ?
      GROUP BY JSON_EXTRACT(event_data, '$.reason')`,
      [today]
    );
    
    return {
      frequency_limits: stats[0] || {},
      suppression_reasons: suppressionStats
    };
  }

  /**
   * Calculate engagement rates
   * 
   * @param {number} campaignId - Campaign ID
   * @param {number} stepNumber - Step number (optional)
   * @returns {Promise<Object>} Engagement rates
   */
  async calculateEngagementRates(campaignId, stepNumber = null) {
    let stepFilter = '';
    const params = [campaignId];
    
    if (stepNumber !== null) {
      stepFilter = 'AND step_number = ?';
      params.push(stepNumber);
    }
    
    const [stats] = await db.execute(
      `SELECT 
        COUNT(CASE WHEN event_type = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN event_type = 'opened' THEN 1 END) as opened,
        COUNT(CASE WHEN event_type = 'clicked' THEN 1 END) as clicked
      FROM drip_events
      WHERE campaign_id = ? ${stepFilter}`,
      params
    );
    
    const { sent, opened, clicked } = stats[0];
    
    return {
      open_rate: sent > 0 ? ((opened / sent) * 100).toFixed(2) : 0,
      click_rate: sent > 0 ? ((clicked / sent) * 100).toFixed(2) : 0,
      click_to_open_rate: opened > 0 ? ((clicked / opened) * 100).toFixed(2) : 0
    };
  }

  /**
   * Calculate timing metrics
   * 
   * @param {number} campaignId - Campaign ID
   * @param {number} stepNumber - Step number (optional)
   * @returns {Promise<Object>} Timing metrics
   */
  async calculateTimingMetrics(campaignId, stepNumber = null) {
    let stepFilter = '';
    const params = [campaignId];
    
    if (stepNumber !== null) {
      stepFilter = 'AND de.step_number = ?';
      params.push(stepNumber);
    }
    
    const [stats] = await db.execute(
      `SELECT 
        AVG(TIMESTAMPDIFF(MINUTE, de_sent.created_at, de_opened.created_at)) as avg_time_to_open_minutes,
        AVG(TIMESTAMPDIFF(MINUTE, de_sent.created_at, de_clicked.created_at)) as avg_time_to_click_minutes
      FROM drip_events de_sent
      LEFT JOIN drip_events de_opened 
        ON de_opened.enrollment_id = de_sent.enrollment_id 
        AND de_opened.step_number = de_sent.step_number
        AND de_opened.event_type = 'opened'
      LEFT JOIN drip_events de_clicked
        ON de_clicked.enrollment_id = de_sent.enrollment_id
        AND de_clicked.step_number = de_sent.step_number
        AND de_clicked.event_type = 'clicked'
      WHERE de_sent.campaign_id = ? ${stepFilter}
        AND de_sent.event_type = 'sent'`,
      params
    );
    
    return stats[0] || {};
  }

  /**
   * Get timeline data
   * 
   * @param {number} campaignId - Campaign ID
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Promise<Array>} Timeline data
   */
  async getTimelineData(campaignId, startDate, endDate) {
    const [timeline] = await db.execute(
      `SELECT 
        DATE(created_at) as date,
        COUNT(CASE WHEN event_type = 'sent' THEN 1 END) as emails_sent,
        COUNT(CASE WHEN event_type = 'opened' THEN 1 END) as emails_opened,
        COUNT(CASE WHEN event_type = 'clicked' THEN 1 END) as emails_clicked,
        COUNT(CASE WHEN event_type = 'bounced' THEN 1 END) as emails_bounced,
        COUNT(CASE WHEN event_type = 'unsubscribed' THEN 1 END) as unsubscribes
      FROM drip_events
      WHERE campaign_id = ?
        AND DATE(created_at) BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC`,
      [campaignId, startDate, endDate]
    );
    
    return timeline;
  }

  /**
   * Track event
   * 
   * @param {number} enrollmentId - Enrollment ID
   * @param {string} eventType - Event type (opened, clicked, etc.)
   * @param {Object} eventData - Event metadata
   * @returns {Promise<Object>} Created event
   */
  async trackEvent(enrollmentId, eventType, eventData = {}) {
    // Get enrollment details
    const [enrollment] = await db.execute(
      'SELECT campaign_id, current_step FROM drip_enrollments WHERE id = ?',
      [enrollmentId]
    );
    
    if (enrollment.length === 0) {
      throw new Error('Enrollment not found');
    }
    
    const { campaign_id, current_step } = enrollment[0];
    
    // Insert event
    const [result] = await db.execute(
      `INSERT INTO drip_events (
        enrollment_id, campaign_id, step_number, event_type, event_data
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        enrollmentId,
        campaign_id,
        current_step,
        eventType,
        JSON.stringify(eventData)
      ]
    );
    
    // Update analytics asynchronously (don't wait)
    this.updateAnalyticsForEvent(campaign_id, current_step, eventType).catch(err => {
      console.error('Error updating analytics:', err);
    });
    
    return { id: result.insertId, enrollmentId, eventType };
  }

  /**
   * Track conversion
   * 
   * @param {number} userId - User ID
   * @param {string} conversionType - Conversion type
   * @param {number} value - Conversion value
   * @param {Object} data - Conversion metadata
   * @returns {Promise<Object>} Conversion attribution result
   */
  async trackConversion(userId, conversionType, value, data = {}) {
    const conversionsCreated = [];
    
    // Find active enrollments for user
    const [enrollments] = await db.execute(
      `SELECT de.*, dc.attribution_window_hours
      FROM drip_enrollments de
      JOIN drip_campaigns dc ON de.campaign_id = dc.id
      WHERE de.user_id = ? AND de.status = 'active'`,
      [userId]
    );
    
    for (const enrollment of enrollments) {
      // Find attribution event (last opened or clicked email within window)
      const attributionWindowHours = enrollment.attribution_window_hours || 168;
      const windowStart = new Date();
      windowStart.setHours(windowStart.getHours() - attributionWindowHours);
      
      const [events] = await db.execute(
        `SELECT id, event_type, step_number, created_at
        FROM drip_events
        WHERE enrollment_id = ?
          AND event_type IN ('opened', 'clicked')
          AND created_at >= ?
        ORDER BY created_at DESC
        LIMIT 1`,
        [enrollment.id, windowStart]
      );
      
      if (events.length > 0) {
        // Attribute conversion to this campaign
        const attributedEvent = events[0];
        
        const [result] = await db.execute(
          `INSERT INTO drip_conversions (
            campaign_id, enrollment_id, user_id, step_number,
            conversion_type, conversion_value, conversion_data,
            attributed_event_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            enrollment.campaign_id,
            enrollment.id,
            userId,
            attributedEvent.step_number,
            conversionType,
            value,
            JSON.stringify(data),
            attributedEvent.id
          ]
        );
        
        conversionsCreated.push({
          id: result.insertId,
          campaign_id: enrollment.campaign_id,
          attributed_to: attributedEvent.event_type
        });
        
        // Update analytics
        await this.updateAnalyticsForConversion(enrollment.campaign_id, attributedEvent.step_number);
        
        // Check if this was a campaign goal
        await this.checkCampaignGoalReached(enrollment.id, conversionType);
      }
    }
    
    return { conversions_created: conversionsCreated.length, conversions: conversionsCreated };
  }

  /**
   * Update analytics for event
   * 
   * @param {number} campaignId - Campaign ID
   * @param {number} stepNumber - Step number
   * @param {string} eventType - Event type
   * @returns {Promise<void>}
   */
  async updateAnalyticsForEvent(campaignId, stepNumber, eventType) {
    // This would update the drip_analytics table
    // For now, we rely on real-time aggregation
    console.log(`Update analytics for campaign ${campaignId}, step ${stepNumber}, event ${eventType}`);
  }

  /**
   * Update analytics for conversion
   * 
   * @param {number} campaignId - Campaign ID
   * @param {number} stepNumber - Step number
   * @returns {Promise<void>}
   */
  async updateAnalyticsForConversion(campaignId, stepNumber) {
    // This would update conversion metrics in drip_analytics
    console.log(`Update conversion analytics for campaign ${campaignId}, step ${stepNumber}`);
  }

  /**
   * Check if campaign goal reached
   * 
   * @param {number} enrollmentId - Enrollment ID
   * @param {string} conversionType - Conversion type
   * @returns {Promise<void>}
   */
  async checkCampaignGoalReached(enrollmentId, conversionType) {
    // Get campaign goal
    const [enrollment] = await db.execute(
      `SELECT de.*, dc.conversion_goal_type
      FROM drip_enrollments de
      JOIN drip_campaigns dc ON de.campaign_id = dc.id
      WHERE de.id = ?`,
      [enrollmentId]
    );
    
    if (enrollment.length === 0) return;
    
    const { conversion_goal_type, campaign_id } = enrollment[0];
    
    // If conversion matches goal, exit campaign with success
    if (conversion_goal_type && conversionType === conversion_goal_type) {
      const EnrollmentService = require('./enrollments');
      await EnrollmentService.exitEnrollment(enrollmentId, 'goal_reached');
      
      console.log(`Campaign goal reached for enrollment ${enrollmentId}: ${conversionType}`);
    }
  }

  /**
   * Get all campaigns analytics summary
   * 
   * @returns {Promise<Array>} Summary for all campaigns
   */
  async getAllCampaignsAnalyticsSummary() {
    const [campaigns] = await db.execute(
      'SELECT id, name, campaign_key, category, is_active FROM drip_campaigns ORDER BY priority_level DESC'
    );
    
    const summary = [];
    
    for (const campaign of campaigns) {
      const metrics = await this.aggregateMetrics(campaign.id);
      summary.push({
        ...campaign,
        ...metrics
      });
    }
    
    return summary;
  }
}

module.exports = new AnalyticsService();
