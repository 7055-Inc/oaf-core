import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

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
    const form = formidable({
      uploadDir: path.join(process.cwd(), 'public/static_media/categories'),
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ mimetype }) => {
        return mimetype && mimetype.includes('image');
      },
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(500).json({ error: 'Upload failed' });
      }

      const { categoryId, imageType } = fields; // imageType: 'hero' or 'banner'
      const uploadedFile = files.image;

      if (!uploadedFile || !categoryId || !imageType) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const originalName = uploadedFile.originalFilename;
      const extension = path.extname(originalName);
      const newFilename = `category_${categoryId}_${imageType}_${timestamp}${extension}`;
      const newPath = path.join(process.cwd(), 'public/static_media/categories', newFilename);

      // Rename the uploaded file
      fs.renameSync(uploadedFile.filepath, newPath);

      // Create the public URL
      const publicUrl = `/static_media/categories/${newFilename}`;

      // Create metadata file for the category
      const metadataPath = path.join(process.cwd(), 'public/static_media/categories', `category_${categoryId}.json`);
      let metadata = {};
      
      if (fs.existsSync(metadataPath)) {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      }

      // Update metadata
      metadata[imageType] = {
        filename: newFilename,
        originalName: originalName,
        url: publicUrl,
        size: uploadedFile.size,
        uploadedAt: new Date().toISOString(),
        type: imageType
      };
      metadata.lastUpdated = new Date().toISOString();

      // Save metadata
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      res.status(200).json({
        success: true,
        url: publicUrl,
        filename: newFilename,
        metadata: metadata[imageType]
      });
    });
  } catch (error) {
    console.error('Category image upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
} 