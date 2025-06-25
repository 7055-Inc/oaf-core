import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ensure upload directory exists
    const uploadDir = join(process.cwd(), 'public', 'static_media');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (err) {
      console.log('Directory creation error (might already exist):', err.message);
    }

    const form = formidable({
      uploadDir: '/tmp', // Use temp directory first
      keepExtensions: true,
      maxFiles: 10,
      maxFileSize: 200 * 1024 * 1024, // 200MB limit
      maxFields: 100,
      allowEmptyFiles: false,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Form parsing error:', err);
          if (err.code === 'LIMIT_FILE_SIZE') {
            reject(new Error('File too large. Maximum size is 200MB.'));
          } else {
            reject(err);
          }
        } else {
          resolve([fields, files]);
        }
      });
    });

    console.log('Files received:', files);

    const uploadedVideos = [];
    const videoFiles = Array.isArray(files.videos) ? files.videos : [files.videos];

    for (const file of videoFiles) {
      if (file) {
        console.log('Processing file:', file);
        
        const videoId = `hero_video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const filename = `${videoId}.mp4`;
        
        // Move file from temp to static_media
        const newPath = join(uploadDir, filename);
        try {
          const fileContent = await readFile(file.filepath);
          await writeFile(newPath, fileContent);
        
        uploadedVideos.push({
          id: videoId,
          filename: filename,
          originalName: file.originalFilename,
          size: file.size
        });
          
          console.log('Successfully uploaded:', filename);
        } catch (fileError) {
          console.error('File processing error:', fileError);
          throw fileError;
        }
      }
    }

    res.status(200).json({ 
      success: true, 
      videos: uploadedVideos,
      message: `Successfully uploaded ${uploadedVideos.length} video(s)`
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload videos: ' + error.message });
  }
} 