/**
 * Tag Service
 * Handles tag management operations for subscribers
 */

const db = require('../../../../config/db');
const { parseTags } = require('../utils/validation');

class TagService {
  /**
   * Get all unique tags for user's subscribers
   * 
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of unique tags
   */
  async getAllTags(userId) {
    const [rows] = await db.execute(
      `SELECT DISTINCT tags
      FROM user_email_lists
      WHERE user_id = ? AND tags IS NOT NULL`,
      [userId]
    );
    
    // Extract unique tags from JSON arrays
    const tagsSet = new Set();
    
    rows.forEach(row => {
      if (row.tags) {
        try {
          const tags = JSON.parse(row.tags);
          if (Array.isArray(tags)) {
            tags.forEach(tag => tagsSet.add(tag));
          }
        } catch (error) {
          // Skip invalid JSON
        }
      }
    });
    
    return Array.from(tagsSet).sort();
  }

  /**
   * Add tags to subscriber
   * 
   * @param {number} userId - User ID
   * @param {number} userListId - user_email_lists.id
   * @param {Array|string} newTags - Tags to add
   * @returns {Promise<Object>} Updated subscriber
   */
  async addTags(userId, userListId, newTags) {
    // Verify ownership
    const [existing] = await db.execute(
      'SELECT tags FROM user_email_lists WHERE id = ? AND user_id = ?',
      [userListId, userId]
    );
    
    if (existing.length === 0) {
      throw new Error('Subscriber not found');
    }
    
    // Get current tags
    let currentTags = [];
    if (existing[0].tags) {
      try {
        currentTags = JSON.parse(existing[0].tags);
      } catch (error) {
        currentTags = [];
      }
    }
    
    // Parse and add new tags
    const tagsToAdd = parseTags(newTags);
    const updatedTags = [...new Set([...currentTags, ...tagsToAdd])]; // Remove duplicates
    
    // Update subscriber
    await db.execute(
      'UPDATE user_email_lists SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(updatedTags), userListId]
    );
    
    return { tags: updatedTags };
  }

  /**
   * Remove tags from subscriber
   * 
   * @param {number} userId - User ID
   * @param {number} userListId - user_email_lists.id
   * @param {Array|string} tagsToRemove - Tags to remove
   * @returns {Promise<Object>} Updated subscriber
   */
  async removeTags(userId, userListId, tagsToRemove) {
    // Verify ownership
    const [existing] = await db.execute(
      'SELECT tags FROM user_email_lists WHERE id = ? AND user_id = ?',
      [userListId, userId]
    );
    
    if (existing.length === 0) {
      throw new Error('Subscriber not found');
    }
    
    // Get current tags
    let currentTags = [];
    if (existing[0].tags) {
      try {
        currentTags = JSON.parse(existing[0].tags);
      } catch (error) {
        currentTags = [];
      }
    }
    
    // Parse tags to remove
    const removeSet = new Set(parseTags(tagsToRemove));
    
    // Filter out tags to remove
    const updatedTags = currentTags.filter(tag => !removeSet.has(tag));
    
    // Update subscriber
    await db.execute(
      'UPDATE user_email_lists SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [JSON.stringify(updatedTags), userListId]
    );
    
    return { tags: updatedTags };
  }

  /**
   * Bulk tag operation (add tag to filtered list)
   * 
   * @param {number} userId - User ID
   * @param {string} tagToAdd - Tag to add
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Operation result
   */
  async bulkTag(userId, tagToAdd, filters = {}) {
    const { tags, status = 'subscribed', source } = filters;
    
    // Parse and validate tag to add
    const validTags = parseTags([tagToAdd]);
    if (validTags.length === 0) {
      throw new Error('Invalid tag');
    }
    const validTag = validTags[0];
    
    // Build WHERE clause
    let whereClause = ['user_id = ?'];
    let params = [userId];
    
    if (status && status !== 'all') {
      whereClause.push('status = ?');
      params.push(status);
    }
    
    // Tag filter
    if (tags && tags.length > 0) {
      const tagConditions = tags.map(() => 'JSON_CONTAINS(tags, ?)').join(' OR ');
      whereClause.push(`(${tagConditions})`);
      tags.forEach(tag => {
        params.push(JSON.stringify(tag));
      });
    }
    
    if (source) {
      whereClause.push('source = ?');
      params.push(source);
    }
    
    const where = whereClause.join(' AND ');
    
    // Get matching subscribers
    const [subscribers] = await db.execute(
      `SELECT id, tags FROM user_email_lists WHERE ${where}`,
      params
    );
    
    let updated = 0;
    
    // Update each subscriber
    for (const sub of subscribers) {
      let currentTags = [];
      if (sub.tags) {
        try {
          currentTags = JSON.parse(sub.tags);
        } catch (error) {
          currentTags = [];
        }
      }
      
      // Add tag if not already present
      if (!currentTags.includes(validTag)) {
        currentTags.push(validTag);
        
        await db.execute(
          'UPDATE user_email_lists SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [JSON.stringify(currentTags), sub.id]
        );
        
        updated++;
      }
    }
    
    return {
      total_matched: subscribers.length,
      updated,
      tag_added: validTag
    };
  }

  /**
   * Get tag statistics
   * 
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Tag statistics
   */
  async getTagStats(userId) {
    const [rows] = await db.execute(
      `SELECT tags, status
      FROM user_email_lists
      WHERE user_id = ? AND tags IS NOT NULL`,
      [userId]
    );
    
    const tagCounts = {};
    
    rows.forEach(row => {
      if (row.tags) {
        try {
          const tags = JSON.parse(row.tags);
          if (Array.isArray(tags)) {
            tags.forEach(tag => {
              if (!tagCounts[tag]) {
                tagCounts[tag] = {
                  tag,
                  total: 0,
                  subscribed: 0,
                  unsubscribed: 0
                };
              }
              
              tagCounts[tag].total++;
              
              if (row.status === 'subscribed') {
                tagCounts[tag].subscribed++;
              } else if (row.status === 'unsubscribed') {
                tagCounts[tag].unsubscribed++;
              }
            });
          }
        } catch (error) {
          // Skip invalid JSON
        }
      }
    });
    
    return Object.values(tagCounts).sort((a, b) => b.total - a.total);
  }
}

module.exports = new TagService();
