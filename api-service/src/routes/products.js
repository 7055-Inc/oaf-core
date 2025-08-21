const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');
const upload = require('../config/multer');
const path = require('path');
const fs = require('fs');
const { secureLogger } = require('../middleware/secureLogger');
const { uploadLimiter } = require('../middleware/rateLimiter');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');

// GET /products - PUBLIC endpoint - active products only, no drafts, no permissions
router.get('/', async (req, res) => {
  try {
    const { vendor_id, category_id, variant_search } = req.query;
    
    let query;
    const params = [];
    
    // Smart parent/child logic:
    // - If variant_search=true: Show child products that match criteria, one per parent
    // - If variant_search=false or not set: Show only parent products
    if (variant_search === 'true') {
      // Show child products (variants), but only one per parent, and include standalone products
      // PUBLIC: Only active products
      query = `
        SELECT p.* FROM products p
        WHERE p.status = 'active' AND (
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
      // PUBLIC: Only active products, hide child variation products
      query = 'SELECT * FROM products WHERE parent_id IS NULL AND status = ?';
      params.push('active');
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

    const [products] = await db.query(query, params);
    res.json(products);
  } catch (err) {
    secureLogger.error('Error fetching products', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /products/all - Get all products system-wide (PUBLIC for reading)
router.get('/all', async (req, res) => {
  try {
    const { include, vendor_id } = req.query;
    
    // Parse include parameter
    const includes = include ? include.split(',').map(i => i.trim()) : [];
    
    // Build query with optional vendor filter
    let query = 'SELECT * FROM products WHERE status = ?';
    let params = ['active'];
    
    if (vendor_id) {
      query += ' AND vendor_id = ?';
      params.push(vendor_id);
    }
    
    query += ' ORDER BY created_at DESC';
    
    // Get products with optional vendor filter
    const [products] = await db.query(query, params);
    
    if (products.length === 0) {
      return res.json({ products: [] });
    }
    
    // Process each product and add related data
    const processedProducts = await Promise.all(
      products.map(async (product) => {
        const response = { ...product };
        
        // Add children if this is a parent product
        if (product.product_type === 'variable' && product.parent_id === null) {
          const [children] = await db.query(
            'SELECT * FROM products WHERE parent_id = ? ORDER BY name ASC',
            [product.id]
          );
          response.children = children;
        }
        
        // Add parent context if this is a child product
        if (product.parent_id !== null) {
          const [parent] = await db.query(
            'SELECT id, name, product_type, status FROM products WHERE id = ?',
            [product.parent_id]
          );
          response.parent = parent[0] || null;
        }
        
        // Add inventory data
        if (includes.includes('inventory')) {
          const [inventory] = await db.query(
            'SELECT * FROM product_inventory WHERE product_id = ?',
            [product.id]
          );
          response.inventory = inventory[0] || {
            qty_on_hand: 0,
            qty_on_order: 0,
            qty_available: 0,
            reorder_qty: 0
          };
        }
        
        // Add images
        if (includes.includes('images')) {
          const [tempImages] = await db.query(
            'SELECT image_path FROM pending_images WHERE image_path LIKE ? AND status = ?',
            [`/temp_images/products/${product.vendor_id}-${product.id}-%`, 'pending']
          );
          
          const [permanentImages] = await db.query(
            'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC',
            [product.id]
          );
          
          response.images = [
            ...permanentImages.map(img => img.image_url),
            ...tempImages.map(img => img.image_path)
          ];
        }
        
        // Add vendor info
        if (includes.includes('vendor')) {
          const [vendor] = await db.query(`
            SELECT u.id, u.username, up.first_name, up.last_name, up.display_name,
                   ap.business_name, ap.business_website
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN artist_profiles ap ON u.id = ap.user_id
            WHERE u.id = ?
          `, [product.vendor_id]);
          response.vendor = vendor[0] || {};
        }
        
        return response;
      })
    );
    
    res.json({ products: processedProducts });
    
  } catch (err) {
    secureLogger.error('Error fetching all products', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /products/my/[id(s)] - Unified endpoint for user's products with intelligent hierarchy
// Examples:
// /products/my/ - all user's products
// /products/my/123 - single product with children if parent
// /products/my/123,124,125 - specific set of products
router.get('/my/:ids?', verifyToken, async (req, res) => {
  try {
    const { ids } = req.params;
    const { include } = req.query;
    
    // Parse include parameter
    const includes = include ? include.split(',').map(i => i.trim()) : [];
    
    let productIds = [];
    let query = '';
    let params = [req.userId];
    
    // Check if user is admin to determine if they can see deleted products
    const isAdmin = req.permissions && req.permissions.includes('admin');
    const statusFilter = isAdmin ? '' : ' AND status != "deleted"';
    
    // Parse ID parameter
    if (!ids) {
      // Get all user's products
      query = `SELECT * FROM products WHERE vendor_id = ?${statusFilter} ORDER BY created_at DESC`;
    } else if (ids.includes(',')) {
      // Multiple specific products
      productIds = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      const placeholders = productIds.map(() => '?').join(',');
      query = `SELECT * FROM products WHERE vendor_id = ? AND id IN (${placeholders})${statusFilter} ORDER BY created_at DESC`;
      params.push(...productIds);
    } else {
      // Single product
      const productId = parseInt(ids);
      if (isNaN(productId)) {
        return res.status(400).json({ error: 'Invalid product ID' });
      }
      query = `SELECT * FROM products WHERE vendor_id = ? AND id = ?${statusFilter}`;
      params.push(productId);
    }
    
    // Get base products
    const [products] = await db.query(query, params);
    
    if (products.length === 0) {
      return res.json({ products: [] });
    }
    
    // Process each product and add related data
    const processedProducts = await Promise.all(
      products.map(async (product) => {
        const response = { ...product };
        
        // Add children if this is a parent product
        if (product.product_type === 'variable' && product.parent_id === null) {
          const [children] = await db.query(
            'SELECT * FROM products WHERE parent_id = ? ORDER BY name ASC',
            [product.id]
          );
          response.children = children;
        }
        
        // Add parent context if this is a child product
        if (product.parent_id !== null) {
          const [parent] = await db.query(
            'SELECT id, name, product_type, status FROM products WHERE id = ?',
            [product.parent_id]
          );
          response.parent = parent[0] || null;
        }
        
        // Add inventory data
        if (includes.includes('inventory')) {
          const [inventory] = await db.query(
            'SELECT * FROM product_inventory WHERE product_id = ?',
            [product.id]
          );
          response.inventory = inventory[0] || {
            qty_on_hand: 0,
            qty_on_order: 0,
            qty_available: 0,
            reorder_qty: 0
          };
        }
        
        // Add images
        if (includes.includes('images')) {
          // Get temp images
          const [tempImages] = await db.query(
            'SELECT image_path FROM pending_images WHERE image_path LIKE ? AND status = ?',
            [`/temp_images/products/${product.vendor_id}-${product.id}-%`, 'pending']
          );
          
          // Get permanent images
          const [permanentImages] = await db.query(
            'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC',
            [product.id]
          );
          
          response.images = [
            ...permanentImages.map(img => img.image_url),
            ...tempImages.map(img => img.image_path)
          ];
        }
        
        // Add shipping details
        if (includes.includes('shipping')) {
          const [shipping] = await db.query(
            'SELECT * FROM product_shipping WHERE product_id = ?',
            [product.id]
          );
          response.shipping = shipping[0] || {};
        }
        
        // Add categories
        if (includes.includes('categories')) {
          const [categories] = await db.query(`
            SELECT c.id, c.name, c.description 
            FROM categories c 
            JOIN product_categories pc ON c.id = pc.category_id 
            WHERE pc.product_id = ?
          `, [product.id]);
          response.categories = categories;
        }
        
        // Add vendor info
        if (includes.includes('vendor')) {
          const [vendor] = await db.query(`
            SELECT u.id, u.username, up.first_name, up.last_name, up.display_name,
                   ap.business_name, ap.business_website
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN artist_profiles ap ON u.id = ap.user_id
            WHERE u.id = ?
          `, [product.vendor_id]);
          response.vendor = vendor[0] || {};
        }
        
        return response;
      })
    );
    
    // Return single product object if requesting specific ID, array otherwise
    if (ids && !ids.includes(',')) {
      res.json(processedProducts[0] || null);
    } else {
      res.json({ products: processedProducts });
    }
    
  } catch (err) {
    secureLogger.error('Error fetching user products', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /products/:id - Retrieve a single product with optional related data
// Query params: ?include=inventory,images,shipping,categories,vendor
// Always returns complete family (parent + all children) for variable products
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { include } = req.query;
    
    // Parse include parameter
    const includes = include ? include.split(',').map(i => i.trim()) : [];
    
    // Get base product data
    const [product] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    if (!product.length) return res.status(404).json({ error: 'Product not found' });

    const requestedProduct = product[0];
    let parentProduct = null;
    let childProducts = [];

    // Determine if we're dealing with a parent or child product
    if (requestedProduct.parent_id === null) {
      // This is a parent product (simple or variable)
      parentProduct = requestedProduct;
      
      // If it's a variable product, get all children
      if (requestedProduct.product_type === 'variable') {
        const [children] = await db.query(
          'SELECT * FROM products WHERE parent_id = ? AND status = ? ORDER BY name ASC',
          [requestedProduct.id, 'active']
        );
        childProducts = children;
      }
    } else {
      // This is a child product - get parent and all siblings
      const [parent] = await db.query(
        'SELECT * FROM products WHERE id = ?',
        [requestedProduct.parent_id]
      );
      
      if (parent.length === 0) {
        return res.status(404).json({ error: 'Parent product not found' });
      }
      
      parentProduct = parent[0];
      
      // Get all siblings (including the requested product)
      const [siblings] = await db.query(
        'SELECT * FROM products WHERE parent_id = ? AND status = ? ORDER BY name ASC',
        [requestedProduct.parent_id, 'active']
      );
      childProducts = siblings;
    }

    // Helper function to add related data to a product
    const addRelatedData = async (productData) => {
      const response = { ...productData };

      // Add inventory data
      if (includes.includes('inventory') || !include) {
        const [inventory] = await db.query(
          'SELECT * FROM product_inventory WHERE product_id = ?',
          [productData.id]
        );
        response.inventory = inventory[0] || {
          qty_on_hand: 0,
          qty_on_order: 0,
          qty_available: 0,
          reorder_qty: 0
        };
      }

      // Add images
      if (includes.includes('images') || !include) {
        // Get temp images for this product using the new naming pattern
        const [tempImages] = await db.query(
          'SELECT image_path FROM pending_images WHERE image_path LIKE ? AND status = ?',
          [`/temp_images/products/${productData.vendor_id}-${productData.id}-%`, 'pending']
        );

        // Get permanent product images
        const [permanentImages] = await db.query(
          'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC',
          [productData.id]
        );

        // Combine both sets of images
        response.images = [
          ...permanentImages.map(img => img.image_url),
          ...tempImages.map(img => img.image_path)
        ];
      }

      // Add shipping data
      if (includes.includes('shipping') || !include) {
        const [shipping] = await db.query(
          'SELECT * FROM product_shipping WHERE product_id = ?',
          [productData.id]
        );
        response.shipping = shipping[0] || {};
      }

      // Add categories
      if (includes.includes('categories')) {
        const [categories] = await db.query(`
          SELECT c.id, c.name, c.description 
          FROM categories c 
          JOIN product_categories pc ON c.id = pc.category_id 
          WHERE pc.product_id = ?
        `, [productData.id]);
        response.categories = categories;
      }

      return response;
    };

    // Process parent product with related data
    const processedParent = await addRelatedData(parentProduct);

    // Process child products with related data
    const processedChildren = await Promise.all(
      childProducts.map(child => addRelatedData(child))
    );

    // Add vendor data to parent (applies to whole family)
    if (includes.includes('vendor')) {
      const [vendor] = await db.query(`
        SELECT u.id, u.username, up.first_name, up.last_name, up.display_name,
               ap.business_name, ap.business_website
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN artist_profiles ap ON u.id = ap.user_id
        WHERE u.id = ?
      `, [parentProduct.vendor_id]);
      processedParent.vendor = vendor[0] || {};
    }

    // Build the response
    const response = {
      ...processedParent,
      // Add family structure
      product_type: parentProduct.product_type,
      children: processedChildren,
      // Add metadata about the family
      family_size: processedChildren.length,
      requested_product_id: parseInt(id),
      is_requested_product_parent: requestedProduct.parent_id === null
    };

    secureLogger.info('Product family fetched', {
      requestedId: id,
      parentId: parentProduct.id,
      childCount: processedChildren.length,
      productType: parentProduct.product_type
    });

    res.json(response);
  } catch (err) {
    secureLogger.error('Error fetching product family', err);
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
    secureLogger.error('Error fetching packages:', err);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// Middleware for optional authentication - allows both authenticated and guest access
const optionalAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
      req.roles = decoded.roles || [];
      req.permissions = decoded.permissions || [];
    } catch (err) {
      // Invalid token, continue as guest (no req.userId set)
    }
  }
  next();
};

// GET /products/:id/variations - Get parent product with organized child variations for customer selection
router.get('/:id/variations', optionalAuth, async (req, res) => {
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

    // Determine if user can see draft products (admin/vendor permissions)
    let canSeeDrafts = false;
    
    if (req.userId) {
      // Allow admin users or product owners to see draft products
      const isAdmin = req.roles.includes('admin') || req.permissions.includes('admin');
      const isOwner = parent.vendor_id === req.userId;
      
      canSeeDrafts = isAdmin || isOwner;
    }

    // Get all child products (variants) for this parent
    // Include draft products for admin/vendor users
    const statusFilter = canSeeDrafts ? "p.status IN ('active', 'draft')" : "p.status = 'active'";
    const [childProducts] = await db.query(`
      SELECT p.*, 
             GROUP_CONCAT(DISTINCT pi.image_url ORDER BY pi.order ASC) as image_urls
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.parent_id = ? AND ${statusFilter}
      GROUP BY p.id
      ORDER BY p.name ASC
    `, [id]);

    if (childProducts.length === 0) {
      const errorMessage = canSeeDrafts ? 
        'No variations found for this product' : 
        'No active variations found for this product';
      return res.status(404).json({ error: errorMessage });
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


// POST /products - Create a new product (vendor permission required)
router.post('/', verifyToken, requirePermission('vendor'), uploadLimiter, async (req, res) => {
  try {
    secureLogger.info('Product creation request', { 
      userId: req.userId, 
      productType: req.body.product_type, 
      parentId: req.body.parent_id,
      name: req.body.name 
    });
    
    const {
      name, description, short_description, price, category_id, sku, status,
      width, height, depth, weight, dimension_unit, weight_unit, parent_id, product_type,
      package_number, length, shipping_type, shipping_services, ship_method, ship_rate,
      packages, beginning_inventory, reorder_qty, images
    } = req.body;

    // Validate required fields
    if (!name || !price || !category_id || !sku) {
      return res.status(400).json({ error: 'Name, price, category ID, and SKU are required' });
    }

    // DEBUG: Log parent_id processing
    secureLogger.info('Processing parent_id', {
      parent_id: parent_id,
      parent_id_type: typeof parent_id,
      parent_id_value: JSON.stringify(parent_id),
      product_name: name,
      product_type: product_type
    });

    // Validate parent_id if provided (fix falsy value bug)
    let validatedParentId = null;
    if (parent_id != null && parent_id !== '') {
      const parentIdInt = parseInt(parent_id);
      if (isNaN(parentIdInt)) {
        return res.status(400).json({ error: 'Invalid parent_id: Must be a valid number' });
      }
      
      secureLogger.info('Validating parent product', {
        parentIdInt,
        userId: req.userId
      });
      
      // Check if parent exists AND user has permission to create children for it
      const [parentProduct] = await db.query('SELECT id, vendor_id FROM products WHERE id = ?', [parentIdInt]);
      if (!parentProduct.length) {
        return res.status(400).json({ error: 'Invalid parent_id: Parent product does not exist' });
      }
      
      // Check if user owns the parent product or is admin
      const isAdmin = req.permissions && req.permissions.includes('admin');
      const isOwner = parentProduct[0].vendor_id === req.userId;
      
      secureLogger.info('Parent product validation', {
        parentProductId: parentProduct[0].id,
        parentVendorId: parentProduct[0].vendor_id,
        currentUserId: req.userId,
        isAdmin,
        isOwner
      });
      
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: 'Not authorized to create child products for this parent' });
      }
      
      validatedParentId = parentIdInt;
    } else {
      secureLogger.info('Parent ID was falsy or empty', {
        parent_id,
        condition1: parent_id != null,
        condition2: parent_id !== '',
        overall: parent_id != null && parent_id !== ''
      });
    }

    // DEBUG: Log the validatedParentId value
    secureLogger.info('About to INSERT product', {
      validatedParentId,
      validatedParentIdType: typeof validatedParentId,
      productType: product_type,
      name: name
    });

    // Insert product (removed available_qty since it's now handled by inventory system)
    const insertParams = [req.userId, name, description, short_description, price, category_id, sku, status || 'draft',
       1, // track_inventory - default to true
       width || null, height || null, depth || null, weight || null, dimension_unit, weight_unit, validatedParentId, product_type, req.userId, req.userId];
    
    secureLogger.info('INSERT parameters debug', {
      validatedParentId,
      parameterCount: insertParams.length,
      parentIdPosition: insertParams[15], // Updated position after adding track_inventory
      parentIdPositionValue: insertParams[15],
      productType: product_type,
      allParams: insertParams
    });
    
    const [result] = await db.query(
      'INSERT INTO products (vendor_id, name, description, short_description, price, category_id, sku, status, track_inventory, width, height, depth, weight, dimension_unit, weight_unit, parent_id, product_type, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      insertParams
    );

    const productId = result.insertId;

    // Handle images - move from temp to permanent storage and associate with product
    if (images && Array.isArray(images)) {
      for (let i = 0; i < images.length; i++) {
        const imageUrl = images[i];
        await db.query(
          'INSERT INTO product_images (product_id, image_url, `order`) VALUES (?, ?, ?)',
          [productId, imageUrl, i]
        );
      }
    }

    // Create initial inventory record for the new product
    try {
      const initialQty = beginning_inventory || 0;
      const reorderLevel = reorder_qty || 0;
      
      await db.query(
        'INSERT INTO product_inventory (product_id, qty_on_hand, qty_on_order, reorder_qty, updated_by) VALUES (?, ?, ?, ?, ?)',
        [productId, initialQty, 0, reorderLevel, req.userId]
      );
      
      // Add initial inventory history
      if (initialQty > 0) {
        await db.query(
          'INSERT INTO inventory_history (product_id, change_type, previous_qty, new_qty, reason, created_by) VALUES (?, ?, ?, ?, ?, ?)',
          [productId, 'initial_stock', 0, initialQty, 'Initial product creation', req.userId]
        );
      }
    } catch (inventoryError) {
      console.error('Error creating inventory record:', inventoryError);
      // Don't fail the product creation if inventory creation fails
    }

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
    
    // DEBUG: Log the created product
    secureLogger.info('Product created successfully', {
      productId: newProduct[0].id,
      productName: newProduct[0].name,
      productType: newProduct[0].product_type,
      parentIdInDb: newProduct[0].parent_id,
      parentIdType: typeof newProduct[0].parent_id,
      vendorId: newProduct[0].vendor_id
    });
    
    res.status(201).json(newProduct[0]);
  } catch (err) {
    secureLogger.error('Error creating product', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /products/:id - Update a product (vendor permission required)
router.put('/:id', verifyToken, requirePermission('vendor'), uploadLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, description, short_description, price, category_id, sku, status,
      width, height, depth, weight, dimension_unit, weight_unit, parent_id, product_type,
      package_number, length, shipping_type, shipping_services, ship_method, ship_rate,
      images, packages, vendor_id
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

    // Validate parent_id if provided (fix falsy value bug)
    let validatedParentId = null;
    if (parent_id != null && parent_id !== '') {
      const parentIdInt = parseInt(parent_id);
      if (isNaN(parentIdInt)) {
        return res.status(400).json({ error: 'Invalid parent_id: Must be a valid number' });
      }
      
      // Check if parent exists AND user has permission to create children for it
      const [parentProduct] = await db.query('SELECT id, vendor_id FROM products WHERE id = ?', [parentIdInt]);
      if (!parentProduct.length) {
        return res.status(400).json({ error: 'Invalid parent_id: Parent product does not exist' });
      }
      
      // Check if user owns the parent product or is admin (use same permissions from above)
      const isParentOwner = parentProduct[0].vendor_id === req.userId;
      
      if (!isAdmin && !isParentOwner) {
        return res.status(403).json({ error: 'Not authorized to link this product to the specified parent' });
      }
      
      validatedParentId = parentIdInt;
    }

    // Handle vendor_id changes for admins
    let finalVendorId = product[0].vendor_id;
    if (vendor_id && req.roles && req.roles.includes('admin')) {
      finalVendorId = vendor_id;
    }

    // Update product (removed available_qty since it's now handled by inventory system)
    await db.query(
      'UPDATE products SET name = ?, description = ?, short_description = ?, price = ?, category_id = ?, sku = ?, status = ?, track_inventory = ?, width = ?, height = ?, depth = ?, weight = ?, dimension_unit = ?, weight_unit = ?, parent_id = ?, product_type = ?, vendor_id = ?, updated_by = ? WHERE id = ?',
      [name || product[0].name, description || product[0].description, short_description || product[0].short_description,
       price || product[0].price, category_id || product[0].category_id,
       sku || product[0].sku, status || product[0].status, 1, // track_inventory default to true
       width || product[0].width, height || product[0].height,
       depth || product[0].depth, weight || product[0].weight, dimension_unit || product[0].dimension_unit,
       weight_unit || product[0].weight_unit, validatedParentId, product_type || product[0].product_type,
       finalVendorId, req.userId, id]
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

// PATCH /products/:id - Partial update a product (vendor permission required)
router.patch('/:id', verifyToken, requirePermission('vendor'), uploadLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, description, short_description, price, category_id, sku, status,
      width, height, depth, weight, dimension_unit, weight_unit, parent_id, product_type,
      package_number, length, shipping_type, shipping_services, ship_method, ship_rate,
      images, packages, vendor_id, beginning_inventory, reorder_qty
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

    // Build dynamic update query - only update provided fields
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (short_description !== undefined) {
      updateFields.push('short_description = ?');
      updateValues.push(short_description);
    }
    if (price !== undefined) {
      updateFields.push('price = ?');
      updateValues.push(parseFloat(price));
    }
    if (category_id !== undefined) {
      updateFields.push('category_id = ?');
      updateValues.push(parseInt(category_id));
    }
    if (sku !== undefined) {
      updateFields.push('sku = ?');
      updateValues.push(sku);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    if (width !== undefined) {
      updateFields.push('width = ?');
      updateValues.push(width);
    }
    if (height !== undefined) {
      updateFields.push('height = ?');
      updateValues.push(height);
    }
    if (depth !== undefined) {
      updateFields.push('depth = ?');
      updateValues.push(depth);
    }
    if (weight !== undefined) {
      updateFields.push('weight = ?');
      updateValues.push(weight);
    }
    if (dimension_unit !== undefined) {
      updateFields.push('dimension_unit = ?');
      updateValues.push(dimension_unit);
    }
    if (weight_unit !== undefined) {
      updateFields.push('weight_unit = ?');
      updateValues.push(weight_unit);
    }
    // Note: beginning_inventory and reorder_qty are handled in the inventory section below, not in products table

    // Handle parent_id validation if provided
    if (parent_id !== undefined) {
      if (parent_id === null || parent_id === '') {
        updateFields.push('parent_id = ?');
        updateValues.push(null);
      } else {
        const parentIdInt = parseInt(parent_id);
        if (isNaN(parentIdInt)) {
          return res.status(400).json({ error: 'Invalid parent_id: Must be a valid number' });
        }
        
        // Check if parent exists AND user has permission to create children for it
        const [parentProduct] = await db.query('SELECT id, vendor_id FROM products WHERE id = ?', [parentIdInt]);
        if (!parentProduct.length) {
          return res.status(400).json({ error: 'Invalid parent_id: Parent product does not exist' });
        }
        
        // Check if user owns the parent product or is admin
        const isParentOwner = parentProduct[0].vendor_id === req.userId;
        
        if (!isAdmin && !isParentOwner) {
          return res.status(403).json({ error: 'Not authorized to link this product to the specified parent' });
        }
        
        updateFields.push('parent_id = ?');
        updateValues.push(parentIdInt);
      }
    }

    // Handle product_type if provided
    if (product_type !== undefined) {
      updateFields.push('product_type = ?');
      updateValues.push(product_type);
    }

    // Handle vendor_id changes for admins
    if (vendor_id !== undefined && req.roles && req.roles.includes('admin')) {
      updateFields.push('vendor_id = ?');
      updateValues.push(vendor_id);
    }

    // Always update the updated_by field
    updateFields.push('updated_by = ?');
    updateValues.push(req.userId);

    // Execute the update if there are fields to update
    if (updateFields.length > 0) {
      updateValues.push(id);
      await db.query(
        `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    } else {
      // If no product fields to update, just ensure the record exists
      const [existingProduct] = await db.query('SELECT id FROM products WHERE id = ?', [id]);
      if (existingProduct.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
    }

    // Handle inventory updates if beginning_inventory or reorder_qty was provided
    if (beginning_inventory !== undefined || reorder_qty !== undefined) {
      // Get current inventory
      const [currentInventory] = await db.query(
        'SELECT qty_on_hand, reorder_qty FROM product_inventory WHERE product_id = ?',
        [id]
      );
      
      if (currentInventory.length > 0) {
        // Update existing inventory record
        const currentQty = currentInventory[0].qty_on_hand || 0;
        const currentReorder = currentInventory[0].reorder_qty || 0;
        
        const newQty = beginning_inventory !== undefined ? (parseInt(beginning_inventory) || 0) : currentQty;
        const newReorder = reorder_qty !== undefined ? (parseInt(reorder_qty) || 0) : currentReorder;
        
        await db.query(
          'UPDATE product_inventory SET qty_on_hand = ?, reorder_qty = ?, updated_by = ? WHERE product_id = ?',
          [newQty, newReorder, req.userId, id]
        );
        
        // Create inventory history record if quantity changed
        if (beginning_inventory !== undefined && currentQty !== newQty) {
          await db.query(
            'INSERT INTO inventory_history (product_id, change_type, previous_qty, new_qty, reason, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [id, 'manual_adjustment', currentQty, newQty, 'Bulk edit inventory update', req.userId]
          );
        }
      } else {
        // Create new inventory record
        const newQty = parseInt(beginning_inventory) || 0;
        const newReorder = parseInt(reorder_qty) || 0;
        
        await db.query(
          'INSERT INTO product_inventory (product_id, qty_on_hand, qty_on_order, reorder_qty, updated_by) VALUES (?, ?, ?, ?, ?)',
          [id, newQty, 0, newReorder, req.userId]
        );
        
        // Create initial inventory history
        if (newQty > 0) {
          await db.query(
            'INSERT INTO inventory_history (product_id, change_type, previous_qty, new_qty, reason, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [id, 'initial_stock', 0, newQty, 'Initial variant inventory', req.userId]
          );
        }
      }
    }

    // Handle images if provided
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

    // Handle shipping details if provided
    if (packages !== undefined || ship_method !== undefined || shipping_services !== undefined) {
      // First, delete existing shipping records
      await db.query('DELETE FROM product_shipping WHERE product_id = ?', [id]);
      
      if (packages && Array.isArray(packages) && packages.length > 0) {
        // Multi-package shipping (calculated)
        for (let i = 0; i < packages.length; i++) {
          const pkg = packages[i];
          const packageNumber = i + 1;
          
          await db.query(
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
      } else if (ship_method !== undefined) {
        // Single package shipping (free or flat rate)
        const shippingLength = length || null;
        const shippingWidth = width || null;
        const shippingHeight = height || null;
        const shippingWeight = weight || null;
        const shippingRate = ship_rate || null;

        await db.query(
          'INSERT INTO product_shipping (product_id, package_number, length, width, height, weight, dimension_unit, weight_unit, ship_method, ship_rate, shipping_type, shipping_services) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, package_number || 1, shippingLength, shippingWidth, shippingHeight, shippingWeight, dimension_unit || 'in', weight_unit || 'lbs', ship_method || 'free', shippingRate, shipping_type || 'free', shipping_services]
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
    secureLogger.error('Error patching product', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// POST /products/upload - Upload product images (vendor permission required)
router.post('/upload', 
  verifyToken,
  requirePermission('vendor'),
  uploadLimiter,
  upload.array('images'),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const { product_id } = req.query;
      
      // For existing products, verify ownership
      if (product_id && product_id !== 'new') {
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
      }

      const urls = [];
      
      // Record temp image URLs 
      for (const file of req.files) {
        const imagePath = `/temp_images/products/${file.filename}`;
        // Insert into pending_images with original name and mime type
        await db.query(
          'INSERT INTO pending_images (user_id, image_path, original_name, mime_type, status) VALUES (?, ?, ?, ?, ?)',
          [req.userId, imagePath, file.originalname, file.mimetype, 'pending']
        );
        
        // Only add to product_images if we have an existing product
        if (product_id && product_id !== 'new') {
          await db.query(
            'INSERT INTO product_images (product_id, image_url, `order`) VALUES (?, ?, ?)',
            [product_id, imagePath, 0]
          );
        }
        
        urls.push(imagePath);
      }

      res.json({ urls });
    } catch (err) {
      secureLogger.error('Upload error', err);
      res.status(500).json({ error: 'Failed to upload images' });
    }
  }
);

// POST /products/variations - Create product variation record (vendor permission required)
router.post('/variations', verifyToken, requirePermission('vendor'), uploadLimiter, async (req, res) => {
  try {
    secureLogger.info('Variation creation request', { 
      userId: req.userId, 
      productId: req.body.product_id, 
      typeId: req.body.variation_type_id,
      valueId: req.body.variation_value_id 
    });
    
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

// GET /products/variations/types - Get all variation types for current user with usage counts
router.get('/variations/types', verifyToken, async (req, res) => {
  try {
    const [types] = await db.query(`
      SELECT 
        vt.id, 
        vt.variation_name, 
        vt.created_at,
        COUNT(DISTINCT p.parent_id) as usage_count
      FROM user_variation_types vt
      LEFT JOIN product_variations pv ON vt.id = pv.variation_type_id
      LEFT JOIN products p ON pv.product_id = p.id AND p.product_type = 'variant' AND p.status != 'deleted'
      WHERE vt.user_id = ? AND vt.user_id IS NOT NULL
      GROUP BY vt.id, vt.variation_name, vt.created_at
      ORDER BY vt.variation_name
    `, [req.userId]);
    
    res.json(types);
  } catch (err) {
    secureLogger.error('Error fetching variation types', err);
    res.status(500).json({ error: 'Failed to fetch variation types' });
  }
});

// POST /products/variations/types - Create new variation type (vendor permission required)
router.post('/variations/types', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const { variation_name } = req.body;
    
    if (!variation_name || !variation_name.trim()) {
      return res.status(400).json({ error: 'Variation name is required' });
    }
    
    const trimmedName = variation_name.trim();
    
    // Check if this variation type already exists for this user
    const [existing] = await db.query(
      'SELECT id FROM user_variation_types WHERE user_id = ? AND variation_name = ?',
      [req.userId, trimmedName]
    );
    
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Variation type already exists' });
    }
    
    const [result] = await db.query(
      'INSERT INTO user_variation_types (user_id, variation_name) VALUES (?, ?)',
      [req.userId, trimmedName]
    );
    
    const [newType] = await db.query(
      'SELECT id, variation_name, created_at FROM user_variation_types WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json(newType[0]);
  } catch (err) {
    secureLogger.error('Error creating variation type', err);
    res.status(500).json({ error: 'Failed to create variation type' });
  }
});

// GET /products/variations/types/:id/values - Get all values for a variation type (optionally filtered by product)
router.get('/variations/types/:id/values', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id } = req.query;
    
    // First verify the variation type belongs to this user
    const [typeCheck] = await db.query(
      'SELECT id FROM user_variation_types WHERE id = ? AND user_id = ? AND user_id IS NOT NULL',
      [id, req.userId]
    );
    
    if (typeCheck.length === 0) {
      return res.status(404).json({ error: 'Variation type not found' });
    }
    
    let query = 'SELECT id, value_name, product_id, created_at FROM user_variation_values WHERE variation_type_id = ? AND user_id = ? AND user_id IS NOT NULL';
    let params = [id, req.userId];
    
    // If product_id is provided, filter by product
    if (product_id) {
      query += ' AND product_id = ?';
      params.push(product_id);
    }
    
    query += ' ORDER BY value_name';
    
    const [values] = await db.query(query, params);
    
    res.json(values);
  } catch (err) {
    secureLogger.error('Error fetching variation values', err);
    res.status(500).json({ error: 'Failed to fetch variation values' });
  }
});

// POST /products/variations/values - Create new variation value (vendor permission required)
router.post('/variations/values', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const { variation_type_id, value_name, product_id } = req.body;
    
    if (!variation_type_id || !value_name || !value_name.trim()) {
      return res.status(400).json({ error: 'Variation type ID and value name are required' });
    }

    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }
    
    const trimmedValue = value_name.trim();
    
    // Verify the variation type belongs to this user
    const [typeCheck] = await db.query(
      'SELECT id FROM user_variation_types WHERE id = ? AND user_id = ?',
      [variation_type_id, req.userId]
    );
    
    if (typeCheck.length === 0) {
      return res.status(404).json({ error: 'Variation type not found' });
    }

    // Verify the product exists and belongs to this user
    const [productCheck] = await db.query(
      'SELECT id FROM products WHERE id = ? AND vendor_id = ?',
      [product_id, req.userId]
    );
    
    if (productCheck.length === 0) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }
    
    // Check if this value already exists for this product and variation type
    const [existing] = await db.query(
      'SELECT id FROM user_variation_values WHERE product_id = ? AND variation_type_id = ? AND value_name = ?',
      [product_id, variation_type_id, trimmedValue]
    );
    
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Variation value already exists for this product' });
    }
    
    const [result] = await db.query(
      'INSERT INTO user_variation_values (variation_type_id, value_name, user_id, product_id) VALUES (?, ?, ?, ?)',
      [variation_type_id, trimmedValue, req.userId, product_id]
    );
    
    const [newValue] = await db.query(
      'SELECT id, variation_type_id, value_name, product_id, created_at FROM user_variation_values WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json(newValue[0]);
  } catch (err) {
    secureLogger.error('Error creating variation value', err);
    res.status(500).json({ error: 'Failed to create variation value' });
  }
});

// DELETE /products/variations/types/:id - Delete a variation type (vendor permission required)
router.delete('/variations/types/:id', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify the variation type belongs to this user
    const [typeCheck] = await db.query(
      'SELECT id FROM user_variation_types WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    
    if (typeCheck.length === 0) {
      return res.status(404).json({ error: 'Variation type not found' });
    }
    
    // Delete all values first (foreign key constraint)
    await db.query('DELETE FROM user_variation_values WHERE variation_type_id = ?', [id]);
    
    // Delete the variation type
    await db.query('DELETE FROM user_variation_types WHERE id = ?', [id]);
    
    res.json({ message: 'Variation type deleted successfully' });
  } catch (err) {
    secureLogger.error('Error deleting variation type', err);
    res.status(500).json({ error: 'Failed to delete variation type' });
  }
});

// DELETE /products/variations/values/:id - Delete a variation value (vendor permission required)
router.delete('/variations/values/:id', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify the variation value belongs to this user (through the variation type)
    const [valueCheck] = await db.query(
      `SELECT uv.id 
       FROM user_variation_values uv 
       JOIN user_variation_types ut ON uv.variation_type_id = ut.id 
       WHERE uv.id = ? AND ut.user_id = ?`,
      [id, req.userId]
    );
    
    if (valueCheck.length === 0) {
      return res.status(404).json({ error: 'Variation value not found' });
    }
    
    await db.query('DELETE FROM user_variation_values WHERE id = ?', [id]);
    
    res.json({ message: 'Variation value deleted successfully' });
  } catch (err) {
    secureLogger.error('Error deleting variation value', err);
    res.status(500).json({ error: 'Failed to delete variation value' });
  }
});

// DELETE /products/:id - Delete a single product (vendor permission required)
router.delete('/:id', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get product to verify ownership and get children
    const [product] = await db.query(
      'SELECT id, name, vendor_id, parent_id, product_type FROM products WHERE id = ? AND status != "deleted"',
      [id]
    );
    
    if (product.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Check authorization: user must own the product or be admin
    const isAdmin = req.permissions && req.permissions.includes('admin');
    const isOwner = product[0].vendor_id === req.userId;
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Not authorized to delete this product' });
    }
    
    // Get all product IDs to delete (including children of variable products)
    const allProductsToDelete = [product[0].id];
    
    // If this is a variable product (parent), also delete all its children
    if (product[0].product_type === 'variable' && product[0].parent_id === null) {
      const [children] = await db.query(
        'SELECT id FROM products WHERE parent_id = ? AND status != "deleted"',
        [product[0].id]
      );
      
      children.forEach(child => {
        allProductsToDelete.push(child.id);
      });
    }
    
    // Start transaction for atomic deletion
    await db.query('START TRANSACTION');
    
    try {
      // Perform soft delete by setting status to 'deleted'
      const deletePlaceholders = allProductsToDelete.map(() => '?').join(',');
      await db.query(
        `UPDATE products SET status = 'deleted', updated_by = ? WHERE id IN (${deletePlaceholders})`,
        [req.userId, ...allProductsToDelete]
      );
      
      // Dis-associate variation types and values from user for cleanup
      await cleanupUserVariationsAfterProductDeletion(req.userId);
      
      await db.query('COMMIT');
      
      secureLogger.info('Product delete completed', {
        userId: req.userId,
        productId: id,
        totalDeleted: allProductsToDelete.length,
        deletedIds: allProductsToDelete
      });
      
      res.json({ 
        success: true, 
        message: `Product deleted successfully`,
        deleted_product_ids: allProductsToDelete
      });
      
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
    
  } catch (err) {
    secureLogger.error('Error deleting product', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// POST /products/bulk-delete - Bulk delete products (vendor permission required)
router.post('/bulk-delete', verifyToken, requirePermission('vendor'), uploadLimiter, async (req, res) => {
  try {
    const { product_ids } = req.body;
    
    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return res.status(400).json({ error: 'product_ids must be a non-empty array' });
    }
    
    // Validate that all product_ids are numbers
    const validIds = product_ids.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));
    
    if (validIds.length !== product_ids.length) {
      return res.status(400).json({ error: 'All product_ids must be valid numbers' });
    }
    
    // Get all products to verify ownership and get children
    const placeholders = validIds.map(() => '?').join(',');
    const [products] = await db.query(
      `SELECT id, name, vendor_id, parent_id, product_type FROM products WHERE id IN (${placeholders}) AND status != 'deleted'`,
      validIds
    );
    
    if (products.length === 0) {
      return res.status(404).json({ error: 'No valid products found' });
    }
    
    // Check authorization: user must own all products or be admin
    const isAdmin = req.permissions && req.permissions.includes('admin');
    const unauthorizedProducts = products.filter(product => product.vendor_id !== req.userId);
    
    if (!isAdmin && unauthorizedProducts.length > 0) {
      return res.status(403).json({ 
        error: 'Not authorized to delete some products',
        unauthorized_products: unauthorizedProducts.map(p => ({ id: p.id, name: p.name }))
      });
    }
    
    // Get all product IDs to delete (including children of variable products)
    const allProductsToDelete = [];
    
    for (const product of products) {
      allProductsToDelete.push(product.id);
      
      // If this is a variable product (parent), also delete all its children
      if (product.product_type === 'variable' && product.parent_id === null) {
        const [children] = await db.query(
          'SELECT id FROM products WHERE parent_id = ? AND status != "deleted"',
          [product.id]
        );
        
        children.forEach(child => {
          allProductsToDelete.push(child.id);
        });
      }
    }
    
    // Remove duplicates
    const uniqueProductIds = [...new Set(allProductsToDelete)];
    
    // Start transaction for atomic deletion
    await db.query('START TRANSACTION');
    
    try {
      // Perform soft delete by setting status to 'deleted'
      if (uniqueProductIds.length > 0) {
        const deletePlaceholders = uniqueProductIds.map(() => '?').join(',');
        await db.query(
          `UPDATE products SET status = 'deleted', updated_by = ? WHERE id IN (${deletePlaceholders})`,
          [req.userId, ...uniqueProductIds]
        );
      }
      
      // Dis-associate variation types and values from user for cleanup
      await cleanupUserVariationsAfterProductDeletion(req.userId);
      
      await db.query('COMMIT');
      
      secureLogger.info('Bulk delete completed', {
        userId: req.userId,
        requestedProducts: validIds.length,
        actuallyDeleted: uniqueProductIds.length,
        productIds: uniqueProductIds
      });
      
      res.json({ 
        success: true, 
        message: `${uniqueProductIds.length} products deleted successfully`,
        deleted_product_ids: uniqueProductIds
      });
      
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
    
  } catch (err) {
    secureLogger.error('Error in bulk delete', err);
    res.status(500).json({ error: 'Failed to delete products' });
  }
});

// Helper function to clean up user variations after product deletion
async function cleanupUserVariationsAfterProductDeletion(userId) {
  try {
    // Find variation types that are no longer used by any active products for this user
    const [unusedVariationTypes] = await db.query(`
      SELECT vt.id
      FROM user_variation_types vt
      WHERE vt.user_id = ?
      AND NOT EXISTS (
        SELECT 1 
        FROM product_variations pv
        JOIN products p ON pv.product_id = p.id
        WHERE pv.variation_type_id = vt.id
        AND p.vendor_id = ?
        AND p.status != 'deleted'
      )
    `, [userId, userId]);
    
    // Set user_id to NULL for unused variation types (dis-associate from user)
    if (unusedVariationTypes.length > 0) {
      const typeIds = unusedVariationTypes.map(type => type.id);
      const typePlaceholders = typeIds.map(() => '?').join(',');
      
      await db.query(
        `UPDATE user_variation_types SET user_id = NULL WHERE id IN (${typePlaceholders})`,
        typeIds
      );
      
      // Also dis-associate the related variation values
      await db.query(
        `UPDATE user_variation_values SET user_id = NULL WHERE variation_type_id IN (${typePlaceholders})`,
        typeIds
      );
    }
    
    // Find variation values that are no longer used by any active products for this user
    const [unusedVariationValues] = await db.query(`
      SELECT vv.id
      FROM user_variation_values vv
      WHERE vv.user_id = ?
      AND NOT EXISTS (
        SELECT 1 
        FROM product_variations pv
        JOIN products p ON pv.product_id = p.id
        WHERE pv.variation_value_id = vv.id
        AND p.vendor_id = ?
        AND p.status != 'deleted'
      )
    `, [userId, userId]);
    
    // Set user_id to NULL for unused variation values (dis-associate from user)
    if (unusedVariationValues.length > 0) {
      const valueIds = unusedVariationValues.map(value => value.id);
      const valuePlaceholders = valueIds.map(() => '?').join(',');
      
      await db.query(
        `UPDATE user_variation_values SET user_id = NULL WHERE id IN (${valuePlaceholders})`,
        valueIds
      );
    }
    
    secureLogger.info('Variation cleanup completed', {
      userId: userId,
      disassociatedTypes: unusedVariationTypes.length,
      disassociatedValues: unusedVariationValues.length
    });
    
  } catch (err) {
    secureLogger.error('Error in variation cleanup', err);
    throw err;
  }
}

module.exports = router;