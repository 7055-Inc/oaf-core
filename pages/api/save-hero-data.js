import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { h1Text, h3Text, buttonText, buttonUrl, videos } = req.body;

    // Validate required fields
    if (!h1Text || !h3Text || !buttonText || !buttonUrl) {
      return res.status(400).json({ error: 'All text fields are required' });
    }

    // Ensure static_media directory exists
    const staticMediaDir = join(process.cwd(), 'public', 'static_media');
    try {
      await mkdir(staticMediaDir, { recursive: true });
    } catch (err) {
      // Directory already exists
    }

    // Prepare hero data
    const heroData = {
      h1Text: h1Text.trim(),
      h3Text: h3Text.trim(),
      buttonText: buttonText.trim(),
      buttonUrl: buttonUrl.trim(),
      videos: videos || [],
      lastUpdated: new Date().toISOString()
    };

    // Save to JSON file
    const heroDataPath = join(staticMediaDir, 'hero.json');
    await writeFile(heroDataPath, JSON.stringify(heroData, null, 2));

    res.status(200).json({ 
      success: true, 
      message: 'Hero data saved successfully',
      data: heroData
    });

  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Failed to save hero data' });
  }
} 