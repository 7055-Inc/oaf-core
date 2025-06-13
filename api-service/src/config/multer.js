const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create upload directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../temp_images');
const productsDir = path.join(uploadDir, 'products');
const profilesDir = path.join(uploadDir, 'profiles');

[productsDir, profilesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'profile_image' || file.fieldname === 'header_image') {
      cb(null, profilesDir);
    } else {
      cb(null, productsDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    let filename;
    
    if (file.fieldname === 'profile_image' || file.fieldname === 'header_image') {
      // For user profile/header images
      const type = file.fieldname === 'profile_image' ? 'profile' : 'header';
      filename = `${req.userId}-${type}-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`;
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
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

module.exports = upload; 