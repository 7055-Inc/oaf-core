/**
 * Content Service
 * 
 * Manages marketing content:
 * - Content creation and editing
 * - Status workflow management
 * - Content versioning
 * - Platform-specific validation
 */

const db = require('../../../../config/db');

class ContentService {
  /**
   * Get all content (with filters)
   */
  async getContent(filters = {}) {
    try {
      let query = `
        SELECT mc.*, mcamp.name as campaign_name, mcamp.owner_type, mcamp.owner_id
        FROM marketing_content mc
        LEFT JOIN marketing_campaigns mcamp ON mc.campaign_id = mcamp.id
        WHERE 1=1
      `;
      const params = [];

      // Filter by campaign
      if (filters.campaign_id) {
        query += ' AND mc.campaign_id = ?';
        params.push(filters.campaign_id);
      }

      // Filter by owner (for user-specific content)
      if (filters.owner_type && filters.owner_id) {
        query += ' AND mcamp.owner_type = ? AND mcamp.owner_id = ?';
        params.push(filters.owner_type, filters.owner_id);
      }

      // Filter by status
      if (filters.status) {
        query += ' AND mc.status = ?';
        params.push(filters.status);
      }

      // Filter by channel
      if (filters.channel) {
        query += ' AND mc.channel = ?';
        params.push(filters.channel);
      }

      // Filter by type
      if (filters.type) {
        query += ' AND mc.type = ?';
        params.push(filters.type);
      }

      // Scheduled content
      if (filters.scheduled === true) {
        query += ' AND mc.scheduled_at IS NOT NULL AND mc.status = "scheduled"';
      }

      // Content ready to publish
      if (filters.ready_to_publish === true) {
        query += ' AND mc.status = "scheduled" AND mc.scheduled_at <= NOW()';
      }

      query += ' ORDER BY mc.created_at DESC';

      // Pagination
      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(parseInt(filters.limit));
        
        if (filters.offset) {
          query += ' OFFSET ?';
          params.push(parseInt(filters.offset));
        }
      }

      const [content] = await db.execute(query, params);

      // Parse JSON fields
      content.forEach(item => {
        if (item.content && typeof item.content === 'string') {
          item.content = JSON.parse(item.content);
        }
      });

      return { success: true, content };
    } catch (error) {
      console.error('Get content error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get single content item by ID
   */
  async getContentById(id, userId = null, isAdmin = false) {
    try {
      let query = `
        SELECT mc.*, mcamp.name as campaign_name, mcamp.owner_type, mcamp.owner_id
        FROM marketing_content mc
        LEFT JOIN marketing_campaigns mcamp ON mc.campaign_id = mcamp.id
        WHERE mc.id = ?
      `;
      const params = [id];

      // Non-admin users can only access their own content
      if (!isAdmin && userId) {
        query += ' AND mcamp.owner_type = ? AND mcamp.owner_id = ?';
        params.push('user', userId);
      }

      const [content] = await db.execute(query, params);

      if (content.length === 0) {
        return { success: false, error: 'Content not found' };
      }

      const item = content[0];
      
      // Parse JSON field
      if (item.content && typeof item.content === 'string') {
        item.content = JSON.parse(item.content);
      }

      // Get feedback history
      const [feedback] = await db.execute(
        'SELECT * FROM marketing_feedback WHERE content_id = ? ORDER BY created_at DESC',
        [id]
      );
      item.feedback_history = feedback;

      return { success: true, content: item };
    } catch (error) {
      console.error('Get content error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new content
   */
  async createContent(data) {
    try {
      const {
        campaign_id,
        type,
        channel,
        content,
        status = 'draft',
        scheduled_at,
        created_by = 'human'
      } = data;

      // Validate required fields (campaign_id is optional for manual/standalone posts)
      if (!type || !channel || !content) {
        return { 
          success: false, 
          error: 'Missing required fields: type, channel, content' 
        };
      }

      // Validate campaign exists (if provided)
      if (campaign_id) {
        const [campaigns] = await db.execute(
          'SELECT id FROM marketing_campaigns WHERE id = ?',
          [campaign_id]
        );

        if (campaigns.length === 0) {
          return { success: false, error: 'Campaign not found' };
        }
      }

      // Validate content structure
      const validation = this.validateContent(type, channel, content);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const query = `
        INSERT INTO marketing_content 
        (campaign_id, type, channel, status, content, scheduled_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        campaign_id,
        type,
        channel,
        status,
        JSON.stringify(content),
        scheduled_at || null,
        created_by
      ];

      const [result] = await db.execute(query, params);

      return { 
        success: true, 
        content: { id: result.insertId },
        content_id: result.insertId,
        message: 'Content created successfully'
      };
    } catch (error) {
      console.error('Create content error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update content
   */
  async updateContent(id, data, userId = null, isAdmin = false) {
    try {
      // Check if content exists and user has access
      const existing = await this.getContentById(id, userId, isAdmin);
      if (!existing.success) {
        return existing;
      }

      // Don't allow editing published content
      if (existing.content.status === 'published') {
        return { 
          success: false, 
          error: 'Cannot edit published content. Create a new version instead.' 
        };
      }

      const updates = [];
      const params = [];

      // Build dynamic update query
      const allowedFields = ['type', 'channel', 'status', 'content', 'scheduled_at'];

      allowedFields.forEach(field => {
        if (data[field] !== undefined) {
          updates.push(`${field} = ?`);
          params.push(
            field === 'content' && typeof data[field] === 'object' 
              ? JSON.stringify(data[field]) 
              : data[field]
          );
        }
      });

      if (updates.length === 0) {
        return { success: false, error: 'No fields to update' };
      }

      // Increment revision number if content changed
      if (data.content) {
        updates.push('revision_number = revision_number + 1');
      }

      params.push(id);

      const query = `
        UPDATE marketing_content 
        SET ${updates.join(', ')}
        WHERE id = ?
      `;

      await db.execute(query, params);

      return { 
        success: true, 
        message: 'Content updated successfully'
      };
    } catch (error) {
      console.error('Update content error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete content
   */
  async deleteContent(id, userId = null, isAdmin = false) {
    try {
      // Check if content exists and user has access
      const existing = await this.getContentById(id, userId, isAdmin);
      if (!existing.success) {
        return existing;
      }

      // Don't allow deleting published content
      if (existing.content.status === 'published') {
        return { 
          success: false, 
          error: 'Cannot delete published content' 
        };
      }

      await db.execute('DELETE FROM marketing_content WHERE id = ?', [id]);

      return { 
        success: true, 
        message: 'Content deleted successfully'
      };
    } catch (error) {
      console.error('Delete content error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate content structure based on type and channel
   */
  validateContent(type, channel, content) {
    // Basic validation - content should be an object
    if (typeof content !== 'object') {
      return { valid: false, error: 'Content must be an object' };
    }

    // Type-specific validation
    const validTypes = ['post', 'story', 'reel', 'video', 'email', 'article', 'ad'];
    if (!validTypes.includes(type)) {
      return { valid: false, error: `Invalid type: ${type}` };
    }

    // Channel-specific validation
    const validChannels = [
      'instagram', 'facebook', 'tiktok', 'twitter', 'pinterest',
      'email', 'blog', 'google_ads', 'bing_ads', 'meta_ads'
    ];
    if (!validChannels.includes(channel)) {
      return { valid: false, error: `Invalid channel: ${channel}` };
    }

    // Social media posts should have text/caption or media
    if (['post', 'story', 'reel', 'video'].includes(type)) {
      if (!content.text && !content.caption && !content.media_urls) {
        return { 
          valid: false, 
          error: 'Social media content must have text, caption, or media_urls' 
        };
      }
    }

    // Email should have subject and body
    if (type === 'email') {
      if (!content.subject || !content.body) {
        return { 
          valid: false, 
          error: 'Email content must have subject and body' 
        };
      }
    }

    // Article should have title and body
    if (type === 'article') {
      if (!content.title || !content.body) {
        return { 
          valid: false, 
          error: 'Article content must have title and body' 
        };
      }
    }

    // Ads should have headline and description
    if (type === 'ad') {
      if (!content.headline || !content.description) {
        return { 
          valid: false, 
          error: 'Ad content must have headline and description' 
        };
      }
    }

    return { valid: true };
  }

  /**
   * Change content status
   */
  async updateStatus(id, status, userId = null) {
    try {
      const validStatuses = [
        'draft', 'pending_review', 'revision_requested', 
        'approved', 'scheduled', 'published', 'failed'
      ];

      if (!validStatuses.includes(status)) {
        return { 
          success: false, 
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        };
      }

      const query = `
        UPDATE marketing_content 
        SET status = ?, approved_by = ?
        WHERE id = ?
      `;

      await db.execute(query, [status, userId, id]);

      return { 
        success: true, 
        message: `Content status updated to ${status}`
      };
    } catch (error) {
      console.error('Update content status error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark content as published
   */
  async markAsPublished(id, externalId = null) {
    try {
      const query = `
        UPDATE marketing_content 
        SET status = 'published', 
            published_at = NOW(),
            external_id = ?
        WHERE id = ?
      `;

      await db.execute(query, [externalId, id]);

      return { 
        success: true, 
        message: 'Content marked as published'
      };
    } catch (error) {
      console.error('Mark as published error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark content as failed
   */
  async markAsFailed(id, reason = null) {
    try {
      await db.execute(
        'UPDATE marketing_content SET status = ? WHERE id = ?',
        ['failed', id]
      );

      // Log failure reason as feedback
      if (reason) {
        await db.execute(
          'INSERT INTO marketing_feedback (content_id, action, feedback, created_by) VALUES (?, ?, ?, ?)',
          [id, 'comment', `Publishing failed: ${reason}`, 0]
        );
      }

      return { 
        success: true, 
        message: 'Content marked as failed'
      };
    } catch (error) {
      console.error('Mark as failed error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ContentService();
