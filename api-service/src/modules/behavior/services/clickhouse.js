/**
 * ClickHouse Client for Behavioral Analytics
 * 
 * Handles connection to ClickHouse and provides methods for
 * inserting and querying behavioral event data.
 */

const { createClient } = require('@clickhouse/client');

class ClickHouseService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async initialize() {
    if (this.client) return;

    this.client = createClient({
      url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
      database: 'behavior',
      clickhouse_settings: {
        async_insert: 1,
        wait_for_async_insert: 0, // Don't wait - fire and forget for speed
      }
    });

    // Test connection
    try {
      await this.client.ping();
      this.isConnected = true;
      console.log('[BEHAVIOR] ClickHouse connected successfully');
    } catch (error) {
      console.error('[BEHAVIOR] ClickHouse connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Insert a single event
   */
  async insertEvent(event) {
    if (!this.client) await this.initialize();

    const row = {
      user_id: event.userId || 0,
      session_id: event.sessionId || '',
      anonymous_id: event.anonymousId || '',
      event_type: event.eventType || 'unknown',
      event_category: event.eventCategory || '',
      event_action: event.eventAction || '',
      event_data: JSON.stringify(event.eventData || {}),
      page_url: event.pageUrl || '',
      page_path: event.pagePath || '',
      referrer: event.referrer || '',
      device_type: event.deviceType || '',
      device_os: event.deviceOs || '',
      browser: event.browser || '',
      screen_width: event.screenWidth || 0,
      screen_height: event.screenHeight || 0,
      country: event.country || '',
      region: event.region || '',
      city: event.city || '',
      source: event.source || 'web',
      utm_source: event.utmSource || '',
      utm_medium: event.utmMedium || '',
      utm_campaign: event.utmCampaign || '',
      client_timestamp: (event.clientTimestamp || new Date().toISOString()).replace('Z', ''),
      ga_client_id: event.gaClientId || '',
      fb_click_id: event.fbClickId || '',
    };

    await this.client.insert({
      table: 'events',
      values: [row],
      format: 'JSONEachRow'
    });
  }

  /**
   * Insert batch of events (more efficient)
   */
  async insertEvents(events) {
    if (!this.client) await this.initialize();

    const rows = events.map(event => ({
      user_id: event.userId || 0,
      session_id: event.sessionId || '',
      anonymous_id: event.anonymousId || '',
      event_type: event.eventType || 'unknown',
      event_category: event.eventCategory || '',
      event_action: event.eventAction || '',
      event_data: JSON.stringify(event.eventData || {}),
      page_url: event.pageUrl || '',
      page_path: event.pagePath || '',
      referrer: event.referrer || '',
      device_type: event.deviceType || '',
      device_os: event.deviceOs || '',
      browser: event.browser || '',
      screen_width: event.screenWidth || 0,
      screen_height: event.screenHeight || 0,
      country: event.country || '',
      region: event.region || '',
      city: event.city || '',
      source: event.source || 'web',
      utm_source: event.utmSource || '',
      utm_medium: event.utmMedium || '',
      utm_campaign: event.utmCampaign || '',
      client_timestamp: (event.clientTimestamp || new Date().toISOString()).replace('Z', ''),
      ga_client_id: event.gaClientId || '',
      fb_click_id: event.fbClickId || '',
    }));

    await this.client.insert({
      table: 'events',
      values: rows,
      format: 'JSONEachRow'
    });
  }

  /**
   * Get user events for a time period
   */
  async getUserEvents(userId, options = {}) {
    if (!this.client) await this.initialize();

    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate = new Date(),
      eventTypes = null,
      limit = 1000 
    } = options;

    let query = `
      SELECT *
      FROM events
      WHERE user_id = {userId:UInt64}
        AND timestamp >= {startDate:DateTime64(3)}
        AND timestamp <= {endDate:DateTime64(3)}
    `;

    if (eventTypes && eventTypes.length > 0) {
      query += ` AND event_type IN ({eventTypes:Array(String)})`;
    }

    query += ` ORDER BY timestamp DESC LIMIT {limit:UInt32}`;

    const result = await this.client.query({
      query,
      query_params: {
        userId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        eventTypes: eventTypes || [],
        limit
      },
      format: 'JSONEachRow'
    });

    return result.json();
  }

  /**
   * Get aggregated user behavior summary (for Leo ingestion)
   */
  async getUserBehaviorSummary(userId) {
    if (!this.client) await this.initialize();

    const result = await this.client.query({
      query: `
        SELECT
          user_id,
          count() as total_events,
          countIf(event_type = 'page_view') as page_views,
          countIf(event_category = 'commerce') as commerce_events,
          uniq(session_id) as total_sessions,
          max(timestamp) as last_activity,
          min(timestamp) as first_activity,
          
          -- Engagement metrics
          avgIf(JSONExtractFloat(event_data, 'scroll_depth'), event_type = 'scroll') as avg_scroll_depth,
          countIf(event_type = 'click') as total_clicks,
          
          -- Product interests
          groupUniqArrayIf(JSONExtractUInt(event_data, 'product_id'), event_type = 'product_view') as viewed_products,
          groupUniqArrayIf(JSONExtractUInt(event_data, 'category_id'), event_type = 'category_view') as viewed_categories,
          
          -- Time patterns
          groupArray(toHour(timestamp)) as activity_hours,
          groupArray(toDayOfWeek(timestamp)) as activity_days
          
        FROM events
        WHERE user_id = {userId:UInt64}
          AND timestamp >= now() - INTERVAL 90 DAY
        GROUP BY user_id
      `,
      query_params: { userId },
      format: 'JSONEachRow'
    });

    const rows = await result.json();
    return rows[0] || null;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.client) await this.initialize();
      await this.client.ping();
      
      // Get row counts
      const result = await this.client.query({
        query: 'SELECT count() as count FROM events',
        format: 'JSONEachRow'
      });
      const rows = await result.json();
      
      return {
        healthy: true,
        eventsCount: rows[0]?.count || 0
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  async close() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.isConnected = false;
    }
  }
}

// Singleton instance
let instance = null;

function getClickHouse() {
  if (!instance) {
    instance = new ClickHouseService();
  }
  return instance;
}

module.exports = {
  ClickHouseService,
  getClickHouse
};
