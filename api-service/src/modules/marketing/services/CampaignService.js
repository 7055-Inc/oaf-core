/**
 * Campaign Service
 * 
 * Manages marketing campaigns:
 * - CRUD operations for campaigns
 * - Status transitions (draft → planning → active → completed)
 * - Budget tracking
 * - Goal setting and tracking
 */

const db = require('../../../../config/db');

class CampaignService {
  /**
   * Get all campaigns (with optional filters)
   */
  async getCampaigns(filters = {}) {
    try {
      let query = 'SELECT * FROM marketing_campaigns WHERE 1=1';
      const params = [];

      // Filter by owner
      if (filters.owner_type && filters.owner_id) {
        query += ' AND owner_type = ? AND owner_id = ?';
        params.push(filters.owner_type, filters.owner_id);
      }

      // Filter by status
      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      // Filter by type
      if (filters.type) {
        query += ' AND type = ?';
        params.push(filters.type);
      }

      // Date range
      if (filters.start_date) {
        query += ' AND start_date >= ?';
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        query += ' AND end_date <= ?';
        params.push(filters.end_date);
      }

      query += ' ORDER BY created_at DESC';

      // Pagination
      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(parseInt(filters.limit));
        
        if (filters.offset) {
          query += ' OFFSET ?';
          params.push(parseInt(filters.offset));
        }
      }

      const [campaigns] = await db.execute(query, params);

      // Parse JSON fields
      campaigns.forEach(campaign => {
        if (campaign.goals && typeof campaign.goals === 'string') {
          campaign.goals = JSON.parse(campaign.goals);
        }
      });

      return { success: true, campaigns };
    } catch (error) {
      console.error('Get campaigns error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get single campaign by ID
   */
  async getCampaignById(id, userId = null, isAdmin = false) {
    try {
      let query = 'SELECT * FROM marketing_campaigns WHERE id = ?';
      const params = [id];

      // Non-admin users can only access their own campaigns
      if (!isAdmin && userId) {
        query += ' AND owner_type = ? AND owner_id = ?';
        params.push('user', userId);
      }

      const [campaigns] = await db.execute(query, params);

      if (campaigns.length === 0) {
        return { success: false, error: 'Campaign not found' };
      }

      const campaign = campaigns[0];
      
      // Parse JSON fields
      if (campaign.goals && typeof campaign.goals === 'string') {
        campaign.goals = JSON.parse(campaign.goals);
      }

      // Get content count
      const [content] = await db.execute(
        'SELECT COUNT(*) as count FROM marketing_content WHERE campaign_id = ?',
        [id]
      );
      campaign.content_count = content[0].count;

      return { success: true, campaign };
    } catch (error) {
      console.error('Get campaign error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new campaign
   */
  async createCampaign(data) {
    try {
      const {
        name,
        description,
        type,
        status = 'draft',
        owner_type = 'admin',
        owner_id,
        budget_cents = 0,
        start_date,
        end_date,
        goals
      } = data;

      // Validate required fields
      if (!name || !type || !owner_id) {
        return { 
          success: false, 
          error: 'Missing required fields: name, type, owner_id' 
        };
      }

      // Validate type
      const validTypes = ['social', 'email', 'blog', 'ad', 'video'];
      if (!validTypes.includes(type)) {
        return { 
          success: false, 
          error: `Invalid type. Must be one of: ${validTypes.join(', ')}` 
        };
      }

      const query = `
        INSERT INTO marketing_campaigns 
        (name, description, type, status, owner_type, owner_id, budget_cents, start_date, end_date, goals)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        name,
        description || null,
        type,
        status,
        owner_type,
        owner_id,
        budget_cents,
        start_date || null,
        end_date || null,
        goals ? JSON.stringify(goals) : null
      ];

      const [result] = await db.execute(query, params);

      return { 
        success: true, 
        campaign_id: result.insertId,
        message: 'Campaign created successfully'
      };
    } catch (error) {
      console.error('Create campaign error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update campaign
   */
  async updateCampaign(id, data, userId = null, isAdmin = false) {
    try {
      // Check if campaign exists and user has access
      const existing = await this.getCampaignById(id, userId, isAdmin);
      if (!existing.success) {
        return existing;
      }

      const updates = [];
      const params = [];

      // Build dynamic update query
      const allowedFields = [
        'name', 'description', 'type', 'status', 'budget_cents', 
        'start_date', 'end_date', 'goals'
      ];

      allowedFields.forEach(field => {
        if (data[field] !== undefined) {
          updates.push(`${field} = ?`);
          params.push(
            field === 'goals' && typeof data[field] === 'object' 
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
        UPDATE marketing_campaigns 
        SET ${updates.join(', ')}
        WHERE id = ?
      `;

      await db.execute(query, params);

      return { 
        success: true, 
        message: 'Campaign updated successfully'
      };
    } catch (error) {
      console.error('Update campaign error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete campaign (and all associated content)
   */
  async deleteCampaign(id, userId = null, isAdmin = false) {
    try {
      // Check if campaign exists and user has access
      const existing = await this.getCampaignById(id, userId, isAdmin);
      if (!existing.success) {
        return existing;
      }

      // Delete campaign (CASCADE will handle content, feedback, analytics)
      await db.execute('DELETE FROM marketing_campaigns WHERE id = ?', [id]);

      return { 
        success: true, 
        message: 'Campaign deleted successfully'
      };
    } catch (error) {
      console.error('Delete campaign error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(id) {
    try {
      const [stats] = await db.execute(`
        SELECT 
          COUNT(DISTINCT mc.id) as total_content,
          SUM(CASE WHEN mc.status = 'published' THEN 1 ELSE 0 END) as published_count,
          SUM(CASE WHEN mc.status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_count,
          SUM(CASE WHEN mc.status = 'draft' THEN 1 ELSE 0 END) as draft_count,
          COALESCE(SUM(ma.impressions), 0) as total_impressions,
          COALESCE(SUM(ma.engagements), 0) as total_engagements,
          COALESCE(SUM(ma.clicks), 0) as total_clicks,
          COALESCE(SUM(ma.conversions), 0) as total_conversions,
          COALESCE(SUM(ma.spend_cents), 0) as total_spend_cents
        FROM marketing_content mc
        LEFT JOIN marketing_analytics ma ON mc.id = ma.content_id
        WHERE mc.campaign_id = ?
      `, [id]);

      return { 
        success: true, 
        stats: stats[0]
      };
    } catch (error) {
      console.error('Get campaign stats error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new CampaignService();
