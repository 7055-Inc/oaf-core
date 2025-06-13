const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');
const upload = require('../config/multer');
const path = require('path');
const fs = require('fs');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  console.log('Verifying token for request:', req.method, req.url, 'Headers:', req.headers);
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log('No token provided');
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.roles = decoded.roles;
    console.log('Token verified, userId:', req.userId);
    next();
  } catch (err) {
    console.log('Invalid token:', err.message);
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// GET /products - Retrieve all products with optional filters
router.get('/', async (req, res) => {
  try {
    const { vendor_id, category_id, status } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (vendor_id) {
      query += ' AND vendor_id = ?';
      params.push(vendor_id);
    }
    if (category_id) {
      query += ' AND category_id = ?';
      params.push(category_id);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    const [products] = await db.query(query, params);
    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /products/:id - Retrieve a single product with shipping details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [product] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    if (!product.length) return res.status(404).json({ error: 'Product not found' });

    // Get temp images for this product using the new naming pattern
    const [tempImages] = await db.query(
      'SELECT image_path FROM pending_images WHERE image_path LIKE ? AND status = ?',
      [`/temp_images/products/${product[0].vendor_id}-${id}-%`, 'pending']
    );

    // Get permanent product images
    const [permanentImages] = await db.query(
      'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC',
      [id]
    );

    // Combine both sets of images
    const allImages = [
      ...permanentImages.map(img => img.image_url),
      ...tempImages.map(img => img.image_path)
    ];

    // Get shipping details
    const [shipping] = await db.query('SELECT * FROM product_shipping WHERE product_id = ?', [id]);
    
    res.json({ 
      ...product[0], 
      images: allImages,
      shipping: shipping[0] || {} 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /products - Create a new product
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      name, description, short_description, price, available_qty, category_id, sku, status,
      width, height, depth, weight, dimension_unit, weight_unit, parent_id, product_type,
      package_number, length, shipping_type, shipping_services, ship_method, ship_rate
    } = req.body;

    // Validate required fields
    if (!name || !price || !available_qty || !category_id || !sku) {
      return res.status(400).json({ error: 'Name, price, available quantity, category ID, and SKU are required' });
    }

    // Validate parent_id if provided
    let validatedParentId = parent_id || null;
    if (parent_id) {
      const [parentProduct] = await db.query('SELECT id FROM products WHERE id = ?', [parent_id]);
      if (!parentProduct.length) {
        return res.status(400).json({ error: 'Invalid parent_id: Parent product does not exist' });
      }
      validatedParentId = parent_id;
    }

    // Insert product
    const [result] = await db.query(
      'INSERT INTO products (vendor_id, name, description, short_description, price, available_qty, category_id, sku, status, width, height, depth, weight, dimension_unit, weight_unit, parent_id, product_type, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.userId, name, description, short_description, price, available_qty, category_id, sku, status || 'draft',
       width || null, height || null, depth || null, weight || null, dimension_unit, weight_unit, validatedParentId, product_type, req.userId, req.userId]
    );

    const productId = result.insertId;

    // Convert empty numeric fields to null for product_shipping
    const shippingLength = length || null; // Correctly map form's length to product_shipping.length
    const shippingWidth = width || null;
    const shippingHeight = height || null;
    const shippingWeight = weight || null;
    const shippingRate = ship_rate || null;

    // Insert shipping details with logging
    let shippingResult;
    if (package_number || shipping_type || shipping_services || ship_method || shippingRate || shippingLength || shippingWidth || shippingHeight || shippingWeight || dimension_unit || weight_unit) {
      console.log('[Shipping Insert] Attempting to insert shipping data:', { productId, package_number, shippingLength, shippingWidth, shippingHeight, shippingWeight, dimension_unit, weight_unit, ship_method, shippingRate, shipping_type, shipping_services });
      [shippingResult] = await db.query(
        'INSERT INTO product_shipping (product_id, package_number, length, width, height, weight, dimension_unit, weight_unit, ship_method, ship_rate, shipping_type, shipping_services) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [productId, package_number || 1, shippingLength, shippingWidth, shippingHeight, shippingWeight, dimension_unit, weight_unit, ship_method || 'free', shippingRate, shipping_type || 'free', shipping_services]
      );
      console.log('[Shipping Insert] Success:', shippingResult);
    }

    const [newProduct] = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
    res.status(201).json(newProduct[0]);
  } catch (err) {
    console.error('Error creating product:', err.message);
    res.status(500).json({ error: `Failed to create product: ${err.message}` });
  }
});

// PUT /products/:id - Update a product
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, description, short_description, price, available_qty, category_id, sku, status,
      width, height, depth, weight, dimension_unit, weight_unit, parent_id, product_type,
      package_number, length, shipping_type, shipping_services, ship_method, ship_rate,
      images
    } = req.body;

    // Check if product exists and belongs to the vendor
    const [product] = await db.query('SELECT * FROM products WHERE id = ? AND vendor_id = ?', [id, req.userId]);
    if (!product.length) return res.status(404).json({ error: 'Product not found or not authorized' });

    // Validate parent_id if provided
    let validatedParentId = parent_id || null;
    if (parent_id) {
      const [parentProduct] = await db.query('SELECT id FROM products WHERE id = ?', [parent_id]);
      if (!parentProduct.length) {
        return res.status(400).json({ error: 'Invalid parent_id: Parent product does not exist' });
      }
      validatedParentId = parent_id;
    }

    // Update product
    await db.query(
      'UPDATE products SET name = ?, description = ?, short_description = ?, price = ?, available_qty = ?, category_id = ?, sku = ?, status = ?, width = ?, height = ?, depth = ?, weight = ?, dimension_unit = ?, weight_unit = ?, parent_id = ?, product_type = ?, updated_by = ? WHERE id = ?',
      [name || product[0].name, description || product[0].description, short_description || product[0].short_description,
       price || product[0].price, available_qty || product[0].available_qty, category_id || product[0].category_id,
       sku || product[0].sku, status || product[0].status, width || product[0].width, height || product[0].height,
       depth || product[0].depth, weight || product[0].weight, dimension_unit || product[0].dimension_unit,
       weight_unit || product[0].weight_unit, validatedParentId, product_type || product[0].product_type,
       req.userId, id]
    );

    // Handle images
    if (Array.isArray(images)) {
      // First, delete existing images
      await db.query('DELETE FROM product_images WHERE product_id = ?', [id]);
      
      // Then insert new images
      for (let i = 0; i < images.length; i++) {
        const imageUrl = images[i];
        await db.query(
          'INSERT INTO product_images (product_id, image_url, `order`) VALUES (?, ?, ?)',
          [id, imageUrl, i]
        );
      }
    }

    // Convert empty numeric fields to null for product_shipping
    const shippingLength = length || null;
    const shippingWidth = width || null;
    const shippingHeight = height || null;
    const shippingWeight = weight || null;
    const shippingRate = ship_rate || null;

    // Update shipping details
    let shippingResult;
    if (package_number || shipping_type || shipping_services || ship_method || shippingRate || shippingLength || shippingWidth || shippingHeight || shippingWeight || dimension_unit || weight_unit) {
      const [existingShipping] = await db.query('SELECT * FROM product_shipping WHERE product_id = ?', [id]);
      if (existingShipping.length) {
        [shippingResult] = await db.query(
          'UPDATE product_shipping SET package_number = ?, length = ?, width = ?, height = ?, weight = ?, dimension_unit = ?, weight_unit = ?, ship_method = ?, ship_rate = ?, shipping_type = ?, shipping_services = ? WHERE product_id = ?',
          [package_number || existingShipping[0].package_number, shippingLength || existingShipping[0].length,
           shippingWidth || existingShipping[0].width, shippingHeight || existingShipping[0].height, shippingWeight || existingShipping[0].weight,
           dimension_unit || existingShipping[0].dimension_unit, weight_unit || existingShipping[0].weight_unit,
           ship_method || existingShipping[0].ship_method, shippingRate || existingShipping[0].ship_rate,
           shipping_type || existingShipping[0].shipping_type, shipping_services || existingShipping[0].shipping_services, id]
        );
      } else {
        [shippingResult] = await db.query(
          'INSERT INTO product_shipping (product_id, package_number, length, width, height, weight, dimension_unit, weight_unit, ship_method, ship_rate, shipping_type, shipping_services) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, package_number || 1, shippingLength, shippingWidth, shippingHeight, shippingWeight, dimension_unit, weight_unit, ship_method || 'free', shippingRate, shipping_type || 'free', shipping_services]
        );
      }
    }

    // Get updated product with images
    const [updatedProduct] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    const [productImages] = await db.query(
      'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC',
      [id]
    );
    res.json({ 
      ...updatedProduct[0], 
      images: productImages.map(img => img.image_url) 
    });
  } catch (err) {
    console.error('Error updating product:', err.message);
    res.status(500).json({ error: `Failed to update product: ${err.message}` });
  }
});

// POST /products/upload - Upload product images
router.post('/upload', 
  verifyToken,
  upload.array('images'),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const { product_id } = req.query;
      if (!product_id) {
        return res.status(400).json({ error: 'Product ID is required' });
      }

      // Verify product belongs to vendor
      const [product] = await db.query('SELECT id FROM products WHERE id = ? AND vendor_id = ?', [product_id, req.userId]);
      if (!product.length) {
        return res.status(404).json({ error: 'Product not found or not authorized' });
      }

      const urls = [];
      
      // Record temp image URLs with product_id
      for (const file of req.files) {
        const imagePath = `/temp_images/products/${file.filename}`;
        // Insert into pending_images
        await db.query(
          'INSERT INTO pending_images (user_id, image_path, status) VALUES (?, ?, ?)',
          [req.userId, imagePath, 'pending']
        );
        
        // Also insert into product_images
        await db.query(
          'INSERT INTO product_images (product_id, image_url, `order`) VALUES (?, ?, ?)',
          [product_id, imagePath, 0]
        );
        
        urls.push(imagePath);
      }

      res.json({ urls });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: err.message || 'Failed to upload images' });
    }
  }
);

module.exports = router;