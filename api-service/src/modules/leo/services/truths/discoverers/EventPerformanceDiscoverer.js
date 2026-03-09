/**
 * Leo AI - Event Performance Discoverer
 *
 * Cross-references event metadata, artist reviews, venue data, seasonal
 * patterns, and category performance to surface truths like:
 *
 *   "Outdoor festivals in AZ averaging 4.2★ from metal artists"
 *   "Events with booth fees under $300 get 30% more artist applications"
 *   "February/March events rate 0.7★ higher than summer events"
 *   "Artists who rated Show A highly also rated Show B highly"
 *
 * These truths feed projections:
 *   "Based on how similar artists performed at similar shows,
 *    we project your success rate at Event X to be Y."
 *
 * Designed to deliver value with as few as 10-20 reviews and scale
 * gracefully as data grows into the thousands.
 */

const BaseDiscoverer = require('../BaseDiscoverer');
const logger = require('../../logger');

class EventPerformanceDiscoverer extends BaseDiscoverer {
  constructor() {
    super({
      name: 'event_performance',
      description: 'Discovers event performance patterns from reviews, applications, and venue data',
      targetCollection: 'truth_patterns',
      runInterval: 6 * 60 * 60 * 1000,
      batchSize: 1,
      priority: 'medium'
    });

    this.minSampleSize = 2;
  }

  async discover() {
    const truths = [];

    if (!this.db) {
      logger.warn('event_performance: No database connection, skipping');
      return truths;
    }

    try {
      const probes = [
        this.probeEventTypeRatings(),
        this.probeRegionalPerformance(),
        this.probeSeasonalPatterns(),
        this.probeBoothFeeCorrelation(),
        this.probeArtistEventOverlap(),
        this.probeCategoryEventFit(),
        this.probeRepeatAttendance(),
        this.probeEventSizeImpact()
      ];

      const results = await Promise.allSettled(probes);

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          truths.push(...result.value);
        } else if (result.status === 'rejected') {
          logger.warn('Event probe failed:', result.reason?.message);
        }
      }

      logger.info(`Event performance discovery: ${truths.length} patterns found`);
      return truths;

    } catch (error) {
      logger.error('Event performance discovery error:', error);
      throw error;
    }
  }

  // ── Probe: How do different event types rate? ────────────────────
  async probeEventTypeRatings() {
    const patterns = [];

    const [rows] = await this.db.execute(`
      SELECT
        et.name AS event_type,
        COUNT(r.id) AS review_count,
        ROUND(AVG(r.rating), 2) AS avg_rating,
        COUNT(DISTINCT r.reviewer_id) AS unique_reviewers,
        COUNT(DISTINCT r.reviewable_id) AS unique_events
      FROM reviews r
      JOIN events e ON r.reviewable_id = e.id AND r.reviewable_type = 'event'
      JOIN event_types et ON e.event_type_id = et.id
      WHERE r.status = 'active'
      GROUP BY et.name
      HAVING review_count >= ?
      ORDER BY avg_rating DESC
    `, [this.minSampleSize]);

    if (rows.length < 1) return patterns;

    for (const row of rows) {
      patterns.push(this.buildPattern(
        'event_type_rating',
        `"${row.event_type}" events average ${row.avg_rating}★ from ${row.unique_reviewers} artists across ${row.unique_events} events`,
        parseFloat(row.avg_rating) / 5,
        Math.min(row.review_count / 20, 0.95),
        {
          event_type: row.event_type,
          avg_rating: parseFloat(row.avg_rating),
          review_count: row.review_count,
          unique_reviewers: row.unique_reviewers,
          unique_events: row.unique_events
        }
      ));
    }
    return patterns;
  }

  // ── Probe: Regional performance (state/city level) ───────────────
  async probeRegionalPerformance() {
    const patterns = [];

    const [rows] = await this.db.execute(`
      SELECT
        COALESCE(e.venue_state, 'Unknown') AS region,
        COALESCE(e.venue_city, '') AS city,
        COUNT(r.id) AS review_count,
        ROUND(AVG(r.rating), 2) AS avg_rating,
        COUNT(DISTINCT e.id) AS event_count,
        ROUND(AVG(e.booth_fee), 2) AS avg_booth_fee
      FROM reviews r
      JOIN events e ON r.reviewable_id = e.id AND r.reviewable_type = 'event'
      WHERE r.status = 'active'
        AND e.venue_state IS NOT NULL
      GROUP BY region, city
      HAVING review_count >= ?
      ORDER BY avg_rating DESC
    `, [this.minSampleSize]);

    for (const row of rows) {
      const location = row.city ? `${row.city}, ${row.region}` : row.region;
      patterns.push(this.buildPattern(
        'regional_event_performance',
        `Events in ${location} average ${row.avg_rating}★ across ${row.event_count} events (avg booth fee $${row.avg_booth_fee || 0})`,
        parseFloat(row.avg_rating) / 5,
        Math.min(row.review_count / 15, 0.95),
        {
          region: row.region,
          city: row.city || null,
          avg_rating: parseFloat(row.avg_rating),
          event_count: row.event_count,
          review_count: row.review_count,
          avg_booth_fee: parseFloat(row.avg_booth_fee) || 0
        }
      ));
    }
    return patterns;
  }

  // ── Probe: Seasonal performance (month-of-year patterns) ─────────
  async probeSeasonalPatterns() {
    const patterns = [];

    const [rows] = await this.db.execute(`
      SELECT
        MONTH(e.start_date) AS event_month,
        MONTHNAME(e.start_date) AS month_name,
        COUNT(r.id) AS review_count,
        ROUND(AVG(r.rating), 2) AS avg_rating,
        COUNT(DISTINCT e.id) AS event_count
      FROM reviews r
      JOIN events e ON r.reviewable_id = e.id AND r.reviewable_type = 'event'
      WHERE r.status = 'active'
        AND e.start_date IS NOT NULL
      GROUP BY event_month, month_name
      HAVING review_count >= ?
      ORDER BY event_month
    `, [this.minSampleSize]);

    if (rows.length < 2) return patterns;

    const ratings = rows.map(r => parseFloat(r.avg_rating));
    const { mean, stdDev } = this.stats_summary(ratings);
    if (stdDev === 0) return patterns;

    for (const row of rows) {
      const z = (parseFloat(row.avg_rating) - mean) / stdDev;
      if (Math.abs(z) >= 1.0) {
        const direction = z > 0 ? 'above' : 'below';
        patterns.push(this.buildPattern(
          'seasonal_event_performance',
          `${row.month_name} events rate ${row.avg_rating}★ — significantly ${direction} the ${mean.toFixed(1)}★ average (${row.event_count} events, ${row.review_count} reviews)`,
          Math.min(Math.abs(z) / 3, 1),
          Math.min(row.review_count / 15, 0.95),
          {
            month: row.event_month,
            month_name: row.month_name,
            avg_rating: parseFloat(row.avg_rating),
            overall_avg: mean,
            z_score: Math.round(z * 100) / 100,
            event_count: row.event_count,
            review_count: row.review_count
          }
        ));
      }
    }
    return patterns;
  }

  // ── Probe: Booth fee vs satisfaction ──────────────────────────────
  async probeBoothFeeCorrelation() {
    const patterns = [];

    const [rows] = await this.db.execute(`
      SELECT
        CASE
          WHEN e.booth_fee = 0 OR e.booth_fee IS NULL THEN 'free'
          WHEN e.booth_fee < 200 THEN 'budget ($1-199)'
          WHEN e.booth_fee < 400 THEN 'mid-range ($200-399)'
          WHEN e.booth_fee < 700 THEN 'premium ($400-699)'
          ELSE 'high-end ($700+)'
        END AS fee_tier,
        COUNT(r.id) AS review_count,
        ROUND(AVG(r.rating), 2) AS avg_rating,
        COUNT(DISTINCT e.id) AS event_count,
        ROUND(AVG(e.booth_fee), 0) AS avg_fee
      FROM reviews r
      JOIN events e ON r.reviewable_id = e.id AND r.reviewable_type = 'event'
      WHERE r.status = 'active'
      GROUP BY fee_tier
      HAVING review_count >= ?
      ORDER BY avg_fee
    `, [this.minSampleSize]);

    if (rows.length < 2) return patterns;

    const ratings = rows.map(r => parseFloat(r.avg_rating));
    const { mean } = this.stats_summary(ratings);

    for (const row of rows) {
      const diff = parseFloat(row.avg_rating) - mean;
      if (Math.abs(diff) >= 0.3) {
        const direction = diff > 0 ? 'higher' : 'lower';
        patterns.push(this.buildPattern(
          'booth_fee_satisfaction',
          `${row.fee_tier} events (avg $${row.avg_fee}) rate ${row.avg_rating}★ — ${direction} than average ${mean.toFixed(1)}★`,
          Math.min(Math.abs(diff), 1),
          Math.min(row.review_count / 15, 0.95),
          {
            fee_tier: row.fee_tier,
            avg_fee: parseFloat(row.avg_fee),
            avg_rating: parseFloat(row.avg_rating),
            overall_avg_rating: mean,
            event_count: row.event_count,
            review_count: row.review_count
          }
        ));
      }
    }
    return patterns;
  }

  // ── Probe: Artists who reviewed multiple events (taste clusters) ──
  async probeArtistEventOverlap() {
    const patterns = [];

    const [rows] = await this.db.execute(`
      SELECT
        r.reviewer_id,
        COUNT(DISTINCT r.reviewable_id) AS events_reviewed,
        ROUND(AVG(r.rating), 2) AS avg_rating,
        GROUP_CONCAT(DISTINCT e.title ORDER BY r.rating DESC SEPARATOR ' | ') AS event_names,
        GROUP_CONCAT(DISTINCT e.venue_state SEPARATOR ', ') AS states
      FROM reviews r
      JOIN events e ON r.reviewable_id = e.id AND r.reviewable_type = 'event'
      WHERE r.status = 'active'
        AND r.reviewer_type = 'artist'
      GROUP BY r.reviewer_id
      HAVING events_reviewed >= 2
      ORDER BY events_reviewed DESC
      LIMIT 50
    `);

    if (rows.length < 1) return patterns;

    for (const row of rows) {
      patterns.push(this.buildPattern(
        'artist_event_experience',
        `Artist ${row.reviewer_id} reviewed ${row.events_reviewed} events (avg ${row.avg_rating}★) across ${row.states}: ${row.event_names}`,
        parseFloat(row.avg_rating) / 5,
        Math.min(row.events_reviewed / 5, 0.95),
        {
          reviewer_id: row.reviewer_id,
          events_reviewed: row.events_reviewed,
          avg_rating: parseFloat(row.avg_rating),
          states: row.states,
          event_list: row.event_names
        }
      ));
    }
    return patterns;
  }

  // ── Probe: Which art categories do best at which event types? ────
  async probeCategoryEventFit() {
    const patterns = [];

    // Cross-reference artist categories with their event ratings
    const [rows] = await this.db.execute(`
      SELECT
        et.name AS event_type,
        c.name AS artist_category,
        COUNT(r.id) AS review_count,
        ROUND(AVG(r.rating), 2) AS avg_rating
      FROM reviews r
      JOIN events e ON r.reviewable_id = e.id AND r.reviewable_type = 'event'
      JOIN event_types et ON e.event_type_id = et.id
      JOIN artist_profiles ap ON r.reviewer_id = ap.user_id
      JOIN categories c ON FIND_IN_SET(c.id, REPLACE(REPLACE(REPLACE(ap.art_categories, '[', ''), ']', ''), '"', ''))
      WHERE r.status = 'active'
        AND r.reviewer_type = 'artist'
        AND c.id > 15
      GROUP BY et.name, c.name
      HAVING review_count >= ?
      ORDER BY avg_rating DESC
    `, [this.minSampleSize]);

    for (const row of rows) {
      patterns.push(this.buildPattern(
        'category_event_fit',
        `"${row.artist_category}" artists rate "${row.event_type}" events at ${row.avg_rating}★ (${row.review_count} reviews)`,
        parseFloat(row.avg_rating) / 5,
        Math.min(row.review_count / 10, 0.95),
        {
          artist_category: row.artist_category,
          event_type: row.event_type,
          avg_rating: parseFloat(row.avg_rating),
          review_count: row.review_count
        }
      ));
    }
    return patterns;
  }

  // ── Probe: Repeat attendance signal ──────────────────────────────
  async probeRepeatAttendance() {
    const patterns = [];

    // Events from series where artists return year over year
    const [rows] = await this.db.execute(`
      SELECT
        e.series_id,
        MIN(e.title) AS series_name,
        COUNT(DISTINCT e.id) AS editions,
        COUNT(r.id) AS total_reviews,
        ROUND(AVG(r.rating), 2) AS avg_rating,
        COUNT(DISTINCT r.reviewer_id) AS unique_artists
      FROM reviews r
      JOIN events e ON r.reviewable_id = e.id AND r.reviewable_type = 'event'
      WHERE r.status = 'active'
        AND e.series_id IS NOT NULL
      GROUP BY e.series_id
      HAVING total_reviews >= ?
      ORDER BY total_reviews DESC
    `, [this.minSampleSize]);

    for (const row of rows) {
      if (row.editions > 1) {
        patterns.push(this.buildPattern(
          'event_series_loyalty',
          `"${row.series_name}" series: ${row.unique_artists} artists across ${row.editions} editions, avg ${row.avg_rating}★`,
          parseFloat(row.avg_rating) / 5,
          Math.min(row.total_reviews / 10, 0.95),
          {
            series_id: row.series_id,
            series_name: row.series_name,
            editions: row.editions,
            unique_artists: row.unique_artists,
            total_reviews: row.total_reviews,
            avg_rating: parseFloat(row.avg_rating)
          }
        ));
      }
    }
    return patterns;
  }

  // ── Probe: Event size vs satisfaction ─────────────────────────────
  async probeEventSizeImpact() {
    const patterns = [];

    const [rows] = await this.db.execute(`
      SELECT
        CASE
          WHEN e.max_artists IS NULL THEN 'unknown'
          WHEN e.max_artists <= 50 THEN 'small (≤50 artists)'
          WHEN e.max_artists <= 150 THEN 'medium (51-150 artists)'
          WHEN e.max_artists <= 300 THEN 'large (151-300 artists)'
          ELSE 'mega (300+ artists)'
        END AS size_tier,
        COUNT(r.id) AS review_count,
        ROUND(AVG(r.rating), 2) AS avg_rating,
        COUNT(DISTINCT e.id) AS event_count,
        ROUND(AVG(e.max_artists), 0) AS avg_size
      FROM reviews r
      JOIN events e ON r.reviewable_id = e.id AND r.reviewable_type = 'event'
      WHERE r.status = 'active'
        AND e.max_artists IS NOT NULL
      GROUP BY size_tier
      HAVING review_count >= ?
      ORDER BY avg_size
    `, [this.minSampleSize]);

    if (rows.length < 2) return patterns;

    const ratings = rows.map(r => parseFloat(r.avg_rating));
    const { mean } = this.stats_summary(ratings);

    for (const row of rows) {
      const diff = parseFloat(row.avg_rating) - mean;
      if (Math.abs(diff) >= 0.2) {
        const direction = diff > 0 ? 'above' : 'below';
        patterns.push(this.buildPattern(
          'event_size_satisfaction',
          `${row.size_tier} events (avg ${row.avg_size} artists) rate ${row.avg_rating}★ — ${direction} average`,
          Math.min(Math.abs(diff), 1),
          Math.min(row.review_count / 10, 0.95),
          {
            size_tier: row.size_tier,
            avg_size: parseFloat(row.avg_size),
            avg_rating: parseFloat(row.avg_rating),
            overall_avg: mean,
            event_count: row.event_count,
            review_count: row.review_count
          }
        ));
      }
    }
    return patterns;
  }

  // ── Helpers ──────────────────────────────────────────────────────

  buildPattern(type, content, score, confidence, evidence) {
    return {
      type,
      entity_type: 'event_performance',
      entities: [type],
      score: Math.round(score * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      content,
      evidence,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  stats_summary(values) {
    if (!values.length) return { mean: 0, stdDev: 0 };
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
    return { mean, stdDev: Math.sqrt(variance) };
  }
}

module.exports = EventPerformanceDiscoverer;
