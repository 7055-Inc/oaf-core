/**
 * Frequency Manager
 * Handles email frequency limits and priority queue management
 * 
 * Rules:
 * - Max 6 drip emails per day per user
 * - Minimum 2 hours between drip emails
 * - 10-hour pause after hitting daily limit
 * - Priority-based queue ordering
 */

const db = require('../../../../config/db');

class FrequencyManager {
  /**
   * Check if user can receive email now
   * 
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Can send status and reason
   */
  async canSendToUser(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's frequency tracking
    const [tracking] = await db.execute(
      'SELECT * FROM drip_frequency_tracking WHERE user_id = ? AND tracking_date = ?',
      [userId, today]
    );
    
    if (tracking.length === 0) {
      // No tracking yet today, user can receive email
      return { canSend: true, reason: 'no_tracking_today' };
    }
    
    const userTracking = tracking[0];
    
    // Check if paused
    if (userTracking.is_paused && userTracking.paused_until) {
      const pausedUntil = new Date(userTracking.paused_until);
      const now = new Date();
      
      if (now < pausedUntil) {
        return {
          canSend: false,
          reason: 'paused',
          pausedUntil: userTracking.paused_until,
          minutesRemaining: Math.ceil((pausedUntil - now) / 60000)
        };
      }
      
      // Pause expired, clear it
      await this.clearPause(userId);
    }
    
    // Check daily limit
    if (userTracking.drip_emails_sent_today >= 6) {
      return {
        canSend: false,
        reason: 'daily_limit_reached',
        count: userTracking.drip_emails_sent_today
      };
    }
    
    // Check 2-hour gap
    if (userTracking.last_drip_sent_at) {
      const lastSent = new Date(userTracking.last_drip_sent_at);
      const now = new Date();
      const hoursSince = (now - lastSent) / (1000 * 60 * 60);
      
      if (hoursSince < 2) {
        const minutesRemaining = Math.ceil((2 - hoursSince) * 60);
        return {
          canSend: false,
          reason: 'minimum_gap',
          hoursSince: hoursSince.toFixed(2),
          minutesRemaining
        };
      }
    }
    
    return { canSend: true, reason: 'allowed' };
  }

  /**
   * Record email sent and update frequency tracking
   * 
   * @param {number} userId - User ID
   * @param {number} campaignId - Campaign ID
   * @param {number} enrollmentId - Enrollment ID
   * @returns {Promise<void>}
   */
  async recordEmailSent(userId, campaignId, enrollmentId) {
    const today = new Date().toISOString().split('T')[0];
    
    await db.execute(
      `INSERT INTO drip_frequency_tracking (
        user_id, tracking_date, drip_emails_sent_today, last_drip_sent_at
      ) VALUES (?, ?, 1, NOW())
      ON DUPLICATE KEY UPDATE
        drip_emails_sent_today = drip_emails_sent_today + 1,
        last_drip_sent_at = NOW(),
        updated_at = CURRENT_TIMESTAMP`,
      [userId, today]
    );
    
    // Check if we just hit the limit (6th email)
    const [tracking] = await db.execute(
      'SELECT drip_emails_sent_today FROM drip_frequency_tracking WHERE user_id = ? AND tracking_date = ?',
      [userId, today]
    );
    
    if (tracking.length > 0 && tracking[0].drip_emails_sent_today >= 6) {
      // Apply 10-hour pause
      await this.applyPause(userId, 'daily_limit_reached');
    }
  }

  /**
   * Apply pause to user
   * 
   * @param {number} userId - User ID
   * @param {string} reason - Pause reason
   * @returns {Promise<void>}
   */
  async applyPause(userId, reason) {
    const today = new Date().toISOString().split('T')[0];
    const pausedUntil = new Date();
    pausedUntil.setHours(pausedUntil.getHours() + 10); // 10-hour pause
    
    await db.execute(
      `UPDATE drip_frequency_tracking
      SET is_paused = 1,
          paused_until = ?,
          pause_reason = ?,
          pause_count = pause_count + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND tracking_date = ?`,
      [pausedUntil, reason, userId, today]
    );
    
    console.log(`Applied 10-hour pause for user ${userId}: ${reason}`);
  }

  /**
   * Clear pause for user
   * 
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  async clearPause(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    await db.execute(
      `UPDATE drip_frequency_tracking
      SET is_paused = 0,
          paused_until = NULL,
          pause_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND tracking_date = ?`,
      [userId, today]
    );
  }

  /**
   * Check pause status
   * 
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Pause status
   */
  async checkPauseStatus(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    const [tracking] = await db.execute(
      'SELECT is_paused, paused_until, pause_reason FROM drip_frequency_tracking WHERE user_id = ? AND tracking_date = ?',
      [userId, today]
    );
    
    if (tracking.length === 0) {
      return { isPaused: false };
    }
    
    const { is_paused, paused_until, pause_reason } = tracking[0];
    
    if (!is_paused || !paused_until) {
      return { isPaused: false };
    }
    
    const pausedUntilDate = new Date(paused_until);
    const now = new Date();
    
    if (now >= pausedUntilDate) {
      // Pause expired
      await this.clearPause(userId);
      return { isPaused: false, wasExpired: true };
    }
    
    return {
      isPaused: true,
      pausedUntil: paused_until,
      pauseReason: pause_reason,
      minutesRemaining: Math.ceil((pausedUntilDate - now) / 60000)
    };
  }

  /**
   * Get daily count for user
   * 
   * @param {number} userId - User ID
   * @param {Date} date - Date to check (defaults to today)
   * @returns {Promise<number>} Email count
   */
  async getDailyCount(userId, date = new Date()) {
    const dateStr = date.toISOString().split('T')[0];
    
    const [tracking] = await db.execute(
      'SELECT drip_emails_sent_today FROM drip_frequency_tracking WHERE user_id = ? AND tracking_date = ?',
      [userId, dateStr]
    );
    
    return tracking.length > 0 ? tracking[0].drip_emails_sent_today : 0;
  }

  /**
   * Get last send time for user
   * 
   * @param {number} userId - User ID
   * @returns {Promise<Date|null>} Last send time
   */
  async getLastSendTime(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    const [tracking] = await db.execute(
      'SELECT last_drip_sent_at FROM drip_frequency_tracking WHERE user_id = ? AND tracking_date = ?',
      [userId, today]
    );
    
    return tracking.length > 0 && tracking[0].last_drip_sent_at 
      ? new Date(tracking[0].last_drip_sent_at)
      : null;
  }

  /**
   * Calculate next available send time for user
   * 
   * @param {number} userId - User ID
   * @param {number} minGapHours - Minimum gap in hours (default 2)
   * @returns {Promise<Date>} Next available send time
   */
  async calculateNextAvailableSend(userId, minGapHours = 2) {
    const canSend = await this.canSendToUser(userId);
    
    if (canSend.canSend) {
      return new Date(); // Can send now
    }
    
    if (canSend.reason === 'paused') {
      return new Date(canSend.pausedUntil);
    }
    
    if (canSend.reason === 'minimum_gap') {
      const lastSent = await this.getLastSendTime(userId);
      if (lastSent) {
        const nextAvailable = new Date(lastSent);
        nextAvailable.setHours(nextAvailable.getHours() + minGapHours);
        return nextAvailable;
      }
    }
    
    if (canSend.reason === 'daily_limit_reached') {
      // Wait until tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;
    }
    
    return new Date(); // Fallback
  }

  /**
   * Prioritize queue of enrollments for same user
   * 
   * @param {Array} enrollments - Enrollments ready to send
   * @returns {Promise<Array>} Prioritized enrollments
   */
  async prioritizeQueue(enrollments) {
    // Group by user
    const byUser = {};
    
    for (const enrollment of enrollments) {
      if (!byUser[enrollment.user_id]) {
        byUser[enrollment.user_id] = [];
      }
      byUser[enrollment.user_id].push(enrollment);
    }
    
    const prioritized = [];
    
    // For each user, select highest priority campaign
    for (const userId in byUser) {
      const userEnrollments = byUser[userId];
      
      // Sort by priority (highest first)
      userEnrollments.sort((a, b) => b.priority_level - a.priority_level);
      
      // Check if user can receive email
      const canSend = await this.canSendToUser(parseInt(userId));
      
      if (canSend.canSend) {
        // Add highest priority enrollment
        prioritized.push(userEnrollments[0]);
        
        // Mark others as suppressed
        for (let i = 1; i < userEnrollments.length; i++) {
          await this.suppressLowPriority(parseInt(userId), userEnrollments[i].campaign_id, userEnrollments[i].id);
        }
      } else {
        // User cannot receive email now, suppress all
        for (const enrollment of userEnrollments) {
          await this.recordSuppression(
            enrollment.id,
            canSend.reason,
            canSend
          );
        }
      }
    }
    
    return prioritized;
  }

  /**
   * Suppress low priority campaign
   * 
   * @param {number} userId - User ID
   * @param {number} campaignId - Campaign ID
   * @param {number} enrollmentId - Enrollment ID
   * @returns {Promise<void>}
   */
  async suppressLowPriority(userId, campaignId, enrollmentId) {
    await this.recordSuppression(
      enrollmentId,
      'lower_priority',
      { message: 'Higher priority campaign sent instead' }
    );
  }

  /**
   * Record suppression event
   * 
   * @param {number} enrollmentId - Enrollment ID
   * @param {string} reason - Suppression reason
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<void>}
   */
  async recordSuppression(enrollmentId, reason, metadata = {}) {
    // Update enrollment suppression count
    await db.execute(
      `UPDATE drip_enrollments
      SET suppression_count = suppression_count + 1,
          last_suppression_reason = ?,
          last_suppression_at = NOW(),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [reason, enrollmentId]
    );
    
    // Get enrollment details
    const [enrollment] = await db.execute(
      'SELECT campaign_id, current_step FROM drip_enrollments WHERE id = ?',
      [enrollmentId]
    );
    
    if (enrollment.length > 0) {
      // Record suppression event
      await db.execute(
        `INSERT INTO drip_events (
          enrollment_id, campaign_id, step_number, event_type, event_data
        ) VALUES (?, ?, ?, 'suppressed', ?)`,
        [
          enrollmentId,
          enrollment[0].campaign_id,
          enrollment[0].current_step + 1,
          JSON.stringify({ reason, ...metadata })
        ]
      );
    }
  }

  /**
   * Reset frequency tracking for user (testing/admin use)
   * 
   * @param {number} userId - User ID
   * @returns {Promise<void>}
   */
  async resetFrequency(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    await db.execute(
      'DELETE FROM drip_frequency_tracking WHERE user_id = ? AND tracking_date = ?',
      [userId, today]
    );
    
    console.log(`Reset frequency tracking for user ${userId}`);
  }

  /**
   * Get frequency stats for analytics
   * 
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Frequency statistics
   */
  async getFrequencyStats(startDate = null, endDate = null) {
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE tracking_date BETWEEN ? AND ?';
      params.push(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
    }
    
    const [stats] = await db.execute(
      `SELECT 
        COUNT(DISTINCT user_id) as total_users,
        SUM(drip_emails_sent_today) as total_emails_sent,
        AVG(drip_emails_sent_today) as avg_emails_per_user,
        SUM(CASE WHEN drip_emails_sent_today >= 6 THEN 1 ELSE 0 END) as users_at_limit,
        SUM(pause_count) as total_pauses,
        SUM(CASE WHEN is_paused = 1 THEN 1 ELSE 0 END) as currently_paused
      FROM drip_frequency_tracking
      ${dateFilter}`,
      params
    );
    
    return stats[0] || {};
  }
}

module.exports = new FrequencyManager();
