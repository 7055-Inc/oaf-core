/**
 * MediaMatcherService - Media Backend-Powered Image Intelligence
 *
 * When Claude generates post concepts (text + visual direction), this service
 * queries the media processing VM's AI analysis to find the best matching
 * images from the user's entire library.
 *
 * The media backend has already analyzed every image with:
 *   - Google Vision API (dominant colors, objects, text)
 *   - GPT-4 Vision (style, medium, subject, mood, quality)
 *   - Vector embeddings (searchable visual characteristics)
 *
 * This service:
 *   1. Fetches the user's complete images from pending_images (with media IDs)
 *   2. Pulls rich AI analysis from the media backend for each
 *   3. Scores every image against Claude's post descriptions using:
 *        - Keyword matching (style, medium, subject, detected text)
 *        - Color similarity (dominant colors vs. described colors)
 *        - Mood alignment (mood keywords vs. post tone)
 *        - Quality weighting (higher quality = higher score)
 *   4. Returns ranked candidates per post
 *
 * The MediaComposerService then takes the top match and produces
 * platform-ready media (resize, CTA overlays, etc.).
 */

const db = require('../../../../../config/db');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const MEDIA_BACKEND_URL = process.env.MEDIA_BACKEND_URL || 'http://10.128.0.29:3001';
const MEDIA_API_KEY = process.env.MEDIA_API_KEY || '';
const SMART_MEDIA_BASE = process.env.SMART_MEDIA_BASE_URL || (process.env.API_BASE_URL ? `${process.env.API_BASE_URL}/api/v2/media/images` : '');

let instance = null;

// Cache analysis results in memory for the lifetime of this process
const analysisCache = new Map();

// Common color names → approximate RGB ranges for matching
const COLOR_NAMES = {
  red:     { r: [180,255], g: [0,80],   b: [0,80]   },
  green:   { r: [0,100],   g: [130,255], b: [0,120]  },
  blue:    { r: [0,80],    g: [0,120],  b: [150,255] },
  yellow:  { r: [200,255], g: [200,255], b: [0,80]   },
  orange:  { r: [200,255], g: [100,180], b: [0,60]   },
  purple:  { r: [100,180], g: [0,80],   b: [150,255] },
  pink:    { r: [200,255], g: [100,180], b: [150,220] },
  brown:   { r: [100,180], g: [50,120], b: [20,80]   },
  black:   { r: [0,40],    g: [0,40],   b: [0,40]    },
  white:   { r: [220,255], g: [220,255], b: [220,255] },
  gold:    { r: [200,255], g: [170,220], b: [0,80]   },
  silver:  { r: [180,220], g: [180,220], b: [180,220] },
  teal:    { r: [0,80],    g: [128,200], b: [128,200] },
  coral:   { r: [220,255], g: [100,140], b: [80,120]  },
  navy:    { r: [0,40],    g: [0,60],   b: [80,150]  },
  cream:   { r: [230,255], g: [220,250], b: [190,230] },
  earth:   { r: [120,190], g: [80,150], b: [40,100]  },
  warm:    { r: [180,255], g: [80,180], b: [0,100]   },
  cool:    { r: [0,120],   g: [100,200], b: [150,255] },
  vibrant: { r: [200,255], g: [50,200], b: [0,200]   },
  pastel:  { r: [180,240], g: [180,240], b: [180,240] },
};

class MediaMatcherService {
  constructor() {
    this._userMediaCache = new Map(); // userId → { timestamp, media[] }
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  /**
   * Find the best matching media for a single post concept.
   * @param {Object} params
   * @param {Set} [params.usedMediaIds] - Media IDs already assigned in this campaign (diversity penalty)
   */
  async findBestMatch(params) {
    const { userId, ownerType, mediaDescription, visualDirection, platform, postType, usedMediaIds } = params;

    // Run all search strategies in parallel
    const [backendMatches, libraryMatches] = await Promise.all([
      this._searchMediaBackend(userId, mediaDescription, visualDirection),
      this._searchMarketingLibrary(ownerType, userId, mediaDescription, visualDirection),
    ]);

    // Combine and label sources
    let candidates = [
      ...backendMatches.map(m => ({ ...m, source: 'media_backend' })),
      ...libraryMatches.map(m => ({ ...m, source: 'library' })),
    ];

    // Apply platform preference scoring
    candidates = candidates.map(c => ({
      ...c,
      score: this._applyPlatformBoost(c, platform, postType),
    }));

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Deduplicate by file path / media ID
    const seen = new Set();
    candidates = candidates.filter(c => {
      const key = c.mediaId || c.filePath || c.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Semantic reranking via Claude Haiku — take top 8 candidates and let Claude
    // judge relevance semantically (catches synonym/concept matches that keywords miss)
    if (candidates.length > 1 && mediaDescription) {
      const top8 = candidates.slice(0, 8);
      const reranked = await this._claudeRerankCandidates(top8, mediaDescription, visualDirection);
      candidates = [...reranked, ...candidates.slice(8)];
    }

    // Apply diversity penalty — heavily penalize images already used in this campaign
    if (usedMediaIds && usedMediaIds.size > 0) {
      candidates = candidates.map(c => {
        const key = c.mediaId || c.filePath || String(c.id);
        if (usedMediaIds.has(key)) {
          return { ...c, score: c.score * 0.1, _diversityPenalized: true };
        }
        return c;
      });
      // Re-sort after penalty
      candidates.sort((a, b) => b.score - a.score);
    }

    // Take top 5
    candidates = candidates.slice(0, 5);

    return {
      candidates,
      bestMatch: candidates.length > 0 ? candidates[0] : null,
      searchQuery: { mediaDescription, visualDirection },
      totalFound: backendMatches.length + libraryMatches.length,
    };
  }

  /**
   * Find best matches for an entire campaign (batch).
   * Tracks used media across posts to ensure diversity — each post gets a unique image.
   */
  async matchCampaignMedia(params) {
    const { userId, ownerType, posts } = params;

    // Pre-fetch and cache all user media + analysis in one go
    console.log(`[MediaMatcher] Pre-loading media for user ${userId}...`);
    await this._preloadUserMedia(userId);

    // Track which media IDs have been assigned to enforce diversity
    const usedMediaIds = new Set();
    const results = [];

    // Process posts sequentially so each post sees the diversity set from prior posts
    for (const post of posts) {
      const match = await this.findBestMatch({
        userId,
        ownerType,
        mediaDescription: post.suggestedMediaDescription || post.title,
        visualDirection: post.visualDirection || '',
        platform: post.platform,
        postType: post.type,
        usedMediaIds,
      });

      // Record the chosen media so the next post avoids it
      if (match.bestMatch) {
        const key = match.bestMatch.mediaId || match.bestMatch.filePath || String(match.bestMatch.id);
        usedMediaIds.add(key);
      }

      results.push({
        ...post,
        matchedMedia: match.bestMatch,
        mediaCandidates: match.candidates,
        mediaSource: match.bestMatch?.source || 'none',
      });
    }

    const matched = results.filter(r => r.matchedMedia).length;
    const unique = usedMediaIds.size;
    console.log(`[MediaMatcher] Campaign matching complete: ${matched}/${results.length} posts matched (${unique} unique images)`);

    return results;
  }

  // ---------------------------------------------------------------------------
  // STRATEGY: Media Backend (primary — rich AI analysis)
  // ---------------------------------------------------------------------------

  /**
   * Search the user's processed images via the media backend's AI analysis.
   * Fetches analysis for each image and scores against the description.
   */
  async _searchMediaBackend(userId, mediaDescription, visualDirection) {
    try {
      const userMedia = await this._getUserMedia(userId);
      if (userMedia.length === 0) return [];

      const searchText = `${mediaDescription} ${visualDirection}`.toLowerCase();
      const searchKeywords = this._extractKeywords(searchText);
      const mentionedColors = this._extractColorMentions(searchText);

      // Score each media item against the search
      const scored = [];
      for (const item of userMedia) {
        if (!item.analysis) continue;

        const score = this._scoreMediaMatch(item.analysis, searchKeywords, mentionedColors, searchText);
        if (score > 0.05) {
          const isVideo = item.type === 'video';
          scored.push({
            id: item.pendingImageId || item.assetId,
            mediaId: item.mediaId,
            type: item.type || 'image',
            filePath: isVideo
              ? (item.filePath || item.thumbnailPath)
              : `${SMART_MEDIA_BASE}/${item.mediaId}?size=detail`,
            thumbnailPath: isVideo
              ? (item.thumbnailPath || item.filePath)
              : `${SMART_MEDIA_BASE}/${item.mediaId}?size=thumbnail`,
            originalName: item.originalName,
            metadata: {
              style: item.analysis.style,
              medium: item.analysis.medium,
              subject: item.analysis.subject_matter,
              mood: item.analysis.mood_keywords,
              quality: item.analysis.quality_score,
              dominantColors: item.analysis.dominant_colors,
              detectedText: item.analysis.detected_text,
              duration: item.analysis.duration || null,
            },
            tags: [
              item.analysis.style,
              item.analysis.medium,
              ...(item.analysis.mood_keywords || []),
              ...(item.tags ? item.tags.split(',').map(t => t.trim()) : []),
            ].filter(Boolean).join(', '),
            score,
            matchReason: this._buildMatchReason(item.analysis, searchKeywords, mentionedColors),
          });
        }
      }

      // Sort and return top 15
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, 15);
    } catch (error) {
      console.warn('[MediaMatcher] Media backend search error:', error.message);
      return [];
    }
  }

  /**
   * Multi-factor scoring of a media item against a search query.
   *
   * Factors:
   *   - Keyword match against style, medium, subject, detected_text (40%)
   *   - Color similarity (25%)
   *   - Mood alignment (20%)
   *   - Quality bonus (15%)
   */
  _scoreMediaMatch(analysis, keywords, mentionedColors, fullText) {
    let keywordScore = 0;
    let colorScore = 0;
    let moodScore = 0;
    let qualityScore = 0;

    // --- Keyword matching (style, medium, subject, detected text) ---
    const analysisText = [
      analysis.style,
      analysis.medium,
      analysis.subject_matter,
      analysis.detected_text,
      analysis.composition_notes,
    ].filter(Boolean).join(' ').toLowerCase();

    let matched = 0;
    for (const kw of keywords) {
      if (analysisText.includes(kw)) matched++;
    }
    keywordScore = keywords.length > 0 ? (matched / keywords.length) : 0;

    // --- Color matching ---
    if (mentionedColors.length > 0 && analysis.dominant_colors?.length > 0) {
      let colorMatches = 0;
      for (const colorName of mentionedColors) {
        const range = COLOR_NAMES[colorName];
        if (!range) continue;

        for (const dc of analysis.dominant_colors) {
          if (
            dc.red >= range.r[0] && dc.red <= range.r[1] &&
            dc.green >= range.g[0] && dc.green <= range.g[1] &&
            dc.blue >= range.b[0] && dc.blue <= range.b[1] &&
            dc.score > 0.01 // non-trivial presence
          ) {
            colorMatches++;
            break; // one match per color name is enough
          }
        }
      }
      colorScore = colorMatches / mentionedColors.length;
    }

    // --- Mood matching ---
    const moodKeywords = (analysis.mood_keywords || []).map(m => m.toLowerCase());
    if (moodKeywords.length > 0) {
      let moodMatches = 0;
      for (const mood of moodKeywords) {
        if (fullText.includes(mood)) moodMatches++;
      }
      // Also check keyword overlap with mood
      for (const kw of keywords) {
        if (moodKeywords.some(m => m.includes(kw) || kw.includes(m))) moodMatches++;
      }
      moodScore = Math.min(1, moodMatches / Math.max(1, moodKeywords.length));
    }

    // --- Quality bonus ---
    qualityScore = Math.min(1, (analysis.quality_score || 50) / 100);

    // Weighted total
    const total =
      keywordScore * 0.40 +
      colorScore * 0.25 +
      moodScore * 0.20 +
      qualityScore * 0.15;

    return Math.min(1, total);
  }

  /**
   * Build a human-readable explanation of why a match was chosen.
   */
  _buildMatchReason(analysis, keywords, mentionedColors) {
    const reasons = [];

    // Style/medium
    if (analysis.style) reasons.push(analysis.style);
    if (analysis.medium) reasons.push(analysis.medium);

    // Colors
    if (mentionedColors.length > 0 && analysis.dominant_colors?.length > 0) {
      const topColor = analysis.dominant_colors[0];
      reasons.push(`rgb(${topColor.red},${topColor.green},${topColor.blue})`);
    }

    // Mood
    if (analysis.mood_keywords?.length > 0) {
      reasons.push(`mood: ${analysis.mood_keywords.slice(0, 2).join(', ')}`);
    }

    // Quality
    if (analysis.quality_score >= 80) reasons.push(`quality: ${analysis.quality_score}`);

    return reasons.join(' · ');
  }

  // ---------------------------------------------------------------------------
  // STRATEGY: Marketing Assets Library (secondary — user-uploaded)
  // ---------------------------------------------------------------------------

  /**
   * Search the user's marketing_assets library (SQL keyword matching).
   * Kept as a secondary strategy for any user-uploaded marketing-specific assets.
   */
  async _searchMarketingLibrary(ownerType, ownerId, mediaDescription, visualDirection) {
    try {
      const keywords = this._extractKeywords(`${mediaDescription} ${visualDirection}`);
      if (keywords.length === 0) return [];

      let query = `
        SELECT id, type, file_path, thumbnail_path, metadata, tags, created_at
        FROM marketing_assets
        WHERE owner_type = ? AND owner_id = ?
      `;
      const params = [ownerType, ownerId];

      const conditions = keywords.slice(0, 6).map(kw => {
        params.push(`%${kw}%`, `%${kw}%`);
        return `(tags LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.originalName')) LIKE ?)`;
      });

      if (conditions.length > 0) {
        query += ` AND (${conditions.join(' OR ')})`;
      }

      query += ` ORDER BY created_at DESC LIMIT 20`;

      const [rows] = await db.query(query, params);

      return rows.map(row => {
        const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata || '{}') : (row.metadata || {});
        const searchableText = `${row.tags || ''} ${meta.originalName || ''} ${meta.description || ''}`.toLowerCase();

        let score = 0.1;
        for (const kw of keywords) {
          if (searchableText.includes(kw.toLowerCase())) score += 0.15;
        }
        if (row.type === 'image') score += 0.05;
        if (row.type === 'video') score += 0.03;

        return {
          id: row.id,
          type: row.type,
          filePath: row.file_path,
          thumbnailPath: row.thumbnail_path,
          metadata: meta,
          tags: row.tags,
          score: Math.min(1, score),
          matchReason: `Library: ${keywords.filter(kw => searchableText.includes(kw.toLowerCase())).join(', ')}`,
        };
      });
    } catch (error) {
      console.warn('[MediaMatcher] Library search error:', error.message);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // MEDIA BACKEND DATA LAYER
  // ---------------------------------------------------------------------------

  /**
   * Pre-load all user media + analysis in a single pass.
   * Fetches from pending_images DB + media backend analysis API.
   * Results are cached for this process.
   */
  async _preloadUserMedia(userId) {
    const cacheKey = String(userId);
    const cached = this._userMediaCache.get(cacheKey);
    // Use cache if less than 5 minutes old
    if (cached && (Date.now() - cached.timestamp) < 5 * 60 * 1000) {
      console.log(`[MediaMatcher] Using cached media for user ${userId}: ${cached.media.length} items`);
      return;
    }

    // Fetch all completed images for this user from pending_images
    const [rows] = await db.query(
      `SELECT id, permanent_url, original_name, image_path
       FROM pending_images
       WHERE user_id = ?
         AND status IN ('processed', 'complete')
         AND permanent_url IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 200`,
      [userId]
    );

    console.log(`[MediaMatcher] Found ${rows.length} processed images, fetching analysis...`);

    // Fetch analysis for each media ID (with concurrency limit)
    const media = [];
    const CONCURRENCY = 5;

    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const batch = rows.slice(i, i + CONCURRENCY);
      const analyses = await Promise.all(
        batch.map(row => this._fetchAnalysis(row.permanent_url))
      );

      for (let j = 0; j < batch.length; j++) {
        if (analyses[j]) {
          media.push({
            pendingImageId: batch[j].id,
            mediaId: batch[j].permanent_url,
            originalName: batch[j].original_name || batch[j].image_path,
            type: 'image',
            analysis: analyses[j],
          });
        }
      }
    }

    // Also load video assets from marketing_assets
    try {
      const [videoRows] = await db.query(
        `SELECT id, type, file_path, thumbnail_path, metadata, tags
         FROM marketing_assets
         WHERE ((owner_type = 'admin' AND owner_id = ?) OR (owner_type = 'user' AND owner_id = ?))
           AND type = 'video'
         ORDER BY created_at DESC
         LIMIT 30`,
        [userId, userId]
      );

      for (const vid of videoRows) {
        const meta = typeof vid.metadata === 'string' ? JSON.parse(vid.metadata || '{}') : (vid.metadata || {});
        // Build a synthetic analysis from video metadata/tags for scoring
        media.push({
          assetId: vid.id,
          mediaId: null,
          originalName: meta.originalName || vid.file_path,
          type: vid.type || 'video',
          filePath: vid.file_path,
          thumbnailPath: vid.thumbnail_path,
          tags: vid.tags,
          analysis: {
            style: meta.style || '',
            medium: 'video',
            subject_matter: meta.description || vid.tags || '',
            mood_keywords: meta.mood ? [meta.mood] : [],
            quality_score: meta.quality_score || 60,
            dominant_colors: meta.dominant_colors || [],
            detected_text: '',
            composition_notes: meta.description || '',
            duration: meta.duration || null,
          },
        });
      }

      if (videoRows.length > 0) {
        console.log(`[MediaMatcher] Also loaded ${videoRows.length} video assets from marketing_assets`);
      }
    } catch (err) {
      console.warn('[MediaMatcher] Could not load video assets:', err.message);
    }

    console.log(`[MediaMatcher] Loaded analysis for ${media.length} total media items (images + video)`);
    this._userMediaCache.set(cacheKey, { timestamp: Date.now(), media });
  }

  /**
   * Get pre-loaded user media (calls preload if not cached).
   */
  async _getUserMedia(userId) {
    const cacheKey = String(userId);
    const cached = this._userMediaCache.get(cacheKey);
    if (!cached || (Date.now() - cached.timestamp) > 5 * 60 * 1000) {
      await this._preloadUserMedia(userId);
    }
    return this._userMediaCache.get(cacheKey)?.media || [];
  }

  /**
   * Fetch AI analysis for a single media ID from the media backend.
   * Results are cached in memory.
   */
  async _fetchAnalysis(mediaId) {
    if (!mediaId) return null;

    // Check memory cache
    if (analysisCache.has(mediaId)) {
      return analysisCache.get(mediaId);
    }

    try {
      const headers = {};
      if (MEDIA_API_KEY) headers.Authorization = MEDIA_API_KEY;

      const response = await axios.get(`${MEDIA_BACKEND_URL}/api/media/analysis/${mediaId}`, {
        headers,
        timeout: 5000,
        validateStatus: s => s < 500,
      });

      if (response.status === 200 && response.data?.success && response.data?.analysis) {
        const analysis = response.data.analysis;
        analysisCache.set(mediaId, analysis);
        return analysis;
      }
      return null;
    } catch (err) {
      // Don't spam logs for individual failures
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // CLAUDE SEMANTIC RERANKING
  // ---------------------------------------------------------------------------

  /**
   * Use Claude Haiku to semantically rerank the top media candidates.
   * This catches matches that keyword scoring misses (e.g., "flowing blues"
   * matching "acrylic painting with cool tones and organic shapes").
   *
   * @param {Array} candidates - Top candidates with analysis metadata
   * @param {string} mediaDescription - Post's suggestedMediaDescription
   * @param {string} visualDirection - Post's visualDirection
   * @returns {Promise<Array>} Reranked candidates with updated scores
   */
  async _claudeRerankCandidates(candidates, mediaDescription, visualDirection) {
    if (!candidates || candidates.length <= 1) return candidates;
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes('your-key-here')) return candidates;

    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      // Build concise descriptions of each candidate
      const candidateList = candidates.map((c, i) => {
        const meta = c.metadata || {};
        const parts = [`#${i + 1}`];
        if (meta.style) parts.push(`Style: ${meta.style}`);
        if (meta.medium) parts.push(`Medium: ${meta.medium}`);
        if (meta.subject) parts.push(`Subject: ${meta.subject}`);
        if (meta.mood?.length > 0) parts.push(`Mood: ${(Array.isArray(meta.mood) ? meta.mood : [meta.mood]).slice(0, 3).join(', ')}`);
        if (meta.dominantColors?.length > 0) {
          const colorStrs = meta.dominantColors.slice(0, 2).map(dc => `rgb(${dc.red},${dc.green},${dc.blue})`);
          parts.push(`Colors: ${colorStrs.join(', ')}`);
        }
        if (meta.quality) parts.push(`Quality: ${meta.quality}/100`);
        if (c.originalName) parts.push(`File: ${c.originalName}`);
        return parts.join(' | ');
      }).join('\n');

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        temperature: 0,
        system: 'You rank images by relevance to a description. Respond with ONLY a JSON array of numbers representing the 1-indexed candidate ranking from most to least relevant. Example: [3,1,5,2,4]',
        messages: [{
          role: 'user',
          content: `Rank these ${candidates.length} images by how well they match this post description.

POST WANTS: ${mediaDescription}
VISUAL DIRECTION: ${visualDirection}

CANDIDATE IMAGES:
${candidateList}

Return a JSON array ranking candidates from most to least relevant (by their # number).`,
        }],
      });

      const text = response.content[0]?.text?.trim();
      if (!text) return candidates;

      // Parse the ranking
      const ranking = JSON.parse(text);
      if (!Array.isArray(ranking)) return candidates;

      // Apply semantic score boost based on ranking position
      const reranked = [...candidates];
      const boostPerRank = 0.3; // Top-ranked gets up to +0.3 score boost
      for (let pos = 0; pos < ranking.length; pos++) {
        const candidateIdx = ranking[pos] - 1; // Convert 1-indexed to 0-indexed
        if (candidateIdx >= 0 && candidateIdx < reranked.length) {
          const boost = boostPerRank * (1 - pos / ranking.length);
          reranked[candidateIdx] = {
            ...reranked[candidateIdx],
            score: Math.min(1, (reranked[candidateIdx].score || 0) + boost),
            _semanticRank: pos + 1,
          };
        }
      }

      // Re-sort by updated score
      reranked.sort((a, b) => b.score - a.score);
      return reranked;
    } catch (err) {
      console.warn('[MediaMatcher] Claude reranking failed, using keyword scores:', err.message);
      return candidates;
    }
  }

  // ---------------------------------------------------------------------------
  // SCORING HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Apply platform-specific and post-type-specific scoring boosts.
   * Strongly prefers video for reels/stories and images for static posts.
   */
  _applyPlatformBoost(candidate, platform, postType) {
    let score = candidate.score || 0;
    const isVideo = candidate.type === 'video';
    const isImage = candidate.type === 'image';

    // Video-first post types: reels, stories, video posts
    if (postType === 'reel' || postType === 'story' || postType === 'video') {
      if (isVideo) {
        score += 0.30; // Strong video preference for video post types
      } else if (isImage) {
        score -= 0.05; // Slight penalty for image in video slots
      }
    }

    // Video-first platforms (TikTok is all-video)
    if (platform === 'tiktok' && isVideo) {
      score += 0.20;
    } else if (platform === 'tiktok' && isImage) {
      score -= 0.10; // TikTok really needs video
    }

    // Image-preferred: static feed posts
    if (postType === 'post' && isImage) {
      score += 0.10;
    }

    // Pinterest is image-first
    if (platform === 'pinterest' && isImage) {
      score += 0.10;
    }

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Extract meaningful keywords from a description for matching.
   * Enhanced with art vocabulary awareness and bigram support.
   */
  _extractKeywords(text) {
    if (!text) return [];
    const stopWords = new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
      'on', 'with', 'at', 'by', 'from', 'up', 'about', 'into', 'through',
      'during', 'before', 'after', 'above', 'below', 'between', 'under',
      'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
      'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
      'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
      'so', 'than', 'too', 'very', 'just', 'because', 'as', 'until', 'while',
      'and', 'or', 'but', 'if', 'that', 'this', 'it', 'its', 'use', 'using',
      'image', 'photo', 'video', 'media', 'content', 'post', 'show', 'showing',
      'piece', 'work', 'artwork', 'look', 'looking', 'like', 'new', 'best',
      'featuring', 'features', 'feature', 'inspired', 'inspire',
    ]);

    // Art/style vocabulary that should be preserved even if short
    const artTerms = new Set([
      'oil', 'ink', 'pen', 'dye', 'wax', 'clay', 'gem', 'raw', 'pop', 'art',
      'hue', 'mix', 'dot', 'arc', 'zen', 'mod',
    ]);

    const normalized = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
    const words = normalized.split(/\s+/).filter(Boolean);

    // Extract single keywords
    const singles = words.filter(w => (w.length > 2 || artTerms.has(w)) && !stopWords.has(w));

    // Extract meaningful bigrams (compound art/style terms)
    const bigrams = [];
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      // Keep bigrams where both words are meaningful, or match known art patterns
      if (!stopWords.has(words[i]) && !stopWords.has(words[i + 1]) && words[i].length > 2 && words[i + 1].length > 2) {
        bigrams.push(bigram);
      }
    }

    // Also extract color names explicitly (some are part of compound phrases)
    const colorKeywords = [];
    for (const colorName of Object.keys(COLOR_NAMES)) {
      if (normalized.includes(colorName)) {
        colorKeywords.push(colorName);
      }
    }

    // Combine: bigrams first (more specific), then singles, then colors
    // Deduplicate
    const seen = new Set();
    const result = [];
    for (const kw of [...bigrams, ...singles, ...colorKeywords]) {
      if (!seen.has(kw)) {
        seen.add(kw);
        result.push(kw);
      }
    }

    return result.slice(0, 20);
  }

  /**
   * Extract color mentions from text.
   * Returns array of color name keys that match COLOR_NAMES.
   */
  _extractColorMentions(text) {
    if (!text) return [];
    const found = [];
    for (const colorName of Object.keys(COLOR_NAMES)) {
      if (text.includes(colorName)) {
        found.push(colorName);
      }
    }
    return found;
  }
}

function getMediaMatcherService() {
  if (!instance) {
    instance = new MediaMatcherService();
  }
  return instance;
}

module.exports = { MediaMatcherService, getMediaMatcherService };
