/**
 * Asset Service
 * 
 * Manages marketing media assets:
 * - Upload and store media files
 * - Organize assets by owner
 * - Tag and search assets
 * - Generate thumbnails
 */

const db = require('../../../../config/db');
const fs = require('fs').promises;
const path = require('path');

class AssetService {
  constructor() {
    // Base upload directory for marketing assets
    this.uploadDir = '/var/www/staging/temp_images/marketing';
  }

  /**
   * Get all assets (with filters)
   */
  async getAssets(filters = {}) {
    try {
      let query = 'SELECT * FROM marketing_assets WHERE 1=1';
      const params = [];

      // Filter by owner
      if (filters.owner_type && filters.owner_id) {
        query += ' AND owner_type = ? AND owner_id = ?';
        params.push(filters.owner_type, filters.owner_id);
      }

      // Filter by type
      if (filters.type) {
        query += ' AND type = ?';
        params.push(filters.type);
      }

      // Search by tags
      if (filters.tags) {
        query += ' AND tags LIKE ?';
        params.push(`%${filters.tags}%`);
      }

      // Date range
      if (filters.from_date) {
        query += ' AND created_at >= ?';
        params.push(filters.from_date);
      }

      if (filters.to_date) {
        query += ' AND created_at <= ?';
        params.push(filters.to_date);
      }

      query += ' ORDER BY created_at DESC';

      // Pagination — embed directly since LIMIT/OFFSET with prepared statement placeholders
      // can fail with mysql2 execute() in some configurations
      if (filters.limit) {
        const lim = Math.max(1, parseInt(filters.limit, 10) || 50);
        query += ` LIMIT ${lim}`;
        if (filters.offset) {
          const off = Math.max(0, parseInt(filters.offset, 10) || 0);
          query += ` OFFSET ${off}`;
        }
      }

      const [assets] = await db.execute(query, params);

      // Parse JSON metadata
      assets.forEach(asset => {
        if (asset.metadata && typeof asset.metadata === 'string') {
          asset.metadata = JSON.parse(asset.metadata);
        }
      });

      return { success: true, assets };
    } catch (error) {
      console.error('Get assets error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get single asset by ID
   */
  async getAssetById(id, userId = null, isAdmin = false) {
    try {
      let query = 'SELECT * FROM marketing_assets WHERE id = ?';
      const params = [id];

      // Non-admin users can only access their own assets
      if (!isAdmin && userId) {
        query += ' AND owner_type = ? AND owner_id = ?';
        params.push('user', userId);
      }

      const [assets] = await db.execute(query, params);

      if (assets.length === 0) {
        return { success: false, error: 'Asset not found' };
      }

      const asset = assets[0];
      
      // Parse JSON metadata
      if (asset.metadata && typeof asset.metadata === 'string') {
        asset.metadata = JSON.parse(asset.metadata);
      }

      return { success: true, asset };
    } catch (error) {
      console.error('Get asset error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Register uploaded asset in database
   * Note: Actual file upload should be handled by multer middleware in routes
   */
  async createAsset(data) {
    try {
      const {
        owner_type = 'admin',
        owner_id,
        type,
        file_path,
        thumbnail_path = null,
        metadata = {},
        tags = null
      } = data;

      // Validate required fields
      if (!owner_id || !type || !file_path) {
        return { 
          success: false, 
          error: 'Missing required fields: owner_id, type, file_path' 
        };
      }

      // Validate type
      const validTypes = ['image', 'video', 'audio', 'document'];
      if (!validTypes.includes(type)) {
        return { 
          success: false, 
          error: `Invalid type. Must be one of: ${validTypes.join(', ')}` 
        };
      }

      const query = `
        INSERT INTO marketing_assets 
        (owner_type, owner_id, type, file_path, thumbnail_path, metadata, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        owner_type,
        owner_id,
        type,
        file_path,
        thumbnail_path,
        JSON.stringify(metadata),
        tags
      ];

      const [result] = await db.execute(query, params);

      return { 
        success: true, 
        asset_id: result.insertId,
        message: 'Asset created successfully'
      };
    } catch (error) {
      console.error('Create asset error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update asset metadata
   */
  async updateAsset(id, data, userId = null, isAdmin = false) {
    try {
      // Check if asset exists and user has access
      const existing = await this.getAssetById(id, userId, isAdmin);
      if (!existing.success) {
        return existing;
      }

      const updates = [];
      const params = [];

      // Build dynamic update query
      const allowedFields = ['tags', 'metadata', 'thumbnail_path'];

      allowedFields.forEach(field => {
        if (data[field] !== undefined) {
          updates.push(`${field} = ?`);
          params.push(
            field === 'metadata' && typeof data[field] === 'object' 
              ? JSON.stringify(data[field]) 
              : data[field]
          );
        }
      });

      if (updates.length === 0) {
        return { success: false, error: 'No fields to update' };
      }

      params.push(id);

      const query = `
        UPDATE marketing_assets 
        SET ${updates.join(', ')}
        WHERE id = ?
      `;

      await db.execute(query, params);

      return { 
        success: true, 
        message: 'Asset updated successfully'
      };
    } catch (error) {
      console.error('Update asset error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete asset (and remove file from disk)
   */
  async deleteAsset(id, userId = null, isAdmin = false) {
    try {
      // Check if asset exists and user has access
      const existing = await this.getAssetById(id, userId, isAdmin);
      if (!existing.success) {
        return existing;
      }

      const asset = existing.asset;

      // Check if asset is used in any content
      const [usedInContent] = await db.execute(`
        SELECT COUNT(*) as count 
        FROM marketing_content 
        WHERE JSON_CONTAINS(content, ?, '$.media_urls')
      `, [JSON.stringify(asset.file_path)]);

      if (usedInContent[0].count > 0) {
        return { 
          success: false, 
          error: 'Cannot delete asset that is used in published content' 
        };
      }

      // Delete from database
      await db.execute('DELETE FROM marketing_assets WHERE id = ?', [id]);

      // Optionally delete file from disk (uncomment if needed)
      // try {
      //   await fs.unlink(asset.file_path);
      //   if (asset.thumbnail_path) {
      //     await fs.unlink(asset.thumbnail_path);
      //   }
      // } catch (fileError) {
      //   console.error('File deletion error:', fileError);
      //   // Continue even if file deletion fails
      // }

      return { 
        success: true, 
        message: 'Asset deleted successfully'
      };
    } catch (error) {
      console.error('Delete asset error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get asset usage statistics
   */
  async getAssetUsage(id) {
    try {
      // This is a simplified check - in production you'd want more sophisticated tracking
      const [result] = await db.execute(`
        SELECT 
          COUNT(DISTINCT mc.id) as times_used,
          COUNT(DISTINCT mc.campaign_id) as campaigns_used_in
        FROM marketing_content mc
        WHERE JSON_SEARCH(mc.content, 'one', ?, NULL, '$.media_urls') IS NOT NULL
      `, [id.toString()]);

      return { 
        success: true, 
        usage: result[0]
      };
    } catch (error) {
      console.error('Get asset usage error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(ownerId = null, ownerType = null) {
    try {
      let query = `
        SELECT 
          owner_type,
          owner_id,
          type,
          COUNT(*) as asset_count,
          SUM(JSON_EXTRACT(metadata, '$.size')) as total_size_bytes
        FROM marketing_assets
        WHERE 1=1
      `;
      const params = [];

      if (ownerId && ownerType) {
        query += ' AND owner_type = ? AND owner_id = ?';
        params.push(ownerType, ownerId);
      }

      query += ' GROUP BY owner_type, owner_id, type';

      const [stats] = await db.execute(query, params);

      return { 
        success: true, 
        stats
      };
    } catch (error) {
      console.error('Get storage stats error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search assets by tags or metadata
   */
  async searchAssets(searchTerm, filters = {}) {
    try {
      let query = `
        SELECT * FROM marketing_assets 
        WHERE (tags LIKE ? OR JSON_SEARCH(metadata, 'one', ?) IS NOT NULL)
      `;
      const params = [`%${searchTerm}%`, `%${searchTerm}%`];

      // Filter by owner
      if (filters.owner_type && filters.owner_id) {
        query += ' AND owner_type = ? AND owner_id = ?';
        params.push(filters.owner_type, filters.owner_id);
      }

      // Filter by type
      if (filters.type) {
        query += ' AND type = ?';
        params.push(filters.type);
      }

      query += ' ORDER BY created_at DESC LIMIT 50';

      const [assets] = await db.execute(query, params);

      // Parse JSON metadata
      assets.forEach(asset => {
        if (asset.metadata && typeof asset.metadata === 'string') {
          asset.metadata = JSON.parse(asset.metadata);
        }
      });

      return { 
        success: true, 
        assets,
        search_term: searchTerm
      };
    } catch (error) {
      console.error('Search assets error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new AssetService();
