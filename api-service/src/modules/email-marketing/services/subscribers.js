/**
 * Subscriber Service
 * Handles subscriber CRUD with email deduplication, CSV import/export
 */

const db = require('../../../../config/db');
const { generateEmailHash, normalizeEmail } = require('../utils/emailHash');
const { isValidEmail, sanitizeString, parseTags, validateCustomFields } = require('../utils/validation');

class SubscriberService {
  /**
   * List user's subscribers with filtering and pagination
   * 
   * @param {number} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Subscribers and pagination
   */
  async listSubscribers(userId, filters = {}) {
    const {
      tags,
      status = 'subscribed',
      search,
      source,
      page = 1,
      limit = 50
    } = filters;
    
    const offset = (page - 1) * limit;
    
    let whereClause = ['uel.user_id = ?'];
    let params = [userId];
    
    // Status filter
    if (status && status !== 'all') {
      whereClause.push('uel.status = ?');
      params.push(status);
    }
    
    // Tag filter (JSON_CONTAINS for MySQL 5.7+)
    if (tags && tags.length > 0) {
      const tagConditions = tags.map(() => 'JSON_CONTAINS(uel.tags, ?)').join(' OR ');
      whereClause.push(`(${tagConditions})`);
      tags.forEach(tag => {
        params.push(JSON.stringify(tag));
      });
    }
    
    // Search filter (email, name)
    if (search) {
      whereClause.push('(es.email LIKE ? OR es.first_name LIKE ? OR es.last_name LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }
    
    // Source filter
    if (source) {
      whereClause.push('uel.source = ?');
      params.push(source);
    }
    
    const where = whereClause.join(' AND ');
    
    // Get total count
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total
      FROM user_email_lists uel
      JOIN email_subscribers es ON uel.subscriber_id = es.id
      WHERE ${where}`,
      params
    );
    const total = countResult[0].total;
    
    // Get subscribers
    const [subscribers] = await db.execute(
      `SELECT 
        uel.id,
        uel.subscriber_id,
        es.email,
        es.first_name,
        es.last_name,
        es.global_unsubscribe,
        es.global_bounce,
        es.global_spam_complaint,
        uel.status,
        uel.tags,
        uel.custom_fields,
        uel.source,
        uel.total_opens,
        uel.total_clicks,
        uel.last_open_at,
        uel.last_click_at,
        uel.subscribed_at,
        uel.unsubscribed_at
      FROM user_email_lists uel
      JOIN email_subscribers es ON uel.subscriber_id = es.id
      WHERE ${where}
      ORDER BY uel.subscribed_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    return {
      subscribers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Add subscriber (with deduplication)
   * 
   * @param {number} userId - User ID
   * @param {Object} subscriberData - Subscriber data
   * @returns {Promise<Object>} Created subscriber
   */
  async addSubscriber(userId, subscriberData) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const {
        email,
        first_name,
        last_name,
        tags = [],
        custom_fields = {},
        source = 'manual'
      } = subscriberData;
      
      // Validate email
      if (!isValidEmail(email)) {
        throw new Error('Invalid email address');
      }
      
      const normalizedEmail = normalizeEmail(email);
      const emailHash = generateEmailHash(normalizedEmail);
      
      // Check/create email_subscribers entry
      let subscriberId;
      
      const [existingSubscriber] = await connection.execute(
        'SELECT id, global_unsubscribe FROM email_subscribers WHERE email_hash = ?',
        [emailHash]
      );
      
      if (existingSubscriber.length > 0) {
        subscriberId = existingSubscriber[0].id;
        
        // Check global unsubscribe
        if (existingSubscriber[0].global_unsubscribe) {
          throw new Error('Email has globally unsubscribed and cannot be added');
        }
      } else {
        // Create new global subscriber
        const [result] = await connection.execute(
          `INSERT INTO email_subscribers (
            email, email_hash, first_name, last_name,
            original_source, original_user_id
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            normalizedEmail,
            emailHash,
            sanitizeString(first_name, 100),
            sanitizeString(last_name, 100),
            source,
            userId
          ]
        );
        
        subscriberId = result.insertId;
      }
      
      // Check if already in user's list
      const [existingUserList] = await connection.execute(
        'SELECT id, status FROM user_email_lists WHERE user_id = ? AND subscriber_id = ?',
        [userId, subscriberId]
      );
      
      let userListId;
      
      if (existingUserList.length > 0) {
        // Update existing entry (re-subscribe if needed)
        userListId = existingUserList[0].id;
        
        await connection.execute(
          `UPDATE user_email_lists
          SET status = 'subscribed',
              tags = ?,
              custom_fields = ?,
              source = ?,
              subscribed_at = CURRENT_TIMESTAMP,
              unsubscribed_at = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [
            JSON.stringify(parseTags(tags)),
            JSON.stringify(validateCustomFields(custom_fields)),
            source,
            userListId
          ]
        );
      } else {
        // Create new user_email_lists entry
        const [result] = await connection.execute(
          `INSERT INTO user_email_lists (
            user_id, subscriber_id, status, tags, custom_fields, source
          ) VALUES (?, ?, 'subscribed', ?, ?, ?)`,
          [
            userId,
            subscriberId,
            JSON.stringify(parseTags(tags)),
            JSON.stringify(validateCustomFields(custom_fields)),
            source
          ]
        );
        
        userListId = result.insertId;
      }
      
      await connection.commit();
      
      // Return created subscriber
      const [subscriber] = await connection.execute(
        `SELECT 
          uel.id,
          uel.subscriber_id,
          es.email,
          es.first_name,
          es.last_name,
          uel.status,
          uel.tags,
          uel.custom_fields,
          uel.source,
          uel.subscribed_at
        FROM user_email_lists uel
        JOIN email_subscribers es ON uel.subscriber_id = es.id
        WHERE uel.id = ?`,
        [userListId]
      );
      
      return subscriber[0];
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update subscriber
   * 
   * @param {number} userId - User ID
   * @param {number} userListId - user_email_lists.id
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated subscriber
   */
  async updateSubscriber(userId, userListId, updates) {
    // Verify ownership
    const [existing] = await db.execute(
      'SELECT subscriber_id FROM user_email_lists WHERE id = ? AND user_id = ?',
      [userListId, userId]
    );
    
    if (existing.length === 0) {
      throw new Error('Subscriber not found');
    }
    
    const subscriberId = existing[0].subscriber_id;
    
    // Update global fields if provided
    if (updates.first_name !== undefined || updates.last_name !== undefined) {
      const globalUpdates = [];
      const globalParams = [];
      
      if (updates.first_name !== undefined) {
        globalUpdates.push('first_name = ?');
        globalParams.push(sanitizeString(updates.first_name, 100));
      }
      
      if (updates.last_name !== undefined) {
        globalUpdates.push('last_name = ?');
        globalParams.push(sanitizeString(updates.last_name, 100));
      }
      
      if (globalUpdates.length > 0) {
        globalParams.push(subscriberId);
        await db.execute(
          `UPDATE email_subscribers SET ${globalUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          globalParams
        );
      }
    }
    
    // Update user-specific fields
    const userUpdates = [];
    const userParams = [];
    
    if (updates.tags !== undefined) {
      userUpdates.push('tags = ?');
      userParams.push(JSON.stringify(parseTags(updates.tags)));
    }
    
    if (updates.custom_fields !== undefined) {
      userUpdates.push('custom_fields = ?');
      userParams.push(JSON.stringify(validateCustomFields(updates.custom_fields)));
    }
    
    if (userUpdates.length > 0) {
      userParams.push(userListId);
      await db.execute(
        `UPDATE user_email_lists SET ${userUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        userParams
      );
    }
    
    // Return updated subscriber
    const [subscriber] = await db.execute(
      `SELECT 
        uel.id,
        uel.subscriber_id,
        es.email,
        es.first_name,
        es.last_name,
        uel.status,
        uel.tags,
        uel.custom_fields,
        uel.source,
        uel.subscribed_at
      FROM user_email_lists uel
      JOIN email_subscribers es ON uel.subscriber_id = es.id
      WHERE uel.id = ?`,
      [userListId]
    );
    
    return subscriber[0];
  }

  /**
   * Remove subscriber (soft delete - unsubscribe)
   * 
   * @param {number} userId - User ID
   * @param {number} userListId - user_email_lists.id
   * @returns {Promise<boolean>} Success status
   */
  async removeSubscriber(userId, userListId) {
    const [result] = await db.execute(
      `UPDATE user_email_lists
      SET status = 'unsubscribed',
          unsubscribed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?`,
      [userListId, userId]
    );
    
    return result.affectedRows > 0;
  }

  /**
   * Import subscribers from CSV data
   * 
   * @param {number} userId - User ID
   * @param {Array} csvData - Array of subscriber objects
   * @param {Object} options - Import options
   * @returns {Promise<Object>} Import results
   */
  async importSubscribers(userId, csvData, options = {}) {
    const {
      auto_tags = [],
      source = 'csv-import',
      skip_duplicates = true
    } = options;
    
    const results = {
      total: csvData.length,
      imported: 0,
      skipped: 0,
      errors: []
    };
    
    for (const row of csvData) {
      try {
        // Validate email
        if (!isValidEmail(row.email)) {
          results.errors.push({
            email: row.email,
            error: 'Invalid email format'
          });
          results.skipped++;
          continue;
        }
        
        // Check if already exists in user's list
        if (skip_duplicates) {
          const emailHash = generateEmailHash(row.email);
          
          const [existing] = await db.execute(
            `SELECT uel.id
            FROM user_email_lists uel
            JOIN email_subscribers es ON uel.subscriber_id = es.id
            WHERE uel.user_id = ? AND es.email_hash = ?`,
            [userId, emailHash]
          );
          
          if (existing.length > 0) {
            results.skipped++;
            continue;
          }
        }
        
        // Add subscriber
        await this.addSubscriber(userId, {
          email: row.email,
          first_name: row.first_name || row.firstName || '',
          last_name: row.last_name || row.lastName || '',
          tags: [...parseTags(auto_tags), ...parseTags(row.tags || [])],
          custom_fields: row.custom_fields || {},
          source
        });
        
        results.imported++;
      } catch (error) {
        results.errors.push({
          email: row.email,
          error: error.message
        });
        results.skipped++;
      }
    }
    
    return results;
  }

  /**
   * Export subscribers to CSV format
   * 
   * @param {number} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} CSV data array
   */
  async exportSubscribers(userId, filters = {}) {
    const {
      tags,
      status = 'subscribed',
      source
    } = filters;
    
    let whereClause = ['uel.user_id = ?'];
    let params = [userId];
    
    if (status && status !== 'all') {
      whereClause.push('uel.status = ?');
      params.push(status);
    }
    
    if (tags && tags.length > 0) {
      const tagConditions = tags.map(() => 'JSON_CONTAINS(uel.tags, ?)').join(' OR ');
      whereClause.push(`(${tagConditions})`);
      tags.forEach(tag => {
        params.push(JSON.stringify(tag));
      });
    }
    
    if (source) {
      whereClause.push('uel.source = ?');
      params.push(source);
    }
    
    const where = whereClause.join(' AND ');
    
    const [subscribers] = await db.execute(
      `SELECT 
        es.email,
        es.first_name,
        es.last_name,
        uel.tags,
        uel.custom_fields,
        uel.status,
        uel.source,
        uel.total_opens,
        uel.total_clicks,
        uel.subscribed_at
      FROM user_email_lists uel
      JOIN email_subscribers es ON uel.subscriber_id = es.id
      WHERE ${where}
      ORDER BY uel.subscribed_at DESC`,
      params
    );
    
    // Convert to CSV-friendly format
    return subscribers.map(sub => ({
      email: sub.email,
      first_name: sub.first_name || '',
      last_name: sub.last_name || '',
      tags: sub.tags ? JSON.parse(sub.tags).join(',') : '',
      status: sub.status,
      source: sub.source,
      total_opens: sub.total_opens,
      total_clicks: sub.total_clicks,
      subscribed_at: sub.subscribed_at
    }));
  }

  /**
   * Get subscriber by ID
   * 
   * @param {number} userId - User ID
   * @param {number} userListId - user_email_lists.id
   * @returns {Promise<Object>} Subscriber
   */
  async getSubscriber(userId, userListId) {
    const [subscribers] = await db.execute(
      `SELECT 
        uel.id,
        uel.subscriber_id,
        es.email,
        es.first_name,
        es.last_name,
        es.global_unsubscribe,
        es.global_bounce,
        es.global_spam_complaint,
        uel.status,
        uel.tags,
        uel.custom_fields,
        uel.source,
        uel.total_opens,
        uel.total_clicks,
        uel.last_open_at,
        uel.last_click_at,
        uel.subscribed_at,
        uel.unsubscribed_at
      FROM user_email_lists uel
      JOIN email_subscribers es ON uel.subscriber_id = es.id
      WHERE uel.id = ? AND uel.user_id = ?`,
      [userListId, userId]
    );
    
    return subscribers[0] || null;
  }
}

module.exports = new SubscriberService();
