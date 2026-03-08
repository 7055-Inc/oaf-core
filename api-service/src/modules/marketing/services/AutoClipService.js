const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const execAsync = promisify(exec);

/**
 * AutoClipService - Intelligent video clipping and scene analysis
 * 
 * Provides auto-clipping capabilities:
 * - Scene detection (find scene changes)
 * - Audio analysis (peaks, speech, silence)
 * - Highlight detection (best moments)
 * - Smart splitting for long content
 */
class AutoClipService {
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
    const sanitized = filePath.replace(/[;&|`$(){}[\]<>]/g, '');
    return path.normalize(sanitized);
  }

  /**
   * Detect scene changes in video
   * @param {string} videoPath - Path to video file
   * @param {Object} options - Detection options
   * @returns {Array} Array of scene timestamps
   */
  async detectScenes(videoPath, options = {}) {
    const safePath = this._sanitizePath(videoPath);
    const { 
      threshold = 0.4,  // Sensitivity (0.0 - 1.0, lower = more sensitive)
      minSceneDuration = 1.0 // Minimum scene duration in seconds
    } = options;

    const scenesFile = path.join(this.tempDir, `scenes_${Date.now()}.txt`);
    
    // Use FFmpeg's scene detection filter
    const command = `${this.ffmpegPath} -i "${safePath}" \
      -vf "select='gt(scene,${threshold})',showinfo" \
      -f null - 2>&1 | grep "pts_time" | awk '{print $12}' | cut -d: -f2 \
      > "${scenesFile}"`;

    try {
      await execAsync(command, { 
        shell: '/bin/bash',
        maxBuffer: 50 * 1024 * 1024 
      });

      // Read scene timestamps
      const content = await fs.readFile(scenesFile, 'utf8');
      const timestamps = content
        .trim()
        .split('\n')
        .filter(t => t)
        .map(t => parseFloat(t))
        .filter((t, i, arr) => !arr[i - 1] || (t - arr[i - 1]) >= minSceneDuration);

      // Cleanup
      await fs.unlink(scenesFile).catch(() => {});

      // Add start and end
      const duration = await this._getDuration(videoPath);
      const scenes = [0, ...timestamps, duration];

      // Convert to scene objects with start/end
      const sceneList = [];
      for (let i = 0; i < scenes.length - 1; i++) {
        sceneList.push({
          start: scenes[i],
          end: scenes[i + 1],
          duration: scenes[i + 1] - scenes[i]
        });
      }

      return sceneList;
    } catch (error) {
      throw new Error(`Scene detection failed: ${error.message}`);
    }
  }

  /**
   * Analyze audio for peaks, silence, and speech patterns
   * @param {string} videoPath - Path to video file
   * @returns {Object} Audio analysis data
   */
  async analyzeAudio(videoPath) {
    const safePath = this._sanitizePath(videoPath);
    
    try {
      // Detect silence periods
      const silencePeriods = await this._detectSilence(safePath);
      
      // Detect audio peaks/volume levels
      const volumeLevels = await this._analyzeVolume(safePath);
      
      // Find speech segments (inverse of silence + volume threshold)
      const speechSegments = this._findSpeechSegments(silencePeriods, volumeLevels);

      return {
        silencePeriods,
        volumeLevels,
        speechSegments,
        averageVolume: volumeLevels.average,
        peakVolume: volumeLevels.peak
      };
    } catch (error) {
      throw new Error(`Audio analysis failed: ${error.message}`);
    }
  }

  /**
   * Detect silence in audio
   */
  async _detectSilence(videoPath, options = {}) {
    const {
      noiseThreshold = -50, // dB
      minDuration = 0.5     // seconds
    } = options;

    const command = `${this.ffmpegPath} -i "${videoPath}" \
      -af silencedetect=noise=${noiseThreshold}dB:d=${minDuration} \
      -f null - 2>&1 | grep "silence_"`;

    try {
      const { stdout } = await execAsync(command, { 
        maxBuffer: 10 * 1024 * 1024 
      });

      const silencePeriods = [];
      const lines = stdout.split('\n');
      
      let currentSilence = {};
      for (const line of lines) {
        if (line.includes('silence_start')) {
          const match = line.match(/silence_start: ([\d.]+)/);
          if (match) {
            currentSilence.start = parseFloat(match[1]);
          }
        } else if (line.includes('silence_end')) {
          const match = line.match(/silence_end: ([\d.]+)/);
          if (match && currentSilence.start !== undefined) {
            currentSilence.end = parseFloat(match[1]);
            currentSilence.duration = currentSilence.end - currentSilence.start;
            silencePeriods.push({ ...currentSilence });
            currentSilence = {};
          }
        }
      }

      return silencePeriods;
    } catch (error) {
      // If no silence detected or error, return empty array
      return [];
    }
  }

  /**
   * Analyze volume levels throughout video
   */
  async _analyzeVolume(videoPath) {
    const command = `${this.ffmpegPath} -i "${videoPath}" \
      -af "volumedetect" \
      -f null - 2>&1`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024
      });

      const output = stdout + stderr;
      
      // Parse volumedetect output
      const meanMatch = output.match(/mean_volume: ([-\d.]+) dB/);
      const maxMatch = output.match(/max_volume: ([-\d.]+) dB/);

      return {
        average: meanMatch ? parseFloat(meanMatch[1]) : null,
        peak: maxMatch ? parseFloat(maxMatch[1]) : null
      };
    } catch (error) {
      return { average: null, peak: null };
    }
  }

  /**
   * Find speech segments from silence detection and volume analysis
   */
  _findSpeechSegments(silencePeriods, volumeLevels) {
    if (!silencePeriods || silencePeriods.length === 0) {
      return [];
    }

    const speechSegments = [];
    
    // Speech is between silence periods
    for (let i = 0; i < silencePeriods.length - 1; i++) {
      const speechStart = silencePeriods[i].end;
      const speechEnd = silencePeriods[i + 1].start;
      const duration = speechEnd - speechStart;

      if (duration > 0.5) { // At least 0.5 seconds of speech
        speechSegments.push({
          start: speechStart,
          end: speechEnd,
          duration
        });
      }
    }

    return speechSegments;
  }

  /**
   * Find highlights/best moments in video
   * @param {string} videoPath - Path to video file
   * @param {number} targetDuration - Target clip duration in seconds
   * @param {Object} options - Detection options
   * @returns {Array} Suggested highlight clips
   */
  async findHighlights(videoPath, targetDuration = 30, options = {}) {
    const safePath = this._sanitizePath(videoPath);
    
    try {
      // Get scene changes
      const scenes = await this.detectScenes(safePath);
      
      // Get audio analysis
      const audioAnalysis = await this.analyzeAudio(safePath);

      // Score each scene based on multiple factors
      const scoredScenes = scenes.map(scene => {
        let score = 0;

        // Prefer scenes with speech (high activity)
        const hasAudio = audioAnalysis.speechSegments.some(
          speech => speech.start <= scene.start && speech.end >= scene.end
        );
        if (hasAudio) score += 10;

        // Prefer scenes of appropriate length
        const durationScore = Math.max(0, 10 - Math.abs(scene.duration - targetDuration));
        score += durationScore;

        // Prefer scenes not too close to start/end
        const duration = scenes[scenes.length - 1].end;
        const position = scene.start / duration;
        if (position > 0.1 && position < 0.9) score += 5;

        return {
          ...scene,
          score
        };
      });

      // Sort by score and return top highlights
      const highlights = scoredScenes
        .sort((a, b) => b.score - a.score)
        .slice(0, options.maxHighlights || 5)
        .map(h => ({
          start: h.start,
          end: h.end,
          duration: h.duration,
          confidence: h.score / 25 // Normalize to 0-1
        }));

      return highlights;
    } catch (error) {
      throw new Error(`Highlight detection failed: ${error.message}`);
    }
  }

  /**
   * Split long video into even-duration clips
   * @param {string} videoPath - Path to video file
   * @param {number} maxDuration - Maximum duration per clip in seconds
   * @returns {Array} Array of clip definitions
   */
  async splitByDuration(videoPath, maxDuration = 60) {
    const safePath = this._sanitizePath(videoPath);
    const totalDuration = await this._getDuration(safePath);
    
    // Calculate number of clips needed
    const numClips = Math.ceil(totalDuration / maxDuration);
    const clipDuration = totalDuration / numClips;

    const clips = [];
    for (let i = 0; i < numClips; i++) {
      clips.push({
        start: i * clipDuration,
        end: Math.min((i + 1) * clipDuration, totalDuration),
        duration: Math.min(clipDuration, totalDuration - (i * clipDuration)),
        index: i + 1
      });
    }

    return clips;
  }

  /**
   * Smart split - split at scene changes rather than arbitrary points
   * @param {string} videoPath - Path to video file
   * @param {number} targetDuration - Target duration per clip
   * @returns {Array} Array of clip definitions
   */
  async smartSplit(videoPath, targetDuration = 60) {
    const safePath = this._sanitizePath(videoPath);
    
    try {
      const scenes = await this.detectScenes(safePath);
      const clips = [];
      let currentClip = null;

      for (const scene of scenes) {
        if (!currentClip) {
          currentClip = { start: scene.start, scenes: [scene] };
        } else {
          const currentDuration = scene.end - currentClip.start;
          
          if (currentDuration >= targetDuration) {
            // Close current clip
            currentClip.end = scene.start;
            currentClip.duration = currentClip.end - currentClip.start;
            clips.push(currentClip);
            
            // Start new clip
            currentClip = { start: scene.start, scenes: [scene] };
          } else {
            currentClip.scenes.push(scene);
          }
        }
      }

      // Add final clip
      if (currentClip) {
        currentClip.end = scenes[scenes.length - 1].end;
        currentClip.duration = currentClip.end - currentClip.start;
        clips.push(currentClip);
      }

      return clips.map((clip, i) => ({
        start: clip.start,
        end: clip.end,
        duration: clip.duration,
        index: i + 1,
        sceneCount: clip.scenes.length
      }));
    } catch (error) {
      throw new Error(`Smart split failed: ${error.message}`);
    }
  }

  /**
   * Get video duration
   */
  async _getDuration(videoPath) {
    const command = `${this.ffprobePath} -v quiet -print_format json -show_format "${videoPath}"`;
    
    try {
      const { stdout } = await execAsync(command);
      const metadata = JSON.parse(stdout);
      return parseFloat(metadata.format.duration);
    } catch (error) {
      throw new Error(`Failed to get duration: ${error.message}`);
    }
  }

  /**
   * Generate preview clips from highlights
   * @param {string} videoPath - Path to video file
   * @param {Array} highlights - Array of highlight definitions
   * @returns {Array} Paths to generated clips
   */
  async generateHighlightClips(videoPath, highlights) {
    const safePath = this._sanitizePath(videoPath);
    const { getVideoService } = require('./VideoService');
    const videoService = getVideoService();

    const clipPaths = [];
    
    for (let i = 0; i < highlights.length; i++) {
      const highlight = highlights[i];
      const clipPath = await videoService.extractClip(
        safePath,
        highlight.start,
        highlight.duration
      );
      clipPaths.push(clipPath);
    }

    return clipPaths;
  }
}

// Export singleton
let instance = null;
module.exports = {
  getAutoClipService: () => {
    if (!instance) {
      instance = new AutoClipService();
    }
    return instance;
  },
  AutoClipService
};
