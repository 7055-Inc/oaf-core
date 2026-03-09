/**
 * Leo AI - Behavioral Pattern Discoverer
 *
 * Mines MySQL transaction and interaction data for emergent patterns.
 * This discoverer does NOT look for pre-defined patterns -- it runs
 * statistical queries and surfaces anything that is surprising.
 *
 * Example discoveries (these are not coded, they emerge from the data):
 *   "Tuesday buyers spend 2.8x more than Friday buyers"
 *   "Sculpture buyers are 4x more likely to also buy metal decor"
 *   "Orders placed between 9-11 PM have 40% higher average value"
 *   "Category 'metal-art' has 3x conversion rate vs site average"
 *
 * The discoverer runs a battery of statistical probes, computes
 * deviations from expected values, and only records patterns that
 * are statistically meaningful (z-score based significance).
 */

const BaseDiscoverer = require('../BaseDiscoverer');
const logger = require('../../logger');

class BehavioralPatternDiscoverer extends BaseDiscoverer {
  constructor() {
    super({
      name: 'behavioral_pattern',
      description: 'Discovers emergent behavioral patterns from transaction data',
      targetCollection: 'truth_patterns',
      runInterval: 6 * 60 * 60 * 1000,
      batchSize: 1,
      priority: 'medium'
    });

    this.minSampleSize = 3;
    this.significanceThreshold = 1.2; // z-score: how many std devs from mean to be "interesting"
  }

  async discover() {
    const truths = [];

    if (!this.db) {
      logger.warn('behavioral_pattern: No database connection, skipping');
      return truths;
    }

    try {
      // Determine lookback: use all data if less than 500 orders, otherwise last 12 months
      const [[{ cnt }]] = await this.db.execute(
        "SELECT COUNT(*) AS cnt FROM orders WHERE status NOT IN ('cancelled','refunded')"
      );
      this.lookbackDate = cnt < 500 ? '2000-01-01' : new Date(Date.now() - 365*24*60*60*1000).toISOString().slice(0,10);
      logger.info(`Behavioral probes using ${cnt} orders (since ${this.lookbackDate})`);

      const probes = [
        this.probeDayOfWeek(),
        this.probeTimeOfDay(),
        this.probeCategoryCoPurchase(),
        this.probePriceRangeByCategory(),
        this.probeNewVsReturning(),
        this.probeCategoryConversion(),
        this.probeColorPreferences(),
        this.probeCategoryTimingPatterns(),
        this.probeEngagementToConversion()
      ];

      const results = await Promise.allSettled(probes);

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          truths.push(...result.value);
        } else if (result.status === 'rejected') {
          logger.warn('Behavioral probe failed:', result.reason?.message);
        }
      }

      logger.info(`Behavioral pattern discovery: ${truths.length} patterns found`);
      return truths;

    } catch (error) {
      logger.error('Behavioral pattern discovery error:', error);
      throw error;
    }
  }

  // ── Probe: Day-of-week spending patterns ─────────────────────────
  async probeDayOfWeek() {
    const patterns = [];

    const [rows] = await this.db.execute(`
      SELECT
        DAYOFWEEK(created_at) AS dow,
        DAYNAME(created_at)   AS day_name,
        COUNT(*)              AS order_count,
        ROUND(AVG(total_amount), 2)  AS avg_total,
        ROUND(SUM(total_amount), 2)  AS sum_total
      FROM orders
      WHERE status NOT IN ('cancelled', 'refunded')
        AND created_at >= ?
      GROUP BY dow, day_name
      ORDER BY dow
    `, [this.lookbackDate]);

    if (rows.length < 3) return patterns;

    const avgTotals = rows.map(r => parseFloat(r.avg_total));
    const { mean, stdDev } = this.stats_summary(avgTotals);
    if (stdDev === 0) return patterns;

    for (const row of rows) {
      const z = (parseFloat(row.avg_total) - mean) / stdDev;
      if (Math.abs(z) >= this.significanceThreshold && row.order_count >= this.minSampleSize) {
        const direction = z > 0 ? 'higher' : 'lower';
        const ratio = (parseFloat(row.avg_total) / mean).toFixed(1);
        patterns.push(this.buildPattern(
          'day_of_week_spending',
          `${row.day_name} buyers average $${row.avg_total}/order — ${ratio}x the overall average ($${mean.toFixed(2)}), ${direction} than typical`,
          Math.min(Math.abs(z) / 3, 1),
          Math.min(row.order_count / 30, 0.95),
          {
            day: row.day_name,
            avg_total: parseFloat(row.avg_total),
            order_count: row.order_count,
            overall_avg: mean,
            z_score: Math.round(z * 100) / 100,
            ratio: parseFloat(ratio),
            direction
          }
        ));
      }
    }
    return patterns;
  }

  // ── Probe: Time-of-day patterns ──────────────────────────────────
  async probeTimeOfDay() {
    const patterns = [];

    const [rows] = await this.db.execute(`
      SELECT
        HOUR(created_at) AS hour_of_day,
        COUNT(*)         AS order_count,
        ROUND(AVG(total_amount), 2) AS avg_total
      FROM orders
      WHERE status NOT IN ('cancelled', 'refunded')
        AND created_at >= ?
      GROUP BY hour_of_day
      ORDER BY hour_of_day
    `, [this.lookbackDate]);

    if (rows.length < 4) return patterns;

    const buckets = [
      { name: 'early morning (5-8 AM)',   hours: [5,6,7,8] },
      { name: 'morning (9 AM-12 PM)',     hours: [9,10,11,12] },
      { name: 'afternoon (1-5 PM)',       hours: [13,14,15,16,17] },
      { name: 'evening (6-9 PM)',         hours: [18,19,20,21] },
      { name: 'late night (10 PM-4 AM)',  hours: [22,23,0,1,2,3,4] }
    ];

    const bucketStats = buckets.map(b => {
      const matched = rows.filter(r => b.hours.includes(r.hour_of_day));
      const count = matched.reduce((s, r) => s + r.order_count, 0);
      const weightedAvg = count > 0
        ? matched.reduce((s, r) => s + parseFloat(r.avg_total) * r.order_count, 0) / count
        : 0;
      return { ...b, count, avg: weightedAvg };
    }).filter(b => b.count >= this.minSampleSize);

    if (bucketStats.length < 2) return patterns;

    const avgs = bucketStats.map(b => b.avg);
    const { mean, stdDev } = this.stats_summary(avgs);
    if (stdDev === 0) return patterns;

    for (const b of bucketStats) {
      const z = (b.avg - mean) / stdDev;
      if (Math.abs(z) >= this.significanceThreshold) {
        const ratio = (b.avg / mean).toFixed(1);
        patterns.push(this.buildPattern(
          'time_of_day_spending',
          `Orders placed ${b.name} average $${b.avg.toFixed(2)}/order — ${ratio}x the average across all time slots`,
          Math.min(Math.abs(z) / 3, 1),
          Math.min(b.count / 30, 0.95),
          {
            time_bucket: b.name,
            avg_total: Math.round(b.avg * 100) / 100,
            order_count: b.count,
            overall_avg: Math.round(mean * 100) / 100,
            z_score: Math.round(z * 100) / 100,
            ratio: parseFloat(ratio)
          }
        ));
      }
    }
    return patterns;
  }

  // ── Probe: Category co-purchase patterns ─────────────────────────
  async probeCategoryCoPurchase() {
    const patterns = [];

    const [rows] = await this.db.execute(`
      SELECT
        c1.name AS cat_a,
        c2.name AS cat_b,
        COUNT(DISTINCT oi1.order_id) AS co_orders
      FROM order_items oi1
      JOIN order_items oi2 ON oi1.order_id = oi2.order_id AND oi1.product_id != oi2.product_id
      JOIN products p1 ON oi1.product_id = p1.id
      JOIN products p2 ON oi2.product_id = p2.id
      JOIN categories c1 ON p1.category_id = c1.id
      JOIN categories c2 ON p2.category_id = c2.id
      WHERE c1.id < c2.id
      GROUP BY c1.name, c2.name
      HAVING co_orders >= ?
      ORDER BY co_orders DESC
      LIMIT 20
    `, [this.minSampleSize]);

    for (const row of rows) {
      patterns.push(this.buildPattern(
        'category_co_purchase',
        `Buyers of "${row.cat_a}" also buy "${row.cat_b}" in the same order (${row.co_orders} orders)`,
        Math.min(row.co_orders / 50, 1),
        Math.min(row.co_orders / 20, 0.95),
        {
          category_a: row.cat_a,
          category_b: row.cat_b,
          co_purchase_count: row.co_orders
        }
      ));
    }
    return patterns;
  }

  // ── Probe: Price sensitivity by category ─────────────────────────
  async probePriceRangeByCategory() {
    const patterns = [];

    const [rows] = await this.db.execute(`
      SELECT
        c.name AS category,
        COUNT(*)              AS sold_count,
        ROUND(AVG(oi.price), 2) AS avg_price,
        ROUND(MIN(oi.price), 2) AS min_price,
        ROUND(MAX(oi.price), 2) AS max_price,
        ROUND(STDDEV(oi.price), 2) AS price_stddev
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status NOT IN ('cancelled', 'refunded')
        AND o.created_at >= ?
      GROUP BY c.name
      HAVING sold_count >= ?
      ORDER BY sold_count DESC
    `, [this.lookbackDate, this.minSampleSize]);

    if (rows.length < 2) return patterns;

    const avgPrices = rows.map(r => parseFloat(r.avg_price));
    const { mean } = this.stats_summary(avgPrices);

    for (const row of rows) {
      const ratio = parseFloat(row.avg_price) / mean;
      if (Math.abs(ratio - 1) >= 0.4 && row.sold_count >= this.minSampleSize) {
        const direction = ratio > 1 ? 'premium' : 'value';
        patterns.push(this.buildPattern(
          'price_range_by_category',
          `"${row.category}" sells at ${direction} pricing — avg $${row.avg_price} vs site-wide avg $${mean.toFixed(2)} (${ratio.toFixed(1)}x)`,
          Math.min(Math.abs(ratio - 1), 1),
          Math.min(row.sold_count / 30, 0.95),
          {
            category: row.category,
            avg_price: parseFloat(row.avg_price),
            sold_count: row.sold_count,
            site_avg_price: Math.round(mean * 100) / 100,
            ratio: Math.round(ratio * 100) / 100,
            pricing_tier: direction,
            price_range: `$${row.min_price} - $${row.max_price}`
          }
        ));
      }
    }
    return patterns;
  }

  // ── Probe: New vs returning customer spending ────────────────────
  async probeNewVsReturning() {
    const patterns = [];

    const [rows] = await this.db.query(
      `SELECT
        CASE WHEN order_num = 1 THEN 'new' ELSE 'returning' END AS customer_type,
        COUNT(*) AS order_count,
        ROUND(AVG(total), 2) AS avg_total,
        ROUND(AVG(item_count), 2) AS avg_items
      FROM (
        SELECT
          o.id, o.total_amount AS total,
          (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
          ROW_NUMBER() OVER (PARTITION BY o.user_id ORDER BY o.created_at) AS order_num
        FROM orders o
        WHERE o.status NOT IN ('cancelled', 'refunded')
          AND o.created_at >= ?
          AND o.user_id IS NOT NULL
      ) ranked
      GROUP BY customer_type`,
      [this.lookbackDate]
    );

    if (rows.length < 2) return patterns;

    const newRow = rows.find(r => r.customer_type === 'new');
    const retRow = rows.find(r => r.customer_type === 'returning');

    if (newRow && retRow && newRow.order_count >= this.minSampleSize && retRow.order_count >= this.minSampleSize) {
      const spendRatio = parseFloat(retRow.avg_total) / parseFloat(newRow.avg_total);
      if (Math.abs(spendRatio - 1) >= 0.2) {
        const higher = spendRatio > 1 ? 'Returning' : 'New';
        patterns.push(this.buildPattern(
          'new_vs_returning',
          `${higher} customers spend ${Math.max(spendRatio, 1/spendRatio).toFixed(1)}x more per order — New: $${newRow.avg_total} avg, Returning: $${retRow.avg_total} avg`,
          Math.min(Math.abs(spendRatio - 1), 1),
          Math.min((newRow.order_count + retRow.order_count) / 50, 0.95),
          {
            new_avg_total: parseFloat(newRow.avg_total),
            new_order_count: newRow.order_count,
            new_avg_items: parseFloat(newRow.avg_items),
            returning_avg_total: parseFloat(retRow.avg_total),
            returning_order_count: retRow.order_count,
            returning_avg_items: parseFloat(retRow.avg_items),
            spend_ratio: Math.round(spendRatio * 100) / 100
          }
        ));
      }
    }
    return patterns;
  }

  // ── Probe: Category popularity / conversion ──────────────────────
  async probeCategoryConversion() {
    const patterns = [];

    const [rows] = await this.db.execute(`
      SELECT
        c.name AS category,
        COUNT(DISTINCT oi.order_id) AS orders_with_category,
        SUM(oi.quantity) AS units_sold,
        ROUND(SUM(oi.price * oi.quantity), 2) AS total_revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status NOT IN ('cancelled', 'refunded')
        AND o.created_at >= ?
      GROUP BY c.name
      HAVING orders_with_category >= ?
      ORDER BY total_revenue DESC
    `, [this.lookbackDate, this.minSampleSize]);

    if (rows.length < 2) return patterns;

    const revenues = rows.map(r => parseFloat(r.total_revenue));
    const { mean, stdDev } = this.stats_summary(revenues);
    if (stdDev === 0) return patterns;

    for (const row of rows) {
      const z = (parseFloat(row.total_revenue) - mean) / stdDev;
      if (z >= this.significanceThreshold) {
        const ratio = (parseFloat(row.total_revenue) / mean).toFixed(1);
        patterns.push(this.buildPattern(
          'category_revenue_leader',
          `"${row.category}" generates ${ratio}x the average category revenue — $${row.total_revenue} from ${row.units_sold} units across ${row.orders_with_category} orders`,
          Math.min(z / 3, 1),
          Math.min(row.orders_with_category / 20, 0.95),
          {
            category: row.category,
            total_revenue: parseFloat(row.total_revenue),
            units_sold: row.units_sold,
            order_count: row.orders_with_category,
            avg_category_revenue: Math.round(mean * 100) / 100,
            z_score: Math.round(z * 100) / 100
          }
        ));
      }
    }
    return patterns;
  }

  // ── Probe: Which colors sell? ──────────────────────────────────
  async probeColorPreferences() {
    const patterns = [];

    const [rows] = await this.db.execute(`
      SELECT
        uvv.value_name AS color,
        COUNT(DISTINCT oi.order_id) AS order_count,
        SUM(oi.quantity) AS units_sold,
        ROUND(AVG(oi.price), 2) AS avg_price
      FROM order_items oi
      JOIN product_variations pv ON pv.product_id = oi.product_id
      JOIN user_variation_values uvv ON uvv.id = pv.variation_value_id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status NOT IN ('cancelled', 'refunded')
        AND o.created_at >= ?
      GROUP BY uvv.value_name
      HAVING order_count >= ?
      ORDER BY units_sold DESC
      LIMIT 30
    `, [this.lookbackDate, this.minSampleSize]);

    if (rows.length < 2) return patterns;

    const units = rows.map(r => r.units_sold);
    const { mean, stdDev } = this.stats_summary(units);
    if (stdDev === 0) return patterns;

    for (const row of rows) {
      const z = (row.units_sold - mean) / stdDev;
      if (z >= this.significanceThreshold) {
        const ratio = (row.units_sold / mean).toFixed(1);
        patterns.push(this.buildPattern(
          'color_preference',
          `"${row.color}" is the top-selling color — ${row.units_sold} units (${ratio}x average), avg price $${row.avg_price}`,
          Math.min(z / 3, 1),
          Math.min(row.order_count / 15, 0.95),
          {
            color: row.color,
            units_sold: row.units_sold,
            order_count: row.order_count,
            avg_price: parseFloat(row.avg_price),
            ratio: parseFloat(ratio),
            z_score: Math.round(z * 100) / 100
          }
        ));
      }
    }
    return patterns;
  }

  // ── Probe: Category × time-of-day/day-of-week crosses ───────────
  async probeCategoryTimingPatterns() {
    const patterns = [];

    const [rows] = await this.db.execute(`
      SELECT
        c.name AS category,
        CASE
          WHEN HOUR(o.created_at) BETWEEN 6 AND 11 THEN 'morning'
          WHEN HOUR(o.created_at) BETWEEN 12 AND 17 THEN 'afternoon'
          WHEN HOUR(o.created_at) BETWEEN 18 AND 22 THEN 'evening'
          ELSE 'late_night'
        END AS time_bucket,
        COUNT(DISTINCT o.id) AS order_count,
        ROUND(AVG(oi.price), 2) AS avg_item_price
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status NOT IN ('cancelled', 'refunded')
        AND o.created_at >= ?
        AND c.id NOT IN (1)
      GROUP BY c.name, time_bucket
      HAVING order_count >= ?
      ORDER BY order_count DESC
    `, [this.lookbackDate, this.minSampleSize]);

    if (rows.length < 2) return patterns;

    // Look for categories with time concentration
    const catTotals = {};
    for (const row of rows) {
      if (!catTotals[row.category]) catTotals[row.category] = 0;
      catTotals[row.category] += row.order_count;
    }

    for (const row of rows) {
      const total = catTotals[row.category] || 1;
      const pct = row.order_count / total;
      if (pct >= 0.6 && row.order_count >= this.minSampleSize) {
        patterns.push(this.buildPattern(
          'category_time_concentration',
          `${Math.round(pct * 100)}% of "${row.category}" purchases happen in the ${row.time_bucket} (${row.order_count}/${total} orders, avg $${row.avg_item_price}/item)`,
          pct,
          Math.min(row.order_count / 15, 0.95),
          {
            category: row.category,
            time_bucket: row.time_bucket,
            order_count: row.order_count,
            total_category_orders: total,
            concentration_pct: Math.round(pct * 100),
            avg_item_price: parseFloat(row.avg_item_price)
          }
        ));
      }
    }
    return patterns;
  }

  // ── Probe: Engagement signals → conversion (page views if available) ─
  async probeEngagementToConversion() {
    const patterns = [];

    // Mine page_views if the table exists; gracefully skip if not
    try {
      const [[{ cnt }]] = await this.db.execute(
        "SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'page_views'"
      );
      if (cnt === 0) return patterns;

      const [rows] = await this.db.execute(`
        SELECT
          pv.page_type,
          pv.entity_type,
          COUNT(*) AS view_count,
          ROUND(AVG(pv.duration_seconds), 1) AS avg_duration,
          COUNT(DISTINCT pv.session_id) AS unique_sessions,
          SUM(CASE WHEN o.id IS NOT NULL THEN 1 ELSE 0 END) AS converted_sessions
        FROM page_views pv
        LEFT JOIN orders o ON o.user_id = pv.user_id
          AND o.created_at BETWEEN pv.viewed_at AND DATE_ADD(pv.viewed_at, INTERVAL 24 HOUR)
          AND o.status NOT IN ('cancelled', 'refunded')
        WHERE pv.viewed_at >= ?
        GROUP BY pv.page_type, pv.entity_type
        HAVING view_count >= ?
        ORDER BY view_count DESC
      `, [this.lookbackDate, this.minSampleSize]);

      for (const row of rows) {
        if (row.unique_sessions < this.minSampleSize) continue;
        const convRate = row.converted_sessions / row.unique_sessions;
        if (convRate > 0) {
          patterns.push(this.buildPattern(
            'page_engagement_conversion',
            `Users viewing "${row.page_type}/${row.entity_type}" pages (avg ${row.avg_duration}s) convert at ${(convRate * 100).toFixed(1)}% within 24h`,
            convRate,
            Math.min(row.unique_sessions / 30, 0.95),
            {
              page_type: row.page_type,
              entity_type: row.entity_type,
              view_count: row.view_count,
              avg_duration_seconds: parseFloat(row.avg_duration),
              unique_sessions: row.unique_sessions,
              converted_sessions: row.converted_sessions,
              conversion_rate: Math.round(convRate * 1000) / 1000
            }
          ));
        }
      }
    } catch (err) {
      // page_views table may not exist yet -- that's fine
    }
    return patterns;
  }

  // ── Helpers ──────────────────────────────────────────────────────

  buildPattern(type, content, score, confidence, evidence) {
    return {
      type,
      entity_type: 'behavioral',
      entities: [type],
      score: Math.round(score * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      content,
      evidence,
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  stats_summary(values) {
    if (!values.length) return { mean: 0, stdDev: 0 };
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
    return { mean, stdDev: Math.sqrt(variance) };
  }
}

module.exports = BehavioralPatternDiscoverer;
