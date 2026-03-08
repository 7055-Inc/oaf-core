/**
 * Leo AI - Behavior Ingestion Service
 * 
 * Aggregates user behavior data from ClickHouse and ingests into ChromaDB.
 * Creates behavioral profiles for personalization and recommendations.
 * 
 * Data Flow:
 * - ClickHouse (behavior.events) -> Aggregation -> ChromaDB (user_interactions)
 * 
 * Two modes:
 * 1. User behavior profiles - Per-user aggregated patterns
 * 2. Global trends - Platform-wide insights for baseline/fallback
 */

const { getVectorDB } = require('../vectorDB');
const { getClickHouse } = require('../../../behavior/services/clickhouse');
const logger = require('../logger');

class BehaviorIngestion {
  constructor() {
    this.vectorDB = null;
    this.clickhouse = null;
    this.stats = {
      users_processed: 0,
      users_with_behavior: 0,
      total_events_analyzed: 0,
      global_trends_updated: false
    };
  }

  async initialize() {
    try {
      logger.info('Initializing behavior ingestion...');
      
      this.vectorDB = getVectorDB();
      if (!this.vectorDB.isInitialized) {
        await this.vectorDB.initialize();
      }

      this.clickhouse = getClickHouse();
      await this.clickhouse.initialize();

      logger.info('Behavior ingestion initialized');
      return { success: true };
    } catch (error) {
      logger.error('Failed to initialize behavior ingestion:', error);
      throw error;
    }
  }

  /**
   * Get aggregated behavior for all active users
   * @param {number} dayRange - Look back this many days
   */
  async getUserBehaviorAggregates(dayRange = 90) {
    try {
      const result = await this.clickhouse.client.query({
        query: `
          SELECT
            user_id,
            
            -- Activity metrics
            count() as total_events,
            uniq(session_id) as total_sessions,
            max(timestamp) as last_activity,
            min(timestamp) as first_activity,
            
            -- Page views by type
            countIf(event_type = 'product_view') as product_views,
            countIf(event_type = 'article_view') as article_views,
            countIf(event_type = 'event_view') as event_views,
            countIf(event_type = 'profile_view') as profile_views,
            countIf(event_type = 'category_view') as category_views,
            countIf(event_type = 'search_results') as search_count,
            
            -- Commerce funnel
            countIf(event_type = 'cart_view') as cart_views,
            countIf(event_type = 'checkout') as checkout_starts,
            countIf(event_type = 'checkout_success') as purchases,
            countIf(event_type = 'add_to_cart') as add_to_carts,
            
            -- Engagement signals
            avgIf(JSONExtractFloat(event_data, 'scroll_depth'), event_type = 'scroll') as avg_scroll_depth,
            avgIf(JSONExtractFloat(event_data, 'seconds'), event_type = 'time_on_page') as avg_time_on_page,
            avgIf(JSONExtractFloat(event_data, 'engaged_seconds'), event_type = 'time_on_page') as avg_engaged_time,
            
            -- Interest signals
            countIf(event_type = 'copy_text') as copy_events,
            countIf(event_type = 'print_attempt') as print_events,
            countIf(event_type = 'add_to_wishlist') as wishlist_adds,
            countIf(event_type = 'image_zoom') as image_zooms,
            
            -- Frustration signals
            countIf(event_type = 'rage_click') as rage_clicks,
            countIf(event_type = 'dead_click') as dead_clicks,
            countIf(event_category = 'frustration') as total_frustration_events,
            
            -- Form behavior
            countIf(event_type = 'form_start') as forms_started,
            countIf(event_type = 'form_submit') as forms_completed,
            countIf(event_type = 'form_abandon') as forms_abandoned,
            
            -- Error tracking
            countIf(event_type = 'js_error') as js_errors,
            
            -- Content preferences (collect unique IDs)
            groupUniqArrayIf(JSONExtractUInt(event_data, 'product_id'), 
              event_type = 'product_view' AND JSONExtractUInt(event_data, 'product_id') > 0) as viewed_products,
            groupUniqArrayIf(JSONExtractUInt(event_data, 'category_id'), 
              event_type = 'category_view' AND JSONExtractUInt(event_data, 'category_id') > 0) as viewed_categories,
            groupUniqArrayIf(JSONExtractUInt(event_data, 'event_id'), 
              event_type = 'event_view' AND JSONExtractUInt(event_data, 'event_id') > 0) as viewed_events,
            groupUniqArrayIf(JSONExtractUInt(event_data, 'artist_id'), 
              event_type IN ('profile_view', 'artist_products') AND JSONExtractUInt(event_data, 'artist_id') > 0) as viewed_artists,
            
            -- Search behavior
            groupArrayIf(JSONExtractString(event_data, 'search_query'), 
              event_type = 'search_results' AND JSONExtractString(event_data, 'search_query') != '') as search_queries,
            
            -- Time patterns (for activity prediction)
            groupArray(toHour(timestamp)) as activity_hours,
            groupArray(toDayOfWeek(timestamp)) as activity_days,
            
            -- Device/context patterns
            topK(1)(device_type) as primary_device,
            topK(1)(browser) as primary_browser,
            topK(1)(connection_type) as typical_connection,
            avg(session_count) as avg_session_number
            
          FROM events
          WHERE user_id > 0
            AND timestamp >= now() - INTERVAL {dayRange:UInt32} DAY
          GROUP BY user_id
          HAVING total_events >= 5  -- Only users with meaningful activity
          ORDER BY total_events DESC
        `,
        query_params: { dayRange },
        format: 'JSONEachRow'
      });

      const users = await result.json();
      logger.info(`Found ${users.length} users with behavior data`);
      return users;
    } catch (error) {
      logger.error('Failed to fetch user behavior aggregates:', error);
      throw error;
    }
  }

  /**
   * Get global platform trends for baseline personalization
   */
  async getGlobalTrends(dayRange = 30) {
    try {
      const result = await this.clickhouse.client.query({
        query: `
          SELECT
            -- Overall activity
            count() as total_events,
            uniq(user_id) as unique_users,
            uniq(session_id) as total_sessions,
            
            -- Top products
            topK(20)(JSONExtractUInt(event_data, 'product_id')) as top_products,
            
            -- Top categories
            topK(10)(JSONExtractUInt(event_data, 'category_id')) as top_categories,
            
            -- Top search queries
            topKIf(20)(JSONExtractString(event_data, 'search_query'),
              event_type = 'search_results' AND JSONExtractString(event_data, 'search_query') != '') as top_searches,
            
            -- Peak hours
            topK(5)(toHour(timestamp)) as peak_hours,
            
            -- Device breakdown
            countIf(device_type = 'mobile') / count() as mobile_ratio,
            countIf(device_type = 'desktop') / count() as desktop_ratio,
            
            -- Engagement averages
            avgIf(JSONExtractFloat(event_data, 'scroll_depth'), event_type = 'scroll') as avg_scroll_depth,
            avgIf(JSONExtractFloat(event_data, 'seconds'), event_type = 'time_on_page') as avg_time_on_page,
            
            -- Conversion metrics
            countIf(event_type = 'checkout_success') / nullIf(countIf(event_type = 'cart_view'), 0) as cart_to_purchase_rate,
            countIf(event_type = 'add_to_cart') / nullIf(countIf(event_type = 'product_view'), 0) as view_to_cart_rate
            
          FROM events
          WHERE timestamp >= now() - INTERVAL {dayRange:UInt32} DAY
        `,
        query_params: { dayRange },
        format: 'JSONEachRow'
      });

      const trends = await result.json();
      return trends[0] || {};
    } catch (error) {
      logger.error('Failed to fetch global trends:', error);
      throw error;
    }
  }

  /**
   * Calculate user engagement score (0-100)
   */
  calculateEngagementScore(behavior) {
    let score = 0;
    
    // Session frequency (up to 25 points)
    const sessionsPerMonth = behavior.total_sessions / 3;
    score += Math.min(25, sessionsPerMonth * 2.5);
    
    // Page engagement (up to 25 points)
    if (behavior.avg_scroll_depth) {
      score += (behavior.avg_scroll_depth / 100) * 15;
    }
    if (behavior.avg_engaged_time && behavior.avg_engaged_time > 30) {
      score += Math.min(10, behavior.avg_engaged_time / 30);
    }
    
    // Commerce engagement (up to 25 points)
    if (behavior.purchases > 0) score += 15;
    else if (behavior.checkout_starts > 0) score += 10;
    else if (behavior.add_to_carts > 0) score += 5;
    else if (behavior.cart_views > 0) score += 2;
    
    if (behavior.wishlist_adds > 0) score += 5;
    if (behavior.image_zooms > behavior.product_views * 0.3) score += 5;
    
    // Interest signals (up to 15 points)
    if (behavior.copy_events > 0) score += 5;
    if (behavior.print_events > 0) score += 5;
    if (behavior.search_count > 5) score += 5;
    
    // Penalty for frustration (up to -10 points)
    const frustrationRatio = behavior.total_frustration_events / behavior.total_events;
    if (frustrationRatio > 0.05) {
      score -= Math.min(10, frustrationRatio * 100);
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Determine user's purchase intent level
   */
  determinePurchaseIntent(behavior) {
    if (behavior.purchases > 0) return 'buyer';
    if (behavior.checkout_starts > 0) return 'high';
    if (behavior.add_to_carts > 0) return 'medium';
    if (behavior.product_views > 10 || behavior.wishlist_adds > 0) return 'browsing';
    return 'exploring';
  }

  /**
   * Build searchable content from behavior patterns
   */
  buildBehaviorContent(behavior) {
    const parts = [];
    
    parts.push(`User ${behavior.user_id} behavior profile`);
    
    // Activity level
    if (behavior.total_sessions > 20) {
      parts.push('highly active user');
    } else if (behavior.total_sessions > 5) {
      parts.push('regular user');
    } else {
      parts.push('occasional visitor');
    }
    
    // Interest patterns
    if (behavior.product_views > behavior.article_views) {
      parts.push('product-focused shopper');
    } else if (behavior.article_views > behavior.product_views) {
      parts.push('content reader');
    }
    
    if (behavior.event_views > 5) {
      parts.push('interested in events');
    }
    
    // Purchase behavior
    const intent = this.determinePurchaseIntent(behavior);
    parts.push(`purchase intent: ${intent}`);
    
    // Search queries as keywords
    if (behavior.search_queries && behavior.search_queries.length > 0) {
      const uniqueQueries = [...new Set(behavior.search_queries)].slice(0, 10);
      parts.push(`searched for: ${uniqueQueries.join(', ')}`);
    }
    
    return parts.join(' | ');
  }

  /**
   * Build metadata for vector storage
   */
  buildBehaviorMetadata(behavior) {
    // Calculate derived metrics
    const engagementScore = this.calculateEngagementScore(behavior);
    const purchaseIntent = this.determinePurchaseIntent(behavior);
    
    // Find peak activity times
    const hourCounts = {};
    (behavior.activity_hours || []).forEach(h => {
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    
    const dayCounts = {};
    (behavior.activity_days || []).forEach(d => {
      dayCounts[d] = (dayCounts[d] || 0) + 1;
    });
    const peakDay = Object.entries(dayCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    return {
      // Identity
      user_id: behavior.user_id,
      classification: '142', // Behavioral data
      
      // Activity metrics
      total_events: behavior.total_events || 0,
      total_sessions: behavior.total_sessions || 0,
      last_activity: behavior.last_activity || null,
      first_activity: behavior.first_activity || null,
      
      // Engagement
      engagement_score: engagementScore,
      avg_scroll_depth: Math.round(behavior.avg_scroll_depth || 0),
      avg_time_on_page: Math.round(behavior.avg_time_on_page || 0),
      avg_engaged_time: Math.round(behavior.avg_engaged_time || 0),
      
      // Commerce funnel
      purchase_intent: purchaseIntent,
      product_views: behavior.product_views || 0,
      add_to_carts: behavior.add_to_carts || 0,
      cart_views: behavior.cart_views || 0,
      checkout_starts: behavior.checkout_starts || 0,
      purchases: behavior.purchases || 0,
      wishlist_adds: behavior.wishlist_adds || 0,
      
      // Content engagement
      article_views: behavior.article_views || 0,
      event_views: behavior.event_views || 0,
      profile_views: behavior.profile_views || 0,
      search_count: behavior.search_count || 0,
      
      // Interest signals
      copy_events: behavior.copy_events || 0,
      print_events: behavior.print_events || 0,
      image_zooms: behavior.image_zooms || 0,
      
      // Frustration metrics
      rage_clicks: behavior.rage_clicks || 0,
      dead_clicks: behavior.dead_clicks || 0,
      frustration_events: behavior.total_frustration_events || 0,
      frustration_rate: behavior.total_events > 0 
        ? (behavior.total_frustration_events / behavior.total_events).toFixed(4) 
        : '0',
      
      // Form completion
      forms_started: behavior.forms_started || 0,
      forms_completed: behavior.forms_completed || 0,
      forms_abandoned: behavior.forms_abandoned || 0,
      form_completion_rate: behavior.forms_started > 0
        ? (behavior.forms_completed / behavior.forms_started).toFixed(2)
        : '0',
      
      // Content preferences (as JSON strings for querying)
      viewed_products: JSON.stringify((behavior.viewed_products || []).slice(0, 50)),
      viewed_categories: JSON.stringify((behavior.viewed_categories || []).slice(0, 20)),
      viewed_events: JSON.stringify((behavior.viewed_events || []).slice(0, 20)),
      viewed_artists: JSON.stringify((behavior.viewed_artists || []).slice(0, 20)),
      recent_searches: JSON.stringify(
        [...new Set(behavior.search_queries || [])].slice(0, 20)
      ),
      
      // Time patterns
      peak_activity_hour: peakHour ? parseInt(peakHour) : null,
      peak_activity_day: peakDay ? parseInt(peakDay) : null,
      
      // Device context
      primary_device: behavior.primary_device?.[0] || 'unknown',
      primary_browser: behavior.primary_browser?.[0] || 'unknown',
      typical_connection: behavior.typical_connection?.[0] || 'unknown',
      
      // Meta
      ingestion_version: 1,
      ingested_at: new Date().toISOString()
    };
  }

  /**
   * Ingest a single user's behavior profile
   */
  async ingestUserBehavior(behavior) {
    try {
      const content = this.buildBehaviorContent(behavior);
      const metadata = this.buildBehaviorMetadata(behavior);

      await this.vectorDB.addDocuments('user_behavior', [{
        id: `behavior_${behavior.user_id}`,
        content,
        metadata,
        source: 'behavior_ingestion'
      }]);

      this.stats.users_processed++;
      if (behavior.total_events > 10) {
        this.stats.users_with_behavior++;
      }
      this.stats.total_events_analyzed += behavior.total_events;

    } catch (error) {
      logger.error(`Failed to ingest behavior for user ${behavior.user_id}:`, error);
      throw error;
    }
  }

  /**
   * Ingest global trends for baseline personalization
   */
  async ingestGlobalTrends(trends) {
    try {
      const content = `Platform global trends: ${trends.unique_users} unique users, ` +
        `${trends.total_sessions} sessions, ` +
        `top searches: ${(trends.top_searches || []).slice(0, 5).join(', ')}`;

      const metadata = {
        type: 'global_trends',
        classification: '143', // Platform analytics
        total_events: trends.total_events || 0,
        unique_users: trends.unique_users || 0,
        total_sessions: trends.total_sessions || 0,
        top_products: JSON.stringify((trends.top_products || []).slice(0, 20)),
        top_categories: JSON.stringify((trends.top_categories || []).slice(0, 10)),
        top_searches: JSON.stringify((trends.top_searches || []).slice(0, 20)),
        peak_hours: JSON.stringify(trends.peak_hours || []),
        mobile_ratio: trends.mobile_ratio?.toFixed(2) || '0',
        desktop_ratio: trends.desktop_ratio?.toFixed(2) || '0',
        avg_scroll_depth: Math.round(trends.avg_scroll_depth || 0),
        avg_time_on_page: Math.round(trends.avg_time_on_page || 0),
        cart_to_purchase_rate: trends.cart_to_purchase_rate?.toFixed(4) || '0',
        view_to_cart_rate: trends.view_to_cart_rate?.toFixed(4) || '0',
        ingested_at: new Date().toISOString()
      };

      await this.vectorDB.addDocuments('user_behavior', [{
        id: 'global_trends',
        content,
        metadata,
        source: 'behavior_ingestion'
      }]);

      this.stats.global_trends_updated = true;
      logger.info('Global trends ingested');
    } catch (error) {
      logger.error('Failed to ingest global trends:', error);
      throw error;
    }
  }

  /**
   * Run the complete behavior ingestion
   * @param {number} dayRange - How many days of data to analyze
   */
  async run(dayRange = 90) {
    try {
      logger.info(`Starting behavior ingestion (${dayRange} day lookback)...`);
      const startTime = Date.now();

      // Initialize if not already done
      if (!this.clickhouse || !this.vectorDB) {
        try {
          await this.initialize();
        } catch (initError) {
          logger.error('Failed to initialize behavior ingestion - ClickHouse may not be running:', initError.message);
          return { 
            success: false, 
            error: 'ClickHouse connection failed. Is ClickHouse running on port 8123?',
            stats: this.stats, 
            duration: 0 
          };
        }
      }

      // Reset stats
      this.stats = {
        users_processed: 0,
        users_with_behavior: 0,
        total_events_analyzed: 0,
        global_trends_updated: false
      };

      // Get and ingest global trends first
      logger.info('Fetching global trends...');
      const trends = await this.getGlobalTrends(30);
      await this.ingestGlobalTrends(trends);

      // Get user behavior aggregates
      logger.info('Fetching user behavior aggregates...');
      const userBehaviors = await this.getUserBehaviorAggregates(dayRange);

      if (userBehaviors.length === 0) {
        logger.info('No user behavior data to ingest');
        return { success: true, stats: this.stats, duration: 0 };
      }

      // Ingest each user's behavior
      for (const behavior of userBehaviors) {
        await this.ingestUserBehavior(behavior);
        
        if (this.stats.users_processed % 100 === 0) {
          logger.info(`Progress: ${this.stats.users_processed}/${userBehaviors.length} users processed`);
        }
      }

      const duration = Date.now() - startTime;
      logger.info('Behavior ingestion complete!', { 
        stats: this.stats, 
        duration_ms: duration 
      });

      return { success: true, stats: this.stats, duration };

    } catch (error) {
      logger.error('Behavior ingestion failed:', error);
      throw error;
    }
  }
}

// Singleton instance
let instance = null;

function getBehaviorIngestion() {
  if (!instance) {
    instance = new BehaviorIngestion();
  }
  return instance;
}

module.exports = {
  BehaviorIngestion,
  getBehaviorIngestion
};
