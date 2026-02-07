/**
 * Approval Service
 * 
 * Manages content approval workflow:
 * - Submit for review
 * - Approve/reject content
 * - Request revisions with feedback
 * - Track approval history
 */

const db = require('../../../../config/db');
const ContentService = require('./ContentService');

class ApprovalService {
  /**
   * Submit content for review
   */
  async submitForReview(contentId, userId) {
    try {
      // Get content
      const result = await ContentService.getContentById(contentId);
      if (!result.success) {
        return result;
      }

      const content = result.content;

      // Check if content is in a state that can be submitted
      if (!['draft', 'revision_requested'].includes(content.status)) {
        return { 
          success: false, 
          error: `Cannot submit content with status: ${content.status}` 
        };
      }

      // Update status to pending_review
      await db.execute(
        'UPDATE marketing_content SET status = ? WHERE id = ?',
        ['pending_review', contentId]
      );

      // Log submission
      await this.addFeedback(contentId, 'comment', 'Submitted for review', userId);

      return { 
        success: true, 
        message: 'Content submitted for review'
      };
    } catch (error) {
      console.error('Submit for review error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Approve content
   */
  async approveContent(contentId, userId, feedback = null) {
    try {
      // Get content
      const result = await ContentService.getContentById(contentId);
      if (!result.success) {
        return result;
      }

      const content = result.content;

      // Check if content is pending review
      if (content.status !== 'pending_review') {
        return { 
          success: false, 
          error: 'Content must be in pending_review status to approve' 
        };
      }

      // Update status to approved
      await db.execute(
        'UPDATE marketing_content SET status = ?, approved_by = ? WHERE id = ?',
        ['approved', userId, contentId]
      );

      // Log approval
      await this.addFeedback(
        contentId, 
        'approve', 
        feedback || 'Approved', 
        userId
      );

      return { 
        success: true, 
        message: 'Content approved successfully'
      };
    } catch (error) {
      console.error('Approve content error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reject content
   */
  async rejectContent(contentId, userId, feedback) {
    try {
      // Get content
      const result = await ContentService.getContentById(contentId);
      if (!result.success) {
        return result;
      }

      const content = result.content;

      // Check if content is pending review
      if (content.status !== 'pending_review') {
        return { 
          success: false, 
          error: 'Content must be in pending_review status to reject' 
        };
      }

      if (!feedback) {
        return { 
          success: false, 
          error: 'Feedback is required when rejecting content' 
        };
      }

      // Update status to revision_requested
      await db.execute(
        'UPDATE marketing_content SET status = ? WHERE id = ?',
        ['revision_requested', contentId]
      );

      // Log rejection with feedback
      await this.addFeedback(contentId, 'reject', feedback, userId);

      return { 
        success: true, 
        message: 'Content rejected. Creator notified for revisions.'
      };
    } catch (error) {
      console.error('Reject content error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Request revision
   */
  async requestRevision(contentId, userId, feedback) {
    try {
      if (!feedback) {
        return { 
          success: false, 
          error: 'Feedback is required when requesting revision' 
        };
      }

      // Get content
      const result = await ContentService.getContentById(contentId);
      if (!result.success) {
        return result;
      }

      // Update status to revision_requested
      await db.execute(
        'UPDATE marketing_content SET status = ? WHERE id = ?',
        ['revision_requested', contentId]
      );

      // Log revision request
      await this.addFeedback(contentId, 'request_revision', feedback, userId);

      return { 
        success: true, 
        message: 'Revision requested'
      };
    } catch (error) {
      console.error('Request revision error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add comment/feedback
   */
  async addComment(contentId, userId, comment) {
    try {
      if (!comment) {
        return { 
          success: false, 
          error: 'Comment text is required' 
        };
      }

      await this.addFeedback(contentId, 'comment', comment, userId);

      return { 
        success: true, 
        message: 'Comment added successfully'
      };
    } catch (error) {
      console.error('Add comment error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get feedback history for content
   */
  async getFeedbackHistory(contentId) {
    try {
      const [feedback] = await db.execute(
        'SELECT * FROM marketing_feedback WHERE content_id = ? ORDER BY created_at DESC',
        [contentId]
      );

      return { 
        success: true, 
        feedback 
      };
    } catch (error) {
      console.error('Get feedback history error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pending approvals (admin view)
   */
  async getPendingApprovals(filters = {}) {
    try {
      let query = `
        SELECT mc.*, mcamp.name as campaign_name
        FROM marketing_content mc
        LEFT JOIN marketing_campaigns mcamp ON mc.campaign_id = mcamp.id
        WHERE mc.status = 'pending_review'
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

      query += ' ORDER BY mc.created_at ASC';

      const [content] = await db.execute(query, params);

      // Parse JSON fields
      content.forEach(item => {
        if (item.content && typeof item.content === 'string') {
          item.content = JSON.parse(item.content);
        }
      });

      return { success: true, content };
    } catch (error) {
      console.error('Get pending approvals error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Internal: Add feedback record
   */
  async addFeedback(contentId, action, feedback, userId) {
    const query = `
      INSERT INTO marketing_feedback 
      (content_id, action, feedback, created_by)
      VALUES (?, ?, ?, ?)
    `;

    await db.execute(query, [contentId, action, feedback, userId]);
  }
}

module.exports = new ApprovalService();
