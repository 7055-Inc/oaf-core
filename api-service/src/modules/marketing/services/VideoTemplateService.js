const db = require('../../../../config/db');
const { promisify } = require('util');
const query = promisify(db.query).bind(db);

/**
 * VideoTemplateService - Video template management and application
 * 
 * Provides template capabilities:
 * - List available templates
 * - Get template details
 * - Apply template to video (intro/outro, lower thirds, transitions)
 * - Template configuration management
 */
class VideoTemplateService {
  constructor() {
    this.videoService = null; // Lazy loaded to avoid circular dependency
  }

  _getVideoService() {
    if (!this.videoService) {
      const { getVideoService } = require('./VideoService');
      this.videoService = getVideoService();
    }
    return this.videoService;
  }

  /**
   * List all available templates
   * @param {Object} filters - Optional filters
   * @returns {Array} List of templates
   */
  async listTemplates(filters = {}) {
    const { category, platform, tier } = filters;
    
    let sql = 'SELECT * FROM video_templates WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (platform) {
      sql += ' AND (platform = ? OR platform = "universal")';
      params.push(platform);
    }

    if (tier) {
      sql += ' AND tier <= ?';
      params.push(tier);
    }

    sql += ' ORDER BY created_at DESC';

    try {
      const templates = await query(sql, params);
      return templates;
    } catch (error) {
      throw new Error(`Failed to list templates: ${error.message}`);
    }
  }

  /**
   * Get template by ID
   * @param {number} templateId - Template ID
   * @returns {Object} Template details
   */
  async getTemplate(templateId) {
    try {
      const [template] = await query(
        'SELECT * FROM video_templates WHERE id = ?',
        [templateId]
      );

      if (!template) {
        throw new Error('Template not found');
      }

      // Parse JSON config
      if (template.config && typeof template.config === 'string') {
        template.config = JSON.parse(template.config);
      }

      return template;
    } catch (error) {
      throw new Error(`Failed to get template: ${error.message}`);
    }
  }

  /**
   * Apply template to video
   * @param {string} videoPath - Path to input video
   * @param {number} templateId - Template ID to apply
   * @param {Object} options - Additional options
   * @returns {string} Path to output video
   */
  async applyTemplate(videoPath, templateId, options = {}) {
    try {
      const template = await this.getTemplate(templateId);
      const config = template.config;

      // Determine which operations to perform based on template config
      let processedVideo = videoPath;

      // Apply intro if specified
      if (config.intro) {
        processedVideo = await this._applyIntro(processedVideo, config.intro, options);
      }

      // Apply lower thirds/overlays
      if (config.lowerThirds) {
        processedVideo = await this._applyLowerThirds(processedVideo, config.lowerThirds, options);
      }

      // Apply transitions between scenes
      if (config.transitions) {
        processedVideo = await this._applyTransitions(processedVideo, config.transitions);
      }

      // Apply outro if specified
      if (config.outro) {
        processedVideo = await this._applyOutro(processedVideo, config.outro, options);
      }

      // Apply color grading/filters
      if (config.filters) {
        processedVideo = await this._applyFilters(processedVideo, config.filters);
      }

      return processedVideo;
    } catch (error) {
      throw new Error(`Failed to apply template: ${error.message}`);
    }
  }

  /**
   * Apply intro to video
   */
  async _applyIntro(videoPath, introConfig, options) {
    const videoService = this._getVideoService();
    
    if (introConfig.videoPath) {
      // Combine intro video with main video
      return await videoService.combineClips([introConfig.videoPath, videoPath]);
    } else if (introConfig.text) {
      // Generate text intro (would require more complex FFmpeg filter)
      // For now, return original video
      console.warn('Text intro generation not yet implemented');
      return videoPath;
    }

    return videoPath;
  }

  /**
   * Apply lower thirds (text overlays)
   */
  async _applyLowerThirds(videoPath, lowerThirdsConfig, options) {
    // Lower thirds would require FFmpeg drawtext filter
    // This is a simplified implementation
    // Real implementation would overlay text at specific timestamps
    console.warn('Lower thirds application not yet fully implemented');
    return videoPath;
  }

  /**
   * Apply transitions between scenes
   */
  async _applyTransitions(videoPath, transitionsConfig) {
    // Transitions require complex FFmpeg xfade filters
    console.warn('Transitions not yet fully implemented');
    return videoPath;
  }

  /**
   * Apply outro to video
   */
  async _applyOutro(videoPath, outroConfig, options) {
    const videoService = this._getVideoService();
    
    if (outroConfig.videoPath) {
      // Combine main video with outro video
      return await videoService.combineClips([videoPath, outroConfig.videoPath]);
    } else if (outroConfig.text) {
      // Generate text outro
      console.warn('Text outro generation not yet implemented');
      return videoPath;
    }

    return videoPath;
  }

  /**
   * Apply color filters/grading
   */
  async _applyFilters(videoPath, filtersConfig) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const path = require('path');
    const execAsync = promisify(exec);

    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    const outputPath = path.join(
      path.dirname(videoPath),
      `filtered_${Date.now()}.mp4`
    );

    // Build filter string based on config
    let filterString = '';
    const filters = [];

    if (filtersConfig.brightness) {
      filters.push(`eq=brightness=${filtersConfig.brightness}`);
    }

    if (filtersConfig.contrast) {
      filters.push(`eq=contrast=${filtersConfig.contrast}`);
    }

    if (filtersConfig.saturation) {
      filters.push(`eq=saturation=${filtersConfig.saturation}`);
    }

    if (filtersConfig.preset) {
      // Predefined filter presets
      const presets = {
        vintage: 'curves=vintage',
        warm: 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
        cool: 'colorchannelmixer=1.2:0:0:0:0:1.2:0:0:0:0:1.5',
        bw: 'hue=s=0'
      };
      if (presets[filtersConfig.preset]) {
        filters.push(presets[filtersConfig.preset]);
      }
    }

    if (filters.length === 0) {
      return videoPath; // No filters to apply
    }

    filterString = filters.join(',');
    const command = `${ffmpegPath} -i "${videoPath}" \
      -vf "${filterString}" \
      -c:v libx264 -crf 23 -preset medium \
      -c:a copy \
      "${outputPath}"`;

    try {
      await execAsync(command, { maxBuffer: 100 * 1024 * 1024 });
      return outputPath;
    } catch (error) {
      throw new Error(`Filter application failed: ${error.message}`);
    }
  }

  /**
   * Create a new template
   * @param {Object} templateData - Template data
   * @returns {number} New template ID
   */
  async createTemplate(templateData) {
    const {
      name,
      description,
      category,
      platform = 'universal',
      config,
      thumbnail_path,
      tier = 'free'
    } = templateData;

    if (!name || !config) {
      throw new Error('Name and config are required');
    }

    try {
      const result = await query(
        `INSERT INTO video_templates 
        (name, description, category, platform, config, thumbnail_path, tier) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          description,
          category,
          platform,
          JSON.stringify(config),
          thumbnail_path,
          tier
        ]
      );

      return result.insertId;
    } catch (error) {
      throw new Error(`Failed to create template: ${error.message}`);
    }
  }

  /**
   * Update template
   * @param {number} templateId - Template ID
   * @param {Object} updates - Fields to update
   */
  async updateTemplate(templateId, updates) {
    const allowedFields = ['name', 'description', 'category', 'platform', 'config', 'thumbnail_path', 'tier'];
    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        values.push(key === 'config' ? JSON.stringify(value) : value);
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(templateId);

    try {
      await query(
        `UPDATE video_templates SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );
    } catch (error) {
      throw new Error(`Failed to update template: ${error.message}`);
    }
  }

  /**
   * Delete template
   * @param {number} templateId - Template ID
   */
  async deleteTemplate(templateId) {
    try {
      await query('DELETE FROM video_templates WHERE id = ?', [templateId]);
    } catch (error) {
      throw new Error(`Failed to delete template: ${error.message}`);
    }
  }

  /**
   * Get predefined template categories
   */
  getCategories() {
    return [
      { id: 'product', name: 'Product Showcase', description: 'Templates for product videos' },
      { id: 'testimonial', name: 'Testimonial', description: 'Customer testimonial templates' },
      { id: 'promo', name: 'Promotional', description: 'Marketing and promotional videos' },
      { id: 'tutorial', name: 'Tutorial', description: 'How-to and educational videos' },
      { id: 'announcement', name: 'Announcement', description: 'News and announcement videos' },
      { id: 'social', name: 'Social Media', description: 'Short-form social content' }
    ];
  }

  /**
   * Get supported platforms
   */
  getPlatforms() {
    return [
      { id: 'universal', name: 'Universal', description: 'Works on any platform' },
      { id: 'instagram', name: 'Instagram', description: 'Optimized for Instagram' },
      { id: 'tiktok', name: 'TikTok', description: 'Optimized for TikTok' },
      { id: 'youtube', name: 'YouTube', description: 'Optimized for YouTube' },
      { id: 'facebook', name: 'Facebook', description: 'Optimized for Facebook' }
    ];
  }

  /**
   * Simple template application - just intro and outro
   * @param {string} videoPath - Path to input video
   * @param {Object} simpleConfig - Simple config with intro/outro paths
   * @returns {string} Path to output video
   */
  async applySimpleTemplate(videoPath, simpleConfig) {
    const videoService = this._getVideoService();
    const clips = [];

    // Add intro if provided
    if (simpleConfig.introPath) {
      clips.push(simpleConfig.introPath);
    }

    // Add main video
    clips.push(videoPath);

    // Add outro if provided
    if (simpleConfig.outroPath) {
      clips.push(simpleConfig.outroPath);
    }

    // If only main video, return as-is
    if (clips.length === 1) {
      return videoPath;
    }

    // Combine all clips
    return await videoService.combineClips(clips);
  }
}

// Export singleton
let instance = null;
module.exports = {
  getVideoTemplateService: () => {
    if (!instance) {
      instance = new VideoTemplateService();
    }
    return instance;
  },
  VideoTemplateService
};
