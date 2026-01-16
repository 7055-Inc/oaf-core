const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { secureLogger } = require('../middleware/secureLogger');

/**
 * @fileoverview Curated content routes
 * 
 * Handles curated marketplace content functionality including:
 * - Art marketplace product curation and filtering
 * - Crafts marketplace product curation and filtering
 * - Product family management (parent-child relationships)
 * - Comprehensive product data enrichment (inventory, images, shipping, vendor info)
 * - Marketplace-specific filtering and status validation
 * - Public-facing curated content for marketplace display
 * 
 * All endpoints are public and focus on active, marketplace-enabled products only.
 * Supports flexible data inclusion via query parameters for performance optimization.
 * 
 * @author Beemeeart Development Team
 * @version 1.0.0
 */

/**
 * Get all art marketplace products
 * @route GET /api/curated/art/products/all
 * @access Public
 * @param {Object} req - Express request object
 * @param {string} req.query.include - Comma-separated list of data to include (inventory,images,vendor)
 * @param {string} req.query.vendor_id - Filter by vendor ID (optional)
 * @param {string} req.query.category_id - Filter by category ID (optional)
 * @param {Object} res - Express response object
 * @returns {Object} List of art marketplace products with optional enriched data
 * @description Retrieves all active, marketplace-enabled art products with optional data enrichment
 */
router.get('/art/products/all', async (req, res) => {
  try {
    const { include, vendor_id, category_id } = req.query;
    
    // Parse include parameter
    const includes = include ? include.split(',').map(i => i.trim()) : [];
    
    // Build query with marketplace filters - PUBLIC ONLY (active, marketplace-enabled art products)
    let query = 'SELECT DISTINCT p.* FROM products p';
    let params = ['active', 'art'];
    
    // Join with product_categories if category filter is requested
    if (category_id) {
      query += ' INNER JOIN product_categories pc ON p.id = pc.product_id';
    }
    
    query += ' WHERE p.status = ? AND p.marketplace_enabled = 1 AND p.marketplace_category = ?';
    
    if (vendor_id) {
      query += ' AND p.vendor_id = ?';
      params.push(vendor_id);
    }
    if (category_id) {
      query += ' AND pc.category_id = ?';
      params.push(category_id);
    }
    
    query += ' ORDER BY p.created_at DESC';
    
    // Get products with marketplace filter
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
            'SELECT * FROM products WHERE parent_id = ? AND status = ? AND marketplace_enabled = 1 AND marketplace_category = ? ORDER BY name ASC',
            [product.id, 'active', 'art']
          );
          response.children = children;
        }
        
        // Add parent context if this is a child product
        if (product.parent_id !== null) {
          const [parent] = await db.query(
            'SELECT id, name, product_type, status FROM products WHERE id = ? AND status = ? AND marketplace_enabled = 1 AND marketplace_category = ?',
            [product.parent_id, 'active', 'art']
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
    secureLogger.error('Error fetching all art marketplace products', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * Get all crafts marketplace products
 * @route GET /api/curated/crafts/products/all
 * @access Public
 * @param {Object} req - Express request object
 * @param {string} req.query.include - Comma-separated list of data to include (inventory,images,vendor)
 * @param {string} req.query.vendor_id - Filter by vendor ID (optional)
 * @param {string} req.query.category_id - Filter by category ID (optional)
 * @param {Object} res - Express response object
 * @returns {Object} List of crafts marketplace products with optional enriched data
 * @description Retrieves all active, marketplace-enabled crafts products with optional data enrichment
 */
router.get('/crafts/products/all', async (req, res) => {
  try {
    const { include, vendor_id, category_id } = req.query;
    
    // Parse include parameter
    const includes = include ? include.split(',').map(i => i.trim()) : [];
    
    // Build query with marketplace filters - PUBLIC ONLY (active, marketplace-enabled crafts products)
    let query = 'SELECT DISTINCT p.* FROM products p';
    let params = ['active', 'crafts'];
    
    // Join with product_categories if category filter is requested
    if (category_id) {
      query += ' INNER JOIN product_categories pc ON p.id = pc.product_id';
    }
    
    query += ' WHERE p.status = ? AND p.marketplace_enabled = 1 AND p.marketplace_category = ?';
    
    if (vendor_id) {
      query += ' AND p.vendor_id = ?';
      params.push(vendor_id);
    }
    if (category_id) {
      query += ' AND pc.category_id = ?';
      params.push(category_id);
    }
    
    query += ' ORDER BY p.created_at DESC';
    
    // Get products with marketplace filter
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
            'SELECT * FROM products WHERE parent_id = ? AND status = ? AND marketplace_enabled = 1 AND marketplace_category = ? ORDER BY name ASC',
            [product.id, 'active', 'crafts']
          );
          response.children = children;
        }
        
        // Add parent context if this is a child product
        if (product.parent_id !== null) {
          const [parent] = await db.query(
            'SELECT id, name, product_type, status FROM products WHERE id = ? AND status = ? AND marketplace_enabled = 1 AND marketplace_category = ?',
            [product.parent_id, 'active', 'crafts']
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
    secureLogger.error('Error fetching all crafts marketplace products', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * Get single art marketplace product
 * @route GET /api/curated/art/products/:id
 * @access Public
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Product ID
 * @param {string} req.query.include - Comma-separated list of data to include (inventory,images,shipping,categories,vendor)
 * @param {Object} res - Express response object
 * @returns {Object} Complete art product details with family structure and enriched data
 * @description Retrieves detailed art product information with parent-child relationships and comprehensive data
 */
router.get('/art/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { include } = req.query;
    
    // Parse include parameter
    const includes = include ? include.split(',').map(i => i.trim()) : [];
    
    // Get base product data - PUBLIC ONLY (active, marketplace-enabled art products)
    const [product] = await db.query(
      'SELECT * FROM products WHERE id = ? AND status = ? AND marketplace_enabled = 1 AND marketplace_category = ?',
      [id, 'active', 'art']
    );
    
    if (!product.length) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const requestedProduct = product[0];
    let parentProduct = null;
    let childProducts = [];

    // Determine if we're dealing with a parent or child product
    if (requestedProduct.parent_id === null) {
      // This is a parent product (simple or variable)
      parentProduct = requestedProduct;
      
      // If it's a variable product, get all children (active, marketplace-enabled art only)
      if (requestedProduct.product_type === 'variable') {
        const [children] = await db.query(
          'SELECT * FROM products WHERE parent_id = ? AND status = ? AND marketplace_enabled = 1 AND marketplace_category = ? ORDER BY name ASC',
          [requestedProduct.id, 'active', 'art']
        );
        childProducts = children;
      }
    } else {
      // This is a child product - get parent and all siblings (if parent is art marketplace)
      const [parent] = await db.query(
        'SELECT * FROM products WHERE id = ? AND status = ? AND marketplace_enabled = 1 AND marketplace_category = ?',
        [requestedProduct.parent_id, 'active', 'art']
      );
      
      if (parent.length === 0) {
        return res.status(404).json({ error: 'Parent product not found' });
      }
      
      parentProduct = parent[0];
      
      // Get all siblings (including the requested product) - art marketplace only
      const [siblings] = await db.query(
        'SELECT * FROM products WHERE parent_id = ? AND status = ? AND marketplace_enabled = 1 AND marketplace_category = ? ORDER BY name ASC',
        [requestedProduct.parent_id, 'active', 'art']
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
        // Get temp images for this product
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

    // Add variation data for variable products
    let variationTypes = [];
    let variationOptions = {};
    if (parentProduct.product_type === 'variable' && childProducts.length > 0) {
      const childIds = childProducts.map(child => child.id);
      
      // Get variations for all child products
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

      // Add variations to each child
      processedChildren.forEach(child => {
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

        child.variations = variationsByType;
      });

      // Get all available variation types
      const [types] = await db.query(`
        SELECT DISTINCT vt.id, vt.variation_name
        FROM user_variation_types vt
        JOIN product_variations pv ON vt.id = pv.variation_type_id
        WHERE pv.product_id IN (${childIds.map(() => '?').join(',')})
        ORDER BY vt.variation_name
      `, childIds);
      variationTypes = types;

      // Get all available variation values organized by type
      for (const type of types) {
        const [values] = await db.query(`
          SELECT DISTINCT vv.id, vv.value_name
          FROM user_variation_values vv
          JOIN product_variations pv ON vv.id = pv.variation_value_id
          WHERE pv.variation_type_id = ? AND pv.product_id IN (${childIds.map(() => '?').join(',')})
          ORDER BY vv.value_name
        `, [type.id, ...childIds]);
        
        variationOptions[type.variation_name] = values;
      }
    }

    // Add vendor data to parent (applies to whole family)
    if (includes.includes('vendor')) {
      const [vendor] = await db.query(`
        SELECT u.id, u.username, up.first_name, up.last_name, up.display_name,
               ap.business_name, ap.business_website,
               COALESCE(vss.handling_days, 3) as handling_days
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN artist_profiles ap ON u.id = ap.user_id
        LEFT JOIN vendor_ship_settings vss ON u.id = vss.vendor_id
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
      // Add variation data for variable products
      variation_types: variationTypes,
      variation_options: variationOptions,
      // Add metadata about the family
      family_size: processedChildren.length,
      requested_product_id: parseInt(id),
      is_requested_product_parent: requestedProduct.parent_id === null
    };

    secureLogger.info('Art marketplace product fetched', {
      requestedId: id,
      parentId: parentProduct.id,
      childCount: processedChildren.length,
      productType: parentProduct.product_type
    });

    res.json(response);
  } catch (err) {
    secureLogger.error('Error fetching art marketplace product', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

/**
 * Get single crafts marketplace product
 * @route GET /api/curated/crafts/products/:id
 * @access Public
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Product ID
 * @param {string} req.query.include - Comma-separated list of data to include (inventory,images,shipping,categories,vendor)
 * @param {Object} res - Express response object
 * @returns {Object} Complete crafts product details with family structure and enriched data
 * @description Retrieves detailed crafts product information with parent-child relationships and comprehensive data
 */
router.get('/crafts/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { include } = req.query;
    
    // Parse include parameter
    const includes = include ? include.split(',').map(i => i.trim()) : [];
    
    // Get base product data - PUBLIC ONLY (active, marketplace-enabled crafts products)
    const [product] = await db.query(
      'SELECT * FROM products WHERE id = ? AND status = ? AND marketplace_enabled = 1 AND marketplace_category = ?',
      [id, 'active', 'crafts']
    );
    
    if (!product.length) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const requestedProduct = product[0];
    let parentProduct = null;
    let childProducts = [];

    // Determine if we're dealing with a parent or child product
    if (requestedProduct.parent_id === null) {
      // This is a parent product (simple or variable)
      parentProduct = requestedProduct;
      
      // If it's a variable product, get all children (active, marketplace-enabled crafts only)
      if (requestedProduct.product_type === 'variable') {
        const [children] = await db.query(
          'SELECT * FROM products WHERE parent_id = ? AND status = ? AND marketplace_enabled = 1 AND marketplace_category = ? ORDER BY name ASC',
          [requestedProduct.id, 'active', 'crafts']
        );
        childProducts = children;
      }
    } else {
      // This is a child product - get parent and all siblings (if parent is crafts marketplace)
      const [parent] = await db.query(
        'SELECT * FROM products WHERE id = ? AND status = ? AND marketplace_enabled = 1 AND marketplace_category = ?',
        [requestedProduct.parent_id, 'active', 'crafts']
      );
      
      if (parent.length === 0) {
        return res.status(404).json({ error: 'Parent product not found' });
      }
      
      parentProduct = parent[0];
      
      // Get all siblings (including the requested product) - crafts marketplace only
      const [siblings] = await db.query(
        'SELECT * FROM products WHERE parent_id = ? AND status = ? AND marketplace_enabled = 1 AND marketplace_category = ? ORDER BY name ASC',
        [requestedProduct.parent_id, 'active', 'crafts']
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
        // Get temp images for this product
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

    // Add variation data for variable products
    let variationTypes = [];
    let variationOptions = {};
    if (parentProduct.product_type === 'variable' && childProducts.length > 0) {
      const childIds = childProducts.map(child => child.id);
      
      // Get variations for all child products
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

      // Add variations to each child
      processedChildren.forEach(child => {
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

        child.variations = variationsByType;
      });

      // Get all available variation types
      const [types] = await db.query(`
        SELECT DISTINCT vt.id, vt.variation_name
        FROM user_variation_types vt
        JOIN product_variations pv ON vt.id = pv.variation_type_id
        WHERE pv.product_id IN (${childIds.map(() => '?').join(',')})
        ORDER BY vt.variation_name
      `, childIds);
      variationTypes = types;

      // Get all available variation values organized by type
      for (const type of types) {
        const [values] = await db.query(`
          SELECT DISTINCT vv.id, vv.value_name
          FROM user_variation_values vv
          JOIN product_variations pv ON vv.id = pv.variation_value_id
          WHERE pv.variation_type_id = ? AND pv.product_id IN (${childIds.map(() => '?').join(',')})
          ORDER BY vv.value_name
        `, [type.id, ...childIds]);
        
        variationOptions[type.variation_name] = values;
      }
    }

    // Add vendor data to parent (applies to whole family)
    if (includes.includes('vendor')) {
      const [vendor] = await db.query(`
        SELECT u.id, u.username, up.first_name, up.last_name, up.display_name,
               ap.business_name, ap.business_website,
               COALESCE(vss.handling_days, 3) as handling_days
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN artist_profiles ap ON u.id = ap.user_id
        LEFT JOIN vendor_ship_settings vss ON u.id = vss.vendor_id
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
      // Add variation data for variable products
      variation_types: variationTypes,
      variation_options: variationOptions,
      // Add metadata about the family
      family_size: processedChildren.length,
      requested_product_id: parseInt(id),
      is_requested_product_parent: requestedProduct.parent_id === null
    };

    secureLogger.info('Crafts marketplace product fetched', {
      requestedId: id,
      parentId: parentProduct.id,
      childCount: processedChildren.length,
      productType: parentProduct.product_type
    });

    res.json(response);
  } catch (err) {
    secureLogger.error('Error fetching crafts marketplace product', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

module.exports = router;