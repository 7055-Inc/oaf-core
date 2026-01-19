const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create upload directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../temp_images');
const productsDir = path.join(uploadDir, 'products');
const profilesDir = path.join(uploadDir, 'profiles');
const eventsDir = path.join(uploadDir, 'events');
const sitesDir = path.join(uploadDir, 'sites');
const juryDir = path.join(uploadDir, 'jury');
const categoriesDir = path.join(uploadDir, 'categories');
const articlesDir = path.join(uploadDir, 'articles');
[productsDir, profilesDir, eventsDir, sitesDir, juryDir, categoriesDir, articlesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'profile_image' || file.fieldname === 'header_image' || file.fieldname === 'logo_image' || file.fieldname === 'persona_image') {
      cb(null, profilesDir);
    } else if (file.fieldname === 'site_image') {
      cb(null, sitesDir);
    } else if (file.fieldname.startsWith('jury_')) {
      // All jury media goes to jury directory
      cb(null, juryDir);
    } else if (file.fieldname === 'images' && req.originalUrl && req.originalUrl.includes('/api/jury-packets/upload')) {
      // Jury packet images
      cb(null, juryDir);
    } else if (file.fieldname === 'images' && req.originalUrl && req.originalUrl.includes('/api/events/upload')) {
      cb(null, eventsDir);
    } else if (file.fieldname === 'images' && req.originalUrl && req.originalUrl.includes('/api/categories/upload')) {
      cb(null, categoriesDir);
    } else if (file.fieldname === 'images' && req.originalUrl && req.originalUrl.includes('/api/articles/upload')) {
      cb(null, articlesDir);
    } else {
      cb(null, productsDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    let filename;
    
    if (file.fieldname === 'profile_image' || file.fieldname === 'header_image' || file.fieldname === 'logo_image') {
      // For user profile/header/logo images
      const type = file.fieldname === 'profile_image' ? 'profile' : 
                   file.fieldname === 'header_image' ? 'header' : 'logo';
      filename = `${req.userId}-${type}-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`;
    } else if (file.fieldname === 'persona_image') {
      // For persona profile images
      const personaId = req.params.id || req.query.persona_id || 'new';
      filename = `${req.userId}-persona-${personaId}-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`;
    } else if (file.fieldname === 'site_image') {
      // For site images
      filename = `${req.userId}-site-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`;
    } else if (file.fieldname.startsWith('jury_')) {
      // For jury media files
      const juryType = file.fieldname.replace('jury_', '');
      filename = `${req.userId}-${juryType}-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`;
    } else if (file.fieldname === 'images' && req.originalUrl && req.originalUrl.includes('/api/jury-packets/upload')) {
      // For jury packet application images
      filename = `${req.userId}-packet-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`;
    } else if (file.fieldname === 'images' && req.originalUrl && req.originalUrl.includes('/api/events/upload')) {
      // For event images
      const eventId = req.query.event_id || 'new';
      filename = `${req.userId}-${eventId}-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`;
    } else if (file.fieldname === 'images' && req.originalUrl && req.originalUrl.includes('/api/categories/upload')) {
      // For category images
      const categoryId = req.query.category_id || 'new';
      filename = `${req.userId}-${categoryId}-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`;
    } else if (file.fieldname === 'images' && req.originalUrl && req.originalUrl.includes('/api/articles/upload')) {
      // For article images
      const articleId = req.query.article_id || 'new';
      filename = `${req.userId}-article-${articleId}-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`;
    } else {
      // For product images
      filename = `${req.userId}-${req.query.product_id}-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`;
    }
    
    cb(null, filename);
  }
});

// Create multer instance with common configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit (increased for jury videos)
  },
  fileFilter: (req, file, cb) => {
    // Allow videos for jury media fields
    if (file.fieldname.startsWith('jury_') && file.fieldname.includes('video')) {
      if (!file.originalname.match(/\.(mp4|mov|avi|wmv|webm)$/i)) {
        return cb(new Error('Only video files are allowed for jury videos!'), false);
      }
    } 
    // Allow images AND videos for jury packet uploads (application forms can have video fields)
    else if (req.originalUrl && req.originalUrl.includes('/api/jury-packets/upload')) {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|heic|heif|mp4|mov|avi|wmv|webm)$/i)) {
        return cb(new Error(`Only image or video files are allowed! Got: ${file.originalname}`), false);
      }
    }
    else {
      // Images only for all other fields - include HEIC for iPhone photos
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i)) {
        return cb(new Error(`Only image files are allowed! Got: ${file.originalname}`), false);
      }
    }
    cb(null, true);
  }
});

module.exports = upload; 