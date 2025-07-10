const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');
const upload = require('../config/multer');
const path = require('path');
const fs = require('fs');
const { secureLogger } = require('../middleware/secureLogger');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.roles = decoded.roles;
    next();
  } catch (err) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// GET /products - Retrieve all products with optional filters (smart parent/child handling)
router.get('/', async (req, res) => {
  try {
    const { vendor_id, category_id, status, variant_search } = req.query;
    
    let query;
    const params = [];
    
    // Smart parent/child logic:
    // - If variant_search=true: Show child products that match criteria, one per parent
    // - If variant_search=false or not set: Show only parent products
    if (variant_search === 'true') {
      // Show child products (variants), but only one per parent, and include standalone products
      query = `
        SELECT p.* FROM products p
        WHERE (
          -- Standalone products (no parent, no children)
          (p.parent_id IS NULL AND NOT EXISTS (
            SELECT 1 FROM products child WHERE child.parent_id = p.id
          ))
          OR
          -- One child product per parent (the first active one)
          (p.parent_id IS NOT NULL AND p.id = (
            SELECT MIN(child.id) 
            FROM products child 
            WHERE child.parent_id = p.parent_id 
            AND child.status = 'active'
          ))
        )
      `;
    } else {
      // Default: Show only parent products (simple products + variable product parents)
      // Hide child variation products from public listings
      query = 'SELECT * FROM products WHERE parent_id IS NULL';
    }

    // Add additional filters
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
    secureLogger.error('Error fetching products', err);
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

// GET /products/:id/packages - Get packages for a product
router.get('/:id/packages', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get all packages for this product
    const [packages] = await db.query(
      'SELECT * FROM product_shipping WHERE product_id = ? ORDER BY package_number ASC',
      [id]
    );
    
    // Format packages for frontend
    const formattedPackages = packages.map((pkg, index) => ({
      id: index + 1,
      length: pkg.length || '',
      width: pkg.width || '',
      height: pkg.height || '',
      weight: pkg.weight || '',
      dimension_unit: pkg.dimension_unit || 'in',
      weight_unit: pkg.weight_unit || 'lbs'
    }));
    
    res.json({ packages: formattedPackages });
  } catch (err) {
    console.error('Error fetching packages:', err);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// GET /products/:id/variations - Get parent product with organized child variations for customer selection
router.get('/:id/variations', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get parent product
    const [parentProduct] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    if (!parentProduct.length) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const parent = parentProduct[0];

    // Check if this is a variable product
    if (parent.product_type !== 'variable') {
      return res.status(400).json({ error: 'This product does not have variations' });
    }

    // Get all child products (variants) for this parent
    const [childProducts] = await db.query(`
      SELECT p.*, 
             GROUP_CONCAT(DISTINCT pi.image_url ORDER BY pi.order ASC) as image_urls
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.parent_id = ? AND p.status = 'active'
      GROUP BY p.id
      ORDER BY p.name ASC
    `, [id]);

    if (childProducts.length === 0) {
      return res.status(404).json({ error: 'No active variations found for this product' });
    }

    // Get variations for all child products
    const childIds = childProducts.map(child => child.id);
    const [variationData] = await db.query(`
      SELECT 
        pv.product_id,
        pv.variation_type_id,
        pv.variation_value_id,
        vt.variation_name as type_name,
        vv.value_name
      FROM product_variations pv
      JOIN user_variation_types vt ON pv.variation_type_id = vt.id
      JOIN user_variation_values vv ON pv.variation_value_id = vv.id
      WHERE pv.product_id IN (${childIds.map(() => '?').join(',')})
      ORDER BY vt.variation_name, vv.value_name
    `, childIds);

    // Organize variations by type for each child product
    const childProductsWithVariations = childProducts.map(child => {
      const childVariations = variationData.filter(v => v.product_id === child.id);
      const variationsByType = {};
      
      childVariations.forEach(variation => {
        if (!variationsByType[variation.type_name]) {
          variationsByType[variation.type_name] = [];
        }
        variationsByType[variation.type_name].push({
          value_id: variation.variation_value_id,
          value_name: variation.value_name
        });
      });

      return {
        ...child,
        images: child.image_urls ? child.image_urls.split(',') : [],
        variations: variationsByType
      };
    });

    // Get all available variation types for this parent product
    const [variationTypes] = await db.query(`
      SELECT DISTINCT vt.id, vt.variation_name
      FROM user_variation_types vt
      JOIN product_variations pv ON vt.id = pv.variation_type_id
      WHERE pv.product_id IN (${childIds.map(() => '?').join(',')})
      ORDER BY vt.variation_name
    `, childIds);

    // Get all available variation values organized by type
    const variationOptions = {};
    for (const type of variationTypes) {
      const [values] = await db.query(`
        SELECT DISTINCT vv.id, vv.value_name
        FROM user_variation_values vv
        JOIN product_variations pv ON vv.id = pv.variation_value_id
        WHERE pv.variation_type_id = ? AND pv.product_id IN (${childIds.map(() => '?').join(',')})
        ORDER BY vv.value_name
      `, [type.id, ...childIds]);
      
      variationOptions[type.variation_name] = values;
    }

    // Get parent product images
    const [parentImages] = await db.query(
      'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC',
      [id]
    );

    // Get parent shipping details
    const [parentShipping] = await db.query('SELECT * FROM product_shipping WHERE product_id = ?', [id]);

    res.json({
      parent_product: {
        ...parent,
        images: parentImages.map(img => img.image_url),
        shipping: parentShipping[0] || {}
      },
      variation_types: variationTypes,
      variation_options: variationOptions,
      child_products: childProductsWithVariations,
      total_variations: childProducts.length
    });

  } catch (err) {
    secureLogger.error('Error fetching product variations', err);
    res.status(500).json({ error: 'Failed to fetch product variations' });
  }
});

// POST /products - Create a new product
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      name, description, short_description, price, available_qty, category_id, sku, status,
      width, height, depth, weight, dimension_unit, weight_unit, parent_id, product_type,
      package_number, length, shipping_type, shipping_services, ship_method, ship_rate,
      packages
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

    // Handle shipping details - support both single package and multi-package
    let shippingResult;
    
    if (packages && Array.isArray(packages) && packages.length > 0) {
      // Multi-package shipping (calculated)
      for (let i = 0; i < packages.length; i++) {
        const pkg = packages[i];
        const packageNumber = i + 1;
        
        [shippingResult] = await db.query(
          'INSERT INTO product_shipping (product_id, package_number, length, width, height, weight, dimension_unit, weight_unit, ship_method, ship_rate, shipping_type, shipping_services) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            productId, 
            packageNumber, 
            parseFloat(pkg.length) || null, 
            parseFloat(pkg.width) || null, 
            parseFloat(pkg.height) || null, 
            parseFloat(pkg.weight) || null, 
            pkg.dimension_unit || 'in', 
            pkg.weight_unit || 'lbs',
            ship_method || 'calculated', 
            null, // no flat rate for calculated shipping
            'calculated', 
            shipping_services || null
          ]
        );
      }
    } else {
      // Single package shipping (free or flat rate)
      const shippingLength = length || null;
      const shippingWidth = width || null;
      const shippingHeight = height || null;
      const shippingWeight = weight || null;
      const shippingRate = ship_rate || null;

      if (package_number || shipping_type || shipping_services || ship_method || shippingRate || shippingLength || shippingWidth || shippingHeight || shippingWeight || dimension_unit || weight_unit) {
        [shippingResult] = await db.query(
          'INSERT INTO product_shipping (product_id, package_number, length, width, height, weight, dimension_unit, weight_unit, ship_method, ship_rate, shipping_type, shipping_services) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [productId, package_number || 1, shippingLength, shippingWidth, shippingHeight, shippingWeight, dimension_unit, weight_unit, ship_method || 'free', shippingRate, shipping_type || 'free', shipping_services]
        );
      }
    }

    const [newProduct] = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
    res.status(201).json(newProduct[0]);
  } catch (err) {
    secureLogger.error('Error creating product', err);
    res.status(500).json({ error: 'Failed to create product' });
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
      images, packages
    } = req.body;

    // Check if product exists and user has permission to edit it
    const [product] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    if (!product.length) return res.status(404).json({ error: 'Product not found' });
    
    // Check authorization: either product owner or admin
    const isAdmin = req.permissions && req.permissions.includes('admin');
    const isOwner = product[0].vendor_id === req.userId;
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Not authorized to edit this product' });
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

    // Handle shipping details - support both single package and multi-package
    let shippingResult;
    
    // First, delete existing shipping records
    await db.query('DELETE FROM product_shipping WHERE product_id = ?', [id]);
    
    if (packages && Array.isArray(packages) && packages.length > 0) {
      // Multi-package shipping (calculated)
      for (let i = 0; i < packages.length; i++) {
        const pkg = packages[i];
        const packageNumber = i + 1;
        
        [shippingResult] = await db.query(
          'INSERT INTO product_shipping (product_id, package_number, length, width, height, weight, dimension_unit, weight_unit, ship_method, ship_rate, shipping_type, shipping_services) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            id, 
            packageNumber, 
            parseFloat(pkg.length) || null, 
            parseFloat(pkg.width) || null, 
            parseFloat(pkg.height) || null, 
            parseFloat(pkg.weight) || null, 
            pkg.dimension_unit || 'in', 
            pkg.weight_unit || 'lbs',
            ship_method || 'calculated', 
            null, // no flat rate for calculated shipping
            'calculated', 
            shipping_services || null
          ]
        );
      }
    } else {
      // Single package shipping (free or flat rate)
      const shippingLength = length || null;
      const shippingWidth = width || null;
      const shippingHeight = height || null;
      const shippingWeight = weight || null;
      const shippingRate = ship_rate || null;

      if (package_number || shipping_type || shipping_services || ship_method || shippingRate || shippingLength || shippingWidth || shippingHeight || shippingWeight || dimension_unit || weight_unit) {
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
    
    // Get shipping details
    const [shipping] = await db.query('SELECT * FROM product_shipping WHERE product_id = ?', [id]);
    
    res.json({ 
      ...updatedProduct[0], 
      images: productImages.map(img => img.image_url),
      shipping: shipping[0] || {} 
    });
  } catch (err) {
    secureLogger.error('Error updating product', err);
    res.status(500).json({ error: 'Failed to update product' });
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

      // Verify product exists and user has permission to edit it
      const [product] = await db.query('SELECT * FROM products WHERE id = ?', [product_id]);
      if (!product.length) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      // Check authorization: either product owner or admin
      const isAdmin = req.permissions && req.permissions.includes('admin');
      const isOwner = product[0].vendor_id === req.userId;
      
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: 'Not authorized to edit this product' });
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
      secureLogger.error('Upload error', err);
      res.status(500).json({ error: 'Failed to upload images' });
    }
  }
);

// POST /products/variations - Create product variation record
router.post('/variations', verifyToken, async (req, res) => {
  try {
    const { product_id, variation_type_id, variation_value_id } = req.body;
    
    if (!product_id || !variation_type_id || !variation_value_id) {
      return res.status(400).json({ error: 'Product ID, variation type ID, and variation value ID are required' });
    }
    
    // Verify the product exists and user has permission to edit it
    const [productCheck] = await db.query(
      'SELECT * FROM products WHERE id = ?',
      [product_id]
    );
    
    if (productCheck.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Check authorization: either product owner or admin
    const isAdmin = req.permissions && req.permissions.includes('admin');
    const isOwner = productCheck[0].vendor_id === req.userId;
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Not authorized to edit this product' });
    }
    
    // Verify the variation type belongs to the current user
    const [typeCheck] = await db.query(
      'SELECT id FROM user_variation_types WHERE id = ? AND user_id = ?',
      [variation_type_id, req.userId]
    );
    
    if (typeCheck.length === 0) {
      return res.status(404).json({ error: 'Variation type not found or access denied' });
    }
    
    // Verify the variation value belongs to the variation type
    const [valueCheck] = await db.query(
      'SELECT id FROM user_variation_values WHERE id = ? AND variation_type_id = ?',
      [variation_value_id, variation_type_id]
    );
    
    if (valueCheck.length === 0) {
      return res.status(404).json({ error: 'Variation value not found or does not belong to the specified type' });
    }
    
    // Create the product variation record
    const [result] = await db.query(
      'INSERT INTO product_variations (product_id, variation_type_id, variation_value_id) VALUES (?, ?, ?)',
      [product_id, variation_type_id, variation_value_id]
    );
    
    res.status(201).json({
      id: result.insertId,
      product_id: parseInt(product_id),
      variation_type_id: parseInt(variation_type_id),
      variation_value_id: parseInt(variation_value_id)
    });
    
  } catch (err) {
    secureLogger.error('Error creating product variation', err);
    res.status(500).json({ error: 'Failed to create product variation' });
  }
});

module.exports = router;