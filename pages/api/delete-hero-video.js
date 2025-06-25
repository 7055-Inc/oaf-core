import { unlink } from 'fs/promises';
import { join } from 'path';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }

    // Load current hero data to find the video filename
    const { readFile, writeFile } = await import('fs/promises');
    const heroDataPath = join(process.cwd(), 'public', 'static_media', 'hero.json');
    
    let heroData = { videos: [] };
    try {
      const heroDataContent = await readFile(heroDataPath, 'utf8');
      heroData = JSON.parse(heroDataContent);
    } catch (err) {
      // File doesn't exist or is invalid, start with empty data
    }

    // Find the video to delete
    const videoToDelete = heroData.videos.find(v => v.id === videoId);
    if (!videoToDelete) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Delete the video file
    const videoPath = join(process.cwd(), 'public', 'static_media', videoToDelete.filename);
    try {
      await unlink(videoPath);
    } catch (err) {
      console.warn('Video file not found, continuing with data cleanup:', err.message);
    }

    // Remove video from hero data
    heroData.videos = heroData.videos.filter(v => v.id !== videoId);

    // Save updated hero data
    await writeFile(heroDataPath, JSON.stringify(heroData, null, 2));

    res.status(200).json({ 
      success: true, 
      message: 'Video deleted successfully',
      remainingVideos: heroData.videos.length
    });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
} 