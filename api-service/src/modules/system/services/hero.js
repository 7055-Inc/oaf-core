/**
 * Hero Settings Service
 * 
 * Manages homepage hero section including:
 * - Text content (H1, H3, button)
 * - Video uploads and management
 * 
 * Data is stored in /public/static_media/hero.json
 */

const fs = require('fs').promises;
const path = require('path');

// Path to hero data and media
const STATIC_MEDIA_DIR = path.join(__dirname, '../../../../public/static_media');
const HERO_DATA_PATH = path.join(STATIC_MEDIA_DIR, 'hero.json');

/**
 * Get current hero data
 * @returns {Promise<Object>} Hero configuration
 */
async function getHeroData() {
  try {
    const data = await fs.readFile(HERO_DATA_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    // Return defaults if file doesn't exist
    return {
      h1Text: '',
      h3Text: '',
      buttonText: '',
      buttonUrl: '',
      videos: [],
      lastUpdated: null
    };
  }
}

/**
 * Save hero data
 * @param {Object} heroData - Hero configuration to save
 * @returns {Promise<Object>} Saved hero data
 */
async function saveHeroData(heroData) {
  const { h1Text, h3Text, buttonText, buttonUrl, videos } = heroData;

  // Ensure directory exists
  try {
    await fs.mkdir(STATIC_MEDIA_DIR, { recursive: true });
  } catch (err) {
    // Directory already exists
  }

  const dataToSave = {
    h1Text: h1Text?.trim() || '',
    h3Text: h3Text?.trim() || '',
    buttonText: buttonText?.trim() || '',
    buttonUrl: buttonUrl?.trim() || '',
    videos: videos || [],
    lastUpdated: new Date().toISOString()
  };

  await fs.writeFile(HERO_DATA_PATH, JSON.stringify(dataToSave, null, 2));
  return dataToSave;
}

/**
 * Add uploaded videos to hero data
 * @param {Array} uploadedVideos - Array of video objects with id, filename, originalName, size
 * @returns {Promise<Object>} Updated hero data
 */
async function addVideos(uploadedVideos) {
  const heroData = await getHeroData();
  heroData.videos = [...(heroData.videos || []), ...uploadedVideos];
  heroData.lastUpdated = new Date().toISOString();
  await fs.writeFile(HERO_DATA_PATH, JSON.stringify(heroData, null, 2));
  return heroData;
}

/**
 * Delete a video from hero data and filesystem
 * @param {string} videoId - ID of video to delete
 * @returns {Promise<Object>} Updated hero data
 */
async function deleteVideo(videoId) {
  const heroData = await getHeroData();
  
  // Find the video
  const videoToDelete = heroData.videos.find(v => v.id === videoId);
  if (!videoToDelete) {
    throw new Error('Video not found');
  }

  // Delete the file
  const videoPath = path.join(STATIC_MEDIA_DIR, videoToDelete.filename);
  try {
    await fs.unlink(videoPath);
  } catch (err) {
    console.warn('Video file not found, continuing with data cleanup:', err.message);
  }

  // Remove from data
  heroData.videos = heroData.videos.filter(v => v.id !== videoId);
  heroData.lastUpdated = new Date().toISOString();
  await fs.writeFile(HERO_DATA_PATH, JSON.stringify(heroData, null, 2));
  
  return heroData;
}

/**
 * Process uploaded video files
 * @param {Array} files - Array of uploaded file objects from multer
 * @returns {Promise<Array>} Array of processed video objects
 */
async function processVideoUploads(files) {
  const uploadedVideos = [];

  for (const file of files) {
    const videoId = `hero_video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const filename = `${videoId}.mp4`;
    const newPath = path.join(STATIC_MEDIA_DIR, filename);

    // Move file to static_media
    await fs.rename(file.path, newPath);

    uploadedVideos.push({
      id: videoId,
      filename: filename,
      originalName: file.originalname,
      size: file.size
    });
  }

  return uploadedVideos;
}

module.exports = {
  getHeroData,
  saveHeroData,
  addVideos,
  deleteVideo,
  processVideoUploads,
  STATIC_MEDIA_DIR
};
