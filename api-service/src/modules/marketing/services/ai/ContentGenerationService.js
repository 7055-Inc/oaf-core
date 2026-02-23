/**
 * ContentGenerationService - AI-Powered Social Media Content Generation
 * 
 * This is the orchestrator that connects:
 * - User's brand/business context (from DB)
 * - Leo AI's learned truths (from ChromaDB vector store)
 * - User's media library (marketing_assets)
 * - Past performance metrics (marketing_analytics)
 * - Claude AI (creative generation)
 * 
 * The "Leo Brain" enrichment pulls:
 * - Classification 141 (user_profiles): color prefs, style prefs, medium prefs, price sweet spots
 * - Classification 142 (user_behavior): engagement patterns, peak times, viewed categories
 * - TruthStore (truth_patterns): discovered truths like "this artist uses bold blues and reds"
 * - TruthStore (truth_temporal): time-based patterns and seasonality
 * - SQL: artist persona, catalog products, pricing, top sellers, categories
 * 
 * Supports:
 * 1. Campaign generation — AI builds a full campaign from a brief
 * 2. Single post caption — AI writes caption + hashtags for user's media
 * 3. Post revision — User sends feedback, AI revises
 * 4. Post reimagination — Generate a completely fresh take
 * 5. Posting time suggestions — AI recommends optimal times
 */

const db = require('../../../../../config/db');
const { getClaudeService } = require('./ClaudeService');
const { getMediaMatcherService } = require('./MediaMatcherService');
const { getMediaComposerService } = require('./MediaComposerService');

// Leo AI integrations
const { getVectorDB } = require('../../../leo/services/vectorDB');
const { getUserPreferences } = require('../../../leo/services/utils/userPreferences');
const { getTruthStore } = require('../../../leo/services/truths/TruthStore');

// Singleton
let instance = null;

class ContentGenerationService {
  constructor() {
    this.claude = getClaudeService();
    this._vectorDB = null;
    this._truthStore = null;
  }

  /**
   * Check if AI generation is available
   */
  isAvailable() {
    return this.claude.isAvailable();
  }

  /**
   * Lazily initialize the Leo vector database connection
   * (doesn't crash if ChromaDB is down — just returns null)
   */
  async _getVectorDB() {
    if (this._vectorDB) return this._vectorDB;
    try {
      const vdb = getVectorDB();
      if (!vdb.isInitialized) await vdb.initialize();
      this._vectorDB = vdb;
      return vdb;
    } catch (err) {
      console.warn('[ContentGeneration] ChromaDB unavailable, skipping vector context:', err.message);
      return null;
    }
  }

  /**
   * Lazily initialize the Leo truth store connection
   */
  async _getTruthStore() {
    if (this._truthStore) return this._truthStore;
    try {
      const ts = getTruthStore();
      if (!ts.isInitialized) await ts.initialize();
      this._truthStore = ts;
      return ts;
    } catch (err) {
      console.warn('[ContentGeneration] TruthStore unavailable, skipping truth context:', err.message);
      return null;
    }
  }

  // ===========================================================================
  // CONTEXT GATHERING
  // ===========================================================================

  /**
   * Build the FULL brand context for a user by merging:
   *   1. SQL profile + persona + catalog data
   *   2. Leo vector preferences (classification 141 — colors, styles, mediums)
   *   3. Leo behavioral data (classification 142 — engagement, peak times)
   *   4. Leo truth store (discovered patterns & temporal truths)
   *
   * @param {number} userId
   * @returns {Promise<Object>} Rich brand context object for Claude
   */
  async getBrandContext(userId) {
    // Run all context gathering in parallel — each one is fault-tolerant
    const [sqlContext, leoPrefs, leoBehavior, leoTruths, catalogInsights] = await Promise.all([
      this._getSqlProfileContext(userId),
      this._getLeoPreferences(userId),
      this._getLeoBehavior(userId),
      this._getLeoTruths(userId),
      this._getCatalogInsights(userId),
    ]);

    // Fetch brand voice config from the user record
    let brandVoice = null;
    try {
      const [voiceRows] = await db.query('SELECT brand_voice FROM users WHERE id = ?', [userId]);
      if (voiceRows[0]?.brand_voice) {
        brandVoice = typeof voiceRows[0].brand_voice === 'string'
          ? JSON.parse(voiceRows[0].brand_voice)
          : voiceRows[0].brand_voice;
      }
    } catch (e) {
      console.warn('[ContentGeneration] Could not fetch brand_voice:', e.message);
    }

    // Merge everything into a rich context object
    return {
      // --- Identity ---
      name: sqlContext.name,
      tagline: sqlContext.tagline,
      bio: sqlContext.bio,
      specialty: sqlContext.specialty,
      style: leoPrefs?.dominantStyle || sqlContext.style || 'creative',

      // --- Audience ---
      audience: brandVoice?.target_audience || 'Art enthusiasts, collectors, and supporters of independent creators',
      industry: sqlContext.industry,

      // --- Visual Identity (from Leo's learned truths) ---
      colorPalette: leoPrefs?.colorPalette || [],
      dominantColors: leoPrefs?.dominantColors || 'Not yet analyzed',
      styleTendencies: leoPrefs?.styleTendencies || [],
      mediumPreferences: leoPrefs?.mediumPreferences || [],

      // --- Catalog Intelligence ---
      topProducts: catalogInsights.topProducts,
      priceRange: catalogInsights.priceRange,
      productCategories: catalogInsights.categories,
      catalogSize: catalogInsights.totalProducts,
      catalogHighlights: catalogInsights.highlights,

      // --- Engagement Intelligence (from Leo behavior tracking) ---
      engagementScore: leoBehavior?.engagementScore || null,
      peakActivityHour: leoBehavior?.peakActivityHour || null,
      peakActivityDay: leoBehavior?.peakActivityDay || null,
      topViewedCategories: leoBehavior?.topViewedCategories || [],

      // --- Discovered Truths (Leo's pattern recognition) ---
      brandTruths: leoTruths.brandTruths,
      temporalPatterns: leoTruths.temporalPatterns,
      truthConfidence: leoTruths.avgConfidence,

      // --- Social Presence ---
      socialLinks: sqlContext.socialLinks,

      // --- Brand Voice (user-configured) ---
      brandVoice: brandVoice || null,

      // --- Meta ---
      dataRichness: this._calculateDataRichness(sqlContext, leoPrefs, leoBehavior, leoTruths, catalogInsights),
    };
  }

  /**
   * SQL Layer — User profile, artist persona, social links
   */
  async _getSqlProfileContext(userId) {
    try {
      // Get user profile
      const [users] = await db.query(
        `SELECT u.username, u.user_type
         FROM users u WHERE u.id = ?`,
        [userId]
      );
      const user = users[0];
      if (!user) return { name: 'Unknown Artist', style: 'creative', industry: 'Art', bio: '', tagline: '', specialty: '', socialLinks: {} };

      // Get artist persona (correct table name: artist_personas)
      let persona = null;
      try {
        const [personas] = await db.query(
          `SELECT persona_name, display_name, bio, specialty, portfolio_url,
                  instagram_handle, facebook_url
           FROM artist_personas 
           WHERE artist_id = ? AND is_active = 1 
           ORDER BY is_default DESC 
           LIMIT 1`,
          [userId]
        );
        persona = personas[0] || null;
      } catch (e) {
        // artist_personas table might not exist for all users
      }

      // Get product categories for industry context
      const [catRows] = await db.query(
        `SELECT DISTINCT c.name as category_name 
         FROM products p 
         JOIN categories c ON p.category_id = c.id 
         WHERE p.vendor_id = ? AND p.status = 'active' 
         LIMIT 10`,
        [userId]
      );

      // Try to load social links from social_connections table
      const socialLinks = {};
      try {
        const [socialRows] = await db.query(
          `SELECT platform, account_name FROM social_connections WHERE user_id = ? AND status = 'active'`,
          [userId]
        );
        for (const s of socialRows) {
          socialLinks[s.platform] = s.account_name || s.platform;
        }
      } catch (e) { /* social_connections may not exist */ }

      return {
        name: persona?.display_name || persona?.persona_name || user.username,
        style: 'creative',
        industry: catRows.length > 0 ? catRows.map(r => r.category_name).join(', ') : 'Art & Handmade Goods',
        bio: persona?.bio || user.bio || '',
        tagline: '',
        specialty: persona?.specialty || '',
        socialLinks,
      };
    } catch (error) {
      console.error('[ContentGeneration] Error in SQL profile context:', error.message);
      return { name: 'Artist', style: 'creative', industry: 'Art', bio: '', tagline: '', specialty: '', socialLinks: {} };
    }
  }

  /**
   * Leo Vector Layer — Classification 141 (User Preferences)
   * Returns color palettes, style tendencies, medium preferences, price sweet spots
   */
  async _getLeoPreferences(userId) {
    try {
      const vdb = await this._getVectorDB();
      if (!vdb) return null;

      const prefs = await getUserPreferences(userId, vdb);
      if (!prefs || prefs.data_source === 'global_trends') return null;

      // Extract top color preferences (sorted by strength)
      const colorPalette = Object.entries(prefs.color_preferences || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([color, strength]) => ({ color, strength: Math.round(strength * 100) }));

      const dominantColors = colorPalette.slice(0, 3).map(c => c.color).join(', ') || 'varied';

      // Extract style tendencies
      const styleTendencies = Object.entries(prefs.style_preferences || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([style, strength]) => ({ style, strength: Math.round(strength * 100) }));

      const dominantStyle = styleTendencies.length > 0 ? styleTendencies[0].style : null;

      // Extract medium preferences
      const mediumPreferences = Object.entries(prefs.medium_preferences || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([medium, strength]) => ({ medium, strength: Math.round(strength * 100) }));

      return {
        colorPalette,
        dominantColors,
        styleTendencies,
        dominantStyle,
        mediumPreferences,
        priceSweetSpot: prefs.price_sweet_spot,
        priceMax: prefs.price_max,
        confidence: prefs.confidence,
        dataPoints: prefs.data_points,
      };
    } catch (error) {
      console.warn('[ContentGeneration] Error fetching Leo preferences:', error.message);
      return null;
    }
  }

  /**
   * Leo Vector Layer — Classification 142 (User Behavior)
   * Returns engagement score, peak times, viewed categories
   */
  async _getLeoBehavior(userId) {
    try {
      const vdb = await this._getVectorDB();
      if (!vdb) return null;

      const behaviorCollection = vdb.collections.get('user_behavior');
      if (!behaviorCollection) return null;

      const result = await behaviorCollection.get({
        ids: [`behavior_${userId}`],
        include: ['metadatas', 'documents']
      });

      if (!result || !result.ids || result.ids.length === 0) return null;

      const meta = result.metadatas[0];

      let topViewedCategories = [];
      try {
        topViewedCategories = JSON.parse(meta.viewed_categories || '[]').slice(0, 5);
      } catch (e) { /* ignore parse errors */ }

      return {
        engagementScore: meta.engagement_score || null,
        purchaseIntent: meta.purchase_intent || null,
        peakActivityHour: meta.peak_activity_hour || null,
        peakActivityDay: meta.peak_activity_day || null,
        topViewedCategories,
        frustrationRate: meta.frustration_rate || null,
      };
    } catch (error) {
      console.warn('[ContentGeneration] Error fetching Leo behavior:', error.message);
      return null;
    }
  }

  /**
   * Leo Truth Store — Discovered patterns and temporal truths
   * These are the generalizations: "this artist uses a lot of blue and red",
   * "their work tends toward geometric abstraction", "sales spike in December"
   */
  async _getLeoTruths(userId) {
    const result = { brandTruths: [], temporalPatterns: [], avgConfidence: 0 };

    try {
      const ts = await this._getTruthStore();
      if (!ts) return result;

      const userIdStr = String(userId);

      // 1. Get behavioral/preference patterns about this user
      let patterns = [];
      try {
        patterns = await ts.queryTruths('truth_patterns', {
          query: `user ${userIdStr} artist brand style preferences`,
          limit: 15,
        });
      } catch (e) {
        // Fallback: try filter-based query
        try {
          patterns = await ts.queryTruths('truth_patterns', {
            filter: { is_active: true },
            limit: 50,
          });
          // Manually filter for this user
          patterns = patterns.filter(t => 
            t.metadata?.entities?.includes(userIdStr)
          );
        } catch (e2) { /* skip */ }
      }

      // Extract the human-readable truth descriptions
      result.brandTruths = patterns
        .filter(t => t.metadata?.confidence > 0.3)
        .slice(0, 10)
        .map(t => ({
          insight: t.content,
          type: t.metadata?.truth_type || 'pattern',
          confidence: t.metadata?.confidence || 0.5,
          score: t.metadata?.score || 0,
        }));

      // 2. Get temporal patterns (seasonality, time-based trends)
      let temporal = [];
      try {
        temporal = await ts.queryTruths('truth_temporal', {
          query: `user ${userIdStr} timing seasonal trends`,
          limit: 10,
        });
      } catch (e) {
        try {
          temporal = await ts.queryTruths('truth_temporal', {
            filter: { is_active: true },
            limit: 30,
          });
          temporal = temporal.filter(t =>
            t.metadata?.entities?.includes(userIdStr)
          );
        } catch (e2) { /* skip */ }
      }

      result.temporalPatterns = temporal
        .filter(t => t.metadata?.confidence > 0.3)
        .slice(0, 5)
        .map(t => ({
          insight: t.content,
          confidence: t.metadata?.confidence || 0.5,
        }));

      // Calculate average confidence
      const allTruths = [...result.brandTruths, ...result.temporalPatterns];
      if (allTruths.length > 0) {
        result.avgConfidence = allTruths.reduce((sum, t) => sum + (t.confidence || 0), 0) / allTruths.length;
      }

      return result;
    } catch (error) {
      console.warn('[ContentGeneration] Error fetching Leo truths:', error.message);
      return result;
    }
  }

  /**
   * SQL Layer — Product catalog intelligence
   * Top sellers, price range, product descriptions, materials
   */
  async _getCatalogInsights(userId) {
    const fallback = { topProducts: [], priceRange: {}, categories: [], totalProducts: 0, highlights: '' };

    try {
      // Get product summary with categories
      const [products] = await db.query(
        `SELECT p.name, p.price, p.short_description, p.description,
                c.name as category_name, p.product_type,
                p.width, p.height, p.dimension_unit
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.vendor_id = ? AND p.status = 'active' AND p.product_type != 'variant'
         ORDER BY p.created_at DESC
         LIMIT 30`,
        [userId]
      );

      if (products.length === 0) return fallback;

      // Price analysis
      const prices = products.map(p => parseFloat(p.price)).filter(p => p > 0);
      const priceRange = prices.length > 0 ? {
        min: Math.min(...prices),
        max: Math.max(...prices),
        avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        median: prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)],
      } : {};

      // Category breakdown
      const catCounts = {};
      products.forEach(p => {
        if (p.category_name) {
          catCounts[p.category_name] = (catCounts[p.category_name] || 0) + 1;
        }
      });
      const categories = Object.entries(catCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));

      // Top products (most recent, as a proxy for featured)
      const topProducts = products.slice(0, 8).map(p => {
        const desc = p.short_description || p.description || '';
        // Trim to first 120 chars to keep context reasonable
        const trimmedDesc = desc.length > 120 ? desc.substring(0, 120) + '...' : desc;
        const dims = (p.width && p.height) ? `${p.width}x${p.height}${p.dimension_unit || ''}` : null;
        return {
          name: p.name,
          price: parseFloat(p.price),
          category: p.category_name,
          description: trimmedDesc,
          dimensions: dims,
        };
      });

      // Build a highlight summary string for Claude
      const highlightParts = [];
      highlightParts.push(`${products.length} active products`);
      if (categories.length > 0) {
        highlightParts.push(`Categories: ${categories.slice(0, 4).map(c => c.name).join(', ')}`);
      }
      if (priceRange.min !== undefined) {
        highlightParts.push(`Price range: $${priceRange.min} - $${priceRange.max} (avg $${priceRange.avg})`);
      }

      return {
        topProducts,
        priceRange,
        categories,
        totalProducts: products.length,
        highlights: highlightParts.join('. '),
      };
    } catch (error) {
      console.warn('[ContentGeneration] Error fetching catalog insights:', error.message);
      return fallback;
    }
  }

  /**
   * Calculate a data richness score (0-100) so Claude knows how much to rely on vs. infer
   */
  _calculateDataRichness(sqlCtx, leoPrefs, leoBehavior, leoTruths, catalog) {
    let score = 0;

    // SQL profile (0-20)
    if (sqlCtx.name && sqlCtx.name !== 'Unknown Artist') score += 5;
    if (sqlCtx.bio) score += 5;
    if (sqlCtx.specialty) score += 5;
    if (Object.keys(sqlCtx.socialLinks || {}).length > 0) score += 5;

    // Leo preferences (0-25)
    if (leoPrefs) {
      score += 5;
      if (leoPrefs.colorPalette?.length > 0) score += 8;
      if (leoPrefs.styleTendencies?.length > 0) score += 7;
      if (leoPrefs.mediumPreferences?.length > 0) score += 5;
    }

    // Leo behavior (0-15)
    if (leoBehavior) {
      score += 5;
      if (leoBehavior.peakActivityHour) score += 5;
      if (leoBehavior.engagementScore) score += 5;
    }

    // Leo truths (0-20)
    if (leoTruths.brandTruths?.length > 0) score += Math.min(15, leoTruths.brandTruths.length * 3);
    if (leoTruths.temporalPatterns?.length > 0) score += 5;

    // Catalog (0-20)
    if (catalog.totalProducts > 0) score += 5;
    if (catalog.totalProducts > 5) score += 5;
    if (catalog.topProducts?.some(p => p.description)) score += 5;
    if (catalog.categories?.length > 1) score += 5;

    return Math.min(100, score);
  }

  /**
   * Get descriptions of user's available media assets
   * @param {string} ownerType - 'admin' or 'user'
   * @param {number} ownerId
   * @param {number} [limit=20]
   * @returns {Promise<string[]>} Array of media descriptions
   */
  async getMediaDescriptions(ownerType, ownerId, limit = 20) {
    try {
      const [assets] = await db.query(
        `SELECT type, file_path, metadata, tags 
         FROM marketing_assets 
         WHERE owner_type = ? AND owner_id = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [ownerType, ownerId, limit]
      );

      return assets.map(asset => {
        const meta = typeof asset.metadata === 'string' ? JSON.parse(asset.metadata || '{}') : (asset.metadata || {});
        const parts = [];
        parts.push(`[${asset.type}]`);
        if (meta.originalName) parts.push(meta.originalName);
        if (meta.width && meta.height) parts.push(`${meta.width}x${meta.height}`);
        if (meta.duration) parts.push(`${Math.round(meta.duration)}s`);
        if (asset.tags) parts.push(`tags: ${asset.tags}`);
        return parts.join(' - ');
      });
    } catch (error) {
      console.error('[ContentGeneration] Error fetching media descriptions:', error);
      return [];
    }
  }

  /**
   * Build a rich media library summary for Claude by pre-scanning the user's
   * processed images with their AI analysis from the media backend.
   * Returns structured descriptions Claude can reference when writing posts.
   *
   * @param {number} userId
   * @param {number} [limit=15] - Max media items to describe
   * @returns {Promise<string[]>} Array of rich media descriptions
   */
  async getMediaLibrarySummary(userId, limit = 15) {
    const MEDIA_BACKEND_URL = process.env.MEDIA_BACKEND_URL || 'http://10.128.0.29:3001';
    const MEDIA_API_KEY = process.env.MEDIA_API_KEY || '';
    const axios = require('axios');

    try {
      // Get the user's processed images from pending_images
      const [images] = await db.query(
        `SELECT id, permanent_url, original_name, mime_type
         FROM pending_images
         WHERE user_id = ?
           AND status IN ('processed', 'complete')
           AND permanent_url IS NOT NULL
         ORDER BY created_at DESC
         LIMIT ?`,
        [userId, Math.min(limit * 2, 40)]
      );

      if (images.length === 0) return [];

      // Fetch AI analysis for each (with concurrency limit)
      const descriptions = [];
      const CONCURRENCY = 5;
      const headers = {};
      if (MEDIA_API_KEY) headers.Authorization = MEDIA_API_KEY;

      for (let i = 0; i < images.length && descriptions.length < limit; i += CONCURRENCY) {
        const batch = images.slice(i, i + CONCURRENCY);
        const analyses = await Promise.all(
          batch.map(async (img) => {
            try {
              const res = await axios.get(`${MEDIA_BACKEND_URL}/api/media/analysis/${img.permanent_url}`, {
                headers, timeout: 5000, validateStatus: s => s < 500,
              });
              return res.status === 200 && res.data?.success ? res.data.analysis : null;
            } catch { return null; }
          })
        );

        for (let j = 0; j < batch.length && descriptions.length < limit; j++) {
          const img = batch[j];
          const analysis = analyses[j];
          if (!analysis) continue;

          // Build a rich description Claude can use
          const parts = [`[Image #${img.permanent_url}]`];
          if (img.original_name) parts.push(`"${img.original_name}"`);
          if (analysis.style) parts.push(`Style: ${analysis.style}`);
          if (analysis.medium) parts.push(`Medium: ${analysis.medium}`);
          if (analysis.subject_matter) parts.push(`Subject: ${analysis.subject_matter}`);
          if (analysis.mood_keywords?.length > 0) parts.push(`Mood: ${analysis.mood_keywords.slice(0, 3).join(', ')}`);
          if (analysis.dominant_colors?.length > 0) {
            const colors = analysis.dominant_colors.slice(0, 3).map(c => {
              // Convert RGB to approximate color name
              const r = c.red, g = c.green, b = c.blue;
              if (r > 200 && g < 80 && b < 80) return 'red';
              if (r < 100 && g > 130 && b < 120) return 'green';
              if (r < 80 && g < 120 && b > 150) return 'blue';
              if (r > 200 && g > 200 && b < 80) return 'yellow';
              if (r > 200 && g > 100 && b < 60) return 'orange';
              if (r > 200 && g > 200 && b > 200) return 'white/light';
              if (r < 50 && g < 50 && b < 50) return 'black/dark';
              if (r > 150 && g > 80 && b > 50) return 'warm tones';
              return `rgb(${r},${g},${b})`;
            });
            parts.push(`Colors: ${[...new Set(colors)].join(', ')}`);
          }
          if (analysis.quality_score) parts.push(`Quality: ${analysis.quality_score}/100`);
          if (analysis.composition_notes) parts.push(`Notes: ${analysis.composition_notes.substring(0, 80)}`);
          descriptions.push(parts.join(' | '));
        }
      }

      return descriptions;
    } catch (error) {
      console.warn('[ContentGeneration] Error building media library summary:', error.message);
      return [];
    }
  }

  /**
   * Get past performance metrics for AI optimization
   * @param {string} ownerType
   * @param {number} ownerId
   * @returns {Promise<Object|null>} Aggregated metrics
   */
  async getPastMetrics(ownerType, ownerId) {
    try {
      const [metrics] = await db.query(
        `SELECT 
           mc.channel,
           mc.type,
           AVG(ma.engagements) as avg_engagements,
           AVG(ma.impressions) as avg_impressions,
           AVG(ma.clicks) as avg_clicks,
           DAYNAME(mc.published_at) as day_of_week,
           HOUR(mc.published_at) as hour_of_day,
           COUNT(*) as post_count
         FROM marketing_content mc
         JOIN marketing_analytics ma ON ma.content_id = mc.id
         JOIN marketing_campaigns camp ON mc.campaign_id = camp.id
         WHERE camp.owner_type = ? AND camp.owner_id = ?
           AND mc.status = 'published'
           AND mc.published_at IS NOT NULL
         GROUP BY mc.channel, mc.type, DAYNAME(mc.published_at), HOUR(mc.published_at)
         ORDER BY avg_engagements DESC
         LIMIT 50`,
        [ownerType, ownerId]
      );

      if (metrics.length === 0) return null;

      // Aggregate best days/times
      const dayEngagement = {};
      const hourEngagement = {};
      const typeEngagement = {};

      for (const row of metrics) {
        if (row.day_of_week) {
          dayEngagement[row.day_of_week] = (dayEngagement[row.day_of_week] || 0) + (row.avg_engagements || 0);
        }
        if (row.hour_of_day !== null) {
          hourEngagement[row.hour_of_day] = (hourEngagement[row.hour_of_day] || 0) + (row.avg_engagements || 0);
        }
        if (row.type) {
          typeEngagement[row.type] = (typeEngagement[row.type] || 0) + (row.avg_engagements || 0);
        }
      }

      const bestDays = Object.entries(dayEngagement).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
      const bestHours = Object.entries(hourEngagement).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => `${e[0]}:00`);
      const topTypes = Object.entries(typeEngagement).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);

      const totalEngagement = metrics.reduce((sum, m) => sum + (m.avg_engagements || 0), 0);
      const totalImpressions = metrics.reduce((sum, m) => sum + (m.avg_impressions || 0), 0);

      return {
        bestDays: bestDays.join(', ') || 'Unknown',
        bestTimes: bestHours.join(', ') || 'Unknown',
        topTypes: topTypes.join(', ') || 'Unknown',
        avgEngagement: totalImpressions > 0 ? `${((totalEngagement / totalImpressions) * 100).toFixed(1)}%` : 'Unknown',
        engagementByHour: hourEngagement,
      };
    } catch (error) {
      console.error('[ContentGeneration] Error fetching metrics:', error);
      return null;
    }
  }

  // ===========================================================================
  // INTERNAL SYSTEM CONTEXT (Drip Campaigns + Product Collections)
  // ===========================================================================

  /**
   * Gather existing drip campaign context so Claude can coordinate social
   * posts with active email sequences.
   *
   * @returns {Promise<Object|null>} Drip campaign summary for Claude
   */
  async _getDripContext() {
    try {
      // Active drip campaigns with their steps
      const [campaigns] = await db.query(
        `SELECT dc.id, dc.name, dc.category, dc.description, dc.conversion_goal_type,
                COUNT(ds.id) as step_count,
                MIN(ds.delay_amount) as first_delay,
                MAX(ds.step_number) as max_step
         FROM drip_campaigns dc
         LEFT JOIN drip_steps ds ON ds.campaign_id = dc.id
         WHERE dc.is_active = 1
         GROUP BY dc.id
         ORDER BY dc.priority_level DESC
         LIMIT 10`
      );

      if (campaigns.length === 0) return null;

      // Recent enrollment stats
      const [enrollStats] = await db.query(
        `SELECT dc.name,
                COUNT(de.id) as total_enrolled,
                SUM(CASE WHEN de.status = 'active' THEN 1 ELSE 0 END) as active_enrolled,
                SUM(CASE WHEN de.status = 'completed' THEN 1 ELSE 0 END) as completed
         FROM drip_campaigns dc
         LEFT JOIN drip_enrollments de ON de.campaign_id = dc.id
         WHERE dc.is_active = 1
         GROUP BY dc.id
         LIMIT 10`
      );

      const enrollMap = {};
      for (const s of enrollStats) { enrollMap[s.name] = s; }

      return {
        activeCampaigns: campaigns.map(c => ({
          name: c.name,
          category: c.category,
          description: c.description,
          goalType: c.conversion_goal_type,
          steps: c.step_count,
          enrolled: enrollMap[c.name]?.active_enrolled || 0,
          completed: enrollMap[c.name]?.completed || 0,
        })),
        totalActiveCampaigns: campaigns.length,
        summary: campaigns.map(c => `"${c.name}" (${c.category || 'general'}, ${c.step_count} steps)`).join('; '),
      };
    } catch (err) {
      console.warn('[ContentGeneration] Error fetching drip context:', err.message);
      return null;
    }
  }

  /**
   * Gather product collection/catalog context so Claude can reference
   * featured collections, showcase products, and catalog structure.
   *
   * @param {number} userId - The campaign owner's user ID
   * @returns {Promise<Object|null>} Collection summary for Claude
   */
  async _getCollectionContext(userId) {
    try {
      // Get the admin-owned collections (corporate catalog)
      // If the user is an admin, pull all top-level collections
      const [collections] = await db.query(
        `SELECT uc.id, uc.name, uc.description, uc.parent_id,
                COUNT(pc.product_id) as product_count
         FROM user_categories uc
         LEFT JOIN product_categories pc ON pc.category_id = uc.id
         WHERE uc.user_id = ?
         GROUP BY uc.id
         ORDER BY uc.display_order ASC, uc.name ASC
         LIMIT 20`,
        [userId]
      );

      if (collections.length === 0) {
        // Fall back to site-wide categories
        const [globalCats] = await db.query(
          `SELECT c.id, c.name, COUNT(p.id) as product_count
           FROM categories c
           LEFT JOIN products p ON p.category_id = c.id AND p.status = 'active'
           GROUP BY c.id
           ORDER BY product_count DESC
           LIMIT 15`
        );
        if (globalCats.length === 0) return null;

        return {
          type: 'global_categories',
          collections: globalCats.map(c => ({ name: c.name, productCount: c.product_count })),
          summary: globalCats.map(c => `${c.name} (${c.product_count} products)`).join(', '),
        };
      }

      // Get featured/top products across these collections
      const collectionIds = collections.map(c => c.id);
      let featuredProducts = [];
      if (collectionIds.length > 0) {
        const placeholders = collectionIds.map(() => '?').join(',');
        const [products] = await db.query(
          `SELECT p.id, p.name, p.price, p.description, c.name as collection_name
           FROM product_categories pc
           JOIN products p ON p.id = pc.product_id AND p.status = 'active'
           JOIN user_categories c ON c.id = pc.category_id
           WHERE pc.category_id IN (${placeholders})
           ORDER BY p.created_at DESC
           LIMIT 15`,
          collectionIds
        );
        featuredProducts = products;
      }

      return {
        type: 'user_collections',
        collections: collections.map(c => ({
          name: c.name,
          description: c.description,
          productCount: c.product_count,
          isTopLevel: !c.parent_id,
        })),
        featuredProducts: featuredProducts.map(p => ({
          name: p.name,
          price: p.price,
          description: (p.description || '').substring(0, 100),
          collection: p.collection_name,
        })),
        summary: collections.map(c => `${c.name} (${c.product_count} items)`).join(', '),
        totalCollections: collections.length,
        totalFeaturedProducts: featuredProducts.length,
      };
    } catch (err) {
      console.warn('[ContentGeneration] Error fetching collection context:', err.message);
      return null;
    }
  }

  // ===========================================================================
  // QUALITY GATE
  // ===========================================================================

  /**
   * Validate AI-generated posts and flag quality issues.
   * Checks for:
   *   - Duplicate opening phrases across posts
   *   - Banned/generic phrases
   *   - Lack of brand-specific references
   *   - Duplicate suggestedMediaDescriptions
   *
   * Fixes what it can, logs warnings for the rest.
   */
  _qualityGatePosts(posts, brandContext) {
    if (!posts || posts.length === 0) return posts;

    const BANNED_PHRASES = [
      "don't miss out", "exciting news", "link in bio", "stay tuned",
      "we're thrilled", "something special", "you won't want to miss",
      "check it out", "big announcement", "game changer", "level up",
      "drop everything", "mark your calendars", "spread the word",
      "we're excited to", "can't wait to share", "it's finally here",
      "breaking news", "hot off the press", "you heard it here first",
    ];

    const GENERIC_HASHTAGS = new Set([
      'art', 'love', 'beautiful', 'instagood', 'photooftheday', 'follow',
      'followme', 'like4like', 'likeforlike', 'instalike', 'trending',
      'viral', 'fyp', 'foryou', 'foryoupage', 'explore', 'explorepage',
    ]);

    let qualityIssues = 0;
    const openings = new Set();
    const mediaDescs = new Set();

    const validated = posts.map((post, idx) => {
      const issues = [];
      const caption = (post.caption || '').toLowerCase();

      // Check for banned phrases
      for (const phrase of BANNED_PHRASES) {
        if (caption.includes(phrase)) {
          issues.push(`contains banned phrase: "${phrase}"`);
        }
      }

      // Check for duplicate openings (first 30 chars)
      const opening = (post.caption || '').substring(0, 30).trim();
      if (opening && openings.has(opening)) {
        issues.push('duplicate opening with another post');
      }
      openings.add(opening);

      // Check for duplicate media descriptions
      const mediaDesc = (post.suggestedMediaDescription || '').toLowerCase().trim();
      if (mediaDesc && mediaDescs.has(mediaDesc)) {
        issues.push('duplicate suggestedMediaDescription');
      }
      mediaDescs.add(mediaDesc);

      // Filter out generic hashtags
      if (post.hashtags?.length > 0) {
        const original = post.hashtags.length;
        post.hashtags = post.hashtags.filter(h => !GENERIC_HASHTAGS.has(h.toLowerCase()));
        if (post.hashtags.length < original) {
          issues.push(`removed ${original - post.hashtags.length} generic hashtags`);
        }
      }

      // Check if caption references any brand-specific detail
      const brandTerms = [
        brandContext.name,
        brandContext.specialty,
        ...(brandContext.topProducts || []).map(p => p.name),
        ...(brandContext.productCategories || []).map(c => c.name),
        ...(brandContext.colorPalette || []).map(c => c.color),
      ].filter(Boolean).map(t => t.toLowerCase());

      const hasBrandReference = brandTerms.some(term => caption.includes(term));
      if (!hasBrandReference && brandTerms.length > 3) {
        issues.push('no brand-specific reference found in caption');
      }

      if (issues.length > 0) {
        qualityIssues++;
        console.warn(`[QualityGate] Post #${idx + 1} "${post.title}": ${issues.join('; ')}`);
        post._qualityIssues = issues;
      }

      return post;
    });

    if (qualityIssues > 0) {
      console.log(`[QualityGate] ${qualityIssues}/${posts.length} posts had quality issues (logged, not blocked)`);
    } else {
      console.log(`[QualityGate] All ${posts.length} posts passed quality checks`);
    }

    return validated;
  }

  // ===========================================================================
  // GENERATION METHODS
  // ===========================================================================

  /**
   * Generate a caption for a single post (Build-a-Post flow)
   * 
   * @param {Object} params
   * @param {number} params.userId - User ID
   * @param {string} params.platform - Target platform
   * @param {string} [params.mediaDescription] - Description of media being posted
   * @param {string} [params.tone] - Desired tone
   * @param {string} [params.goal] - Post goal
   * @param {string} [params.additionalNotes] - Extra instructions
   * @returns {Promise<Object>} { caption, hashtags, callToAction }
   */
  async generateCaption(params) {
    const { userId, platform, mediaDescription, tone, goal, additionalNotes } = params;
    const brandContext = await this.getBrandContext(userId);

    return this.claude.generateCaption({
      platform,
      mediaDescription: mediaDescription || 'User-provided media content',
      brandContext,
      tone,
      goal,
      additionalNotes,
    });
  }

  /**
   * Generate a full campaign with AI-created posts
   * 
   * @param {Object} params
   * @param {number} params.userId - User ID
   * @param {string} params.ownerType - 'admin' or 'user'
   * @param {string} params.campaignName - Campaign name
   * @param {string} params.campaignGoal - Campaign objective
   * @param {string[]} params.platforms - Target platforms
   * @param {string} params.startDate - Start date (YYYY-MM-DD)
   * @param {string} params.endDate - End date (YYYY-MM-DD)
   * @param {number} [params.postCount] - Number of posts to generate
   * @returns {Promise<Object>} { posts: [...], brandContext, hasMetrics }
   */
  async generateCampaignContent(params) {
    const { userId, ownerType, campaignName, campaignGoal, platforms, startDate, endDate, postCount, crmEmailEnabled, dripEnabled, collectionEnabled } = params;

    // =========================================================================
    // PHASE 1: Gather context + generate text (Claude + Leo)
    // =========================================================================
    const contextPromises = [
      this.getBrandContext(userId),
      this.getMediaDescriptions(ownerType, userId),
      this.getPastMetrics(ownerType, userId),
    ];

    // If drip campaigns are enabled, gather existing drip campaign context
    if (dripEnabled) contextPromises.push(this._getDripContext());
    else contextPromises.push(Promise.resolve(null));

    // If product collections are enabled, gather collection/catalog context
    if (collectionEnabled) contextPromises.push(this._getCollectionContext(userId));
    else contextPromises.push(Promise.resolve(null));

    // Pre-scan media library with AI analysis so Claude knows what images actually exist
    contextPromises.push(this.getMediaLibrarySummary(userId, 15));

    const [brandContext, mediaDescriptions, pastMetrics, dripContext, collectionContext, mediaLibrarySummary] = await Promise.all(contextPromises);

    console.log(`[ContentGeneration] Campaign "${campaignName}" for user ${userId} — Data richness: ${brandContext.dataRichness}/100, Leo truths: ${brandContext.brandTruths?.length || 0}, Products: ${brandContext.catalogSize || 0}, Drip: ${dripEnabled ? 'ON' : 'off'}, Collections: ${collectionEnabled ? 'ON' : 'off'}`);

    // Merge marketing_assets descriptions with the richer AI-analyzed library summary
    const allMediaDescriptions = [
      ...(mediaLibrarySummary || []),
      ...mediaDescriptions.filter(d => !mediaLibrarySummary?.length), // fallback if library scan returned nothing
    ];

    // Claude generates the post concepts (text + visual direction)
    const rawPosts = await this.claude.generateCampaignPosts({
      campaignName,
      campaignGoal,
      platforms,
      startDate,
      endDate,
      brandContext,
      availableMediaDescriptions: allMediaDescriptions,
      pastMetrics,
      postCount: postCount || Math.max(5, Math.min(20, platforms.length * 3)),
      crmEmailEnabled: !!crmEmailEnabled,
      dripEnabled: !!dripEnabled,
      dripContext,
      collectionEnabled: !!collectionEnabled,
      collectionContext,
    });

    // =========================================================================
    // PHASE 1b: Quality gate — validate and fix generic posts
    // =========================================================================
    const validatedPosts = this._qualityGatePosts(rawPosts, brandContext);

    // =========================================================================
    // PHASE 2: Leo matches media for each post (semantic search)
    // =========================================================================
    console.log(`[ContentGeneration] Phase 2: Matching media for ${validatedPosts.length} posts...`);
    const matcher = getMediaMatcherService();
    const postsWithMedia = await matcher.matchCampaignMedia({
      userId,
      ownerType,
      posts: validatedPosts,
    });

    // =========================================================================
    // PHASE 3: Compose platform-ready media (resize, overlays, clips)
    // =========================================================================
    console.log(`[ContentGeneration] Phase 3: Composing platform-ready media...`);
    const composer = getMediaComposerService();
    const fullyComposedPosts = await composer.composeCampaign(postsWithMedia, userId, ownerType);

    // =========================================================================
    // Return the complete package
    // =========================================================================
    const matchedCount = fullyComposedPosts.filter(p => p.matchedMedia).length;
    const queuedCount = fullyComposedPosts.filter(p => p.composition?.status === 'queued').length;

    console.log(`[ContentGeneration] Campaign complete: ${fullyComposedPosts.length} posts, ${matchedCount} with matched media, ${queuedCount} media jobs queued`);

    return {
      posts: fullyComposedPosts,
      brandContext,
      hasMetrics: !!pastMetrics,
      mediaAssetsAvailable: mediaDescriptions.length,
      dataRichness: brandContext.dataRichness,
      mediaMatchStats: {
        totalPosts: fullyComposedPosts.length,
        matchedWithMedia: matchedCount,
        mediaJobsQueued: queuedCount,
        unmatchedPosts: fullyComposedPosts.length - matchedCount,
      },
    };
  }

  /**
   * Revise a post based on user feedback
   * 
   * @param {Object} params
   * @param {number} params.userId - User ID
   * @param {Object} params.originalPost - Original post content
   * @param {string} params.feedback - User's revision instructions
   * @param {string} params.platform - Target platform
   * @returns {Promise<Object>} Revised { caption, hashtags, callToAction }
   */
  async revisePost(params) {
    const { userId, originalPost, feedback, platform } = params;
    const brandContext = await this.getBrandContext(userId);

    return this.claude.revisePost({
      originalPost,
      feedback,
      platform,
      brandContext,
    });
  }

  /**
   * Reimagine a post — completely fresh approach
   * 
   * @param {Object} params
   * @param {number} params.userId
   * @param {Object} params.originalPost
   * @param {string} params.platform
   * @param {string} [params.mediaDescription]
   * @returns {Promise<Object>} New { caption, hashtags, callToAction }
   */
  async reimaginePost(params) {
    const { userId, originalPost, platform, mediaDescription } = params;
    const brandContext = await this.getBrandContext(userId);

    return this.claude.reimaginePost({
      originalPost,
      platform,
      brandContext,
      mediaDescription,
    });
  }

  /**
   * Suggest optimal posting time
   * 
   * @param {Object} params
   * @param {number} params.userId
   * @param {string} params.ownerType
   * @param {string} params.platform
   * @param {string} [params.contentType]
   * @param {string} [params.timezone]
   * @returns {Promise<Object>} { suggestedTime, suggestedDay, rationale }
   */
  async suggestPostingTime(params) {
    const { userId, ownerType, platform, contentType, timezone } = params;

    // Gather SQL metrics and Leo behavior in parallel
    const [pastMetrics, leoBehavior] = await Promise.all([
      this.getPastMetrics(ownerType, userId),
      this._getLeoBehavior(userId),
    ]);

    // Merge Leo behavior data into metrics for smarter time suggestions
    const enrichedMetrics = pastMetrics || {};
    if (leoBehavior) {
      if (leoBehavior.peakActivityHour && !enrichedMetrics.bestTimes) {
        enrichedMetrics.bestTimes = `${leoBehavior.peakActivityHour}:00 (from Leo behavior analysis)`;
      }
      if (leoBehavior.peakActivityDay && !enrichedMetrics.bestDays) {
        enrichedMetrics.bestDays = `${leoBehavior.peakActivityDay} (from Leo behavior analysis)`;
      }
    }

    return this.claude.suggestPostingTime({
      platform,
      pastMetrics: Object.keys(enrichedMetrics).length > 0 ? enrichedMetrics : null,
      contentType,
      timezone,
    });
  }
}

/**
 * Get the singleton ContentGenerationService instance
 */
function getContentGenerationService() {
  if (!instance) {
    instance = new ContentGenerationService();
  }
  return instance;
}

module.exports = { ContentGenerationService, getContentGenerationService };
