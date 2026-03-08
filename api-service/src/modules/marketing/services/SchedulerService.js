/**
 * Scheduler Service
 * 
 * Manages content scheduling:
 * - Schedule content for future publishing
 * - Get scheduled content queue
 * - Reschedule content
 * - Handle scheduling conflicts
 */

const db = require('../../../../config/db');
const ContentService = require('./ContentService');

class SchedulerService {
  /**
   * Schedule content for publishing
   */
  async scheduleContent(contentId, scheduledAt, userId = null) {
    try {
      // Validate scheduled time
      const scheduleDate = new Date(scheduledAt);
      const now = new Date();

      if (scheduleDate <= now) {
        return { 
          success: false, 
          error: 'Scheduled time must be in the future' 
        };
      }

      // Get content
      const result = await ContentService.getContentById(contentId);
      if (!result.success) {
        return result;
      }

      const content = result.content;

      // Check if content is approved
      if (content.status !== 'approved') {
        return { 
          success: false, 
          error: 'Content must be approved before scheduling' 
        };
      }

      // Update content with scheduled time
      await db.execute(
        'UPDATE marketing_content SET status = ?, scheduled_at = ? WHERE id = ?',
        ['scheduled', scheduledAt, contentId]
      );

      return { 
        success: true, 
        message: `Content scheduled for ${scheduleDate.toLocaleString()}`
      };
    } catch (error) {
      console.error('Schedule content error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reschedule content
   */
  async rescheduleContent(contentId, newScheduledAt) {
    try {
      // Validate scheduled time
      const scheduleDate = new Date(newScheduledAt);
      const now = new Date();

      if (scheduleDate <= now) {
        return { 
          success: false, 
          error: 'Scheduled time must be in the future' 
        };
      }

      // Get content
      const result = await ContentService.getContentById(contentId);
      if (!result.success) {
        return result;
      }

      const content = result.content;

      // Can only reschedule scheduled content
      if (content.status !== 'scheduled') {
        return { 
          success: false, 
          error: 'Can only reschedule content with scheduled status' 
        };
      }

      // Update scheduled time
      await db.execute(
        'UPDATE marketing_content SET scheduled_at = ? WHERE id = ?',
        [newScheduledAt, contentId]
      );

      return { 
        success: true, 
        message: `Content rescheduled to ${scheduleDate.toLocaleString()}`
      };
    } catch (error) {
      console.error('Reschedule content error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel scheduled content
   */
  async cancelSchedule(contentId) {
    try {
      // Get content
      const result = await ContentService.getContentById(contentId);
      if (!result.success) {
        return result;
      }

      const content = result.content;

      // Can only cancel scheduled content
      if (content.status !== 'scheduled') {
        return { 
          success: false, 
          error: 'Can only cancel scheduled content' 
        };
      }

      // Revert to approved status
      await db.execute(
        'UPDATE marketing_content SET status = ?, scheduled_at = NULL WHERE id = ?',
        ['approved', contentId]
      );

      return { 
        success: true, 
        message: 'Schedule cancelled. Content reverted to approved status.'
      };
    } catch (error) {
      console.error('Cancel schedule error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get scheduled content queue
   */
  async getScheduledQueue(filters = {}) {
    try {
      let query = `
        SELECT mc.*, mcamp.name as campaign_name
        FROM marketing_content mc
        LEFT JOIN marketing_campaigns mcamp ON mc.campaign_id = mcamp.id
        WHERE mc.status = 'scheduled'
      `;
      const params = [];

      // Filter by campaign
      if (filters.campaign_id) {
        query += ' AND mc.campaign_id = ?';
        params.push(filters.campaign_id);
      }

      // Filter by channel
      if (filters.channel) {
        query += ' AND mc.channel = ?';
        params.push(filters.channel);
      }

      // Filter by date range
      if (filters.from_date) {
        query += ' AND mc.scheduled_at >= ?';
        params.push(filters.from_date);
      }

      if (filters.to_date) {
        query += ' AND mc.scheduled_at <= ?';
        params.push(filters.to_date);
      }

      query += ' ORDER BY mc.scheduled_at ASC';

      const [content] = await db.execute(query, params);

      // Parse JSON fields
      content.forEach(item => {
        if (item.content && typeof item.content === 'string') {
          item.content = JSON.parse(item.content);
        }
      });

      return { success: true, content };
    } catch (error) {
      console.error('Get scheduled queue error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get content ready to publish (scheduled time has passed)
   */
  async getReadyToPublish() {
    try {
      const query = `
        SELECT mc.*, mcamp.name as campaign_name
        FROM marketing_content mc
        LEFT JOIN marketing_campaigns mcamp ON mc.campaign_id = mcamp.id
        WHERE mc.status = 'scheduled' 
          AND mc.scheduled_at <= NOW()
        ORDER BY mc.scheduled_at ASC
      `;

      const [content] = await db.execute(query);

      // Parse JSON fields
      content.forEach(item => {
        if (item.content && typeof item.content === 'string') {
          item.content = JSON.parse(item.content);
        }
      });

      return { success: true, content };
    } catch (error) {
      console.error('Get ready to publish error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get scheduling calendar (for UI)
   */
  async getCalendar(startDate, endDate, filters = {}) {
    try {
      let query = `
        SELECT 
          mc.id,
          mc.campaign_id,
          mc.type,
          mc.channel,
          mc.scheduled_at,
          mc.status,
          mcamp.name as campaign_name
        FROM marketing_content mc
        LEFT JOIN marketing_campaigns mcamp ON mc.campaign_id = mcamp.id
        WHERE mc.status IN ('scheduled', 'published')
          AND mc.scheduled_at BETWEEN ? AND ?
      `;
      const params = [startDate, endDate];

      // Filter by campaign
      if (filters.campaign_id) {
        query += ' AND mc.campaign_id = ?';
        params.push(filters.campaign_id);
      }

      // Filter by channel
      if (filters.channel) {
        query += ' AND mc.channel = ?';
        params.push(filters.channel);
      }

      query += ' ORDER BY mc.scheduled_at ASC';

      const [content] = await db.execute(query, params);

      // Group by date for calendar view
      const calendar = {};
      content.forEach(item => {
        const dateKey = item.scheduled_at.toISOString().split('T')[0];
        if (!calendar[dateKey]) {
          calendar[dateKey] = [];
        }
        calendar[dateKey].push(item);
      });

      return { success: true, calendar };
    } catch (error) {
      console.error('Get calendar error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check for scheduling conflicts
   */
  async checkConflicts(channel, scheduledAt, excludeContentId = null) {
    try {
      const scheduleDate = new Date(scheduledAt);
      
      // Check for content scheduled within 1 hour window on same channel
      const windowStart = new Date(scheduleDate.getTime() - 30 * 60000); // 30 min before
      const windowEnd = new Date(scheduleDate.getTime() + 30 * 60000);   // 30 min after

      let query = `
        SELECT id, scheduled_at, channel
        FROM marketing_content
        WHERE channel = ?
          AND status = 'scheduled'
          AND scheduled_at BETWEEN ? AND ?
      `;
      const params = [channel, windowStart, windowEnd];

      if (excludeContentId) {
        query += ' AND id != ?';
        params.push(excludeContentId);
      }

      const [conflicts] = await db.execute(query, params);

      return { 
        success: true, 
        has_conflicts: conflicts.length > 0,
        conflicts 
      };
    } catch (error) {
      console.error('Check conflicts error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SchedulerService();
