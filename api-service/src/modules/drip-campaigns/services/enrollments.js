/**
 * Enrollment Service
 * Handles user enrollment, progress tracking, and step advancement
 */

const db = require('../../../../config/db');
const EmailService = require('../../../services/emailService');

class EnrollmentService {
  /**
   * Enroll user in campaign
   * 
   * @param {number} userId - User ID
   * @param {number} campaignId - Campaign ID
   * @param {Object} contextData - Context data for personalization
   * @returns {Promise<Object>} Created enrollment
   */
  async enrollUser(userId, campaignId, contextData = {}) {
    // Check if already enrolled
    const [existing] = await db.execute(
      'SELECT id, status FROM drip_enrollments WHERE user_id = ? AND campaign_id = ?',
      [userId, campaignId]
    );
    
    if (existing.length > 0) {
      if (existing[0].status === 'active') {
        throw new Error('User already enrolled in this campaign');
      }
      // If exited/completed, we can re-enroll
    }
    
    // Get campaign and first step
    const [campaigns] = await db.execute(
      'SELECT * FROM drip_campaigns WHERE id = ? AND is_active = 1',
      [campaignId]
    );
    
    if (campaigns.length === 0) {
      throw new Error('Campaign not found or inactive');
    }
    
    const campaign = campaigns[0];
    
    // Get first step
    const [steps] = await db.execute(
      'SELECT * FROM drip_steps WHERE campaign_id = ? ORDER BY step_number ASC LIMIT 1',
      [campaignId]
    );
    
    if (steps.length === 0) {
      throw new Error('Campaign has no steps configured');
    }
    
    const firstStep = steps[0];
    
    // Calculate next_send_at based on first step delay
    const nextSendAt = this.calculateNextSendTime(firstStep, new Date());
    
    // Insert enrollment
    const [result] = await db.execute(
      `INSERT INTO drip_enrollments (
        campaign_id, user_id, current_step, status,
        context_data, next_send_at, next_available_send_at
      ) VALUES (?, ?, ?, 'active', ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = 'active',
        current_step = 0,
        context_data = VALUES(context_data),
        next_send_at = VALUES(next_send_at),
        next_available_send_at = VALUES(next_available_send_at),
        enrolled_at = CURRENT_TIMESTAMP,
        exited_at = NULL,
        exit_reason = NULL,
        exit_step = NULL,
        updated_at = CURRENT_TIMESTAMP`,
      [
        campaignId,
        userId,
        0, // Start at step 0 (will be incremented to 1 on first send)
        JSON.stringify(contextData),
        nextSendAt,
        nextSendAt
      ]
    );
    
    const enrollmentId = result.insertId || existing[0].id;
    
    // Record enrollment event
    await db.execute(
      `INSERT INTO drip_events (
        enrollment_id, campaign_id, step_number, event_type, event_data
      ) VALUES (?, ?, ?, 'enrolled', ?)`,
      [enrollmentId, campaignId, 0, JSON.stringify(contextData)]
    );
    
    const [enrollment] = await db.execute(
      'SELECT * FROM drip_enrollments WHERE id = ?',
      [enrollmentId]
    );
    
    return enrollment[0];
  }

  /**
   * Exit enrollment
   * 
   * @param {number} enrollmentId - Enrollment ID
   * @param {string} reason - Exit reason
   * @returns {Promise<Object>} Updated enrollment
   */
  async exitEnrollment(enrollmentId, reason) {
    const [enrollment] = await db.execute(
      'SELECT * FROM drip_enrollments WHERE id = ?',
      [enrollmentId]
    );
    
    if (enrollment.length === 0) {
      throw new Error('Enrollment not found');
    }
    
    await db.execute(
      `UPDATE drip_enrollments 
      SET status = 'exited',
          exited_at = CURRENT_TIMESTAMP,
          exit_reason = ?,
          exit_step = current_step,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [reason, enrollmentId]
    );
    
    // Record exit event
    await db.execute(
      `INSERT INTO drip_events (
        enrollment_id, campaign_id, step_number, event_type, event_data
      ) VALUES (?, ?, ?, 'exited', ?)`,
      [
        enrollmentId,
        enrollment[0].campaign_id,
        enrollment[0].current_step,
        JSON.stringify({ reason })
      ]
    );
    
    const [updated] = await db.execute(
      'SELECT * FROM drip_enrollments WHERE id = ?',
      [enrollmentId]
    );
    
    return updated[0];
  }

  /**
   * Pause enrollment
   * 
   * @param {number} enrollmentId - Enrollment ID
   * @returns {Promise<Object>} Updated enrollment
   */
  async pauseEnrollment(enrollmentId) {
    await db.execute(
      `UPDATE drip_enrollments 
      SET status = 'paused', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'active'`,
      [enrollmentId]
    );
    
    const [enrollment] = await db.execute(
      'SELECT * FROM drip_enrollments WHERE id = ?',
      [enrollmentId]
    );
    
    return enrollment[0];
  }

  /**
   * Resume enrollment
   * 
   * @param {number} enrollmentId - Enrollment ID
   * @returns {Promise<Object>} Updated enrollment
   */
  async resumeEnrollment(enrollmentId) {
    await db.execute(
      `UPDATE drip_enrollments 
      SET status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'paused'`,
      [enrollmentId]
    );
    
    const [enrollment] = await db.execute(
      'SELECT * FROM drip_enrollments WHERE id = ?',
      [enrollmentId]
    );
    
    return enrollment[0];
  }

  /**
   * Get user enrollments with optional filters
   * 
   * @param {number} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} User enrollments
   */
  async getUserEnrollments(userId, filters = {}) {
    let whereClause = ['de.user_id = ?'];
    let params = [userId];
    
    if (filters.status) {
      whereClause.push('de.status = ?');
      params.push(filters.status);
    }
    
    const where = whereClause.join(' AND ');
    
    const [enrollments] = await db.execute(
      `SELECT 
        de.*,
        dc.name as campaign_name,
        dc.campaign_key,
        dc.category,
        dc.priority_level,
        (SELECT COUNT(*) FROM drip_steps WHERE campaign_id = de.campaign_id) as total_steps
      FROM drip_enrollments de
      JOIN drip_campaigns dc ON de.campaign_id = dc.id
      WHERE ${where}
      ORDER BY de.enrolled_at DESC`,
      params
    );
    
    return enrollments;
  }

  /**
   * Get campaign enrollments with optional filters
   * 
   * @param {number} campaignId - Campaign ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Enrollments and pagination
   */
  async getCampaignEnrollments(campaignId, filters = {}) {
    const { status, user_id, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;
    
    let whereClause = ['de.campaign_id = ?'];
    let params = [campaignId];
    
    if (status) {
      whereClause.push('de.status = ?');
      params.push(status);
    }
    
    if (user_id) {
      whereClause.push('de.user_id = ?');
      params.push(user_id);
    }
    
    const where = whereClause.join(' AND ');
    
    // Get total count
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM drip_enrollments de WHERE ${where}`,
      params
    );
    const total = countResult[0].total;
    
    // Get enrollments
    const [enrollments] = await db.execute(
      `SELECT 
        de.*,
        u.username,
        u.email,
        u.user_type
      FROM drip_enrollments de
      JOIN users u ON de.user_id = u.id
      WHERE ${where}
      ORDER BY de.enrolled_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    return {
      enrollments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Advance to next step
   * 
   * @param {number} enrollmentId - Enrollment ID
   * @returns {Promise<Object>} Updated enrollment
   */
  async advanceStep(enrollmentId) {
    const [enrollment] = await db.execute(
      'SELECT * FROM drip_enrollments WHERE id = ?',
      [enrollmentId]
    );
    
    if (enrollment.length === 0) {
      throw new Error('Enrollment not found');
    }
    
    const currentEnrollment = enrollment[0];
    
    // Get next step
    const [steps] = await db.execute(
      `SELECT * FROM drip_steps 
      WHERE campaign_id = ? AND step_number > ?
      ORDER BY step_number ASC LIMIT 1`,
      [currentEnrollment.campaign_id, currentEnrollment.current_step]
    );
    
    if (steps.length === 0) {
      // No more steps, mark as completed
      await db.execute(
        `UPDATE drip_enrollments 
        SET status = 'completed', 
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [enrollmentId]
      );
      
      return { status: 'completed' };
    }
    
    const nextStep = steps[0];
    const nextSendAt = this.calculateNextSendTime(nextStep, new Date(), currentEnrollment.enrolled_at);
    
    // Update enrollment
    await db.execute(
      `UPDATE drip_enrollments 
      SET current_step = ?,
          next_send_at = ?,
          next_available_send_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [nextStep.step_number, nextSendAt, nextSendAt, enrollmentId]
    );
    
    const [updated] = await db.execute(
      'SELECT * FROM drip_enrollments WHERE id = ?',
      [enrollmentId]
    );
    
    return updated[0];
  }

  /**
   * Check exit conditions
   * 
   * @param {number} enrollmentId - Enrollment ID
   * @returns {Promise<Object>} Exit check result
   */
  async checkExitConditions(enrollmentId) {
    const [enrollment] = await db.execute(
      'SELECT * FROM drip_enrollments WHERE id = ?',
      [enrollmentId]
    );
    
    if (enrollment.length === 0) {
      return { shouldExit: false };
    }
    
    const currentEnrollment = enrollment[0];
    
    // Get current step
    const [steps] = await db.execute(
      'SELECT * FROM drip_steps WHERE campaign_id = ? AND step_number = ?',
      [currentEnrollment.campaign_id, currentEnrollment.current_step]
    );
    
    if (steps.length === 0 || !steps[0].exit_conditions) {
      return { shouldExit: false };
    }
    
    const exitConditions = JSON.parse(steps[0].exit_conditions);
    
    // TODO: Implement condition evaluation logic
    // This would check conditions like:
    // - user made a purchase
    // - user clicked a link
    // - specific event occurred
    // For now, return false
    
    return { shouldExit: false, conditions: exitConditions };
  }

  /**
   * Process next send for enrollment
   * 
   * @param {Object} enrollment - Enrollment object
   * @returns {Promise<Object>} Processing result
   */
  async processNextSend(enrollment) {
    try {
      // Get step
      const nextStepNumber = enrollment.current_step + 1;
      const [steps] = await db.execute(
        'SELECT * FROM drip_steps WHERE campaign_id = ? AND step_number = ?',
        [enrollment.campaign_id, nextStepNumber]
      );
      
      if (steps.length === 0) {
        // No more steps
        await this.exitEnrollment(enrollment.id, 'completed');
        return { status: 'completed' };
      }
      
      const step = steps[0];
      
      // Check expiry
      const isExpired = this.isStepExpired(step, enrollment.enrolled_at);
      if (isExpired) {
        // Record expiry and continue to next step
        await db.execute(
          `INSERT INTO drip_events (
            enrollment_id, campaign_id, step_number, event_type, event_data
          ) VALUES (?, ?, ?, 'expired', ?)`,
          [enrollment.id, enrollment.campaign_id, nextStepNumber, JSON.stringify({ reason: 'step_expired' })]
        );
        
        await this.advanceStep(enrollment.id);
        return { status: 'expired', step: nextStepNumber };
      }
      
      // Send email
      const emailService = new EmailService();
      const contextData = enrollment.context_data ? JSON.parse(enrollment.context_data) : {};
      
      const result = await emailService.sendEmail(
        enrollment.user_id,
        step.template_key,
        contextData,
        { priority: 3 } // TODO: Use campaign priority
      );
      
      // Record sent event
      await db.execute(
        `INSERT INTO drip_events (
          enrollment_id, campaign_id, step_number, event_type, event_data, email_log_id
        ) VALUES (?, ?, ?, 'sent', ?, ?)`,
        [
          enrollment.id,
          enrollment.campaign_id,
          nextStepNumber,
          JSON.stringify({ template_key: step.template_key }),
          result.emailLogId || null
        ]
      );
      
      // Update enrollment
      await db.execute(
        `UPDATE drip_enrollments 
        SET current_step = ?,
            last_email_sent_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [nextStepNumber, enrollment.id]
      );
      
      // Advance to next step
      await this.advanceStep(enrollment.id);
      
      return { status: 'sent', step: nextStepNumber };
    } catch (error) {
      // Record error event
      await db.execute(
        `INSERT INTO drip_events (
          enrollment_id, campaign_id, step_number, event_type, event_data
        ) VALUES (?, ?, ?, 'error', ?)`,
        [
          enrollment.id,
          enrollment.campaign_id,
          enrollment.current_step + 1,
          JSON.stringify({ error: error.message })
        ]
      );
      
      throw error;
    }
  }

  /**
   * Get enrollments ready to send
   * 
   * @returns {Promise<Array>} Enrollments ready to process
   */
  async getEnrollmentsReadyToSend() {
    const [enrollments] = await db.execute(
      `SELECT 
        de.*,
        dc.priority_level,
        dc.min_hours_between_emails
      FROM drip_enrollments de
      JOIN drip_campaigns dc ON de.campaign_id = dc.id
      WHERE de.status = 'active'
        AND de.next_send_at <= NOW()
        AND de.next_available_send_at <= NOW()
      ORDER BY dc.priority_level DESC, de.next_send_at ASC`
    );
    
    return enrollments;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Calculate next send time based on step delay
   * 
   * @param {Object} step - Step object
   * @param {Date} fromDate - Reference date
   * @param {Date} enrollmentDate - Enrollment date (for delay_from='enrollment')
   * @returns {Date} Next send time
   */
  calculateNextSendTime(step, fromDate, enrollmentDate = null) {
    const baseDate = step.delay_from === 'enrollment' && enrollmentDate 
      ? new Date(enrollmentDate)
      : new Date(fromDate);
    
    const nextDate = new Date(baseDate);
    
    switch (step.delay_unit) {
      case 'minutes':
        nextDate.setMinutes(nextDate.getMinutes() + step.delay_amount);
        break;
      case 'hours':
        nextDate.setHours(nextDate.getHours() + step.delay_amount);
        break;
      case 'days':
        nextDate.setDate(nextDate.getDate() + step.delay_amount);
        break;
      case 'weeks':
        nextDate.setDate(nextDate.getDate() + (step.delay_amount * 7));
        break;
      default:
        nextDate.setDate(nextDate.getDate() + step.delay_amount);
    }
    
    return nextDate;
  }

  /**
   * Check if step is expired
   * 
   * @param {Object} step - Step object
   * @param {Date} enrollmentDate - Enrollment date
   * @returns {boolean} True if expired
   */
  isStepExpired(step, enrollmentDate) {
    const now = new Date();
    
    // Check absolute expiry
    if (step.expires_at) {
      const expiryDate = new Date(step.expires_at);
      if (now > expiryDate) {
        return true;
      }
    }
    
    // Check relative expiry
    if (step.expires_after_enrollment_days) {
      const enrollDate = new Date(enrollmentDate);
      const expiryDate = new Date(enrollDate);
      expiryDate.setDate(expiryDate.getDate() + step.expires_after_enrollment_days);
      
      if (now > expiryDate) {
        return true;
      }
    }
    
    return false;
  }
}

module.exports = new EnrollmentService();
