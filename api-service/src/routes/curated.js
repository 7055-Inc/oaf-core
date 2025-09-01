const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { secureLogger } = require('../middleware/secureLogger');

// GET /curated/art/products/all - Get all products from art marketplace
router.get('/art/products/all', async (req, res) => {
  try {
    const { include, vendor_id, category_id } = req.query;
    
    // Parse include parameter
    const includes = include ? include.split(',').map(i => i.trim()) : [];
    
    // Build query with marketplace filters - PUBLIC ONLY (active, marketplace-enabled art products)
    let query = 'SELECT * FROM products WHERE status = ? AND marketplace_enabled = 1 AND marketplace_category = ?';
    let params = ['active', 'art'];
    
    if (vendor_id) {
      query += ' AND vendor_id = ?';
      params.push(vendor_id);
    }
    if (category_id) {
      query += ' AND category_id = ?';
      params.push(category_id);
    }
    
    query += ' ORDER BY created_at DESC';
    
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

// GET /curated/crafts/products/all - Get all products from crafts marketplace
router.get('/crafts/products/all', async (req, res) => {
  try {
    const { include, vendor_id, category_id } = req.query;
    
    // Parse include parameter
    const includes = include ? include.split(',').map(i => i.trim()) : [];
    
    // Build query with marketplace filters - PUBLIC ONLY (active, marketplace-enabled crafts products)
    let query = 'SELECT * FROM products WHERE status = ? AND marketplace_enabled = 1 AND marketplace_category = ?';
    let params = ['active', 'crafts'];
    
    if (vendor_id) {
      query += ' AND vendor_id = ?';
      params.push(vendor_id);
    }
    if (category_id) {
      query += ' AND category_id = ?';
      params.push(category_id);
    }
    
    query += ' ORDER BY created_at DESC';
    
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

// GET /curated/art/products/:id - Get single product from art marketplace
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

// GET /curated/crafts/products/:id - Get single product from crafts marketplace
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