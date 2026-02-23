/**
 * MediaComposerService - Platform-Ready Media Production
 *
 * Takes matched media assets + Claude's creative direction and produces
 * platform-ready media through a multi-strategy pipeline:
 *
 *   Strategy 1 — OWN EDITING (Sharp):
 *     Resize, CTA overlays, text, brand gradients, format optimization.
 *     Used when a good library/product image match exists.
 *
 *   Strategy 2 — CANVA TEMPLATES:
 *     Use Canva Connect API to generate designs from templates.
 *     Used when a template matches the post type and platform.
 *
 *   Strategy 3 — CANVA INSPIRATION:
 *     Search Canva template library for visual inspiration, then compose
 *     our own version using similar layouts/colors.
 *
 *   Strategy 4 — AI GENERATION (DALL-E):
 *     Generate a new image from Claude's visual direction.
 *     Last resort when no match and no template fits.
 *
 * The orchestrator picks the best strategy based on:
 *   - Whether a media match was found (and its score)
 *   - Whether a Canva API key is configured
 *   - Whether DALL-E key is configured
 *   - Post type and platform requirements
 */

const db = require('../../../../../config/db');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('[MediaComposer] sharp not available — image composition will be limited');
}

let instance = null;

const MEDIA_BACKEND_URL = process.env.MEDIA_BACKEND_URL || 'http://10.128.0.29:3001';
const MEDIA_API_KEY = process.env.MEDIA_API_KEY || '';
const SMART_MEDIA_BASE = process.env.SMART_MEDIA_BASE_URL || (process.env.API_BASE_URL ? `${process.env.API_BASE_URL}/api/v2/media/images` : '');
const CANVA_API_KEY = process.env.CANVA_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Platform specs for images
const IMAGE_PLATFORM_SPECS = {
  instagram:       { width: 1080, height: 1080, label: 'Instagram Feed (Square)' },
  instagram_story: { width: 1080, height: 1920, label: 'Instagram Story (9:16)' },
  facebook:        { width: 1200, height: 630,  label: 'Facebook Post (1.91:1)' },
  twitter:         { width: 1200, height: 675,  label: 'X/Twitter Post (16:9)' },
  pinterest:       { width: 1000, height: 1500, label: 'Pinterest Pin (2:3)' },
  tiktok:          { width: 1080, height: 1920, label: 'TikTok (9:16)' },
};

// Max video durations per platform (seconds)
const VIDEO_MAX_DURATION = {
  instagram:       60,
  instagram_story: 15,
  instagram_reel:  90,
  facebook:        240,
  twitter:         140,
  tiktok:          180,
  pinterest:       60,
  youtube:         null,
};

// ---------------------------------------------------------------------------
// COMPOSITION TEMPLATES
// Each template defines how overlays, text, and accents are applied.
// The orchestrator picks one per post (rotating through the campaign).
// ---------------------------------------------------------------------------
const COMPOSITION_TEMPLATES = [
  {
    id: 'gradient_cta',
    name: 'Gradient + CTA',
    description: 'Bottom gradient with bold CTA text and brand accent bar',
    buildOverlays: (spec, post, esc) => {
      const overlays = [];
      const ops = [];

      // Bottom gradient
      const gH = Math.round(spec.height * 0.35);
      overlays.push({ input: Buffer.from(`<svg width="${spec.width}" height="${spec.height}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="black" stop-opacity="0"/><stop offset="100%" stop-color="black" stop-opacity="0.65"/></linearGradient></defs><rect x="0" y="${spec.height - gH}" width="${spec.width}" height="${gH}" fill="url(#g)"/></svg>`), top: 0, left: 0 });
      ops.push({ type: 'gradient_overlay', height: gH });

      // CTA text
      if (post.callToAction) {
        const fs = spec.width <= 1000 ? 28 : 32;
        overlays.push({ input: Buffer.from(`<svg width="${spec.width}" height="${spec.height}"><text x="${spec.width/2}" y="${spec.height - 55}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fs}" font-weight="bold" fill="white" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))">${esc(post.callToAction.substring(0,60))}</text></svg>`), top: 0, left: 0 });
        ops.push({ type: 'cta_text', text: post.callToAction.substring(0,60) });
      }

      // Title
      if (post.title) {
        const tfs = spec.width <= 1000 ? 18 : 22;
        const ty = spec.height - (post.callToAction ? 90 : 50);
        overlays.push({ input: Buffer.from(`<svg width="${spec.width}" height="${spec.height}"><text x="30" y="${ty}" font-family="Arial, Helvetica, sans-serif" font-size="${tfs}" fill="rgba(255,255,255,0.85)" filter="drop-shadow(0 1px 3px rgba(0,0,0,0.4))">${esc(post.title.substring(0,50))}</text></svg>`), top: 0, left: 0 });
        ops.push({ type: 'title_overlay' });
      }

      // Accent bar
      overlays.push({ input: Buffer.from(`<svg width="${spec.width}" height="${spec.height}"><rect x="0" y="${spec.height - 4}" width="${spec.width}" height="4" fill="#FF6B35"/></svg>`), top: 0, left: 0 });
      ops.push({ type: 'brand_accent', color: '#FF6B35' });

      return { overlays, ops };
    },
  },
  {
    id: 'minimal_clean',
    name: 'Minimal Clean',
    description: 'Subtle dark vignette with small caption at bottom-right',
    buildOverlays: (spec, post, esc) => {
      const overlays = [];
      const ops = [];

      // Very subtle vignette (full-frame, light)
      overlays.push({ input: Buffer.from(`<svg width="${spec.width}" height="${spec.height}"><defs><radialGradient id="v" cx="50%" cy="50%" r="70%"><stop offset="60%" stop-color="black" stop-opacity="0"/><stop offset="100%" stop-color="black" stop-opacity="0.3"/></radialGradient></defs><rect width="${spec.width}" height="${spec.height}" fill="url(#v)"/></svg>`), top: 0, left: 0 });
      ops.push({ type: 'vignette' });

      // Small watermark-style CTA at bottom-right
      if (post.callToAction) {
        const fs = spec.width <= 1000 ? 16 : 18;
        overlays.push({ input: Buffer.from(`<svg width="${spec.width}" height="${spec.height}"><text x="${spec.width - 20}" y="${spec.height - 20}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="${fs}" fill="rgba(255,255,255,0.7)" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))">${esc(post.callToAction.substring(0,40))}</text></svg>`), top: 0, left: 0 });
        ops.push({ type: 'cta_text', style: 'minimal' });
      }

      return { overlays, ops };
    },
  },
  {
    id: 'bold_banner',
    name: 'Bold Banner',
    description: 'Full-width colored banner strip with large centered text',
    buildOverlays: (spec, post, esc) => {
      const overlays = [];
      const ops = [];

      // Colored banner strip (top)
      const bannerH = Math.round(spec.height * 0.15);
      overlays.push({ input: Buffer.from(`<svg width="${spec.width}" height="${spec.height}"><rect x="0" y="0" width="${spec.width}" height="${bannerH}" fill="rgba(0,0,0,0.75)"/></svg>`), top: 0, left: 0 });
      ops.push({ type: 'banner_strip' });

      // Title in banner
      if (post.title) {
        const fs = spec.width <= 1000 ? 26 : 30;
        overlays.push({ input: Buffer.from(`<svg width="${spec.width}" height="${spec.height}"><text x="${spec.width/2}" y="${bannerH * 0.65}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fs}" font-weight="bold" fill="white" letter-spacing="2">${esc(post.title.substring(0,40).toUpperCase())}</text></svg>`), top: 0, left: 0 });
        ops.push({ type: 'title_banner' });
      }

      // Bottom CTA bar
      if (post.callToAction) {
        const ctaH = Math.round(spec.height * 0.08);
        overlays.push({ input: Buffer.from(`<svg width="${spec.width}" height="${spec.height}"><rect x="0" y="${spec.height - ctaH}" width="${spec.width}" height="${ctaH}" fill="#FF6B35"/><text x="${spec.width/2}" y="${spec.height - ctaH * 0.3}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${spec.width <= 1000 ? 18 : 22}" font-weight="bold" fill="white">${esc(post.callToAction.substring(0,50))}</text></svg>`), top: 0, left: 0 });
        ops.push({ type: 'cta_bar', color: '#FF6B35' });
      }

      return { overlays, ops };
    },
  },
  {
    id: 'corner_badge',
    name: 'Corner Badge',
    description: 'Clean image with angled corner badge and subtle frame',
    buildOverlays: (spec, post, esc) => {
      const overlays = [];
      const ops = [];

      // Thin frame border
      const bw = 3;
      overlays.push({ input: Buffer.from(`<svg width="${spec.width}" height="${spec.height}"><rect x="${bw}" y="${bw}" width="${spec.width - bw*2}" height="${spec.height - bw*2}" fill="none" stroke="white" stroke-width="${bw}" stroke-opacity="0.5"/></svg>`), top: 0, left: 0 });
      ops.push({ type: 'frame_border' });

      // Corner ribbon (top-left diagonal)
      if (post.title) {
        const ribbonW = Math.round(spec.width * 0.55);
        const ribbonH = 40;
        overlays.push({ input: Buffer.from(`<svg width="${spec.width}" height="${spec.height}"><rect x="0" y="${ribbonH + 10}" width="${ribbonW}" height="${ribbonH}" fill="rgba(0,0,0,0.7)" rx="0" ry="0"/><text x="${ribbonW/2}" y="${ribbonH + 10 + ribbonH*0.68}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${spec.width <= 1000 ? 16 : 20}" font-weight="bold" fill="white">${esc(post.title.substring(0,35))}</text></svg>`), top: 0, left: 0 });
        ops.push({ type: 'corner_ribbon' });
      }

      // Bottom-right CTA pill
      if (post.callToAction) {
        const pillText = post.callToAction.substring(0, 30);
        const pillW = Math.min(spec.width * 0.6, pillText.length * 14 + 40);
        const pillH = 36;
        const px = spec.width - pillW - 15;
        const py = spec.height - pillH - 15;
        overlays.push({ input: Buffer.from(`<svg width="${spec.width}" height="${spec.height}"><rect x="${px}" y="${py}" width="${pillW}" height="${pillH}" rx="${pillH/2}" fill="#FF6B35"/><text x="${px + pillW/2}" y="${py + pillH*0.68}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="bold" fill="white">${esc(pillText)}</text></svg>`), top: 0, left: 0 });
        ops.push({ type: 'cta_pill' });
      }

      return { overlays, ops };
    },
  },
  {
    id: 'split_color',
    name: 'Split Color Block',
    description: 'Image with a colored sidebar panel containing text',
    buildOverlays: (spec, post, esc) => {
      const overlays = [];
      const ops = [];

      // Right-side color block (20% width)
      const panelW = Math.round(spec.width * 0.28);
      const px = spec.width - panelW;
      overlays.push({ input: Buffer.from(`<svg width="${spec.width}" height="${spec.height}"><rect x="${px}" y="0" width="${panelW}" height="${spec.height}" fill="rgba(0,0,0,0.8)"/></svg>`), top: 0, left: 0 });
      ops.push({ type: 'side_panel' });

      // Title rotated vertically in panel
      if (post.title) {
        const fs = spec.width <= 1000 ? 18 : 22;
        const cx = px + panelW / 2;
        overlays.push({ input: Buffer.from(`<svg width="${spec.width}" height="${spec.height}"><text x="${cx}" y="${spec.height * 0.3}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fs}" font-weight="bold" fill="white" letter-spacing="1">${esc(post.title.substring(0,30).toUpperCase())}</text></svg>`), top: 0, left: 0 });
        ops.push({ type: 'panel_title' });
      }

      // CTA in panel
      if (post.callToAction) {
        const fs = spec.width <= 1000 ? 14 : 16;
        const cx = px + panelW / 2;
        overlays.push({ input: Buffer.from(`<svg width="${spec.width}" height="${spec.height}"><text x="${cx}" y="${spec.height * 0.7}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fs}" fill="#FF6B35">${esc(post.callToAction.substring(0,35))}</text></svg>`), top: 0, left: 0 });
        ops.push({ type: 'panel_cta' });
      }

      // Accent line between image and panel
      overlays.push({ input: Buffer.from(`<svg width="${spec.width}" height="${spec.height}"><line x1="${px}" y1="0" x2="${px}" y2="${spec.height}" stroke="#FF6B35" stroke-width="3"/></svg>`), top: 0, left: 0 });
      ops.push({ type: 'divider_line' });

      return { overlays, ops };
    },
  },
];


class MediaComposerService {
  constructor() {
    // Output to api-service/temp_images/marketing/composed — served by express.static
    this.outputDir = path.join(__dirname, '..', '..', '..', '..', '..', 'temp_images', 'marketing', 'composed');
    this._ensureDir();
  }

  async _ensureDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (e) { /* ignore */ }
  }

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------

  /**
   * Compose media for a single post using the best available strategy.
   */
  async composeForPost(params) {
    const { matchedMedia, post, userId, ownerType } = params;
    const platform = post.platform || 'instagram';
    const postType = post.type || 'post';

    // ORCHESTRATOR: Pick the best strategy
    const strategy = this._pickStrategy(matchedMedia, post);
    console.log(`[MediaComposer] Strategy for "${post.title}": ${strategy}`);

    switch (strategy) {
      case 'sharp_compose':
        return this._composeWithSharp(matchedMedia, post, platform, postType, userId, ownerType);

      case 'canva_template':
        return this._composeWithCanva(matchedMedia, post, platform, postType, userId);

      case 'canva_inspiration':
        return this._composeWithCanvaInspiration(matchedMedia, post, platform, postType, userId);

      case 'ai_generate':
        return this._composeWithDallE(post, platform, postType, userId, ownerType);

      case 'video_compose':
        return this._composeVideo(matchedMedia, post, platform, postType, userId, ownerType);

      default:
        return {
          status: 'no_media',
          strategy: 'none',
          message: 'No media matched and no generation APIs configured. Upload images to your media library.',
          operations: [],
        };
    }
  }

  /**
   * Compose for an entire campaign — batch process all matched posts.
   */
  async composeCampaign(postsWithMedia, userId, ownerType) {
    const results = [];

    for (const post of postsWithMedia) {
      try {
        const composition = await this.composeForPost({
          matchedMedia: post.matchedMedia,
          post,
          userId,
          ownerType,
        });

        results.push({
          ...post,
          composition,
        });
      } catch (err) {
        console.error(`[MediaComposer] Error composing post "${post.title}":`, err.message);
        results.push({
          ...post,
          composition: {
            status: 'error',
            strategy: 'error',
            message: err.message,
            operations: [],
          },
        });
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // ORCHESTRATOR
  // ---------------------------------------------------------------------------

  /**
   * Pick the best composition strategy based on available resources.
   *
   * Priority:
   *   1. Sharp compose (own editing) — if matched media exists with decent score
   *   2. Canva template — if Canva API is configured and post type has a template
   *   3. Canva inspiration — search templates for layout ideas
   *   4. DALL-E generation — if OpenAI key configured (last resort)
   *   5. No media — prompt user to upload
   */
  _pickStrategy(matchedMedia, post) {
    // Video always goes through video pipeline
    if (matchedMedia?.type === 'video') {
      return 'video_compose';
    }

    // Good image match — compose with Sharp
    if (matchedMedia?.filePath && matchedMedia.score >= 0.1) {
      return 'sharp_compose';
    }

    // Weak or no match — try Canva template
    if (CANVA_API_KEY) {
      return 'canva_template';
    }

    // No Canva — try AI generation
    if (OPENAI_API_KEY) {
      return 'ai_generate';
    }

    // Weak match is still better than nothing — compose what we have
    if (matchedMedia?.filePath) {
      return 'sharp_compose';
    }

    return 'none';
  }

  // ---------------------------------------------------------------------------
  // STRATEGY 1: Sharp Compose (Own Editing)
  // ---------------------------------------------------------------------------

  /**
   * Download the matched image from the media backend, then apply:
   *   - Platform resize (cover crop)
   *   - Bottom gradient overlay
   *   - CTA text badge
   *   - Brand accent bar
   *   - Format optimization (JPEG quality 85)
   *
   * Saves the composed image locally and creates a pending_images entry
   * so it can be served via the smart-serve proxy.
   */
  async _composeWithSharp(media, post, platform, postType, userId, ownerType, templateId) {
    const operations = [];
    const spec = this._getImageSpec(platform, postType);

    if (!sharp) {
      return this._dispatchToPendingImages(media, post, platform, postType, spec, userId, ownerType);
    }

    try {
      // 1. Download the source image from media backend
      const imageBuffer = await this._downloadMediaImage(media.mediaId || media.id);
      if (!imageBuffer) {
        console.warn(`[MediaComposer] Could not download media, falling back to dispatch`);
        return this._dispatchToPendingImages(media, post, platform, postType, spec, userId, ownerType);
      }
      operations.push({ type: 'download', source: media.filePath, bytes: imageBuffer.length });

      // 2. Resize to platform spec (cover crop)
      let composed = sharp(imageBuffer)
        .resize(spec.width, spec.height, { fit: 'cover', position: 'centre' });
      operations.push({ type: 'resize', targetWidth: spec.width, targetHeight: spec.height, label: spec.label });

      // 3. Pick a template and build overlays
      const template = templateId
        ? COMPOSITION_TEMPLATES.find(t => t.id === templateId) || COMPOSITION_TEMPLATES[0]
        : this._pickTemplate(post);

      const { overlays, ops } = template.buildOverlays(spec, post, this._escapeXml.bind(this));
      operations.push({ type: 'template', templateId: template.id, templateName: template.name });
      operations.push(...ops);

      // 4. Composite all overlays
      if (overlays.length > 0) {
        composed = composed.composite(overlays);
      }

      // 5. Optimize output
      const outputBuffer = await composed.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
      operations.push({ type: 'optimize', format: 'jpeg', quality: 85, outputBytes: outputBuffer.length });

      // 6. Save to temp directory
      const filename = `composed_${userId}_${platform}_${Date.now()}.jpg`;
      const outputPath = path.join(this.outputDir, filename);
      await fs.writeFile(outputPath, outputBuffer);

      // 7. Create pending_images entry
      const pendingImageId = await this._createPendingImageEntry({
        inputPath: outputPath,
        originalName: filename,
        mimeType: 'image/jpeg',
        platform, postType, operations, userId, ownerType,
        postTitle: post.title,
        strategy: 'sharp_compose',
        sourceMediaId: media.mediaId || media.id,
      });

      console.log(`[MediaComposer] Composed "${post.title}" [${template.id}] → ${filename} (${(outputBuffer.length / 1024).toFixed(0)}KB)`);

      return {
        status: 'composed',
        strategy: 'sharp_compose',
        templateId: template.id,
        templateName: template.name,
        pendingImageId,
        composedPath: outputPath,
        inputAsset: {
          id: media.id,
          mediaId: media.mediaId,
          filePath: media.filePath,
          thumbnailPath: media.thumbnailPath || media.filePath,
          source: media.source || 'media_backend',
        },
        targetSpec: spec,
        operations,
        previewUrl: media.thumbnailPath || media.filePath,
        composedPreviewUrl: `/temp_images/marketing/composed/${filename}`,
        message: `Composed with "${template.name}" template for ${spec.label}`,
      };
    } catch (err) {
      console.error(`[MediaComposer] Sharp composition error:`, err.message);
      return this._dispatchToPendingImages(media, post, platform, postType, spec, userId, ownerType);
    }
  }

  /**
   * Pick a template for a post. Rotates through templates to ensure
   * variety across a campaign. Can also be specified by the user.
   */
  _pickTemplate(post) {
    // Use a hash of the post title to deterministically pick a template
    // This ensures the same post always gets the same template, but
    // different posts in a campaign get different templates
    const hash = (post.title || post.caption || String(Date.now()))
      .split('')
      .reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0), 0);
    const idx = Math.abs(hash) % COMPOSITION_TEMPLATES.length;
    return COMPOSITION_TEMPLATES[idx];
  }

  // ---------------------------------------------------------------------------
  // STRATEGY 2: Canva Template
  // ---------------------------------------------------------------------------

  /**
   * Use Canva Connect API to create a design from a template.
   * Searches Canva's template library for the platform + style, then
   * auto-fills with post content.
   */
  async _composeWithCanva(media, post, platform, postType, userId) {
    if (!CANVA_API_KEY) {
      return { status: 'skipped', strategy: 'canva_template', message: 'Canva API not configured' };
    }

    const spec = this._getImageSpec(platform, postType);

    try {
      // Search Canva templates for this platform and style
      const templateQuery = `${platform} ${postType} ${post.visualDirection || 'modern marketing'}`;
      const template = await this._searchCanvaTemplate(templateQuery, spec);

      if (!template) {
        // No template found — fall through to inspiration or generation
        console.log(`[MediaComposer] No Canva template found for "${templateQuery}"`);
        if (OPENAI_API_KEY) {
          return this._composeWithDallE(post, platform, postType, userId, 'admin');
        }
        return { status: 'no_template', strategy: 'canva_template', message: 'No matching Canva template' };
      }

      // Create a design from the template via Canva Connect API
      const design = await this._createCanvaDesign(template, post, media);

      return {
        status: 'composed',
        strategy: 'canva_template',
        canvaDesignId: design.id,
        canvaExportUrl: design.exportUrl,
        templateId: template.id,
        targetSpec: spec,
        operations: [
          { type: 'canva_template', templateId: template.id, templateName: template.name },
          { type: 'auto_fill', fields: Object.keys(design.filledFields || {}).length },
        ],
        previewUrl: design.thumbnailUrl || media?.thumbnailPath,
        message: `Created Canva design from template "${template.name}"`,
      };
    } catch (err) {
      console.warn(`[MediaComposer] Canva template error:`, err.message);
      return { status: 'error', strategy: 'canva_template', message: err.message };
    }
  }

  /**
   * Search Canva Connect API for templates.
   */
  async _searchCanvaTemplate(query, spec) {
    try {
      const response = await axios.get('https://api.canva.com/rest/v1/designs/search', {
        headers: {
          Authorization: `Bearer ${CANVA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        params: {
          query,
          type: 'template',
          width: spec.width,
          height: spec.height,
          limit: 5,
        },
        timeout: 10000,
      });

      const templates = response.data?.items || [];
      return templates.length > 0 ? templates[0] : null;
    } catch (err) {
      console.warn('[MediaComposer] Canva search failed:', err.message);
      return null;
    }
  }

  /**
   * Create a design from a Canva template, auto-filling with post data.
   */
  async _createCanvaDesign(template, post, media) {
    const response = await axios.post('https://api.canva.com/rest/v1/designs', {
      design_type: 'custom',
      template_id: template.id,
      title: post.title || 'Marketing Post',
      autofill: {
        data: {
          headline: post.title || '',
          body: (post.caption || '').substring(0, 200),
          cta: post.callToAction || '',
        },
      },
    }, {
      headers: {
        Authorization: `Bearer ${CANVA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    return {
      id: response.data?.design?.id,
      exportUrl: response.data?.design?.export_url,
      thumbnailUrl: response.data?.design?.thumbnail?.url,
      filledFields: response.data?.design?.autofill_result,
    };
  }

  // ---------------------------------------------------------------------------
  // STRATEGY 3: Canva Inspiration
  // ---------------------------------------------------------------------------

  /**
   * Search Canva for inspiration and compose our own version.
   * This is a lighter touch — we look at template layouts/color schemes
   * then compose locally using Sharp.
   */
  async _composeWithCanvaInspiration(media, post, platform, postType, userId) {
    // For now, this falls back to Sharp compose or DALL-E
    // Future: parse Canva template structures to extract layout inspiration
    if (media?.filePath) {
      return this._composeWithSharp(media, post, platform, postType, userId, 'admin');
    }
    if (OPENAI_API_KEY) {
      return this._composeWithDallE(post, platform, postType, userId, 'admin');
    }
    return { status: 'skipped', strategy: 'canva_inspiration', message: 'No media and no DALL-E configured' };
  }

  // ---------------------------------------------------------------------------
  // STRATEGY 4: DALL-E AI Generation
  // ---------------------------------------------------------------------------

  /**
   * Generate a new image from Claude's visual direction using DALL-E.
   * Last resort when no library match and no Canva template.
   */
  async _composeWithDallE(post, platform, postType, userId, ownerType) {
    if (!OPENAI_API_KEY) {
      return { status: 'skipped', strategy: 'ai_generate', message: 'OpenAI API not configured' };
    }

    const spec = this._getImageSpec(platform, postType);

    try {
      // Build a generation prompt from Claude's direction
      const prompt = this._buildDallEPrompt(post, platform);

      // Determine DALL-E size (must be one of their supported sizes)
      const dalleSize = this._getDallESize(spec);

      const response = await axios.post('https://api.openai.com/v1/images/generations', {
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: dalleSize,
        quality: 'standard',
        response_format: 'b64_json',
      }, {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      });

      const imageData = response.data?.data?.[0]?.b64_json;
      if (!imageData) {
        return { status: 'error', strategy: 'ai_generate', message: 'DALL-E returned no image' };
      }

      // Decode, resize to exact platform spec, and save
      const rawBuffer = Buffer.from(imageData, 'base64');
      let outputBuffer = rawBuffer;

      if (sharp) {
        outputBuffer = await sharp(rawBuffer)
          .resize(spec.width, spec.height, { fit: 'cover', position: 'centre' })
          .jpeg({ quality: 85, mozjpeg: true })
          .toBuffer();
      }

      const filename = `generated_${userId}_${platform}_${Date.now()}.jpg`;
      const outputPath = path.join(this.outputDir, filename);
      await fs.writeFile(outputPath, outputBuffer);

      // Create pending_images entry
      const pendingImageId = await this._createPendingImageEntry({
        inputPath: outputPath,
        originalName: filename,
        mimeType: 'image/jpeg',
        platform,
        postType,
        operations: [
          { type: 'ai_generate', model: 'dall-e-3', prompt: prompt.substring(0, 200) },
          { type: 'resize', targetWidth: spec.width, targetHeight: spec.height },
        ],
        userId,
        ownerType,
        postTitle: post.title,
        strategy: 'ai_generate',
      });

      console.log(`[MediaComposer] Generated "${post.title}" via DALL-E → ${filename}`);

      return {
        status: 'composed',
        strategy: 'ai_generate',
        pendingImageId,
        composedPath: outputPath,
        targetSpec: spec,
        operations: [
          { type: 'ai_generate', model: 'dall-e-3', promptPreview: prompt.substring(0, 100) },
          { type: 'resize', targetWidth: spec.width, targetHeight: spec.height },
        ],
        previewUrl: `/temp_images/marketing/composed/${filename}`,
        message: `AI-generated image for ${spec.label}`,
      };
    } catch (err) {
      console.error(`[MediaComposer] DALL-E generation error:`, err.message);
      return { status: 'error', strategy: 'ai_generate', message: err.message };
    }
  }

  /**
   * Build a DALL-E prompt from Claude's post concept.
   */
  _buildDallEPrompt(post, platform) {
    const parts = [];
    parts.push('Create a professional social media marketing image.');

    if (post.visualDirection) {
      parts.push(`Visual style: ${post.visualDirection}`);
    }
    if (post.suggestedMediaDescription) {
      parts.push(`Content: ${post.suggestedMediaDescription}`);
    }
    if (post.title) {
      parts.push(`Theme: ${post.title}`);
    }

    parts.push(`For ${platform}. Modern, high-quality, editorial style.`);
    parts.push('Do not include any text or words in the image.');

    return parts.join(' ').substring(0, 1000);
  }

  /**
   * Map platform spec to closest DALL-E supported size.
   */
  _getDallESize(spec) {
    const ratio = spec.width / spec.height;
    if (ratio > 1.3) return '1792x1024';      // landscape
    if (ratio < 0.77) return '1024x1792';      // portrait/story
    return '1024x1024';                         // square
  }

  // ---------------------------------------------------------------------------
  // VIDEO COMPOSITION (unchanged — dispatches to video_jobs)
  // ---------------------------------------------------------------------------

  async _composeVideo(media, post, platform, postType, userId, ownerType) {
    const operations = [];
    const maxDuration = this._getMaxDuration(platform, postType);
    const mediaDuration = media.metadata?.duration || null;

    if (maxDuration && mediaDuration && mediaDuration > maxDuration) {
      operations.push({ type: 'clip', maxDuration, currentDuration: mediaDuration, strategy: 'auto_clip' });
    }

    operations.push({ type: 'adapt_platform', platform: this._getVideoPlatformKey(platform, postType) });

    if (post.caption && post.caption.length <= 100) {
      operations.push({ type: 'caption_overlay', text: post.caption.substring(0, 80), position: 'bottom_center' });
    }

    operations.push({ type: 'thumbnail', timestamp: '00:00:02' });

    const jobId = await this._createCompositionJob({
      inputAssetId: media.id,
      inputPath: media.filePath,
      mediaType: 'video',
      platform, postType, operations, userId, ownerType,
      postTitle: post.title,
    });

    return {
      status: 'queued',
      strategy: 'video_compose',
      jobId,
      inputAsset: {
        id: media.id,
        filePath: media.filePath,
        thumbnailPath: media.thumbnailPath || media.filePath,
        source: media.source || 'library',
      },
      targetSpec: { maxDuration, platform: this._getVideoPlatformKey(platform, postType) },
      operations,
      previewUrl: media.thumbnailPath || media.filePath,
      message: maxDuration && mediaDuration > maxDuration
        ? `Video will be clipped to ${maxDuration}s and adapted for ${platform}`
        : `Video will be adapted for ${platform}`,
    };
  }

  // ---------------------------------------------------------------------------
  // MEDIA DOWNLOAD
  // ---------------------------------------------------------------------------

  /**
   * Download an image from the media backend by its media ID.
   * Uses the smart-serve endpoint with 'detail' size.
   */
  async _downloadMediaImage(mediaId) {
    if (!mediaId) return null;

    try {
      const headers = {};
      if (MEDIA_API_KEY) headers.Authorization = MEDIA_API_KEY;

      const response = await axios.get(`${MEDIA_BACKEND_URL}/serve/${mediaId}?size=detail`, {
        headers,
        responseType: 'arraybuffer',
        timeout: 15000,
      });

      if (response.status === 200 && response.data) {
        return Buffer.from(response.data);
      }
      return null;
    } catch (err) {
      console.warn(`[MediaComposer] Failed to download media ${mediaId}:`, err.message);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // JOB MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Fallback: dispatch to pending_images without local editing.
   * Used when sharp is unavailable or download fails.
   */
  async _dispatchToPendingImages(media, post, platform, postType, spec, userId, ownerType) {
    const operations = [
      { type: 'resize', targetWidth: spec.width, targetHeight: spec.height, label: spec.label },
    ];
    if (post.callToAction) {
      operations.push({ type: 'text_overlay', text: post.callToAction, position: 'bottom', style: 'cta_badge' });
    }
    if (post.visualDirection) {
      operations.push({ type: 'art_direction', note: post.visualDirection, status: 'pending_review' });
    }
    operations.push({ type: 'optimize', format: 'jpeg', quality: 85 });

    const pendingImageId = await this._createPendingImageEntry({
      inputAssetId: media.id,
      inputPath: media.filePath,
      originalName: media.originalName || path.basename(media.filePath || 'marketing-asset.jpg'),
      mimeType: media.mimeType || 'image/jpeg',
      platform, postType, operations, userId, ownerType,
      postTitle: post.title,
      strategy: 'pending_dispatch',
    });

    return {
      status: 'queued',
      strategy: 'pending_dispatch',
      pendingImageId,
      inputAsset: {
        id: media.id,
        filePath: media.filePath,
        thumbnailPath: media.thumbnailPath || media.filePath,
        source: media.source || 'library',
      },
      targetSpec: spec,
      operations,
      previewUrl: media.thumbnailPath || media.filePath,
      message: `Image dispatched for processing: ${spec.width}x${spec.height} for ${spec.label}`,
    };
  }

  /**
   * Insert into pending_images for the media processing VM.
   */
  async _createPendingImageEntry(params) {
    try {
      const pendingDir = path.join(__dirname, '..', '..', '..', '..', '..', 'temp_images', 'marketing', 'pending');
      await fs.mkdir(pendingDir, { recursive: true });

      let imagePath = params.inputPath;
      if (imagePath && !imagePath.startsWith(pendingDir)) {
        const destName = `mkt_${params.userId}_${Date.now()}${path.extname(imagePath)}`;
        const destPath = path.join(pendingDir, destName);
        try {
          await fs.copyFile(imagePath, destPath);
          imagePath = destPath;
        } catch (cpErr) {
          console.warn('[MediaComposer] Could not copy to pending dir:', cpErr.message);
        }
      }

      const metadata = {
        source: 'marketing_campaign',
        strategy: params.strategy || 'sharp_compose',
        inputAssetId: params.inputAssetId,
        sourceMediaId: params.sourceMediaId,
        platform: params.platform,
        postType: params.postType,
        operations: params.operations,
        ownerType: params.ownerType,
        postTitle: params.postTitle,
        compositionType: 'campaign_media',
      };

      const [result] = await db.query(
        `INSERT INTO pending_images (user_id, image_path, original_name, mime_type, metadata, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
        [
          params.userId,
          imagePath || '',
          params.originalName || 'marketing-asset.jpg',
          params.mimeType || 'image/jpeg',
          JSON.stringify(metadata),
        ]
      );

      const pendingImageId = result.insertId;
      console.log(`[MediaComposer] Created pending_image #${pendingImageId} for "${params.postTitle}" (${params.strategy} → ${params.platform})`);
      return pendingImageId;
    } catch (error) {
      console.error('[MediaComposer] Failed to create pending_image:', error.message);
      return null;
    }
  }

  /**
   * Create a video composition job.
   */
  async _createCompositionJob(params) {
    try {
      const config = {
        inputAssetId: params.inputAssetId,
        inputPath: params.inputPath,
        mediaType: params.mediaType,
        platform: params.platform,
        postType: params.postType,
        operations: params.operations,
        ownerType: params.ownerType,
        userId: params.userId,
        postTitle: params.postTitle,
        compositionType: 'campaign_media',
      };

      const [result] = await db.query(
        `INSERT INTO video_jobs (type, input_path, config, status, created_at)
         VALUES (?, ?, ?, 'pending', NOW())`,
        [
          'adapt',
          params.inputPath || '',
          JSON.stringify(config),
        ]
      );

      const jobId = result.insertId;
      console.log(`[MediaComposer] Created video job #${jobId} for "${params.postTitle}" (video → ${params.platform})`);
      return jobId;
    } catch (error) {
      console.error('[MediaComposer] Failed to create video job:', error.message);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // STATUS CHECKS
  // ---------------------------------------------------------------------------

  async getJobStatus(jobId) {
    try {
      const [rows] = await db.query(
        `SELECT id, type, status, config, output_path, error_message, created_at, completed_at
         FROM video_jobs WHERE id = ?`, [jobId]);
      if (rows.length === 0) return null;
      const job = rows[0];
      if (job.config && typeof job.config === 'string') job.config = JSON.parse(job.config);
      return job;
    } catch (err) { return null; }
  }

  async getJobStatuses(jobIds) {
    if (!jobIds || jobIds.length === 0) return [];
    try {
      const ph = jobIds.map(() => '?').join(',');
      const [rows] = await db.query(
        `SELECT id, type, status, output_path, error_message, completed_at FROM video_jobs WHERE id IN (${ph})`, jobIds);
      return rows;
    } catch (err) { return []; }
  }

  async getPendingImageStatus(pendingImageId) {
    try {
      const [rows] = await db.query(
        `SELECT id, status, permanent_url, thumbnail_url, metadata, created_at, updated_at
         FROM pending_images WHERE id = ?`, [pendingImageId]);
      if (rows.length === 0) return null;
      const row = rows[0];
      if (row.metadata && typeof row.metadata === 'string') row.metadata = JSON.parse(row.metadata);
      return row;
    } catch (err) { return null; }
  }

  async getPendingImageStatuses(pendingImageIds) {
    if (!pendingImageIds || pendingImageIds.length === 0) return [];
    try {
      const ph = pendingImageIds.map(() => '?').join(',');
      const [rows] = await db.query(
        `SELECT id, status, permanent_url, thumbnail_url, metadata, updated_at
         FROM pending_images WHERE id IN (${ph})`, pendingImageIds);
      return rows;
    } catch (err) { return []; }
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  _getImageSpec(platform, postType) {
    if (postType === 'story' || postType === 'reel') {
      return IMAGE_PLATFORM_SPECS[`${platform}_story`] || IMAGE_PLATFORM_SPECS.instagram_story;
    }
    return IMAGE_PLATFORM_SPECS[platform] || IMAGE_PLATFORM_SPECS.instagram;
  }

  _getMaxDuration(platform, postType) {
    if (postType === 'story') return VIDEO_MAX_DURATION[`${platform}_story`] || 15;
    if (postType === 'reel') return VIDEO_MAX_DURATION[`${platform}_reel`] || 90;
    return VIDEO_MAX_DURATION[platform] || 60;
  }

  _getVideoPlatformKey(platform, postType) {
    if (postType === 'story') return `${platform}_story`;
    if (postType === 'reel') return `${platform}_reel`;
    return platform;
  }

  _escapeXml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

function getMediaComposerService() {
  if (!instance) {
    instance = new MediaComposerService();
  }
  return instance;
}

module.exports = { MediaComposerService, getMediaComposerService, COMPOSITION_TEMPLATES };
