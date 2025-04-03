// API service for product-related operations
// This handles all API calls to the backend for product actions

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || '10.128.0.31',
  user: process.env.DB_USER || 'oafuser',
  password: process.env.DB_PASSWORD || 'oafpass',
  database: process.env.DB_NAME || 'oaf',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

class ProductService {
  constructor() {
    this.pool = mysql.createPool(dbConfig);
  }

  /**
   * Get database connection from pool
   */
  async getConnection() {
    return await this.pool.getConnection();
  }
  
  /**
   * Create a draft product
   * @param {Object} data - Product data including user_id
   * @returns {Promise<Object>} Created draft product
   */
  async createDraft(data) {
    const conn = await this.getConnection();
    try {
      await conn.beginTransaction();

      // Check and replenish available SKUs
      const [availableSkus] = await conn.execute(`
        SELECT COUNT(*) as count 
        FROM vendor_sku_log 
        WHERE vendor_id = ? 
        AND product_id IS NULL
      `, [data.user_id]);

      if (availableSkus[0].count < 10) {
        await conn.execute('CALL replenish_vendor_skus(?, 100)', [data.user_id]);
      }

      // Get next available SKU
      const [skuRow] = await conn.execute(`
        SELECT id, sku 
        FROM vendor_sku_log 
        WHERE vendor_id = ? 
        AND product_id IS NULL 
        ORDER BY sku ASC 
        LIMIT 1
      `, [data.user_id]);

      // Generate a temporary SKU if no pre-generated SKU is available
      let nextSku = 'DRAFT-' + Math.random().toString(36).substr(2, 8).toUpperCase();
      let skuId = null;
      if (skuRow.length > 0 && skuRow[0].sku) {
        nextSku = skuRow[0].sku;
        skuId = skuRow[0].id;
      }

      // Ensure we have default values for required fields
      const defaultData = {
        name: 'New Product',
        description: '',
        status: 'draft',
        sku: nextSku,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Merge with provided data, ensuring no undefined values
      const cleanData = {
        ...defaultData,
        ...Object.entries(data).reduce((acc, [key, value]) => {
          if (value !== undefined) {
            acc[key] = value;
          }
          return acc;
        }, {})
      };

      // Ensure vendor_id is set (default to user_id if not provided)
      cleanData.vendor_id = cleanData.vendor_id || cleanData.user_id;

      // Insert the new product
      const [result] = await conn.execute(
        `INSERT INTO products (
          name, 
          vendor_id,
          created_by,
          status, 
          description,
          sku,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          cleanData.name,
          cleanData.vendor_id,
          cleanData.user_id,
          cleanData.status,
          cleanData.description,
          cleanData.sku
        ]
      );

      const draftId = result.insertId;

      // Update the vendor_sku_log to mark the SKU as used
      if (skuId) {
        await conn.execute(
          'UPDATE vendor_sku_log SET product_id = ? WHERE id = ?',
          [draftId, skuId]
        );
      }

      await conn.commit();
      
      return { 
        id: draftId,
        draftId: draftId, // Adding this to match client expectations
        ...cleanData
      };
    } catch (error) {
      await conn.rollback();
      console.error('Database error in createDraft:', error);
      throw new Error(error.message || 'Failed to create draft product');
    } finally {
      conn.release();
    }
  }
  
  /**
   * Get a draft product
   * @param {number} draftId - Draft ID
   * @param {number} userId - User ID requesting the draft
   * @returns {Promise<Object>} Draft product data
   */
  async getDraft(draftId, userId) {
    const conn = await this.getConnection();
    try {
      console.log(`Attempting to get draft ${draftId} for user ${userId}`);
      
      // First check if the product exists at all
      const [anyProduct] = await conn.execute(
        `SELECT id, created_by, status FROM products WHERE id = ?`,
        [draftId]
      );
      
      if (anyProduct.length === 0) {
        console.error(`Draft ${draftId} not found in database`);
        throw new Error('Draft not found');
      }
      
      console.log(`Found product with ID ${draftId}, created_by: ${anyProduct[0].created_by}, status: ${anyProduct[0].status}`);
      
      // Now check if it's a draft and belongs to this user
      const [products] = await conn.execute(
        `SELECT p.* 
         FROM products p 
         WHERE p.id = ? AND p.created_by = ? AND p.status = 'draft'`,
        [draftId, userId]
      );

      if (products.length === 0) {
        // If product exists but isn't a draft owned by this user, give a more specific error
        if (anyProduct[0].status !== 'draft') {
          console.error(`Product ${draftId} exists but is not a draft (status: ${anyProduct[0].status})`);
          throw new Error('Product is not a draft');
        }
        
        if (anyProduct[0].created_by != userId) {
          console.error(`Draft ${draftId} exists but belongs to user ${anyProduct[0].created_by}, not ${userId}`);
          throw new Error('Draft not found or unauthorized');
        }
        
        console.error(`Draft ${draftId} not found or unauthorized for user ${userId}`);
        throw new Error('Draft not found or unauthorized');
      }

      // Check if product_images table has the correct columns
      const [imageColumns] = await conn.execute(
        `SHOW COLUMNS FROM product_images`
      );
      
      console.log('Product image columns:', imageColumns.map(col => col.Field).join(', '));
      
      // Get all images for this product
      const [images] = await conn.execute(
        'SELECT pi.*, pi.image_url as file_path FROM product_images pi WHERE pi.product_id = ? ORDER BY pi.is_primary DESC',
        [draftId]
      );
      
      console.log(`Found ${images.length} media items for draft ${draftId}`);

      return {
        ...products[0],
        images: images.map(img => ({
          id: img.id,
          url: img.file_path || img.image_url,
          title: img.friendly_name,
          isPrimary: Boolean(img.is_primary)
        }))
      };
    } catch (error) {
      console.error('Error getting draft:', error);
      throw new Error(`Failed to retrieve draft product: ${error.message}`);
    } finally {
      conn.release();
    }
  }
  
  /**
   * Update a draft product
   * @param {number} draftId - Draft ID
   * @param {Object} data - Updated product data
   * @param {number} userId - User ID making the update
   * @returns {Promise<Object>} Updated draft product
   */
  async updateDraft(draftId, data, userId) {
    const conn = await this.getConnection();
    try {
      console.log(`Starting transaction to update draft ${draftId} for user ${userId}`);
      await conn.beginTransaction();

      // Verify ownership
      console.log(`Verifying ownership of draft ${draftId} for user ${userId}`);
      const [product] = await conn.execute(
        'SELECT id, sku FROM products WHERE id = ? AND created_by = ? AND status = "draft"',
        [draftId, userId]
      );
      
      console.log(`Found ${product.length} matching drafts`);

      if (product.length === 0) {
        // Check if the product exists at all
        const [anyProduct] = await conn.execute(
          'SELECT id, created_by, status FROM products WHERE id = ?',
          [draftId]
        );
        
        if (anyProduct.length === 0) {
          console.error(`Draft ${draftId} not found in database`);
          throw new Error('Draft product not found');
        }
        
        if (anyProduct[0].status !== 'draft') {
          console.error(`Product ${draftId} exists but is not a draft (status: ${anyProduct[0].status})`);
          throw new Error('Product is not a draft');
        }
        
        if (anyProduct[0].created_by != userId) {
          console.error(`Draft ${draftId} exists but belongs to user ${anyProduct[0].created_by}, not ${userId}`);
          throw new Error('Unauthorized to update this draft');
        }
        
        console.error(`Draft ${draftId} not found or unauthorized for user ${userId}`);
        throw new Error('Draft not found or unauthorized');
      }

      // Clean the update data to remove undefined values
      const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});
      
      console.log(`Cleaned update data:`, cleanData);

      // If SKU is being updated or is missing, handle it specially
      if (cleanData.sku !== undefined) {
        if (!cleanData.sku || cleanData.sku.trim() === '') {
          // Auto-generate a SKU
          console.log(`Auto-generating SKU for draft ${draftId}`);
          const timestamp = Date.now().toString(36);
          const random = Math.random().toString(36).substring(2, 6);
          cleanData.sku = `PROD-${timestamp}-${random}`.toUpperCase();
          console.log(`Generated SKU: ${cleanData.sku}`);
        }
        
        console.log(`Checking SKU uniqueness for "${cleanData.sku}"`);
        // Check if the new SKU is already in use by another product from this vendor
        const [existingSku] = await conn.execute(`
          SELECT p.id, p.name 
          FROM products p 
          WHERE p.vendor_id = ? 
          AND p.sku = ? 
          AND p.id != ?
          AND p.status != 'deleted'`,
          [userId, cleanData.sku, draftId]
        );

        if (existingSku.length > 0) {
          console.error(`SKU "${cleanData.sku}" already in use by product ID ${existingSku[0].id}`);
          throw new Error(`SKU "${cleanData.sku}" is already in use by your product "${existingSku[0].name}" (ID: ${existingSku[0].id}). Please choose a different SKU.`);
        }

        // Update vendor_sku_log to release the old SKU and assign the new one
        await conn.execute(
          'UPDATE vendor_sku_log SET product_id = NULL WHERE vendor_id = ? AND product_id = ?',
          [userId, draftId]
        );

        // If the new SKU exists in vendor_sku_log, assign it to this product
        const [skuRow] = await conn.execute(
          'SELECT id FROM vendor_sku_log WHERE vendor_id = ? AND sku = ?',
          [userId, cleanData.sku]
        );

        if (skuRow.length > 0) {
          console.log(`Assigning existing SKU record to product`);
          await conn.execute(
            'UPDATE vendor_sku_log SET product_id = ? WHERE id = ?',
            [draftId, skuRow[0].id]
          );
        } else {
          // Add the new SKU to vendor_sku_log
          console.log(`Adding new SKU to vendor_sku_log`);
          await conn.execute(
            'INSERT INTO vendor_sku_log (vendor_id, sku, product_id, created_at) VALUES (?, ?, ?, NOW())',
            [userId, cleanData.sku, draftId]
          );
        }
      } else {
        // If no SKU is provided and this is an update, check if we need to auto-generate one
        const [currentProduct] = await conn.execute(
          'SELECT sku FROM products WHERE id = ?',
          [draftId]
        );
        
        if (currentProduct.length > 0 && (!currentProduct[0].sku || currentProduct[0].sku.trim() === '')) {
          // Auto-generate a SKU
          console.log(`Auto-generating SKU for draft ${draftId} because it's missing`);
          const timestamp = Date.now().toString(36);
          const random = Math.random().toString(36).substring(2, 6);
          cleanData.sku = `PROD-${timestamp}-${random}`.toUpperCase();
          console.log(`Generated SKU: ${cleanData.sku}`);
          
          // Add the field to be updated
          updateFields.push('sku = ?');
          updateValues.push(cleanData.sku);
          
          // Add the new SKU to vendor_sku_log
          console.log(`Adding new auto-generated SKU to vendor_sku_log`);
          await conn.execute(
            'INSERT INTO vendor_sku_log (vendor_id, sku, product_id, created_at) VALUES (?, ?, ?, NOW())',
            [userId, cleanData.sku, draftId]
          );
        }
      }

      // Build the update query dynamically based on available fields
      const updateFields = [];
      const updateValues = [];
      
      // List of allowed fields to update
      const allowedFields = [
        'name',
        'description',
        'price',
        'sku',
        'status',
        'category_id',
        'shipping_weight',
        'shipping_width',
        'shipping_height',
        'shipping_length',
        'inventory_quantity'
      ];

      // Add each field that exists in cleanData
      allowedFields.forEach(field => {
        if (cleanData[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(cleanData[field]);
        }
      });

      // Always update the updated_at timestamp
      updateFields.push('updated_at = NOW()');

      // Only proceed with update if there are fields to update
      if (updateFields.length > 0) {
        const updateQuery = `
          UPDATE products 
          SET ${updateFields.join(', ')}
          WHERE id = ?`;
        
        console.log(`Executing update query with ${updateFields.length} fields for product ${draftId}`);
        console.log('Update query:', updateQuery);
        console.log('Update values:', [...updateValues, draftId]);

        await conn.execute(
          updateQuery,
          [...updateValues, draftId]
        );
        
        console.log(`Update completed successfully`);
      } else {
        console.log(`No fields to update for draft ${draftId}`);
      }

      await conn.commit();
      console.log(`Transaction committed for draft ${draftId}`);
      
      return this.getDraft(draftId, userId);
    } catch (error) {
      console.error(`Error updating draft ${draftId}:`, error);
      try {
        await conn.rollback();
        console.log(`Transaction rolled back due to error`);
      } catch (rollbackError) {
        console.error(`Rollback failed:`, rollbackError);
      }
      throw new Error(error.message || 'Failed to update draft product');
    } finally {
      conn.release();
    }
  }

  /**
   * Handle media upload
   * @param {number} productId - Product ID
   * @param {Object} file - File object from multer
   * @param {number} userId - User ID uploading the file
   * @returns {Promise<Object>} Upload result
   */
  async handleMediaUpload(productId, file, userId) {
    const conn = await this.getConnection();
    try {
      await conn.beginTransaction();

      // Verify product ownership
      const [product] = await conn.execute(
        'SELECT id FROM products WHERE id = ? AND user_id = ?',
        [productId, userId]
      );

      if (product.length === 0) {
        throw new Error('Product not found or unauthorized');
      }

      // Insert into media_library
      const [mediaResult] = await conn.execute(
        `INSERT INTO media_library 
         (user_id, file_path, mime_type, original_filename, size_bytes, uploaded_at, status)
         VALUES (?, ?, ?, ?, ?, NOW(), 'active')`,
        [userId, file.path, file.mimetype, file.originalname, file.size]
      );

      const mediaId = mediaResult.insertId;

      // Link to product
      await conn.execute(
        'INSERT INTO product_images (product_id, media_id, is_primary) VALUES (?, ?, ?)',
        [productId, mediaId, false]
      );

      await conn.commit();

      return {
        id: mediaId,
        url: file.path,
        name: file.originalname,
        type: file.mimetype,
        size: file.size
      };
            } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  /**
   * Set featured image
   * @param {number} productId - Product ID
   * @param {number} mediaId - Media ID
   * @param {number} userId - User ID making the change
   * @returns {Promise<Object>} Update result
   */
  async setFeaturedImage(productId, mediaId, userId) {
    const conn = await this.getConnection();
    try {
      await conn.beginTransaction();

      // Verify ownership
      const [product] = await conn.execute(
        'SELECT id FROM products WHERE id = ? AND user_id = ?',
        [productId, userId]
      );

      if (product.length === 0) {
        throw new Error('Product not found or unauthorized');
      }

      await conn.execute(
        'UPDATE product_images SET is_primary = 0 WHERE product_id = ?',
        [productId]
      );

      await conn.execute(
        'UPDATE product_images SET is_primary = 1 WHERE product_id = ? AND media_id = ?',
        [productId, mediaId]
      );

      await conn.commit();
      return { success: true };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  /**
   * Delete media
   * @param {number} productId - Product ID
   * @param {number} mediaId - Media ID
   * @param {number} userId - User ID making the deletion
   * @returns {Promise<Object>} Delete result
   */
  async deleteMedia(productId, mediaId, userId) {
    const conn = await this.getConnection();
    try {
      await conn.beginTransaction();

      // Verify ownership
      const [product] = await conn.execute(
        'SELECT id FROM products WHERE id = ? AND user_id = ?',
        [productId, userId]
      );

      if (product.length === 0) {
        throw new Error('Product not found or unauthorized');
      }

      // Get media file path
      const [media] = await conn.execute(
        'SELECT file_path FROM media_library WHERE id = ?',
        [mediaId]
      );

      if (media.length > 0) {
        // Delete file if it exists
        try {
          await fs.unlink(media[0].file_path);
        } catch (err) {
          console.error('Error deleting file:', err);
          // Continue with database cleanup even if file deletion fails
        }
      }

      // Remove from product_images
      await conn.execute(
        'DELETE FROM product_images WHERE product_id = ? AND media_id = ?',
        [productId, mediaId]
      );

      // Remove from media_library
      await conn.execute(
        'DELETE FROM media_library WHERE id = ? AND user_id = ?',
        [mediaId, userId]
      );

      await conn.commit();
      return { success: true };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
  
  /**
   * Get shipping services
   * @returns {Promise<Array>} List of shipping services
   */
  async getShippingServices() {
    const conn = await this.getConnection();
    try {
      const [services] = await conn.execute('SELECT * FROM shipping_services WHERE active = 1');
      return services;
    } finally {
      conn.release();
    }
  }

  /**
   * Transform flat categories list into a nested tree structure
   * @param {Array} categories - Flat list of categories
   * @returns {Array} Nested category tree
   */
  buildCategoryTree(categories) {
    console.log('Building category tree from categories:', categories.length);
    
    // First, create a map for faster lookups
    const categoryMap = {};
    
    // Pre-process all categories
    categories.forEach(category => {
      // Ensure IDs are treated as numbers
      const id = Number(category.id);
      
      // Create the category with proper structure
      categoryMap[id] = {
        ...category,
        id: id,
        // Ensure parent_id is null or a number
        parent_id: category.parent_id !== null ? Number(category.parent_id) : null,
        // Make sure we have an array for children
        children: []
      };
    });
    
    console.log(`Created category map with ${Object.keys(categoryMap).length} entries`);
    
    // Create the tree structure
    const rootCategories = [];
    
    // Process all categories to build the tree
    categories.forEach(category => {
      const id = Number(category.id);
      const categoryNode = categoryMap[id];
      
      // If this is a root category (no parent)
      if (category.parent_id === null) {
        rootCategories.push(categoryNode);
      } else {
        // This is a child category, find its parent
        const parentId = Number(category.parent_id);
        const parentCategory = categoryMap[parentId];
        
        if (parentCategory) {
          console.log(`Adding child category ${id} (${category.name}) to parent ${parentId}`);
          parentCategory.children.push(categoryNode);
        } else {
          console.warn(`Parent category ${parentId} not found for ${category.name}, treating as root`);
          rootCategories.push(categoryNode);
        }
      }
    });
    
    // Sort children arrays by name within each parent
    Object.values(categoryMap).forEach(category => {
      if (category.children && category.children.length > 0) {
        category.children.sort((a, b) => a.name.localeCompare(b.name));
      }
    });
    
    // Log the result for debugging
    console.log(`Final tree has ${rootCategories.length} root categories`);
    rootCategories.forEach(root => {
      console.log(`Root category ${root.name} has ${root.children.length} children`);
    });
    
    return rootCategories;
  }

  /**
   * Get categories
   * @returns {Promise<Array>} List of categories in a tree structure
   */
  async getCategories() {
    const conn = await this.getConnection();
    try {
      console.log('Fetching categories from database...');
      
      // Get all categories ordered by parent_id (nulls first)
      const [categories] = await conn.execute(`
        SELECT 
          id,
          name,
          parent_id,
          description
        FROM categories 
        ORDER BY 
          CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END,
          parent_id,
          name
      `);
      
      console.log(`Retrieved ${categories.length} categories from database`);
      
      // Log some examples to debug
      if (categories.length > 0) {
        console.log('Sample categories:');
        console.log('First category:', categories[0]);
        
        // Find a category with parent_id
        const childCategory = categories.find(c => c.parent_id !== null);
        if (childCategory) {
          console.log('Sample child category:', childCategory);
          console.log('Parent ID type:', typeof childCategory.parent_id);
        }
      }

      // Transform the flat list into a tree structure
      const categoryTree = this.buildCategoryTree(categories);
      
      console.log(`Returning category tree with ${categoryTree.length} root categories`);

      return categoryTree;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new Error('Failed to fetch categories');
    } finally {
      conn.release();
    }
  }

  /**
   * Add media files to a draft product
   * @param {number} draftId - Draft ID
   * @param {Array} files - Array of file objects
   * @param {number} userId - User ID making the request
   * @returns {Promise<Array>} Array of saved media objects
   */
  async addMediaToDraft(draftId, files, userId) {
    const conn = await this.getConnection();
    try {
      await conn.beginTransaction();

      console.log(`Adding ${files.length} media files to draft ${draftId} for user ${userId}`);

      // Verify product ownership
      const [product] = await conn.execute(
        'SELECT id FROM products WHERE id = ? AND created_by = ? AND status = "draft"',
        [draftId, userId]
      );

      if (product.length === 0) {
        throw new Error('Draft product not found or unauthorized');
      }

      const savedMedia = [];

      // Check if this is the first image for the product
      const [existingImages] = await conn.execute(
        'SELECT COUNT(*) as count FROM product_images WHERE product_id = ?',
        [draftId]
      );

      const isFirstImage = existingImages[0].count === 0;

      // Process each file
      for (const file of files) {
        // Log the file being processed
        console.log(`Processing file: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);
        console.log(`File temp path: ${file.tempPath || file.path}`);
        
        // Make sure we have a valid file path
        const filePath = file.tempPath || file.path;
        if (!filePath) {
          console.warn(`Skipping file ${file.originalname} with missing path`);
          continue;
        }

        // Create a URL for the client to use
        // Extract just the filename from the path
        const filename = path.basename(filePath);
        const fileUrl = `/tmp/${filename}`;

        console.log(`Media file URL: ${fileUrl}`);

        // Determine if this image should be primary
        const isPrimary = isFirstImage && savedMedia.length === 0;

        // Link to product in product_images table
        const [imageResult] = await conn.execute(
          'INSERT INTO product_images (product_id, image_url, friendly_name, is_primary) VALUES (?, ?, ?, ?)',
          [draftId, fileUrl, file.originalname, isPrimary ? 1 : 0]
        );

        console.log(`Added product image with ID ${imageResult.insertId}`);

        savedMedia.push({
          id: imageResult.insertId,
          productId: draftId,
          url: fileUrl,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          isPrimary
        });
      }

      await conn.commit();
      console.log(`Successfully added ${savedMedia.length} media files to draft ${draftId}`);
      return savedMedia;
    } catch (error) {
      await conn.rollback();
      console.error('Error adding media to draft:', error);
      throw new Error(error.message || 'Failed to add media to draft product');
    } finally {
      conn.release();
    }
  }
}

module.exports = new ProductService();
