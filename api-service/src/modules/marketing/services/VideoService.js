const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const execAsync = promisify(exec);

/**
 * VideoService - FFmpeg-based video processing
 * 
 * Provides video manipulation capabilities:
 * - Format conversion (MP4, WebM, MOV)
 * - Resizing and cropping
 * - Clip extraction and combination
 * - Audio extraction
 * - Thumbnail generation
 * - Platform-specific adaptation
 */
class VideoService {
  constructor() {
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    this.ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';
    this.tempDir = path.join(__dirname, '../../../../temp_images/marketing/video_temp');
    this._ensureTempDir();
  }

  async _ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  /**
   * Sanitize file path to prevent injection attacks
   */
  _sanitizePath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path');
    }
    // Remove any shell metacharacters
    const sanitized = filePath.replace(/[;&|`$(){}[\]<>]/g, '');
    return path.normalize(sanitized);
  }

  /**
   * Get video metadata using ffprobe
   */
  async getMetadata(inputPath) {
    const safePath = this._sanitizePath(inputPath);
    const command = `${this.ffprobePath} -v quiet -print_format json -show_format -show_streams "${safePath}"`;
    
    try {
      const { stdout } = await execAsync(command);
      return JSON.parse(stdout);
    } catch (error) {
      throw new Error(`Failed to get video metadata: ${error.message}`);
    }
  }

  /**
   * Convert video format
   * @param {string} inputPath - Input video file path
   * @param {string} outputFormat - Target format (mp4, webm, mov)
   * @param {Object} options - Conversion options
   * @returns {string} Output file path
   */
  async convertFormat(inputPath, outputFormat, options = {}) {
    const safePath = this._sanitizePath(inputPath);
    const outputPath = path.join(
      this.tempDir,
      `converted_${Date.now()}.${outputFormat}`
    );

    const {
      videoCodec = outputFormat === 'webm' ? 'libvpx-vp9' : 'libx264',
      audioCodec = outputFormat === 'webm' ? 'libopus' : 'aac',
      quality = 'medium', // low, medium, high
      preset = 'medium'   // ultrafast, fast, medium, slow
    } = options;

    // Quality presets
    const qualityMap = {
      low: '-crf 28',
      medium: '-crf 23',
      high: '-crf 18'
    };

    const command = `${this.ffmpegPath} -i "${safePath}" \
      -c:v ${videoCodec} ${qualityMap[quality]} -preset ${preset} \
      -c:a ${audioCodec} -b:a 128k \
      -movflags +faststart \
      "${outputPath}"`;

    try {
      await execAsync(command, { maxBuffer: 100 * 1024 * 1024 }); // 100MB buffer
      return outputPath;
    } catch (error) {
      throw new Error(`Format conversion failed: ${error.message}`);
    }
  }

  /**
   * Resize video
   * @param {string} inputPath - Input video file path
   * @param {number} width - Target width
   * @param {number} height - Target height
   * @param {Object} options - Resize options
   * @returns {string} Output file path
   */
  async resize(inputPath, width, height, options = {}) {
    const safePath = this._sanitizePath(inputPath);
    const outputPath = path.join(
      this.tempDir,
      `resized_${Date.now()}.mp4`
    );

    const {
      maintainAspect = true,
      crop = false,
      backgroundColor = 'black'
    } = options;

    let scaleFilter;
    if (maintainAspect && !crop) {
      // Scale to fit within dimensions (letterbox/pillarbox)
      scaleFilter = `scale='min(${width},iw)':min'(${height},ih)':force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:${backgroundColor}`;
    } else if (crop) {
      // Scale and crop to exact dimensions
      scaleFilter = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
    } else {
      // Stretch to exact dimensions (not recommended)
      scaleFilter = `scale=${width}:${height}`;
    }

    const command = `${this.ffmpegPath} -i "${safePath}" \
      -vf "${scaleFilter}" \
      -c:v libx264 -crf 23 -preset medium \
      -c:a aac -b:a 128k \
      -movflags +faststart \
      "${outputPath}"`;

    try {
      await execAsync(command, { maxBuffer: 100 * 1024 * 1024 });
      return outputPath;
    } catch (error) {
      throw new Error(`Resize failed: ${error.message}`);
    }
  }

  /**
   * Extract clip from video
   * @param {string} inputPath - Input video file path
   * @param {number} startTime - Start time in seconds
   * @param {number} duration - Duration in seconds
   * @returns {string} Output file path
   */
  async extractClip(inputPath, startTime, duration) {
    const safePath = this._sanitizePath(inputPath);
    const outputPath = path.join(
      this.tempDir,
      `clip_${Date.now()}.mp4`
    );

    // Use stream copy for fast extraction (no re-encoding)
    const command = `${this.ffmpegPath} -ss ${startTime} -i "${safePath}" \
      -t ${duration} \
      -c copy \
      -movflags +faststart \
      "${outputPath}"`;

    try {
      await execAsync(command);
      return outputPath;
    } catch (error) {
      throw new Error(`Clip extraction failed: ${error.message}`);
    }
  }

  /**
   * Combine multiple clips into one video
   * @param {Array<string>} clipPaths - Array of video file paths
   * @param {string} outputPath - Output file path
   * @returns {string} Output file path
   */
  async combineClips(clipPaths, outputPath = null) {
    if (!clipPaths || clipPaths.length === 0) {
      throw new Error('No clips provided');
    }

    const safeOutput = outputPath || path.join(
      this.tempDir,
      `combined_${Date.now()}.mp4`
    );

    // Create concat file list
    const concatListPath = path.join(this.tempDir, `concat_${Date.now()}.txt`);
    const concatContent = clipPaths
      .map(p => `file '${this._sanitizePath(p)}'`)
      .join('\n');
    
    await fs.writeFile(concatListPath, concatContent);

    const command = `${this.ffmpegPath} -f concat -safe 0 -i "${concatListPath}" \
      -c copy \
      -movflags +faststart \
      "${safeOutput}"`;

    try {
      await execAsync(command);
      // Cleanup concat file
      await fs.unlink(concatListPath).catch(() => {});
      return safeOutput;
    } catch (error) {
      throw new Error(`Clip combination failed: ${error.message}`);
    }
  }

  /**
   * Extract audio track from video
   * @param {string} inputPath - Input video file path
   * @returns {string} Output audio file path
   */
  async extractAudio(inputPath) {
    const safePath = this._sanitizePath(inputPath);
    const outputPath = path.join(
      this.tempDir,
      `audio_${Date.now()}.mp3`
    );

    const command = `${this.ffmpegPath} -i "${safePath}" \
      -vn -acodec libmp3lame -b:a 192k \
      "${outputPath}"`;

    try {
      await execAsync(command);
      return outputPath;
    } catch (error) {
      throw new Error(`Audio extraction failed: ${error.message}`);
    }
  }

  /**
   * Generate thumbnail from video
   * @param {string} inputPath - Input video file path
   * @param {number} timestamp - Time in seconds to capture frame
   * @returns {string} Output image file path
   */
  async generateThumbnail(inputPath, timestamp = 1) {
    const safePath = this._sanitizePath(inputPath);
    const outputPath = path.join(
      this.tempDir,
      `thumbnail_${Date.now()}.jpg`
    );

    const command = `${this.ffmpegPath} -ss ${timestamp} -i "${safePath}" \
      -vframes 1 -q:v 2 \
      "${outputPath}"`;

    try {
      await execAsync(command);
      return outputPath;
    } catch (error) {
      throw new Error(`Thumbnail generation failed: ${error.message}`);
    }
  }

  /**
   * Platform-specific video adaptation presets
   */
  _getPlatformPreset(platform) {
    const presets = {
      instagram_feed: { width: 1080, height: 1080, crop: true },
      instagram_story: { width: 1080, height: 1920, crop: true },
      instagram_reel: { width: 1080, height: 1920, crop: true },
      tiktok: { width: 1080, height: 1920, crop: true },
      youtube: { width: 1920, height: 1080, maintainAspect: true },
      youtube_short: { width: 1080, height: 1920, crop: true },
      facebook: { width: 1280, height: 720, maintainAspect: true },
      twitter: { width: 1280, height: 720, maintainAspect: true },
      pinterest: { width: 1000, height: 1500, crop: true }
    };

    return presets[platform] || { width: 1920, height: 1080, maintainAspect: true };
  }

  /**
   * Adapt video for specific platform
   * @param {string} inputPath - Input video file path
   * @param {string} platform - Target platform
   * @returns {string} Output file path
   */
  async adaptForPlatform(inputPath, platform) {
    const preset = this._getPlatformPreset(platform);
    
    try {
      const resizedPath = await this.resize(
        inputPath,
        preset.width,
        preset.height,
        {
          maintainAspect: preset.maintainAspect !== false,
          crop: preset.crop || false
        }
      );

      return resizedPath;
    } catch (error) {
      throw new Error(`Platform adaptation failed for ${platform}: ${error.message}`);
    }
  }

  /**
   * Get video duration in seconds
   */
  async getDuration(inputPath) {
    try {
      const metadata = await this.getMetadata(inputPath);
      return parseFloat(metadata.format.duration);
    } catch (error) {
      throw new Error(`Failed to get duration: ${error.message}`);
    }
  }

  /**
   * Clean up old temporary files
   */
  async cleanupOldFiles(maxAgeHours = 24) {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

// Export singleton
let instance = null;
module.exports = {
  getVideoService: () => {
    if (!instance) {
      instance = new VideoService();
    }
    return instance;
  },
  VideoService
};
