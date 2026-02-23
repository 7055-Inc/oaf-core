#!/usr/bin/env node

/**
 * Video Processor Cron Job
 * 
 * Processes queued video jobs asynchronously
 * Run every minute: * * * * * node api-service/cron/video-processor.js
 * 
 * Video processing is CPU-intensive, so we process one job at a time
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
// Fallback: also load root .env if api-service .env doesn't have DB vars
if (!process.env.DB_HOST) require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const db = require('../config/db');
const fs = require('fs').promises;

// db is a mysql2/promise pool — db.execute() and db.query() already return promises
// Wrapper to keep existing code compatible (destructures rows from [rows, fields])
async function query(sql, params) {
  const [rows] = await db.execute(sql, params);
  return rows;
}

// Import video services
const { getVideoService } = require('../src/modules/marketing/services/VideoService');
const { getCaptionService } = require('../src/modules/marketing/services/CaptionService');
const { getAutoClipService } = require('../src/modules/marketing/services/AutoClipService');
const { getVideoTemplateService } = require('../src/modules/marketing/services/VideoTemplateService');
const { AssetService } = require('../src/modules/marketing/services');

/**
 * Process a single video job
 */
async function processJob(job) {
  console.log(`Processing job ${job.id} (type: ${job.type})`);
  
  try {
    // Update job status to processing
    await query(
      'UPDATE video_jobs SET status = ?, started_at = NOW() WHERE id = ?',
      ['processing', job.id]
    );

    // Get input asset
    const [inputAsset] = await query(
      'SELECT * FROM marketing_assets WHERE id = ?',
      [job.input_asset_id]
    );

    if (!inputAsset) {
      throw new Error('Input asset not found');
    }

    const config = typeof job.config === 'string' ? JSON.parse(job.config) : job.config;
    let outputPath = null;
    let result = null;

    // Process based on job type
    switch (job.type) {
      case 'convert':
        const videoService = getVideoService();
        outputPath = await videoService.convertFormat(
          inputAsset.file_path,
          config.outputFormat || 'mp4',
          config.options || {}
        );
        break;

      case 'clip':
        const clipService = getVideoService();
        outputPath = await clipService.extractClip(
          inputAsset.file_path,
          config.startTime,
          config.duration
        );
        break;

      case 'caption':
        const captionService = getCaptionService();
        result = await captionService.addCaptionsToVideo(
          inputAsset.file_path,
          {
            language: config.language || 'en',
            style: config.style || {},
            burnCaptions: config.burnCaptions !== false
          }
        );
        outputPath = result.captionedVideoPath;
        break;

      case 'auto_clip':
        const autoClipService = getAutoClipService();
        const highlights = await autoClipService.findHighlights(
          inputAsset.file_path,
          config.targetDuration || 30,
          { maxHighlights: config.maxClips || 5 }
        );
        
        // Generate clips
        const clipPaths = await autoClipService.generateHighlightClips(
          inputAsset.file_path,
          highlights
        );
        
        // Store first clip as output, store rest in config
        outputPath = clipPaths[0];
        result = { clips: clipPaths, highlights };
        break;

      case 'template':
        const templateService = getVideoTemplateService();
        outputPath = await templateService.applyTemplate(
          inputAsset.file_path,
          config.templateId,
          config.options || {}
        );
        break;

      case 'adapt':
        const adaptService = getVideoService();
        outputPath = await adaptService.adaptForPlatform(
          inputAsset.file_path,
          config.platform
        );
        break;

      case 'analyze':
        const analyzeService = getAutoClipService();
        const [scenes, audioAnalysis] = await Promise.all([
          analyzeService.detectScenes(inputAsset.file_path),
          analyzeService.analyzeAudio(inputAsset.file_path)
        ]);
        
        // Store analysis in video_analysis table
        await query(
          `INSERT INTO video_analysis (asset_id, scenes, audio_peaks, analyzed_at) 
           VALUES (?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE scenes = ?, audio_peaks = ?, analyzed_at = NOW()`,
          [
            job.input_asset_id,
            JSON.stringify(scenes),
            JSON.stringify(audioAnalysis),
            JSON.stringify(scenes),
            JSON.stringify(audioAnalysis)
          ]
        );
        
        result = { scenes, audioAnalysis };
        break;

      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    // Create output asset if we have an output file
    let outputAssetId = null;
    if (outputPath) {
      // Get file stats
      const stats = await fs.stat(outputPath);
      
      const assetResult = await AssetService.createAsset({
        owner_type: inputAsset.owner_type,
        owner_id: inputAsset.owner_id,
        type: 'video',
        file_path: outputPath,
        metadata: JSON.stringify({
          jobId: job.id,
          jobType: job.type,
          size: stats.size,
          processedAt: new Date().toISOString()
        })
      });

      outputAssetId = assetResult.assetId;
    }

    // Update job to completed
    await query(
      'UPDATE video_jobs SET status = ?, output_asset_id = ?, progress = 100, completed_at = NOW() WHERE id = ?',
      ['completed', outputAssetId, job.id]
    );

    console.log(`Job ${job.id} completed successfully`);
    return { success: true, outputAssetId };

  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    
    // Update job to failed
    await query(
      'UPDATE video_jobs SET status = ?, error_message = ?, completed_at = NOW() WHERE id = ?',
      ['failed', error.message, job.id]
    );

    return { success: false, error: error.message };
  }
}

/**
 * Main processor function
 */
async function processVideoQueue() {
  try {
    console.log('[Video Processor] Starting...');

    // Get next pending job (FIFO order)
    const [job] = await query(
      `SELECT * FROM video_jobs 
       WHERE status = 'pending' 
       ORDER BY created_at ASC 
       LIMIT 1`
    );

    if (!job) {
      console.log('[Video Processor] No pending jobs');
      return;
    }

    // Process the job
    await processJob(job);

    // Check for more jobs (recursive, but only process one per cron run to avoid overload)
    const [nextJob] = await query(
      `SELECT COUNT(*) as count FROM video_jobs WHERE status = 'pending'`
    );

    if (nextJob.count > 0) {
      console.log(`[Video Processor] ${nextJob.count} jobs remaining in queue`);
    }

  } catch (error) {
    console.error('[Video Processor] Error:', error);
  } finally {
    // Close database connection
    try { await db.end(); } catch {}
    console.log('[Video Processor] Complete');
    process.exit(0);
  }
}

// Run processor
processVideoQueue();
