const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const execAsync = promisify(exec);

/**
 * CaptionService - Whisper-based transcription and caption generation
 * 
 * Provides caption capabilities:
 * - Speech-to-text transcription (OpenAI Whisper API or self-hosted)
 * - SRT subtitle generation
 * - VTT subtitle generation
 * - Caption burning (embed captions in video)
 */
class CaptionService {
  constructor() {
    this.ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    this.tempDir = path.join(__dirname, '../../../../temp_images/marketing/video_temp');
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.whisperEndpoint = process.env.WHISPER_ENDPOINT || 'https://api.openai.com/v1/audio/transcriptions';
    this.useOpenAI = !!this.openaiApiKey; // Use OpenAI if key available, else self-hosted
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
   * Transcribe audio using Whisper (OpenAI API or self-hosted)
   * @param {string} audioPath - Path to audio file
   * @param {Object} options - Transcription options
   * @returns {Object} Transcription with timestamps
   */
  async transcribe(audioPath, options = {}) {
    const safePath = this._sanitizePath(audioPath);
    const { language = 'en', model = 'whisper-1' } = options;

    if (this.useOpenAI) {
      return await this._transcribeOpenAI(safePath, { language, model });
    } else {
      return await this._transcribeSelfHosted(safePath, { language });
    }
  }

  /**
   * Transcribe using OpenAI Whisper API
   */
  async _transcribeOpenAI(audioPath, options) {
    const FormData = require('form-data');
    const form = new FormData();
    
    try {
      const audioBuffer = await fs.readFile(audioPath);
      form.append('file', audioBuffer, {
        filename: path.basename(audioPath),
        contentType: 'audio/mpeg'
      });
      form.append('model', options.model || 'whisper-1');
      form.append('response_format', 'verbose_json'); // Get timestamps
      
      if (options.language) {
        form.append('language', options.language);
      }

      const response = await axios.post(this.whisperEndpoint, form, {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      // Transform OpenAI format to our format
      return {
        text: response.data.text,
        language: response.data.language,
        duration: response.data.duration,
        segments: response.data.segments || [],
        words: response.data.words || []
      };
    } catch (error) {
      throw new Error(`OpenAI transcription failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Transcribe using self-hosted Whisper
   * (Assumes whisper CLI or compatible API is available)
   */
  async _transcribeSelfHosted(audioPath, options) {
    // This assumes you have Whisper installed locally
    // Install: pip install openai-whisper
    const outputFormat = 'json';
    const language = options.language ? `--language ${options.language}` : '';
    const outputPath = path.join(this.tempDir, `transcript_${Date.now()}`);
    
    const command = `whisper "${audioPath}" \
      --model base \
      --output_format ${outputFormat} \
      --output_dir "${this.tempDir}" \
      ${language}`;

    try {
      await execAsync(command, { maxBuffer: 50 * 1024 * 1024 });
      
      // Read the generated JSON file
      const files = await fs.readdir(this.tempDir);
      const jsonFile = files.find(f => f.endsWith('.json') && f.includes('transcript'));
      
      if (!jsonFile) {
        throw new Error('Transcription output not found');
      }

      const transcriptPath = path.join(this.tempDir, jsonFile);
      const transcriptData = await fs.readFile(transcriptPath, 'utf8');
      const transcript = JSON.parse(transcriptData);

      // Cleanup
      await fs.unlink(transcriptPath).catch(() => {});

      return transcript;
    } catch (error) {
      throw new Error(`Self-hosted transcription failed: ${error.message}`);
    }
  }

  /**
   * Generate SRT subtitle file from transcription
   * @param {Object} transcription - Transcription object with segments
   * @returns {string} Path to SRT file
   */
  async generateSRT(transcription) {
    const srtPath = path.join(this.tempDir, `subtitles_${Date.now()}.srt`);
    
    if (!transcription.segments || transcription.segments.length === 0) {
      throw new Error('No segments in transcription');
    }

    let srtContent = '';
    transcription.segments.forEach((segment, index) => {
      const start = this._formatSRTTimestamp(segment.start);
      const end = this._formatSRTTimestamp(segment.end);
      const text = segment.text.trim();

      srtContent += `${index + 1}\n`;
      srtContent += `${start} --> ${end}\n`;
      srtContent += `${text}\n\n`;
    });

    await fs.writeFile(srtPath, srtContent, 'utf8');
    return srtPath;
  }

  /**
   * Format timestamp for SRT (HH:MM:SS,mmm)
   */
  _formatSRTTimestamp(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
  }

  /**
   * Generate VTT subtitle file from transcription (web-friendly)
   * @param {Object} transcription - Transcription object with segments
   * @returns {string} Path to VTT file
   */
  async generateVTT(transcription) {
    const vttPath = path.join(this.tempDir, `subtitles_${Date.now()}.vtt`);
    
    if (!transcription.segments || transcription.segments.length === 0) {
      throw new Error('No segments in transcription');
    }

    let vttContent = 'WEBVTT\n\n';
    transcription.segments.forEach((segment, index) => {
      const start = this._formatVTTTimestamp(segment.start);
      const end = this._formatVTTTimestamp(segment.end);
      const text = segment.text.trim();

      vttContent += `${index + 1}\n`;
      vttContent += `${start} --> ${end}\n`;
      vttContent += `${text}\n\n`;
    });

    await fs.writeFile(vttPath, vttContent, 'utf8');
    return vttPath;
  }

  /**
   * Format timestamp for VTT (HH:MM:SS.mmm)
   */
  _formatVTTTimestamp(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  }

  /**
   * Burn captions into video (hard-coded subtitles)
   * @param {string} videoPath - Path to video file
   * @param {string} srtPath - Path to SRT subtitle file
   * @param {Object} style - Caption style options
   * @returns {string} Path to output video with burned captions
   */
  async burnCaptions(videoPath, srtPath, style = {}) {
    const safeVideoPath = this._sanitizePath(videoPath);
    const safeSrtPath = this._sanitizePath(srtPath);
    const outputPath = path.join(this.tempDir, `captioned_${Date.now()}.mp4`);

    const {
      fontName = 'Arial',
      fontSize = 24,
      fontColor = 'white',
      outlineColor = 'black',
      outlineWidth = 2,
      position = 'bottom', // top, center, bottom
      backgroundColor = 'black@0.5'
    } = style;

    // Calculate vertical position
    const positionMap = {
      top: '(h-th-20)',
      center: '(h-th)/2',
      bottom: '20'
    };
    const marginV = positionMap[position] || positionMap.bottom;

    // Build subtitle filter
    const subtitlesFilter = `subtitles='${safeSrtPath}':force_style='FontName=${fontName},FontSize=${fontSize},PrimaryColour=&H${this._colorToASS(fontColor)},OutlineColour=&H${this._colorToASS(outlineColor)},Outline=${outlineWidth},MarginV=${marginV},BackColour=&H${this._colorToASS(backgroundColor)},Alignment=2'`;

    const command = `${this.ffmpegPath} -i "${safeVideoPath}" \
      -vf "${subtitlesFilter}" \
      -c:v libx264 -crf 23 -preset medium \
      -c:a copy \
      -movflags +faststart \
      "${outputPath}"`;

    try {
      await execAsync(command, { maxBuffer: 100 * 1024 * 1024 });
      return outputPath;
    } catch (error) {
      throw new Error(`Caption burning failed: ${error.message}`);
    }
  }

  /**
   * Convert web color to ASS subtitle format
   * (ASS uses AABBGGRR format)
   */
  _colorToASS(color) {
    const colorMap = {
      white: 'FFFFFF',
      black: '000000',
      red: '0000FF',
      green: '00FF00',
      blue: 'FF0000',
      yellow: '00FFFF',
      'black@0.5': '80000000' // Semi-transparent black
    };

    return colorMap[color] || 'FFFFFF';
  }

  /**
   * Transcribe video (extracts audio first, then transcribes)
   * @param {string} videoPath - Path to video file
   * @param {Object} options - Transcription options
   * @returns {Object} Transcription with timestamps
   */
  async transcribeVideo(videoPath, options = {}) {
    const safeVideoPath = this._sanitizePath(videoPath);
    
    // Extract audio first
    const audioPath = path.join(this.tempDir, `audio_${Date.now()}.mp3`);
    const extractCommand = `${this.ffmpegPath} -i "${safeVideoPath}" \
      -vn -acodec libmp3lame -b:a 192k \
      "${audioPath}"`;

    try {
      await execAsync(extractCommand);
      const transcription = await this.transcribe(audioPath, options);
      
      // Cleanup temp audio file
      await fs.unlink(audioPath).catch(() => {});
      
      return transcription;
    } catch (error) {
      throw new Error(`Video transcription failed: ${error.message}`);
    }
  }

  /**
   * Full caption workflow: transcribe + generate SRT/VTT + burn into video
   * @param {string} videoPath - Path to video file
   * @param {Object} options - Options for transcription and styling
   * @returns {Object} Paths to output files
   */
  async addCaptionsToVideo(videoPath, options = {}) {
    try {
      // Step 1: Transcribe video
      const transcription = await this.transcribeVideo(videoPath, {
        language: options.language
      });

      // Step 2: Generate subtitle files
      const srtPath = await this.generateSRT(transcription);
      const vttPath = await this.generateVTT(transcription);

      // Step 3: Burn captions into video (optional)
      let captionedVideoPath = null;
      if (options.burnCaptions !== false) {
        captionedVideoPath = await this.burnCaptions(videoPath, srtPath, options.style);
      }

      return {
        transcription,
        srtPath,
        vttPath,
        captionedVideoPath
      };
    } catch (error) {
      throw new Error(`Caption workflow failed: ${error.message}`);
    }
  }
}

// Export singleton
let instance = null;
module.exports = {
  getCaptionService: () => {
    if (!instance) {
      instance = new CaptionService();
    }
    return instance;
  },
  CaptionService
};
