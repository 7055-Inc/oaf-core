/**
 * Analytics Service
 * 
 * Tracks and reports marketing performance:
 * - Record analytics from platforms
 * - Get performance metrics
 * - Compare campaigns
 * - Generate reports
 */

const db = require('../../../../config/db');

class AnalyticsService {
  /**
   * Record analytics data for content
   */
  async recordAnalytics(contentId, data) {
    try {
      const {
        impressions = 0,
        reach = 0,
        engagements = 0,
        clicks = 0,
        shares = 0,
        saves = 0,
        comments = 0,
        conversions = 0,
        spend_cents = 0,
        raw_data = null
      } = data;

      const query = `
        INSERT INTO marketing_analytics 
        (content_id, recorded_at, impressions, reach, engagements, clicks, 
         shares, saves, comments, conversions, spend_cents, raw_data)
        VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        contentId,
        impressions,
        reach,
        engagements,
        clicks,
        shares,
        saves,
        comments,
        conversions,
        spend_cents,
        raw_data ? JSON.stringify(raw_data) : null
      ];

      const [result] = await db.execute(query, params);

      return { 
        success: true, 
        analytics_id: result.insertId,
        message: 'Analytics recorded successfully'
      };
    } catch (error) {
      console.error('Record analytics error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get analytics for specific content
   */
  async getContentAnalytics(contentId) {
    try {
      const [analytics] = await db.execute(
        'SELECT * FROM marketing_analytics WHERE content_id = ? ORDER BY recorded_at DESC',
        [contentId]
      );

      // Parse raw_data JSON
      analytics.forEach(record => {
        if (record.raw_data && typeof record.raw_data === 'string') {
          record.raw_data = JSON.parse(record.raw_data);
        }
      });

      // Calculate totals and trends
      const summary = this.calculateSummary(analytics);

      return { 
        success: true, 
        analytics,
        summary
      };
    } catch (error) {
      console.error('Get content analytics error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get analytics for campaign
   */
  async getCampaignAnalytics(campaignId) {
    try {
      const query = `
        SELECT 
          mc.id as content_id,
          mc.type,
          mc.channel,
          mc.published_at,
          COALESCE(SUM(ma.impressions), 0) as total_impressions,
          COALESCE(SUM(ma.reach), 0) as total_reach,
          COALESCE(SUM(ma.engagements), 0) as total_engagements,
          COALESCE(SUM(ma.clicks), 0) as total_clicks,
          COALESCE(SUM(ma.shares), 0) as total_shares,
          COALESCE(SUM(ma.saves), 0) as total_saves,
          COALESCE(SUM(ma.comments), 0) as total_comments,
          COALESCE(SUM(ma.conversions), 0) as total_conversions,
          COALESCE(SUM(ma.spend_cents), 0) as total_spend_cents,
          COUNT(DISTINCT ma.id) as data_points
        FROM marketing_content mc
        LEFT JOIN marketing_analytics ma ON mc.id = ma.content_id
        WHERE mc.campaign_id = ? AND mc.status = 'published'
        GROUP BY mc.id
        ORDER BY mc.published_at DESC
      `;

      const [contentMetrics] = await db.execute(query, [campaignId]);

      // Calculate campaign totals
      const campaignTotals = {
        total_impressions: 0,
        total_reach: 0,
        total_engagements: 0,
        total_clicks: 0,
        total_shares: 0,
        total_saves: 0,
        total_comments: 0,
        total_conversions: 0,
        total_spend_cents: 0,
        content_count: contentMetrics.length
      };

      contentMetrics.forEach(content => {
        campaignTotals.total_impressions += content.total_impressions;
        campaignTotals.total_reach += content.total_reach;
        campaignTotals.total_engagements += content.total_engagements;
        campaignTotals.total_clicks += content.total_clicks;
        campaignTotals.total_shares += content.total_shares;
        campaignTotals.total_saves += content.total_saves;
        campaignTotals.total_comments += content.total_comments;
        campaignTotals.total_conversions += content.total_conversions;
        campaignTotals.total_spend_cents += content.total_spend_cents;
      });

      // Calculate engagement rate
      if (campaignTotals.total_impressions > 0) {
        campaignTotals.engagement_rate = 
          (campaignTotals.total_engagements / campaignTotals.total_impressions * 100).toFixed(2);
      } else {
        campaignTotals.engagement_rate = 0;
      }

      // Calculate cost per click
      if (campaignTotals.total_clicks > 0) {
        campaignTotals.cost_per_click = 
          (campaignTotals.total_spend_cents / campaignTotals.total_clicks).toFixed(2);
      } else {
        campaignTotals.cost_per_click = 0;
      }

      return { 
        success: true, 
        content_metrics: contentMetrics,
        campaign_totals: campaignTotals
      };
    } catch (error) {
      console.error('Get campaign analytics error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get overview analytics (all campaigns)
   */
  async getOverview(filters = {}) {
    try {
      let query = `
        SELECT 
          mcamp.id as campaign_id,
          mcamp.name as campaign_name,
          mcamp.type as campaign_type,
          mcamp.status as campaign_status,
          COUNT(DISTINCT mc.id) as total_content,
          SUM(CASE WHEN mc.status = 'published' THEN 1 ELSE 0 END) as published_count,
          COALESCE(SUM(ma.impressions), 0) as total_impressions,
          COALESCE(SUM(ma.reach), 0) as total_reach,
          COALESCE(SUM(ma.engagements), 0) as total_engagements,
          COALESCE(SUM(ma.clicks), 0) as total_clicks,
          COALESCE(SUM(ma.conversions), 0) as total_conversions,
          COALESCE(SUM(ma.spend_cents), 0) as total_spend_cents
        FROM marketing_campaigns mcamp
        LEFT JOIN marketing_content mc ON mcamp.id = mc.campaign_id
        LEFT JOIN marketing_analytics ma ON mc.id = ma.content_id
        WHERE 1=1
      `;
      const params = [];

      // Filter by owner
      if (filters.owner_type && filters.owner_id) {
        query += ' AND mcamp.owner_type = ? AND mcamp.owner_id = ?';
        params.push(filters.owner_type, filters.owner_id);
      }

      // Filter by date range
      if (filters.from_date) {
        query += ' AND mcamp.start_date >= ?';
        params.push(filters.from_date);
      }

      if (filters.to_date) {
        query += ' AND mcamp.end_date <= ?';
        params.push(filters.to_date);
      }

      query += ' GROUP BY mcamp.id ORDER BY total_impressions DESC';

      const [campaigns] = await db.execute(query, params);

      // Calculate overall totals
      const overallTotals = {
        total_campaigns: campaigns.length,
        total_content: 0,
        published_count: 0,
        total_impressions: 0,
        total_reach: 0,
        total_engagements: 0,
        total_clicks: 0,
        total_conversions: 0,
        total_spend_cents: 0
      };

      campaigns.forEach(campaign => {
        overallTotals.total_content += campaign.total_content;
        overallTotals.published_count += campaign.published_count;
        overallTotals.total_impressions += campaign.total_impressions;
        overallTotals.total_reach += campaign.total_reach;
        overallTotals.total_engagements += campaign.total_engagements;
        overallTotals.total_clicks += campaign.total_clicks;
        overallTotals.total_conversions += campaign.total_conversions;
        overallTotals.total_spend_cents += campaign.total_spend_cents;
      });

      return { 
        success: true, 
        campaigns,
        overall_totals: overallTotals
      };
    } catch (error) {
      console.error('Get overview error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get performance by channel
   */
  async getChannelPerformance(filters = {}) {
    try {
      let query = `
        SELECT 
          mc.channel,
          COUNT(DISTINCT mc.id) as content_count,
          COALESCE(SUM(ma.impressions), 0) as total_impressions,
          COALESCE(SUM(ma.reach), 0) as total_reach,
          COALESCE(SUM(ma.engagements), 0) as total_engagements,
          COALESCE(SUM(ma.clicks), 0) as total_clicks,
          COALESCE(SUM(ma.conversions), 0) as total_conversions,
          COALESCE(SUM(ma.spend_cents), 0) as total_spend_cents,
          ROUND(COALESCE(SUM(ma.engagements) / NULLIF(SUM(ma.impressions), 0) * 100, 0), 2) as engagement_rate
        FROM marketing_content mc
        LEFT JOIN marketing_analytics ma ON mc.id = ma.content_id
        WHERE mc.status = 'published'
      `;
      const params = [];

      // Filter by campaign
      if (filters.campaign_id) {
        query += ' AND mc.campaign_id = ?';
        params.push(filters.campaign_id);
      }

      // Filter by date range
      if (filters.from_date && filters.to_date) {
        query += ' AND mc.published_at BETWEEN ? AND ?';
        params.push(filters.from_date, filters.to_date);
      }

      query += ' GROUP BY mc.channel ORDER BY total_impressions DESC';

      const [channels] = await db.execute(query, params);

      return { 
        success: true, 
        channels
      };
    } catch (error) {
      console.error('Get channel performance error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate summary statistics from analytics records
   */
  calculateSummary(analytics) {
    if (!analytics || analytics.length === 0) {
      return null;
    }

    const latest = analytics[0];
    const oldest = analytics[analytics.length - 1];

    const summary = {
      latest_metrics: {
        impressions: latest.impressions,
        reach: latest.reach,
        engagements: latest.engagements,
        clicks: latest.clicks,
        conversions: latest.conversions
      },
      total_records: analytics.length,
      first_recorded: oldest.recorded_at,
      last_recorded: latest.recorded_at
    };

    // Calculate growth if we have multiple records
    if (analytics.length > 1) {
      summary.growth = {
        impressions: latest.impressions - oldest.impressions,
        engagements: latest.engagements - oldest.engagements,
        clicks: latest.clicks - oldest.clicks,
        conversions: latest.conversions - oldest.conversions
      };
    }

    return summary;
  }

  /**
   * Get top performing content
   */
  async getTopPerforming(metric = 'impressions', limit = 10, filters = {}) {
    try {
      const validMetrics = ['impressions', 'reach', 'engagements', 'clicks', 'conversions'];
      if (!validMetrics.includes(metric)) {
        return { 
          success: false, 
          error: `Invalid metric. Must be one of: ${validMetrics.join(', ')}` 
        };
      }

      let query = `
        SELECT 
          mc.id,
          mc.campaign_id,
          mc.type,
          mc.channel,
          mc.published_at,
          mcamp.name as campaign_name,
          COALESCE(SUM(ma.${metric}), 0) as total_${metric}
        FROM marketing_content mc
        LEFT JOIN marketing_campaigns mcamp ON mc.campaign_id = mcamp.id
        LEFT JOIN marketing_analytics ma ON mc.id = ma.content_id
        WHERE mc.status = 'published'
      `;
      const params = [];

      // Filter by date range
      if (filters.from_date && filters.to_date) {
        query += ' AND mc.published_at BETWEEN ? AND ?';
        params.push(filters.from_date, filters.to_date);
      }

      query += ` GROUP BY mc.id ORDER BY total_${metric} DESC LIMIT ?`;
      params.push(limit);

      const [content] = await db.execute(query, params);

      return { 
        success: true, 
        content,
        metric
      };
    } catch (error) {
      console.error('Get top performing error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new AnalyticsService();
