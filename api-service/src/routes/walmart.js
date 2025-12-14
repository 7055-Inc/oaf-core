/**
 * Walmart Marketplace Connector Routes
 * Basic CRUD for walmart_corporate_products and walmart_inventory_allocations
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/jwt');
const db = require('../../config/db');

// Common Walmart categories for art/craft marketplace
// These match Walmart's actual 5.0 taxonomy for product type determination
// Format: id (internal), name (display), path (Walmart taxonomy path), productType (Walmart schema type)
const WALMART_ART_CATEGORIES = [
  // Home > Picture & Art Décor
  { id: 'wall-sculptures', name: 'Wall Sculptures', path: 'Home > Picture & Art Décor > Wall Sculptures', productType: 'Wall Sculptures' },
  { id: 'wall-art', name: 'Wall Art', path: 'Home > Picture & Art Décor > Wall Art', productType: 'Wall Art' },
  { id: 'art-prints', name: 'Art Prints & Posters', path: 'Home > Picture & Art Décor > Art > Art Prints & Posters', productType: 'Art Prints & Posters' },
  { id: 'paintings', name: 'Paintings', path: 'Home > Picture & Art Décor > Art > Paintings', productType: 'Paintings' },
  { id: 'photography', name: 'Photography', path: 'Home > Picture & Art Décor > Art > Photography', productType: 'Photography' },
  { id: 'picture-frames', name: 'Picture Frames', path: 'Home > Picture & Art Décor > Picture Frames', productType: 'Picture Frames' },
  { id: 'canvas-art', name: 'Canvas Art', path: 'Home > Picture & Art Décor > Wall Art > Canvas Art', productType: 'Canvas Art' },
  
  // Home > Decorative Accents
  { id: 'decorative-sculptures', name: 'Decorative Sculptures', path: 'Home > Decorative Accents > Decorative Sculptures & Figurines', productType: 'Decorative Sculptures & Figurines' },
  { id: 'vases', name: 'Vases', path: 'Home > Decorative Accents > Vases', productType: 'Vases' },
  { id: 'decorative-bowls', name: 'Decorative Bowls', path: 'Home > Decorative Accents > Decorative Bowls', productType: 'Decorative Bowls' },
  { id: 'decorative-pillows', name: 'Decorative Pillows', path: 'Home > Decorative Accents > Decorative Pillows', productType: 'Decorative Pillows' },
  { id: 'home-decor', name: 'Other Home Décor', path: 'Home > Decorative Accents', productType: 'Decorative Accents' },
  
  // Jewelry
  { id: 'handmade-necklaces', name: 'Handmade Necklaces', path: 'Jewelry > Necklaces', productType: 'Necklaces' },
  { id: 'handmade-earrings', name: 'Handmade Earrings', path: 'Jewelry > Earrings', productType: 'Earrings' },
  { id: 'handmade-bracelets', name: 'Handmade Bracelets', path: 'Jewelry > Bracelets', productType: 'Bracelets' },
  { id: 'handmade-rings', name: 'Handmade Rings', path: 'Jewelry > Rings', productType: 'Rings' },
  
  // Arts, Crafts & Sewing
  { id: 'art-supplies', name: 'Art Supplies', path: 'Arts, Crafts & Sewing > Art Supplies', productType: 'Art Supplies' },
  { id: 'craft-supplies', name: 'Craft Supplies', path: 'Arts, Crafts & Sewing > Crafting', productType: 'Crafting' },
  
  // Other
  { id: 'gift-sets', name: 'Gift Sets', path: 'Gifts > Gift Sets', productType: 'Gift Sets' },
  { id: 'collectibles', name: 'Collectibles', path: 'Toys > Collectibles', productType: 'Collectibles' }
];

// In-memory cache for Walmart taxonomy (refreshes every 24 hours)
let taxonomyCache = { data: null, lastFetch: 0 };
const TAXONOMY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch Walmart access token
 */
async function getWalmartToken() {
  const axios = require('axios');
  const baseUrl = process.env.WALMART_ENV === 'production'
    ? 'https://marketplace.walmartapis.com'
    : 'https://sandbox.walmartapis.com';
  
  const clientId = process.env.WALMART_ENV === 'production'
    ? process.env.WALMART_CLIENT_ID
    : process.env.WALMART_SANDBOX_CLIENT_ID;
  
  const clientSecret = process.env.WALMART_ENV === 'production'
    ? process.env.WALMART_CLIENT_SECRET
    : process.env.WALMART_SANDBOX_CLIENT_SECRET;
  
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const tokenRes = await axios.post(
    `${baseUrl}/v3/token`,
    'grant_type=client_credentials',
    {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'WM_SVC.NAME': 'Brakebee Marketplace'
      }
    }
  );
  
  return { token: tokenRes.data.access_token, baseUrl };
}

/**
 * Flatten Walmart taxonomy into dropdown-friendly format
 * Structure: itemTaxonomy[] -> category -> productTypeGroup[] -> productType[]
 */
function flattenTaxonomy(itemTaxonomy, results = []) {
  if (!itemTaxonomy || !Array.isArray(itemTaxonomy)) return results;
  
  for (const category of itemTaxonomy) {
    const categoryName = category.category || category.description;
    
    // Each category has productTypeGroups
    if (category.productTypeGroup && Array.isArray(category.productTypeGroup)) {
      for (const group of category.productTypeGroup) {
        const groupName = group.productTypeGroupName || group.description;
        const groupPath = `${categoryName} > ${groupName}`;
        
        // Each group has productTypes
        if (group.productType && Array.isArray(group.productType)) {
          for (const pt of group.productType) {
            const productTypeName = pt.productTypeName;
            results.push({
              id: productTypeName.replace(/\s+/g, '-').toLowerCase(),
              name: productTypeName,
              path: groupPath,
              productType: productTypeName,
              description: pt.description || ''
            });
          }
        }
      }
    }
  }
  
  return results;
}

/**
 * GET /api/walmart/categories
 * Get Walmart categories from live Taxonomy API (cached 24h)
 */
router.get('/categories', verifyToken, async (req, res) => {
  try {
    const now = Date.now();
    
    // Check if we have valid cached data
    if (taxonomyCache.data && (now - taxonomyCache.lastFetch) < TAXONOMY_CACHE_TTL) {
      return res.json({ success: true, categories: taxonomyCache.data, cached: true });
    }
    
    // Fetch from Walmart Taxonomy API
    const axios = require('axios');
    const { token, baseUrl } = await getWalmartToken();
    
    const taxonomyRes = await axios.get(
      `${baseUrl}/v3/utilities/taxonomy?feedType=item&version=5.0`,
      {
        headers: {
          'WM_SEC.ACCESS_TOKEN': token,
          'Accept': 'application/json',
          'WM_SVC.NAME': 'Brakebee Marketplace'
        }
      }
    );
    
    // Flatten the taxonomy for dropdown use
    const flatCategories = flattenTaxonomy(taxonomyRes.data.itemTaxonomy || []);
    
    // Sort alphabetically by name
    flatCategories.sort((a, b) => a.name.localeCompare(b.name));
    
    // Cache the result
    taxonomyCache = { data: flatCategories, lastFetch: now };
    
    res.json({ success: true, categories: flatCategories, cached: false });
  } catch (error) {
    console.error('Error fetching Walmart taxonomy:', error.response?.data || error.message);
    
    // Fallback to hardcoded categories if API fails
    res.json({ 
      success: true, 
      categories: WALMART_ART_CATEGORIES, 
      fallback: true,
      error: 'Using fallback categories - Walmart API unavailable'
    });
  }
});

/**
 * POST /api/walmart/categories/refresh
 * Force refresh the taxonomy cache (admin only)
 */
router.post('/categories/refresh', verifyToken, async (req, res) => {
  try {
    // Clear cache to force refresh
    taxonomyCache = { data: null, lastFetch: 0 };
    
    // Fetch fresh from Walmart
    const axios = require('axios');
    const { token, baseUrl } = await getWalmartToken();
    
    const taxonomyRes = await axios.get(
      `${baseUrl}/v3/utilities/taxonomy?feedType=item&version=5.0`,
      {
        headers: {
          'WM_SEC.ACCESS_TOKEN': token,
          'Accept': 'application/json',
          'WM_SVC.NAME': 'Brakebee Marketplace'
        }
      }
    );
    
    const flatCategories = flattenTaxonomy(taxonomyRes.data.itemTaxonomy || []);
    flatCategories.sort((a, b) => a.name.localeCompare(b.name));
    
    taxonomyCache = { data: flatCategories, lastFetch: Date.now() };
    
    res.json({ 
      success: true, 
      message: 'Taxonomy cache refreshed',
      categoryCount: flatCategories.length 
    });
  } catch (error) {
    console.error('Error refreshing taxonomy:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Failed to refresh taxonomy' });
  }
});

/**
 * GET /api/walmart/products
 * Get all user's products with Walmart data
 */
router.get('/products', verifyToken, async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.price,
        p.wholesale_price,
        p.inventory_count,
        wcp.id as walmart_id,
        wcp.walmart_item_id,
        wcp.walmart_title,
        wcp.walmart_description,
        wcp.walmart_price,
        wcp.is_active,
        wcp.listing_status,
        wcp.terms_accepted_at,
        wcp.removed_at,
        wcp.cooldown_ends_at,
        wcp.sync_status,
        wia.allocated_quantity
      FROM products p
      LEFT JOIN walmart_corporate_products wcp ON p.id = wcp.product_id
      LEFT JOIN walmart_inventory_allocations wia ON p.id = wia.product_id AND wia.user_id = ?
      WHERE p.vendor_id = ? AND p.status = 'active'
      ORDER BY p.name ASC
    `, [req.userId, req.userId]);
    
    res.json({ success: true, products });
  } catch (error) {
    console.error('Error fetching Walmart products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/walmart/products/:productId
 * Get Walmart data for a specific product
 */
router.get('/products/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const [rows] = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.short_description,
        p.price,
        p.wholesale_price,
        p.width,
        p.height,
        p.depth,
        p.weight,
        p.dimension_unit,
        p.weight_unit,
        wcp.id as walmart_id,
        wcp.walmart_item_id,
        wcp.walmart_title,
        wcp.walmart_description,
        wcp.walmart_short_description,
        wcp.walmart_price,
        wcp.walmart_category_id,
        wcp.walmart_category_path,
        wcp.walmart_product_type,
        wcp.walmart_brand,
        wcp.walmart_manufacturer,
        wcp.walmart_key_features,
        wcp.walmart_main_image_url,
        wcp.walmart_additional_images,
        wcp.walmart_color,
        wcp.walmart_size,
        wcp.walmart_material,
        wcp.walmart_msrp,
        wcp.walmart_shipping_weight,
        wcp.walmart_shipping_length,
        wcp.walmart_shipping_width,
        wcp.walmart_shipping_height,
        wcp.walmart_tax_code,
        wcp.is_active,
        wcp.listing_status,
        wcp.terms_accepted_at,
        wcp.removed_at,
        wcp.cooldown_ends_at,
        wcp.sync_status,
        wia.allocated_quantity,
        -- Get vendor brand name for default
        COALESCE(ap.business_name, 'Brakebee Marketplace') as vendor_brand
      FROM products p
      LEFT JOIN walmart_corporate_products wcp ON p.id = wcp.product_id
      LEFT JOIN walmart_inventory_allocations wia ON p.id = wia.product_id AND wia.user_id = ?
      LEFT JOIN artist_profiles ap ON p.vendor_id = ap.user_id
      WHERE p.id = ? AND p.vendor_id = ?
    `, [req.userId, productId, req.userId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    res.json({ success: true, product: rows[0] });
  } catch (error) {
    console.error('Error fetching Walmart product:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

/**
 * POST /api/walmart/products/:productId
 * Create/update Walmart product data (opt-in)
 */
router.post('/products/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      walmart_title,
      walmart_description,
      walmart_short_description,
      walmart_price,
      walmart_category_id,
      walmart_category_path,
      walmart_product_type,
      walmart_brand,
      walmart_manufacturer,
      walmart_key_features,
      walmart_main_image_url,
      walmart_additional_images,
      walmart_color,
      walmart_size,
      walmart_material,
      walmart_msrp,
      walmart_shipping_weight,
      walmart_shipping_length,
      walmart_shipping_width,
      walmart_shipping_height,
      walmart_tax_code,
      allocated_quantity,
      terms_accepted,
      is_active
    } = req.body;
    
    // Verify ownership
    const [check] = await db.query(
      'SELECT id, name FROM products WHERE id = ? AND vendor_id = ?',
      [productId, req.userId]
    );
    
    if (check.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    // Helper to convert empty strings to null for database
    const toNullIfEmpty = (val) => (val === '' || val === undefined) ? null : val;
    const toDecimalOrNull = (val) => {
      if (val === '' || val === undefined || val === null) return null;
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    };
    
    // Convert key_features array to JSON string if needed
    const keyFeaturesJson = walmart_key_features 
      ? (typeof walmart_key_features === 'string' ? walmart_key_features : JSON.stringify(walmart_key_features))
      : null;
    
    const additionalImagesJson = walmart_additional_images
      ? (typeof walmart_additional_images === 'string' ? walmart_additional_images : JSON.stringify(walmart_additional_images))
      : null;
    
    // Insert/update walmart_corporate_products with all fields
    await db.query(`
      INSERT INTO walmart_corporate_products (
        product_id, user_id, walmart_title, walmart_description, walmart_short_description,
        walmart_price, walmart_category_id, walmart_category_path, walmart_product_type, walmart_brand, walmart_manufacturer,
        walmart_key_features, walmart_main_image_url, walmart_additional_images,
        walmart_color, walmart_size, walmart_material, walmart_msrp,
        walmart_shipping_weight, walmart_shipping_length, walmart_shipping_width, walmart_shipping_height,
        walmart_tax_code, is_active, listing_status, terms_accepted_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ${terms_accepted ? 'NOW()' : 'NULL'}, ?)
      ON DUPLICATE KEY UPDATE
        walmart_title = VALUES(walmart_title),
        walmart_description = VALUES(walmart_description),
        walmart_short_description = VALUES(walmart_short_description),
        walmart_price = VALUES(walmart_price),
        walmart_category_id = VALUES(walmart_category_id),
        walmart_category_path = VALUES(walmart_category_path),
        walmart_product_type = VALUES(walmart_product_type),
        walmart_brand = VALUES(walmart_brand),
        walmart_manufacturer = VALUES(walmart_manufacturer),
        walmart_key_features = VALUES(walmart_key_features),
        walmart_main_image_url = VALUES(walmart_main_image_url),
        walmart_additional_images = VALUES(walmart_additional_images),
        walmart_color = VALUES(walmart_color),
        walmart_size = VALUES(walmart_size),
        walmart_material = VALUES(walmart_material),
        walmart_msrp = VALUES(walmart_msrp),
        walmart_shipping_weight = VALUES(walmart_shipping_weight),
        walmart_shipping_length = VALUES(walmart_shipping_length),
        walmart_shipping_width = VALUES(walmart_shipping_width),
        walmart_shipping_height = VALUES(walmart_shipping_height),
        walmart_tax_code = VALUES(walmart_tax_code),
        is_active = VALUES(is_active),
        listing_status = CASE 
          WHEN VALUES(is_active) = 0 AND listing_status = 'listed' THEN 'listed'
          WHEN VALUES(is_active) = 1 THEN 'pending'
          ELSE listing_status 
        END,
        removed_at = CASE WHEN VALUES(is_active) = 0 THEN NOW() ELSE NULL END,
        cooldown_ends_at = NULL,
        sync_status = 'pending',
        updated_at = CURRENT_TIMESTAMP
    `, [
      productId, 
      req.userId, 
      toNullIfEmpty(walmart_title) || check[0].name, 
      toNullIfEmpty(walmart_description), 
      toNullIfEmpty(walmart_short_description),
      toDecimalOrNull(walmart_price), 
      toNullIfEmpty(walmart_category_id), 
      toNullIfEmpty(walmart_category_path), 
      toNullIfEmpty(walmart_product_type),
      toNullIfEmpty(walmart_brand), 
      toNullIfEmpty(walmart_manufacturer),
      keyFeaturesJson, 
      toNullIfEmpty(walmart_main_image_url), 
      additionalImagesJson,
      toNullIfEmpty(walmart_color), 
      toNullIfEmpty(walmart_size), 
      toNullIfEmpty(walmart_material), 
      toDecimalOrNull(walmart_msrp),
      toDecimalOrNull(walmart_shipping_weight), 
      toDecimalOrNull(walmart_shipping_length), 
      toDecimalOrNull(walmart_shipping_width), 
      toDecimalOrNull(walmart_shipping_height),
      toNullIfEmpty(walmart_tax_code), 
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      req.userId
    ]);
    
    // Handle allocation
    if (allocated_quantity !== undefined) {
      const qty = parseInt(allocated_quantity) || 0;
      if (qty > 0) {
        await db.query(`
          INSERT INTO walmart_inventory_allocations (user_id, product_id, allocated_quantity)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE allocated_quantity = VALUES(allocated_quantity), updated_at = CURRENT_TIMESTAMP
        `, [req.userId, productId, qty]);
      } else {
        await db.query('DELETE FROM walmart_inventory_allocations WHERE user_id = ? AND product_id = ?', [req.userId, productId]);
      }
    }
    
    res.json({ success: true, message: 'Walmart product data saved' });
  } catch (error) {
    console.error('Error saving Walmart product:', error);
    res.status(500).json({ success: false, error: 'Failed to save product' });
  }
});

/**
 * PUT /api/walmart/products/:productId
 * Update Walmart product data
 */
router.put('/products/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const { walmart_title, walmart_description, walmart_price, allocated_quantity } = req.body;
    
    // Verify ownership
    const [check] = await db.query(
      'SELECT id FROM products WHERE id = ? AND vendor_id = ?',
      [productId, req.userId]
    );
    
    if (check.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    await db.query(`
      UPDATE walmart_corporate_products 
      SET walmart_title = COALESCE(?, walmart_title),
          walmart_description = COALESCE(?, walmart_description),
          walmart_price = COALESCE(?, walmart_price),
          sync_status = 'pending',
          updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ? AND user_id = ?
    `, [walmart_title, walmart_description, walmart_price, productId, req.userId]);
    
    if (allocated_quantity !== undefined) {
      const qty = parseInt(allocated_quantity) || 0;
      if (qty > 0) {
        await db.query(`
          INSERT INTO walmart_inventory_allocations (user_id, product_id, allocated_quantity)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE allocated_quantity = VALUES(allocated_quantity), updated_at = CURRENT_TIMESTAMP
        `, [req.userId, productId, qty]);
      } else {
        await db.query('DELETE FROM walmart_inventory_allocations WHERE user_id = ? AND product_id = ?', [req.userId, productId]);
      }
    }
    
    res.json({ success: true, message: 'Walmart product updated' });
  } catch (error) {
    console.error('Error updating Walmart product:', error);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

/**
 * DELETE /api/walmart/products/:productId
 * Remove product from Walmart (sets cooldown)
 */
router.delete('/products/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Verify ownership
    const [check] = await db.query(
      'SELECT id FROM products WHERE id = ? AND vendor_id = ?',
      [productId, req.userId]
    );
    
    if (check.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    // Set 60-day cooldown
    const cooldownEnd = new Date();
    cooldownEnd.setDate(cooldownEnd.getDate() + 60);
    
    await db.query(`
      UPDATE walmart_corporate_products 
      SET is_active = 0,
          listing_status = 'removing',
          removed_at = NOW(),
          cooldown_ends_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ? AND user_id = ?
    `, [cooldownEnd, productId, req.userId]);
    
    res.json({ success: true, message: 'Product removed', cooldown_ends_at: cooldownEnd });
  } catch (error) {
    console.error('Error removing Walmart product:', error);
    res.status(500).json({ success: false, error: 'Failed to remove product' });
  }
});

/**
 * GET /api/walmart/allocations
 * Get all inventory allocations
 */
router.get('/allocations', verifyToken, async (req, res) => {
  try {
    const [allocations] = await db.query(`
      SELECT wia.*, p.name, p.inventory_count
      FROM walmart_inventory_allocations wia
      JOIN products p ON wia.product_id = p.id
      WHERE wia.user_id = ?
    `, [req.userId]);
    
    res.json({ success: true, allocations });
  } catch (error) {
    console.error('Error fetching allocations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch allocations' });
  }
});

// ============================================
// ADMIN ROUTES - Require manage_system permission
// ============================================

const { requirePermission } = require('../middleware/permissions');

/**
 * GET /api/walmart/admin/products
 * Get all Walmart products across all vendors (admin)
 */
router.get('/admin/products', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 25, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let statusFilter = '';
    if (status === 'pending') statusFilter = "AND wcp.listing_status = 'pending'";
    else if (status === 'active') statusFilter = "AND wcp.listing_status = 'listed'";
    else if (status === 'paused') statusFilter = "AND wcp.listing_status = 'paused'";
    
    let searchFilter = '';
    const searchParams = [];
    if (search) {
      searchFilter = "AND (p.name LIKE ? OR u.username LIKE ? OR wcp.walmart_title LIKE ?)";
      const searchTerm = `%${search}%`;
      searchParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Get total count
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total
      FROM walmart_corporate_products wcp
      JOIN products p ON wcp.product_id = p.id
      JOIN users u ON wcp.user_id = u.id
      WHERE 1=1 ${statusFilter} ${searchFilter}
    `, searchParams);
    
    const total = countResult[0].total;
    
    // Get products
    const [products] = await db.query(`
      SELECT 
        wcp.id,
        wcp.product_id,
        wcp.user_id,
        wcp.walmart_item_id,
        wcp.walmart_title,
        wcp.walmart_description,
        wcp.walmart_price,
        wcp.is_active,
        wcp.listing_status,
        wcp.sync_status,
        wcp.created_at,
        p.name,
        p.price,
        p.wholesale_price,
        p.inventory_count,
        u.username,
        u.email as vendor_email,
        up.display_name as vendor_name,
        wia.allocated_quantity
      FROM walmart_corporate_products wcp
      JOIN products p ON wcp.product_id = p.id
      JOIN users u ON wcp.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN walmart_inventory_allocations wia ON wcp.product_id = wia.product_id
      WHERE 1=1 ${statusFilter} ${searchFilter}
      ORDER BY wcp.created_at DESC
      LIMIT ? OFFSET ?
    `, [...searchParams, parseInt(limit), offset]);
    
    res.json({ success: true, products, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Error fetching admin Walmart products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

/**
 * POST /api/walmart/admin/products/:productId/activate
 * Activate a product for the Walmart feed (admin)
 */
router.post('/admin/products/:productId/activate', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { productId } = req.params;
    
    await db.query(`
      UPDATE walmart_corporate_products 
      SET listing_status = 'listed',
          is_active = 1,
          sync_status = 'pending',
          updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ?
    `, [productId]);
    
    // Log the action
    await db.query(`
      INSERT INTO walmart_sync_logs (user_id, sync_type, operation, reference_id, status, message)
      VALUES (?, 'product', 'update', ?, 'success', 'Admin activated product for Walmart feed')
    `, [req.userId, productId]);
    
    res.json({ success: true, message: 'Product activated' });
  } catch (error) {
    console.error('Error activating product:', error);
    res.status(500).json({ success: false, error: 'Failed to activate product' });
  }
});

/**
 * POST /api/walmart/admin/products/:productId/pause
 * Pause a product from the Walmart feed (admin)
 */
router.post('/admin/products/:productId/pause', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { productId } = req.params;
    
    await db.query(`
      UPDATE walmart_corporate_products 
      SET listing_status = 'paused',
          sync_status = 'pending',
          updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ?
    `, [productId]);
    
    // Log the action
    await db.query(`
      INSERT INTO walmart_sync_logs (user_id, sync_type, operation, reference_id, status, message)
      VALUES (?, 'product', 'update', ?, 'success', 'Admin paused product from Walmart feed')
    `, [req.userId, productId]);
    
    res.json({ success: true, message: 'Product paused' });
  } catch (error) {
    console.error('Error pausing product:', error);
    res.status(500).json({ success: false, error: 'Failed to pause product' });
  }
});

/**
 * PUT /api/walmart/admin/products/:productId
 * Update Walmart product data (admin)
 */
router.put('/admin/products/:productId', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { productId } = req.params;
    const { walmart_title, walmart_description, walmart_price } = req.body;
    
    await db.query(`
      UPDATE walmart_corporate_products 
      SET walmart_title = COALESCE(?, walmart_title),
          walmart_description = COALESCE(?, walmart_description),
          walmart_price = COALESCE(?, walmart_price),
          sync_status = 'pending',
          updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ?
    `, [walmart_title, walmart_description, walmart_price, productId]);
    
    res.json({ success: true, message: 'Product updated' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

module.exports = router;
